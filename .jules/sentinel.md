## 2026-04-27 - [SECURITY ENHANCEMENT] Secure External Links in Markdown Rendering
**Vulnerability:** While not an active vulnerability, adding `target="_blank"` to open user-generated markdown links in new tabs without `rel="noopener noreferrer"` would create a reverse tabnabbing vulnerability, allowing malicious linked pages to access `window.opener`.
**Learning:** `react-markdown` does not automatically add `target="_blank"` or safety attributes to anchor tags when rendering links. If we want links to open in a new tab safely, we must manually configure both attributes.
**Prevention:** When configuring `ReactMarkdown` to render external links in new tabs, always customize the `a` tag via the `components` prop to include both `target="_blank"` and `rel="noopener noreferrer"` to prevent reverse tabnabbing vulnerabilities. To satisfy ESLint, ensure the `node` prop is destructured and bypassed using `// eslint-disable-next-line @typescript-eslint/no-unused-vars`.

## 2025-02-17 - [CRITICAL] Fix XSS Vulnerability in Markdown Rendering
**Vulnerability:** The application was using `react-markdown` to render user-provided input without sanitizing the output, making it vulnerable to Cross-Site Scripting (XSS).
**Learning:** We render untrusted user input using `react-markdown` in places such as `StarredRepoDetailModal.tsx` and `SessionDetails.tsx`. We must assume any notes or session prompt data could be malicious.
**Prevention:** Always use the `rehype-sanitize` plugin configured with `react-markdown` via the `rehypePlugins` prop to ensure the rendered HTML is safe against XSS attacks.

## 2023-10-27 - [Schema Validation Bypass in Profile Uploads]
**Vulnerability:** The application was parsing user-uploaded JSON files for profile configurations and casting them directly into application state (Zustand accounts) after merely verifying that the parsed output was an array. This allowed arbitrary, schema-violating objects to enter the application state.
**Learning:** Even internal tool configurations or profile imports can be vectors for state corruption or prototype pollution if they accept arbitrary JSON without structure enforcement. Relying on `Array.isArray()` is insufficient validation for object arrays.
**Prevention:** Always parse untrusted external JSON data through strict schemas like Zod `safeParse` to guarantee the expected shape and types before injecting it into global application state.

## 2024-03-27 - [Configuration Injection Prevention via Schema Validation]
**Vulnerability:** Import functionality for user configuration (identity profiles) in `src/components/SettingsModal.tsx` parsed user-uploaded JSON and directly injected it into application state without validating the structure or contents of the payload.
**Learning:** React applications that accept JSON configurations must treat uploaded files as untrusted input, the same as API requests or form data. Directly setting application state from unvalidated JSON exposes the app to state corruption and potential configuration injection attacks.
**Prevention:** Always validate uploaded configuration files against a strict schema (like Zod) before deserializing and applying the data to application state.

## 2025-04-04 - [CRITICAL] Prevent Information Leakage in Error Logs
**Vulnerability:** The application was logging raw API error responses (`errorText` and raw `err` objects) directly to the browser console. This could inadvertently expose sensitive internal details, API keys, URLs, or full stack traces to the client side.
**Learning:** Frontend applications must sanitize their error logs. Unfiltered logs can act as a vector for information leakage, giving attackers insight into backend infrastructure or exposing sensitive configuration parameters.
**Prevention:** Always log generic error messages (with status codes if necessary) instead of raw payload bodies or unhandled error objects in `console.error` calls.

## 2026-07-04 - Prevent Insecure Deserialization
**Vulnerability:** Unvalidated deserialization of `localStorage` data could lead to XSS/poisoning.
**Learning:** Always validate externally sourced data like `localStorage` before casting it.
**Prevention:** Apply a strict Zod schema definition with `.safeParse()` instead of directly casting JSON strings.

