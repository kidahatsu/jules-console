## 2025-02-17 - [CRITICAL] Fix XSS Vulnerability in Markdown Rendering
**Vulnerability:** The application was using `react-markdown` to render user-provided input without sanitizing the output, making it vulnerable to Cross-Site Scripting (XSS).
**Learning:** We render untrusted user input using `react-markdown` in places such as `StarredRepoDetailModal.tsx` and `SessionDetails.tsx`. We must assume any notes or session prompt data could be malicious.
**Prevention:** Always use the `rehype-sanitize` plugin configured with `react-markdown` via the `rehypePlugins` prop to ensure the rendered HTML is safe against XSS attacks.

## 2023-10-27 - [Schema Validation Bypass in Profile Uploads]
**Vulnerability:** The application was parsing user-uploaded JSON files for profile configurations and casting them directly into application state (Zustand accounts) after merely verifying that the parsed output was an array. This allowed arbitrary, schema-violating objects to enter the application state.
**Learning:** Even internal tool configurations or profile imports can be vectors for state corruption or prototype pollution if they accept arbitrary JSON without structure enforcement. Relying on `Array.isArray()` is insufficient validation for object arrays.
**Prevention:** Always parse untrusted external JSON data through strict schemas like Zod `safeParse` to guarantee the expected shape and types before injecting it into global application state.
