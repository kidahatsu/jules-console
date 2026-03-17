#!/usr/bin/env python3
import argparse
import os
import json
import sys
import requests

GITHUB_API_URL = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"

def get_token():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("Error: GITHUB_TOKEN environment variable not set.", file=sys.stderr)
        sys.exit(1)
    return token

def get_headers():
    return {
        "Authorization": f"Bearer {get_token()}",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "Accept": "application/vnd.github+json",
    }

def get_user_repos():
    url = f"{GITHUB_API_URL}/user/repos"
    all_repos = []
    page = 1
    
    try:
        while True:
            params = {
                "visibility": "all",
                "sort": "updated",
                "per_page": 100,
                "page": page
            }
            response = requests.get(url, headers=get_headers(), params=params)
            response.raise_for_status()
            
            repos = response.json()
            if not repos:
                break
                
            all_repos.extend(repos)
            if len(repos) < 100:
                break
            page += 1
            
        print(json.dumps(all_repos, indent=2))
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching repos: {e}", file=sys.stderr)
        sys.exit(1)

def create_repo_from_template(template_owner, template_repo, name, owner, description, is_private, include_all_branches):
    url = f"{GITHUB_API_URL}/repos/{template_owner}/{template_repo}/generate"
    
    payload = {
        "name": name,
        "description": description,
        "private": is_private,
        "include_all_branches": include_all_branches
    }
    
    if owner:
        payload["owner"] = owner
        
    try:
        response = requests.post(url, headers=get_headers(), json=payload)
        response.raise_for_status()
        print(json.dumps(response.json(), indent=2))
        
    except requests.exceptions.RequestException as e:
        print(f"Error creating repo from template: {e}", file=sys.stderr)
        if hasattr(e, 'response') and e.response is not None:
             print(f"Response: {e.response.text}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="GitHub API Client")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # LIST REPOS
    subparsers.add_parser("list-repos", help="List user repositories")

    # CREATE FROM TEMPLATE
    create_parser = subparsers.add_parser("create-from-template", help="Create a repository from a template")
    create_parser.add_argument("--template-owner", required=True, help="Template repository owner")
    create_parser.add_argument("--template-repo", required=True, help="Template repository name")
    create_parser.add_argument("--name", required=True, help="Name of the new repository")
    create_parser.add_argument("--owner", help="Owner of the new repository (optional, defaults to auth user)")
    create_parser.add_argument("--description", help="Description of the new repository")
    create_parser.add_argument("--private", action="store_true", help="Make the new repository private")
    create_parser.add_argument("--include-all-branches", action="store_true", help="Include all branches from template")

    args = parser.parse_args()

    if args.command == "list-repos":
        get_user_repos()
    elif args.command == "create-from-template":
        create_repo_from_template(
            args.template_owner,
            args.template_repo,
            args.name,
            args.owner,
            args.description,
            args.private,
            args.include_all_branches
        )

if __name__ == "__main__":
    main()
