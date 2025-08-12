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
  Profile: undefined | { id?: string }
  Messages:      { studentId?: string }
  Settings:        undefined
  SettingsCreate:  undefined
  SettingsManage:  undefined
  SettingsAccount: undefined
  CookiePolicy:    undefined
  BuyTokens:       undefined
  FindTutor: undefined
   Learn: undefined  
}

