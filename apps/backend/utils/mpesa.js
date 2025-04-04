import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Load M-Pesa API credentials from environment variables
const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const passkey = process.env.MPESA_PASSKEY;
const shortcode = process.env.MPESA_SHORTCODE;
const b2cShortcode = process.env.MPESA_B2C_SHORTCODE;
const callbackURL = process.env.CALLBACK_URL;
const timeoutURL = process.env.TIMEOUT_URL;
const resultURL = process.env.RESULT_URL;
const securityCredential = process.env.SECURITY_CREDENTIAL;
const initiatorName = process.env.MPESA_INITIATOR_NAME;
const initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD;
const certificatePath = process.env.MPESA_CERTIFICATE_PATH;

// ✅ Validate required environment variables
const requiredEnvVars = {
  MPESA_CONSUMER_KEY: consumerKey,
  MPESA_CONSUMER_SECRET: consumerSecret,
  MPESA_PASSKEY: passkey,
  MPESA_SHORTCODE: shortcode,
  CALLBACK_URL: callbackURL,
  TIMEOUT_URL: timeoutURL,
  RESULT_URL: resultURL,
  MPESA_INITIATOR_NAME: initiatorName,
  SECURITY_CREDENTIAL: securityCredential,
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.warn(`⚠️ Warning: ${key} is missing in environment variables.`);
  }
});

// ✅ Generate timestamp (YYYYMMDDHHMMSS)
const timestamp = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);

// ✅ Generate password for STK Push
const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
  'base64',
);

// ✅ Function to get M-Pesa access token
export async function getAccessToken() {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    'base64',
  );
  try {
    const response = await axios.get(
      'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } },
    );

    if (!response.data.access_token) {
      throw new Error('Failed to retrieve access token');
    }

    return response.data.access_token;
  } catch (error) {
    console.error(
      '❌ Error getting M-Pesa access token:',
      error.response?.data || error.message,
    );
    throw new Error('Failed to retrieve M-Pesa access token');
  }
}

// ✅ Export required variables & functions
export {
  password,
  initiatorPassword,
  certificatePath,
  initiatorName,
  shortcode,
  b2cShortcode,
  callbackURL,
  timeoutURL,
  resultURL,
  securityCredential,
  timestamp,
};
