import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generate a Zoom API Access Token
 * @returns {Promise<string>} The access token
 */
export const getZoomAccessToken = async () => {
  try {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const accountId = process.env.ZOOM_ACCOUNT_ID;

    if (!clientId || !clientSecret || !accountId) {
      throw new Error(
        '❌ Missing Zoom API credentials. Check environment variables.',
      );
    }

    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await axios.post(tokenUrl, null, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!response.data.access_token) {
      throw new Error('❌ Zoom API did not return an access token.');
    }

    console.log('✅ Zoom Access Token Retrieved Successfully.');
    return response.data.access_token;
  } catch (error) {
    console.error(
      '❌ Error fetching Zoom access token:',
      error.response?.data || error.message,
    );
    throw new Error('Failed to retrieve Zoom access token');
  }
};

/**
 * Create a Zoom Meeting
 * @param {string} topic - Meeting topic
 * @param {string} startTime - Start time in ISO 8601 format
 * @param {number} duration - Duration in minutes
 * @param {string} tutorName - Tutor's name
 * @returns {Promise<object>} Meeting details
 */
export const createZoomMeeting = async (
  topic,
  startTime,
  duration,
  tutorName,
) => {
  try {
    const accessToken = await getZoomAccessToken();

    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime, // ISO 8601 format
        duration,
        agenda: `Tutoring session by ${tutorName}`,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true, // Allow participants to join before the host
          approval_type: 0, // Automatic approval
          enforce_login: false,
          waiting_room: false, // Disable waiting room so participants can join directly
          mute_upon_entry: true, // Mute participants on entry
          auto_adapted_timeout: true, // End meeting when everyone leaves (if supported)
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.data || !response.data.join_url) {
      throw new Error('❌ Zoom API did not return a valid meeting URL.');
    }

    console.log('✅ Zoom Meeting Created Successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ Error creating Zoom meeting:',
      error.response?.data || error.message,
    );
    throw new Error('Failed to create Zoom meeting');
  }
};
