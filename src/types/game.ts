/**
 * Centralized type definitions for game-related data structures.
 * These interfaces describe the shape returned by the Drizzle data-access
 * helpers in `src/lib/games.ts` and consumed by Astro pages/components.
 */

/** Publisher summary embedded in game data returned to the UI. */
export interface Publisher {
    id: number;
    name: string;
}

/** Category summary embedded in game data returned to the UI. */
export interface Category {
    id: number;
    name: string;
}

/** Game data returned by the data-access layer and rendered by the UI. */
export interface Game {
    id: number;
    title: string;
    description: string;
    publisher: Publisher | null;
    category: Category | null;
    starRating: number | null;
}
