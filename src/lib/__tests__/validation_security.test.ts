import { describe, it, expect } from 'vitest';
import { ProviderProfileSchema, CreateSessionSchema } from '../validation';

describe('Security Validation Limits', () => {
  it('should reject account names longer than 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = ProviderProfileSchema.safeParse({
      id: 'default',
      name: longName,
      apiKey: '1234567890',
      isActive: true
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name is too long');
    }
  });

  it('should reject API keys longer than 100 characters', () => {
    const longKey = 'k'.repeat(101);
    const result = ProviderProfileSchema.safeParse({
      id: 'default',
      name: 'Valid Name',
      apiKey: longKey,
      isActive: true
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('API Key is too long');
    }
  });

  it('should reject tasks longer than 5000 characters', () => {
    const longTask = 't'.repeat(5001);
    const result = CreateSessionSchema.safeParse({
      task: longTask,
      automationMode: 'AUTO_CREATE_PR'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Task description is too long');
    }
  });

  it('should accept valid inputs within limits', () => {
    const validProfile = {
      id: 'default',
      name: 'Valid Name',
      apiKey: 'valid-api-key-123',
      isActive: true
    };
    const validSession = {
      task: 'Fix the bug in the parser',
      automationMode: 'AUTO_CREATE_PR'
    };
    expect(ProviderProfileSchema.safeParse(validProfile).success).toBe(true);
    expect(CreateSessionSchema.safeParse(validSession).success).toBe(true);
  });
});
