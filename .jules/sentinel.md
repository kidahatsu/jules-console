## 2025-02-17 - [CRITICAL] Fix XSS Vulnerability in Markdown Rendering
**Vulnerability:** The application was using `react-markdown` to render user-provided input without sanitizing the output, making it vulnerable to Cross-Site Scripting (XSS).
**Learning:** We render untrusted user input using `react-markdown` in places such as `StarredRepoDetailModal.tsx` and `SessionDetails.tsx`. We must assume any notes or session prompt data could be malicious.
**Prevention:** Always use the `rehype-sanitize` plugin configured with `react-markdown` via the `rehypePlugins` prop to ensure the rendered HTML is safe against XSS attacks.
