## 2026-04-09 - [HIGH] Fix Reverse Tabnabbing in Markdown Rendering
**Vulnerability:** The application was using `react-markdown` to render user-provided input, which could contain external links. By default, these links did not have `target="_blank"` and `rel="noopener noreferrer"`, exposing the application to reverse tabnabbing vulnerabilities when clicked.
**Learning:** External links rendered via `react-markdown` must be explicitly configured to open safely in new tabs to prevent malicious destination pages from accessing the `window.opener` object and navigating the original tab to a phishing site.
**Prevention:** Always customize the `a` tag via the `components` prop in `ReactMarkdown` to include `target="_blank"` and `rel="noopener noreferrer"`.

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
