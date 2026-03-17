# Design: Provider Credential Testing

This design implements a "Test Connection" feature within the Profile Settings, allowing users to verify their Jules, GitHub, and Hugging Face credentials before saving.

## Problem Statement
Users currently save profiles blindly. If a key is invalid, they only find out via the "Identity Alert" banner or missing content. A proactive "Test" button improves trust and speeds up onboarding.

## Proposed Solution
Add a "Test" button next to each credential input in the `SettingsModal`. When clicked, it will perform a lightweight, read-only API call using the *entered* (unsaved) token.

## Detailed Design

### 1. UI Integration (`SettingsModal.tsx`)
- Add a "Test" button next to Jules API Key, GitHub Token, and HF Token inputs.
- Use state to track test status per provider: `idle`, `testing`, `success`, `error`.
- Visual feedback:
  - `idle`: Simple "Test" text or icon.
  - `testing`: Spinner.
  - `success`: Green checkmark and "Valid".
  - `error`: Red alert and "Invalid".

### 2. Testing Logic (`src/lib/validation.ts` or new `src/lib/testers.ts`)
We need functions that accept a token and return a boolean or throw.

- **GitHub**: Call `GET /user` with the provided token.
- **Hugging Face**: Call `GET /api/whoami-v2` with the provided token.
- **Jules**: Call `GET /sessions?pageSize=1` with the provided `x-goog-api-key`.

### 3. API Enhancements
- **GitHub**: Add `testGithubToken(token: string)` to `lib/github.ts`.
- **HF**: Add `testHFToken(token: string)` to `lib/huggingface.ts`.
- **Jules**: Add `testJulesKey(key: string)` to `lib/jules.ts`.

## Alternative Approaches
- **Approach 1 (Auto-test)**: Test automatically on input blur. Too many API calls, potentially rate-limiting.
- **Approach 2 (Test all on Save)**: Test all keys when "Save" is clicked. Good, but slower feedback.
- **Approach 3 (Manual per key)**: Manual "Test" button. (Selected - best user control).

## Success Criteria
- User can enter a key and click "Test".
- UI reflects the validity of the key immediately.
- Keys are still only saved to `localStorage` when "Save Profile" is clicked.
