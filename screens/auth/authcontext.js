import 'react-native-url-polyfill/auto';
import React, { createContext, useContext, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace these with your new Supabase project credentials
const supabaseUrl = "https://zkojmfnmjqqvbrtbteyu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2ptZm5tanFxdmJydGJ0ZXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMTg0MjIsImV4cCI6MjA2Mjc5NDQyMn0.uXfP4z5Z-5PikE84xwEUXP9BqIgt1sZXl_-mvz7n_ZE";

// Initialize Supabase client with storage configuration
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    codeChallengeMethod: 'plain',
    emailAuth: {
      requireVerification: false
    }
  },
});

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpLoading, setOtpLoading] = useState(false);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ id: userId, credits: 10 }])
            .select()
            .single();

          if (createError) throw createError;
          setUserProfile(newProfile);
          return newProfile;
        }
        throw error;
      }

      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching/creating profile:', error.message);
      return null;
    }
  };

  // Sign in with email OTP
  const signInWithOtp = async (email) => {
    try {
      setOtpLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          type: 'otp',
          channel: 'email',
          emailRedirectTo: null
        }
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error sending OTP:', error.message);
      return { error };
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP code
  const verifyOtp = async (email, token) => {
    try {
      setOtpLoading(true);
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });
      
      if (error) throw error;
      
      if (data?.user) {
        await fetchUserProfile(data.user.id);
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error verifying OTP:', error.message);
      return { data: null, error };
    } finally {
      setOtpLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      // Immediately clear user state
      setUser(null);
      setUserProfile(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check for existing session on mount
  React.useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchUserProfile(currentUser.id);
        }
      }
      
      setLoading(false);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchUserProfile(currentUser.id);
      }
    } catch (error) {
      console.error('Error checking auth state:', error.message);
      // Clear user state on error
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    otpLoading,
    supabase,
    setUser,
    fetchUserProfile,
    signInWithOtp,
    verifyOtp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };
export default AuthProvider;
