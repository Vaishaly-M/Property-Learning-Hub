// components/learner/BusinessJournal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Plus, Target, Eye, Calendar, CheckSquare, FileText, Share2,
  TrendingUp, BookOpen, BarChart3, ListChecks, Circle, User,
  Clock, CheckCircle2, X, AlertCircle, Edit2, Trash2, Loader2,
  Sparkles, PenTool, Lightbulb, LayoutTemplate, ChevronDown, ChevronRight,
  Download
} from 'lucide-react';
import * as journalApi from '@/services/businessJournalApi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReactQuill = dynamic(
  () => import('react-quill-new'),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  }
);

import 'react-quill-new/dist/quill.snow.css';
import toast from 'react-hot-toast';



// ==================== TEMPLATE DEFINITIONS ====================

interface TemplateQuestion {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'list' | 'richtext';
  placeholder?: string;
}

interface TemplateSection {
  id: string;
  title: string;
  questions: TemplateQuestion[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  sections: TemplateSection[];
  defaultQuestions: TemplateQuestion[];
}

// Generated Document from Template
interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  title: string;
  content: string;
  formData: Record<string, any>;
  createdAt: string;
  type: 'mission' | 'vision';
}

const MISSION_TEMPLATES: Template[] = [
  {
    id: 'mission-statement',
    name: 'Mission Statement',
    description: 'Create a powerful mission statement',
    icon: <Target className="w-5 h-5" />,
    sections: [
      {
        id: 'questions',
        title: 'Mission Statement Questions',
        questions: [
          { id: 'company', text: 'Who is your company or non-profit?', type: 'textarea', placeholder: 'Describe your organization...' },
          { id: 'purpose', text: 'What is the purpose of your organization?', type: 'textarea', placeholder: 'Define your purpose...' },
          { id: 'locations', text: 'Where are your offices or factories located?', type: 'textarea', placeholder: 'List locations...' },
          { id: 'clients', text: 'Who are your clients/customers and what are their needs?', type: 'textarea', placeholder: 'Describe your clients...' },
          { id: 'process', text: 'How do you work? Define time, quality, and process aspirations.', type: 'textarea', placeholder: 'Describe your process...' },
        ]
      },
      {
        id: 'draft',
        title: 'Draft Your Mission Statement',
        questions: [
          { id: 'keywords', text: 'What keywords capture your mission?', type: 'list', placeholder: 'List keywords...' },
          { id: 'draft', text: 'Draft your mission statement (1-2 sentences)', type: 'textarea', placeholder: 'Write your draft...' },
        ]
      }
    ],
    defaultQuestions: [
      { id: 'company', text: 'Who is your company or non-profit?', type: 'textarea' },
      { id: 'purpose', text: 'What is the purpose of your organization?', type: 'textarea' },
      { id: 'locations', text: 'Where are your offices or factories located?', type: 'textarea' },
      { id: 'clients', text: 'Who are your clients/customers and what are their needs?', type: 'textarea' },
      { id: 'process', text: 'How do you work? Define time, quality, and process aspirations.', type: 'textarea' },
      { id: 'keywords', text: 'What keywords capture your mission?', type: 'list' },
      { id: 'draft', text: 'Draft your mission statement (1-2 sentences)', type: 'textarea' },
    ]
  },
  {
    id: 'mission-worksheet',
    name: 'Mission Statement Worksheet',
    description: 'Step-by-step mission statement worksheet',
    icon: <PenTool className="w-5 h-5" />,
    sections: [
      {
        id: 'steps',
        title: 'Worksheet Steps',
        questions: [
          { id: 'questions', text: 'Step 1: Ask questions (list your key questions)', type: 'list', placeholder: 'List questions...' },
          { id: 'answers', text: 'Step 2: Discuss answers (summarize your answers)', type: 'textarea', placeholder: 'Write your answers...' },
          { id: 'keywords', text: 'Step 3: Edit ideas and keywords', type: 'list', placeholder: 'List keywords...' },
          { id: 'draft', text: 'Step 4: Draft mission statements', type: 'textarea', placeholder: 'Write your draft...' },
          { id: 'review', text: 'Step 5: Review and get feedback', type: 'textarea', placeholder: 'Feedback notes...' },
          { id: 'final', text: 'Step 6: Publish your final mission statement', type: 'textarea', placeholder: 'Final statement...' },
        ]
      }
    ],
    defaultQuestions: [
      { id: 'questions', text: 'Step 1: Ask questions (list your key questions)', type: 'list' },
      { id: 'answers', text: 'Step 2: Discuss answers (summarize your answers)', type: 'textarea' },
      { id: 'keywords', text: 'Step 3: Edit ideas and keywords', type: 'list' },
      { id: 'draft', text: 'Step 4: Draft mission statements', type: 'textarea' },
      { id: 'review', text: 'Step 5: Review and get feedback', type: 'textarea' },
      { id: 'final', text: 'Step 6: Publish your final mission statement', type: 'textarea' },
    ]
  }
];

const VISION_TEMPLATES: Template[] = [
  {
    id: 'vision-statement',
    name: 'Vision Statement',
    description: 'Define your organization\'s vision',
    icon: <Lightbulb className="w-5 h-5" />,
    sections: [
      {
        id: 'questions',
        title: 'Vision Statement Questions',
        questions: [
          { id: 'look', text: 'What do you want your organization to look like? Culture? Ethos? Mood?', type: 'textarea', placeholder: 'Describe your ideal culture...' },
          { id: 'direction', text: 'Where are you going?', type: 'textarea', placeholder: 'Define your direction...' },
          { id: 'realistic', text: 'What can you realistically achieve?', type: 'textarea', placeholder: 'Set realistic goals...' },
          { id: 'keywords', text: 'What words/phrases depict your organization and end-goals?', type: 'list', placeholder: 'List keywords...' },
        ]
      },
      {
        id: 'visual',
        title: 'Vision Visualization',
        questions: [
          { id: 'description', text: 'Describe your vision in detail:', type: 'textarea', placeholder: 'Write a detailed vision description...' },
        ]
      }
    ],
    defaultQuestions: [
      { id: 'look', text: 'What do you want your organization to look like?', type: 'textarea' },
      { id: 'direction', text: 'Where are you going?', type: 'textarea' },
      { id: 'realistic', text: 'What can you realistically achieve?', type: 'textarea' },
      { id: 'keywords', text: 'What words/phrases depict your organization and end-goals?', type: 'list' },
      { id: 'description', text: 'Describe your vision in detail:', type: 'textarea' },
    ]
  },
  {
    id: 'vision-worksheet',
    name: 'Vision Statement Worksheet',
    description: 'Step-by-step vision statement worksheet',
    icon: <Sparkles className="w-5 h-5" />,
    sections: [
      {
        id: 'steps',
        title: 'Worksheet Steps',
        questions: [
          { id: 'look', text: 'Step 1: What do you want your organization to look like?', type: 'textarea', placeholder: 'Describe your vision...' },
          { id: 'direction', text: 'Step 2: Where are you going?', type: 'textarea', placeholder: 'Define direction...' },
          { id: 'realistic', text: 'Step 3: What can you realistically achieve?', type: 'textarea', placeholder: 'Set realistic goals...' },
          { id: 'keywords', text: 'Step 4: What words/phrases depict your end-goals?', type: 'list', placeholder: 'List keywords...' },
          { id: 'visual', text: 'Step 5: Draw or insert a picture that represents your vision (describe it)', type: 'textarea', placeholder: 'Describe your visual representation...' },
        ]
      }
    ],
    defaultQuestions: [
      { id: 'look', text: 'What do you want your organization to look like?', type: 'textarea' },
      { id: 'direction', text: 'Where are you going?', type: 'textarea' },
      { id: 'realistic', text: 'What can you realistically achieve?', type: 'textarea' },
      { id: 'keywords', text: 'What words/phrases depict your end-goals?', type: 'list' },
      { id: 'visual', text: 'Describe a visual representation of your vision', type: 'textarea' },
    ]
  }
];

