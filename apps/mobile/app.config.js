/* eslint-env node */
/* global process */

import dotenv from 'dotenv';
dotenv.config();

export default ({ config }) => ({
  ...config,
  name: "myTutorApp",
  slug: "mobile",
  platforms: ["ios", "android"],
   entryPoint: "./src/index.tsx",
  android: {
    package: "com.paulmbugua2.mytutorapp"
  },
  ios: {
    bundleIdentifier: "com.paulmbugua2.mytutorapp"
  },
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "https://localhost:4000",
    eas: {
      projectId: "f9e88ea7-6ab8-4385-84a7-dc06feb64bca"
    }
  }
});
