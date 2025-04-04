import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    role: { type: String },
    email: { type: String, unique: true, required: true },
    password: { type: String },
    googleId: { type: String },
    otp: { type: String },
    otpExpiration: { type: Date },
    tokens: { type: Number, default: 0 }, // Add tokens field with a default value
  },
  { timestamps: true },
);

const userModel = mongoose.models.User || mongoose.model('User', userSchema);
export default userModel;
