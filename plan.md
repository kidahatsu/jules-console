1. **Fix `any` typings in tests**
    - Memory says: "When asserting mocked functions in Vitest, avoid type casting to `any` (e.g., `(console.error as any)`). Instead, use `vi.mocked()` (e.g., `vi.mocked(console.error)`) to comply with strict `@typescript-eslint/no-explicit-any` linting rules."
    - We will update `src/lib/__tests__/security_sanitization.test.ts` to use `vi.mocked(console.error).mock.calls[0]`.

2. **Verify changes**
    - Run `pnpm lint` to make sure the eslint violation is gone.
    - Run `pnpm test` to make sure it passes.

3. **Complete pre commit steps**
    - Call the pre commit tool.

4. **Submit changes**
