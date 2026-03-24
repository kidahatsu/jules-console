## 2024-05-24 - Missing Input Validation in JSON File Import
**Vulnerability:** The settings import logic used `JSON.parse` and directly passed the output into the application state via `setAccounts(imported)` as long as `imported` was an Array. Malicious or malformed data inside the array could be ingested and saved.
**Learning:** Checking `Array.isArray` is not sufficient to guarantee structural integrity of the objects within an imported JSON payload. File uploads (even local settings files) must be treated as untrusted user input.
**Prevention:** Always use schema validation (e.g. `z.array(Schema).safeParse()`) on all imported payloads before updating application state or writing to storage.
