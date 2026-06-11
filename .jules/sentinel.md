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
## 2026-06-11 - Fix Insecure Deserialization of Accounts
**Vulnerability:** Insecure deserialization in getAccounts where data retrieved from localStorage was parsed using JSON.parse without validation.
**Learning:** Parsing local storage directly can lead to unexpected types and bypass type safety checks, causing potential crashes or security issues.
**Prevention:** Always validate data retrieved from localStorage using a schema like Zod before casting or mapping.