## 2025-05-15 - [SECURITY ENHANCEMENT] Prevent Information Leakage in `console.warn`
**Vulnerability:** The application was logging raw error objects directly to the browser console using `console.warn` in some hooks (e.g., `useJules.ts`, `useStarredRepos.ts`). This could expose sensitive internal details, similar to the previously fixed `console.error` issue.
**Learning:** All forms of client-side logging (`console.log`, `console.warn`, `console.error`) must be treated as potential vectors for information leakage. Sanitization rules apply uniformly across all logging methods.
**Prevention:** Always sanitize error objects before logging them with `console.warn`, extracting only the safe `message` property (e.g., `err instanceof Error ? err.message : "Unknown error"`), rather than passing the raw object.

## 2026-07-11 - [HIGH] Remove Debug console.log from Production Code
**Vulnerability:** `getUserRepos()` in `src/lib/github.ts` contained a `console.log("[getUserRepos] Starting concurrent fetch...")` debug statement. While this particular message doesn't leak secrets, production debug logs are an information disclosure risk, signalling internal architecture and timing to any observer of the browser console.
**Learning:** Debug `console.log` statements must never be present in production code paths. Even benign-looking messages reveal implementation details and establish a permissive logging culture that can lead to more serious leaks over time.
**Prevention:** Remove all debug `console.log` statements before committing. Use feature flags or proper dev-only logging utilities if runtime diagnostics are required.

## 2026-07-11 - [CRITICAL] URL Injection in getNotificationSubjectDetail
**Vulnerability:** `getNotificationSubjectDetail(url)` in `src/lib/github.ts` accepted a URL from an external notification payload, extracted only the pathname, and then passed it directly to `octokit.request()`. A crafted notification response with a URL pointing to a non-GitHub API host (e.g., `https://attacker.com/sensitive-path`) could, in theory, redirect authenticated GitHub API calls to unintended endpoints.
**Learning:** External URLs from API responses must never be trusted without validation. Extracting only a URL's pathname is insufficient if the host itself is not checked — the Octokit request `GET ${path}` pattern can be exploited via the path component.
**Prevention:** Always validate that the hostname of any inbound URL is exactly `api.github.com` before extracting and using the path in authenticated API calls. Added explicit check: `if (apiUrl.hostname !== "api.github.com") throw new Error(...)`.

## 2026-07-11 - [HIGH] Credential Double-Storage via Zustand Persist
**Vulnerability:** The Zustand store in `src/lib/store.ts` was configured with `persist` middleware without a `partialize` function. This caused the **entire** app state — including `accounts` (which contain `apiKey`, `githubToken`, and `hfToken`) — to be written to a second `localStorage` key: `ag-app-storage`. This created a silent second copy of all API credentials that was separate from the intentional `jules_accounts_v1` storage.
**Learning:** Zustand's `persist` middleware serializes the entire store state by default. When persisting stores that contain mixed sensitive/non-sensitive data, always use `partialize` to explicitly allowlist only the fields that should be persisted to `localStorage`.
**Prevention:** Added `partialize: (state) => ({ theme: state.theme })` so only the non-sensitive `theme` preference is written to `ag-app-storage`. Credentials remain in `jules_accounts_v1` managed by `saveAccounts()`.

## 2026-07-11 - [MEDIUM] Schema Duplication (Weaker Duplicate in jules.ts)
**Vulnerability:** `src/lib/jules.ts` defined its own `ProviderProfileSchema` that was a weaker duplicate of the canonical schema in `src/lib/validation.ts`. The `jules.ts` copy accepted any string for `id` (not UUID), any-length string for `apiKey` (no minimum), and any-length strings for tokens (no maximum). Any code path that happened to import from `jules.ts` would use the weaker schema for deserialization.
**Learning:** Having multiple definitions of the same schema is a maintenance and security hazard. Schema drift means one copy can become less strict over time, creating an exploitable inconsistency.
**Prevention:** Removed the duplicate `ProviderProfileSchema` from `jules.ts` and added an import from `validation.ts` instead. There is now a single source of truth for all profile validation with consistent, strict rules.

