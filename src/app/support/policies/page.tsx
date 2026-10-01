'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  PlusCircle, 
  Search, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  X,
  AlertCircle,
  Lock,
  Layers
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';

interface PolicyItem {
  id: string;
  policy_code: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  authority_limit: number;
  requires_human_review: boolean;
  is_active: boolean;
  version: string;
  updated_at: string;
}

export default function PoliciesExplorerPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // Create Policy Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Refund');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newLimit, setNewLimit] = useState('150.00');
  const [newReviewRequired, setNewReviewRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, [categoryFilter, searchQuery]);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/policies?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/support/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
      }
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle || !newContent) {
      showToast('Please fill all required policy fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyCode: newCode.trim(),
          title: newTitle.trim(),
          category: newCategory,
          summary: newSummary.trim() || newTitle.trim(),
          content: newContent.trim(),
          authorityLimit: parseFloat(newLimit || '100.00'),
          requiresHumanReview: newReviewRequired,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        setNewCode('');
        setNewTitle('');
        setNewSummary('');
        setNewContent('');
        showToast('Policy indexed into RAG Knowledge Base successfully.', 'success');
        await fetchPolicies();
      } else {
        showToast(data.error || 'Failed to create policy', 'error');
      }
    } catch (err) {
      showToast('Network error creating policy.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-elevated text-xs font-medium border flex items-center gap-2 animate-in slide-in-from-top-2 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/support/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6A66] hover:text-[#212121] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Case Queue
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#212121] flex items-center gap-2.5">
              <FileText className="w-7 h-7 text-[#7A6555]" />
              Policy Knowledge Base (RAG)
            </h1>
            <p className="text-xs text-[#6E6A66] mt-1">
              Active company policies governing autonomous AI resolution authority, refund thresholds, and human escalation rules.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#323232] text-white hover:bg-[#1F1F1F] text-xs font-semibold transition-colors shadow-card self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-[#DDD0C8]" />
            Add New Policy to RAG
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-[#DDD0C8] rounded-2xl p-4 shadow-subtle mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#8F8781] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policy code, title, or rule..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-1 focus:ring-[#323232] bg-[#FAF8F5] text-[#212121]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-[#6E6A66]">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-[#DDD0C8] focus:outline-none bg-[#FAF8F5] text-[#212121]"
            >
              <option value="ALL">All Categories</option>
              <option value="Refund">Refunds</option>
              <option value="Payment">Payments & Billing</option>
              <option value="Delivery">Delivery & Transit</option>
              <option value="Order">Order Management</option>
              <option value="Subscription">Subscriptions</option>
              <option value="Security">Security & High Risk</option>
              <option value="VIP">VIP Priority</option>
              <option value="Account">Account Access</option>
            </select>
          </div>
        </div>

        {/* Policies Grid */}
        {loading ? (
          <div className="bg-white border border-[#DDD0C8] rounded-2xl p-12 text-center text-xs text-[#6E6A66]">
            <Sparkles className="w-6 h-6 text-[#7A6555] animate-spin mx-auto mb-2" />
            Retrieving policy vectors from knowledge base...
          </div>
        ) : policies.length === 0 ? (
          <div className="bg-white border border-[#DDD0C8] rounded-2xl p-12 text-center space-y-3 shadow-subtle">
            <FileText className="w-8 h-8 text-[#7A6555] mx-auto" />
            <h3 className="font-bold text-base text-[#212121]">No Policies Found</h3>
            <p className="text-xs text-[#6E6A66]">Try refining your search terms or add a new policy.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {policies.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-[#EBE4DD] hover:border-[#DDD0C8] rounded-2xl p-5 shadow-subtle flex flex-col justify-between space-y-4 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#59493E] bg-[#F2ECE6] px-2 py-0.5 rounded border border-[#DDD0C8]">
                      {p.policy_code}
                    </span>
                    <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-bold">
                      {p.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#212121] leading-tight">{p.title}</h3>

                  <p className="text-xs text-[#6E6A66] leading-relaxed line-clamp-3">
                    {p.summary}
                  </p>

                  <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EFE8E1] text-[11px] text-[#4A423C] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8F8781]">Autonomous Authority:</span>
                      <strong className="text-emerald-800">${parseFloat(p.authority_limit.toString()).toFixed(2)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8F8781]">Human Sign-off:</span>
                      <strong className={p.requires_human_review ? 'text-rose-700' : 'text-stone-700'}>
                        {p.requires_human_review ? 'Mandatory' : 'Conditional'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0EAE4] flex items-center justify-between text-[10px] text-[#8F8781]">
                  <span>Vector Index: Active</span>
                  <span>Updated {new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#DDD0C8] rounded-2xl w-full max-w-xl shadow-elevated p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E8DFD7] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7A6555]" />
                <h3 className="font-bold text-base text-[#212121]">Add New Policy Document</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[#6E6A66] hover:text-[#212121]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#323232] mb-1">Policy Code *</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. POL-026"
                    className="w-full p-2.5 rounded-lg border border-[#DDD0C8] bg-[#FAF8F5] text-[#212121]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#323232] mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#DDD0C8] bg-[#FAF8F5] text-[#212121]"
                  >
                    <option value="Refund">Refund</option>
                    <option value="Payment">Payment</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Order">Order</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Security">Security</option>
                    <option value="VIP">VIP</option>
                    <option value="Account">Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#323232] mb-1">Policy Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Expedited Replacement for Defective Audio Gear"
                  className="w-full p-2.5 rounded-lg border border-[#DDD0C8] bg-[#FAF8F5] text-[#212121]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#323232] mb-1">Summary (1-2 sentences) *</label>
                <input
                  type="text"
                  required
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Brief summary of governing criteria"
                  className="w-full p-2.5 rounded-lg border border-[#DDD0C8] bg-[#FAF8F5] text-[#212121]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#323232] mb-1">AI Authority Limit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#DDD0C8] bg-[#FAF8F5] text-[#212121]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="chkReview"
                    checked={newReviewRequired}
                    onChange={(e) => setNewReviewRequired(e.target.checked)}
                    className="rounded border-[#DDD0C8]"
                  />
                  <label htmlFor="chkReview" className="font-semibold text-[#323232]">
                    Requires Human Review
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#323232] mb-1">Full Policy Clauses & Rules *</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="1. Conditions... 2. Automated Action... 3. Escalation threshold..."
                  className="w-full p-2.5 rounded-lg border border-[#DDD0C8] bg-[#FAF8F5] text-[#212121]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8DFD7] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#6E6A66] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-[#323232] text-white hover:bg-[#1F1F1F] text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? 'Indexing Vector...' : 'Save & Index Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
