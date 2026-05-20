
## 2026-05-20 - [MEDIUM] Prevent Information Leakage in Error Logs
**Vulnerability:** Several `console.error` calls were directly logging the full `err` object. This can inadvertently expose sensitive internal details, API keys, URLs, or full stack traces to the client side.
**Learning:** Frontend applications must sanitize their error logs. Unfiltered logs can act as a vector for information leakage, giving attackers insight into backend infrastructure or exposing sensitive configuration parameters.
**Prevention:** Always log generic error messages (with status codes if necessary) instead of raw payload bodies or unhandled error objects in `console.error` calls. We can extract `err.message` if `err instanceof Error` instead of logging the full object.
