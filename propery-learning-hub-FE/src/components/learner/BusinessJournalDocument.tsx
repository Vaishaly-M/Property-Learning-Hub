// components/learner/BusinessJournalDocument.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  File, Plus, Eye, Edit2, Trash2, X, Download, FileText,
  Search, User, Share2, LayoutTemplate, ChevronDown, ChevronRight,
  Sparkles, PenTool, Target, Users, Building2, Lightbulb,
  List, Grid, Save, Box, Loader2, AlertCircle, Settings,
  CheckCircle, AlertTriangle, Info, FileSignature, Mail
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as journalApi from '@/services/businessJournalApi';
import { AGREEMENT_TEMPLATES } from './agreementTemplates';

// Email validation function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Batch validate emails
const validateEmails = (emails: string[]): { valid: string[]; invalid: string[] } => {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  emails.forEach(email => {
    if (email.trim() && isValidEmail(email)) {
      valid.push(email.trim());
    } else if (email.trim()) {
      invalid.push(email.trim());
    }
  });
  
  return { valid, invalid };
};

// Custom CSS for Quill editor to fix text color and spacing
const quillStyles = `
  .ql-editor {
    color: #000000 !important;
    font-family: 'Georgia', 'Times New Roman', serif !important;
    font-size: 14px !important;
    line-height: 1.8 !important;
    padding: 20px !important;
  }
  .ql-editor * {
    color: #000000 !important;
  }
  .ql-editor h1 {
    font-size: 22px !important;
    font-weight: 700 !important;
    color: #000000 !important;
    margin: 24px 0 16px 0 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
  }
  .ql-editor h2 {
    font-size: 17px !important;
    font-weight: 700 !important;
    color: #000000 !important;
    margin: 34px 0 14px 0 !important;
    border-bottom: 2px solid #cbd5e0 !important;
    padding-bottom: 8px !important;
  }
  .ql-editor h3 {
    font-size: 15px !important;
    font-weight: 700 !important;
    color: #000000 !important;
    margin: 28px 0 12px 0 !important;
  }
  .ql-editor h4 {
    font-size: 14px !important;
    font-weight: 700 !important;
    color: #000000 !important;
    margin: 22px 0 10px 0 !important;
  }
  .ql-editor p {
    color: #000000 !important;
    margin: 12px 0 !important;
    text-align: justify !important;
    line-height: 1.8 !important;
    word-wrap: break-word !important;
    word-break: normal !important;
    overflow-wrap: break-word !important;
  }
  .ql-editor ul {
    margin: 12px 0 18px 0 !important;
    padding-left: 28px !important;
  }
  .ql-editor ol {
    margin: 12px 0 18px 0 !important;
    padding-left: 28px !important;
  }
  .ql-editor li {
    color: #000000 !important;
    margin-bottom: 8px !important;
    line-height: 1.8 !important;
    word-wrap: break-word !important;
    word-break: normal !important;
    overflow-wrap: break-word !important;
  }
  .ql-editor strong {
    font-weight: 700 !important;
    color: #000000 !important;
  }
  .ql-editor b {
    font-weight: 700 !important;
    color: #000000 !important;
  }
  .ql-editor table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 16px 0 20px 0 !important;
  }
  .ql-editor th,
  .ql-editor td {
    border: 1px solid #cbd5e0 !important;
    padding: 10px 12px !important;
    text-align: left !important;
    color: #000000 !important;
  }
  .ql-editor th {
    background: #f7fafc !important;
    font-weight: 600 !important;
  }
  .ql-editor .ql-align-center {
    text-align: center !important;
  }
  .ql-editor .ql-align-right {
    text-align: right !important;
  }
  .ql-editor .ql-align-justify {
    text-align: justify !important;
  }
  .ql-toolbar {
    border-top-left-radius: 8px !important;
    border-top-right-radius: 8px !important;
  }
  .ql-container {
    border-bottom-left-radius: 8px !important;
    border-bottom-right-radius: 8px !important;
    min-height: 300px !important;
  }
`;

