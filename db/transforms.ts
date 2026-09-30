/**
 * Pure, side-effect-free helpers for turning the seed CSV into database
 * records. Kept separate from any database access so they can be unit tested
 * in isolation and reused by the seed script.
 */

/** A normalized game record parsed from the seed CSV. */
export interface GameCsvRow {
    /** Game title from the seed CSV. */
    title: string;
    /** Category assigned to the game. */
    category: string;
    /** Publisher of the game. */
    publisher: string;
    /** Original game description. */
    description: string;
}

const CROWDFUNDING_BLURB = ' Support this game through our crowdfunding platform!';

/**
 * Minimal RFC-4180-style CSV parser supporting quoted fields, escaped quotes
 * (""), and newlines inside quoted values. Returns rows keyed by header name.
 */
export function parseCsv(content: string): Record<string, string>[] {
    const normalizedContent = content.replace(/^\uFEFF/, '');
    if (normalizedContent.trim().length === 0) {
        return [];
    }

    const records: string[][] = [];
    let field = '';
    let record: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < normalizedContent.length; i++) {
        const char = normalizedContent[i];

        if (inQuotes) {
            if (char === '"') {
                if (normalizedContent[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            record.push(field);
            field = '';
        } else if (char === '\n' || char === '\r') {
            // Handle CRLF by skipping the paired \n.
            if (char === '\r' && normalizedContent[i + 1] === '\n') {
                i++;
            }
            record.push(field);
            field = '';
            if (record.some((value) => value.length > 0) || record.length > 1) {
                records.push(record);
            }
            record = [];
        } else {
            field += char;
        }
    }

    // Flush trailing field/record (file without trailing newline).
    if (field.length > 0 || record.length > 0) {
        record.push(field);
        if (record.some((value) => value.length > 0)) {
            records.push(record);
        }
    }

    if (records.length === 0) {
        return [];
    }

    const [header, ...rows] = records;
    const normalizedHeader = header.map((key) => key.trim());

    return rows.map((row) => {
        const entry: Record<string, string> = {};
        normalizedHeader.forEach((key, index) => {
            entry[key] = (row[index] ?? '').trim();
        });
        return entry;
    });
}

/**
 * Parse the games seed CSV into trimmed game records, skipping rows without a title.
 *
 * @param content - Raw CSV text with the expected game columns.
 * @returns Valid game rows in the same order as the input.
 */
export function parseGamesCsv(content: string): GameCsvRow[] {
    return parseCsv(content)
        .filter((row) => (row.Title ?? '').trim().length > 0)
        .map((row) => ({
            title: (row.Title ?? '').trim(),
            category: (row.Category ?? '').trim(),
            publisher: (row.Publisher ?? '').trim(),
            description: (row.Description ?? '').trim(),
        }))
        .filter((row) => row.title.length > 0 && row.category.length > 0 && row.publisher.length > 0);
}

/** Build the standard crowdfunding description for a category. */
export function categoryDescription(name: string): string {
    return `Collection of ${name} games available for crowdfunding`;
}

/** Build the standard crowdfunding description for a publisher. */
export function publisherDescription(name: string): string {
    return `${name} is a game publisher seeking funding for exciting new titles`;
}

/** Append the platform's standard crowdfunding blurb to a game description. */
export function gameDescription(rawDescription: string): string {
    const normalizedDescription = rawDescription.trim();
    return normalizedDescription.endsWith(CROWDFUNDING_BLURB)
        ? normalizedDescription
        : normalizedDescription + CROWDFUNDING_BLURB;
}

/** Return distinct category names in their first-seen order. */
export function uniqueCategories(rows: GameCsvRow[]): string[] {
    return [...new Set(rows.map((row) => row.category).filter((name) => name.trim().length > 0))];
}

/** Return distinct publisher names in their first-seen order. */
export function uniquePublishers(rows: GameCsvRow[]): string[] {
    return [...new Set(rows.map((row) => row.publisher).filter((name) => name.trim().length > 0))];
}

/**
 * Deterministically derive a star rating in [3.0, 5.0] (one decimal place)
 * from the game title. Using a stable hash instead of Math.random keeps
 * static builds reproducible.
 */
export function ratingFromTitle(title: string): number {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
    }
    // 21 buckets -> 3.0, 3.1, ... 5.0
    const tenths = hash % 21;
    return Math.round((3.0 + tenths / 10) * 10) / 10;
}
