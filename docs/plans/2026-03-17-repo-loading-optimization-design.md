# Design Plan: Concurrent SWR Repo Loading Optimization

## 1. Problem Statement
The current GitHub repository loading process is sequential and blocking. Users with many repositories experience long wait times as the application fetches pages one-by-one (up to 10 pages, 100 repos each). Additionally, the UI does not show cached data immediately, leading to a "blank slate" experience on every refresh.

## 2. Proposed Solution: "Concurrent SWR Architecture"

### A. Concurrent Pagination (Parallel Fetching)
Instead of a `while` loop that waits for page 1 before requesting page 2, we will:
- Always fetch page 1 first to determine if there are more pages (via the `Link` header or repo count).
- If more pages exist, fetch pages 2-5 (or more) in parallel using `Promise.all`.
- Limit concurrency to avoid triggering GitHub's secondary rate limits.

### B. Stale-While-Revalidate (SWR) Pattern
- **Immediate Hydration**: On mount, `useGithubRepos` will immediately set the state to the current `cachedRepos` (if available).
- **Background Refresh**: Fetching starts automatically in the background.
- **Atomic Update**: Only update the UI and Cache once the entire batch or substantial chunks are completed to prevent list "shuffling".

### C. Refined State Management
- Reduce the number of `setRepos` calls.
- Use a `isRevalidating` flag instead of a simple `loading` flag when showing stale data.

## 3. Implementation Details

### `src/lib/github.ts`
- Update `getUserRepos` to support batch fetching.
- Add logic to parse the `Link` header or use a heuristic to decide how many pages to fetch concurrently.

### `src/hooks/useGithubRepos.ts`
- Implement the SWR logic.
- Ensure the cache is updated atomically.

## 4. Verification Plan
- **Performance**: Measure time-to-interactive for a user with 300+ repositories (expect ~60% reduction in load time).
- **Correctness**: Ensure no duplicate repositories are shown.
- **UX**: Verify that stale data is visible immediately and the refresh is seamless.
