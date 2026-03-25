## 2024-05-24 - Validate Imported Configuration
**Vulnerability:** Insecure Deserialization / Missing Input Validation in `SettingsModal.tsx`
**Learning:** The application imported a JSON file to set the `accounts` state without validating its contents against a schema, only checking if it was an array. This could allow a malicious JSON payload to bypass expected structural boundaries.
**Prevention:** Always validate imported configuration structures with a runtime schema validation tool like Zod to ensure external data matches application state expectations.
