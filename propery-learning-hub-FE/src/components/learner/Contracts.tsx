'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Description,
  Download,
  Visibility,
  Send,
  Search,
  Add,
  ShoppingCart,
  Close,
  CheckCircle,
  Edit,
  Delete,
  CloudUpload,
} from '@mui/icons-material';
import { contractsApi, ContractTemplate, CreateTemplatePayload } from '../../services/contractsApi';

// ── Types ──────────────────────────────────────────────────────────────────

interface CartItem {
  id: number;
  title: string;
  price: number;
}

// ── Toast ──────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }

const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
};

const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all animate-fade-in
          ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}
      >
        {t.message}
      </div>
    ))}
  </div>
);

// ── Template Form Modal ────────────────────────────────────────────────────

interface TemplateFormProps {
  initial?: ContractTemplate | null;
  onClose: () => void;
  onSaved: (template: ContractTemplate) => void;
  toast: (msg: string, type?: ToastType) => void;
}

const CATEGORIES = ['Purchase', 'Lease', 'Partnership', 'Disclosure', 'Finance', 'Other'];

const TemplateFormModal: React.FC<TemplateFormProps> = ({ initial, onClose, onSaved, toast }) => {
  const isEdit = !!initial;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    category: initial?.category ?? CATEGORIES[0],
    description: initial?.description ?? '',
    price: initial?.price ?? 0,
    is_global: initial?.isGlobal ?? false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const payload: CreateTemplatePayload = {
        ...form,
        price: Number(form.price),
        ...(file ? { file } : {}),
      };
      const res = isEdit
        ? await contractsApi.update(initial!.id, payload)
        : await contractsApi.create(payload);

      onSaved(res.data);
      toast(isEdit ? 'Template updated' : 'Template created', 'success');
      onClose();
    } catch (err: unknown) {
      toast((err as Error).message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Template' : 'Create Template'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Close className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Residential Purchase Agreement"
            />
          </div>

          {/* Category + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Briefly describe this template..."
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document File <span className="text-gray-400 font-normal">(PDF / DOC / DOCX, max 20 MB)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <CloudUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              {file ? (
                <p className="text-sm text-blue-600 font-medium">{file.name}</p>
              ) : initial?.hasFile ? (
                <p className="text-sm text-gray-500">Current: <span className="font-medium">{initial.fileName}</span> — click to replace</p>
              ) : (
                <p className="text-sm text-gray-500">Click to upload or drag & drop</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Visibility */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, is_global: !f.is_global }))}
              className={`relative w-10 h-6 rounded-full transition-colors ${form.is_global ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_global ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm text-gray-700">Make visible to all learners</span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── E-Sign Modal ───────────────────────────────────────────────────────────

interface ESignModalProps {
  template: ContractTemplate;
  onClose: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

const ESignModal: React.FC<ESignModalProps> = ({ template, onClose, toast }) => {
  const [signers, setSigners] = useState([{ name: '', email: '' }]);
  const [subject, setSubject] = useState(`Please sign: ${template.title}`);
  const [sending, setSending] = useState(false);

  const addSigner = () => setSigners(s => [...s, { name: '', email: '' }]);
  const removeSigner = (i: number) => setSigners(s => s.filter((_, idx) => idx !== i));
  const updateSigner = (i: number, field: 'name' | 'email', value: string) =>
    setSigners(s => s.map((sg, idx) => idx === i ? { ...sg, [field]: value } : sg));

  const handleSend = async () => {
    const valid = signers.every(s => s.name.trim() && s.email.includes('@'));
    if (!valid) { toast('Please fill all signer fields with valid emails', 'error'); return; }
    setSending(true);
    try {
      const res = await contractsApi.esign(template.id, { signers, email_subject: subject });
      toast(res.message || 'E-sign request sent', 'success');
      onClose();
    } catch (err: unknown) {
      toast((err as Error).message || 'Failed to send e-sign request', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Send for E-Signature</h2>
            <p className="text-xs text-gray-500 mt-0.5">{template.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Close className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Signers</label>
              <button onClick={addSigner} className="text-xs text-blue-600 font-medium hover:underline">+ Add signer</button>
            </div>
            <div className="space-y-3">
              {signers.map((sg, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={sg.name}
                    onChange={e => updateSigner(i, 'name', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={sg.email}
                    onChange={e => updateSigner(i, 'email', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {signers.length > 1 && (
                    <button onClick={() => removeSigner(i)} className="text-gray-400 hover:text-red-500">
                      <Close className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Cart Modal ─────────────────────────────────────────────────────────────

interface CartModalProps {
  cartItems: CartItem[];
  onRemove: (id: number) => void;
  onPurchase: (id: number) => void;
  onCheckoutAll: () => void;
  onClose: () => void;
  purchasingId: number | null;
}

const CartModal: React.FC<CartModalProps> = ({ cartItems, onRemove, onPurchase, onCheckoutAll, onClose, purchasingId }) => {
  const total = cartItems.reduce((sum, t) => sum + t.price, 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Close className="w-6 h-6" /></button>
        </div>

        {cartItems.length === 0 ? (
          <p className="text-gray-500 text-center py-10">Your cart is empty</p>
        ) : (
          <>
            <div className="px-6 py-4 space-y-4 max-h-72 overflow-y-auto">
              {cartItems.map(t => (
                <div key={t.id} className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
                    <p className="text-gray-500 text-sm">£{t.price}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onPurchase(t.id)}
                      disabled={purchasingId === t.id}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-60"
                    >
                      {purchasingId === t.id ? '...' : 'Buy Now'}
                    </button>
                    <button
                      onClick={() => onRemove(t.id)}
                      className="text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded font-medium hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-gray-900">£{total}</span>
              </div>
              <button
                onClick={onCheckoutAll}
                disabled={!!purchasingId}
                className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-60"
              >
                {purchasingId ? 'Processing...' : 'Checkout All'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

const Contracts: React.FC = () => {
  const { toasts, show: toast } = useToast();

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Cart: stores full items for display
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [eSignTemplate, setESignTemplate] = useState<ContractTemplate | null>(null);

  // Action loading states
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Load templates ───────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await contractsApi.list({ search: searchTerm || undefined });
      setTemplates(res.data);
    } catch (err: unknown) {
      toast((err as Error).message || 'Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(loadTemplates, 300); // debounce search
    return () => clearTimeout(timer);
  }, [loadTemplates]);

  // ── Cart helpers ─────────────────────────────────────────────────

  const isInCart = (id: number) => cartItems.some(c => c.id === id);

  const addToCart = (template: ContractTemplate) => {
    if (!isInCart(template.id)) {
      setCartItems(prev => [...prev, { id: template.id, title: template.title, price: template.price }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCartItems(prev => prev.filter(c => c.id !== id));
  };

  // ── Purchase ─────────────────────────────────────────────────────

  const handlePurchase = async (id: number) => {
    setPurchasingId(id);
    try {
      const res = await contractsApi.purchase(id);
      // Update template in local state
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, purchased: true } : t));
      removeFromCart(id);
      toast(res.message || 'Purchase successful!', 'success');
    } catch (err: unknown) {
      const msg = (err as Error).message || '';
      if (msg.toLowerCase().includes('payment') || msg.includes('402')) {
        toast('Payment required — Stripe coming soon', 'info');
      } else {
        toast(msg || 'Purchase failed', 'error');
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const handleCheckoutAll = async () => {
    for (const item of cartItems) {
      await handlePurchase(item.id);
    }
    setShowCart(false);
  };

  // ── Download ─────────────────────────────────────────────────────

  const handleDownload = async (template: ContractTemplate) => {
    if (!template.purchased) { toast('Please purchase this template first', 'error'); return; }
    if (!template.hasFile) { toast('No file attached to this template', 'info'); return; }
    setDownloadingId(template.id);
    try {
      await contractsApi.download(template.id, template.fileName || 'contract');
      toast('Download started', 'success');
    } catch (err: unknown) {
      toast((err as Error).message || 'Download failed', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────

  const handleDelete = async (template: ContractTemplate) => {
    if (!confirm(`Delete "${template.title}"? This cannot be undone.`)) return;
    setDeletingId(template.id);
    try {
      await contractsApi.remove(template.id);
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      toast('Template deleted', 'success');
    } catch (err: unknown) {
      toast((err as Error).message || 'Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Form saved callback ──────────────────────────────────────────

  const handleSaved = (saved: ContractTemplate) => {
    setTemplates(prev => {
      const exists = prev.find(t => t.id === saved.id);
      return exists
        ? prev.map(t => t.id === saved.id ? saved : t)
        : [saved, ...prev];
    });
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="p-6 bg-white min-h-screen">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contracts & Templates</h1>
        <p className="text-gray-600">Ready-to-use resources with e-sign option</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={() => setShowCart(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50"
        >
          <ShoppingCart className="w-5 h-5" />
          Cart ({cartItems.length})
        </button>

        <button
          onClick={() => { setEditingTemplate(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Add className="w-5 h-5" />
          Create
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && templates.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <Description className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No templates found</p>
          <p className="text-sm mt-1">Try a different search or create your own.</p>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 pr-2">{template.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    {template.purchased && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {template.isOwner && (
                      <>
                        <button
                          onClick={() => { setEditingTemplate(template); setShowForm(true); }}
                          className="text-gray-400 hover:text-blue-600 p-0.5"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          disabled={deletingId === template.id}
                          className="text-gray-400 hover:text-red-600 p-0.5 disabled:opacity-50"
                          title="Delete"
                        >
                          <Delete className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{template.category}</p>
                <p className="text-gray-700 mb-4 text-sm">{template.description}</p>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="text-2xl font-bold text-gray-900">
                  {template.price === 0 ? 'Free' : `$${template.price}`}
                </div>
                {template.purchased && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    Purchased
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => toast(`Preview: ${template.title}`, 'info')}
                    className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                  >
                    <Visibility className="w-4 h-4 inline mr-1" />
                    Preview
                  </button>

                  {template.purchased ? (
                    <button
                      onClick={() => handleDownload(template)}
                      disabled={downloadingId === template.id || !template.hasFile}
                      className="flex-1 py-2 px-3 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Download className="w-4 h-4 inline mr-1" />
                      {downloadingId === template.id ? 'Downloading...' : 'Download'}
                    </button>
                  ) : isInCart(template.id) ? (
                    <div className="flex gap-2 flex-1">
                      <button
                        onClick={() => removeFromCart(template.id)}
                        className="flex-1 py-2 px-3 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => handlePurchase(template.id)}
                        disabled={purchasingId === template.id}
                        className="flex-1 py-2 px-3 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                      >
                        {purchasingId === template.id ? '...' : 'Buy Now'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => template.price === 0 ? handlePurchase(template.id) : addToCart(template)}
                      disabled={purchasingId === template.id}
                      className="flex-1 py-2 px-3 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                    >
                      {purchasingId === template.id ? '...' : template.price === 0 ? 'Get Free' : 'Add to Cart'}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (template.price > 0 && !template.purchased) {
                      toast('Please purchase this template first', 'error');
                      return;
                    }
                    setESignTemplate(template);
                  }}
                  className="w-full py-2 px-3 border border-blue-600 text-blue-600 rounded text-sm font-medium hover:bg-blue-50 flex items-center justify-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send for E-Signature
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">+ fees</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCart && (
        <CartModal
          cartItems={cartItems}
          onRemove={removeFromCart}
          onPurchase={handlePurchase}
          onCheckoutAll={handleCheckoutAll}
          onClose={() => setShowCart(false)}
          purchasingId={purchasingId}
        />
      )}

      {showForm && (
        <TemplateFormModal
          initial={editingTemplate}
          onClose={() => { setShowForm(false); setEditingTemplate(null); }}
          onSaved={handleSaved}
          toast={toast}
        />
      )}

      {eSignTemplate && (
        <ESignModal
          template={eSignTemplate}
          onClose={() => setESignTemplate(null)}
          toast={toast}
        />
      )}
    </div>
  );
};

export default Contracts;