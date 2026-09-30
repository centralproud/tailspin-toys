import { eq, asc, inArray, and } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game, Category, Publisher } from '../types/game';

export interface GameFilters {
    categoryId?: number | number[] | null;
    categoryIds?: number[] | null;
    publisherId?: number | number[] | null;
    publisherIds?: number[] | null;
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function normalizeIds(values?: number | number[] | null): number[] {
    if (values === undefined || values === null) {
        return [];
    }

    const normalized = Array.isArray(values) ? values : [values];
    return normalized.filter((value) => Number.isInteger(value) && value > 0);
}

function normalizeFilters(filters: GameFilters = {}): { categoryIds: number[]; publisherIds: number[] } {
    return {
        categoryIds: normalizeIds(filters.categoryId ?? filters.categoryIds ?? []),
        publisherIds: normalizeIds(filters.publisherId ?? filters.publisherIds ?? []),
    };
}

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

function applyFilters(query: ReturnType<typeof baseGamesQuery>, filters: GameFilters = {}) {
    const { categoryIds, publisherIds } = normalizeFilters(filters);
    const conditions = [];

    if (categoryIds.length > 0) {
        conditions.push(inArray(categories.id, categoryIds));
    }

    if (publisherIds.length > 0) {
        conditions.push(inArray(publishers.id, publisherIds));
    }

    if (conditions.length === 0) {
        return query;
    }

    return query.where(and(...conditions));
}

/** All games ordered by title. */
export async function getAllGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const rows = await applyFilters(baseGamesQuery(db), filters).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All categories ordered by name. */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}

/** All publishers ordered by name. */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}

/** All games for the selected category or categories. */
export async function getGamesByCategory(db: Database, categoryId: number | number[]): Promise<Game[]> {
    return getAllGames(db, { categoryId });
}

/** All games for the selected publisher or publishers. */
export async function getGamesByPublisher(db: Database, publisherId: number | number[]): Promise<Game[]> {
    return getAllGames(db, { publisherId });
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
