import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { Alert } from 'react-native';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await fetchUser(session.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        await fetchUser(session.user.id);
      } else {
        setUser(null);
        setUserRole(null);
        setIsSuspended(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      // Check if user is suspended
      if (data?.is_suspended) {
        console.log('User is suspended:', data.email);
        setIsSuspended(true);
        
        // Sign out suspended users
        await supabase.auth.signOut();
        setUser(null);
        setUserRole(null);
      } else {
        setUser(data);
        setUserRole(data.role);
        setIsSuspended(false);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // After successful sign in, fetch user to check suspension
      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) throw userError;

        // Check if user is suspended
        if (userData?.is_suspended) {
          // Sign out immediately
          await supabase.auth.signOut();
          return { 
            success: false, 
            error: 'ACCOUNT_SUSPENDED',
            userData: {
              name: userData.name,
              email: userData.email,
              role: userData.role,
              suspendedAt: userData.updated_at
            }
          };
        }
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (name: string, email: string, phone: string, password: string) => {
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name,
          email,
          phone,
          role: 'business', // Default to business for signup
          created_at: new Date().toISOString(),
          is_suspended: false, // New users are not suspended
        });

      if (profileError) throw profileError;

      return { success: true, user: authData.user };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setUserRole(null);
      setIsSuspended(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, ...updates });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return {
    user: user?.id ? user : null,
    isLoading,
    userRole,
    isSuspended, // Export this so screens can show modals
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser: () => user && fetchUser(user.id),
  };
}