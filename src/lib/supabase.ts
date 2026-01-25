import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cookie Helpers
export const setCookie = (name: string, value: string, days: number = 30) => {
  // Sanitize value by encoding
  const sanitizedValue = encodeURIComponent(value);
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  const secure = window.location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${name}=${sanitizedValue};expires=${expires.toUTCString()};path=/;SameSite=Strict${secure}`;
};

export const getCookie = (name: string) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length);
      return decodeURIComponent(value);
    }
  }
  return null;
};

export const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  // Also clear localStorage to prevent stale data
  localStorage.removeItem(name);
};

// Renew cookie expiration (call on navigation/activity)
export const renewCookie = (name: string) => {
  const value = getCookie(name);
  if (value) {
    setCookie(name, value, 30); // Reset to 30 days
  }
};
