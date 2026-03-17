# Implementation Plan: Project Renaming to Jules Console

## Goal
Rename project and systematically refactor the internal context from "RepoGroup" to "RepoGroup", followed by a git history reset. This document was originally created for RepoMaster and is being updated to reflect the new project name: Jules Console.

## Tasks
1. **[Refactor] Project Level Kebab-case**: `repo-master` -> `repo-master` (package.json, README, etc.)
   - Verification: `grep -r "repo-master" .` returns no matches.
2. **[Refactor] Brand/PascalCase**: `RepoMaster` & `RepoMaster` -> `RepoMaster` (UI, docs, code symbols)
   - Verification: `grep -r "RepoMaster" .` and `grep -r "RepoMaster" .` return no matches.
3. **[Refactor] Concept (Noun)**: `RepoGroup` -> `RepoGroup` (e.g. "AI RepoGroup" -> "AI RepoGroup")
   - Verification: `grep -r "\bFleet\b" .` returns no matches.
4. **[Refactor] Concept (Lowercase/Camel)**: `repoGroup` -> `repoGroup` (code variables, logs)
   - Verification: `grep -r "\bfleet\b" .` returns only unrelated matches (if any).
5. **[Asset] Asset Renaming**:
   - `mv docs/assets/repo_master_architecture.png docs/assets/repo_master_architecture.png`
   - Update `README.md` and other files to reflect the new asset path.
6. **[Config] Local Config Renaming**:
   - Update `src/components/SettingsModal.tsx` to use `repomaster.local.json` instead of `repomaster.local.json`.
7. **[Verify] Build & Lint**:
   - `npm run lint`
   - `npm run build`
8. **[Git] Reset History**:
   - `rm -rf .git`
   - `git init`
   - `git add .`
   - `git commit -m "chore: initial commit as RepoMaster"`
   - `git status`
9. **[Finalize] Directory Renaming**:
   - Notify the user they can now rename the directory to `repo-master`.
