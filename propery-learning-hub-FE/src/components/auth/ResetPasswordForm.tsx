'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Lock, Eye, EyeOff, Check, AlertCircle, 
  ArrowLeft, CheckCircle, Shield, Key 
} from 'lucide-react';
import { passwordService } from '../../services/PasswordService';

const ResetPasswordForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    token: token || '',
    email: email || ''
  });

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !email) {
        setError('Invalid reset link. Please request a new password reset.');
        setValidating(false);
        setTokenValid(false);
        return;
      }

      try {
        // Use comprehensive validation from PasswordService
        const result = await passwordService.validateTokenComprehensive(token, email);
        
        if (result.valid) {
          setTokenValid(true);
          setFormData(prev => ({ 
            ...prev, 
            token: token,
            email: email
          }));
        } else {
          setError(result.message || 'This reset link is invalid or has expired.');
          setTokenValid(false);
        }
      } catch (err: any) {
        setError('Unable to validate reset link. Please request a new one.');
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token, email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setPasswordStrength({
        hasMinLength: value.length >= 8,
        hasUpperCase: /[A-Z]/.test(value),
        hasLowerCase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value)
      });
    }
  };

  const isFormValid = () => {
    return (
      formData.password.trim() !== '' &&
      formData.confirmPassword.trim() !== '' &&
      formData.password === formData.confirmPassword &&
      Object.values(passwordStrength).every(Boolean)
    );
  };

  const calculatePasswordStrength = () => {
    const requirementsMet = Object.values(passwordStrength).filter(Boolean).length;
    return (requirementsMet / 5) * 100;
  };

  const getPasswordStrengthText = () => {
    const strength = calculatePasswordStrength();
    if (strength === 0) return 'Enter password';
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Fair';
    if (strength < 90) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = () => {
    const strength = calculatePasswordStrength();
    if (strength < 40) return 'bg-red-500';
    if (strength < 70) return 'bg-yellow-500';
    if (strength < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tokenValid) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!Object.values(passwordStrength).every(Boolean)) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);

    try {
      const result = await passwordService.resetPassword(
        formData.token,
        formData.email,
        formData.password,
        formData.confirmPassword
      );

      if (result.status === 'success') {
        setSuccess(true);
        // Clear form
        setFormData({ password: '', confirmPassword: '', token: '', email: '' });
        
        // Redirect after 3 seconds
        setTimeout(() => {
          router.push('/login?reset=success');
        }, 3000);
      } else {
        setError(result.message || 'Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="w-full text-center py-12">
        <div className="inline-block w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-blue-900 font-medium">Verifying reset link...</p>
        <p className="text-gray-600 text-sm mt-2">Please wait while we validate your reset link.</p>
      </div>
    );
  }

  if (!tokenValid && !validating) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <Link href="/forgot-password" className="inline-flex items-center gap-2 text-blue-900 hover:text-blue-800 font-medium">
            <ArrowLeft className="w-4 h-4" /> Request New Link
          </Link>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-red-800 font-bold text-xl mb-2">Invalid Reset Link</h3>          
          <div className="mt-6">
            <Link
              href="/forgot-password"
              className="inline-block bg-blue-900 hover:bg-blue-800 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Back to login */}
      <div className="mb-6">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-blue-900 hover:text-blue-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 
          Back to login
        </Link>
      </div>

      {success ? (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-green-800 font-bold text-xl mb-2">Password Reset Successful!</h3>
                <p className="text-green-700 mb-4">
                  Your password has been successfully updated. You can now log in with your new password.
                </p>
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Redirecting to login...</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-blue-900 hover:text-blue-800 font-medium underline"
            >
              Go to login now
            </Link>
          </div>
        </div>
      ) : (
        <>
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Unable to reset password</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-900 mb-2">
                New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-900 transition-colors" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-10 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 outline-none transition-all"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-900 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-blue-900 font-medium">Password Strength</span>
                      <span className={`font-medium ${
                        calculatePasswordStrength() < 40 ? 'text-red-600' :
                        calculatePasswordStrength() < 70 ? 'text-yellow-600' :
                        calculatePasswordStrength() < 90 ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getStrengthColor()} transition-all duration-300`}
                        style={{ width: `${calculatePasswordStrength()}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Password Requirements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {[
                      { key: 'hasMinLength', text: 'At least 8 characters' },
                      { key: 'hasUpperCase', text: 'One uppercase letter' },
                      { key: 'hasLowerCase', text: 'One lowercase letter' },
                      { key: 'hasNumber', text: 'One number' },
                      { key: 'hasSpecialChar', text: 'One special character', colSpan: 'col-span-2 sm:col-span-1' }
                    ].map((req) => (
                      <div 
                        key={req.key}
                        className={`flex items-center gap-2 ${passwordStrength[req.key as keyof typeof passwordStrength] ? 'text-green-600' : 'text-gray-500'}`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          passwordStrength[req.key as keyof typeof passwordStrength] 
                            ? 'bg-green-100' 
                            : 'bg-gray-100'
                        }`}>
                          {passwordStrength[req.key as keyof typeof passwordStrength] && (
                            <Check className="w-3 h-3" />
                          )}
                        </div>
                        <span className="text-sm">{req.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-900 mb-2">
                Confirm New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-900 transition-colors" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-10 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 outline-none transition-all"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-900 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {/* Password match indicator */}
              {formData.password && formData.confirmPassword && (
                <div className={`mt-2 flex items-center gap-2 text-sm ${
                  formData.password === formData.confirmPassword 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <Check className="w-4 h-4" />
                      Passwords match
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Passwords do not match
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="w-full bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white py-3.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating password...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Reset Password
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default ResetPasswordForm;