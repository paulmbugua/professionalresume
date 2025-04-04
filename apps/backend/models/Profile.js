import mongoose from 'mongoose';

// Message Schema
const conversationSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, trim: true },
        timestamp: { type: Date, default: Date.now },
        unread: { type: Boolean, default: true },
      },
    ],
    unreadCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const certificationSchema = new mongoose.Schema({
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  tutorName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified'],
    default: 'Pending',
  },
  documents: [
    {
      fileUrl: { type: String },
      public_id: { type: String },
    },
  ],
  submittedAt: { type: Date },
  verifiedAt: { type: Date },
});

// Profile Schema
const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['tutor', 'student'], required: true },
    name: { type: String, required: true, trim: true, minlength: 2 },
    age: { type: Number, required: true, min: 5 },
    languages: { type: [String], default: [], trim: true },
    gallery: { type: [String], default: [] },
    video: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Online', 'Offline', 'Busy', 'Free'],
      default: 'Offline',
    },
    notifications: { type: Boolean, default: false },
    category: {
      type: String,
      enum: [
        'Math Tutor',
        'Sciences',
        'Programming',
        'Languages',
        'Art & Design',
        'Wellness',
      ],
      trim: true,
    },
    favorites: { type: [String], default: [] },
    recommended: { type: [String], default: [] },
    experienceLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      trim: true,
    },

    // ✅ Description (Required for Tutors)
    description: {
      bio: {
        type: String,
        required: function () {
          return this.role === 'tutor';
        },
        trim: true,
        default: '',
      },
      expertise: {
        type: [String],
        required: function () {
          return this.role === 'tutor';
        },
        default: [],
        trim: true,
      },
      teachingStyle: {
        type: [String],
        required: function () {
          return this.role === 'tutor';
        },
        default: [],
        trim: true,
      },
    },

    // ✅ Pricing (Required for Tutors)
    pricing: {
      privateSession: {
        type: Number,
        min: 20,
        max: 150,
        required: function () {
          return this.role === 'tutor';
        },
      },
      groupSession: {
        type: Number,
        min: 15,
        max: 80,
        required: function () {
          return this.role === 'tutor';
        },
      },
      lecture: {
        type: Number,
        min: 10,
        max: 50,
        required: function () {
          return this.role === 'tutor';
        },
      },
      workshop: {
        type: Number,
        min: 15,
        max: 200,
        required: function () {
          return this.role === 'tutor';
        },
      },
    },

    ageGroup: {
      type: [String],
      default: [],
      // Removed the conditional required validator so tutors can also add age group.
      trim: true,
    },

    // ✅ Age Group (Required for Students)
    ageGroup: {
      type: [String],
      default: [],
      required: function () {
        return this.role === 'student';
      },
      trim: true,
    },

    // ✅ Payment Details for Tutors
    paymentMethod: {
      type: String,
      enum: ['bank', 'mpesa'],
      required: function () {
        return this.role === 'tutor';
      },
    },
    bankAccount: {
      type: String,
      required: function () {
        return this.paymentMethod === 'bank';
      },
      trim: true,
    },
    bankCode: {
      type: String,
      required: function () {
        return this.paymentMethod === 'bank';
      },
      trim: true,
    },
    mpesaPhoneNumber: {
      type: String,
      required: function () {
        return this.paymentMethod === 'mpesa';
      },
      trim: true,
      set: function (v) {
        // Automatically format to +254XXXXXXXXX (Supports 07 & 01 prefixes)
        if (/^(07|01)\d{8}$/.test(v)) {
          return `+254${v.slice(1)}`;
        }
        if (v.startsWith('254')) {
          return `+${v}`;
        }
        return v;
      },
      validate: {
        validator: function (v) {
          return /^\+254(7|1)\d{8}$/.test(v); // Supports both 07XXXXXXXX & 01XXXXXXXX
        },
        message: 'Invalid M-Pesa phone number. Must start with +2547 or +2541.',
      },
    },
  },
  { timestamps: true },
);

// ✅ Validation Before Saving
profileSchema.pre('save', function (next) {
  try {
    if (this.role === 'tutor') {
      if (!this.description.bio.trim()) {
        throw new Error('Tutors must provide a bio.');
      }
      if (!this.description.expertise.length) {
        throw new Error('Tutors must specify at least one expertise.');
      }
      if (!this.description.teachingStyle.length) {
        throw new Error('Tutors must specify at least one teaching style.');
      }
      if (
        !this.pricing.privateSession ||
        !this.pricing.groupSession ||
        !this.pricing.lecture ||
        !this.pricing.workshop
      ) {
        throw new Error('Tutors must specify pricing for all session types.');
      }

      // ✅ Ensure Payment Details Are Valid
      if (
        this.paymentMethod === 'bank' &&
        (!this.bankAccount || !this.bankCode)
      ) {
        throw new Error('Bank details are required for bank payments.');
      }
      if (this.paymentMethod === 'mpesa' && !this.mpesaPhoneNumber) {
        throw new Error('M-Pesa phone number is required for M-Pesa payments.');
      }
    }

    if (this.role === 'student') {
      if (!this.ageGroup.length) {
        throw new Error('Students must specify their age group.');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Create Model
const Certification = mongoose.model('Certification', certificationSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);
const Profile = mongoose.model('Profile', profileSchema);

// Export Models
export { Profile, Conversation, Certification };
