interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Common cache policies for Jules Console.
 */
export const CachePolicy = {
    /**
     * Standard 5-minute TTL for repositories and starred collections.
     */
    STANDARD_TTL: 5 * 60 * 1000,

    /**
     * Short 1-minute TTL for high-velocity data like the Inbox.
     */
    INBOX_TTL: 60 * 1000,

    /**
     * Long 10-minute TTL for stable assets like Hugging Face models/spaces.
     */
    ASSET_TTL: 10 * 60 * 1000,

    /**
     * Checks if a cache entry is still fresh based on a given TTL.
     */
    isFresh: <T>(entry: CacheEntry<T>, ttl: number): boolean => {
        return entry.timestamp > 0 && (Date.now() - entry.timestamp < ttl);
    },

    /**
     * Validates that a list of data has the expected structure.
     * Prevents "Ghost Cache" where old, partially mapped data persists.
     */
    isValidList: <T>(data: T[], requiredField: keyof T): boolean => {
        return data.length === 0 || !!data[0][requiredField];
    }
};
