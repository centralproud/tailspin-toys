import { eq, asc, inArray, and } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game, Category, Publisher } from '../types/game';

/** Optional category and publisher constraints for catalog queries. */
export interface GameFilters {
    /** Match one or more category ids; takes precedence over `categoryIds`. */
    categoryId?: number | number[] | null;
    /** Match a list of category ids when `categoryId` is not provided. */
    categoryIds?: number[] | null;
    /** Match one or more publisher ids; takes precedence over `publisherIds`. */
    publisherId?: number | number[] | null;
    /** Match a list of publisher ids when `publisherId` is not provided. */
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

/** Joined database fields selected to build a UI-facing game. */
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

/**
 * Normalize optional id input and discard values that cannot identify a row.
 *
 * @param values - A single id, a list of ids, or no selection.
 * @returns Positive integer ids in the original order.
 */
function normalizeIds(values?: number | number[] | null): number[] {
    if (values === undefined || values === null) {
        return [];
    }

    const normalized = Array.isArray(values) ? values : [values];
    return normalized.filter((value) => Number.isInteger(value) && value > 0);
}

/** Resolve singular and plural filter aliases into normalized id lists. */
function normalizeFilters(filters: GameFilters = {}): { categoryIds: number[]; publisherIds: number[] } {
    return {
        categoryIds: normalizeIds(filters.categoryId ?? filters.categoryIds ?? []),
        publisherIds: normalizeIds(filters.publisherId ?? filters.publisherIds ?? []),
    };
}

/** Convert a joined query row into the app-facing game shape. */
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

/** Build the base game query with optional category and publisher relations. */
function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** Add category and publisher predicates to a game query when provided. */
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

/**
 * Return games ordered by title, optionally filtered by category and publisher.
 *
 * @param db - Database to query.
 * @param filters - Optional singular or plural category and publisher ids.
 * @returns Matching games with their related category and publisher.
 */
export async function getAllGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const rows = await applyFilters(baseGamesQuery(db), filters).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** Return all categories ordered by name. */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}

/** Return all publishers ordered by name. */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}

/**
 * Return games for one category or a set of categories, ordered by title.
 *
 * @param db - Database to query.
 * @param categoryId - Category id or ids to match.
 * @returns Matching games with their relations.
 */
export async function getGamesByCategory(db: Database, categoryId: number | number[]): Promise<Game[]> {
    return getAllGames(db, { categoryId });
}

/**
 * Return games for one publisher or a set of publishers, ordered by title.
 *
 * @param db - Database to query.
 * @param publisherId - Publisher id or ids to match.
 * @returns Matching games with their relations.
 */
export async function getGamesByPublisher(db: Database, publisherId: number | number[]): Promise<Game[]> {
    return getAllGames(db, { publisherId });
}

/** Return all game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Find one game by its id.
 *
 * @param db - Database to query.
 * @param id - Game id to look up.
 * @returns The matching game, or `null` if no game has that id.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
