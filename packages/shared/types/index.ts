// -------------------------------------------------------------
// 🔹 Utility & Core Types
// -------------------------------------------------------------
export type GalleryImage = File | string | null;
export type LanguageMap = Record<string, boolean>;
export type Role = 'student' | 'tutor';

export type PayoutCurrency = 'KES' | 'USD';
export type PayoutMethod = 'mpesa' | 'stripe' | 'paypal';

// Pricing (UI-friendly string representation)
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
// 🔹 Payout Types (single source of truth)
// -------------------------------------------------------------
export interface Payout {
  id: number;
  tutor_id: number;
  currency: PayoutCurrency;
  method: PayoutMethod;
  amount: number;
  destination: string;
  status: string; // Pending | Completed | Failed | etc
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
// 🔹 Profile & User Types
// -------------------------------------------------------------
export interface UpdatedProfileData {
  name: string;
  age: number;
  bio: string;
  expertise: string[];
  teachingStyle: string[];
  status: 'Online' | 'Offline' | 'Busy' | 'Away' | 'Free';
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

  paymentMethod: 'bank' | 'mpesa';
  bankAccount: string;
  bankCode: string;
  mpesaPhoneNumber: string;

  payoutCurrency: PayoutCurrency;
  payoutMethod: PayoutMethod;
  stripeConnectId: string;
  paypalEmail: string;
}

export interface UpdateProfilePayload {
  name: string;
  age: string;
  languages: string[];
  ageGroup: string[];
  gallery: string[];
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

  paymentMethod?: 'bank' | 'mpesa';
  bankAccount?: string;
  bankCode?: string;
  mpesaPhoneNumber?: string;

  payoutCurrency?: PayoutCurrency;
  payoutMethod?: PayoutMethod;
  stripeConnectId?: string;
  paypalEmail?: string;

  description?: {
    bio: string;
    expertise: string[];
    teachingStyle: string[];
  };
}

export interface ProfileData
  extends Omit<UpdatedProfileData, 'age' | 'pricing' | 'paymentMethod' | 'video'> {
  id?: string;
  age: string;
  approach: string;
  specialties: string;

  status: UpdatedProfileData['status'];

  video: File | string;
  pricing: Pricing & { [key: string]: string };
  paymentMethod: 'bank' | 'mpesa' | '';
}

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

export interface MappedProfile {
  name?: string;
  payout_currency?: string; // e.g., 'KES' | 'USD'
  payout_method?: string;   // e.g., 'mpesa'
  // add more fields if you start using them
}

export interface UserProfileResponse {
  profileExists: boolean;
  profile?: Profile;
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
// 🔹 Profile Payload
// -------------------------------------------------------------
export interface ProfilePayload {
  role: 'tutor' | 'student';
  name: string;
  age: number;
  languages: string[];
  ageGroup?: string[];

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

  paymentMethod?: 'bank' | 'mpesa';
  bankAccount?: string;
  bankCode?: string;
  mpesaPhoneNumber?: string;

  payoutCurrency?: PayoutCurrency;
  payoutMethod?: PayoutMethod;
  stripeConnectId?: string;
  paypalEmail?: string;

  gallery?: string[];
  video?: string | null;
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
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';

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
  id: string;
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
// 🔹 Payment Packages (single source of truth)
// -------------------------------------------------------------
export interface PaymentPackage {
  /** Unique package ID from your DB */
  id: string | number;
  /** Optional display name/offer label, e.g., "Best Value" */
  offer?: string;
  /** Price in the package currency (USD or KES) */
  price: number;
  /** Number of credits/tokens included in the package */
  credits: number;
  /** Currency code for the package */
  currency: PayoutCurrency; // 'USD' | 'KES'
}


export interface WithdrawalRequestBody {
  currency: PayoutCurrency; // 'USD' | 'KES'
  amount: number;
}

export interface WithdrawalResponse {
  message: string;        // "Withdrawal queued."
  transactionId: number;  // transactions.id
  payoutId: number;       // payouts.id
}

// -------------------------------------------------------------
// 🔹 AI Course Types (updated)
// -------------------------------------------------------------
export type TopCourse = {
  id: string;          // uuid
  title: string;
  blurb: string;
  rating: number;      // 0..5
  reviews: number;     // count
};

export type AiOutlineSection = {
  id: string;          // e.g., "w1"
  title: string;
  keyPoints: string[];
};

export type AiOutlineResponse = {
  outline: AiOutlineSection[];
};

// New: granular lesson structure returned by /ai/lesson-ssml
export type AILesson = {
  id: string;                // "L1", "L2", ...
  title: string;
  goals?: string[];
  ssml: string;              // Azure SSML <speak>...</speak>
  estSeconds?: number;
};

// New: full pack returned by /ai/lesson-ssml (and used by /ai/course-package)
export type LessonPack = {
  lessons: AILesson[];
  /** Single block for backward compatibility with old player */
  joinedSsml: string;
  /** Present when backend degraded to scaffold/fallback */
  notice?: { degraded: boolean; reason: string };
};

/**
 * DEPRECATED: Old type for /ai/lesson-ssml responses.
 * Keep it as an alias to LessonPack for compatibility with older imports.
 */
export type LessonSSMLResponse = LessonPack;

export type QuizQuestion = {
  id: string;          // e.g., "q1"
  prompt: string;
  choices: string[];   // ["A", "B", "C", "D"]
  answerIndex: number; // 0-based
};

export type Quiz = {
  questions: QuizQuestion[];
};

export type GradeRequest = {
  quiz: Quiz;
  answers: { questionId: string; choiceIndex: number }[];
  passMark?: number; // default handled by server
};

export type GradeResult = {
  correct: number;
  total: number;
  scorePct: number; // 0..100
  passed: boolean;
  passMark: number;
};

// New: one-shot bundle from /ai/course-package
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

