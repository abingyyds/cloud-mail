import { connect } from 'cloudflare:sockets';
import BizError from '../error/biz-error';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function encodeBase64(value) {
	const bytes = encoder.encode(value || '');
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

function encodeHeader(value = '') {
	value = stripHeader(value);
	if (/^[\x00-\x7F]*$/.test(value)) {
		return value;
	}
	return `=?UTF-8?B?${encodeBase64(value)}?=`;
}

function stripHeader(value = '') {
	return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function normalizeLineBreaks(value = '') {
	return String(value).replace(/\r?\n/g, '\r\n');
}

function escapeAddressName(value = '') {
	return String(value).replace(/["\\]/g, '\\$&');
}

function toAddress(email, name = '') {
	if (!name) {
		return `<${email}>`;
	}
	name = stripHeader(name);
	if (/^[\x00-\x7F]*$/.test(name)) {
		return `"${escapeAddressName(name)}" <${email}>`;
	}
	return `${encodeHeader(name)} <${email}>`;
}

function toQuotedPrintable(value = '') {
	const bytes = encoder.encode(normalizeLineBreaks(value));
	let result = '';
	let lineLength = 0;

	for (const byte of bytes) {
		let chunk;
		if (byte === 13 || byte === 10) {
			result += String.fromCharCode(byte);
			lineLength = 0;
			continue;
		}

		if ((byte >= 33 && byte <= 60) || (byte >= 62 && byte <= 126) || byte === 9 || byte === 32) {
			chunk = String.fromCharCode(byte);
		} else {
			chunk = `=${byte.toString(16).toUpperCase().padStart(2, '0')}`;
		}

		if (lineLength + chunk.length > 72) {
			result += '=\r\n';
			lineLength = 0;
		}

		result += chunk;
		lineLength += chunk.length;
	}

	return result;
}

function buildMime(params) {
	const boundary = `----smmails-${crypto.randomUUID().replace(/-/g, '')}`;
	const headers = [
		`From: ${toAddress(params.from, params.name)}`,
		`To: ${params.to.map(item => toAddress(item)).join(', ')}`,
		`Subject: ${encodeHeader(params.subject)}`,
		`Date: ${new Date().toUTCString()}`,
		`Message-ID: <${crypto.randomUUID()}@${params.from.split('@')[1]}>`,
		'MIME-Version: 1.0',
		`Content-Type: multipart/alternative; boundary="${boundary}"`
	];

	if (params.sendType === 'reply' && params.messageId) {
		headers.push(`In-Reply-To: ${stripHeader(params.messageId)}`);
		headers.push(`References: ${stripHeader(params.messageId)}`);
	}

	const parts = [];
	if (params.text) {
		parts.push([
			`--${boundary}`,
			'Content-Type: text/plain; charset=UTF-8',
			'Content-Transfer-Encoding: quoted-printable',
			'',
			toQuotedPrintable(params.text)
		].join('\r\n'));
	}

	if (params.html) {
		parts.push([
			`--${boundary}`,
			'Content-Type: text/html; charset=UTF-8',
			'Content-Transfer-Encoding: quoted-printable',
			'',
			toQuotedPrintable(params.html)
		].join('\r\n'));
	}

	parts.push(`--${boundary}--`);
	return `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}\r\n`;
}

class SmtpClient {
	constructor(config) {
		this.config = config;
		this.socket = null;
		this.reader = null;
		this.writer = null;
		this.buffer = '';
	}

	async connect() {
		if (this.config.port === 25) {
			throw new BizError('Cloudflare Workers 不支持连接 SMTP 25 端口，请使用 587 或 465');
		}

		let secureTransport = 'off';
		if (this.config.secure === 'tls') {
			secureTransport = 'on';
		} else if (this.config.secure === 'starttls') {
			secureTransport = 'starttls';
		}

		this.socket = connect({
			hostname: this.config.host,
			port: this.config.port
		}, { secureTransport });

		this.reader = this.socket.readable.getReader();
		this.writer = this.socket.writable.getWriter();

		await this.expect([220]);
		await this.command(`EHLO ${this.config.ehlo || 'smmails.local'}`, [250]);

		if (this.config.secure === 'starttls') {
			await this.command('STARTTLS', [220]);
			this.reader.releaseLock();
			this.writer.releaseLock();
			this.socket = this.socket.startTls();
			this.reader = this.socket.readable.getReader();
			this.writer = this.socket.writable.getWriter();
			this.buffer = '';
			await this.command(`EHLO ${this.config.ehlo || 'smmails.local'}`, [250]);
		}
	}

	async login() {
		if (!this.config.username) {
			return;
		}

		await this.command('AUTH LOGIN', [334]);
		await this.command(encodeBase64(this.config.username), [334]);
		await this.command(encodeBase64(this.config.password), [235]);
	}

	async send(mail) {
		await this.command(`MAIL FROM:<${mail.envelopeFrom || mail.from}>`, [250]);
		for (const to of mail.to) {
			await this.command(`RCPT TO:<${to}>`, [250, 251]);
		}
		await this.command('DATA', [354]);
		await this.write(`${buildMime(mail).replace(/^\./gm, '..')}\r\n.\r\n`);
		await this.expect([250]);
	}

	async quit() {
		try {
			await this.command('QUIT', [221]);
		} catch (e) {
			console.warn(`SMTP quit failed: ${e.message}`);
		} finally {
			this.close();
		}
	}

	close() {
		try {
			this.reader?.releaseLock();
		} catch (e) {
			console.warn(`SMTP reader release failed: ${e.message}`);
		}
		try {
			this.writer?.releaseLock();
		} catch (e) {
			console.warn(`SMTP writer release failed: ${e.message}`);
		}
		try {
			this.socket?.close?.();
		} catch (e) {
			console.warn(`SMTP close failed: ${e.message}`);
		}
	}

	async command(command, codes) {
		await this.write(`${command}\r\n`);
		return this.expect(codes);
	}

	async write(value) {
		await this.writer.write(encoder.encode(value));
	}

	async expect(codes) {
		const response = await this.readResponse();
		if (!codes.includes(response.code)) {
			throw new BizError(`SMTP响应异常：${response.text}`);
		}
		return response;
	}

	async readResponse() {
		while (true) {
			const lineEnd = this.buffer.indexOf('\n');
			if (lineEnd > -1) {
				const line = this.buffer.slice(0, lineEnd + 1).replace(/\r?\n$/, '');
				this.buffer = this.buffer.slice(lineEnd + 1);
				const code = Number(line.slice(0, 3));
				const lines = [line];

				if (line[3] !== '-') {
					return { code, text: lines.join('\n') };
				}

				while (true) {
					const nextLine = await this.readLine();
					lines.push(nextLine);
					if (nextLine.startsWith(`${code} `)) {
						return { code, text: lines.join('\n') };
					}
				}
			}

			const { value, done } = await this.reader.read();
			if (done) {
				throw new BizError('SMTP连接已关闭');
			}
			this.buffer += decoder.decode(value, { stream: true });
		}
	}

	async readLine() {
		while (true) {
			const lineEnd = this.buffer.indexOf('\n');
			if (lineEnd > -1) {
				const line = this.buffer.slice(0, lineEnd + 1).replace(/\r?\n$/, '');
				this.buffer = this.buffer.slice(lineEnd + 1);
				return line;
			}

			const { value, done } = await this.reader.read();
			if (done) {
				throw new BizError('SMTP连接已关闭');
			}
			this.buffer += decoder.decode(value, { stream: true });
		}
	}
}

const smtpService = {
	async send(config, params) {
		if (!config.host || !config.sender) {
			throw new BizError('SMTP未配置');
		}

		const client = new SmtpClient(config);
		try {
			await client.connect();
			await client.login();
			await client.send({
				envelopeFrom: config.sender,
				from: params.accountEmail || config.sender,
				name: params.name,
				to: params.receiveEmail,
				subject: params.subject,
				text: params.text,
				html: params.html,
				sendType: params.sendType,
				messageId: params.messageId
			});
			await client.quit();
		} catch (e) {
			client.close();
			throw e;
		}

		return {
			data: {
				id: crypto.randomUUID()
			}
		};
	}
};

export default smtpService;
