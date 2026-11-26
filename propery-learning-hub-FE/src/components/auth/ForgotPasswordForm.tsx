'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { passwordService } from '../../services/PasswordService';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const result = await passwordService.forgotPassword(email);
      
      if (result.status === 'success') {
        setSuccess(true);
        // In development, show the reset link for testing
        if (result.data?.reset_url) {
          setResetLink(result.data.reset_url);
        }
        
        // Clear the form
        setEmail('');
      } else {
        setError(result.message || 'Failed to send reset link');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">

      {/* Success Message */}
      {success ? (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-green-800 font-semibold text-lg">Check your email!</h3>
                <p className="text-green-700 mt-2">
                  We've sent a password reset link to <strong>{email}</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-gray-600">
                Didn't receive the email?
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setError('');
                  }}
                  className="text-blue-900 hover:text-blue-800 font-medium underline"
                >
                  Resend reset link
                </button>
                <span className="text-gray-400 hidden sm:inline">•</span>
                <Link 
                  href="/login" 
                  className="text-blue-900 hover:text-blue-800 font-medium underline"
                >
                  Return to login
                </Link>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-gray-500 text-sm">
                Still having trouble? Check your spam folder or contact support.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-2">
            <h2 className="text-xl font-bold text-blue-900">Forgot Password?</h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Unable to send reset link</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-blue-900 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-900 transition-colors" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 outline-none transition-all"
                    placeholder="Enter your email address"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white py-3.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending reset link...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Reset Link
                </>
              )}
            </button>

            {/* Additional Info */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                Remember your password?{' '}
                <Link 
                  href="/login" 
                  className="text-blue-900 hover:text-blue-800 font-medium underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ForgotPasswordForm;