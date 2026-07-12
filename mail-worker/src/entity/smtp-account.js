import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const smtpAccount = sqliteTable('smtp_account', {
	smtpAccountId: integer('smtp_account_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	apiKeyId: integer('api_key_id').notNull(),
	senderIdentityId: integer('sender_identity_id').notNull(),
	name: text('name').notNull().default(''),
	username: text('username').notNull(),
	passwordHash: text('password_hash').notNull(),
	passwordSalt: text('password_salt').notNull(),
	status: integer('status').notNull().default(0),
	lastUseTime: text('last_use_time'),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	isDel: integer('is_del').notNull().default(0)
});

export default smtpAccount;
