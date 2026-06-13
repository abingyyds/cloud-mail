import { and, count, desc, eq, gt, sql } from 'drizzle-orm';
import dayjs from 'dayjs';
import BizError from '../error/biz-error';
import orm from '../entity/orm';
import apiKey from '../entity/api-key';
import senderIdentity from '../entity/sender-identity';
import email from '../entity/email';
import accountService from './account-service';
import emailUtils from '../utils/email-utils';
import verifyUtils from '../utils/verify-utils';
import publicService from './public-service';
import userService from './user-service';
import roleService from './role-service';
import { apiKeyConst, emailConst, isDel, senderIdentityConst } from '../const/entity-const';
import { t } from '../i18n/i18n';

const encoder = new TextEncoder();
const MAX_LOG_SIZE = 50;

const emailStatusText = {
	[emailConst.status.RECEIVE]: 'receive',
	[emailConst.status.SENT]: 'sent',
	[emailConst.status.DELIVERED]: 'delivered',
	[emailConst.status.BOUNCED]: 'bounced',
	[emailConst.status.COMPLAINED]: 'complained',
	[emailConst.status.DELAYED]: 'delayed',
	[emailConst.status.SAVING]: 'saving',
	[emailConst.status.NOONE]: 'noone',
	[emailConst.status.FAILED]: 'failed'
};

function bytesToBase64Url(bytes) {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value) {
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(value));
	return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function genApiKey() {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return `smm_${bytesToBase64Url(bytes)}`;
}

function genVerifyToken() {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return `smmails-verify-${bytesToBase64Url(bytes)}`;
}

function currentQuotaWindow() {
	return {
		day: dayjs().format('YYYY-MM-DD'),
		month: dayjs().format('YYYY-MM')
	};
}

function normalizeLimit(value) {
	const limit = Number(value || 0);
	if (!Number.isFinite(limit) || limit < 0) {
		throw new BizError('额度必须是大于等于 0 的数字');
	}
	return Math.floor(limit);
}

function quotaRemaining(limit, used) {
	if (!limit) {
		return null;
	}
	return Math.max(limit - used, 0);
}

function maskKey(row) {
	const { day, month } = currentQuotaWindow();
	const dayUsed = row.quotaDate === day ? Number(row.dayUsed || 0) : 0;
	const monthUsed = row.quotaMonth === month ? Number(row.monthUsed || 0) : 0;
	const totalUsed = Number(row.totalUsed || 0);
	const dayLimit = Number(row.dayLimit || 0);
	const monthLimit = Number(row.monthLimit || 0);
	const totalLimit = Number(row.totalLimit || 0);

	return {
		apiKeyId: row.apiKeyId,
		name: row.name,
		keyPrefix: row.keyPrefix,
		status: row.status,
		dayLimit,
		monthLimit,
		totalLimit,
		dayUsed,
		monthUsed,
		totalUsed,
		dayRemaining: quotaRemaining(dayLimit, dayUsed),
		monthRemaining: quotaRemaining(monthLimit, monthUsed),
		totalRemaining: quotaRemaining(totalLimit, totalUsed),
		lastUseTime: row.lastUseTime,
		createTime: row.createTime
	};
}

function maskSender(row) {
	return {
		...row,
		dnsHost: row.type === senderIdentityConst.type.CUSTOM ? `_smmails.${row.domain}` : '',
		dnsType: row.type === senderIdentityConst.type.CUSTOM ? 'TXT' : '',
		dnsValue: row.type === senderIdentityConst.type.CUSTOM ? row.verifyToken : ''
	};
}

function parseRecipientJson(value) {
	try {
		const list = JSON.parse(value || '[]');
		if (!Array.isArray(list)) return [];
		return list.map(item => item.address).filter(Boolean);
	} catch (e) {
		return [];
	}
}

function normalizeRecipientCount(params) {
	const value = params.to || params.receiveEmail || params.email;
	const list = Array.isArray(value) ? value : [value];
	const recipients = [...new Set(list
		.flatMap(item => typeof item === 'string' ? item.split(',') : [item])
		.map(item => String(item || '').trim().toLowerCase())
		.filter(Boolean)
	)];

	if (recipients.length === 0) {
		throw new BizError('收件人不能为空');
	}

	return recipients.length;
}

