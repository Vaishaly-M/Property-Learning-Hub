// services/PasswordService.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface PasswordResetResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    reset_url?: string;
    [key: string]: any;
  };
}

export interface TokenValidationResponse {
  valid: boolean;
  message: string;
  code?: string;
  data?: {
    email?: string;
    expires_at?: string;
    expires_in_minutes?: number;
  };
}

export interface PasswordStrengthResponse {
  valid: boolean;
  strength: string;
  score: string;
  percentage: number;
  requirements: {
    hasMinLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

class PasswordService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  async forgotPassword(email: string): Promise<PasswordResetResponse> {
    try {
      const response = await this.api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to send reset link');
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  async validateToken(token: string, email: string): Promise<TokenValidationResponse> {
    try {
      const response = await this.api.post('/auth/validate-token', { token, email });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return {
          valid: false,
          message: error.response.data.message || 'Token validation failed'
        };
      }
      return {
        valid: false,
        message: 'Network error. Please check your connection.'
      };
    }
  }

  async validateTokenComprehensive(token: string, email: string): Promise<TokenValidationResponse> {
    try {
      const response = await this.api.post('/auth/validate-token-comprehensive', { token, email });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return {
        valid: false,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR'
      };
    }
  }

  async resetPassword(token: string, email: string, password: string, confirmPassword: string): Promise<PasswordResetResponse> {
    try {
      const response = await this.api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirmPassword
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Password reset failed');
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  async checkPasswordStrength(password: string): Promise<PasswordStrengthResponse> {
    try {
      const response = await this.api.post('/auth/check-password-strength', { password });
      return response.data;
    } catch (error: any) {
      throw new Error('Unable to check password strength');
    }
  }
}

export const passwordService = new PasswordService();