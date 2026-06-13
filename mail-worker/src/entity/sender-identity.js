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
	status: integer('status').default(0).notNull(),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	isDel: integer('is_del').default(0).notNull()
});

export default senderIdentity;
