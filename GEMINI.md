# Jules Console: Project Mandates

## Core Principles
1. **Safety First**: Repository deletion MUST require destructive confirmation (name typing).
2. **Transparency**: Critical API key status MUST be visible via `KeyRequiredBanner`.
3. **Persona-Driven AI**: All Jules sessions MUST use high-density, structured prompts based on established personas (Bolt, Sentinel, Palette, Architect).
4. **Context Integrity**: Use the proxy at `/api/jules` to avoid CORS and protect API keys.

## Architecture
- **State**: [Zustand](https://github.com/pmndrs/zustand) with persistence for cross-session continuity.
- **Styling**: Tailwind CSS v4 with [Lucide React](https://lucide.dev/) for iconography.
- **API**: Octokit for GitHub; Custom fetch-based client for Google Jules.

## Testing
- **TDD**: New logic MUST be accompanied by a Vitest unit test (e.g., `src/lib/__tests__/*.test.ts`).
- **Validation**: All API payloads MUST be validated with Zod.

## Conventions
- **Personas**:
  - `Bolt` ⚡: Performance-focused.
  - `Sentinel` 🛡️: Security-focused.
  - `Palette` 🎨: UI/UX-focused.
  - `Architect` 🏗️: System/Design-focused.
