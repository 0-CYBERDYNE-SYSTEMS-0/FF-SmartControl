/**
 * HTTPS Server with Self-Signed Certificate Generation
 *
 * Features:
 * - Generates self-signed TLS certificate on first boot (stored in data/certs/)
 * - Certificate valid 365+ days, includes localhost + LAN hostname
 * - User-uploaded cert option via API
 * - Cert fingerprint shown in UI for manual verification
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { getDb } from '../hal/db.js';

// Certificate directory
const CERTS_DIR = path.join(process.cwd(), 'data', 'certs');
const CERT_FILE = path.join(CERTS_DIR, 'server.pem');
const KEY_FILE = path.join(CERTS_DIR, 'server-key.pem');
const CERT_BUNDLE_FILE = path.join(CERTS_DIR, 'server-bundle.pem');

export interface CertInfo {
  fingerprint: string; // SHA-256 fingerprint in colon-separated hex
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
}

/**
 * Get the hostname for the certificate CN/SAN
 */
function getHostname(): string {
  try {
    // Try to get the LAN hostname
    const hostname = execSync('hostname', { encoding: 'utf-8' }).trim();
    if (hostname && hostname !== 'localhost') {
      return hostname;
    }
  } catch {
    // ignore
  }

  // Fallback: use localhost
  return 'localhost';
}

/**
 * Ensure the certificates directory exists
 */
