export default ({ config }) => ({
  ...config,
  name: "MyTutor Mobile",
  slug: "mobile",
  platforms: ["ios", "android"],
  entryPoint: "./index.tsx",
  android: {
    package: "com.paulmbugua2.mytutorapp"
  },
  ios: {
    bundleIdentifier: "com.paulmbugua2.mytutorapp"
  },
  extra: {
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:4000"
  }
});
