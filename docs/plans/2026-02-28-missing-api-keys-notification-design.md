# Design: Missing API Keys Notification

This design addresses the requirement to gracefully handle missing API keys by notifying the user and guiding them to the settings page.

## Problem Statement
When `.env` is empty or keys are missing from the active profile, the application fails silently or shows empty states without explanation. Users need to be prompted to enter their keys in the profile settings.

## Proposed Solution
Introduce a `KeyRequiredBanner` component in the main `Layout`. This banner will monitor the `activeAccount` from the store and display a prominent alert if critical keys are missing.

## Detailed Design

### 1. `KeyRequiredBanner` Component
- **Location**: Top of the main content area in `src/components/Layout.tsx`.
- **Visibility**: Shown only when `activeAccount` has missing keys.
- **Keys to check**:
  - `apiKey` (Jules API Key) - REQUIRED
  - `githubToken` (GitHub Token) - RECOMMENDED (Repos won't work without it)
  - `hfToken` (Hugging Face Token) - OPTIONAL (HF features won't work)
- **UI Elements**:
  - Warning icon (`AlertCircle`).
  - Clear message: "Identity Alert: Jules Console requires your API keys to orchestrate sessions and repositories."
  - Action button: "Open Settings" which triggers `setIsSettingsOpen(true)` in `Layout`.

### 2. Integration with `Layout.tsx`
- Add a state or derived value to check for missing keys.
- Render the `KeyRequiredBanner` just above the `Outlet`.

### 3. Logic for "Missing"
A key is missing if it's an empty string or undefined.
Since `jules.ts` seeds the default account with `env.ts` values, if the `.env` is empty, these will be empty strings.

## Alternative Approaches
- **Approach 1 (Banner)**: Sticky banner at the top. (Selected)
- **Approach 2 (Overlay)**: Full-screen overlay. Too intrusive.
- **Approach 3 (Feature-level)**: Show error in each hook. Inconsistent.

## Success Criteria
- User sees a banner when no Jules API key is present.
- User can click a button in the banner to open settings.
- Banner disappears once keys are saved and valid.
