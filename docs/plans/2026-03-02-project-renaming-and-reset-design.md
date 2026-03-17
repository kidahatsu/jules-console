# Design: Project Renaming to Jules Console (Full Context Refactor)

## Goal
Rename the project from `repo-master` to `jules-console` and systematically refactor the internal "RepoGroup" concept into "RepoGroup". This design originally targeted RepoMaster and is now Jules Console.

## Scope
1.  **Project Name Refactor**:
    *   `repo-master` (kebab) -> `repo-master`
    *   `RepoMaster` (brand) -> `RepoMaster`
    *   `RepoMaster` (pascal) -> `RepoMaster`
    *   `repo_master` (snake) -> `repo_master`
2.  **Concept Refactor ("RepoGroup" -> "RepoGroup")**:
    *   `RepoGroup` (noun/class) -> `RepoGroup`
    *   `repoGroup` (variable/concept) -> `repoGroup`
    *   `repomaster.local.json` -> `repomaster.local.json`
3.  **Asset Renaming**: Update filenames and references for diagrams and local config files.
4.  **Git History Reset**: Completely remove `.git` and initialize a new repository.

## Impact Analysis
-   **Brand Consistency**: All UI labels, logs, and documentation will reflect the new "Jules Console" branding.
-   **Code Clarity**: The internal architecture will shift from "RepoGroup" orchestration to "RepoGroup" management, making the code more descriptive of its purpose.
-   **File System**: Some filenames (like `repomaster.local.json` in `.gitignore`) will need updates to match the new naming scheme.

## Execution Plan
1.  Systematic string replacement for project-level naming.
2.  Systematic string replacement for concept-level naming (`RepoGroup` -> `RepoGroup`).
3.  Rename files and assets.
4.  Verify build and linting.
5.  Git repository reset.
