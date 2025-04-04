// models/Package.js
import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  credits: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 1 },
  offer: { type: String, required: true, trim: true },
});

const Package = mongoose.model('Package', packageSchema);

export default Package;
