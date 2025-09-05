// packages/shared/types/index.ts

// -------------------------------------------------------------
// 🔹 Utility & Core Types
// -------------------------------------------------------------
export type GalleryImage = File | string | null;
export type LanguageMap = Record<string, boolean>;
export type Role = 'student' | 'tutor';
export type LegacySize = 'micro' | 'short' | 'standard' | 'deep_dive';
export type DbCourseSize = 'mini' | 'standard' | 'extended' | 'deep_dive' | 'bootcamp';
export type AnyCourseSize = LegacySize | DbCourseSize;

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type ProgramTrack = 'module' | 'certificate' | 'diploma' | 'degree';
export type PayoutMethod = 'wise' | 'mpesa';
export type PayoutCurrency = 'USD' | 'KES';

// UI-friendly strings (for display forms etc.)
export type Pricing = {
  privateSession: string;
  groupSession: string;
  lecture: string;
  workshop: string;
};

// -------------------------------------------------------------
// 🔹 Form Support
// -------------------------------------------------------------
export interface FormTarget {
  name: string;
  value: string;
  files?: FileList;
}

// -------------------------------------------------------------
// 🔹 Payout Types
// -------------------------------------------------------------
export interface Payout {
  id: number;
  tutor_id: number;
  currency: PayoutCurrency;
  method: PayoutMethod;
  amount: number;
  destination: string;
  status: string;
  provider_ref?: string | null;
  error?: string | null;
  created_at: string;
  paid_at: string | null;
  updated_at?: string;
}

export interface PayoutInfo {
  grossUSD: number;
  tutorUSD: number;
  grossKES: number;
  tutorKES: number;
  status: 'Pending' | 'Completed' | string;
  mpesaRef: string | null;
  usdToKes: number;
  paymentResponse?: unknown;
}

export interface SessionPayoutInfo {
  gross: number;
  tutorPaid: number;
  paymentResponse?: unknown;
}

// -------------------------------------------------------------
// 🔹 Profile & User Types (UI model ➜ form state)
// -------------------------------------------------------------
export interface UpdatedProfileData {
  name: string;
  age: number;
  bio: string;
  expertise: string[];
  teachingStyle: string[];
  // include 'New' to match ManageProfileForm status choices
  status: 'Online' | 'Offline' | 'Busy' | 'Away' | 'Free' | 'New';
  notifications: boolean;

  gallery: GalleryImage[];
  video: string | File | '';

  languages: Record<string, boolean>;

  pricing: {
    privateSession: number;
    groupSession: number;
    lecture: number;
    workshop: number;
  };

  experienceLevel: string;
  ageGroup: string[];
  category: string;
  recommended: string[];

  // ✅ Current payout model (Wise/M-Pesa only)
  payoutCurrency: PayoutCurrency; // Wise→USD, M-Pesa→KES (UI may still display explicitly)
  payoutMethod: PayoutMethod;
  mpesaPhoneNumber: string;
  wiseEmail?: string;

  // ── Legacy (deprecated) kept only for backward compatibility on old UIs ──
  /** @deprecated */
  paymentMethod?: 'bank' | 'mpesa';
  /** @deprecated */
  bankAccount?: string;
  /** @deprecated */
  bankCode?: string;
}

/** Payload your API expects for updates */
export interface UpdateProfilePayload {
  name: string;
  age: string; // server expects string
  languages: string[];
  ageGroup: string[];

  gallery?: string[];
  video?: string;

  status?: string;
  notifications?: boolean;

  pricing: {
    privateSession: number;
    groupSession: number;
    lecture: number;
    workshop: number;
  };

  experienceLevel?: string;
  category?: string;
  recommended: string[];

  // ✅ Wise/M-Pesa only
  payoutCurrency?: PayoutCurrency;
  payoutMethod?: PayoutMethod;
  mpesaPhoneNumber?: string;
  wiseEmail?: string;

  description?: {
    bio: string;
    expertise: string[];
    teachingStyle: string[];
  };

