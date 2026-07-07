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
    const lastCall = vi.mocked(console.error).mock.calls[0];
    const loggedMessage = lastCall.join(' ');
    
    // We expect the message to be sanitized, not containing the full error object structure
    expect(loggedMessage).toContain('Failed to parse accounts:');
    
    // We check that the error message is a string and not a complex object
    // JSON.parse error messages usually describe the syntax error
    expect(typeof lastCall[1]).toBe('string');
  });

  it('should handle invalid accounts schema in localStorage and fallback to default', () => {
    // Save accounts that do not match the expected ProviderProfileSchema structure
    localStorage.setItem('jules_accounts_v1', JSON.stringify([{
      id: 12345, // should be string
      name: 'Test Account',
      apiKey: 'test-api-key',
      isActive: 'yes' // should be boolean
    }]));

    const accounts = getAccounts();
    // It should fallback to default account when schema validation fails
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe('default');
    expect(console.error).toHaveBeenCalled();
  });
});

import { StarredReviewService } from '../starredReviews';

describe('Starred Reviews Security Deserialization', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  it('should handle invalid reviews schema and fallback to empty object', () => {
    // Save reviews that do not match StarredReviewMapSchema (e.g. status is invalid enum)
    localStorage.setItem('starred_repo_reviews_v1', JSON.stringify({
      '12345': {
        status: 'UNKNOWN_STATUS',
        notes: 'malicious note'
      }
    }));

    const reviews = StarredReviewService.getReviews();
    expect(reviews).toEqual({});
    expect(console.error).toHaveBeenCalled();
  });

  it('should parse valid reviews schema successfully', () => {
    localStorage.setItem('starred_repo_reviews_v1', JSON.stringify({
      '12345': {
        status: 'REVIEWED',
        notes: 'valid note',
        activeSessionId: 'session-123'
      }
    }));

    const reviews = StarredReviewService.getReviews();
    expect(reviews['12345']).toBeDefined();
    expect(reviews['12345'].status).toBe('REVIEWED');
    expect(reviews['12345'].notes).toBe('valid note');
  });
});

