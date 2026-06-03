# Security Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate multiple redundant security branches into a single, high-quality audit branch and verify the fixes.

**Architecture:** Create a new branch `audit/consolidated-security-updates` from `main`. Identify the most comprehensive set of `console.error` sanitization fixes and apply them. Verify with unit tests to ensure no sensitive info is leaked via `console.error`.

**Tech Stack:** Git, Vitest, TypeScript.

---

### Task 1: Environment Preparation

**Files:**
- Create: `audit/consolidated-security-updates` branch

- [ ] **Step 1: Create the consolidation branch**

Run: `git checkout -b audit/consolidated-security-updates main`

- [ ] **Step 2: Verify base state**

Run: `git log -1 --oneline`
Expected: `83d7a59 test: add security validation tests for Zod schema limits`

### Task 2: Identify and Merge Best Security Branch

**Files:**
- Modify: Multiple (approx 11 files)

- [ ] **Step 1: Identify the most comprehensive branch**

I've already identified `origin/sentinel-sanitize-errors-16461731333768225743` as a comprehensive candidate (11 files).

- [ ] **Step 2: Merge the branch locally**

Run: `git merge --no-ff origin/sentinel-sanitize-errors-16461731333768225743`

- [ ] **Step 3: Resolve any conflicts (unlikely if they all branch from main/early commits)**

### Task 3: Audit and Enhance Sanitization

**Files:**
- Modify: `src/lib/jules.ts`

- [ ] **Step 1: Verify `src/lib/jules.ts` sanitization**

Ensure all `console.error` calls are sanitized.

```typescript
// Example expected change in src/lib/jules.ts
-        console.error("Failed to parse accounts", e);
+        console.error("Failed to parse accounts:", e instanceof Error ? e.message : "Unknown error");
```

- [ ] **Step 2: Check for remaining unsanitized logs in `src/lib/`**

Run: `grep -r "console.error" src/lib/`

### Task 4: Verification with Tests

**Files:**
- Create: `src/lib/__tests__/security_sanitization.test.ts`

- [ ] **Step 1: Write a test to verify `console.error` doesn't leak secrets**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAccounts } from '../jules';

describe('Security Sanitization', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should not leak full error objects in getAccounts', () => {
    // Mock localStorage.getItem to return invalid JSON to trigger catch block
    localStorage.setItem('jules_accounts_v1', 'invalid-json');
    
    getAccounts();
    
    expect(console.error).toHaveBeenCalled();
    const lastCall = (console.error as any).mock.calls[0];
    const loggedMessage = lastCall.join(' ');
    
    // We expect the message to be sanitized, not containing the full error object structure
    expect(loggedMessage).toContain('Failed to parse accounts:');
    expect(loggedMessage).not.toContain('SyntaxError'); // Error name is fine, but we want to ensure it's a string message
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test src/lib/__tests__/security_sanitization.test.ts`

- [ ] **Step 3: Commit verification test**

```bash
git add src/lib/__tests__/security_sanitization.test.ts
git commit -m "test: add security sanitization verification"
```
