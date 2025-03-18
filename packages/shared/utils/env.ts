// packages/shared/utils/env.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getUnifiedBackendUrl = (): string => {
  // Try using process.env if available (for example, when using Vite on web)
  let envUrl = "";
  if (typeof process !== "undefined" && process.env && process.env.BACKEND_URL) {
    envUrl = process.env.BACKEND_URL;
  }
  // On web with bundlers like Vite, you might have import.meta.env defined.
  if (!envUrl && Platform.OS === "web") {
    try {
      // Use a fallback environment variable name. Adjust if needed.
      envUrl = (eval("import.meta.env.BACKEND_URL") as string) || "";
    } catch (error) {
      console.warn("Could not load BACKEND_URL via import.meta.env", error);
    }
  }
  // Use Expo's Constants from app.json for mobile or as another fallback.
  if (!envUrl && Constants.expoConfig?.extra?.backendUrl) {
    envUrl = Constants.expoConfig.extra.backendUrl as string;
  }
  // Fallback value if nothing else is provided.
  if (!envUrl) {
    envUrl = "http://localhost:4000";
  }
  return envUrl;
};

export const getBackendUrl = getUnifiedBackendUrl;