interface Note {
  id: number;
  title: string;
  content: string;
  type: string;
  author: string;
  authorName: string;
  sharedWith: string[];
  date: string;
  goal: string;
  checklist: string[];
  checkedItems: boolean[];
}

interface Activity {
  id: number;
  title: string;
  date: string;
  status: 'pending' | 'completed';
}

interface JournalData {
  mission: string;
  visions: string[];
  roadmap: {
    id: number;
    goal: string;
    tasks: string[];
    completed: boolean[];
    deadline: string;
  }[];
}

function mapQueryToBusinessJournalTab(queryTab: string | null): string {
  if (!queryTab) return 'mission';
  const queryMap: Record<string, string> = {
    'business-journal-mission': 'mission',
    'business-journal-vision': 'vision',
    'business-journal-activities': 'activities',
    'business-journal-notes': 'notes',
  };
  return queryMap[queryTab] || 'mission';
}

function mapBusinessJournalTabToQuery(tab: string): string {
  const tabMap: Record<string, string> = {
    mission: 'business-journal-mission',
    vision: 'business-journal-vision',
    activities: 'business-journal-activities',
    notes: 'business-journal-notes',
  };
  return tabMap[tab] || 'business-journal-mission';
}
const validateDate = (dateString: string): boolean => {
  if (!dateString) return false;
  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  return selectedDate >= today;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const BusinessJournal = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialTab = mapQueryToBusinessJournalTab(searchParams.get('tab'));
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for journal data
  const [journalData, setJournalData] = useState<JournalData>({
    mission: '',
    visions: [],
    roadmap: []
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [noteTitleError, setNoteTitleError] = useState('');
const [noteContentError, setNoteContentError] = useState('');
const [noteChecklistError, setNoteChecklistError] = useState('');

// Add these state variables for goal validation
const [goalTitleError, setGoalTitleError] = useState('');
const [goalDeadlineError, setGoalDeadlineError] = useState('');
const [goalTasksError, setGoalTasksError] = useState('');

// Add these state variables for activity validation
const [activityTitleError, setActivityTitleError] = useState('');
const [activityDateError, setActivityDateError] = useState('');

  // Generated documents from templates
  const [generatedMissionDocs, setGeneratedMissionDocs] = useState<GeneratedDocument[]>([]);
  const [generatedVisionDocs, setGeneratedVisionDocs] = useState<GeneratedDocument[]>([]);

  // UI States
  const [showMissionEditor, setShowMissionEditor] = useState(false);
  const [showVisionEditor, setShowVisionEditor] = useState(false);
  const [editingVisionIndex, setEditingVisionIndex] = useState<number | null>(null);
  const [tempMission, setTempMission] = useState('');
  const [tempVision, setTempVision] = useState('');
  const [newVision, setNewVision] = useState('');
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedNoteForShare, setSelectedNoteForShare] = useState<Note | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Document Viewer states
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<GeneratedDocument | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  // Template states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateType, setTemplateType] = useState<'mission' | 'vision'>('mission');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateFormData, setTemplateFormData] = useState<Record<string, any>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Edit Goal Modal
  const [showEditGoalModal, setShowEditGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<{
    id: number;
    goal: string;
    tasks: string[];
    deadline: string;
  } | null>(null);

  // Edit Note Modal
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // New Note Form
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 'checkbox',
    goal: '',
    checklist: [''],
    sharedWith: []
  });

  // New Activity Form
  const [newActivity, setNewActivity] = useState({ 
    title: '', 
    date: '', 
    status: 'pending' as 'pending' | 'completed' 
  });

  // New Goal Form
  const [newGoal, setNewGoal] = useState({ 
    goal: '', 
    tasks: [''], 
    deadline: '' 
  });

  const [isClient, setIsClient] = useState(false);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'align', 'list', 'bullet', 'link', 'image'
  ];

  // Load data on mount
  useEffect(() => {
    setIsClient(true);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const journal = await journalApi.getJournal();
      setJournalData(journal);
      
      const notesData = await journalApi.getNotes();
      setNotes(notesData);
      
      const activitiesData = await journalApi.getActivities();
      setActivities(activitiesData);
      
      loadGeneratedDocuments();
      
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err?.response?.data?.message || 'Failed to load journal data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGeneratedDocuments = () => {
    try {
      const saved = localStorage.getItem('generatedMissionDocs');
      if (saved) {
        setGeneratedMissionDocs(JSON.parse(saved));
      }
      const savedVision = localStorage.getItem('generatedVisionDocs');
      if (savedVision) {
        setGeneratedVisionDocs(JSON.parse(savedVision));
      }
    } catch (e) {
      console.error('Error loading generated docs:', e);
    }
  };

  const saveGeneratedDocuments = (type: 'mission' | 'vision', docs: GeneratedDocument[]) => {
    try {
      const key = type === 'mission' ? 'generatedMissionDocs' : 'generatedVisionDocs';
      localStorage.setItem(key, JSON.stringify(docs));
    } catch (e) {
      console.error('Error saving generated docs:', e);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const queryTab = mapBusinessJournalTabToQuery(tab);
    router.push(`/learn/business-journal?tab=${queryTab}`);
  };

  // ==================== Document Viewer ====================

  const openDocumentViewer = (doc: GeneratedDocument) => {
    setViewingDocument(doc);
    setShowDocumentViewer(true);
  };

  // FIX 2: PDF Export - Capture full document content, not just viewport
  const exportAsPDF = async () => {
    if (!documentRef.current || !viewingDocument) return;
    
    try {
      setIsExporting(true);
      const element = documentRef.current;
      
      // Create a temporary container to ensure all content is rendered
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '794px'; // A4 width in pixels at 96dpi
      tempContainer.style.padding = '40px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.innerHTML = viewingDocument.content;
      document.body.appendChild(tempContainer);
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: tempContainer.scrollHeight,
        windowHeight: tempContainer.scrollHeight,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.body.querySelector('div');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
          }
        }
      });
      
      // Remove temporary container
      document.body.removeChild(tempContainer);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Handle multi-page PDF if content is longer than one page
      const pageHeight = 297; // A4 height in mm
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${viewingDocument?.title || 'document'}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ==================== Template Handlers ====================

  const openTemplateModal = (type: 'mission' | 'vision') => {
    setTemplateType(type);
    setShowTemplateModal(true);
    setSelectedTemplate(null);
    setTemplateFormData({});
    setExpandedSections(new Set());
  };

  const selectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const initialData: Record<string, any> = {};
    template.defaultQuestions.forEach(q => {
      initialData[q.id] = '';
    });
    setTemplateFormData(initialData);
    const allSectionIds = new Set(template.sections.map(s => s.id));
    setExpandedSections(allSectionIds);
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

  const updateTemplateFormData = (questionId: string, value: string | string[]) => {
    setTemplateFormData(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const renderFormInput = (question: TemplateQuestion, value: any) => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateTemplateFormData(question.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={question.placeholder || ''}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => updateTemplateFormData(question.id, e.target.value)}
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
                    updateTemplateFormData(question.id, newList.filter((v: string) => v.trim() !== '' || newList.length === 1));
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={question.placeholder || 'Enter item...'}
                />
                {listItems.length > 1 && (
                  <button
                    onClick={() => {
                      const newList = listItems.filter((_, i) => i !== index);
                      updateTemplateFormData(question.id, newList);
                    }}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {index === listItems.length - 1 && (
                  <button
                    onClick={() => {
                      updateTemplateFormData(question.id, [...listItems, '']);
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

  const generateTemplateDocument = async () => {
    if (!selectedTemplate) return;

    const answeredQuestions = selectedTemplate.defaultQuestions.filter(q => {
      const answer = templateFormData[q.id];
      return answer && answer.toString().trim();
    });

    let content = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 100%; padding: 30px 40px; background: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #1a365d;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background:  rgb(12, 32, 105); padding: 10px 14px; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
            <img src="/logo.jpeg" alt="Freedom Property" width="28" height="28" style="display: block;">
            <span style="color: white; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">FREEDOM PROPERTY</span>
          </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 600; color: #1a365d;">${selectedTemplate.name}</div>
            <div style="font-size: 11px; color: #718096;">Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #1a365d; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${selectedTemplate.name}</h1>
        </div>
    `;

    if (answeredQuestions.length > 0) {
      content += `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #0c2069;">
              <th style="padding: 12px 16px; text-align: left; color: white; font-weight: 600; border: 1px solid #2d3748; width: 35%;">Question</th>
              <th style="padding: 12px 16px; text-align: left; color: white; font-weight: 600; border: 1px solid #2d3748; width: 65%;">Answer</th>
            </tr>
          </thead>
          <tbody>
      `;

      answeredQuestions.forEach((question, index) => {
        const answer = templateFormData[question.id];
        const formattedAnswer = Array.isArray(answer) 
          ? `<ul style="margin: 4px 0; padding-left: 20px;">${answer.filter((a: string) => a.trim()).map((a: string) => `<li style="margin-bottom: 2px;">${a}</li>`).join('')}</ul>`
          : answer;
        
        const bgColor = index % 2 === 0 ? '#f7fafc' : '#ffffff';
        
        content += `
          <tr style="background-color: ${bgColor};">
            <td style="padding: 12px 16px; border: 1px solid #e2e8f0; vertical-align: top; font-weight: 500; color: #2d3748;">
              ${question.text}
            </td>
            <td style="padding: 12px 16px; border: 1px solid #e2e8f0; vertical-align: top; color: #4a5568; line-height: 1.6;">
              ${formattedAnswer}
            </td>
          </tr>
        `;
      });

      content += `
          </tbody>
        </table>
      `;
    } else {
      content += `
        <div style="text-align: center; padding: 40px 20px; color: #718096; background-color: #f7fafc; border-radius: 8px; border: 1px dashed #cbd5e0;">
          <p style="margin: 0; font-size: 14px;">No questions have been answered yet.</p>
        </div>
      `;
    }

    content += `
        <div style="margin-top: 24px; padding-top: 16px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #a0aec0;">
          <span>${selectedTemplate.name}</span>
          <span>Confidential • Page 1 of 1</span>
        </div>
      </div>
    `;

    try {
      setIsSaving(true);
      
      const newDoc: GeneratedDocument = {
        id: `doc_${Date.now()}`,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
         title: `${selectedTemplate.name} - ${formatDate(new Date().toISOString())}`,
        content: content,
        formData: templateFormData,
        createdAt: new Date().toISOString(),
        type: templateType
      };

      if (templateType === 'mission') {
        const updated = [newDoc, ...generatedMissionDocs];
        setGeneratedMissionDocs(updated);
        saveGeneratedDocuments('mission', updated);
      } else {
        const updated = [newDoc, ...generatedVisionDocs];
        setGeneratedVisionDocs(updated);
        saveGeneratedDocuments('vision', updated);
      }
      
      await journalApi.createDocument({
        title: newDoc.title,
        content: content,
        tags: [selectedTemplate.name.toLowerCase().replace(/\s+/g, '-')],
        sharedWith: [],
        category: templateType === 'mission' ? 'Mission Statement' : 'Vision Statement',
        status: 'published',
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        formData: templateFormData,
        customQuestions: []
      });
      
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateFormData({});
      setExpandedSections(new Set());
      
    } catch (err: any) {
      console.error('Error generating document:', err);
      alert(err?.response?.data?.message || 'Failed to generate document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGeneratedDoc = (id: string, type: 'mission' | 'vision') => {
    if (!confirm('Are you sure you want to delete this generated document?')) return;
    
    if (type === 'mission') {
      const updated = generatedMissionDocs.filter(doc => doc.id !== id);
      setGeneratedMissionDocs(updated);
      saveGeneratedDocuments('mission', updated);
    } else {
      const updated = generatedVisionDocs.filter(doc => doc.id !== id);
      setGeneratedVisionDocs(updated);
      saveGeneratedDocuments('vision', updated);
    }
  };

  // ==================== Mission & Vision Handlers ====================

const handleAddMission = async () => {
  if (!tempMission.trim()) {
    toast.error("Please enter a mission statement.");
    return;
  }
  if (tempMission.length > 255) {
    toast.error("Mission statement cannot exceed 255 characters.");
    return;
  }
  try {
    setIsSaving(true);
    const updated = await journalApi.updateJournal({ 
      ...journalData, 
      mission: tempMission.trim() 
    });
    setJournalData(updated);
    setTempMission('');
    setShowMissionEditor(false);
    toast.success("Mission statement added successfully!");
  } catch (err: any) {
    console.error('Error updating mission:', err);
    const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update mission. Please try again.';
    toast.error(errorMessage);
  } finally {
    setIsSaving(false);
  }
};

const handleUpdateMission = async () => {
  if (!tempMission.trim()) {
    toast.error("Please enter a mission statement.");
    return;
  }
  if (tempMission.length > 255) {
    toast.error("Mission statement cannot exceed 255 characters.");
    return;
  }
  try {
    setIsSaving(true);
    const updated = await journalApi.updateJournal({ 
      ...journalData, 
      mission: tempMission.trim() 
    });
    setJournalData(updated);
    setTempMission('');
    setShowMissionEditor(false);
    toast.success("Mission statement updated successfully!");
  } catch (err: any) {
    console.error('Error updating mission:', err);
    const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update mission. Please try again.';
    toast.error(errorMessage);
  } finally {
    setIsSaving(false);
  }
};

  const handleEditMission = () => {
    setTempMission(journalData.mission);
    setShowMissionEditor(true);
  };

  const clearMissionText = () => {
  if (journalData.mission && confirm('Are you sure you want to clear the mission text?')) {
    setTempMission('');
  }
};

  const handleAddVision = async () => {
  if (!newVision.trim()) {
    toast.error("Please enter a vision statement.");
    return;
  }
  if (newVision.length > 255) {
    toast.error("Vision statement cannot exceed 255 characters.");
    return;
  }
  try {
    setIsSaving(true);
    const updated = await journalApi.updateJournal({
      ...journalData,
      visions: [...journalData.visions, newVision.trim()]
    });
    setJournalData(updated);
    setNewVision('');
    setShowVisionEditor(false);
    toast.success("Vision statement added successfully!");
  } catch (err: any) {
    console.error('Error adding vision:', err);
    toast.error(err?.response?.data?.message || 'Failed to add vision. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

const clearVisionText = () => {
  if (editingVisionIndex !== null) {
    if (tempVision && confirm('Are you sure you want to clear the vision text?')) {
      setTempVision('');
    }
  } else {
    if (newVision && confirm('Are you sure you want to clear the vision text?')) {
      setNewVision('');
    }
  }
};

const handleUpdateVision = async () => {
  if (!tempVision.trim() || editingVisionIndex === null) {
    toast.error("Please enter a vision statement.");
    return;
  }
  if (tempVision.length > 255) {
    toast.error("Vision statement cannot exceed 255 characters.");
    return;
  }
  try {
    setIsSaving(true);
    const updatedVisions = [...journalData.visions];
    updatedVisions[editingVisionIndex] = tempVision.trim();
    const updated = await journalApi.updateJournal({
      ...journalData,
      visions: updatedVisions
    });
    setJournalData(updated);
    setTempVision('');
    setEditingVisionIndex(null);
    setShowVisionEditor(false);
    toast.success("Vision statement updated successfully!");
  } catch (err: any) {
    console.error('Error updating vision:', err);
    toast.error(err?.response?.data?.message || 'Failed to update vision. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

  const handleEditVision = (index: number) => {
    setEditingVisionIndex(index);
    setTempVision(journalData.visions[index]);
    setShowVisionEditor(true);
  };



  const handleDeleteVision = async (index: number) => {
    if (!confirm('Are you sure you want to delete this vision?')) return;
    try {
      setIsSaving(true);
      const updatedVisions = journalData.visions.filter((_, i) => i !== index);
      const updated = await journalApi.updateJournal({
        ...journalData,
        visions: updatedVisions
      });
      setJournalData(updated);
    } catch (err) {
      console.error('Error deleting vision:', err);
      alert('Failed to delete vision. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== Roadmap Handlers ====================
const validateAndAddGoal = () => {
  let isValid = true;
  
  // Validate goal title
  if (!newGoal.goal.trim()) {
    setGoalTitleError('Goal title is required');
    isValid = false;
  } else {
    setGoalTitleError('');
  }
  
  // Validate deadline
  if (!newGoal.deadline) {
    setGoalDeadlineError('Deadline is required');
    isValid = false;
  } else if (!validateDate(newGoal.deadline)) {
    setGoalDeadlineError('Please select a future date for the deadline');
    isValid = false;
  } else {
    setGoalDeadlineError('');
  }
  
  // Validate tasks - at least one task with content
  const hasValidTasks = newGoal.tasks.some(task => task.trim() !== '');
  if (!hasValidTasks) {
    setGoalTasksError('Please add at least one task');
    isValid = false;
  } else {
    setGoalTasksError('');
  }
  
  if (isValid) {
    addGoal();
  }
};

const addGoal = async () => {
  try {
    setIsSaving(true);
    const tasks = newGoal.tasks.filter(t => t.trim() !== '');
    const newRoadmapItem = {
      id: Date.now(),
      goal: newGoal.goal,
      tasks: tasks,
      completed: new Array(tasks.length).fill(false),
      deadline: newGoal.deadline
    };
    const updated = await journalApi.updateJournal({
      ...journalData,
      roadmap: [...journalData.roadmap, newRoadmapItem]
    });
    setJournalData(updated);
    setNewGoal({ goal: '', tasks: [''], deadline: '' });
    setShowAddGoalModal(false);
    // Clear errors
    setGoalTitleError('');
    setGoalDeadlineError('');
    setGoalTasksError('');
    toast.success('Goal added successfully!');
  } catch (err) {
    console.error('Error adding goal:', err);
    toast.error((err as any)?.response?.data?.message || 'Failed to add goal. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

  const openEditGoal = (goal: JournalData['roadmap'][0]) => {
    setEditingGoal({
      id: goal.id,
      goal: goal.goal,
      tasks: [...goal.tasks],
      deadline: goal.deadline
    });
    setShowEditGoalModal(true);
  };

const updateGoal = async () => {
  if (!editingGoal || !editingGoal.goal || !editingGoal.deadline) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Add date validation
  if (!validateDate(editingGoal.deadline)) {
    alert('Please select a future date for the deadline');
    return;
  }
  
  try {
    setIsSaving(true);
    const updatedRoadmap = journalData.roadmap.map(item => {
      if (item.id === editingGoal.id) {
        const tasks = editingGoal.tasks.filter(t => t.trim() !== '');
        return {
          ...item,
          goal: editingGoal.goal,
          tasks: tasks,
          completed: new Array(tasks.length).fill(false),
          deadline: editingGoal.deadline
        };
      }
      return item;
    });
    const updated = await journalApi.updateJournal({
      ...journalData,
      roadmap: updatedRoadmap
    });
    setJournalData(updated);
    setShowEditGoalModal(false);
    setEditingGoal(null);
  } catch (err) {
    console.error('Error updating goal:', err);
    alert('Failed to update goal. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

// Add this function after formatDate function (around line 275)
const formatDeadline = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

  const deleteGoal = async (goalId: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      setIsSaving(true);
      const updatedRoadmap = journalData.roadmap.filter(item => item.id !== goalId);
      const updated = await journalApi.updateJournal({
        ...journalData,
        roadmap: updatedRoadmap
      });
      setJournalData(updated);
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('Failed to delete goal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRoadmapTask = async (goalId: number, taskIndex: number) => {
    try {
      setIsSaving(true);
      const updatedRoadmap = journalData.roadmap.map(goal => {
        if (goal.id === goalId) {
          const newCompleted = [...goal.completed];
          newCompleted[taskIndex] = !newCompleted[taskIndex];
          return { ...goal, completed: newCompleted };
        }
        return goal;
      });
      const updated = await journalApi.updateJournal({
        ...journalData,
        roadmap: updatedRoadmap      });
      setJournalData(updated);
    } catch (err) {
      console.error('Error toggling task:', err);
      alert('Failed to update task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const addGoalTask = () => {
    if (editingGoal) {
      setEditingGoal({ ...editingGoal, tasks: [...editingGoal.tasks, ''] });
    } else {
      setNewGoal({ ...newGoal, tasks: [...newGoal.tasks, ''] });
    }
  };

  const updateGoalTask = (index: number, value: string) => {
    if (editingGoal) {
      const newTasks = [...editingGoal.tasks];
      newTasks[index] = value;
      setEditingGoal({ ...editingGoal, tasks: newTasks });
    } else {
      const newTasks = [...newGoal.tasks];
      newTasks[index] = value;
      setNewGoal({ ...newGoal, tasks: newTasks });
    }
  };

  const removeGoalTask = (index: number) => {
    if (editingGoal) {
      const newTasks = editingGoal.tasks.filter((_, i) => i !== index);
      setEditingGoal({ ...editingGoal, tasks: newTasks });
    } else {
      const newTasks = newGoal.tasks.filter((_, i) => i !== index);
      setNewGoal({ ...newGoal, tasks: newTasks });
    }
  };

  // ==================== Notes Handlers ====================
  const validateAndAddNote = () => {
  let isValid = true;
  
  // Validate title
  if (!newNote.title.trim()) {
    setNoteTitleError('Title is required');
    isValid = false;
  } else {
    setNoteTitleError('');
  }
  
  // Validate content
  if (!newNote.content.trim()) {
    setNoteContentError('Content is required');
    isValid = false;
  } else {
    setNoteContentError('');
  }
  
  // Validate checklist (if type is checkbox)
  if (newNote.type === 'checkbox') {
    const hasItems = newNote.checklist.some(item => item.trim() !== '');
    if (!hasItems) {
      setNoteChecklistError('Please add at least one checklist item');
      isValid = false;
    } else {
      setNoteChecklistError('');
    }
  }
  
  if (isValid) {
    addNote();
  }
};

const addNote = async () => {
  try {
    setIsSaving(true);
    const checklist = newNote.checklist.filter(item => item.trim() !== '');
    const noteData = {
      title: newNote.title,
      content: newNote.content,
      type: newNote.type,
      goal: newNote.goal,
      checklist: checklist,
      checkedItems: new Array(checklist.length).fill(false),
      sharedWith: newNote.sharedWith
    };
    const created = await journalApi.createNote(noteData);
    setNotes([created, ...notes]);
    setNewNote({
      title: '',
      content: '',
      type: 'checkbox',
      goal: '',
      checklist: [''],
      sharedWith: []
    });
    setShowNewNoteModal(false);
    // Clear errors
    setNoteTitleError('');
    setNoteContentError('');
    setNoteChecklistError('');
    toast.success('Note created successfully!');
  } catch (err) {
    console.error('Error creating note:', err);
    toast.error((err as any)?.response?.data?.message || 'Failed to add goal. Please try again.');
  } finally {
    setIsSaving(false);
  }
};
  const openEditNote = (note: Note) => {
    setEditingNote({ ...note });
    setShowEditNoteModal(true);
  };

  const updateNote = async () => {
    if (!editingNote) return;
    try {
      setIsSaving(true);
      await journalApi.updateNote(editingNote.id, {
        title: editingNote.title,
        content: editingNote.content,
        type: editingNote.type,
        goal: editingNote.goal,
        checklist: editingNote.checklist,
        checkedItems: editingNote.checkedItems,
        sharedWith: editingNote.sharedWith
      });
      
      setNotes(notes.map(n => n.id === editingNote.id ? editingNote : n));
      setShowEditNoteModal(false);
      setEditingNote(null);
    } catch (err) {
      console.error('Error updating note:', err);
      alert('Failed to update note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await journalApi.deleteNote(id);
      setNotes(notes.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note. Please try again.');
    }
  };

  const toggleChecklistItem = async (noteId: number, index: number) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      
      const newCheckedItems = [...note.checkedItems];
      newCheckedItems[index] = !newCheckedItems[index];
      
      await journalApi.updateNote(noteId, {
        checkedItems: newCheckedItems
      });
      
      setNotes(notes.map(n => 
        n.id === noteId ? { ...n, checkedItems: newCheckedItems } : n
      ));
    } catch (err) {
      console.error('Error toggling checklist item:', err);
      alert('Failed to update checklist. Please try again.');
    }
  };

  const shareNoteWithMentor = (note: Note) => {
    setSelectedNoteForShare(note);
    setShareEmail('');
    setShowShareModal(true);
  };

  const handleShareNote = async () => {
    if (!selectedNoteForShare || !shareEmail.trim()) return;
    try {
      setIsSaving(true);
      await journalApi.shareNote(selectedNoteForShare.id, shareEmail.trim());
      
      const updatedNotes = notes.map(note => {
        if (note.id === selectedNoteForShare.id) {
          return {
            ...note,
            sharedWith: [...note.sharedWith, shareEmail.trim()]
          };
        }
        return note;
      });
      setNotes(updatedNotes);
      setShowShareModal(false);
      setSelectedNoteForShare(null);
      setShareEmail('');
      alert('Note shared successfully!');
    } catch (err: any) {
      console.error('Error sharing note:', err);
      alert(err.response?.data?.message || 'Failed to share note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const addChecklistItem = () => {
    if (editingNote) {
      setEditingNote({ ...editingNote, checklist: [...editingNote.checklist, ''] });
    } else {
      setNewNote({ ...newNote, checklist: [...newNote.checklist, ''] });
    }
  };

  const updateChecklistItem = (index: number, value: string) => {
    if (editingNote) {
      const newChecklist = [...editingNote.checklist];
      newChecklist[index] = value;
      setEditingNote({ ...editingNote, checklist: newChecklist });
    } else {
      const newChecklist = [...newNote.checklist];
      newChecklist[index] = value;
      setNewNote({ ...newNote, checklist: newChecklist });
    }
  };

  const removeChecklistItem = (index: number) => {
    if (editingNote) {
      const newChecklist = editingNote.checklist.filter((_, i) => i !== index);
      setEditingNote({ ...editingNote, checklist: newChecklist });
    } else {
      const newChecklist = newNote.checklist.filter((_, i) => i !== index);
      setNewNote({ ...newNote, checklist: newChecklist });
    }
  };

  // ==================== Activities Handlers ====================

  const toggleActivityStatus = async (activityId: number) => {
    try {
      const updated = await journalApi.toggleActivityStatus(activityId);
      setActivities(activities.map(activity => 
        activity.id === activityId ? updated : activity
      ));
    } catch (err) {
      console.error('Error toggling activity:', err);
      alert('Failed to update activity. Please try again.');
    }
  };

  // Edit Activity State
const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
const [showEditActivityModal, setShowEditActivityModal] = useState(false);

const openEditActivity = (activity: Activity) => {
  // Parse the date from dd/mm/yyyy to yyyy-mm-dd for input
  let dateStr = '';
  if (activity.date) {
    const parts = activity.date.split('/');
    if (parts.length === 3) {
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  setEditingActivity({
    ...activity,
    date: dateStr
  });
  setShowEditActivityModal(true);
};

const updateActivity = async () => {
  if (!editingActivity) return;
  
  // Validate title
  if (!editingActivity.title.trim()) {
    toast.error('Activity title is required');
    return;
  }
  
  // Validate date
  if (!editingActivity.date) {
    toast.error('Please select a date');
    return;
  }
  
  const selectedDate = new Date(editingActivity.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (editingActivity.status === 'pending' && selectedDate < today) {
    toast.error('Pending activities must have today or a future date');
    return;
  }
  
  try {
    setIsSaving(true);
    
    // Format date to dd/mm/yyyy
    let formattedDate = editingActivity.date;
    if (editingActivity.date) {
      const dateObj = new Date(editingActivity.date);
      if (!isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        formattedDate = `${day}/${month}/${year}`;
      }
    }
    
    const updated = await journalApi.updateActivity(editingActivity.id, {
      title: editingActivity.title.trim(),
      date: formattedDate,
      status: editingActivity.status
    });
    
    setActivities(activities.map(a => a.id === editingActivity.id ? updated : a));
    setShowEditActivityModal(false);
    setEditingActivity(null);
    toast.success('Activity updated successfully!');
  } catch (err) {
    console.error('Error updating activity:', err);
    toast.error((err as any)?.response?.data?.message || 'Failed to update activity. Please try again.');
  } finally {
    setIsSaving(false);
  }
};
  
const handleActivityStatusChange = (status: 'pending' | 'completed') => {
  // Clear date error
  setActivityDateError('');
  
  // If switching to pending, check if current date is valid
  if (status === 'pending' && newActivity.date) {
    const selectedDate = new Date(newActivity.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If date is in the past, reset it
    if (selectedDate < today) {
      setNewActivity({ 
        ...newActivity, 
        status,
        date: '' 
      });
    } else {
      setNewActivity({ ...newActivity, status });
    }
  } else {
    setNewActivity({ ...newActivity, status });
  }
};

  // Validate activity title
const validateAndAddActivity = () => {
  let isValid = true;
  
  // Validate activity title
  if (!newActivity.title.trim()) {
    setActivityTitleError('Activity title is required');
    isValid = false;
  } else {
    setActivityTitleError('');
  }
  
  // Validate date based on status
  if (!newActivity.date) {
    setActivityDateError('Please select a date');
    isValid = false;
  } else {
    const selectedDate = new Date(newActivity.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newActivity.status === 'pending') {
      // For pending activities, date must be today or future
      if (selectedDate < today) {
        setActivityDateError('Pending activities must have today or a future date');
        isValid = false;
      } else {
        setActivityDateError('');
      }
    } else {
      // For completed activities, date can be past, present, or future
      setActivityDateError('');
    }
  }
  
  if (isValid) {
    addActivity();
  }
};
  

const addActivity = async () => {
  try {
    setIsSaving(true);
    
    // Format date to dd/mm/yyyy
    let formattedDate = newActivity.date;
    if (newActivity.date) {
      const dateObj = new Date(newActivity.date);
      // Check if date is valid
      if (!isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        formattedDate = `${day}/${month}/${year}`;
      }
    }
    
    const created = await journalApi.createActivity({
      title: newActivity.title.trim(),
      date: formattedDate,
      status: newActivity.status
    });
    
    setActivities([created, ...activities]);
    setNewActivity({ title: '', date: '', status: 'pending' });
    setShowAddActivityModal(false);
    setActivityTitleError('');
    setActivityDateError('');
    toast.success('Activity added successfully!');
  } catch (err) {
    console.error('Error adding activity:', err);
    toast.error((err as any)?.response?.data?.message || 'Failed to add activity. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

  const deleteActivity = async (id: number) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    try {
      await journalApi.deleteActivity(id);
      setActivities(activities.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting activity:', err);
      alert('Failed to delete activity. Please try again.');
    }
  };

  const getNoteTypeIcon = (type: string) => {
    switch(type) {
      case 'business-plan': return <BarChart3 className="w-4 h-4" />;
      case 'marketing-plan': return <TrendingUp className="w-4 h-4" />;
      case 'checkbox': return <CheckSquare className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // ==================== DOCUMENT VIEWER MODAL ====================

  const renderDocumentViewerModal = () => (
    showDocumentViewer && viewingDocument && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{viewingDocument.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {viewingDocument.templateName}
                </span>
                <span className="text-xs text-gray-500">
                  Generated: {formatDate(viewingDocument.createdAt)}
                </span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">
                  {viewingDocument.type}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportAsPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button 
                onClick={() => {
                  setShowDocumentViewer(false);
                  setViewingDocument(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div ref={documentRef} className="prose max-w-none p-0 bg-white rounded-lg overflow-auto max-h-[65vh]">
            <div dangerouslySetInnerHTML={{ __html: viewingDocument.content }} />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => {
                setShowDocumentViewer(false);
                setViewingDocument(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  );

  // ==================== TEMPLATE MODAL ====================

  const renderTemplateModal = () => (
    showTemplateModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {templateType === 'mission' ? 'Mission Statement' : 'Vision Statement'} Templates
              </h3>
              <p className="text-sm text-gray-500">
                {templateType === 'mission' 
                  ? 'Create a structured mission statement document' 
                  : 'Create a structured vision statement document'}
              </p>
            </div>
            <button 
              onClick={() => {
                setShowTemplateModal(false);
                setSelectedTemplate(null);
                setTemplateFormData({});
                setExpandedSections(new Set());
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {!selectedTemplate ? (
            // Template Selection
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(templateType === 'mission' ? MISSION_TEMPLATES : VISION_TEMPLATES).map((template) => (
                <div
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {template.name}
                      </h4>
                      <p className="text-sm text-gray-500">{template.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.sections.map(section => (
                          <span key={section.id} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {section.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {template.defaultQuestions.length} questions
                    </span>
                    <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Select →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Template Form
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setTemplateFormData({});
                      setExpandedSections(new Set());
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ← Back
                  </button>
                  <h4 className="font-semibold text-gray-800">{selectedTemplate.name}</h4>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {selectedTemplate.sections.length} sections
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {selectedTemplate.sections.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <h5 className="font-medium text-gray-800">{section.title}</h5>
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    {expandedSections.has(section.id) && (
                      <div className="p-4 space-y-4">
                        {section.questions.map((q) => (
                          <div key={q.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {q.text}
                            </label>
                            {renderFormInput(q, templateFormData[q.id])}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setTemplateFormData({});
                    setExpandedSections(new Set());
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={generateTemplateDocument}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutTemplate className="w-4 h-4" />}
                  Generate Document
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  );

  // ==================== EDIT GOAL MODAL ====================

  const renderEditGoalModal = () => (
    showEditGoalModal && editingGoal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Edit Goal</h3>
            <button 
              onClick={() => {
                setShowEditGoalModal(false);
                setEditingGoal(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title</label>
              <input
                type="text"
                value={editingGoal.goal}
                onChange={(e) => setEditingGoal({ ...editingGoal, goal: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter goal title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input
                type="date"
                value={editingGoal.deadline}
                onChange={(e) => setEditingGoal({ ...editingGoal, deadline: e.target.value })}
                 min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tasks</label>
              {editingGoal.tasks.map((task, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => updateGoalTask(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task"
                  />
                  {index === editingGoal.tasks.length - 1 && (
                    <button
                      onClick={addGoalTask}
                      className="p-2 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                  {editingGoal.tasks.length > 1 && (
                    <button
                      onClick={() => removeGoalTask(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditGoalModal(false);
                  setEditingGoal(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={updateGoal}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Goal'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const renderEditActivityModal = () => (
  showEditActivityModal && editingActivity && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Edit Activity</h3>
          <button 
            onClick={() => {
              setShowEditActivityModal(false);
              setEditingActivity(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editingActivity.title}
              onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter activity title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={editingActivity.status}
              onChange={(e) => setEditingActivity({ ...editingActivity, status: e.target.value as 'pending' | 'completed' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={editingActivity.date}
              onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
              min={editingActivity.status === 'pending' ? new Date().toISOString().split('T')[0] : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className={`text-xs mt-1 ${editingActivity.status === 'pending' ? 'text-amber-600' : 'text-gray-400'}`}>
              {editingActivity.status === 'pending' 
                ? '⚠️ Must be today or a future date' 
                : '✓ Can be any date (past or future)'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowEditActivityModal(false);
                setEditingActivity(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={updateActivity}
              disabled={isSaving || !editingActivity.title.trim() || !editingActivity.date}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Activity'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
);

  // ==================== EDIT NOTE MODAL ====================

  const renderEditNoteModal = () => (
    showEditNoteModal && editingNote && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Edit Note</h3>
            <button 
              onClick={() => {
                setShowEditNoteModal(false);
                setEditingNote(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note Title</label>
              <input
                type="text"
                value={editingNote.title}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter note title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note Type</label>
              <select
                value={editingNote.type}
                onChange={(e) => setEditingNote({ ...editingNote, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="checkbox">Checklist</option>
                <option value="business-plan">Business Plan</option>
                <option value="marketing-plan">Marketing Plan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={editingNote.content}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Write your note content"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Associated Goal</label>
              <input
                type="text"
                value={editingNote.goal || ''}
                onChange={(e) => setEditingNote({ ...editingNote, goal: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What goal does this note support?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Checklist Items</label>
              {editingNote.checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateChecklistItem(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter checklist item"
                  />
                  {index === editingNote.checklist.length - 1 && (
                    <button
                      onClick={addChecklistItem}
                      className="p-2 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                  {editingNote.checklist.length > 1 && (
                    <button
                      onClick={() => removeChecklistItem(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditNoteModal(false);
                  setEditingNote(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={updateNote}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // ==================== RENDER FUNCTIONS ====================

    // ==================== RENDER FUNCTIONS ====================

  // Render Mission Section
  const renderMission = () => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-800">Mission Statement</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openTemplateModal('mission')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" />
            Template
          </button>
          {journalData.mission ? (
            <>
              <button 
                onClick={handleEditMission}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              
              
            </>
          ) : (
            <button 
              onClick={() => setShowMissionEditor(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          )}
        </div>
      </div>

      {journalData.mission ? (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 min-h-[100px] overflow-hidden">
          <p className="text-gray-700 leading-relaxed break-words whitespace-pre-wrap">{journalData.mission}</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-5 border border-dashed border-gray-300 min-h-[100px] flex items-center justify-center">
          <p className="text-gray-400 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Add your mission here or use a template
          </p>
        </div>
      )}

      {/* Generated Mission Documents */}
      {generatedMissionDocs.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <LayoutTemplate className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-800">Generated Mission Documents</h4>
              <span className="text-sm text-gray-500">({generatedMissionDocs.length})</span>
            </div>
          </div>
          <div className="space-y-3">
            {generatedMissionDocs.map((doc) => (
              <div key={doc.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50/30 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-800">{doc.title}</h5>
                    <p className="text-xs text-gray-500">
                      {doc.templateName} • {formatDate(doc.createdAt)} 
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openDocumentViewer(doc)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteGeneratedDoc(doc.id, 'mission')}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mission Editor Modal */}
      {showMissionEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {journalData.mission ? 'Edit Mission Statement' : 'Add Mission Statement'}
              </h3>
              <div className="flex items-center gap-2">
                {tempMission && (
                  <button
                    onClick={() => {
                      if (confirm('Clear the mission text?')) {
                        setTempMission('');
                      }
                    }}
                    className="text-sm text-orange-500 hover:text-orange-700 px-3 py-1 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    Clear Text
                  </button>
                )}
                <button 
                  onClick={() => {
                    setShowMissionEditor(false);
                    setTempMission('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mission Statement (Maximum 255 characters)
                </label>
                <textarea
                  value={tempMission}
                  onChange={(e) => {
                    if (e.target.value.length <= 255) {
                      setTempMission(e.target.value);
                    } else {
                      toast.error("Mission statement cannot exceed 255 characters.");
                    }
                  }}
                  rows={4}
                  maxLength={255}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your mission statement..."
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-sm ${tempMission.length > 230 ? 'text-red-500' : 'text-gray-400'}`}>
                    {tempMission.length}/255 characters
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowMissionEditor(false);
                    setTempMission('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={journalData.mission ? handleUpdateMission : handleAddMission}
                  disabled={isSaving || !tempMission.trim() || tempMission.length > 255}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (journalData.mission ? 'Update Mission' : 'Add Mission')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roadmap */}
      {renderRoadmap()}
    </div>
  );

  // Render Vision Section
  const renderVision = () => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-800">Vision Statements</h3>
          <span className="text-sm text-gray-500">({journalData.visions.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openTemplateModal('vision')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" />
            Template
          </button>
          {journalData.visions.length > 0 && (
            <button 
              onClick={async () => {
                if (confirm('Are you sure you want to clear all vision statements?')) {
                  try {
                    setIsSaving(true);
                    const updated = await journalApi.updateJournal({ 
                      ...journalData, 
                      visions: [] 
                    });
                    setJournalData(updated);
                    toast.success('All vision statements cleared!');
                  } catch (err) {
                    toast.error('Failed to clear vision statements');
                  } finally {
                    setIsSaving(false);
                  }
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
          <button 
            onClick={() => {
              setNewVision('');
              setShowVisionEditor(true);
              setEditingVisionIndex(null);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Vision
          </button>
        </div>
      </div>

      {journalData.visions.length > 0 ? (
        <div className="space-y-3">
          {journalData.visions.map((vision, index) => (
            <div key={index} className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-indigo-600 font-bold text-sm mt-0.5">#{index + 1}</span>
                  <p className="text-gray-700 leading-relaxed text-sm flex-1 break-words whitespace-pre-wrap min-w-0">{vision}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button 
                    onClick={() => handleEditVision(index)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteVision(index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-5 border border-dashed border-gray-300 min-h-[100px] flex items-center justify-center">
          <p className="text-gray-400 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Add your vision here or use a template
          </p>
        </div>
      )}

      {/* Generated Vision Documents */}
      {generatedVisionDocs.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <LayoutTemplate className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-800">Generated Vision Documents</h4>
              <span className="text-sm text-gray-500">({generatedVisionDocs.length})</span>
            </div>
          </div>
          <div className="space-y-3">
            {generatedVisionDocs.map((doc) => (
              <div key={doc.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50/30 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-800">{doc.title}</h5>
                    <p className="text-xs text-gray-500">
                      {doc.templateName} • {formatDate(doc.createdAt)} 
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openDocumentViewer(doc)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteGeneratedDoc(doc.id, 'vision')}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vision Editor Modal */}
      {showVisionEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingVisionIndex !== null ? 'Edit Vision Statement' : 'Add Vision Statement'}
              </h3>
              <div className="flex items-center gap-2">
                {(editingVisionIndex !== null ? tempVision : newVision) && (
                  <button
                    onClick={() => {
                      if (confirm('Clear the vision text?')) {
                        if (editingVisionIndex !== null) {
                          setTempVision('');
                        } else {
                          setNewVision('');
                        }
                      }
                    }}
                    className="text-sm text-orange-500 hover:text-orange-700 px-3 py-1 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    Clear Text
                  </button>
                )}
                <button 
                  onClick={() => {
                    setShowVisionEditor(false);
                    setTempVision('');
                    setNewVision('');
                    setEditingVisionIndex(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vision Statement (Maximum 255 characters)
                </label>
                <textarea
                  value={editingVisionIndex !== null ? tempVision : newVision}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 255) {
                      if (editingVisionIndex !== null) {
                        setTempVision(value);
                      } else {
                        setNewVision(value);
                      }
                    } else {
                      toast.error("Vision statement cannot exceed 255 characters.");
                    }
                  }}
                  rows={4}
                  maxLength={255}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your vision statement..."
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-sm ${(editingVisionIndex !== null ? tempVision : newVision).length > 230 ? 'text-red-500' : 'text-gray-400'}`}>
                    {(editingVisionIndex !== null ? tempVision : newVision).length}/255 characters
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowVisionEditor(false);
                    setTempVision('');
                    setNewVision('');
                    setEditingVisionIndex(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={editingVisionIndex !== null ? handleUpdateVision : handleAddVision}
                  disabled={isSaving || !(editingVisionIndex !== null ? tempVision : newVision).trim() || (editingVisionIndex !== null ? tempVision : newVision).length > 255}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingVisionIndex !== null ? 'Update Vision' : 'Add Vision')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Roadmap Section
  const renderRoadmap = () => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mt-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ListChecks className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-800">Mission & Vision Roadmap</h3>
        </div>
        <button 
          onClick={() => setShowAddGoalModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      <div className="space-y-6">
        {journalData.roadmap.length > 0 ? (
          journalData.roadmap.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {item.completed.every(v => v === true) ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{item.goal}</h4>
                    <p className="text-sm text-gray-500">Deadline: {formatDeadline(item.deadline)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {item.completed.filter(v => v === true).length}/{item.tasks.length} completed
                  </span>
                  <button
                    onClick={() => openEditGoal(item)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteGoal(item.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="ml-8 space-y-2">
                {item.tasks.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <button
                      onClick={() => toggleRoadmapTask(item.id, idx)}
                      className="flex-shrink-0"
                    >
                      {item.completed[idx] ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                    <span className={`text-sm ${item.completed[idx] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {task}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <ListChecks className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No goals added yet. Click "Add Goal" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render Activities Section
  const renderActivities = () => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-800">Daily Activities</h3>
          <span className="text-sm text-gray-500">({activities.length})</span>
        </div>
        <button 
          onClick={() => setShowAddActivityModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Activity
        </button>
      </div>

      <div className="space-y-2">
        {activities.length > 0 ? (
          activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => toggleActivityStatus(activity.id)}
                className="flex-shrink-0 transition-transform hover:scale-110"
              >
                {activity.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
                )}
              </button>
              <span className={`text-gray-700 ${activity.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                {activity.title}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{formatDate(activity.date)}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                activity.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {activity.status}
              </span>
              <button
                onClick={() => openEditActivity(activity)}
                className="text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteActivity(activity.id)}
                className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No activities added yet. Click "Add Activity" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render Notes Section
  const renderNotes = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-800">My Notes</h3>
          <span className="text-sm text-gray-500">({notes.length})</span>
        </div>
        <button 
          onClick={() => setShowNewNoteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Note
        </button>
      </div>

      {notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getNoteTypeIcon(note.type)}
                  <h4 className="font-semibold text-gray-800">{note.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    {note.authorName}
                  </span>
                  <button 
                    onClick={() => shareNoteWithMentor(note)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditNote(note)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{note.content}</p>

              {note.goal && (
                <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Goal: {note.goal}</p>
                </div>
              )}

              {note.checklist && note.checklist.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
                  {note.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleChecklistItem(note.id, idx)}
                        className="flex-shrink-0"
                      >
                        {note.checkedItems && note.checkedItems[idx] ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                      <span className={`text-sm ${note.checkedItems && note.checkedItems[idx] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">{formatDate(note.date)}</span>
                {note.sharedWith.length > 0 && (
                  <span className="text-xs text-gray-400">
                    Shared with: {note.sharedWith.join(', ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No notes yet</h3>
          <p className="text-gray-500 mb-4">Create your first note to track your business ideas</p>
          <button
            onClick={() => setShowNewNoteModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Note
          </button>
        </div>
      )}
    </div>
  );

  // ==================== MODAL RENDER FUNCTIONS ====================

 const renderNewNoteModal = () => (
  showNewNoteModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Create New Note</h3>
          <button 
            onClick={() => {
              setShowNewNoteModal(false);
              setNoteTitleError('');
              setNoteContentError('');
              setNoteChecklistError('');
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newNote.title}
              onChange={(e) => {
                setNewNote({ ...newNote, title: e.target.value });
                if (noteTitleError) setNoteTitleError('');
              }}
              className={`w-full px-4 py-2 border ${noteTitleError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Enter note title"
            />
            {noteTitleError && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {noteTitleError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note Type</label>
            <select
              value={newNote.type}
              onChange={(e) => {
                setNewNote({ ...newNote, type: e.target.value });
                if (noteChecklistError) setNoteChecklistError('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="checkbox">Checklist</option>
              <option value="business-plan">Business Plan</option>
              <option value="marketing-plan">Marketing Plan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newNote.content}
              onChange={(e) => {
                setNewNote({ ...newNote, content: e.target.value });
                if (noteContentError) setNoteContentError('');
              }}
              rows={3}
              className={`w-full px-4 py-2 border ${noteContentError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Write your note content"
            />
            {noteContentError && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {noteContentError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Associated Goal</label>
            <input
              type="text"
              value={newNote.goal}
              onChange={(e) => setNewNote({ ...newNote, goal: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What goal does this note support?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Checklist Items {newNote.type === 'checkbox' && <span className="text-red-500">*</span>}
            </label>
            {newNote.checklist.map((item, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    updateChecklistItem(index, e.target.value);
                    if (noteChecklistError) setNoteChecklistError('');
                  }}
                  className={`flex-1 px-4 py-2 border ${noteChecklistError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Enter checklist item"
                />
                {index === newNote.checklist.length - 1 && (
                  <button
                    onClick={() => {
                      addChecklistItem();
                      if (noteChecklistError) setNoteChecklistError('');
                    }}
                    className="p-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
                {newNote.checklist.length > 1 && (
                  <button
                    onClick={() => removeChecklistItem(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            {noteChecklistError && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {noteChecklistError}
              </p>
            )}
            {newNote.type === 'checkbox' && (
              <p className="text-xs text-gray-400 mt-1">Add at least one checklist item</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowNewNoteModal(false);
                setNoteTitleError('');
                setNoteContentError('');
                setNoteChecklistError('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={validateAndAddNote}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
);

  // FIX 3: Add Activity Modal with proper date picker
const renderAddActivityModal = () => (
  showAddActivityModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Add New Activity</h3>
          <button 
            onClick={() => {
              setShowAddActivityModal(false);
              setActivityTitleError('');
              setActivityDateError('');
              // Reset form
              setNewActivity({ title: '', date: '', status: 'pending' });
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newActivity.title}
              onChange={(e) => {
                setNewActivity({ ...newActivity, title: e.target.value });
                if (activityTitleError) setActivityTitleError('');
              }}
              className={`w-full px-4 py-2 border ${activityTitleError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Enter activity title"
            />
            {activityTitleError && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {activityTitleError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={newActivity.status}
              onChange={(e) => handleActivityStatusChange(e.target.value as 'pending' | 'completed')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={newActivity.date}
              onChange={(e) => {
                setNewActivity({ ...newActivity, date: e.target.value });
                if (activityDateError) setActivityDateError('');
              }}
              min={newActivity.status === 'pending' ? new Date().toISOString().split('T')[0] : undefined}
              className={`w-full px-4 py-2 border ${activityDateError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            {activityDateError && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {activityDateError}
              </p>
            )}
            <p className={`text-xs mt-1 ${newActivity.status === 'pending' ? 'text-amber-600' : 'text-gray-400'}`}>
              {newActivity.status === 'pending' 
                ? '⚠️ Must be today or a future date' 
                : '✓ Can be any date (past or future)'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowAddActivityModal(false);
                setActivityTitleError('');
                setActivityDateError('');
                setNewActivity({ title: '', date: '', status: 'pending' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={validateAndAddActivity}
              disabled={isSaving || !newActivity.title.trim() || !newActivity.date}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Activity'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
);

  // Add Goal Modal
 const renderAddGoalModal = () => (
  showAddGoalModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Add New Goal</h3>
          <button 
            onClick={() => {
              setShowAddGoalModal(false);
              setGoalTitleError('');
              setGoalDeadlineError('');
              setGoalTasksError('');
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newGoal.goal}
              onChange={(e) => {
                setNewGoal({ ...newGoal, goal: e.target.value });
                if (goalTitleError) setGoalTitleError('');
              }}
              className={`w-full px-4 py-2 border ${goalTitleError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Enter goal title"
            />
            {goalTitleError && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {goalTitleError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={newGoal.deadline}
              onChange={(e) => {
                setNewGoal({ ...newGoal, deadline: e.target.value });
                if (goalDeadlineError) setGoalDeadlineError('');
              }}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-2 border ${goalDeadlineError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            {goalDeadlineError && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {goalDeadlineError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasks <span className="text-red-500">*</span>
            </label>
            {newGoal.tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={task}
                  onChange={(e) => {
                    updateGoalTask(index, e.target.value);
                    if (goalTasksError) setGoalTasksError('');
                  }}
                  className={`flex-1 px-4 py-2 border ${goalTasksError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Enter task"
                />
                {index === newGoal.tasks.length - 1 && (
                  <button
                    onClick={() => {
                      addGoalTask();
                      if (goalTasksError) setGoalTasksError('');
                    }}
                    className="p-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
                {newGoal.tasks.length > 1 && (
                  <button
                    onClick={() => removeGoalTask(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            {goalTasksError && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {goalTasksError}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">Add at least one task</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowAddGoalModal(false);
                setGoalTitleError('');
                setGoalDeadlineError('');
                setGoalTasksError('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={validateAndAddGoal}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Goal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
);

  // Share Note Modal
  const renderShareModal = () => (
    showShareModal && selectedNoteForShare && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Share Note with Mentor</h3>
            <button 
              onClick={() => setShowShareModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mentor Email</label>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Enter mentor email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleShareNote}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your journal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 border border-red-200 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">Error Loading Journal</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadAllData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Business Journal</h1>
              <p className="text-sm text-gray-500">Track your mission, activities, and growth</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'mission', label: 'Mission', icon: Target },
            { id: 'vision', label: 'Vision', icon: Eye },
            { id: 'activities', label: 'Activities', icon: Calendar },
            { id: 'notes', label: 'Notes', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => router.push('/learn/business-journal/documents')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'mission' && renderMission()}
          {activeTab === 'vision' && renderVision()}
          {activeTab === 'activities' && renderActivities()}
          {activeTab === 'notes' && renderNotes()}
        </div>
      </div>

      {/* Modals */}
      {renderNewNoteModal()}
      {renderAddActivityModal()}
      {renderEditActivityModal()}
      {renderAddGoalModal()}
      {renderShareModal()}
      {renderTemplateModal()}
      {renderEditGoalModal()}
      {renderEditNoteModal()}
      {renderDocumentViewerModal()}
    </div>
  );
};

export default BusinessJournal;