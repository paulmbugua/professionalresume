// apps/mobile/src/navigation/types.ts

export type ActiveTab =
  | 'overview'
  | 'transactions'
  | 'sessions'
  | 'reviews'
  | 'earnings';

export type MainStackParamList = {
  /* Landing & Public */
  Landing: undefined;
  InviteLogin: { code: string };
  Home: undefined;
  Login: undefined;
  Help: undefined;
  Resources: undefined;
  CookiePolicy: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  AntiSpamPolicy: undefined;
  ComplaintsFeedback: undefined;
  OerCollectionReader: { id: string };
  RefundsAndCancellations: undefined;
 Unsubscribe: { e?: string; t?: string; email?: string; token?: string } | undefined;
  FulfillmentPolicy: undefined;
  PaymentFlow: undefined;
  

  /* Verify (public) */
  VerifyCertificate: { id?: string } | undefined;
  VerifyCertificatePrint: { id?: string } | undefined;

  /* Org (public + protected in-app) */
  InstitutionLogin: undefined;
  OrgInviteLanding: { code?: string } | undefined;
  OrgElearnPortal:
    | { tab?: 'branding' | 'assign' | 'analytics'; from?: string; courseId?: string }
    | undefined;
  OrgProfile: undefined;

  /* Discovery & tutor */
  FindTutor: { subject?: string } | undefined;
  RobotTutor: undefined;

  /* Catalog & course details */
  Courses: undefined; // list of courses (MyCourses)
  CourseDetails: { courseId: string };
  CourseProgress: { courseId: string };

  /* Enrollments & lifecycle */
  MyEnrollments: undefined;
  CreateCourse: undefined;
  CourseEnrollment: { courseId: string };

  /* Achievements */
  Achievements: undefined;

  /* ClassVault */
  ClassVaultLibrary: undefined;
  ClassVaultDetail: { id: number };
  ClassVaultUpload: undefined;

  /* Profile & account */
  Account: {
    action?: 'createSession';
    tutorId?: string;
    tutorName?: string;
    subject?: string;
    pricing?: Record<string, string>;
    tab?: ActiveTab;
  };
  Profile: { id?: string } | undefined; // public profile page
   ProfileSelf: undefined;
  Messages: { studentId?: string } | undefined;
  Settings: undefined;
  SettingsCreate: undefined;
  SettingsManage: undefined;
  SettingsAccount?: undefined;

  /* Payments */
  BuyTokens: undefined;

  /* Results */
  Results: { courseId?: string; courseTitle?: string; grade?: { scorePct: number; passMark: number; passed: boolean } } | undefined;

};