  // ── Legacy (deprecated) still accepted by older backends but not used by UI ──
  /** @deprecated */
  paymentMethod?: 'bank' | 'mpesa';
  /** @deprecated */
  bankAccount?: string;
  /** @deprecated */
  bankCode?: string;
}

/** Legacy UI view of a profile card */
export interface ProfileData
  extends Omit<UpdatedProfileData, 'age' | 'pricing' | 'paymentMethod' | 'video'> {
  id?: string;
  age: string;
  approach: string;
  specialties: string;

  status: UpdatedProfileData['status'];

  video: File | string;
  pricing: Pricing & { [key: string]: string };
  // Keep field for old components; allow empty/string; map to Wise/M-Pesa era
  paymentMethod: 'mpesa' | 'wise' | '';
}

/** Minimal typed profile (used by cards/lists) */
export interface Profile {
  id: string;
  user_id: string;
  name: string;
  category: string;
  expertise: string[];
  teachingStyle: string[];
  gallery: string[];
  role?: Role;
  status?: string;
  certified?: boolean;
}

/** ⭐ Full backend shape we receive — keep everything we use */
export type MappedProfile = Profile & {
  // server fields we rely on
  video?: string;
  languages?: string[];
  age_group?: string[];

  // legacy payments still might appear; keep optional so parsing doesn't break
  payment_method?: 'bank' | 'mpesa';
  bank_account?: string;
  bank_code?: string;

  // current payout model
  mpesa_phone_number?: string;
  wise_email?: string;

  experience_level?: string;
  recommended?: string[];
  pricing?: {
    privateSession?: number;
    groupSession?: number;
    lecture?: number;
    workshop?: number;
    [key: string]: number | undefined;
  };
  description?: {
    bio?: string;
    expertise?: string[];
    teachingStyle?: string[];
  };

  payout_currency?: PayoutCurrency | string;
  payout_method?: PayoutMethod | string;

  // legacy payout fields that may still exist in older rows
  stripe_connect_id?: string;
  paypal_email?: string;

  // extra metadata (non-breaking)
  created_at?: string;
  updated_at?: string;

  /** allow unknown extras without using `any` */
  [key: string]: unknown;
};

export interface UserProfileResponse {
  profileExists: boolean;
  profile?: MappedProfile;
}

export interface ProfileCardProps {
  profile: {
    id: string;
    name: string;
    role?: string;
    status?: string;
    gallery: string[];
    certified?: boolean;
  };
}

