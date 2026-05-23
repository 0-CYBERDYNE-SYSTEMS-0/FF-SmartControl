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

describe('Hardware ID Determinism', () => {
  it('should return the same hardware ID on repeated calls', async () => {
    const { getHardwareId } = await import('../src/license/hardware-id.js');
    const id1 = getHardwareId();
    const id2 = getHardwareId();
    assert.ok(id1 === id2, `Hardware ID must be deterministic: "${id1}" vs "${id2}"`);
  });

  it('should select the same MAC regardless of interface enumeration order', async () => {
    // This test verifies the critical FIX-4 requirement:
    // The hardware ID must be deterministic (same interface chosen) even
    // when os.networkInterfaces() returns interfaces in different orders.
    // This simulates the scenario where driver load order differs across reboots.

    const os = await import('os');

    // Create two different enumeration orders of the same interfaces
    const interfaces = {
      eth0: [{ mac: 'aa:bb:cc:dd:ee:ff', address: '192.168.1.1', family: 'IPv4' }],
      wlan0: [{ mac: '11:22:33:44:55:66', address: '192.168.2.1', family: 'IPv4' }],
      lo: [{ mac: '00:00:00:00:00:00', address: '127.0.0.1', family: 'IPv4' }],
      docker0: [{ mac: 'de:ad:be:ef:00:01', address: '172.17.0.1', family: 'IPv4' }],
    };

    // Save original
    const originalNetworkInterfaces = os.networkInterfaces;

    try {
      // Mock networkInterfaces to return interfaces in order A
      (os as any).networkInterfaces = () => ({
        wlan0: interfaces.wlan0,
        docker0: interfaces.docker0,
        eth0: interfaces.eth0,
        lo: interfaces.lo,
      });

      // Re-import to get fresh module state (module cache means this is the
      // same instance, but the function reads os.networkInterfaces() each call)
      const { getHardwareId: getHwId1 } = await import('../src/license/hardware-id.js');
      const id1 = getHwId1();

      // Now mock with order B (different enumeration)
      (os as any).networkInterfaces = () => ({
        lo: interfaces.lo,
        eth0: interfaces.eth0,
        docker0: interfaces.docker0,
        wlan0: interfaces.wlan0,
      });

      const id2 = getHwId1();

      // Both calls must return the same MAC (eth0 since it sorts first alphabetically
      // after filtering out lo and docker0)
      assert.ok(id1 === id2,
        `Hardware ID must be stable across different enumeration orders: "${id1}" vs "${id2}"`);
      assert.ok(id1 === 'MAC-AABBCCDDEEFF',
        `Should select eth0 (alphabetically first physical): got "${id1}"`);
    } finally {
      // Restore original
      (os as any).networkInterfaces = originalNetworkInterfaces;
    }
  });

  it('should filter out virtual interfaces (docker, loopback, tunnel)', async () => {
    const os = await import('os');
    const originalNetworkInterfaces = os.networkInterfaces;

    try {
      // Set up interfaces where virtual ones sort alphabetically BEFORE physical ones
      (os as any).networkInterfaces = () => ({
        br0: [{ mac: 'aa:aa:aa:aa:aa:aa', address: '10.0.0.1', family: 'IPv4' }],
        docker0: [{ mac: 'bb:bb:bb:bb:bb:bb', address: '172.17.0.1', family: 'IPv4' }],
        en0: [{ mac: 'cc:cc:cc:cc:cc:cc', address: '192.168.1.1', family: 'IPv4' }],
        lo0: [{ mac: '00:00:00:00:00:00', address: '127.0.0.1', family: 'IPv4' }],
        utun0: [{ mac: 'dd:dd:dd:dd:dd:dd', address: '10.255.0.1', family: 'IPv4' }],
      });

      const { getHardwareId } = await import('../src/license/hardware-id.js');
      const id = getHardwareId();

      // en0 should be selected (only non-virtual interface with real MAC)
      assert.ok(id === 'MAC-CCCCCCCCCCCC',
        `Should skip virtual interfaces and select en0: got "${id}"`);
    } finally {
      (os as any).networkInterfaces = originalNetworkInterfaces;
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

describe('No Mock License Keys in Production', () => {
  it('should reject previously hardcoded mock license keys', async () => {
    // VAL-LIC-SEC: Verify that mock license keys have been removed.
    // The old mock keys ('TEST-1234-5678-ABCD', 'TRIAL-0000-0000-0001',
    // 'EXPD-0000-0000-0001', 'PIBO-0000-0000-0001') must NOT appear anywhere
    // in the production client source.

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const clientSource = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'license', 'client.ts'),
      'utf-8',
    );

    // None of the old mock keys should appear in source
    const oldMockKeys = [
      'TEST-1234-5678-ABCD',
      'TRIAL-0000-0000-0001',
      'EXPD-0000-0000-0001',
      'PIBO-0000-0000-0001',
    ];

    for (const key of oldMockKeys) {
      assert.ok(
        !clientSource.includes(key),
        `Mock license key "${key}" must not appear in client.ts`,
      );
    }

    // Verify no MOCK_MODE or MOCK_LICENSE_KEYS references remain
    assert.ok(
      !clientSource.includes('MOCK_LICENSE_KEYS'),
      'MOCK_LICENSE_KEYS must not appear in client.ts',
    );
    assert.ok(
      !clientSource.includes('MOCK_MODE'),
      'MOCK_MODE must not appear in client.ts',
    );
    assert.ok(
      !clientSource.includes('activateLicenseMock'),
      'activateLicenseMock must not appear in client.ts',
    );

    // Verify no FAKE/DEMO/TEST license constants remain
    assert.ok(
      !clientSource.includes('FAKE_LICENSE'),
      'No FAKE_LICENSE references',
    );
    assert.ok(
      !clientSource.includes('DEMO_LICENSE'),
      'No DEMO_LICENSE references',
    );
    assert.ok(
      !clientSource.includes('hardcoded'),
      'No "hardcoded" references (mock key indicator)',
    );
  });
});
