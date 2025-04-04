/**
 * Normalize a Kenyan phone number to the standard format: 254XXXXXXXXX.
 * @param {string} phone - The phone number input by the client.
 * @returns {string|null} - The normalized phone number or null if invalid.
 */
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    console.error('❌ Invalid phone number input:', phone);
    return null;
  }

  // Remove any spaces, dashes, or non-numeric characters
  phone = phone.replace(/[^\d]/g, '');

  // Check if the number starts with a valid Kenyan prefix
  if (phone.startsWith('07') || phone.startsWith('01')) {
    return '254' + phone.slice(1); // Convert 07xxxxxxxx to 2547xxxxxxxx
  } else if (phone.startsWith('254')) {
    return phone; // Already in correct format
  } else if (phone.startsWith('+254')) {
    return phone.slice(1); // Remove leading "+"
  }

  console.error('❌ Unsupported phone number format:', phone);
  return null;
}
