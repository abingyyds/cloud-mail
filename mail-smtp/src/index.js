import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import config from './config.js';

function safeEqual(left, right) {
	const a = Buffer.from(String(left));
	const b = Buffer.from(String(right));
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i += 1) {
		result |= a[i] ^ b[i];
	}
	return result === 0;
}

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
}

function htmlEscape(value = '') {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function textToHtml(text = '') {
	return htmlEscape(text).replace(/\r?\n/g, '<br>');
}

function authError(message = 'SMTP 认证失败') {
	const error = new Error(message);
	error.responseCode = 535;
	return error;
}

function commandError(message, responseCode = 550) {
	const error = new Error(message);
	error.responseCode = responseCode;
	return error;
}

function getSender(session) {
	return session.smtpFrom || session.smtpUser?.fromEmails?.[0] || '';
}

function toAttachment(item) {
	const content = Buffer.isBuffer(item.content)
		? item.content.toString('base64')
		: Buffer.from(item.content || '').toString('base64');

	const result = {
		filename: item.filename || 'attachment',
		type: item.contentType || 'application/octet-stream',
		content
	};

	if (item.cid) {
		result.contentId = `<${String(item.cid).replace(/^<|>$/g, '')}>`;
	}

	return result;
}

async function sendToSmmails(session, rawMessage) {
	const parsed = await simpleParser(rawMessage);
	const recipients = [...new Set((session.envelope?.rcptTo || [])
		.map(item => normalizeEmail(item.address))
		.filter(Boolean))];

	if (recipients.length === 0) {
		throw commandError('收件人不能为空', 550);
	}

	const fromEmail = getSender(session);
	const fromName = parsed.from?.value?.[0]?.name || '';
	const subject = String(parsed.subject || '').trim();
	const text = String(parsed.text || '');
	const html = parsed.html ? String(parsed.html) : textToHtml(text);

	if (!subject) {
		throw commandError('邮件标题不能为空', 550);
	}

	const body = {
		fromEmail,
		fromName,
		to: recipients,
		subject,
		text,
		content: html,
		attachments: (parsed.attachments || []).map(toAttachment)
	};

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), config.requestTimeout);

	const dynamicMode = !config.users;
	const endpoint = dynamicMode ? '/api/smtp/send' : '/api/open/sendAutoMail';
	const headers = {
		'Content-Type': 'application/json'
	};
	if (dynamicMode) {
		headers['X-SMTP-Relay-Token'] = config.relayToken;
		body.username = session.smtpUsername;
		body.password = session.smtpPassword;
	} else {
		headers.Authorization = `Bearer ${session.smtpUser.apiKey}`;
	}

	try {
		const response = await fetch(`${config.apiUrl}${endpoint}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: controller.signal
		});

		let result;
		try {
			result = await response.json();
		} catch {
			throw commandError(`SMmails 服务返回无效响应 (${response.status})`, 451);
		}

		if (!response.ok || result.code !== 200) {
			throw commandError(result.message || `SMmails 发信失败 (${response.status})`, 451);
		}
	} catch (error) {
		if (error.name === 'AbortError') {
			throw commandError('SMmails 发信请求超时', 451);
		}
		throw error.responseCode ? error : commandError(`SMmails 发信失败: ${error.message}`, 451);
	} finally {
		clearTimeout(timeout);
	}
}

async function authenticateDynamic(username, password) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), config.requestTimeout);
	try {
		const response = await fetch(`${config.apiUrl}/api/smtp/auth`, {
			method: 'POST',
			headers: {
				'X-SMTP-Relay-Token': config.relayToken,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ username, password }),
			signal: controller.signal
		});
		const result = await response.json();
		if (!response.ok || result.code !== 200 || !result.data) {
			throw new Error(result.message || 'SMTP 账号或密码错误');
		}
		return result.data;
	} catch (error) {
		if (error.name === 'AbortError') {
			throw new Error('SMTP 认证请求超时');
		}
		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

const server = new SMTPServer({
	secure: config.secure,
	key: config.tls?.key,
	cert: config.tls?.cert,
	name: process.env.SMTP_SERVER_NAME || 'smtp.smmails.local',
	maxMessageSize: config.maxMessageSize,
	authMethods: ['PLAIN', 'LOGIN'],
	logger: false,

	onConnect(session, callback) {
		callback();
	},

	onAuth(auth, session, callback) {
		if (config.requireTls && !session.secure && !config.allowInsecureAuth) {
			return callback(new Error('请先使用 STARTTLS 加密连接'));
		}

		const username = String(auth.username || '').trim();
		const password = String(auth.password || '');

		if (config.users) {
			const user = config.users.get(username);
			if (!user || !safeEqual(password, user.password)) {
				return callback(authError());
			}
			session.smtpUser = user;
			session.smtpUsername = username;
			session.smtpPassword = password;
			return callback(null, { user: username });
		}

		authenticateDynamic(username, password)
			.then(user => {
				session.smtpUser = user;
				session.smtpUsername = username;
				session.smtpPassword = password;
				callback(null, { user: username });
			})
			.catch(() => callback(authError()));
	},

	onMailFrom(address, session, callback) {
		if (!session.smtpUser) {
			return callback(commandError('请先进行 SMTP 认证', 530));
		}

		const sender = normalizeEmail(address.address);
		if (!session.smtpUser.fromEmails.includes(sender)) {
			return callback(commandError('发件地址未授权', 553));
		}

		session.smtpFrom = sender;
		return callback();
	},

	onRcptTo(address, session, callback) {
		if (!session.smtpUser) {
			return callback(commandError('请先进行 SMTP 认证', 530));
		}

		const currentCount = session.envelope?.rcptTo?.length || 0;
		if (currentCount >= config.maxRecipients) {
			return callback(commandError(`单封邮件最多 ${config.maxRecipients} 个收件人`, 452));
		}

		return callback();
	},

	onData(stream, session, callback) {
		const chunks = [];
		let total = 0;
		let rejected = false;

		stream.on('data', chunk => {
			if (rejected) return;
			total += chunk.length;
			if (total > config.maxMessageSize) {
				rejected = true;
				stream.destroy(commandError('邮件超过大小限制', 552));
				return;
			}
			chunks.push(chunk);
		});

		stream.on('error', error => callback(error));
		stream.on('end', async () => {
			if (rejected) return;
			try {
				await sendToSmmails(session, Buffer.concat(chunks));
				callback();
			} catch (error) {
				callback(error);
			}
		});
	}
});

server.on('error', error => {
	console.error(`[smtp] ${error.message}`);
});

server.listen(config.port, config.host, () => {
	console.log(`[smtp] listening on ${config.host}:${config.port} secure=${config.secure}`);
	console.log(`[smtp] mode=${config.users ? 'static' : 'dynamic'} api=${config.apiUrl}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
	process.on(signal, () => {
		server.close(() => process.exit(0));
	});
}
