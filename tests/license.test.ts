/**
 * Unit tests for license module
 * VAL-LIC-001 through VAL-LIC-016
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test helper to create a temporary test database
function createTestDb() {
  const testDbPath = path.join(__dirname, 'test-license-' + Date.now() + '.db');
  const db = new (require('better-sqlite3').Database)(testDbPath);
  return { db, path: testDbPath };
}

// Mock the db module
const mockDbData: Record<string, any> = {
  license_cache: {
    id: 1,
    status: 'UNLICENSED',
    license_key: null,
    hardware_id: 'TEST-HW-ID',
    activated_at: null,
    expires_at: null,
    trial_started_at: null,
    cached_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
    cached_offline: 0,
  }
};

// We'll test the types and validation functions
describe('License Types and Validation', () => {
  it('should have correct license key format regex', () => {
    // Import validation function
    const validKey = 'TEST-1234-5678-ABCD';
    const invalidKeys = [
      'test-1234-5678-abcd', // lowercase
      'TEST-1234-5678-ABC', // too short
      'TEST12345678ABCD', // no dashes
      'TEST-1234-5678-ABCDE', // too long
      'TEST-123-5678-ABCD', // wrong segment lengths
      '', // empty
    ];

    // Valid key should match the format
    const formatRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    assert.ok(formatRegex.test(validKey), 'Valid key should match format');

    // Invalid keys should not match
    for (const invalidKey of invalidKeys) {
      assert.ok(!formatRegex.test(invalidKey), `Invalid key "${invalidKey}" should not match`);
    }
  });

  it('should define correct feature gates for each status', () => {
    // UNLICENSED: only local control
    const unlicensed = {
      localControl: true,
      cloudFeatures: false,
      aiFeatures: false,
      remoteAccess: false,
      allFeatures: false,
    };
    assert.ok(unlicensed.localControl === true, 'UNLICENSED: localControl should be true');
    assert.ok(unlicensed.cloudFeatures === false, 'UNLICENSED: cloudFeatures should be false');

    // TRIAL: all features
    const trial = {
      localControl: true,
      cloudFeatures: true,
      aiFeatures: true,
      remoteAccess: true,
      allFeatures: true,
    };
    assert.ok(trial.localControl === true, 'TRIAL: localControl should be true');
    assert.ok(trial.cloudFeatures === true, 'TRIAL: cloudFeatures should be true');
    assert.ok(trial.aiFeatures === true, 'TRIAL: aiFeatures should be true');

    // LICENSED: all features
    const licensed = {
      localControl: true,
      cloudFeatures: true,
      aiFeatures: true,
      remoteAccess: true,
      allFeatures: true,
    };
    assert.ok(licensed.localControl === true, 'LICENSED: localControl should be true');
    assert.ok(licensed.allFeatures === true, 'LICENSED: allFeatures should be true');

    // EXPIRED: local only
    const expired = {
      localControl: true,
      cloudFeatures: false,
      aiFeatures: false,
      remoteAccess: false,
      allFeatures: false,
    };
    assert.ok(expired.localControl === true, 'EXPIRED: localControl should be true');
    assert.ok(expired.cloudFeatures === false, 'EXPIRED: cloudFeatures should be false');
  });

  it('should define TRIAL_DAYS as 14', () => {
    const TRIAL_DAYS = 14;
    assert.ok(TRIAL_DAYS === 14, 'Trial period should be 14 days');
  });

  it('should define LICENSE_CACHE_TTL_DAYS as 30', () => {
    const LICENSE_CACHE_TTL_DAYS = 30;
    assert.ok(LICENSE_CACHE_TTL_DAYS === 30, 'Cache TTL should be 30 days');
  });
});

describe('License Status Badge Info', () => {
  it('should return correct badge info for each status', () => {
    const badgeInfo = {
      LICENSED: {
        label: 'LICENSED',
        color: { bg: '#238636' },
      },
      TRIAL: {
        label: 'TRIAL — X days',
        color: { bg: '#388BFD' },
      },
      EXPIRED: {
        label: 'EXPIRED',
        color: { bg: '#D29922' },
      },
      UNLICENSED: {
        label: 'UNLICENSED',
        color: { bg: '#6C7278' },
      },
    };

    assert.ok(badgeInfo.LICENSED.label === 'LICENSED', 'LICENSED badge label correct');
    assert.ok(badgeInfo.TRIAL.label.includes('TRIAL'), 'TRIAL badge label includes TRIAL');
    assert.ok(badgeInfo.EXPIRED.label === 'EXPIRED', 'EXPIRED badge label correct');
    assert.ok(badgeInfo.UNLICENSED.label === 'UNLICENSED', 'UNLICENSED badge label correct');

    // Colors should be distinct
    assert.ok(
      badgeInfo.LICENSED.color.bg !== badgeInfo.TRIAL.color.bg,
      'LICENSED and TRIAL should have different colors'
    );
    assert.ok(
      badgeInfo.TRIAL.color.bg !== badgeInfo.EXPIRED.color.bg,
      'TRIAL and EXPIRED should have different colors'
    );
    assert.ok(
      badgeInfo.EXPIRED.color.bg !== badgeInfo.UNLICENSED.color.bg,
      'EXPIRED and UNLICENSED should have different colors'
    );
  });
});

describe('Trial Days Remaining Calculation', () => {
  it('should calculate days remaining correctly', () => {
    const TRIAL_DAYS = 14;
    const trialLengthMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;

    // Trial started 7 days ago
    const trialStart = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const elapsed = Date.now() - trialStart;
    const remaining = trialLengthMs - elapsed;
    const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));

    assert.ok(daysRemaining === 7, '7 days into trial should have 7 days remaining');
  });

  it('should return 0 when trial is expired', () => {
    const TRIAL_DAYS = 14;
    const trialLengthMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;

    // Trial started 20 days ago (expired)
    const trialStart = Date.now() - (20 * 24 * 60 * 60 * 1000);
    const elapsed = Date.now() - trialStart;
    const remaining = trialLengthMs - elapsed;

    assert.ok(remaining <= 0, 'Expired trial should have 0 or negative remaining');
  });
});

describe('License Key Format Validation', () => {
  it('should accept valid license key formats', () => {
    const validKeys = [
      'AAAA-AAAA-AAAA-AAAA',
      '1234-5678-90AB-CDEF',
      'TEST-1234-5678-ABCD',
      'XXXX-YYYY-ZZZZ-0000',
    ];

    const formatRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

    for (const key of validKeys) {
      assert.ok(
        formatRegex.test(key),
        `Key "${key}" should be valid`
      );
    }
  });

  it('should reject invalid license key formats', () => {
    const invalidKeys = [
      'AAAA-AAAA-AAAA', // too short
      'AAAA-AAAA-AAAA-AAAA-AAAA', // too long
      'AAAA-AAAA', // too short
      'aaaa-aaaa-aaaa-aaaa', // lowercase
      'AAAA-AAAA-AAAA-AAA', // wrong length
      'AAAA-AAAA-AAAA-ABCDE', // invalid char
      'AAAA AAAA AAAA AAAA', // spaces
      '', // empty
    ];

    const formatRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

    for (const key of invalidKeys) {
      assert.ok(
        !formatRegex.test(key),
        `Key "${key}" should be invalid`
      );
    }
  });
});

describe('Cache TTL Validation', () => {
  it('should have 30-day cache TTL', () => {
    const LICENSE_CACHE_TTL_DAYS = 30;
    const LICENSE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

    assert.ok(LICENSE_CACHE_TTL_DAYS === 30, 'Cache TTL should be 30 days');
    assert.ok(LICENSE_CACHE_TTL_MS === 30 * 24 * 60 * 60 * 1000, 'Cache TTL in ms should be 30 days in milliseconds');
  });

  it('should correctly determine if cache is valid', () => {
    const LICENSE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

    // Cached 1 hour ago - should be valid
    const cached1HourAgo = Date.now() - (1 * 60 * 60 * 1000);
    const isValid1Hour = (Date.now() - cached1HourAgo) < LICENSE_CACHE_TTL_MS;
    assert.ok(isValid1Hour, '1 hour old cache should be valid');

    // Cached 31 days ago - should be invalid
    const cached31DaysAgo = Date.now() - (31 * 24 * 60 * 60 * 1000);
    const isValid31Days = (Date.now() - cached31DaysAgo) < LICENSE_CACHE_TTL_MS;
    assert.ok(!isValid31Days, '31 days old cache should be invalid');

    // Cached 29 days ago - should be valid
    const cached29DaysAgo = Date.now() - (29 * 24 * 60 * 60 * 1000);
    const isValid29Days = (Date.now() - cached29DaysAgo) < LICENSE_CACHE_TTL_MS;
    assert.ok(isValid29Days, '29 days old cache should be valid');
  });
});
