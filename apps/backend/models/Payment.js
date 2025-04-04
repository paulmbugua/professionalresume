import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['MPESA', 'B2C', 'CARD', 'PAYPAL', 'CRYPTO'], // Match backend and frontend
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Success', 'Failed', 'Completed'],
      default: 'Pending',
    },
    transactionId: { type: String, unique: true }, // To track unique payments
    mpesaReference: { type: String },
  },
  { timestamps: true },
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
