import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

function bool(value, fallback = false) {
	if (value === undefined || value === '') return fallback;
	return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function positiveInt(value, fallback) {
	const number = Number(value ?? fallback);
	return Number.isInteger(number) && number > 0 ? number : fallback;
}

function parseUsers() {
	let raw = process.env.SMTP_USERS_JSON;

	if (!raw && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD && process.env.SMMAILS_API_KEY && process.env.SMTP_FROM_EMAIL) {
		raw = JSON.stringify([{
			username: process.env.SMTP_USERNAME,
			password: process.env.SMTP_PASSWORD,
			apiKey: process.env.SMMAILS_API_KEY,
			fromEmail: process.env.SMTP_FROM_EMAIL
		}]);
	}

	if (!raw) {
		throw new Error('SMTP_USERS_JSON 或 SMTP_USERNAME/SMTP_PASSWORD/SMMAILS_API_KEY/SMTP_FROM_EMAIL 未配置');
	}

	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new Error(`SMTP_USERS_JSON 不是有效 JSON: ${error.message}`);
	}

	const list = Array.isArray(parsed)
		? parsed
		: Object.entries(parsed || {}).map(([username, value]) => ({ username, ...value }));

	if (list.length === 0) {
		throw new Error('SMTP_USERS_JSON 至少需要一个 SMTP 账号');
	}

	const users = new Map();
	for (const item of list) {
		const username = String(item.username || '').trim();
		const password = String(item.password || '');
		const apiKey = String(item.apiKey || '').trim();
		const fromEmails = Array.isArray(item.fromEmails)
			? item.fromEmails
			: [item.fromEmail];
		const normalizedFromEmails = [...new Set(fromEmails
			.map(email => String(email || '').trim().toLowerCase())
			.filter(Boolean))];

		if (!username || !password || !apiKey || normalizedFromEmails.length === 0) {
			throw new Error('每个 SMTP 账号必须包含 username、password、apiKey 和 fromEmail/fromEmails');
		}

		if (users.has(username)) {
			throw new Error(`SMTP 账号重复: ${username}`);
		}

		users.set(username, {
			username,
			password,
			apiKey,
			fromEmails: normalizedFromEmails
		});
	}

	return users;
}

function readTlsFile(filePath, name) {
	if (!filePath) return undefined;
	const resolved = path.resolve(filePath);
	if (!fs.existsSync(resolved)) {
		throw new Error(`${name} 文件不存在: ${resolved}`);
	}
	return fs.readFileSync(resolved);
}

const secure = bool(process.env.SMTP_SECURE, false);
const requireTls = bool(process.env.SMTP_REQUIRE_TLS, true);
const allowInsecureAuth = bool(process.env.SMTP_ALLOW_INSECURE_AUTH, false);
const tlsKeyPath = process.env.SMTP_TLS_KEY_PATH || '';
const tlsCertPath = process.env.SMTP_TLS_CERT_PATH || '';
const tls = tlsKeyPath && tlsCertPath
	? { key: readTlsFile(tlsKeyPath, 'SMTP_TLS_KEY_PATH'), cert: readTlsFile(tlsCertPath, 'SMTP_TLS_CERT_PATH') }
	: undefined;

if ((secure || (requireTls && !allowInsecureAuth)) && !tls) {
	throw new Error('启用 SMTP TLS 时必须配置 SMTP_TLS_KEY_PATH 和 SMTP_TLS_CERT_PATH');
}

const config = {
	host: process.env.SMTP_LISTEN_HOST || '0.0.0.0',
	port: positiveInt(process.env.SMTP_PORT, secure ? 465 : 587),
	secure,
	tls,
	requireTls,
	allowInsecureAuth,
	apiUrl: String(process.env.SMMAILS_API_URL || '').replace(/\/$/, ''),
	requestTimeout: positiveInt(process.env.SMMAILS_API_TIMEOUT_MS, 30000),
	maxMessageSize: positiveInt(process.env.SMTP_MAX_MESSAGE_SIZE, 10 * 1024 * 1024),
	maxRecipients: positiveInt(process.env.SMTP_MAX_RECIPIENTS, 50),
	users: parseUsers()
};

if (!config.apiUrl) {
	throw new Error('SMMAILS_API_URL 未配置');
}

export default config;
