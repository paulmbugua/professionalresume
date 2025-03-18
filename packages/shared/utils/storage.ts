import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    } else {
      return await AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    } else {
      await AsyncStorage.removeItem(key);
    }
  },
};
