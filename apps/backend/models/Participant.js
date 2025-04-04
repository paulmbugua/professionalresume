import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
  meetingId: { type: String, required: true },
  participant: {
    userId: { type: String, required: true },
    userName: { type: String },
    email: { type: String },
    role: { type: String, default: 'unknown' },
    joinTime: { type: Date },
    leaveTime: { type: Date },
  },
  rawPayload: { type: Object },
});

const Participant = mongoose.model('Participant', ParticipantSchema);

export default Participant;
