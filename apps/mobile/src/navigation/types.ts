// apps/mobile/src/navigation/types.ts
export type MainStackParamList = {
  Home:          undefined
  Login:         undefined
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