export interface AvailableProfile {
  _id: string;
  name: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

// -------------------------------------------------------------
// 🔹 Ratings, Reviews & Sessions
// -------------------------------------------------------------
export interface RatingFormData {
  id: string;
  tutorId: string;
  sessionId: string;
  rating: string;
  comment: string;
  studentName: string;
  createdAt: string;
}
export interface RatingStats {
  avgRating: number;
  totalReviews: number;
}
export interface RatingData extends RatingFormData, RatingStats {}

export interface Session {
  id: string;
  status: string;
  tutorId?: string;
  zoom_links?: string[];
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface SessionType {
  id: string;
  tutor_name?: string;
  student_name?: string;
  tutor_id?: string;
  student_id?: string;
  sessionType: string;
  subject?: string;
  amount: number;
  date: string;
  status: string;
  total_duration?: number;
  zoom_links?: string[];
}

export interface SessionFormData {
  tutorId: string;
  tutorName: string;
  subject: string;
  pricing: Record<string, number>;
  date: string;
  sessionType?: string;
  sessionCost?: string;
  comment?: string;
  rating?: string;
}

// -------------------------------------------------------------
// 🔹 Transactions & Earnings
// -------------------------------------------------------------
export interface Transaction {
  id: number;
  type: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  date: string;
}

export interface EarningsSummary {
  total: number;
  available: number;
  pending: number;
  currency: string;
}

// -------------------------------------------------------------
// 🔹 Auth & User
// -------------------------------------------------------------
export interface User {
  userId?: string;
  email: string | null;
  tokens: number;
  name?: string;
  profileImage?: string;
}

export interface AccountDetails {
  [key: string]: Session[] | string | number;
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  age?: string;
  languages?: string[];
  ageGroup?: string;
}

export interface UpdateRolePayload {
  userId: string;
  role: Role;
  age?: string;
  languages?: string[];
  ageGroup?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  role?: Role;
  user?: {
    id: string;
    email: string;
    name?: string;
    [key: string]: string | undefined;
  };
}

// -------------------------------------------------------------
// 🔹 Tutor Profiles
// -------------------------------------------------------------
export interface TutorProfile {
  id: string;
  user_id?: string;
  user?: string;
  name: string;
  pricing: Pricing;
  category?: string;
  gallery: string[];
  video?: string;
  role?: string;
  status?: string;
  certified?: boolean;
  lastOnline?: string;
  description?: {
    bio?: string;
    expertise?: string[];
    teachingStyle?: string[];
  };
  recommended?: TutorProfile[];
  languages?: string[];
  rating?: number;
  totalReviews?: number;
}

// -------------------------------------------------------------
// 🔹 Uploads & Assets
// -------------------------------------------------------------
export interface UploadAsset {
  uri: string;
  name?: string;
  type?: string;
  duration?: number;
}

// -------------------------------------------------------------
// 🔹 Profile Payload (create)
// -------------------------------------------------------------
export interface ProfilePayload {
  role: 'tutor' | 'student';
  name: string;
  age: number;
  languages: string[];
  ageGroup?: string[];

  // tutor-only
  category?: string;
  description?: {
    bio: string;
    expertise: string[];
    teachingStyle: string[];
  };
  pricing?: {
    privateSession: number;
    groupSession: number;
    lecture: number;
    workshop: number;
  };

  // ✅ Wise/M-Pesa only
  payoutCurrency?: PayoutCurrency;
  payoutMethod?: PayoutMethod;
  mpesaPhoneNumber?: string;
  wiseEmail?: string;

  gallery?: string[];
  video?: string | null;

