import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getUnifiedBackendUrl = (): string => {
  let envUrl = "";
  console.log("Platform:", Platform.OS);

  // Try using process.env if available (for example, when using Vite on web)
  if (typeof process !== "undefined" && process.env && process.env.BACKEND_URL) {
    envUrl = process.env.BACKEND_URL;
    console.log("Using process.env.BACKEND_URL:", envUrl);
  }

  // On web with bundlers like Vite, you might have import.meta.env defined.
  if (!envUrl && Platform.OS === "web") {
    try {
      envUrl = (eval("import.meta.env.BACKEND_URL") as string) || "";
      console.log("Using import.meta.env.BACKEND_URL:", envUrl);
    } catch (error) {
      console.warn("Could not load BACKEND_URL via import.meta.env", error);
    }
  }

  // Use Expo's Constants from app.json for mobile or as another fallback.
  if (!envUrl && Constants.expoConfig?.extra?.backendUrl) {
    envUrl = Constants.expoConfig.extra.backendUrl as string;
    console.log("Using Constants.expoConfig.extra.backendUrl:", envUrl);
  }

  // Fallback value if nothing else is provided.
  if (!envUrl) {
    envUrl = "http://localhost:4000";
    console.log("Using fallback backendUrl:", envUrl);
  }

  return envUrl;
};

export const getBackendUrl = getUnifiedBackendUrl;
