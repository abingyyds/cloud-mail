import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const apiKey = sqliteTable('api_key', {
	apiKeyId: integer('api_key_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	name: text('name').notNull().default(''),
	keyHash: text('key_hash').notNull(),
	keyPrefix: text('key_prefix').notNull().default(''),
	status: integer('status').default(0).notNull(),
	dayLimit: integer('day_limit').default(0).notNull(),
	monthLimit: integer('month_limit').default(0).notNull(),
	totalLimit: integer('total_limit').default(0).notNull(),
	dayUsed: integer('day_used').default(0).notNull(),
	monthUsed: integer('month_used').default(0).notNull(),
	totalUsed: integer('total_used').default(0).notNull(),
	quotaDate: text('quota_date').default('').notNull(),
	quotaMonth: text('quota_month').default('').notNull(),
	lastUseTime: text('last_use_time'),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	isDel: integer('is_del').default(0).notNull()
});

export default apiKey;