  // ── Legacy accepted by some backends but unused by UI ──
  /** @deprecated */
  paymentMethod?: 'bank' | 'mpesa';
  /** @deprecated */
  bankAccount?: string;
  /** @deprecated */
  bankCode?: string;
  /** @deprecated */
  stripeConnectId?: string;
  /** @deprecated */
  paypalEmail?: string;
}

// -------------------------------------------------------------
// 🔹 Recorded Videos (ClassVault)
// -------------------------------------------------------------
export interface RecordedVideo {
  id: number;
  tutor_id: number;
  title: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  price: number;
  duration?: number;
  tags?: string[];
  video_url: string;
  pdf_url?: string;
  preview_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface VideoReview {
  id: number;
  video_id: number;
  student_id: number;
  rating: number;
  comment?: string;
  created_at: string;
}

// -------------------------------------------------------------
// 🔹 Courses, Enrollments & Achievements
// -------------------------------------------------------------
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface SyllabusItem {
  week: number;
  topic: string;
  assignment?: string;
  videoUrl?: string;
  notesUrl?: string;
}

export interface CoursePayload {
  tutorId: number;
  title: string;
  description?: string;
  level: CourseLevel;
  duration?: string;
  price: number;
  syllabus?: SyllabusItem[];
  prerequisites?: string;
}

export interface Course extends CoursePayload {
  id: string;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: number;
  status: 'active' | 'completed' | 'upcoming';
  progress: number;
  startedAt: string;
  completedAt?: string;
}

export interface Achievement {
  id: number;
  student_id: number;
  course_id?: string | null;
  rule_code: string;
  title: string;
  icon_url?: string | null;
  earned_at: string;
}

// -------------------------------------------------------------
// 🔹 Progress & Certificates
// -------------------------------------------------------------
export interface CourseProgress {
  week: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  updated_at?: string | null;
  id?: string;
  student_id?: string | number;
  course_id?: string;
  score?: number | null;
  notes?: string | null;
}

export interface UpdateProgressPayload {
  courseId: string;
  week: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  score?: number | null;
  notes?: string | null;
}

export interface Certificate {
  id: string;
  student_id: number;
  course_id: string;
  url: string;
  issued_at: string;
  download_url?: string;
  downloadUrl?: string;
}

export interface CertificateRecord {
  id: string;
  student_id: number;
  course_id: string;
  url: string;
  issued_at: string;
  student_name?: string;
  course_title?: string;
}

export interface VerifyCertificateResponse {
  valid: boolean;
  error?: string;
  certificate?: CertificateRecord;
}

// -------------------------------------------------------------
// 🔹 Purchases
// -------------------------------------------------------------
export interface CoursePurchase {
  id: string;
  course_id: string;
  student_id: number;
  tutor_id: number;
  gross: number;
  net_tokens: number;
  created_at: string;
  payout_status?: 'Pending' | 'Completed' | string | null;
  payout_reference?: string | null;
}

export interface CoursePurchaseResponse {
  message: string;
  purchase: CoursePurchase;
  enrollment: Enrollment;
  tokens: number;
  payout?: PayoutInfo;
}

// -------------------------------------------------------------
// 🔹 Payment Packages
// -------------------------------------------------------------
export interface PaymentPackage {
  id: string | number;
  offer?: string;
  price: number;
  credits: number;
  currency: PayoutCurrency; // 'USD' | 'KES'
}

export interface WithdrawalRequestBody {
  currency: PayoutCurrency;
  amount: number;
}
export interface WithdrawalResponse {
  message: string;
  transactionId: number;
  payoutId: number;
}

// -------------------------------------------------------------
// 🔹 AI Course Types
// -------------------------------------------------------------
export type TopCourse = {
  id: string;
  title: string;
  blurb: string;
  rating: number;
  reviews: number;
};

export type AiOutlineSection = {
  id: string;
  title: string;
  keyPoints: string[];
};

export interface AiSizingKnobs {
  level?: Level;
  targetMinutes?: number;
  size?: LegacySize;
  courseSize?: DbCourseSize;
  paragraphs?: number;
  sentencesPerParagraph?: number;
  finalQuizSize?: number;
  programTrack?: ProgramTrack;
  totalLessons?: number;
}

export interface AiOutlineRequest extends AiSizingKnobs {
  courseId?: string;
  title?: string;
}

export interface AiLessonSSMLRequest extends AiSizingKnobs {
  courseId: string;
  outline: AiOutlineSection[];
  voiceName?: string;
  count?: number;
  start?: number;
}

export interface AiQuizRequest extends AiSizingKnobs {
  courseId: string;
  outline: AiOutlineSection[];
  numQuestions?: number;
}

export type AiOutlineResponse = {
  outline: AiOutlineSection[];
};

export type AILesson = {
  id: string;
  title: string;
  goals?: string[];
  ssml: string;
  estSeconds?: number;
};

export type LessonPack = {
  lessons: AILesson[];
  joinedSsml: string;
  quiz: Quiz;
  notice?: { degraded: boolean; reason: string };
};
export type LessonSSMLResponse = LessonPack;

export type QuizQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
};
export type Quiz = { questions: QuizQuestion[] };

export type GradeRequest = {
  quiz: Quiz;
  answers: { questionId: string; choiceIndex: number }[];
  passMark?: number;
};
export type GradeResult = {
  correct: number;
  total: number;
  scorePct: number;
  passed: boolean;
  passMark: number;
};

export type CoursePackage = {
  outline: AiOutlineSection[];
  lessons: AILesson[];
  joinedSsml: string;
  quiz: Quiz;
  notice?: { degraded: boolean; reason: string };
};

export type EligibilityResponse = {
  eligible: boolean;
  reason: string | null;
};
