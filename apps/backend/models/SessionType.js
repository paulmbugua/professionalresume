import mongoose from 'mongoose';

const sessionTypeSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, // e.g., 'privateSession', 'groupSession'
  duration: { type: Number, required: true }, // Duration in minutes
});

const SessionType = mongoose.model('SessionType', sessionTypeSchema);

export default SessionType;
