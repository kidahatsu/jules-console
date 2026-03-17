# Design: Hugging Face Parallel RepoGroup Integration

**Date**: 2026-02-27
**Status**: Approved
**Architect**: Technical Architect (AI)

## 1. Objective
Expand the Jules Admin dashboard to manage Hugging Face (HF) assets (Models, Spaces, Datasets) as a primary repoGroup alongside GitHub repositories. Enable multi-token management and real-time monitoring of AI deployments.

## 2. Architectural Components

### 2.1 Provider Layer (`src/lib/huggingface.ts`)
- **API Client**: Lightweight wrapper for the Hugging Face Hub API.
- **Features**:
    - `getUserModels()`: Fetches models owned by the authenticated user.
    - `getUserSpaces()`: Fetches spaces and their current runtime status.
    - `getUserDatasets()`: Fetches training data assets.
- **Authentication**: Uses Bearer tokens passed via the `Authorization` header.

### 2.2 Account Switcher Refactor
- **Identity Profiles**: Update `JulesAccount` interface to `ProviderProfile`.
- **Schema**:
    ```typescript
    interface ProviderProfile {
        id: string;
        name: string;
        julesApiKey: string;
        githubToken: string;
        hfToken: string; // New field
        isActive: boolean;
    }
    ```
- **Settings UI**: Update `SettingsModal` to allow inputting all three tokens per profile.

### 2.3 State Management (`src/hooks/useHuggingFace.ts`)
- **Persistence**: Store asset metadata and "Curation" states (Pending/Approved) in `localStorage`.
- **Live Status Polling**: Background effect to refresh Space statuses every 30-60 seconds.

### 2.4 User Interface
- **Sidebar**: Add "Hugging Face" navigation item.
- **HF RepoGroup View (`/huggingface`)**: 
    - Animated grid of HF assets.
    - Status badges for Spaces (Running, Sleeping, Error).
    - Quick actions: "Jules Audit", "Open Space", "Copy Model ID".
- **Dashboard Widgets**:
    - **Stat Card**: "Active Spaces" (Emerald if > 0).
    - **RepoGroup Summary**: Integrated HF status feed.

## 3. Synergy: Jules Repoless Analysis
- Enable "Analyze with Jules" for HF assets. 
- Jules will use the HF URL (e.g., `huggingface.co/owner/model`) in a repoless session to audit the model card or space configuration.

## 4. Risks & Mitigations
- **API Limits**: HF API is generous but we will implement local caching to minimize redundant fetches.
- **CORS**: Ensure the Vite proxy handles `huggingface.co` or use direct calls if supported.
