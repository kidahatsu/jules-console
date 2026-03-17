# Plan: Missing API Keys Notification Implementation

## Goal
Implement a `KeyRequiredBanner` in the `Layout` to alert the user when critical API keys are missing and provide a direct path to the profile settings.

## Context
- `src/components/Layout.tsx`: The main dashboard structure.
- `src/lib/store.ts`: Source of the `activeAccount`.
- `src/components/SettingsModal.tsx`: Where keys are configured.

## Tasks

### 1. Create `KeyRequiredBanner` Component
- [ ] Create a new component in `src/components/KeyRequiredBanner.tsx`.
- [ ] Define its props: `onOpenSettings: () => void`.
- [ ] Implement logic to check for missing `apiKey`, `githubToken`, or `hfToken` from the store's `activeAccount`.
- [ ] Use `AlertCircle` icon and `framer-motion` for a smooth entry.
- **Verification**: Manually inspect the file for correct store usage and styling.

### 2. Integrate into `Layout.tsx`
- [ ] Import `KeyRequiredBanner`.
- [ ] Place it just above the `<Outlet />` in the main content area.
- [ ] Pass `setIsSettingsOpen(true)` as the `onOpenSettings` prop.
- **Verification**: Run `npm run build` to ensure no TypeScript errors.

### 3. Final Validation
- [ ] Verify the banner appears when keys are missing (simulated by clearing a profile).
- [ ] Verify the "Open Settings" button opens the `SettingsModal`.
- **Verification**: Manual visual verification in the browser (if possible) or by ensuring the logic and components are correctly wired.
