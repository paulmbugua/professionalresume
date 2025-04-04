import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }, // Links to Profile schema
    type: {
      type: String,
      enum: [
        'Token Deduction',
        'Expected Earnings',
        'Completed Earnings',
        'Platform Commission',
      ],
      required: true,
    },
    amount: { type: Number, required: true }, // Positive for earnings, negative for deductions
    description: { type: String, required: true }, // Details of the transaction
    date: { type: Date, default: Date.now }, // Date of transaction
    status: {
      type: String,
      enum: ['Pending', 'Completed'],
      default: 'Pending',
    }, // Transaction status
    paystackReference: { type: String, default: null }, // Changed default from "" to null
    mpesaReference: { type: String, default: null },
    phoneNumber: { type: String, default: '' }, // Phone number for M-Pesa transactions
    paymentMethod: {
      type: String,
      enum: ['M-Pesa', 'Visa/MasterCard', 'PayPal', 'Cryptos', 'MPESA', 'B2C'],
      required: true,
    },
  },
  { timestamps: true },
);

// Create the Transaction model
const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
