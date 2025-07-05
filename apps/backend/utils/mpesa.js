// apps/backend/utils/mpesa.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ——— Environment vars ———
const consumerKey         = process.env.MPESA_CONSUMER_KEY;
const consumerSecret      = process.env.MPESA_CONSUMER_SECRET;
const passkey             = process.env.MPESA_PASSKEY;
const shortcode           = process.env.MPESA_SHORTCODE;
const b2cShortcode        = process.env.MPESA_B2C_SHORTCODE;
const callbackURL         = process.env.CALLBACK_URL;
const timeoutURL          = process.env.TIMEOUT_URL;
const resultURL           = process.env.RESULT_URL;
const initiatorName       = process.env.MPESA_INITIATOR_NAME;
const initiatorPassword   = process.env.MPESA_INITIATOR_PASSWORD;
const certPath            = process.env.MPESA_CERTIFICATE_PATH;

// ——— Validate presence ———
[
  ['MPESA_CONSUMER_KEY', consumerKey],
  ['MPESA_CONSUMER_SECRET', consumerSecret],
  ['MPESA_PASSKEY', passkey],
  ['MPESA_SHORTCODE', shortcode],
  ['CALLBACK_URL', callbackURL],
  ['TIMEOUT_URL', timeoutURL],
  ['RESULT_URL', resultURL],
  ['MPESA_INITIATOR_NAME', initiatorName],
  ['MPESA_INITIATOR_PASSWORD', initiatorPassword],
  ['MPESA_CERTIFICATE_PATH', certPath],
].forEach(([name, val]) => {
  if (!val) {
    console.warn(`⚠️ ${name} is missing`);
  }
});

// ——— Generate timestamp for STK Push ———
const timestamp = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);

// ——— STK Push password ———
const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

// ——— Build SecurityCredential by encrypting initiatorPassword ———
let securityCredential = null;
if (initiatorPassword && certPath) {
  try {
    const pubKey = fs.readFileSync(path.resolve(certPath), 'utf8');
    const encrypted = crypto.publicEncrypt(
      { key: pubKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(initiatorPassword, 'utf8')
    );
    securityCredential = encrypted.toString('base64');
  } catch (err) {
    console.error('❌ Failed to generate securityCredential:', err.message);
  }
} else {
  console.warn('❌ Cannot generate securityCredential: missing password or cert');
}

// ——— Access Token helper ———
export async function getAccessToken() {
  const cred = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  try {
    const { data } = await axios.get(
      'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${cred}` } }
    );
    if (!data.access_token) throw new Error('No access_token');
    return data.access_token;
  } catch (err) {
    console.error('❌ Error fetching M-Pesa token:', err.response?.data || err.message);
    throw err;
  }
}

// ——— Exports ———
export {
  shortcode,
  b2cShortcode,
  callbackURL,
  timeoutURL,
  resultURL,
  initiatorName,
  timestamp,
  password,
  securityCredential
};
