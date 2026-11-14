import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Mismo proyecto Supabase que la página web. La clave publishable no es secreta
// (es la misma que usa el navegador); los permisos los controla la base de datos.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kxldsjodgfonrrlwjbws.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_J5s_2YqtASIYSqu2k00SGA_copdr39x';

export const supabase = createClient(url, key, {
  auth: {
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
