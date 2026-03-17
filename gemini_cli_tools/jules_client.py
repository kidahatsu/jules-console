#!/usr/bin/env python3
import argparse
import os
import json
import sys
import requests

JULES_API_URL = "https://jules.googleapis.com/v1alpha"

def get_api_key():
    api_key = os.environ.get("JULES_API_KEY")
    if not api_key:
        print("Error: JULES_API_KEY environment variable not set.", file=sys.stderr)
        sys.exit(1)
    return api_key

def get_headers():
    return {
        "Content-Type": "application/json",
        "x-goog-api-key": get_api_key(),
    }

def create_session(task, repo, branch, automation_mode):
    url = f"{JULES_API_URL}/sessions"
    payload = {
        "prompt": task,
        "sourceContext": {
            "source": f"sources/github/{repo}",
            "githubRepoContext": {"startingBranch": branch},
        },
        "automationMode": automation_mode,
    }
    
    try:
        response = requests.post(url, headers=get_headers(), json=payload)
        response.raise_for_status()
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.RequestException as e:
        print(f"Error creating session: {e}", file=sys.stderr)
        if hasattr(e, 'response') and e.response is not None:
             print(f"Response: {e.response.text}", file=sys.stderr)
        sys.exit(1)

def list_sessions(page_size):
    url = f"{JULES_API_URL}/sessions"
    params = {"pageSize": page_size}
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        if response.status_code == 404:
             # Handle 404 gracefully for empty lists often seen in Google APIs
             print(json.dumps({"sessions": []}, indent=2))
             return

        response.raise_for_status()
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.RequestException as e:
        print(f"Error listing sessions: {e}", file=sys.stderr)
        sys.exit(1)

def get_session(session_id):
    # Ensure ID is properly formatted or just use what's passed if it looks like a full resource name
    # The API typically wants projects/.../sessions/ID or just ID if we assume project context
    # But usually full resource name is safer if known, or construct it.
    # For now, we'll assume the user passes whatever the API expects or the ID to be appended.
    # Looking at the original TS code: `${JULES_API_URL}/sessions/${id}`
    url = f"{JULES_API_URL}/sessions/{session_id}"
    
    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.RequestException as e:
        print(f"Error getting session: {e}", file=sys.stderr)
        sys.exit(1)

def delete_session(session_id):
    url = f"{JULES_API_URL}/sessions/{session_id}"
    
    try:
        response = requests.delete(url, headers=get_headers())
        if response.status_code == 404:
            print(f"Session {session_id} not found or already deleted.")
            return

        response.raise_for_status()
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.RequestException as e:
        print(f"Error deleting session: {e}", file=sys.stderr)
        sys.exit(1)

def get_activities(session_id):
    url = f"{JULES_API_URL}/sessions/{session_id}/activities"
    
    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.RequestException as e:
        print(f"Error getting activities: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Jules API Client")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # CREATE
    create_parser = subparsers.add_parser("create", help="Create a new Jules session")
    create_parser.add_argument("--task", required=True, help="Description of the task")
    create_parser.add_argument("--repo", required=True, help="GitHub repository (owner/repo)")
    create_parser.add_argument("--branch", default="main", help="Starting branch (default: main)")
    create_parser.add_argument("--automation-mode", default="AUTO_CREATE_PR", choices=["AUTO_CREATE_PR", "AUTO_MERGE_PR"], help="Automation mode")

    # LIST
    list_parser = subparsers.add_parser("list", help="List Jules sessions")
    list_parser.add_argument("--page-size", type=int, default=100, help="Page size (default: 100)")

    # GET
    get_parser = subparsers.add_parser("get", help="Get a Jules session")
    get_parser.add_argument("session_id", help="Session ID (or full resource name)")

    # DELETE
    delete_parser = subparsers.add_parser("delete", help="Delete a Jules session")
    delete_parser.add_argument("session_id", help="Session ID (or full resource name)")

    # ACTIVITIES
    activities_parser = subparsers.add_parser("activities", help="Get activities for a session")
    activities_parser.add_argument("session_id", help="Session ID")

    args = parser.parse_args()

    if args.command == "create":
        create_session(args.task, args.repo, args.branch, args.automation_mode)
    elif args.command == "list":
        list_sessions(args.page_size)
    elif args.command == "get":
        get_session(args.session_id)
    elif args.command == "delete":
        delete_session(args.session_id)
    elif args.command == "activities":
        get_activities(args.session_id)

if __name__ == "__main__":
    main()
