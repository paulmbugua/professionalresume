import mongoose from 'mongoose';

const ZoomWebhookSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
    enum: [
      'meeting.participant_joined',
      'meeting.participant_left',
      'meeting.ended',
    ],
  },
  meetingIds: {
    type: [String], // Array of strings to store multiple meeting IDs
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  rawPayload: { type: mongoose.Schema.Types.Mixed }, // To store the raw payload
});

const ZoomWebhook = mongoose.model('ZoomWebhook', ZoomWebhookSchema);
export default ZoomWebhook;
