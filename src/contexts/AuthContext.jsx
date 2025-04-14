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

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post('https://project-final-a377.onrender.com/api/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success('Successfully signed in!');
      navigate('/');
    } catch (error) {
      toast.error('Failed to sign in. Please check your credentials.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, name) => {
    try {
      setLoading(true);
      const response = await axios.post('https://project-final-a377.onrender.com/api/auth/register', {
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
      toast.error('Failed to sign up. Please try again.');
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
      await axios.post('https://project-final-a377.onrender.com/api/auth/reset-password', { email });
      toast.success('Password reset instructions sent to your email!');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to reset password. Please try again.');
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