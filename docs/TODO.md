# Jules Console: Project Roadmap

## v0.2.0: Command Center Hardening (COMPLETED)

### 1. Safety & Security
- [x] Add prominent **CAUTION** to README regarding repo deletion.
- [x] Create `DeletionCautionBanner` for the Repositories page.
- [x] Implement destructive confirmation (name typing) for repository deletion in `useGithubRepos.ts`.
- [x] Audit for hardcoded secrets and verify `.gitignore` health.

### 2. "Leveled Up" Personas (AI Prompts)
- [x] Create `src/lib/prompts.ts` with high-density prompts for `Bolt`, `Sentinel`, `Palette`, and `Architect`.
- [x] Update `JulesActionModal` with a 3x2 grid of 6 targeted actions.
- [x] Integrate persona-driven prompt generation into the modal.
- [x] Add Unit Tests for the prompts library (`src/lib/__tests__/prompts.test.ts`).

### 3. UI/UX & Transparency
- [x] Add "Alpha / Under Dev" badge to the sidebar in `Layout.tsx`.
- [x] Add "UNDER DEVELOPMENT" section to README.
- [x] Add `ShieldAlert` and `LayoutGrid` icons for personas.
- [x] Resolve "Empty Repos Page" bug by adding cache-to-state synchronization in `useGithubRepos.ts`.

### 4. Code Quality
- [x] Bump version to `0.2.0`.
- [x] Perform full `npm audit` and `npm test` verification.

## v0.3.0: Planned Enhancements

- [ ] Implement `Import Repo` functionality in the `Repositories` page.
- [ ] Add `AutomationMode` selector for custom PR/Merge flows.
- [ ] Implement `Jules Activities` detailed timeline view in `SessionDetails.tsx`.
- [ ] Remediate `any` type warnings in hooks (`useGithubRepos`, `useHuggingFace`, etc.).
