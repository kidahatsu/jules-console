# Implementation Plan: Hugging Face Parallel RepoGroup Integration

**Date**: 2026-02-27
**Goal**: Integrate Hugging Face account management, real-time space monitoring, and multi-token support into the Jules Admin dashboard.

## Context
- **Design Doc**: `docs/plans/2026-02-27-huggingface-integration-design.md`
- **Primary Files**: `src/lib/huggingface.ts`, `src/hooks/useHuggingFace.ts`, `src/pages/HuggingFace.tsx`, `src/components/SettingsModal.tsx`.

## Tasks

### 1. Provider Core & Auth Refactor
- [x] **1.1. Create HF Library**: Implement `src/lib/huggingface.ts` with `getUserModels` and `getUserSpaces` functions.
    - **Verification**: Run a manual test script or check types with `npm run build`.
- [x] **1.2. Refactor Account Schema**: Update `JulesAccount` interface in `src/lib/jules.ts` to `ProviderProfile` supporting `hfToken`.
    - **Verification**: `npm run build` passes with updated interface.
- [x] **1.3. Update Settings UI**: Add Hugging Face token input field to `SettingsModal.tsx`.
    - **Verification**: Open Settings modal and verify field existence/persistence.

### 2. State & UI Foundations
- [x] **2.1. Create HF Hook**: Implement `src/hooks/useHuggingFace.ts` for asset fetching and status polling.
    - **Verification**: Log hook output in a temporary component to confirm data retrieval.
- [x] **2.2. Register HF Route**: Add `/huggingface` route to `App.tsx` and "Hugging Face" item to `Layout.tsx` sidebar.
    - **Verification**: Click sidebar item and navigate to the new (empty) page.

### 3. Asset Management UI
- [x] **3.1. Build HF Asset Cards**: Create `src/components/HFAssetCard.tsx` with status indicators for Spaces and metadata for Models.
    - **Verification**: Cards render correctly with mock data.
- [x] **3.2. Implement HF RepoGroup View**: Build the main `HuggingFace.tsx` page with grid layout and type filtering (Models vs Spaces).
    - **Verification**: Asset grid displays live data from the HF API.

### 4. Dashboard & Synergy
- [x] **4.1. Dashboard Integration**: Add "Active Spaces" Stat Card and HF RepoGroup summary to `Dashboard.tsx`.
    - **Verification**: Dashboard correctly reflects the number of running HF Spaces.
- [x] **4.2. Jules repoless Integration**: Update `JulesActionModal.tsx` to handle HF URLs correctly for analysis sessions.
    - **Verification**: Dispatch a session from an HF card and verify the prompt contains the HF URL.

### 5. Final Audit
- [x] **Audit & Polish**: Run full linting, build checks, and verify all 60 FPS animations.
    - **Verification**: `npm run lint && npm run build` passes with 0 errors.