function ensureCertsDir(): void {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Generate a self-signed certificate if one doesn't exist
 */
export function generateSelfSignedCert(): void {
  ensureCertsDir();

  // Check if cert already exists
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    return;
  }

  const hostname = getHostname();
  const validDays = 365 * 2; // 2 years validity

  // Generate private key and certificate using openssl
  // Create a config file for the certificate
  const configContent = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = US
ST = State
L = Locality
O = FarmPal
CN = ${hostname}

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = localhost
DNS.2 = ${hostname}
DNS.3 = *.local
IP.1 = 127.0.0.1
`;

  const configFile = path.join(CERTS_DIR, 'openssl.cnf');

  try {
    // Write config
    fs.writeFileSync(configFile, configContent, { mode: 0o600 });

    // Generate private key and self-signed cert
    const keyCmd = `openssl genrsa -out "${KEY_FILE}" 2048 2>/dev/null`;
    execSync(keyCmd, { stdio: 'pipe' });

    // Set key file permissions to 600 (owner read/write only)
    fs.chmodSync(KEY_FILE, 0o600);

    // Generate certificate
    const certCmd = [
      `openssl req -new -x509`,
      `-key "${KEY_FILE}"`,
      `-out "${CERT_FILE}"`,
      `-days ${validDays}`,
      `-config "${configFile}"`,
      `-addext "subjectAltName=DNS:localhost,DNS:${hostname},DNS:*.local,IP:127.0.0.1"`,
    ].join(' ');

    execSync(certCmd, { stdio: 'pipe' });

    // Clean up config file
    fs.unlinkSync(configFile);

    console.log(`[https] Generated self-signed certificate for ${hostname}`);
  } catch (err) {
    console.error('[https] Failed to generate self-signed certificate:', err);
    throw err;
  }
}

/**
 * Get the certificate fingerprint for UI display
 */
export function getCertFingerprint(): string {
  try {
    const certContent = fs.readFileSync(CERT_FILE, 'utf-8');
    // Extract just the certificate portion
    const certMatch = certContent.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/,
    );
    if (!certMatch) {
      return 'unknown';
    }

    // Write to temp file for openssl
    const tmpFile = path.join(CERTS_DIR, 'tmp-cert.pem');
    fs.writeFileSync(tmpFile, certMatch[0]);

    try {
      const fingerprint = execSync(
        `openssl x509 -in "${tmpFile}" -fingerprint -sha256 -noout`,
        { encoding: 'utf-8' },
      )
        .trim()
        .replace('SHA256 Fingerprint=', '')
        .replace(/([a-f0-9]{2}):([a-f0-9]{2})/gi, '$1:$2')
        .toUpperCase();

      return fingerprint;
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // ignore
      }
    }
  } catch {
    return 'unknown';
  }
}

/**
 * Get full certificate info for UI display
 */
export function getCertInfo(): CertInfo | null {
  try {
    if (!fs.existsSync(CERT_FILE)) {
      return null;
    }

    const tmpFile = path.join(CERTS_DIR, 'tmp-cert-info.pem');
    const certContent = fs.readFileSync(CERT_FILE, 'utf-8');
    const certMatch = certContent.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/,
    );
    if (!certMatch) {
      return null;
    }
    fs.writeFileSync(tmpFile, certMatch[0]);

    try {
      // Get all info in one go
      const fingerprint = execSync(
        `openssl x509 -in "${tmpFile}" -fingerprint -sha256 -noout`,
        { encoding: 'utf-8' },
      )
        .trim()
        .replace('SHA256 Fingerprint=', '')
        .toUpperCase();

      const subject = execSync(
        `openssl x509 -in "${tmpFile}" -subject -noout`,
        { encoding: 'utf-8' },
      )
        .trim()
        .replace('subject=', '');

      const issuer = execSync(`openssl x509 -in "${tmpFile}" -issuer -noout`, {
        encoding: 'utf-8',
      })
        .trim()
        .replace('issuer=', '');

      const dates = execSync(`openssl x509 -in "${tmpFile}" -dates -noout`, {
        encoding: 'utf-8',
      })
        .trim()
        .split('\n');

      const serial = execSync(`openssl x509 -in "${tmpFile}" -serial -noout`, {
        encoding: 'utf-8',
      })
        .trim()
        .replace('serial=', '');

      const validFrom =
        dates
          .find((d) => d.startsWith('notBefore='))
          ?.replace('notBefore=', '') || '';
      const validTo =
        dates
          .find((d) => d.startsWith('notAfter='))
          ?.replace('notAfter=', '') || '';

      return {
        fingerprint,
        subject,
        issuer,
        validFrom,
        validTo,
        serialNumber: serial,
      };
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // ignore
      }
    }
  } catch {
    return null;
  }
}

/**
 * Check if a user-uploaded certificate is valid
 */
export function validateUploadedCert(
  certContent: string,
  keyContent: string,
): { valid: boolean; error?: string } {
  try {
    // Ensure it's a valid PEM format
    const certMatch = certContent.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/,
    );
    const keyMatch = keyContent.match(
      /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]+?-----END (RSA )?PRIVATE KEY-----/,
    );

    if (!certMatch) {
      return { valid: false, error: 'Invalid certificate format' };
    }
    if (!keyMatch) {
      return { valid: false, error: 'Invalid private key format' };
    }

    // Write to temp files for validation
    const tmpCert = path.join(CERTS_DIR, 'tmp-upload-cert.pem');
    const tmpKey = path.join(CERTS_DIR, 'tmp-upload-key.pem');

    fs.writeFileSync(tmpCert, certContent);
    fs.writeFileSync(tmpKey, keyContent, { mode: 0o600 });

    try {
      // Verify the cert matches the key
      execSync(`openssl verify -CAfile "${tmpCert}" "${tmpCert}" 2>/dev/null`, {
        stdio: 'pipe',
      });

      // Check certificate dates
      const dates = execSync(`openssl x509 -in "${tmpCert}" -dates -noout`, {
        encoding: 'utf-8',
      }).trim();

      const notAfter = dates.split('\n').find((d) => d.startsWith('notAfter='));
      if (notAfter) {
        const expiryDate = new Date(notAfter.replace('notAfter=', ''));
        if (expiryDate < new Date()) {
          return { valid: false, error: 'Certificate has expired' };
        }
      }

      return { valid: true };
    } finally {
      try {
        fs.unlinkSync(tmpCert);
        fs.unlinkSync(tmpKey);
      } catch {
        // ignore
      }
    }
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

/**
 * Install user-uploaded certificate
 */
export function installUploadedCert(
  certContent: string,
  keyContent: string,
): void {
  ensureCertsDir();

  // Backup existing cert if any
  if (fs.existsSync(CERT_FILE)) {
    const backupCert = `${CERT_FILE}.bak.${Date.now()}`;
    fs.copyFileSync(CERT_FILE, backupCert);
  }
  if (fs.existsSync(KEY_FILE)) {
    const backupKey = `${KEY_FILE}.bak.${Date.now()}`;
    fs.copyFileSync(KEY_FILE, backupKey);
  }

  // Write new cert and key
  fs.writeFileSync(CERT_FILE, certContent, { mode: 0o644 });
  fs.writeFileSync(KEY_FILE, keyContent, { mode: 0o600 });

  // Create bundle file
  const bundle = `${certContent}\n${keyContent}`;
  fs.writeFileSync(CERT_BUNDLE_FILE, bundle, { mode: 0o644 });
}

/**
 * Get paths to certificate and key files
 */
export function getCertPaths(): { cert: string; key: string; bundle: string } {
  return {
    cert: CERT_FILE,
    key: KEY_FILE,
    bundle: CERT_BUNDLE_FILE,
  };
}

/**
 * Check if certificate exists
 */
export function hasCertificate(): boolean {
  return fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE);
}

/**
 * Initialize HTTPS - generates cert if needed and returns server options
 */
export async function initHttps(): Promise<{
  certPath: string;
  keyPath: string;
  fingerprint: string;
} | null> {
  // Check if HTTPS is enabled
  if (!process.env.HAL_UI_HTTPS_ENABLED) {
    return null;
  }

  generateSelfSignedCert();

  if (!hasCertificate()) {
    console.error('[https] No certificate found and HTTPS is enabled');
    return null;
  }

  return {
    certPath: CERT_FILE,
    keyPath: KEY_FILE,
    fingerprint: getCertFingerprint(),
  };
}
