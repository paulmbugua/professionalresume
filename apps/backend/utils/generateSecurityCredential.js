import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// ✅ Ensure required environment variables are set
const { MPESA_CERTIFICATE_PATH, MPESA_INITIATOR_PASSWORD } = process.env;

if (!MPESA_CERTIFICATE_PATH) {
  throw new Error(
    '❌ MPESA_CERTIFICATE_PATH is not defined in the environment variables.',
  );
}
if (!MPESA_INITIATOR_PASSWORD) {
  throw new Error(
    '❌ MPESA_INITIATOR_PASSWORD is not defined in the environment variables.',
  );
}

// ✅ Resolve and read the certificate file (DER format)
const resolvedPath = path.resolve(MPESA_CERTIFICATE_PATH);
const certificateDer = fs.readFileSync(resolvedPath);

// ✅ Create a public key object from the DER-formatted certificate
const publicKey = crypto.createPublicKey({
  key: certificateDer,
  format: 'der',
  type: 'spki', // Most X.509 certificates in DER format are in SPKI format
});

/**
 * ✅ Encrypts the password using the provided public key with RSA PKCS1 padding.
 * @param {string} password - The plain text password to encrypt.
 * @param {object} publicKey - The public key object.
 * @returns {string} - The encrypted password in Base64 format.
 */
function generateSecurityCredential(password, publicKey) {
  const buffer = Buffer.from(password, 'utf-8');
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer,
  );
  return encrypted.toString('base64');
}

// ✅ Generate security credential
const securityCredential = generateSecurityCredential(
  MPESA_INITIATOR_PASSWORD,
  publicKey,
);

console.log('✅ Generated Security Credential:', securityCredential);

// ✅ Export the security credential (Move `export` outside the `try` block)
export { securityCredential };
