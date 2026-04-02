## 2024-05-15 - [CRITICAL] Prevent Cross-Site Scripting (XSS) in Markdown Rendering
**Vulnerability:** The application was using `react-markdown` to render user-provided input without sanitization, which could lead to Cross-Site Scripting (XSS) attacks. If malicious users injected HTML or JavaScript into the rendered content, it could be executed within the context of the user's browser.
**Learning:** `react-markdown` by default doesn't sanitize the HTML if users supply raw HTML components or via external links. It is a critical issue that any tool rendering user input should securely strip dangerous code.
**Prevention:** Always use `rehype-sanitize` as a plugin for `react-markdown` using `rehypePlugins={[rehypeSanitize]}` to ensure safety against XSS attacks.
