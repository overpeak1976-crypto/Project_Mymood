
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

import { AppState } from 'react-native';

// 🚨 ดึงค่าจาก .env (ต้องมี EXPO_PUBLIC_ นำหน้านะ)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. This prevents network requests and session locks from hanging.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});