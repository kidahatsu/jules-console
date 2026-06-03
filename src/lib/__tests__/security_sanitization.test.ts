// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAccounts } from '../jules';

describe('Security Sanitization', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  it('should not leak full error objects in getAccounts', () => {
    // Mock localStorage.getItem to return invalid JSON to trigger catch block
    localStorage.setItem('jules_accounts_v1', 'invalid-json');
    
    getAccounts();
    
    expect(console.error).toHaveBeenCalled();
    const lastCall = (console.error as any).mock.calls[0];
    const loggedMessage = lastCall.join(' ');
    
    // We expect the message to be sanitized, not containing the full error object structure
    expect(loggedMessage).toContain('Failed to parse accounts');
    
    // We check that the error message is a string and not a complex object
    // JSON.parse error messages usually describe the syntax error
    expect(typeof lastCall[1]).toBe('string');
  });
});
