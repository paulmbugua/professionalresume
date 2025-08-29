// 🔹 Utility Types
export type GalleryImage = File | string | null;
export type LanguageMap = Record<string, boolean>;
export type Role = 'student' | 'tutor';
export type PayoutCurrency = 'KES' | 'USD';
export type PayoutMethod   = 'mpesa' | 'stripe' | 'paypal';

// Pricing for text-input UIs (strings) — used in some forms
export type Pricing = {
  privateSession: string;
  groupSession: string;
  lecture: string;
  workshop: string;
};

// 🔹 Form Support
export interface FormTarget {
  name: string;
  value: string;
  files?: FileList;
}

// 🔹 Payout info (responses)
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
  gross: number;       // numeric amount used in that endpoint
  tutorPaid: number;   // numeric net paid amount
  paymentResponse?: unknown;
}

// 🔹 Core Profile Structures
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

  // legacy/general
  paymentMethod: 'bank' | 'mpesa';
  bankAccount: string;
  bankCode: string;
  mpesaPhoneNumber: string;

  // NEW payout preferences
  payoutCurrency: PayoutCurrency;   // 'KES' | 'USD'
  payoutMethod: PayoutMethod;       // 'mpesa' | 'stripe' | 'paypal'
  stripeConnectId: string;          // required if payoutMethod === 'stripe'
  paypalEmail: string;              // required if payoutMethod === 'paypal'
}

export interface UpdateProfilePayload {
  name: string;
  age: number;
  languages: string[];
  ageGroup: string[];
  gallery: string[];
  video?: string;

  // tutor-only (optional for safety)
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

  // legacy/general
  paymentMethod?: 'bank' | 'mpesa';
  bankAccount?: string;
  bankCode?: string;

  // phone required for KES payouts
  mpesaPhoneNumber?: string;

  // NEW payout prefs
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

// UI-friendly profile data (string pricing, etc.)
export interface ProfileData
  extends Omit<UpdatedProfileData, 'age' | 'pricing' | 'paymentMethod' | 'video'> {
  id?: string;
  age: string;
  approach: string;
  specialties: string;

  // keep the exact union from UpdatedProfileData
  status: UpdatedProfileData['status'];

  // UI-friendly overrides
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

export interface UserProfileResponse {
  profileExists: boolean;
  profile?: Profile;
}

// Used for components like <ProfileCard />
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

// 🔹 Rating, Session, and Earnings
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

export interface EarningType {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
}

// 🔹 Payment Packages
export interface PaymentPackage {
  id: string;
  offer: string;
  price: number;
  credits: number;
  currency: string;
 
  
}

// -----------------------------------------------------------------
// Backend Mapped Response Type with widened index signature
export type MappedProfile = Partial<UpdatedProfileData> & {
  id?: string;
  name?: string;
  section?: string;
  category?: string;
  role?: Role;
  languages?: string[];
  ageGroup?: string[];
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
  status?: string;
  experienceLevel?: string;
  specialties?: string;
  languageFluency?: string;

  // raw DB/transport field names (optional)
  payout_currency?: PayoutCurrency;
  payout_method?: PayoutMethod;
  stripe_connect_id?: string;
  paypal_email?: string;
  mpesa_phone_number?: string;

  [key: string]:
    | string
    | number
    | boolean
    | string[]
    | { [key: string]: number | undefined }
    | { bio?: string; expertise?: string[]; teachingStyle?: string[] }
    | undefined;
};
// -----------------------------------------------------------------

// 🔹 Form Data for Session or Review
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

export interface Transactions {
  id: string;
  amount: number;
  type: string;
  [key: string]: string | number;
}

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

// In your ../components/ProfileActions.web.tsx or your shared types file
export interface TutorProfile {
  id: string;
  /** Some endpoints return `user_id`, others return `user` */
  user_id?: string;     // ← make optional
  user?: string;        // ← keep this (some APIs send `user`)

  name: string;
  pricing: Pricing;
  category?: string;
  gallery: string[];    // required
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

// 🔹 Payload for creating/updating a profile via JSON
export interface UploadAsset {
  uri: string;
  name?: string;
  type?: string;
  duration?: number;
}

export interface ProfilePayload {
  role: 'tutor' | 'student';
  name: string;
  age: number;
  languages: string[];
  // students only
  ageGroup?: string[];

  // tutors only
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

  // (legacy/general payment fields you already had)
  paymentMethod?: 'bank' | 'mpesa';
  bankAccount?: string;
  bankCode?: string;
  mpesaPhoneNumber?: string;

  // NEW payout preferences used by the payout flow
  payoutCurrency?: PayoutCurrency;   // defaulted to 'KES' on server
  payoutMethod?: PayoutMethod;       // 'mpesa' for KES, 'stripe'/'paypal' for USD
  stripeConnectId?: string;          // required if payoutMethod === 'stripe'
  paypalEmail?: string;              // required if payoutMethod === 'paypal'

  // media
  gallery?: string[];
  video?: string | null;
}

// 🔹 Recorded Videos (Class Vault)
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
  rating: number; // 1 to 5
  comment?: string;
  created_at: string;
}

// 🔹 Core Course Types
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';

export interface SyllabusItem {
  week: number;
  topic: string;
  assignment?: string;
  videoUrl?: string;   // optional video link or upload
  notesUrl?: string;   // optional PDF/notes file
}

export interface CoursePayload {
  tutorId: number;                // users.id is INTEGER
  title: string;
  description?: string;
  level: CourseLevel;
  duration?: string;              // e.g. "6 weeks"
  price: number;
  syllabus?: SyllabusItem[];
  prerequisites?: string;
}

export interface Course extends CoursePayload {
  id: string;                     // UUID
  createdAt: string;
}

// 🔹 Enrollment Types
export interface Enrollment {
  id: string;                     // UUID
  courseId: string;
  studentId: number;
  status: 'active' | 'completed' | 'upcoming';
  progress: number;
  startedAt: string;
  completedAt?: string;
}

// 🔹 Achievement Types
export interface Achievement {
  id: string;
  student_id: number;
  course_id?: string | null;
  rule_code: string;
  title: string;
  icon_url?: string | null;
  earned_at: string;
}

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
}
export interface CertificateRecord {
  id: string;
  student_id: number;
  course_id: string;
  url: string;
  issued_at: string;
  student_name?: string; // returned by verify endpoint
  course_title?: string; // returned by verify endpoint
}

export interface VerifyCertificateResponse {
  valid: boolean;
  error?: string;
  certificate?: CertificateRecord;
}

// 🔹 Purchases (aligns with course_purchases table & controller response)
export interface CoursePurchase {
  id: string;
  course_id: string;     // UUID of the course
  student_id: number;    // buyer
  tutor_id: number;      // course owner
  gross: number;         // tokens charged (gross)
  net_tokens: number;    // tokens credited to tutor (after 15%)
  created_at: string;
  payout_status?: 'Pending' | 'Completed' | string | null;
  payout_reference?: string | null;
}

export interface CoursePurchaseResponse {
  message: string;            // e.g. "Purchase successful" | "Already purchased. Enrollment ensured."
  purchase: CoursePurchase;   // inserted or existing purchase row
  enrollment: Enrollment;     // created (or existing) enrollment
  tokens: number;             // student's updated token balance
  payout?: PayoutInfo;        // present when server includes payout breakdown
}
