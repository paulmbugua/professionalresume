import mongoose from 'mongoose';

const tutorSessionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['session', 'earning', 'review'],
      required: true,
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: function () {
        return this.type !== 'earning';
      },
    },
    sessionType: {
      type: String,
      enum: ['privateSession', 'groupSession', 'lecture', 'workshop'],
      required: function () {
        return this.type === 'session';
      },
    },
    totalDuration: Number,

    subject: {
      type: String,
      required: function () {
        return this.type === 'session';
      },
    },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: [
        'upcoming',
        'completed',
        'cancelled',
        'pending',
        'accepted',
        'completed_pending',
      ],
      default: 'pending',
    },
    
    amount: {
      type: Number,
      required: function () {
        return this.type !== 'review';
      },
    },
    zoomLinks: [String], // Array of Zoom links
    zoomMeetingIds: [String],
    paystackReference: { type: String, default: '' },
    participants: [
      { email: String, role: String, registrantId: String, userName: String },
    ],
    last_tutor_join_time: Date,
    last_tutor_leave_time: Date,
    last_student_join_time: Date,
    last_student_leave_time: Date,
    tutor_duration: { type: Number, default: 0 },
    student_duration: { type: Number, default: 0 },
    description: {
      type: String,
      required: function () {
        return this.type === 'earning';
      },
    },
    comment: {
      type: String,
      required: function () {
        return this.type === 'review';
      },
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: function () {
        return this.type === 'review';
      },
    },
  },
  { timestamps: true },
);

tutorSessionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('TutorSession', tutorSessionSchema);
