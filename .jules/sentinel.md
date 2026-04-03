## 2024-05-24 - [HIGH] Missing XSS Protection in ReactMarkdown
**Vulnerability:** Found `react-markdown` being used without a sanitizer (`rehype-sanitize`) in `StarredRepoDetailModal.tsx` and `SessionDetails.tsx`. User-supplied markdown (like notes or session descriptions) could potentially execute malicious scripts.
**Learning:** ReactMarkdown doesn't sanitize raw HTML or potential XSS vectors out-of-the-box in its recent versions. It relies on `rehype-sanitize` to filter out unsafe content.
**Prevention:** Always include `rehypePlugins={[rehypeSanitize]}` when rendering user-supplied markdown with `react-markdown`.
