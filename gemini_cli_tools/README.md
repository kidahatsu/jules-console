# Gemini CLI Tools

This directory contains standalone Python scripts that extract core Jules and GitHub functionalities from the main application. These tools are designed to be used by a separate Gemini CLI agent or manually via the terminal.

## Prerequisites

-   Python 3.x
-   `requests` library:
    ```bash
    pip install requests
    ```

## Configuration

You must set the following environment variables before running the scripts:

```bash
export JULES_API_KEY="your_jules_api_key"
export GITHUB_TOKEN="your_github_personal_access_token"
```

## Tools

### 1. Jules Client (`jules_client.py`)

Interacts with the Jules API.

**Usage:**

```bash
# List sessions
python jules_client.py list

# Create a session
python jules_client.py create \
  --task "Fix login bug" \
  --repo "username/repo" \
  --branch "main"

# Get session details
python jules_client.py get SESSION_ID

# Get session activities
python jules_client.py activities SESSION_ID

# Delete a session
python jules_client.py delete SESSION_ID
```

### 2. GitHub Client (`github_client.py`)

Interacts with the GitHub API.

**Usage:**

```bash
# List your repositories
python github_client.py list-repos

# Create a new repository from a template
python github_client.py create-from-template \
  --template-owner "google-gemini" \
  --template-repo "gemini-api-quickstart" \
  --name "my-new-project" \
  --private
```
