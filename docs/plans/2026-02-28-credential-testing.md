# Plan: Credential Testing Implementation

## Goal
Add "Test Connection" buttons to the `SettingsModal` to allow real-time verification of Jules, GitHub, and HF tokens.

## Context
- `src/components/SettingsModal.tsx`: The primary UI for editing profiles.
- `src/lib/jules.ts`, `src/lib/github.ts`, `src/lib/huggingface.ts`: Library files to add test functions.

## Tasks

### 1. Add Library Test Functions
- [ ] Add `testJulesKey(key: string)` to `src/lib/jules.ts`.
- [ ] Add `testGithubToken(token: string)` to `src/lib/github.ts`.
- [ ] Add `testHFToken(token: string)` to `src/lib/huggingface.ts`.
- **Verification**: Run `npm run build` to ensure types are correct.

### 2. Implement Testing State in `SettingsModal`
- [ ] Add state variables for `testStatus` (jules, github, hf).
- [ ] Implement `handleTestConnection` helper in `SettingsModal.tsx`.
- **Verification**: Manually check component logic.

### 3. Add "Test" Buttons to UI
- [ ] Insert "Test" buttons next to each key input in `SettingsModal.tsx`.
- [ ] Style them with loading spinners and status icons (Check/X).
- **Verification**: Run `npm run build` and visually verify in browser.

### 4. Final Polish
- [ ] Ensure buttons are disabled during testing.
- [ ] Clear test status when input changes.
- **Verification**: Manual interaction testing.
