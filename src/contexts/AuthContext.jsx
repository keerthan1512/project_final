import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://project-final-u2ba.onrender.com';
  const apiClient = axios.create({ baseURL: API_BASE_URL });

  const signIn = async (email, password, token2fa = null) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
        token2fa,
      });

      if (response.data.requires2FA) {
        toast.info('Please enter your 2FA code');
        return { requires2FA: true };
      }

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success('Successfully signed in!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to sign in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, name) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/api/auth/register', {
        email,
        password,
        name,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success('Successfully signed up!');
      navigate('/');
    } catch (error) {
      const userMessage = error.response?.data?.message || 'Failed to sign up. Please try again.';
      toast.error(userMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
    toast.success('Successfully signed out!');
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      await apiClient.post('/api/auth/reset-password', { email });
      toast.success('Password reset instructions sent to your email!');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to reset password. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setup2FA = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await apiClient.post(
        '/api/auth/2fa/setup',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      toast.error('Failed to setup 2FA');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async (token) => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('token');
      await apiClient.post(
        '/api/auth/2fa/verify',
        { token },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const updatedUser = { ...user, isTwoFactorEnabled: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('2FA enabled successfully!');
    } catch (error) {
      toast.error('Failed to verify 2FA code');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await apiClient.post(
        '/api/auth/2fa/disable',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const updatedUser = { ...user, isTwoFactorEnabled: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('2FA disabled successfully!');
    } catch (error) {
      toast.error('Failed to disable 2FA');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        setup2FA,
        verify2FA,
        disable2FA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}