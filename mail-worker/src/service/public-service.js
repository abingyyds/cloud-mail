import BizError from '../error/biz-error';
import orm from '../entity/orm';
import { v4 as uuidv4 } from 'uuid';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import saltHashUtils from '../utils/crypto-utils';
import cryptoUtils from '../utils/crypto-utils';
import emailUtils from '../utils/email-utils';
import roleService from './role-service';
import verifyUtils from '../utils/verify-utils';
import { t } from '../i18n/i18n';
import reqUtils from '../utils/req-utils';
import dayjs from 'dayjs';
import { emailConst, isDel, roleConst } from '../const/entity-const';
import email from '../entity/email';
import userService from './user-service';
import KvConst from '../const/kv-const';
import accountService from './account-service';
import emailService from './email-service';

const MAX_PUBLIC_RECIPIENTS = 50;
const MAX_SUBJECT_LENGTH = 200;
const MAX_HTML_LENGTH = 200000;
const MAX_TEXT_LENGTH = 100000;
const MAX_CODE_LENGTH = 12;

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

function escapeHtml(value = '') {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function textToHtml(text = '') {
	return escapeHtml(text).replace(/\n/g, '<br>');
}

function normalizeSpace(value = '') {
	return String(value).replace(/\s+/g, ' ').trim();
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

const publicService = {

	async emailList(c, params) {
		params = params || {};

		let { toEmail, content, subject, sendName, sendEmail, timeSort, num, size, type , isDel } = params

		const query = orm(c).select({
				emailId: email.emailId,
				sendEmail: email.sendEmail,
				sendName: email.name,
				subject: email.subject,
				toEmail: email.toEmail,
				toName: email.toName,
				type: email.type,
				createTime: email.createTime,
				content: email.content,
				text: email.text,
				isDel: email.isDel,
		}).from(email)

		if (!size) {
			size = 20
		}

		if (!num) {
			num = 1
		}

		size = Number(size);
		num = Number(num);

		num = (num - 1) * size;

		let conditions = []

		if (toEmail) {
			conditions.push(sql`${email.toEmail} COLLATE NOCASE LIKE ${toEmail}`)
		}

		if (sendEmail) {
			conditions.push(sql`${email.sendEmail} COLLATE NOCASE LIKE ${sendEmail}`)
		}

		if (sendName) {
			conditions.push(sql`${email.name} COLLATE NOCASE LIKE ${sendName}`)
		}

		if (subject) {
			conditions.push(sql`${email.subject} COLLATE NOCASE LIKE ${subject}`)
		}

		if (content) {
			conditions.push(sql`${email.content} COLLATE NOCASE LIKE ${content}`)
		}

		if (type || type === 0) {
			conditions.push(eq(email.type, type))
		}

		if (isDel || isDel === 0) {
			conditions.push(eq(email.isDel, isDel))
		}

		if (conditions.length === 1) {
			query.where(...conditions)
		} else if (conditions.length > 1) {
			query.where(and(...conditions))
		}

		if (timeSort === 'asc') {
			query.orderBy(asc(email.emailId));
		} else {
			query.orderBy(desc(email.emailId));
		}

		return query.limit(size).offset(num);

	},

	async addUser(c, params) {
		params = params || {};
		const { list } = params;

		if (list.length === 0) return;

		for (const emailRow of list) {
			if (!verifyUtils.isEmail(emailRow.email)) {
				throw new BizError(t('notEmail'));
			}

			if (!c.env.domain.includes(emailUtils.getDomain(emailRow.email))) {
				throw new BizError(t('notEmailDomain'));
			}

			const { salt, hash } = await saltHashUtils.hashPassword(
				emailRow.password || cryptoUtils.genRandomPwd()
			);

			emailRow.salt = salt;
			emailRow.hash = hash;
		}


		const activeIp = reqUtils.getIp(c);
		const { os, browser, device } = reqUtils.getUserAgent(c);
		const activeTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

		const roleList = await roleService.roleSelectUse(c);
		const defRole = roleList.find(roleRow => roleRow.isDefault === roleConst.isDefault.OPEN);

		const userList = [];

		for (const emailRow of list) {
			let { email, hash, salt, roleName } = emailRow;
			let type = defRole.roleId;

			if (roleName) {
				const roleRow = roleList.find(role => role.name === roleName);
				type = roleRow ? roleRow.roleId : type;
			}

			const userSql = `INSERT INTO user (email, password, salt, type, os, browser, active_ip, create_ip, device, active_time, create_time)
			VALUES ('${email}', '${hash}', '${salt}', '${type}', '${os}', '${browser}', '${activeIp}', '${activeIp}', '${device}', '${activeTime}', '${activeTime}')`

			const accountSql = `INSERT INTO account (email, name, user_id)
			VALUES ('${email}', '${emailUtils.getName(email)}', 0);`;

			userList.push(c.env.db.prepare(userSql));
			userList.push(c.env.db.prepare(accountSql));

		}

		userList.push(c.env.db.prepare(`UPDATE account SET user_id = (SELECT user_id FROM user WHERE user.email = account.email) WHERE user_id = 0;`))

		try {
			await c.env.db.batch(userList);
		} catch (e) {
			if(e.message.includes('SQLITE_CONSTRAINT')) {
				throw new BizError(t('emailExistDatabase'))
			} else {
				throw e
			}
		}

	},

	async genToken(c, params) {
		params = params || {};

		await this.verifyUser(c, params)

		const uuid = uuidv4();

		await c.env.kv.put(KvConst.PUBLIC_KEY, uuid);

		return {token: uuid}
	},

	async sendCode(c, params) {
		params = params || {};
		const productName = normalizeSpace(params.productName || params.appName || 'SMmails');
		const purpose = normalizeSpace(params.purpose || '验证');
		const expireMinutes = this.normalizeExpireMinutes(params.expireMinutes);
		const code = params.code ? normalizeSpace(params.code) : this.generateNumericCode(params.length);

		if (!code || code.length > MAX_CODE_LENGTH) {
			throw new BizError('验证码长度必须在 1 到 12 位之间');
		}

		const subject = this.normalizeSubject(params.subject || `${productName} 验证码`);
		const text = params.text || [
			`你的 ${productName} ${purpose}验证码是：${code}`,
			`验证码 ${expireMinutes} 分钟内有效，请勿泄露给他人。`,
			params.remark ? normalizeSpace(params.remark) : ''
		].filter(Boolean).join('\n');

		const content = params.content || this.buildCodeHtml({
			productName,
			purpose,
			code,
			expireMinutes,
			remark: params.remark
		});

		const emailRows = await this.sendPublicMail(c, {
			...params,
			subject,
			text,
			content,
			code,
			attachments: []
		});

		return {
			code,
			expireMinutes,
			emails: this.toPublicSendResult(emailRows)
		};
	},

	async sendNotice(c, params) {
		params = params || {};
		const productName = normalizeSpace(params.productName || params.appName || 'SMmails');
		const title = this.normalizeSubject(params.title || params.subject || `${productName} 通知`);
		const body = normalizeSpace(params.body || params.message || params.text || '');

		if (!body && !params.content) {
			throw new BizError('通知内容不能为空');
		}

		const text = params.text || body || emailUtils.htmlToText(params.content);
		const content = params.content || this.buildNoticeHtml({
			productName,
			title,
			body,
			actionText: params.actionText,
			actionUrl: params.actionUrl
		});

		const emailRows = await this.sendPublicMail(c, {
			...params,
			subject: title,
			text,
			content
		});

		return {
			emails: this.toPublicSendResult(emailRows)
		};
	},

	async sendAutoMail(c, params) {
		params = params || {};
		const subject = this.normalizeSubject(params.subject);
		const content = this.normalizeContent(params.content || (params.text ? textToHtml(params.text) : ''));
		const text = this.normalizeText(params.text || emailUtils.htmlToText(content));

		const emailRows = await this.sendPublicMail(c, {
			...params,
			subject,
			text,
			content
		});

		return {
			emails: this.toPublicSendResult(emailRows)
		};
	},

	async sendStatus(c, params) {
		params = params || {};
		const emailIds = this.normalizeEmailIds(params.emailIds || params.emailId);
		const conditions = [
			inArray(email.emailId, emailIds),
			eq(email.type, emailConst.type.SEND),
			eq(email.isDel, isDel.NORMAL)
		];

		if (params.userId) {
			conditions.push(eq(email.userId, Number(params.userId)));
		}

		if (params.apiKeyId) {
			conditions.push(eq(email.apiKeyId, Number(params.apiKeyId)));
		}

		const rows = await orm(c).select({
			emailId: email.emailId,
			resendEmailId: email.resendEmailId,
			sendEmail: email.sendEmail,
			subject: email.subject,
			code: email.code,
			recipient: email.recipient,
			status: email.status,
			message: email.message,
			createTime: email.createTime
		}).from(email).where(and(...conditions)).all();

		return rows.map(row => ({
			emailId: row.emailId,
			resendEmailId: row.resendEmailId,
			from: row.sendEmail,
			to: parseRecipientJson(row.recipient),
			subject: row.subject,
			code: row.code,
			status: row.status,
			statusText: emailStatusText[row.status] || 'unknown',
			message: row.message,
			createTime: row.createTime
		}));
	},

	async sendPublicMail(c, params) {
		const { accountRow, userRow } = await this.resolveSender(c, params);
		const receiveEmail = this.normalizeRecipients(params.to || params.receiveEmail || params.email);
		const subject = this.normalizeSubject(params.subject);
		const content = this.normalizeContent(params.content || '');
		const text = this.normalizeText(params.text || emailUtils.htmlToText(content));
		const attachments = this.normalizeAttachments(params.attachments);
		const name = normalizeSpace(params.name || params.fromName || accountRow.name || emailUtils.getName(accountRow.email));

		return emailService.send(c, {
			accountId: accountRow.accountId,
			name,
			sendType: 'send',
			receiveEmail,
			text,
			content,
			subject,
			code: params.code || '',
			attachments,
			apiKeyId: params.apiKeyId || 0,
			fromEmail: params.trustedSenderIdentity ? params.fromEmail : accountRow.email,
			accountEmail: params.trustedSenderIdentity ? params.accountEmail : accountRow.email
		}, userRow.userId);
	},

	async resolveSender(c, params) {
		let accountRow = null;

		if (params.trustedSenderIdentity && params.deliveryAccountEmail) {
			accountRow = await accountService.selectByEmailIncludeDel(c, String(params.deliveryAccountEmail).trim());
			if (accountRow?.isDel === isDel.DELETE) {
				accountRow = null;
			}
		} else if (params.accountId) {
			accountRow = await accountService.selectById(c, Number(params.accountId));
		} else if (params.fromEmail) {
			accountRow = await accountService.selectByEmailIncludeDel(c, String(params.fromEmail).trim());
			if (accountRow?.isDel === isDel.DELETE) {
				accountRow = null;
			}
		} else {
			accountRow = await accountService.selectByEmailIncludeDel(c, c.env.admin);
			if (accountRow?.isDel === isDel.DELETE) {
				accountRow = null;
			}
		}

		if (!accountRow) {
			throw new BizError(t('senderAccountNotExist'));
		}

		const userRow = await userService.selectById(c, accountRow.userId);
		if (!userRow || userRow.isDel === isDel.DELETE) {
			throw new BizError(t('notExistUser'));
		}

		if (params.trustedSenderIdentity && params.senderUserId && userRow.userId !== Number(params.senderUserId)) {
			throw new BizError(t('unauthorized'), 403);
		}

		if (userRow.email !== c.env.admin) {
			const sendRoleList = await roleService.selectByIdsHasPermKey(c, [userRow.type], 'email:send');
			if (sendRoleList.length === 0) {
				throw new BizError(t('unauthorized'), 403);
			}
		}

		return { accountRow, userRow };
	},

	normalizeRecipients(value) {
		const list = Array.isArray(value) ? value : [value];
		const recipients = [...new Set(list
			.flatMap(item => typeof item === 'string' ? item.split(',') : [item])
			.map(item => String(item || '').trim().toLowerCase())
			.filter(Boolean)
		)];

		if (recipients.length === 0) {
			throw new BizError('收件人不能为空');
		}

		if (recipients.length > MAX_PUBLIC_RECIPIENTS) {
			throw new BizError(`单次最多发送 ${MAX_PUBLIC_RECIPIENTS} 个收件人`);
		}

		for (const item of recipients) {
			if (!verifyUtils.isEmail(item)) {
				throw new BizError(t('notEmail'));
			}
		}

		return recipients;
	},

	normalizeSubject(subject) {
		subject = normalizeSpace(subject);
		if (!subject) {
			throw new BizError('邮件标题不能为空');
		}
		if (subject.length > MAX_SUBJECT_LENGTH) {
			throw new BizError(`邮件标题不能超过 ${MAX_SUBJECT_LENGTH} 个字符`);
		}
		return subject;
	},

	normalizeContent(content) {
		content = String(content || '');
		if (!content.trim()) {
			throw new BizError('邮件内容不能为空');
		}
		if (content.length > MAX_HTML_LENGTH) {
			throw new BizError(`邮件 HTML 内容不能超过 ${MAX_HTML_LENGTH} 个字符`);
		}
		return content;
	},

	normalizeText(text) {
		text = String(text || '');
		if (text.length > MAX_TEXT_LENGTH) {
			throw new BizError(`邮件文本内容不能超过 ${MAX_TEXT_LENGTH} 个字符`);
		}
		return text;
	},

	normalizeAttachments(attachments) {
		if (!attachments) {
			return [];
		}
		if (!Array.isArray(attachments)) {
			throw new BizError('附件必须是数组');
		}
		if (attachments.length > 10) {
			throw new BizError(t('attLimit'));
		}
		return attachments;
	},

	normalizeExpireMinutes(value) {
		const expireMinutes = Number(value || 10);
		if (!Number.isFinite(expireMinutes) || expireMinutes < 1 || expireMinutes > 1440) {
			throw new BizError('验证码有效期必须在 1 到 1440 分钟之间');
		}
		return Math.floor(expireMinutes);
	},

	normalizeEmailIds(value) {
		const list = Array.isArray(value) ? value : String(value || '').split(',');
		const emailIds = [...new Set(list.map(item => Number(item)).filter(item => Number.isInteger(item) && item > 0))];

		if (emailIds.length === 0) {
			throw new BizError('emailId 不能为空');
		}

		if (emailIds.length > 50) {
			throw new BizError('单次最多查询 50 封邮件状态');
		}

		return emailIds;
	},

	generateNumericCode(length = 6) {
		length = Number(length || 6);
		if (!Number.isInteger(length) || length < 4 || length > MAX_CODE_LENGTH) {
			throw new BizError(`验证码长度必须在 4 到 ${MAX_CODE_LENGTH} 位之间`);
		}

		const bytes = new Uint8Array(length);
		crypto.getRandomValues(bytes);
		return Array.from(bytes).map(byte => byte % 10).join('');
	},

	buildCodeHtml({ productName, purpose, code, expireMinutes, remark }) {
		const remarkHtml = remark ? `<p style="margin:16px 0 0;color:#64748b;font-size:14px;line-height:22px;">${escapeHtml(remark)}</p>` : '';

		return `
<div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;line-height:1.6;padding:24px;">
	<h1 style="font-size:20px;line-height:28px;margin:0 0 16px;">${escapeHtml(productName)} ${escapeHtml(purpose)}验证码</h1>
	<p style="margin:0 0 16px;color:#334155;">你的验证码是：</p>
	<div style="font-size:32px;letter-spacing:6px;font-weight:700;color:#0f172a;margin:0 0 16px;">${escapeHtml(code)}</div>
	<p style="margin:0;color:#64748b;font-size:14px;line-height:22px;">验证码 ${expireMinutes} 分钟内有效，请勿泄露给他人。</p>
	${remarkHtml}
</div>`;
	},

	buildNoticeHtml({ productName, title, body, actionText, actionUrl }) {
		const action = actionText && actionUrl
			? `<p style="margin:24px 0 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;">${escapeHtml(actionText)}</a></p>`
			: '';

		return `
<div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;line-height:1.6;padding:24px;">
	<p style="margin:0 0 8px;color:#64748b;font-size:14px;">${escapeHtml(productName)}</p>
	<h1 style="font-size:20px;line-height:28px;margin:0 0 16px;">${escapeHtml(title)}</h1>
	<div style="color:#334155;font-size:15px;">${textToHtml(body)}</div>
	${action}
</div>`;
	},

	toPublicSendResult(emailRows) {
		return emailRows.map(row => ({
			emailId: row.emailId,
			resendEmailId: row.resendEmailId,
			from: row.sendEmail,
			to: parseRecipientJson(row.recipient),
			subject: row.subject,
			status: row.status,
			statusText: emailStatusText[row.status] || 'unknown',
			createTime: row.createTime
		}));
	},

	async verifyUser(c, params) {

		const { email, password } = params

		const userRow = await userService.selectByEmailIncludeDel(c, email);

		if (email !== c.env.admin) {
			throw new BizError(t('notAdmin'));
		}

		if (!userRow || userRow.isDel === isDel.DELETE) {
			throw new BizError(t('notExistUser'));
		}

		if (!await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			throw new BizError(t('IncorrectPwd'));
		}
	}

}

export default publicService
