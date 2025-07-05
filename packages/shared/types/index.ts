// 🔹 Utility Types
export type GalleryImage = File | string | null;
export type LanguageMap = Record<string, boolean>;
export type Role = 'student' | 'tutor';

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

// 🔹 Core Profile Structures
export interface UpdatedProfileData {
  name?: string;
  age?: number;
  languages: LanguageMap;
  ageGroup: string[];
  pricing: Record<string, number>;
  expertise: string[];
  teachingStyle: string[];
  bio?: string;
  category?: string;
  status?: string;
  experienceLevel?: string;
  notifications?: boolean;
  gallery: GalleryImage[];
  video?: File | string;
  paymentMethod?: 'bank' | 'mpesa';
  bankAccount?: string;
  bankCode?: string;
  mpesaPhoneNumber?: string;
  recommended: string[];
}

export interface ProfileData extends Omit<UpdatedProfileData, 'age' | 'pricing' | 'paymentMethod'> {
  id?: string;
  age: string;
  bio: string;
  approach: string;
  specialties: string;
  status: 'Offline' | 'Online' | 'Busy' | string;
  notifications: boolean;
  gallery: GalleryImage[];
  video: File | string;
  pricing: Pricing & { [key: string]: string };
  paymentMethod: 'bank' | 'mpesa' | '';
  bankAccount: string;
  bankCode: string;
  mpesaPhoneNumber: string;
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
}

// -----------------------------------------------------------------
// Backend Mapped Response Type with a widened index signature
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
  teachingStyle?: string[];
  specialties?: string;
  languageFluency?: string;
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
export interface FormData {
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
  name: string;
  pricing: Pricing;
  category?: string;
  gallery: string[]; // remove the optional operator
  video?: string;
  role?: string;
  status?: string;
  lastOnline?: string;
  description?: {
    bio?: string;
    expertise?: string[];
    teachingStyle?: string[];
  };
  recommended?: TutorProfile[];
  languages?: string[];
  user: string;
  rating?: number;
  totalReviews?: number;
}

// 🔹 Payload for creating/updating a profile via JSON
export interface ProfilePayload {
  role: Role
  name: string
  age: number
  languages: string[]
  /** student-only */
  ageGroup?: string[]
  /** tutor-only */
  category?: string
  description?: {
    bio: string
    expertise: string[]
    teachingStyle: string[]
  }
  pricing?: Pricing
  paymentMethod?: 'bank' | 'mpesa'
  bankAccount?: string
  bankCode?: string
  mpesaPhoneNumber?: string
  /** URLs you get back from uploadAsset */
  gallery?: string[]
  /** URL you get back from uploadAsset */
  video?: string | null
}

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

// apps/mobile/src/navigation/types.ts
export type MainStackParamList = {
  Home:          undefined
  Login:         undefined
   ClassVaultLibrary: undefined;
  ClassVaultDetail: { id: number };
  ClassVaultUpload: undefined;
  Account: {
    action?:     'createSession'
    tutorId?:    string
    tutorName?:  string
    subject?:    string
    pricing?:    Record<string,string>
  }
  Profile:       { id: string }
  Messages:      { studentId?: string }
  Settings:        undefined
  SettingsCreate:  undefined
  SettingsManage:  undefined
  SettingsAccount: undefined
  CookiePolicy:    undefined
  BuyTokens:       undefined
}
