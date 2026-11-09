import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const healthCheck = sqliteTable('health_check', {
  id: text('id').primaryKey(),
  checkedAt: integer('checked_at').notNull(),
});
