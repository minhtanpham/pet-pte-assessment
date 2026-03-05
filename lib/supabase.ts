import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import "react-native-url-polyfill/auto";

// Replace these with your Supabase project URL and anon key
const SUPABASE_URL = "https://mszxtnjxhuounxcwrpvi.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zenh0bmp4aHVvdW54Y3dycHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjkwODQsImV4cCI6MjA4ODMwNTA4NH0.Th_P-HUQzDgUBz33iwGB_N9qet6NLxfWwu-x1aTheo4";

// SecureStore adapter so Supabase session is persisted securely
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
