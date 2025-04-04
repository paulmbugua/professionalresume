import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional: Associate the review with a particular session.
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

const Review = mongoose.model('Review', reviewSchema);

export default Review;
