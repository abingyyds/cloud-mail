import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const senderIdentity = sqliteTable('sender_identity', {
	senderIdentityId: integer('sender_identity_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	email: text('email').notNull(),
	name: text('name').notNull().default(''),
	domain: text('domain').notNull().default(''),
	type: text('type').notNull().default('platform'),
	verifyToken: text('verify_token').notNull().default(''),
	verifyStatus: integer('verify_status').default(0).notNull(),
	resendToken: text('resend_token').notNull().default(''),
	resendStatus: text('resend_status').notNull().default('not_configured'),
	resendLastCheckTime: text('resend_last_check_time'),
	resendLastError: text('resend_last_error').notNull().default(''),
	status: integer('status').default(0).notNull(),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	isDel: integer('is_del').default(0).notNull()
});

export default senderIdentity;