const formatDocumentContent = (htmlContent: string, documentTitle: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${documentTitle || 'Document'}</title>
        <style>
          /* Reset and base styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            width: 100%;
            overflow-x: hidden;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            background: #ffffff;
            padding: 30px 45px 80px 45px;
            margin: 0;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
            color: #000000 !important;
          }
          
          .document-wrapper {
            max-width: 210mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 0;
            width: 100%;
            overflow: visible;
          }
          
          /* Header styles */
          .document-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 30px 16px 30px;
            margin-bottom: 28px;
            border-bottom: 3px solid #1a365d;
            background: #ffffff;
            width: 100%;
            flex-wrap: wrap;
            gap: 10px;
          }
          
          .header-left {
            display: flex;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
          }
          
          .logo-container {
            background: #0c2069;
            padding: 10px 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .logo-container img {
            display: block;
            width: 32px;
            height: 32px;
            object-fit: contain;
          }
          
          .logo-text {
            color: #ffffff;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.5px;
            font-family: 'Arial', sans-serif;
          }
          
          .header-right {
            text-align: right;
          }
          
          .header-title {
            font-size: 14px;
            font-weight: 600;
            color: #1a365d;
            font-family: 'Arial', sans-serif;
          }
          
          .header-date {
            font-size: 11px;
            color: #718096;
            font-family: 'Arial', sans-serif;
            margin-top: 2px;
          }
          
          /* Content styles - NO WORD BREAKING */
          .document-content {
            padding: 0 35px 120px 35px;
            margin: 0;
            width: 100%;
            max-width: 100%;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: normal !important;
            hyphens: none !important;
            color: #000000 !important;
          }
          
          .document-content * {
            max-width: 100%;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: normal !important;
            hyphens: none !important;
            color: #000000 !important;
          }
          
          .document-content h1 {
            text-align: center;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin: 0 0 16px 0;
            text-transform: uppercase;
            color: #000000 !important;
            font-family: 'Georgia', serif;
            padding: 0;
            max-width: 100%;
            word-break: normal !important;
            hyphens: none !important;
          }
          
          .document-content .subtitle {
            text-align: center;
            font-style: italic;
            color: #333333 !important;
            font-size: 13px;
            margin: 0 0 10px 0;
            font-family: 'Georgia', serif;
          }
          
          .document-content .notice {
            text-align: center;
            font-style: italic;
            color: #4a4a4a !important;
            font-size: 12px;
            margin: 0 0 24px 0;
            font-family: 'Georgia', serif;
          }
          
          .document-content .dated {
            font-size: 13px;
            margin-bottom: 22px;
            font-family: 'Georgia', serif;
            color: #000000 !important;
          }
          
          .document-content h2 {
            font-size: 17px;
            font-weight: 700 !important;
            color: #000000 !important;
            margin: 34px 0 14px 0;
            border-bottom: 2px solid #cbd5e0;
            padding: 0 0 8px 0;
            font-family: 'Georgia', serif;
            max-width: 100%;
            word-break: normal !important;
            hyphens: none !important;
          }
          
          .document-content h3 {
            font-size: 15px;
            font-weight: 700 !important;
            color: #000000 !important;
            margin: 28px 0 12px 0;
            font-family: 'Georgia', serif;
            max-width: 100%;
            word-break: normal !important;
            hyphens: none !important;
          }
          
          .document-content h4 {
            font-size: 14px;
            font-weight: 700 !important;
            color: #000000 !important;
            margin: 22px 0 10px 0;
            font-family: 'Georgia', serif;
            max-width: 100%;
            word-break: normal !important;
            hyphens: none !important;
          }
          
          .document-content p {
            font-size: 13px;
            margin: 12px 0;
            text-align: justify;
            line-height: 1.75;
            color: #000000 !important;
            font-family: 'Georgia', serif;
            padding: 0;
            max-width: 100%;
            word-break: normal !important;
            hyphens: none !important;
            overflow-wrap: break-word;
            word-wrap: break-word;
          }
          
          .document-content ul {
            margin: 12px 0 18px 0;
            padding-left: 28px;
            max-width: 100%;
          }
          
          .document-content ol {
            margin: 12px 0 18px 0;
            padding-left: 28px;
            max-width: 100%;
          }
          
          .document-content li {
            font-size: 13px;
            margin-bottom: 8px;
            text-align: justify;
            line-height: 1.75;
            color: #000000 !important;
            font-family: 'Georgia', serif;
            max-width: 100%;
            word-break: normal !important;
            hyphens: none !important;
            overflow-wrap: break-word;
            word-wrap: break-word;
          }
          
          .document-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0 20px 0;
            font-size: 13px;
            max-width: 100%;
          }
          
          .document-content th,
          .document-content td {
            border: 1px solid #cbd5e0;
            padding: 10px 12px;
            text-align: left;
            font-family: 'Georgia', serif;
            color: #000000 !important;
            max-width: 100%;
            word-break: normal !important;
            hyphens: none !important;
          }
          
          .document-content th {
            background: #f7fafc;
            font-weight: 600;
          }
          
          .document-content .sig {
            margin: 24px 0 8px 0;
            font-size: 13px;
            font-family: 'Georgia', serif;
            color: #000000 !important;
          }
          
          .document-content .note {
            font-size: 12px;
            color: #4a4a4a !important;
            font-style: italic;
            margin: 10px 0 18px 0;
            font-family: 'Georgia', serif;
          }
          
          .document-content strong {
            font-weight: 700 !important;
            color: #000000 !important;
          }
          
          .document-content b {
            font-weight: 700 !important;
            color: #000000 !important;
          }
          
          .document-content img {
            max-width: 100%;
            height: auto;
          }
          
          .document-content div {
            max-width: 100%;
            word-break: normal !important;
            hyphens: none !important;
            overflow-wrap: break-word;
            word-wrap: break-word;
          }

          /* Page break handling */
          .document-content {
            page-break-after: avoid;
          }
          
          .document-content h1,
          .document-content h2,
          .document-content h3,
          .document-content h4 {
            page-break-after: avoid;
          }
          
          .document-content table {
            page-break-inside: avoid;
          }
          
          .document-content ul,
          .document-content ol {
            page-break-inside: avoid;
          }
          
          /* keeps the tail of the document from being clipped */
          .document-bottom-spacer {
            height: 100px;
            width: 100%;
          }
          
          /* Footer */
          .document-footer {
            margin-top: 34px;
            padding: 16px 40px 30px 40px;
            border-top: 2px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #a0aec0;
            font-family: 'Arial', sans-serif;
            width: 100%;
            flex-wrap: wrap;
            gap: 5px;
          }
          
          /* Print-specific styles */
          @media print {
            html, body {
              width: 100%;
              overflow-x: hidden;
              margin: 0;
              padding: 0;
            }
            
            body {
              padding: 15px 25px 50px 25px;
              background: #ffffff;
              width: 100%;
            }
            
            .document-wrapper {
              max-width: 100%;
              padding: 0;
              width: 100%;
            }
            
            .document-content {
              padding: 0 15px 100px 15px;
            }
            
            .document-bottom-spacer {
              height: 80px;
            }
            
            .page-break {
              page-break-before: always;
              border-top: none;
              margin-top: 0;
              padding-top: 0;
            }
            
            .document-content h1,
            .document-content h2,
            .document-content h3,
            .document-content h4 {
              page-break-after: avoid;
            }
            
            .document-content table {
              page-break-inside: avoid;
            }
            
            .document-content ul,
            .document-content ol {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="document-wrapper">
          <!-- Header -->
          <div class="document-header">
            <div class="header-left">
              <div class="logo-container">
                <img src="/logo.jpeg" alt="Freedom Property Education" />
                <span class="logo-text">FREEDOM PROPERTY</span>
              </div>
            </div>
            <div class="header-right">
              <div class="header-title">${documentTitle || 'Document'}</div>
              <div class="header-date">Generated: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>
          
          <!-- Content -->
          <div class="document-content">
            ${htmlContent}
          </div>

          <!-- Spacer so the last line/signature isn't cut by page slicing -->
          <div class="document-bottom-spacer"></div>
          
          <!-- Footer -->
          <div class="document-footer">
            <span>${documentTitle || 'Document'}</span>
            <span>Confidential</span>
          </div>
        </div>
      </body>
    </html>
  `;
};

const ReactQuill = dynamic(
  () => import('react-quill-new'),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  }
);

import 'react-quill-new/dist/quill.snow.css';

// ==================== TOAST COMPONENT ====================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

const ToastNotification: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 4000);
    
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div 
      className={`transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`rounded-xl border p-4 shadow-lg max-w-md w-full ${getColors()}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm">
              {toast.title}
            </h4>
            <p className="text-sm text-gray-600 mt-0.5">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(toast.id), 300);
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Container
const ToastContainer: React.FC<{ toasts: Toast[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md w-full pointer-events-none">
      <div className="space-y-3 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );
};

// Hook for toast management
const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, title: string, message: string, duration?: number) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return {
    toasts,
    showToast,
    removeToast,
    success: (title: string, message: string, duration?: number) => showToast('success', title, message, duration),
    error: (title: string, message: string, duration?: number) => showToast('error', title, message, duration),
    warning: (title: string, message: string, duration?: number) => showToast('warning', title, message, duration),
    info: (title: string, message: string, duration?: number) => showToast('info', title, message, duration),
  };
};

// Template Types
interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  sections: TemplateSection[];
  defaultQuestions: TemplateQuestion[];
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
  type?: 'form' | 'document';
  content?: string;
}

interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  questions: TemplateQuestion[];
}

interface TemplateQuestion {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'richtext' | 'table' | 'list';
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  defaultValue?: string;
  sectionId?: string;
}

interface Document extends journalApi.Document {}

// ==================== TEMPLATE DEFINITIONS ====================

// Helper function to get icon by template ID
const AGREEMENT_TEMPLATE_IDS = new Set([
  'company-let-agreement-v2',
  'company-let-agreement-v1',
  'guest-utilities-disclaimer',
  'non-circumvention-non-competition',
  'nda-sa-sourcing',
  'guest-agreement-house-rules',
  'sourcing-agreement-r2r-r2sa',
  'sa-management-agreement',
]);

const getTemplateIcon = (templateId: string, customIcon?: string) => {
  if (AGREEMENT_TEMPLATE_IDS.has(templateId)) {
    return <FileSignature className="w-5 h-5" />;
  }
  switch(templateId) {
    case 'simple-business-plan':
      return <FileText className="w-5 h-5" />;
    case 'service-business-plan':
      return <Users className="w-5 h-5" />;
    case 'product-business-plan':
      return <Box className="w-5 h-5" />;
    case 'real-estate-business-plan':
      return <Building2 className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
};

const BUSINESS_TEMPLATES: Template[] = [
  {
    id: 'simple-business-plan',
    name: 'Simple Business Plan',
    description: 'One-page business plan template with timeline',
    icon: <FileText className="w-5 h-5" />,
    type: 'form',
    sections: [
      {
        id: 'overview',
        title: 'Business Overview',
        questions: [
          { id: 'vision', text: 'What is your business vision?', type: 'textarea', placeholder: 'Describe your long-term vision...' },
          { id: 'mission', text: 'What is your mission?', type: 'textarea', placeholder: 'Define your mission...' },
          { id: 'product', text: 'What product/service do you provide?', type: 'textarea', placeholder: 'Describe your offering...' },
        ]
      },
      {
        id: 'market',
        title: 'Market Analysis',
        questions: [
          { id: 'target', text: 'Who is your target audience?', type: 'textarea', placeholder: 'Describe your ideal customer...' },
          { id: 'problem', text: 'What problem are you solving?', type: 'textarea', placeholder: 'Define the problem...' },
          { id: 'competitors', text: 'Who are your top competitors?', type: 'textarea', placeholder: 'List key competitors...' },
          { id: 'advantage', text: 'What is your competitive advantage?', type: 'textarea', placeholder: 'Define your edge...' },
        ]
      },
      {
        id: 'marketing',
        title: 'Marketing & Sales',
        questions: [
          { id: 'channels', text: 'What marketing channels will you use?', type: 'textarea', placeholder: 'List channels...' },
          { id: 'materials', text: 'What marketing materials do you need?', type: 'textarea', placeholder: 'List materials...' },
          { id: 'pricing', text: 'What is your pricing strategy?', type: 'textarea', placeholder: 'Describe pricing...' },
          { id: 'distribution', text: 'What distribution channels will you use?', type: 'textarea', placeholder: 'List channels...' },
        ]
      },
      {
        id: 'objectives',
        title: 'Key Objectives & Success Metrics',
        questions: [
          { id: 'objectives', text: 'What are your key objectives?', type: 'list', placeholder: 'List objectives and metrics...' },
        ]
      }
    ],
    defaultQuestions: [
      { id: 'vision', text: 'What is your business vision?', type: 'textarea' },
      { id: 'mission', text: 'What is your mission?', type: 'textarea' },
      { id: 'product', text: 'What product/service do you provide?', type: 'textarea' },
      { id: 'target', text: 'Who is your target audience?', type: 'textarea' },
      { id: 'problem', text: 'What problem are you solving?', type: 'textarea' },
      { id: 'competitors', text: 'Who are your top competitors?', type: 'textarea' },
      { id: 'advantage', text: 'What is your competitive advantage?', type: 'textarea' },
      { id: 'channels', text: 'What marketing channels will you use?', type: 'textarea' },
      { id: 'materials', text: 'What marketing materials do you need?', type: 'textarea' },
      { id: 'pricing', text: 'What is your pricing strategy?', type: 'textarea' },
      { id: 'distribution', text: 'What distribution channels will you use?', type: 'textarea' },
      { id: 'objectives', text: 'What are your key objectives and success metrics?', type: 'list' },
    ]
  },
  {
    id: 'service-business-plan',
    name: 'Service Business Plan',
    description: 'One-page business plan for service businesses',
    icon: <Users className="w-5 h-5" />,
    type: 'form',
    sections: [
      {
        id: 'overview',
        title: 'Business Overview',
        questions: [
          { id: 'vision', text: 'What is your vision?', type: 'textarea', placeholder: 'Describe your vision...' },
          { id: 'mission', text: 'What is your mission?', type: 'textarea', placeholder: 'Define your mission...' },
          { id: 'service', text: 'What service do you provide?', type: 'textarea', placeholder: 'Describe your service...' },
        ]
      },
      {
        id: 'market',
        title: 'Market & Competition',
        questions: [
          { id: 'target', text: 'Who is your target market?', type: 'textarea', placeholder: 'Define your target audience...' },
          { id: 'problem', text: 'What problem do you solve?', type: 'textarea', placeholder: 'Describe the problem...' },
          { id: 'competitors', text: 'Who are your competitors?', type: 'textarea', placeholder: 'List competitors...' },
          { id: 'advantage', text: 'What is your competitive advantage?', type: 'textarea', placeholder: 'Define your advantage...' },
        ]
      },
      {
        id: 'operations',
        title: 'Operations & Strategy',
        questions: [
          { id: 'revenue', text: 'What is your revenue model?', type: 'textarea', placeholder: 'Describe revenue streams...' },
          { id: 'marketing', text: 'How will you reach customers?', type: 'textarea', placeholder: 'Marketing strategy...' },
          { id: 'milestones', text: 'What are your key milestones?', type: 'list', placeholder: 'List milestones...' },
        ]
      }
    ],
    defaultQuestions: [
      { id: 'vision', text: 'What is your vision?', type: 'textarea' },
      { id: 'mission', text: 'What is your mission?', type: 'textarea' },
      { id: 'service', text: 'What service do you provide?', type: 'textarea' },
      { id: 'target', text: 'Who is your target market?', type: 'textarea' },
      { id: 'problem', text: 'What problem do you solve?', type: 'textarea' },
      { id: 'competitors', text: 'Who are your competitors?', type: 'textarea' },
      { id: 'advantage', text: 'What is your competitive advantage?', type: 'textarea' },
      { id: 'revenue', text: 'What is your revenue model?', type: 'textarea' },
      { id: 'marketing', text: 'How will you reach customers?', type: 'textarea' },
      { id: 'milestones', text: 'What are your key milestones?', type: 'list' },
    ]
  },
  {
    id: 'product-business-plan',
    name: 'Product Business Plan',
    description: 'One-page business plan for product businesses',
    icon: <Box className="w-5 h-5" />,
    type: 'form',
    sections: [
      {
        id: 'overview',
        title: 'Business Overview',
        questions: [
          { id: 'vision', text: 'What is your vision?', type: 'textarea', placeholder: 'Describe your vision...' },
          { id: 'mission', text: 'What is your mission?', type: 'textarea', placeholder: 'Define your mission...' },
          { id: 'product', text: 'What product do you provide?', type: 'textarea', placeholder: 'Describe your product...' },
        ]
      },
      {
        id: 'market',
        title: 'Market Analysis',
        questions: [
          { id: 'target', text: 'Who is your target audience?', type: 'textarea', placeholder: 'Define your target...' },
          { id: 'problem', text: 'What problem do you solve?', type: 'textarea', placeholder: 'Describe the problem...' },
          { id: 'competitors', text: 'Who are your competitors?', type: 'textarea', placeholder: 'List competitors...' },
          { id: 'advantage', text: 'What is your competitive advantage?', type: 'textarea', placeholder: 'Define your advantage...' },
        ]
      },
      {
        id: 'marketing',
        title: 'Marketing & Sales',
        questions: [
          { id: 'channels', text: 'What marketing channels will you use?', type: 'textarea', placeholder: 'List channels...' },
          { id: 'materials', text: 'What marketing materials do you need?', type: 'textarea', placeholder: 'List materials...' },
          { id: 'pricing', text: 'What is your pricing strategy?', type: 'textarea', placeholder: 'Describe pricing...' },
          { id: 'distribution', text: 'What distribution channels will you use?', type: 'textarea', placeholder: 'List channels...' },
        ]
      },
      {
        id: 'objectives',
        title: 'Key Objectives',
        questions: [
          { id: 'objectives', text: 'What are your key objectives and milestones?', type: 'list', placeholder: 'List objectives...' },
        ]
      }
    ],
    defaultQuestions: [
      { id: 'vision', text: 'What is your vision?', type: 'textarea' },
      { id: 'mission', text: 'What is your mission?', type: 'textarea' },
      { id: 'product', text: 'What product do you provide?', type: 'textarea' },
      { id: 'target', text: 'Who is your target audience?', type: 'textarea' },
      { id: 'problem', text: 'What problem do you solve?', type: 'textarea' },
      { id: 'competitors', text: 'Who are your competitors?', type: 'textarea' },
      { id: 'advantage', text: 'What is your competitive advantage?', type: 'textarea' },
      { id: 'channels', text: 'What marketing channels will you use?', type: 'textarea' },
      { id: 'materials', text: 'What marketing materials do you need?', type: 'textarea' },
      { id: 'pricing', text: 'What is your pricing strategy?', type: 'textarea' },
      { id: 'distribution', text: 'What distribution channels will you use?', type: 'textarea' },
      { id: 'objectives', text: 'What are your key objectives and milestones?', type: 'list' },
    ]
  },
  {
    id: 'real-estate-business-plan',
    name: 'Real Estate Agent Plan',
    description: 'Business plan for real estate agents',
    icon: <Building2 className="w-5 h-5" />,
    type: 'form',
    sections: [
      {
        id: 'overview',
        title: 'Business Overview',
        questions: [
          { id: 'vision', text: 'What is your vision as a real estate agent?', type: 'textarea', placeholder: 'Describe your vision...' },
          { id: 'mission', text: 'What is your mission?', type: 'textarea', placeholder: 'Define your mission...' },
          { id: 'specialty', text: 'What is your specialty or niche?', type: 'textarea', placeholder: 'Describe your specialty...' },
        ]
      },
      {
        id: 'market',
        title: 'Market & Competition',
        questions: [
          { id: 'territory', text: 'What is your target territory?', type: 'textarea', placeholder: 'Define your territory...' },
          { id: 'clients', text: 'Who are your ideal clients?', type: 'textarea', placeholder: 'Describe your ideal clients...' },
          { id: 'competitors', text: 'Who are your top competitors?', type: 'textarea', placeholder: 'List competitors...' },
          { id: 'advantage', text: 'What is your competitive advantage?', type: 'textarea', placeholder: 'Define your advantage...' },
        ]
      },
      {
        id: 'strategy',
        title: 'Strategy & Goals',
        questions: [
          { id: 'marketing', text: 'How will you market yourself?', type: 'textarea', placeholder: 'Describe marketing strategy...' },
          { id: 'goals', text: 'What are your goals and milestones?', type: 'list', placeholder: 'List goals...' },
        ]
      }
    ],
    defaultQuestions: [
      { id: 'vision', text: 'What is your vision as a real estate agent?', type: 'textarea' },
      { id: 'mission', text: 'What is your mission?', type: 'textarea' },
      { id: 'specialty', text: 'What is your specialty or niche?', type: 'textarea' },
      { id: 'territory', text: 'What is your target territory?', type: 'textarea' },
      { id: 'clients', text: 'Who are your ideal clients?', type: 'textarea' },
      { id: 'competitors', text: 'Who are your top competitors?', type: 'textarea' },
      { id: 'advantage', text: 'What is your competitive advantage?', type: 'textarea' },
      { id: 'marketing', text: 'How will you market yourself?', type: 'textarea' },
      { id: 'goals', text: 'What are your goals and milestones?', type: 'list' },
    ]
  },
];

const QUESTION_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'list', label: 'List' },
  { value: 'richtext', label: 'Rich Text' },
];

const BusinessJournalDocument = () => {
  const router = useRouter();
  const { toasts, success, error: showError, warning, info, removeToast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  
  // Templates state - load from localStorage safely
  const [templates, setTemplates] = useState<Template[]>(() => {
    // Start with default templates
    const businessTemplates = BUSINESS_TEMPLATES.map(t => ({
      ...t,
      icon: getTemplateIcon(t.id)
    }));
    
    // Add agreement templates
    const agreementTemplates = AGREEMENT_TEMPLATES.map(t => ({
      ...t,
      icon: getTemplateIcon(t.id),
      type: 'document' as const,
      sections: [],
      defaultQuestions: [],
    }));
    
    const defaultTemplates = [...businessTemplates, ...agreementTemplates];
    
    // Try to load custom templates from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('customTemplates');
        if (saved) {
          const customTemplates = JSON.parse(saved);
          if (Array.isArray(customTemplates) && customTemplates.length > 0) {
            // Reconstruct custom templates with icon
            const reconstructed = customTemplates.map((t: any) => ({
              ...t,
              icon: <FileText className="w-5 h-5" />,
              type: t.type || 'form'
            }));
            return [...defaultTemplates, ...reconstructed];
          }
        }
      } catch (e) {
        console.error('Error loading custom templates:', e);
      }
    }
    return defaultTemplates;
  });
  
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState<Partial<Template>>({
    name: '',
    description: '',
    sections: [],
    defaultQuestions: [],
    type: 'form',
  });

  // UI States
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Form state
  const [documentForm, setDocumentForm] = useState({
    title: '',
    content: '',
    tags: [''],
    sharedWith: [''],
    category: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    templateId: '',
    formData: {} as Record<string, any>,
    customQuestions: [] as TemplateQuestion[]
  });
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingCustomQuestion, setEditingCustomQuestion] = useState<string | null>(null);
  
  const documentRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);

  // Quill modules configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'align', 'list', 'link', 'image'
  ];

  // Save templates to localStorage whenever they change (without icons)
  useEffect(() => {
    try {
      const customTemplates = templates
        .filter(t => t && t.isCustom === true)
        .map(({ icon, ...rest }) => rest); // Remove icon before saving
      if (Array.isArray(customTemplates)) {
        localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
      }
    } catch (e) {
      console.error('Error saving templates:', e);
    }
  }, [templates]);

  // Load documents on mount
  useEffect(() => {
    setIsClient(true);
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const docs = await journalApi.getDocuments();
      setDocuments(docs);
      
    } catch (err: any) {
      console.error('Error loading documents:', err);
      const errorMsg = err?.response?.data?.message || 'Failed to load documents. Please refresh the page.';
      setError(errorMsg);
      showError('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter documents by search
  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query))) ||
      doc.content.toLowerCase().includes(query)
    );
  });

  // ==================== TEMPLATE MANAGEMENT ====================

  const openTemplateManager = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        description: template.description,
        sections: JSON.parse(JSON.stringify(template.sections || [])),
        defaultQuestions: JSON.parse(JSON.stringify(template.defaultQuestions || [])),
        type: template.type || 'form',
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        description: '',
        sections: [],
        defaultQuestions: [],
        type: 'form',
      });
    }
    setShowTemplateManager(true);
  };

  const addTemplateSection = () => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      title: 'New Section',
      questions: [],
    };
    setTemplateForm(prev => ({
      ...prev,
      sections: [...(prev.sections || []), newSection]
    }));
  };

  const removeTemplateSection = (index: number) => {
    setTemplateForm(prev => ({
      ...prev,
      sections: (prev.sections || []).filter((_, i) => i !== index)
    }));
  };

  const updateTemplateSection = (index: number, field: keyof TemplateSection, value: any) => {
    setTemplateForm(prev => {
      const sections = [...(prev.sections || [])];
      sections[index] = { ...sections[index], [field]: value };
      return { ...prev, sections };
    });
  };

  const addTemplateQuestion = (sectionIndex: number) => {
    const newQuestion: TemplateQuestion = {
      id: `q_${Date.now()}`,
      text: 'New Question',
      type: 'textarea',
      placeholder: 'Enter your answer here...',
    };
    setTemplateForm(prev => {
      const sections = [...(prev.sections || [])];
      sections[sectionIndex].questions.push(newQuestion);
      return { ...prev, sections };
    });
  };

  const removeTemplateQuestion = (sectionIndex: number, questionIndex: number) => {
    setTemplateForm(prev => {
      const sections = [...(prev.sections || [])];
      sections[sectionIndex].questions.splice(questionIndex, 1);
      return { ...prev, sections };
    });
  };

  const updateTemplateQuestion = (sectionIndex: number, questionIndex: number, field: keyof TemplateQuestion, value: any) => {
    setTemplateForm(prev => {
      const sections = [...(prev.sections || [])];
      sections[sectionIndex].questions[questionIndex] = {
        ...sections[sectionIndex].questions[questionIndex],
        [field]: value
      };
      return { ...prev, sections };
    });
  };

  // Save custom template
  const saveTemplate = () => {
    if (!templateForm.name) {
      warning('Validation Error', 'Please enter a template name.');
      return;
    }

    const newTemplate: Template = {
      id: editingTemplate?.id || `custom_${Date.now()}`,
      name: templateForm.name || 'Untitled Template',
      description: templateForm.description || '',
      icon: <FileText className="w-5 h-5" />,
      sections: templateForm.sections || [],
      defaultQuestions: templateForm.defaultQuestions || [],
      type: templateForm.type || 'form',
      isCustom: true,
      createdAt: editingTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingTemplate) {
      // Update existing template
      setTemplates(templates.map(t => t.id === editingTemplate.id ? newTemplate : t));
      success('Success', 'Template updated successfully!');
    } else {
      // Add new template
      setTemplates([...templates, newTemplate]);
      success('Success', 'Template created successfully!');
    }

    setShowTemplateManager(false);
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      sections: [],
      defaultQuestions: [],
      type: 'form',
    });
  };

  // Delete custom template
  const deleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template?.isCustom) {
      showError('Error', 'Cannot delete built-in templates.');
      return;
    }
    
    if (confirm(`Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`)) {
      setTemplates(templates.filter(t => t.id !== templateId));
      success('Success', 'Template deleted successfully!');
    }
  };

  // ==================== DOCUMENT CRUD ====================

  const selectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);

    if (template.type === 'document') {
      // Fixed-content agreement template: load its full text straight into the
      // rich-text editor, no Q&A flow.
      setDocumentForm({
        title: template.name,
        content: template.content || '',
        tags: [template.name.toLowerCase().replace(/\s+/g, '-')],
        sharedWith: [''],
        category: template.name,
        status: 'draft',
        templateId: template.id,
        formData: {},
        customQuestions: []
      });
      setExpandedSections(new Set());
      setShowDocumentEditor(true);
      return;
    }

    const initialFormData: Record<string, any> = {};
    template.defaultQuestions.forEach(q => {
      initialFormData[q.id] = q.defaultValue || '';
    });

    setDocumentForm({
      title: template.name,
      content: '',
      tags: [template.name.toLowerCase().replace(/\s+/g, '-')],
      sharedWith: [''],
      category: template.name,
      status: 'draft',
      templateId: template.id,
      formData: initialFormData,
      customQuestions: []
    });

    const allSectionIds = new Set(template.sections.map(s => s.id));
    setExpandedSections(allSectionIds);
    setShowDocumentEditor(true);
  };

  const openDocumentEditor = (doc?: Document) => {
    if (doc) {
      setEditingDocument(doc);
      const matchedTemplate = doc.templateId
        ? templates.find(t => t.id === doc.templateId)
        : undefined;
      setSelectedTemplate(matchedTemplate && matchedTemplate.type === 'document' ? matchedTemplate : null);
      setDocumentForm({
        title: doc.title,
        content: doc.content,
        tags: doc.tags && doc.tags.length > 0 ? doc.tags : [''],
        sharedWith: doc.sharedWith && doc.sharedWith.length > 0 ? doc.sharedWith : [''],
        category: doc.category || '',
        status: doc.status || 'draft',
        templateId: doc.templateId || '',
        formData: doc.formData || {},
        customQuestions: doc.customQuestions || []
      });
      setShowDocumentEditor(true);
    } else {
      setShowTemplateSelector(true);
    }
  };

  const updateFormData = (questionId: string, value: string | string[]) => {
    setDocumentForm(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [questionId]: value
      }
    }));
  };

  const addCustomQuestion = (sectionId?: string) => {
    const newQuestion: TemplateQuestion = {
      id: `custom_${Date.now()}`,
      text: 'New custom question',
      type: 'textarea',
      placeholder: 'Enter your answer here...',
      sectionId: sectionId || 'custom'
    };
    
    setDocumentForm(prev => ({
      ...prev,
      customQuestions: [...prev.customQuestions, newQuestion]
    }));
    
    setDocumentForm(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [newQuestion.id]: ''
      }
    }));
  };

  const removeCustomQuestion = (questionId: string) => {
    setDocumentForm(prev => ({
      ...prev,
      customQuestions: prev.customQuestions.filter(q => q.id !== questionId),
      formData: {
        ...prev.formData,
        [questionId]: undefined
      }
    }));
  };

  const updateCustomQuestion = (questionId: string, field: keyof TemplateQuestion, value: any) => {
    setDocumentForm(prev => ({
      ...prev,
      customQuestions: prev.customQuestions.map(q => 
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }));
  };

  const renderFormInput = (question: TemplateQuestion, value: any) => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={question.placeholder || ''}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={question.placeholder || ''}
          />
        );
      case 'list':
        const listItems = Array.isArray(value) ? value : (value ? [value] : ['']);
        return (
          <div className="space-y-2">
            {listItems.map((item: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newList = [...listItems];
                    newList[index] = e.target.value;
                    updateFormData(question.id, newList.filter((v: string) => v.trim() !== '' || newList.length === 1));
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={question.placeholder || 'Enter item...'}
                />
                {listItems.length > 1 && (
                  <button
                    onClick={() => {
                      const newList = listItems.filter((_, i) => i !== index);
                      updateFormData(question.id, newList);
                    }}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {index === listItems.length - 1 && (
                  <button
                    onClick={() => {
                      updateFormData(question.id, [...listItems, '']);
                    }}
                    className="p-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const getAllQuestions = () => {
    if (!selectedTemplate) return [];
    
    const allQuestions: { sectionTitle: string; question: TemplateQuestion }[] = [];
    
    selectedTemplate.sections.forEach(section => {
      section.questions.forEach(q => {
        allQuestions.push({ sectionTitle: section.title, question: q });
      });
    });
    
    documentForm.customQuestions.forEach(q => {
      allQuestions.push({ sectionTitle: 'Custom Questions', question: q });
    });
    
    return allQuestions;
  };

  const generateDocumentContent = () => {
    if (!selectedTemplate) return '';

    const allQuestions = getAllQuestions();
    const answeredQuestions = allQuestions.filter(item => {
      const answer = documentForm.formData[item.question.id];
      return answer && answer.toString().trim();
    });

    let content = `
      <div class="template-document" style="font-family: 'Georgia', serif; max-width: 100%; padding: 0; background: #ffffff; overflow-wrap: break-word; word-wrap: break-word; word-break: normal; color: #000000;">
    `;
    
    content += `
      <div style="text-align: center; margin-bottom: 32px; max-width: 100%;">
        <h1 style="font-size: 22px; font-weight: 700; color: #000000; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; max-width: 100%; overflow-wrap: break-word; word-break: normal;">${documentForm.title}</h1>
        <p style="font-size: 13px; color: #4a4a4a; margin: 0; font-style: italic; max-width: 100%; overflow-wrap: break-word; word-break: normal;">${documentForm.category || ''}</p>
      </div>
    `;

    if (answeredQuestions.length > 0) {
      content += `
        <div style="margin-top: 10px; max-width: 100%;">
      `;

      // Group questions by section
      const sections = new Map<string, typeof answeredQuestions>();
      answeredQuestions.forEach(item => {
        if (!sections.has(item.sectionTitle)) {
          sections.set(item.sectionTitle, []);
        }
        sections.get(item.sectionTitle)!.push(item);
      });

      sections.forEach((items, sectionTitle) => {
        content += `
          <h2 style="font-size: 17px; font-weight: 700; color: #000000; margin: 32px 0 14px 0; border-bottom: 2px solid #cbd5e0; padding-bottom: 8px; max-width: 100%; overflow-wrap: break-word; word-break: normal;">${sectionTitle}</h2>
        `;

        items.forEach((item) => {
          const answer = documentForm.formData[item.question.id];
          const formattedAnswer = Array.isArray(answer) 
            ? `<ul style="margin: 8px 0 16px 0; padding-left: 24px; max-width: 100%; overflow-wrap: break-word; word-break: normal;">${answer.filter((a: string) => a.trim()).map((a: string) => `<li style="margin-bottom: 6px; max-width: 100%; overflow-wrap: break-word; word-break: normal; color: #000000;">${a}</li>`).join('')}</ul>`
            : `<p style="margin: 8px 0 18px 0; font-size: 13px; line-height: 1.75; color: #000000; max-width: 100%; overflow-wrap: break-word; word-break: normal;">${answer}</p>`;
          
          content += `
            <div style="margin-bottom: 18px; max-width: 100%;">
              <p style="font-weight: 600; font-size: 13px; color: #000000; margin: 0 0 6px 0; max-width: 100%; overflow-wrap: break-word; word-break: normal;">${item.question.text}</p>
              ${formattedAnswer}
            </div>
          `;
        });
      });

      content += `</div>`;
    } else {
      content += `
        <div style="text-align: center; padding: 40px 20px; color: #718096; background-color: #f7fafc; border-radius: 8px; border: 1px dashed #cbd5e0; max-width: 100%;">
          <p style="margin: 0; font-size: 14px;">No questions have been answered yet.</p>
        </div>
      `;
    }

    content += `<div style="height: 40px;"></div></div>`;

    return content;
  };

  const saveDocument = async () => {
  if (!documentForm.title) {
    warning('Validation Error', 'Please enter a document title.');
    return;
  }

  // Validate emails before saving
  const sharedWith = documentForm.sharedWith
    .filter(s => s.trim() !== '')
    .map(s => s.trim());
  
  const invalidEmails = sharedWith.filter(email => !isValidEmail(email));
  
  if (invalidEmails.length > 0) {
    warning(
      'Invalid Email Addresses',
      `The following email addresses are invalid: ${invalidEmails.join(', ')}`
    );
    return;
  }

  try {
    setIsSaving(true);

    const isDocumentTemplate = selectedTemplate?.type === 'document';
    const content = (selectedTemplate && !isDocumentTemplate)
      ? generateDocumentContent()
      : documentForm.content;

    const tags = documentForm.tags.filter(t => t.trim() !== '');

    const documentData = {
      title: documentForm.title,
      content: content || '',
      tags: tags.length > 0 ? tags : ['uncategorized'],
      sharedWith: sharedWith,
      category: documentForm.category || 'Uncategorized',
      status: documentForm.status,
      templateId: selectedTemplate?.id || editingDocument?.templateId || '',
      templateName: selectedTemplate?.name || editingDocument?.templateName || '',
      formData: documentForm.formData,
      customQuestions: documentForm.customQuestions
    };

    let savedDoc: Document;

    if (editingDocument) {
      savedDoc = await journalApi.updateDocument(editingDocument.id, documentData);
      setDocuments(documents.map(doc => doc.id === savedDoc.id ? savedDoc : doc));
      success('Success', 'Document updated successfully!');
    } else {
      savedDoc = await journalApi.createDocument(documentData);
      setDocuments([savedDoc, ...documents]);
      success('Success', 'Document created successfully!');
    }

    setShowDocumentEditor(false);
    setEditingDocument(null);
    setSelectedTemplate(null);
    setDocumentForm({
      title: '',
      content: '',
      tags: [''],
      sharedWith: [''],
      category: '',
      status: 'draft',
      templateId: '',
      formData: {},
      customQuestions: []
    });
    setExpandedSections(new Set());

  } catch (err: any) {
    console.error('Error saving document:', err);
    const errorMsg = err?.response?.data?.message || 'Failed to save document. Please try again.';
    showError('Error', errorMsg);
  } finally {
    setIsSaving(false);
  }
};

  const deleteDocument = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await journalApi.deleteDocument(id);
      setDocuments(documents.filter(doc => doc.id !== id));
      success('Success', 'Document deleted successfully!');
    } catch (err: any) {
      console.error('Error deleting document:', err);
      const errorMsg = err?.response?.data?.message || 'Failed to delete document. Please try again.';
      showError('Error', errorMsg);
    }
  };

  const viewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setShowDocumentViewer(true);
  };

const exportAsPDF = async () => {
    if (!selectedDocument) return;
    
    try {
      setIsLoading(true);
      
      // Create a temporary div to render the formatted content
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.padding = '0';
      tempDiv.style.background = '#ffffff';
      tempDiv.style.overflow = 'visible';
      document.body.appendChild(tempDiv);
      
      // Set the content with proper formatting
      tempDiv.innerHTML = formatDocumentContent(
        selectedDocument.content, 
        selectedDocument.title || 'Document'
      );
      
      // Wait for images/fonts to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture using the tempDiv's actual rendered size
      const captureWidth = tempDiv.scrollWidth;
      const captureHeight = tempDiv.scrollHeight;

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        onclone: (clonedDoc) => {
          // Ensure all elements have proper styling
          const elements = clonedDoc.querySelectorAll('*');
          elements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.maxWidth = '100%';
            htmlEl.style.overflowWrap = 'break-word';
            htmlEl.style.wordWrap = 'break-word';
            htmlEl.style.wordBreak = 'normal';
            htmlEl.style.hyphens = 'none';
            htmlEl.style.color = '#000000';
          });
        }
      });
      
      // Remove temp div
      document.body.removeChild(tempDiv);
      
      // Create PDF with A4 dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; 
      const pageHeight = 297; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Calculate total pages
      const totalPages = Math.max(1, Math.ceil(imgHeight / pageHeight));

      // Add extra pages with proper margins
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        const position = -(page * pageHeight);
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        
        // Add page numbers
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${page + 1} of ${totalPages}`, 190, 285, { align: 'right' });
      }
      
      pdf.save(`${selectedDocument?.title || 'document'}.pdf`);
      success('Success', 'PDF exported successfully!');
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showError('Error', 'Failed to export PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Document form helpers
  const addDocumentTag = () => {
    setDocumentForm({ ...documentForm, tags: [...documentForm.tags, ''] });
  };

  const updateDocumentTag = (index: number, value: string) => {
    const newTags = [...documentForm.tags];
    newTags[index] = value;
    setDocumentForm({ ...documentForm, tags: newTags });
  };

  const removeDocumentTag = (index: number) => {
    const newTags = documentForm.tags.filter((_, i) => i !== index);
    setDocumentForm({ ...documentForm, tags: newTags });
  };

  const addSharedWith = () => {
    setDocumentForm({ ...documentForm, sharedWith: [...documentForm.sharedWith, ''] });
  };

  const updateSharedWith = (index: number, value: string) => {
    const newShared = [...documentForm.sharedWith];
    newShared[index] = value;
    setDocumentForm({ ...documentForm, sharedWith: newShared });
  };

  const removeSharedWith = (index: number) => {
    const newShared = documentForm.sharedWith.filter((_, i) => i !== index);
    setDocumentForm({ ...documentForm, sharedWith: newShared });
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-yellow-100 text-yellow-700';
      case 'archived': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // ==================== RENDER FUNCTIONS ====================

  // Template Selector Modal
  const renderTemplateSelector = () => (
    showTemplateSelector && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Select a Template</h3>
              <p className="text-sm text-gray-500">Choose a template to get started with your document</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openTemplateManager()}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                Create New Templates
              </button>
              <button 
                onClick={() => setShowTemplateSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative"
              >
                <div 
                  onClick={() => selectTemplate(template)}
                  className="flex items-start gap-3"
                >
                  <div className={`p-2 rounded-lg ${template.type === 'document' ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'} transition-colors`}>
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-500 line-clamp-2">{template.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.type === 'document' ? (
                        <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                          Ready-to-use legal document
                        </span>
                      ) : (
                        <>
                          {template.sections.slice(0, 2).map(section => (
                            <span key={section.id} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {section.title}
                            </span>
                          ))}
                          {template.sections.length > 2 && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              +{template.sections.length - 2} more
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {template.isCustom && (
                      <span className="text-xs text-purple-600 mt-1 inline-block">Custom</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {template.type === 'document' ? 'Full document' : `${template.defaultQuestions.length} questions`}
                  </span>
                  <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Select →
                  </span>
                </div>
                {/* Edit and Delete buttons for custom templates */}
                {template.isCustom && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openTemplateManager(template);
                      }}
                      className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Edit Template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  );

  // Template Manager Modal
  const renderTemplateManager = () => (
    showTemplateManager && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <p className="text-sm text-gray-500">Create and manage your custom templates</p>
            </div>
            <button 
              onClick={() => {
                setShowTemplateManager(false);
                setEditingTemplate(null);
                setTemplateForm({
                  name: '',
                  description: '',
                  sections: [],
                  defaultQuestions: [],
                  type: 'form',
                });
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Template Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={templateForm.name || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={templateForm.description || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description"
                />
              </div>
            </div>

            {/* Sections */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700">Sections</h4>
                <button
                  onClick={addTemplateSection}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>
              </div>

              {templateForm.sections?.map((section, sectionIndex) => (
                <div key={section.id} className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
                  <div className="bg-gray-50 p-4 flex items-center justify-between">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateTemplateSection(sectionIndex, 'title', e.target.value)}
                      className="font-medium text-gray-800 bg-transparent border-0 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                      placeholder="Section title"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addTemplateQuestion(sectionIndex)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeTemplateSection(sectionIndex)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {section.questions.map((question, questionIndex) => (
                      <div key={question.id} className="border border-gray-100 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={question.text}
                              onChange={(e) => updateTemplateQuestion(sectionIndex, questionIndex, 'text', e.target.value)}
                              className="w-full font-medium text-gray-700 border-0 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                              placeholder="Question text"
                            />
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <select
                              value={question.type}
                              onChange={(e) => updateTemplateQuestion(sectionIndex, questionIndex, 'type', e.target.value as any)}
                              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {QUESTION_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeTemplateQuestion(sectionIndex, questionIndex)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={question.placeholder || ''}
                          onChange={(e) => updateTemplateQuestion(sectionIndex, questionIndex, 'placeholder', e.target.value)}
                          className="w-full text-sm text-gray-400 border-0 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                          placeholder="Placeholder text (optional)"
                        />
                      </div>
                    ))}
                    
                    {section.questions.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No questions in this section. Click the + button to add one.
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {templateForm.sections?.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-400">No sections yet. Click "Add Section" to get started.</p>
                </div>
              )}
            </div>

            {/* Template Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTemplateManager(false);
                  setEditingTemplate(null);
                  setTemplateForm({
                    name: '',
                    description: '',
                    sections: [],
                    defaultQuestions: [],
                    type: 'form',
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // Document Editor Modal
  const renderDocumentEditor = () => (
    showDocumentEditor && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {editingDocument ? 'Edit Document' : selectedTemplate ? `Create ${selectedTemplate.name}` : 'Create Document'}
              </h3>
              {selectedTemplate && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <span className={`${selectedTemplate.type === 'document' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'} px-2 py-0.5 rounded-full text-xs`}>
                    {selectedTemplate.name}
                  </span>
                </p>
              )}
            </div>
            <button 
              onClick={() => {
                setShowDocumentEditor(false);
                setSelectedTemplate(null);
                setEditingDocument(null);
                setExpandedSections(new Set());
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  value={documentForm.title}
                  onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter document title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={documentForm.category}
                  onChange={(e) => setDocumentForm({ ...documentForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Research, Business Plan, Marketing"
                />
              </div>
            </div>

            {selectedTemplate && selectedTemplate.type !== 'document' && (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <LayoutTemplate className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Template Questions</p>
                      <p className="text-xs text-blue-600">
                        Answer these questions to generate your document
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => addCustomQuestion()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Question
                  </button>
                </div>

                {selectedTemplate.sections.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div>
                        <h4 className="font-medium text-gray-800">{section.title}</h4>
                        {section.description && (
                          <p className="text-xs text-gray-500">{section.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addCustomQuestion(section.id);
                          }}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Add custom question to this section"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {expandedSections.has(section.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {expandedSections.has(section.id) && (
                      <div className="p-4 space-y-4">
                        {section.questions.map((q) => (
                          <div key={q.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {q.text}
                              {q.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {q.helpText && (
                              <p className="text-xs text-gray-400 mb-2">{q.helpText}</p>
                            )}
                            {renderFormInput(q, documentForm.formData[q.id])}
                          </div>
                        ))}
                        
                        {documentForm.customQuestions.filter(q => q.sectionId === section.id).map((q) => (
                          <div key={q.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50/30">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1">
                                {editingCustomQuestion === q.id ? (
                                  <input
                                    type="text"
                                    value={q.text}
                                    onChange={(e) => updateCustomQuestion(q.id, 'text', e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                    autoFocus
                                    onBlur={() => setEditingCustomQuestion(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') setEditingCustomQuestion(null);
                                    }}
                                  />
                                ) : (
                                  <p 
                                    className="text-sm font-medium text-purple-700 cursor-pointer hover:text-purple-900"
                                    onClick={() => setEditingCustomQuestion(q.id)}
                                  >
                                    {q.text}
                                    <span className="ml-2 text-xs text-purple-400">(click to edit)</span>
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => removeCustomQuestion(q.id)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {renderFormInput(q, documentForm.formData[q.id])}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {documentForm.customQuestions.filter(q => !q.sectionId || q.sectionId === 'custom').length > 0 && (
                  <div className="border border-purple-200 rounded-lg overflow-hidden">
                    <div className="p-4 bg-purple-50">
                      <h4 className="font-medium text-purple-700">Custom Questions</h4>
                      <p className="text-xs text-purple-500">Questions you've added to this document</p>
                    </div>
                    <div className="p-4 space-y-4">
                      {documentForm.customQuestions.filter(q => !q.sectionId || q.sectionId === 'custom').map((q) => (
                        <div key={q.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50/30">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              {editingCustomQuestion === q.id ? (
                                <input
                                  type="text"
                                  value={q.text}
                                  onChange={(e) => updateCustomQuestion(q.id, 'text', e.target.value)}
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                  autoFocus
                                  onBlur={() => setEditingCustomQuestion(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingCustomQuestion(null);
                                  }}
                                />
                              ) : (
                                <p 
                                  className="text-sm font-medium text-purple-700 cursor-pointer hover:text-purple-900"
                                  onClick={() => setEditingCustomQuestion(q.id)}
                                >
                                  {q.text}
                                  <span className="ml-2 text-xs text-purple-400">(click to edit)</span>
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => removeCustomQuestion(q.id)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {renderFormInput(q, documentForm.formData[q.id])}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(selectedTemplate?.type === 'document' || (!selectedTemplate && !editingDocument?.templateId)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedTemplate?.type === 'document' ? 'Document Content' : 'Content'}
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <style>{quillStyles}</style>
                  <div className="h-80 overflow-y-auto">
                    <ReactQuill
                      theme="snow"
                      value={documentForm.content}
                      onChange={(content: string) => setDocumentForm({ ...documentForm, content })}
                      modules={quillModules}
                      formats={quillFormats}
                      className="h-64"
                      style={{ height: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={documentForm.status}
                  onChange={(e) => setDocumentForm({ ...documentForm, status: e.target.value as 'draft' | 'published' | 'archived' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              {documentForm.tags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => updateDocumentTag(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter tag"
                  />
                  {index === documentForm.tags.length - 1 && (
                    <button
                      onClick={addDocumentTag}
                      className="p-2 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                  {documentForm.tags.length > 1 && (
                    <button
                      onClick={() => removeDocumentTag(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

                      <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
               Share With (Enter email addresses)
             </label>
             {documentForm.sharedWith.map((person, index) => {
               const isInvalid = person.trim() !== '' && !isValidEmail(person);
               return (
                 <div key={index} className="flex items-center gap-2 mb-2">
                   <div className="relative flex-1">
                     <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                     <input
                       type="email"
                       value={person}
                       onChange={(e) => updateSharedWith(index, e.target.value)}
                       className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                         isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300'
                       }`}
                       placeholder="Enter email address"
                       onBlur={() => {
                         // Trim whitespace on blur
                         if (person.trim() !== person) {
                           updateSharedWith(index, person.trim());
                         }
                       }}
                     />
                     {isInvalid && (
                       <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                         <AlertCircle className="w-4 h-4 text-red-500" />
                       </div>
                     )}
                   </div>
                   {index === documentForm.sharedWith.length - 1 && (
                     <button
                       onClick={addSharedWith}
                       className="p-2 text-blue-600 hover:text-blue-700"
                     >
                       <Plus className="w-5 h-5" />
                     </button>
                   )}
                   {documentForm.sharedWith.length > 1 && (
                     <button
                       onClick={() => removeSharedWith(index)}
                       className="p-2 text-red-500 hover:text-red-700"
                     >
                       <X className="w-5 h-5" />
                     </button>
                   )}
                 </div>
               );
             })}
             
             {/* Show validation summary */}
             {documentForm.sharedWith.some(email => email.trim() !== '' && !isValidEmail(email)) && (
               <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                 <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                 <p className="text-sm text-red-600">
                   Enter valid email addresses to share this document
                 </p>
               </div>
             )}
           </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDocumentEditor(false);
                  setSelectedTemplate(null);
                  setEditingDocument(null);
                  setExpandedSections(new Set());
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveDocument}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingDocument ? 'Update Document' : selectedTemplate ? 'Generate & Save' : 'Create Document'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // Document Viewer Modal
  const renderDocumentViewer = () => (
    showDocumentViewer && selectedDocument && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedDocument.title}</h3>
                {selectedDocument.templateName && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {selectedDocument.templateName}
                  </span>
                )}
              </div>
              {selectedDocument.status && (
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedDocument.status)}`}>
                  {selectedDocument.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportAsPDF}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isLoading ? 'Exporting...' : 'Export PDF'}
              </button>
              <button 
                onClick={() => setShowDocumentViewer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div ref={documentRef} className="prose max-w-none p-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <style>{`
              .document-content-viewer * {
                color: #000000 !important;
                word-break: normal !important;
                hyphens: none !important;
              }
              .document-content-viewer h1,
              .document-content-viewer h2,
              .document-content-viewer h3,
              .document-content-viewer h4 {
                font-weight: 700 !important;
              }
            `}</style>
            <div className="document-content-viewer" style={{ maxWidth: '100%', overflow: 'hidden', overflowWrap: 'break-word', wordWrap: 'break-word', color: '#000000' }}>
              <div dangerouslySetInnerHTML={{ __html: selectedDocument.content }} />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDocumentViewer(false);
                    openDocumentEditor(selectedDocument);
                  }}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDocumentViewer(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // Document Card component
  const DocumentCard = ({ doc }: { doc: Document }) => (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {doc.templateId && templates.find(t => t.id === doc.templateId)?.type === 'document' ? (
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <FileSignature className="w-4 h-4" />
            </div>
          ) : doc.templateId ? (
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
              <LayoutTemplate className="w-4 h-4" />
            </div>
          ) : (
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 truncate" onClick={() => viewDocument(doc)}>
              {doc.title}
            </h4>
            {doc.templateName && (
              <span className="text-xs text-blue-600">{doc.templateName}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {doc.status && (
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(doc.status)}`}>
              {doc.status}
            </span>
          )}
        </div>
      </div>

      <div 
        className="text-sm text-gray-600 mb-3 line-clamp-2 cursor-pointer"
        onClick={() => viewDocument(doc)}
        dangerouslySetInnerHTML={{ __html: doc.content?.substring(0, 150) + '...' || '' }}
      />

      {doc.category && (
        <div className="mb-2">
          <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
            {doc.category}
          </span>
        </div>
      )}

      {doc.tags && doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {doc.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
              #{tag}
            </span>
          ))}
          {doc.tags.length > 3 && (
            <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-full">
              +{doc.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {doc.customQuestions && doc.customQuestions.length > 0 && (
        <div className="mb-2">
          <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
            +{doc.customQuestions.length} custom questions
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Updated: {doc.updatedAt}</span>
          
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => viewDocument(doc)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDocumentEditor(doc)}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => deleteDocument(doc.id)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Document List Item
  const DocumentListItem = ({ doc }: { doc: Document }) => (
    <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all hover:border-blue-300 cursor-pointer group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {doc.templateId && templates.find(t => t.id === doc.templateId)?.type === 'document' ? (
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 flex-shrink-0">
              <FileSignature className="w-4 h-4" />
            </div>
          ) : doc.templateId ? (
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0">
              <LayoutTemplate className="w-4 h-4" />
            </div>
          ) : (
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-800 truncate" onClick={() => viewDocument(doc)}>
                {doc.title}
              </h4>
              {doc.templateName && (
                <span className="text-xs text-blue-600 flex-shrink-0">{doc.templateName}</span>
              )}
              {doc.status && (
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(doc.status)} flex-shrink-0`}>
                  {doc.status}
                </span>
              )}
              {doc.customQuestions && doc.customQuestions.length > 0 && (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full flex-shrink-0">
                  +{doc.customQuestions.length} custom
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
              <span>By {doc.authorName}</span>
              <span>•</span>
              <span>Updated {doc.updatedAt}</span>
              {doc.category && (
                <>
                  <span>•</span>
                  <span className="text-purple-600">{doc.category}</span>
                </>
              )}
              {doc.tags && doc.tags.length > 0 && (
                <>
                  <span>•</span>
                  <span>{doc.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-4">
          <button
            onClick={() => viewDocument(doc)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDocumentEditor(doc)}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => deleteDocument(doc.id)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Main render
  if (isLoading && documents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error && documents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 border border-red-200 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">Error Loading Documents</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDocuments}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-2 rounded-lg">
              <File className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Documents</h1>
              <p className="text-sm text-gray-500">Create, manage, and export your business documents</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/learn/business-journal')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Journal
            </button>
            <button
              onClick={() => openTemplateManager()}
              className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Templates
            </button>
            <button 
              onClick={() => openDocumentEditor()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Document
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Total Documents</p>
            <p className="text-2xl font-bold text-gray-800">{documents.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-2xl font-bold text-green-600">
              {documents.filter(d => d.status === 'published').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Drafts</p>
            <p className="text-2xl font-bold text-yellow-600">
              {documents.filter(d => d.status === 'draft').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Total Templates</p>
            <p className="text-2xl font-bold text-purple-600">
              {Array.isArray(templates) ? templates.length : 0}
            </p>
          </div>
        </div>

        {/* Search and View */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <span className="text-sm text-gray-500 ml-auto">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Template Quick Access */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-blue-600" />
              <h3 className="font-medium text-gray-700">Quick Start Templates</h3>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.slice(0, 6).map((template) => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all text-sm relative group ${
                  template.type === 'document' ? 'border-indigo-200 hover:border-indigo-400' : ''
                }`}
              >
                {template.icon}
                <span>{template.name}</span>
                {template.type === 'document' && (
                  <span className="text-xs text-indigo-500 ml-1">(Legal)</span>
                )}
                {template.isCustom && (
                  <span className="text-xs text-purple-500 ml-1">(Custom)</span>
                )}
                {template.isCustom && (
                  <div className="absolute -top-1 -right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openTemplateManager(template);
                      }}
                      className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-sm"
                      title="Edit Template"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                      className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              View All Templates
            </button>
          </div>
        </div>

        {/* Documents Grid/List */}
        <div className="space-y-6">
          {filteredDocuments.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((doc) => (
                  <DocumentListItem key={doc.id} doc={doc} />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <File className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No documents found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try adjusting your search query' : 'Create your first document using a template'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => openDocumentEditor()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Create Document
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {renderTemplateSelector()}
      {renderTemplateManager()}
      {renderDocumentEditor()}
      {renderDocumentViewer()}
    </div>
  );
};

export default BusinessJournalDocument;