function normalizeQuotaParams(params) {
	return {
		dayLimit: normalizeLimit(params.dayLimit),
		monthLimit: normalizeLimit(params.monthLimit),
		totalLimit: normalizeLimit(params.totalLimit)
	};
}

async function queryDnsTxt(name) {
	const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, {
		headers: {
			accept: 'application/dns-json'
		}
	});

	if (!response.ok) {
		throw new BizError('DNS 查询失败，请稍后重试');
	}

	const data = await response.json();
	return (data.Answer || [])
		.filter(item => item.type === 16)
		.map(item => String(item.data || '').replace(/"/g, '').trim());
}

const openApiService = {
	async overview(c, userId) {
		const userRow = await userService.selectById(c, userId);
		const roleRow = await roleService.selectById(c, userRow.type);
		const [keyTotal, senderTotal, logTotal] = await Promise.all([
			orm(c).select({ total: count() }).from(apiKey)
				.where(and(eq(apiKey.userId, userId), eq(apiKey.isDel, isDel.NORMAL))).get(),
			orm(c).select({ total: count() }).from(senderIdentity)
				.where(and(eq(senderIdentity.userId, userId), eq(senderIdentity.isDel, isDel.NORMAL))).get(),
			orm(c).select({ total: count() }).from(email)
				.where(and(eq(email.userId, userId), gt(email.apiKeyId, 0), eq(email.type, emailConst.type.SEND), eq(email.isDel, isDel.NORMAL))).get()
		]);

		const sendCount = Number(userRow.sendCount || 0);
		const sendLimit = userRow.email === c.env.admin ? 0 : Number(roleRow?.sendCount || 0);

		return {
			quota: {
				sendType: userRow.email === c.env.admin ? 'unlimited' : roleRow?.sendType || 'count',
				used: sendCount,
				limit: sendLimit,
				remaining: quotaRemaining(sendLimit, sendCount)
			},
			apiKeyCount: keyTotal.total,
			senderCount: senderTotal.total,
			apiLogCount: logTotal.total
		};
	},

	async apiKeyList(c, userId) {
		const list = await orm(c).select().from(apiKey)
			.where(and(eq(apiKey.userId, userId), eq(apiKey.isDel, isDel.NORMAL)))
			.orderBy(desc(apiKey.apiKeyId))
			.all();
		return list.map(maskKey);
	},

	async apiKeyCreate(c, params, userId) {
		params = params || {};
		const name = String(params.name || 'Default').trim().slice(0, 50);
		const quota = normalizeQuotaParams(params);
		const key = genApiKey();
		const keyHash = await sha256(key);
		const { day, month } = currentQuotaWindow();
		const row = await orm(c).insert(apiKey).values({
			userId,
			name,
			keyHash,
			keyPrefix: key.slice(0, 12),
			status: apiKeyConst.status.OPEN,
			...quota,
			quotaDate: day,
			quotaMonth: month
		}).returning().get();

		return {
			...maskKey(row),
			key
		};
	},

	async apiKeyDelete(c, params, userId) {
		await orm(c).update(apiKey).set({ isDel: isDel.DELETE }).where(
			and(eq(apiKey.apiKeyId, Number(params.apiKeyId)), eq(apiKey.userId, userId))
		).run();
	},

	async apiKeySetStatus(c, params, userId) {
		const status = Number(params.status);
		if (![apiKeyConst.status.OPEN, apiKeyConst.status.CLOSE].includes(status)) {
			throw new BizError('API Key 状态无效');
		}
		await orm(c).update(apiKey).set({ status }).where(
			and(eq(apiKey.apiKeyId, Number(params.apiKeyId)), eq(apiKey.userId, userId))
		).run();
	},

	async apiKeySetQuota(c, params, userId) {
		await orm(c).update(apiKey).set(normalizeQuotaParams(params || {})).where(
			and(eq(apiKey.apiKeyId, Number(params.apiKeyId)), eq(apiKey.userId, userId))
		).run();
	},

	async senderList(c, userId) {
		const list = await orm(c).select().from(senderIdentity)
			.where(and(eq(senderIdentity.userId, userId), eq(senderIdentity.isDel, isDel.NORMAL)))
			.orderBy(desc(senderIdentity.senderIdentityId))
			.all();
		return list.map(maskSender);
	},

	async senderCreate(c, params, userId) {
		const emailAddress = String(params.email || '').trim().toLowerCase();
		if (!verifyUtils.isEmail(emailAddress)) {
			throw new BizError(t('notEmail'));
		}

		const accountRow = await accountService.selectByEmailIncludeDel(c, emailAddress);
		const isPlatformSender = accountRow && accountRow.userId === userId && accountRow.isDel === isDel.NORMAL;
		const domain = emailUtils.getDomain(emailAddress);
		const type = isPlatformSender ? senderIdentityConst.type.PLATFORM : senderIdentityConst.type.CUSTOM;
		const verifyStatus = isPlatformSender ? senderIdentityConst.verifyStatus.VERIFIED : senderIdentityConst.verifyStatus.PENDING;
		const verifyToken = isPlatformSender ? '' : genVerifyToken();
		const values = {
			userId,
			email: emailAddress,
			name: String(params.name || emailUtils.getName(emailAddress)).trim().slice(0, 50),
			domain,
			type,
			verifyStatus,
			verifyToken,
			status: senderIdentityConst.status.OPEN,
			isDel: isDel.NORMAL
		};

		const existRow = await orm(c).select().from(senderIdentity)
			.where(sql`${senderIdentity.email} COLLATE NOCASE = ${emailAddress}`).get();

		if (existRow && existRow.isDel === isDel.NORMAL) {
			throw new BizError('发信身份已存在');
		}

		if (existRow) {
			const row = await orm(c).update(senderIdentity).set(values)
				.where(eq(senderIdentity.senderIdentityId, existRow.senderIdentityId))
				.returning().get();
			return maskSender(row);
		}

		const row = await orm(c).insert(senderIdentity).values(values).returning().get();
		return maskSender(row);
	},

	async senderDelete(c, params, userId) {
		await orm(c).update(senderIdentity).set({ isDel: isDel.DELETE }).where(
			and(eq(senderIdentity.senderIdentityId, Number(params.senderIdentityId)), eq(senderIdentity.userId, userId))
		).run();
	},

	async senderSetStatus(c, params, userId) {
		const status = Number(params.status);
		if (![senderIdentityConst.status.OPEN, senderIdentityConst.status.CLOSE].includes(status)) {
			throw new BizError('发信身份状态无效');
		}
		await orm(c).update(senderIdentity).set({ status }).where(
			and(eq(senderIdentity.senderIdentityId, Number(params.senderIdentityId)), eq(senderIdentity.userId, userId))
		).run();
	},

	async senderVerify(c, params, userId) {
		const row = await orm(c).select().from(senderIdentity).where(
			and(
				eq(senderIdentity.senderIdentityId, Number(params.senderIdentityId)),
				eq(senderIdentity.userId, userId),
				eq(senderIdentity.isDel, isDel.NORMAL)
			)
		).get();

		if (!row) {
			throw new BizError('发信身份不存在');
		}

		if (row.type === senderIdentityConst.type.PLATFORM) {
			const accountRow = await accountService.selectByEmailIncludeDel(c, row.email);
			if (!accountRow || accountRow.userId !== userId || accountRow.isDel === isDel.DELETE) {
				throw new BizError('平台邮箱不存在或不属于当前用户');
			}
		} else {
			const dnsValues = await queryDnsTxt(`_smmails.${row.domain}`);
			if (!dnsValues.includes(row.verifyToken)) {
				throw new BizError(`DNS TXT 未验证通过，请添加 _smmails.${row.domain} TXT ${row.verifyToken}`);
			}
		}

		await orm(c).update(senderIdentity).set({
			verifyStatus: senderIdentityConst.verifyStatus.VERIFIED
		}).where(eq(senderIdentity.senderIdentityId, row.senderIdentityId)).run();
	},

	async senderMarkVerified(c, params, userId) {
		const userRow = await userService.selectById(c, userId);
		if (userRow.email !== c.env.admin) {
			throw new BizError(t('unauthorized'), 403);
		}

		await orm(c).update(senderIdentity).set({
			verifyStatus: senderIdentityConst.verifyStatus.VERIFIED
		}).where(eq(senderIdentity.senderIdentityId, Number(params.senderIdentityId))).run();
	},

	async logs(c, params, userId) {
		params = params || {};
		const size = Math.min(Math.max(Number(params.size || 20), 1), MAX_LOG_SIZE);
		const num = Math.max(Number(params.num || 1), 1);
		const offset = (num - 1) * size;
		const conditions = [
			eq(email.userId, userId),
			gt(email.apiKeyId, 0),
			eq(email.type, emailConst.type.SEND),
			eq(email.isDel, isDel.NORMAL)
		];

		if (params.apiKeyId) {
			conditions.push(eq(email.apiKeyId, Number(params.apiKeyId)));
		}

		const listQuery = orm(c).select({
			emailId: email.emailId,
			apiKeyId: email.apiKeyId,
			apiKeyName: apiKey.name,
			keyPrefix: apiKey.keyPrefix,
			resendEmailId: email.resendEmailId,
			sendEmail: email.sendEmail,
			subject: email.subject,
			code: email.code,
			recipient: email.recipient,
			status: email.status,
			message: email.message,
			createTime: email.createTime
		}).from(email)
			.leftJoin(apiKey, eq(email.apiKeyId, apiKey.apiKeyId))
			.where(and(...conditions))
			.orderBy(desc(email.emailId))
			.limit(size)
			.offset(offset)
			.all();

		const totalQuery = orm(c).select({ total: count() }).from(email)
			.where(and(...conditions)).get();

		const [list, totalRow] = await Promise.all([listQuery, totalQuery]);

		return {
			list: list.map(row => ({
				emailId: row.emailId,
				apiKeyId: row.apiKeyId,
				apiKeyName: row.apiKeyName,
				keyPrefix: row.keyPrefix,
				resendEmailId: row.resendEmailId,
				from: row.sendEmail,
				to: parseRecipientJson(row.recipient),
				subject: row.subject,
				code: row.code,
				status: row.status,
				statusText: emailStatusText[row.status] || 'unknown',
				message: row.message,
				createTime: row.createTime
			})),
			total: totalRow.total
		};
	},

	async verifyApiKey(c) {
		const authorization = c.req.header('Authorization') || '';
		const key = authorization.replace(/^Bearer\s+/i, '').trim();
		if (!key) {
			throw new BizError('API Key 不能为空', 401);
		}

		const keyHash = await sha256(key);
		const keyRow = await orm(c).select().from(apiKey).where(
			and(
				eq(apiKey.keyHash, keyHash),
				eq(apiKey.status, apiKeyConst.status.OPEN),
				eq(apiKey.isDel, isDel.NORMAL)
			)
		).get();

		if (!keyRow) {
			throw new BizError('API Key 无效', 401);
		}

		const { day, month } = currentQuotaWindow();
		const updates = { lastUseTime: sql`CURRENT_TIMESTAMP` };
		if (keyRow.quotaDate !== day) {
			keyRow.dayUsed = 0;
			keyRow.quotaDate = day;
			updates.dayUsed = 0;
			updates.quotaDate = day;
		}
		if (keyRow.quotaMonth !== month) {
			keyRow.monthUsed = 0;
			keyRow.quotaMonth = month;
			updates.monthUsed = 0;
			updates.quotaMonth = month;
		}

		await orm(c).update(apiKey).set(updates).where(eq(apiKey.apiKeyId, keyRow.apiKeyId)).run();
		return keyRow;
	},

	async sendCode(c, params) {
		return this.sendWithQuota(c, params, publicService.sendCode.bind(publicService));
	},

	async sendNotice(c, params) {
		return this.sendWithQuota(c, params, publicService.sendNotice.bind(publicService));
	},

	async sendAutoMail(c, params) {
		return this.sendWithQuota(c, params, publicService.sendAutoMail.bind(publicService));
	},

	async sendStatus(c, params) {
		const keyRow = await this.verifyApiKey(c);
		return publicService.sendStatus(c, {
			...params,
			userId: keyRow.userId,
			apiKeyId: keyRow.apiKeyId
		});
	},

	async sendWithQuota(c, params, sender) {
		const prepared = await this.prepareSend(c, params || {});
		await this.reserveQuota(c, prepared.keyRow, prepared.recipientCount);

		try {
			return await sender(c, prepared.params);
		} catch (e) {
			await this.rollbackQuota(c, prepared.keyRow, prepared.recipientCount);
			throw e;
		}
	},

	async prepareSend(c, params) {
		const keyRow = await this.verifyApiKey(c);
		const senderRow = await this.assertSender(c, params.fromEmail, keyRow.userId);
		const recipientCount = normalizeRecipientCount(params);
		this.assertQuota(keyRow, recipientCount);

		let deliveryAccountEmail = senderRow.email;
		if (senderRow.type === senderIdentityConst.type.CUSTOM) {
			const userRow = await userService.selectById(c, keyRow.userId);
			const accountRow = await accountService.selectByEmailIncludeDel(c, userRow.email);
			if (!accountRow || accountRow.isDel === isDel.DELETE) {
				throw new BizError('当前用户没有可用的平台邮箱账号');
			}
			deliveryAccountEmail = accountRow.email;
		}

		return {
			keyRow,
			senderRow,
			recipientCount,
			params: {
				...params,
				fromEmail: senderRow.email,
				fromName: params.fromName || params.name || senderRow.name,
				deliveryAccountEmail,
				accountEmail: senderRow.email,
				senderUserId: keyRow.userId,
				apiKeyId: keyRow.apiKeyId,
				trustedSenderIdentity: true
			}
		};
	},

	assertQuota(keyRow, recipientCount) {
		const used = maskKey(keyRow);
		if (used.dayLimit && used.dayUsed + recipientCount > used.dayLimit) {
			throw new BizError('API Key 今日额度不足', 403);
		}
		if (used.monthLimit && used.monthUsed + recipientCount > used.monthLimit) {
			throw new BizError('API Key 本月额度不足', 403);
		}
		if (used.totalLimit && used.totalUsed + recipientCount > used.totalLimit) {
			throw new BizError('API Key 总额度不足', 403);
		}
	},

	async reserveQuota(c, keyRow, recipientCount) {
		const result = await c.env.db.prepare(`
			UPDATE api_key
			SET day_used = day_used + ?,
				month_used = month_used + ?,
				total_used = total_used + ?
			WHERE api_key_id = ?
				AND status = ?
				AND is_del = ?
				AND (day_limit = 0 OR day_used + ? <= day_limit)
				AND (month_limit = 0 OR month_used + ? <= month_limit)
				AND (total_limit = 0 OR total_used + ? <= total_limit)
		`).bind(
			recipientCount,
			recipientCount,
			recipientCount,
			keyRow.apiKeyId,
			apiKeyConst.status.OPEN,
			isDel.NORMAL,
			recipientCount,
			recipientCount,
			recipientCount
		).run();

		if (result.meta?.changes !== 1) {
			throw new BizError('API Key 额度不足', 403);
		}
	},

	async rollbackQuota(c, keyRow, recipientCount) {
		try {
			await c.env.db.prepare(`
				UPDATE api_key
				SET day_used = MAX(day_used - ?, 0),
					month_used = MAX(month_used - ?, 0),
					total_used = MAX(total_used - ?, 0)
				WHERE api_key_id = ?
			`).bind(
				recipientCount,
				recipientCount,
				recipientCount,
				keyRow.apiKeyId
			).run();
		} catch (e) {
			console.error(`API Key 额度回滚失败：${e.message}`);
		}
	},

	async assertSender(c, fromEmail, userId) {
		fromEmail = String(fromEmail || '').trim().toLowerCase();
		if (!fromEmail) {
			throw new BizError('fromEmail 不能为空');
		}

		const row = await orm(c).select().from(senderIdentity).where(
			and(
				sql`${senderIdentity.email} COLLATE NOCASE = ${fromEmail}`,
				eq(senderIdentity.userId, userId),
				eq(senderIdentity.status, senderIdentityConst.status.OPEN),
				eq(senderIdentity.verifyStatus, senderIdentityConst.verifyStatus.VERIFIED),
				eq(senderIdentity.isDel, isDel.NORMAL)
			)
		).get();

		if (!row) {
			throw new BizError('发信身份不存在或未验证', 403);
		}

		return row;
	}
};

export default openApiService;
