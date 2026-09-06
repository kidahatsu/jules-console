# Jules Console

![License](https://img.shields.io/badge/license-AGPLv3-red.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

> **WARNING**: Repository deletion in Jules Console is permanent and cannot be undone on GitHub. Use caution when deleting repositories.

> **Note**: This project is in active development. Features and interfaces may change between updates.

Jules Console is a developer interface for running and monitoring Google Jules autonomous coding sessions, with optional management tools for GitHub repositories and Hugging Face assets.

![Jules Console Demo](docs/assets/jules_console_demo.webp)

![Jules Console Architecture](docs/assets/jules_console_architecture.png)

## What is Google Jules?

Google Jules is an autonomous coding agent by Google that executes development tasks directly on GitHub repositories. Given a natural language task description, Jules clones the target branch, analyzes the codebase, generates code modifications, executes tests, and prepares pull requests.

## How Jules Console simplifies session management

The Jules REST API exposes endpoints for creating and querying sessions, but managing sessions via raw API calls requires manual request structuring, token handling, and activity polling. Jules Console provides a visual interface that streamlines this workflow:

- **Persona-driven prompts**: Dispatch tasks with structured system instructions tailored for specific engineering goals (Bolt for performance, Sentinel for security, Palette for UI/UX, and Architect for system design).
- **Activity timelines**: Track live execution steps, tool runs, and agent reasoning without manual status polling.
- **Multi-profile credentials**: Store and toggle between different Jules API keys and environments locally in the browser.
- **Direct context inspection**: Review repository context and session status in one place.

## Core focus and optional features

Although the application includes tools for GitHub and Hugging Face, **Google Jules orchestration remains the primary focus of the console**. The additional modules are optional:

- **Jules orchestration (core)**: Start, inspect, and track autonomous coding sessions. Only a Jules API key is required.
- **GitHub management (optional)**: Browse repositories, inspect pull requests, and manage branches alongside your sessions.
- **Starred repository curation (optional)**: Review and organize starred GitHub repositories with triage statuses and private notes.
- **Hugging Face tracking (optional)**: Monitor model metrics, track Space runtimes, and route community discussions into Jules investigation sessions.
- **Unified inbox (optional)**: Consolidate GitHub notifications and Hugging Face discussions into a shared triage feed.

If you do not provide a GitHub PAT or Hugging Face token, the corresponding panels remain disabled or hidden, and the application functions as a dedicated Google Jules client.

For a detailed breakdown of all capabilities, see [docs/FEATURES.md](./docs/FEATURES.md).

## Tech stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Framer Motion, Lucide React
- **State and data fetching**: Zustand with persistence, TanStack Query
- **Integrations**: Octokit (GitHub REST API), Hugging Face Hub API, Google Jules API via local proxy

## Installation and setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/kidahatsu/jules-console.git
   cd jules-console
   ```

2. **Configure environment variables**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Add your credentials in `.env`:
   - `VITE_JULES_API_KEY`: Google Cloud API key with Jules access.
   - `VITE_GITHUB_TOKEN`: GitHub Personal Access Token (Classic) with `repo` and `notifications` scopes.
   - `VITE_HF_TOKEN`: Hugging Face User Access Token with read access.

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to your branch (`git push origin feature/my-feature`).
5. Open a pull request.

## License

Distributed under the GNU Affero General Public License v3.0 (AGPLv3). See `LICENSE` for details.
