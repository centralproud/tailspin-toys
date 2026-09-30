import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

/** Publishers represented in the game catalog. */
export const publishers = sqliteTable('publishers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    description: text('description'),
});

/** Categories available for catalog games. */
export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    description: text('description'),
});

/** Games listed by the crowdfunding platform. */
export const games = sqliteTable('games', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    starRating: real('star_rating'),
    categoryId: integer('category_id')
        .notNull()
        .references(() => categories.id),
    publisherId: integer('publisher_id')
        .notNull()
        .references(() => publishers.id),
});

/** Inferred row type for a publisher record. */
export type PublisherRow = typeof publishers.$inferSelect;
/** Inferred row type for a category record. */
export type CategoryRow = typeof categories.$inferSelect;
/** Inferred row type for a game record. */
export type GameRow = typeof games.$inferSelect;
