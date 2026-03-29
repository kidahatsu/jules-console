## 2025-02-28 - [Add XSS protection to markdown components]
**Vulnerability:** Found `react-markdown` components rendering user-provided input without sanitization. This could lead to Cross-Site Scripting (XSS) attacks.
**Learning:** `react-markdown` itself does not sanitize HTML when used without plugins. A dedicated sanitizer like `rehype-sanitize` should be added to `rehypePlugins` to ensure safety.
**Prevention:** Always include `rehype-sanitize` as a plugin when rendering potentially untrusted markdown content with `react-markdown`.
