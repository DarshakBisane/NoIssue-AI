'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  User, 
  Headphones, 
  ShieldCheck, 
  FileText, 
  Package, 
  CreditCard, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  RotateCcw, 
  Check, 
  Flame, 
  XCircle,
  EyeOff,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';

export default function SupportTicketWorkbenchPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PACKET' | 'CUSTOMER' | 'ORDERS' | 'PAYMENTS' | 'POLICY' | 'AUDIT'>('PACKET');
  
  // Agent Actions
  const [actionType, setActionType] = useState<'REPLY' | 'INTERNAL_NOTE' | 'MODIFY_RESOLVE' | 'CLOSE'>('REPLY');
  const [actionText, setActionText] = useState('');
  const [customResolution, setCustomResolution] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchWorkbenchData();
  }, [ticketId]);

  const fetchWorkbenchData = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/support/login');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load support ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (forcedType?: string) => {
    const targetType = forcedType || actionType;
    if ((targetType === 'REPLY' || targetType === 'INTERNAL_NOTE') && !actionText.trim()) {
      showToast('Please enter a message.', 'error');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: targetType,
          messageText: actionText.trim(),
          resolutionSummary: customResolution.trim() || undefined,
        }),
      });

      const resJson = await res.json();

      if (res.ok) {
        setActionText('');
        setCustomResolution('');
        showToast(resJson.message || 'Action executed successfully.', 'success');
        await fetchWorkbenchData();
      } else {
        showToast(resJson.error || 'Failed to execute action', 'error');
      }
    } catch (err) {
      showToast('Network error executing action.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-[#7A6555] animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || !data.ticket) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl border border-[#DDD0C8] text-center max-w-md">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-[#212121]">Ticket Not Found</h2>
            <p className="text-xs text-[#6E6A66] mt-1 mb-4">The requested case could not be located.</p>
            <Link href="/support/dashboard" className="px-4 py-2 rounded-lg bg-[#323232] text-white text-xs font-semibold">
              Return to Case Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { ticket, customer, messages, investigation, escalation, customerOrders, customerPayments, pastTickets, auditEvents } = data;

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

      {/* Workbench Header */}
      <div className="bg-white border-b border-[#DDD0C8] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/support/dashboard"
              className="p-2 rounded-lg border border-[#E0D5CC] hover:bg-[#FAF8F5] text-[#6E6A66] hover:text-[#212121] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#59493E] bg-[#F2ECE6] px-2.5 py-0.5 rounded border border-[#DDD0C8]">
                  {ticket.ticketNumber}
                </span>
                <StatusBadge status={ticket.status} size="sm" />
                <StatusBadge priority={ticket.priority} size="sm" />
                {investigation && (
                  <StatusBadge verification={investigation.verificationStatus} size="sm" />
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-[#212121] mt-0.5">{ticket.subject}</h1>
            </div>
          </div>

          {/* Quick Action Pill Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExecuteAction('APPROVE_AI')}
              disabled={submittingAction || ticket.status === 'RESOLVED'}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              Approve AI Action
            </button>

            <button
              onClick={() => handleExecuteAction('ESCALATE')}
              disabled={submittingAction || ticket.status === 'ESCALATED'}
              className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-40"
            >
              <Flame className="w-3.5 h-3.5" />
              Escalate Tier-2
            </button>

            <button
              onClick={() => handleExecuteAction('CLOSE')}
              disabled={submittingAction || ticket.status === 'CLOSED'}
              className="px-3 py-1.5 rounded-lg border border-[#DDD0C8] bg-[#FAF8F5] hover:bg-[#F2ECE6] text-[#323232] text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <XCircle className="w-3.5 h-3.5 text-[#6E6A66]" />
              Close (5-Day Retention)
            </button>
          </div>
        </div>
      </div>

      {/* 2-Column Master Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* =========================================================================
              LEFT COLUMN: Conversation, AI Summary, Agent Response Bar (7 Cols)
             ========================================================================= */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* AI Investigation Packet Highlight Box */}
            {investigation && (
              <div className="bg-[#FAF8F5] border border-[#DDD0C8] rounded-2xl p-4 shadow-subtle space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8DFD7] pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#7A6555]" />
                    <span className="text-xs font-bold text-[#212121] uppercase tracking-wider">AI Investigation Diagnosis</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#59493E]">
                    Gate: <strong className="uppercase text-[#212121]">{investigation.decisionOutcome}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-[#EBE4DD]">
                    <span className="text-[10px] text-[#8F8781] uppercase font-bold block">Root Cause</span>
                    <span className="font-semibold text-[#212121]">{investigation.rootCause || 'Under review'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-[#EBE4DD]">
                    <span className="text-[10px] text-[#8F8781] uppercase font-bold block">Recommended Action</span>
                    <span className="font-semibold text-emerald-800">{investigation.recommendedAction || 'General Support Review'}</span>
                  </div>
                </div>

                {investigation.verificationReason && (
                  <div className="text-xs bg-[#F2ECE6] p-2.5 rounded-xl border border-[#E0D5CC] text-[#4A423C]">
                    <strong className="text-[#212121]">Verification Reason:</strong> {investigation.verificationReason}
                  </div>
                )}
              </div>
            )}

            {/* Conversation Log */}
            <div className="bg-white border border-[#DDD0C8] rounded-2xl p-5 shadow-card space-y-4">
              <h3 className="text-xs font-bold text-[#6E6A66] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#7A6555]" />
                Customer & Agent Messages (Internal Notes Highlighted)
              </h3>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {messages.map((m: any) => {
                  const isCustomer = m.senderRole === 'CUSTOMER';
                  const isAI = m.senderRole === 'AI';
                  const isInternal = Boolean(m.isInternal);

                  if (m.senderRole === 'SYSTEM') {
                    return (
                      <div key={m.id} className="text-center my-2">
                        <span className="text-[10px] bg-[#F5EFEA] text-[#6E6A66] px-2.5 py-0.5 rounded-full border border-[#E5DDD5]">
                          {m.messageText} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl text-xs space-y-1 ${
                        isInternal
                          ? 'bg-amber-50 border border-amber-300 text-amber-950'
                          : isCustomer
                          ? 'bg-[#FAF8F5] border border-[#E2D7CF] text-[#212121]'
                          : isAI
                          ? 'bg-white border border-[#DDD0C8] text-[#323232]'
                          : 'bg-purple-50 border border-purple-200 text-purple-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold">
                          {isInternal && (
                            <span className="flex items-center gap-1 text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded uppercase">
                              <EyeOff className="w-3 h-3" /> Internal Note
                            </span>
                          )}
                          <span>{m.senderName}</span>
                          {isCustomer && <span className="text-[10px] text-[#8F8781] font-normal">(Customer)</span>}
                        </div>
                        <span className="text-[10px] text-[#8F8781]">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="whitespace-pre-wrap leading-relaxed">
                        {m.messageText}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Form */}
              <div className="pt-4 border-t border-[#EFE8E1] space-y-3">
                {/* Action Mode Selector */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('REPLY')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      actionType === 'REPLY'
                        ? 'bg-[#323232] text-white shadow-sm'
                        : 'bg-[#FAF8F5] text-[#6E6A66] hover:bg-[#F2ECE6]'
                    }`}
                  >
                    Reply to Customer
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('INTERNAL_NOTE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      actionType === 'INTERNAL_NOTE'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-[#FAF8F5] text-[#6E6A66] hover:bg-[#F2ECE6]'
                    }`}
                  >
                    Add Internal Note
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('MODIFY_RESOLVE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      actionType === 'MODIFY_RESOLVE'
                        ? 'bg-teal-700 text-white shadow-sm'
                        : 'bg-[#FAF8F5] text-[#6E6A66] hover:bg-[#F2ECE6]'
                    }`}
                  >
                    Custom Resolution
                  </button>
                </div>

                {/* Custom Resolution Summary field if in modify mode */}
                {actionType === 'MODIFY_RESOLVE' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#323232] mb-1">
                      Official Resolution Summary (Customer will see this):
                    </label>
                    <input
                      type="text"
                      value={customResolution}
                      onChange={(e) => setCustomResolution(e.target.value)}
                      placeholder="e.g. Issued courtesy $25 credit and expedited replacement shipment"
                      className="w-full text-xs p-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-1 focus:ring-[#323232] bg-[#FAF8F5] text-[#212121]"
                    />
                  </div>
                )}

                {/* Message Box */}
                <textarea
                  rows={3}
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  placeholder={
                    actionType === 'INTERNAL_NOTE'
                      ? 'Write a private note for other support agents...'
                      : actionType === 'MODIFY_RESOLVE'
                      ? 'Write a response to the customer explaining the resolution...'
                      : 'Write your reply to the customer...'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-[#FAF8F5] text-[#212121]"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8F8781]">
                    {actionType === 'INTERNAL_NOTE'
                      ? '🔒 Internal notes are NEVER visible to customers.'
                      : '✉️ Reply will be sent directly to customer.'}
                  </span>

                  <button
                    type="button"
                    disabled={submittingAction || !actionText.trim()}
                    onClick={() => handleExecuteAction()}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                      actionType === 'INTERNAL_NOTE' ? 'bg-amber-700 hover:bg-amber-800' : 'bg-[#323232] hover:bg-[#1F1F1F]'
                    }`}
                  >
                    <span>{submittingAction ? 'Processing...' : actionType === 'MODIFY_RESOLVE' ? 'Resolve & Send' : 'Submit'}</span>
                    <Send className="w-3.5 h-3.5 text-[#DDD0C8]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: 360° Case Information Workbench Tabs (5 Cols)
             ========================================================================= */}
          <div className="lg:col-span-5 bg-white border border-[#DDD0C8] rounded-2xl shadow-card overflow-hidden">
            {/* Sidebar Navigation Tabs */}
            <div className="flex items-center border-b border-[#E8DFD7] bg-[#FAF8F5] overflow-x-auto p-1 text-xs">
              <button
                onClick={() => setActiveTab('PACKET')}
                className={`px-3 py-2 rounded-lg font-semibold shrink-0 transition-colors ${
                  activeTab === 'PACKET' ? 'bg-white text-[#212121] shadow-subtle' : 'text-[#6E6A66] hover:text-[#212121]'
                }`}
              >
                AI Packet
              </button>

              <button
                onClick={() => setActiveTab('CUSTOMER')}
                className={`px-3 py-2 rounded-lg font-semibold shrink-0 transition-colors ${
                  activeTab === 'CUSTOMER' ? 'bg-white text-[#212121] shadow-subtle' : 'text-[#6E6A66] hover:text-[#212121]'
                }`}
              >
                Customer
              </button>

              <button
                onClick={() => setActiveTab('ORDERS')}
                className={`px-3 py-2 rounded-lg font-semibold shrink-0 transition-colors ${
                  activeTab === 'ORDERS' ? 'bg-white text-[#212121] shadow-subtle' : 'text-[#6E6A66] hover:text-[#212121]'
                }`}
              >
                Orders
              </button>

              <button
                onClick={() => setActiveTab('PAYMENTS')}
                className={`px-3 py-2 rounded-lg font-semibold shrink-0 transition-colors ${
                  activeTab === 'PAYMENTS' ? 'bg-white text-[#212121] shadow-subtle' : 'text-[#6E6A66] hover:text-[#212121]'
                }`}
              >
                Payments
              </button>

              <button
                onClick={() => setActiveTab('POLICY')}
                className={`px-3 py-2 rounded-lg font-semibold shrink-0 transition-colors ${
                  activeTab === 'POLICY' ? 'bg-white text-[#212121] shadow-subtle' : 'text-[#6E6A66] hover:text-[#212121]'
                }`}
              >
                Policy (RAG)
              </button>

              <button
                onClick={() => setActiveTab('AUDIT')}
                className={`px-3 py-2 rounded-lg font-semibold shrink-0 transition-colors ${
                  activeTab === 'AUDIT' ? 'bg-white text-[#212121] shadow-subtle' : 'text-[#6E6A66] hover:text-[#212121]'
                }`}
              >
                Audit Log
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 text-xs space-y-4 max-h-[600px] overflow-y-auto">
              
              {/* TAB 1: INVESTIGATION PACKET */}
              {activeTab === 'PACKET' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#212121] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#7A6555]" />
                      AI Investigation Packet
                    </h4>
                    {escalation && (
                      <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-bold text-[10px]">
                        Escalation Packet Ready
                      </span>
                    )}
                  </div>

                  {investigation ? (
                    <>
                      <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8DFD7] space-y-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#8F8781] block">Customer Intent</span>
                          <span className="font-semibold text-[#212121]">{investigation.intentDetected}</span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#8F8781] block">Root Cause Diagnosis</span>
                          <span className="text-[#323232]">{investigation.rootCause}</span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#8F8781] block">AI Recommendation</span>
                          <span className="text-emerald-800 font-semibold">{investigation.recommendedAction}</span>
                        </div>
                      </div>

                      {/* Structured Evidence Items */}
                      <div>
                        <span className="font-bold text-[#212121] block mb-2">Verified Database Evidence</span>
                        <div className="space-y-1.5">
                          {(investigation.evidence || []).map((ev: any, idx: number) => (
                            <div key={idx} className="bg-[#F8F5F1] p-2 rounded-lg border border-[#EBE4DD] flex items-center justify-between">
                              <span className="text-[#6E6A66] font-medium">{ev.label}</span>
                              <span className="font-bold text-[#212121]">{ev.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-[#6E6A66]">No AI investigation record generated yet.</p>
                  )}
                </div>
              )}

              {/* TAB 2: CUSTOMER CRM PROFILE */}
              {activeTab === 'CUSTOMER' && (
                <div className="space-y-3.5">
                  <h4 className="font-bold text-sm text-[#212121] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#7A6555]" />
                    Customer Profile & CRM Stats
                  </h4>

                  <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E8DFD7] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#212121] text-sm">{customer.fullName}</span>
                      <span className="bg-[#323232] text-white text-[10px] px-2 py-0.5 rounded font-bold">
                        {customer.tier} TIER
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#EFE8E1]">
                      <div>
                        <span className="text-[#8F8781] block text-[10px]">Email</span>
                        <span className="font-medium text-[#212121] truncate">{customer.email}</span>
                      </div>
                      <div>
                        <span className="text-[#8F8781] block text-[10px]">Phone</span>
                        <span className="font-medium text-[#212121]">{customer.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#8F8781] block text-[10px]">Total Orders</span>
                        <span className="font-bold text-[#212121]">{customer.totalOrders} Orders</span>
                      </div>
                      <div>
                        <span className="text-[#8F8781] block text-[10px]">Lifetime Spend</span>
                        <span className="font-bold text-[#212121]">${customer.totalSpent?.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[#8F8781] block text-[10px]">Account Risk Score</span>
                        <span className={`font-bold ${customer.riskScore > 30 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {customer.riskScore} / 100
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8F8781] block text-[10px]">VIP Status</span>
                        <span className="font-bold text-[#212121]">{customer.isVip ? 'YES (Priority)' : 'Standard'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Past Tickets History */}
                  <div>
                    <span className="font-bold text-[#212121] block mb-2">Previous Customer Tickets</span>
                    {pastTickets.length === 0 ? (
                      <p className="text-[#8F8781] italic">No previous tickets recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {pastTickets.map((pt: any) => (
                          <div key={pt.id} className="p-2.5 rounded-lg border border-[#EBE4DD] bg-[#FAF8F5]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-[#59493E]">{pt.ticket_number}</span>
                              <StatusBadge status={pt.status} size="sm" />
                            </div>
                            <p className="font-semibold text-[#212121]">{pt.subject}</p>
                            {pt.resolution_summary && (
                              <p className="text-[11px] text-[#6E6A66] mt-0.5">Res: {pt.resolution_summary}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ORDERS */}
              {activeTab === 'ORDERS' && (
                <div className="space-y-3.5">
                  <h4 className="font-bold text-sm text-[#212121] flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#7A6555]" />
                    Customer Order History
                  </h4>

                  {ticket.matchedOrder && (
                    <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950">Linked Ticket Order: {ticket.matchedOrder.orderNumber}</span>
                        <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                          {ticket.matchedOrder.status}
                        </span>
                      </div>
                      <p className="text-xs text-amber-900">
                        Total: <strong>${ticket.matchedOrder.total.toFixed(2)}</strong> • Carrier: {ticket.matchedOrder.courier || 'N/A'} (Tracking: {ticket.matchedOrder.trackingNumber || 'N/A'})
                      </p>
                      {ticket.matchedOrder.items && (
                        <div className="pt-1.5 border-t border-amber-200 text-[11px] text-amber-900">
                          Items: {ticket.matchedOrder.items.map((it: any) => `${it.name} (Qty: ${it.quantity || 1})`).join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="font-bold text-[#212121] block">All Customer Orders ({customerOrders.length})</span>
                    {customerOrders.map((ord: any) => (
                      <div key={ord.id} className="p-3 rounded-xl border border-[#E8DFD7] bg-[#FAF8F5] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#212121]">{ord.orderNumber}</span>
                          <span className="text-[10px] bg-[#EFEAE4] text-[#4A423C] px-1.5 py-0.5 rounded font-semibold">
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6E6A66]">
                          ${ord.totalAmount.toFixed(2)} • Carrier: {ord.courier || 'Standard'} • {new Date(ord.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: PAYMENTS */}
              {activeTab === 'PAYMENTS' && (
                <div className="space-y-3.5">
                  <h4 className="font-bold text-sm text-[#212121] flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#7A6555]" />
                    Transaction & Payment Audit
                  </h4>

                  {ticket.matchedPayment && (
                    <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950">Linked Payment: {ticket.matchedPayment.transactionId}</span>
                        <span className="bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                          {ticket.matchedPayment.status}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900">
                        Amount: <strong>${ticket.matchedPayment.amount.toFixed(2)}</strong> via {ticket.matchedPayment.method}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="font-bold text-[#212121] block">Recent Customer Payments</span>
                    {customerPayments.map((p: any) => (
                      <div key={p.id} className="p-3 rounded-xl border border-[#E8DFD7] bg-[#FAF8F5] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#212121]">{p.transactionId}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-700'}`}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6E6A66]">
                          ${p.amount.toFixed(2)} via {p.method} • Refunded: ${p.refundedAmount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: POLICY (RAG) */}
              {activeTab === 'POLICY' && (
                <div className="space-y-3.5">
                  <h4 className="font-bold text-sm text-[#212121] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#7A6555]" />
                    Matched Company Policy (RAG Knowledge)
                  </h4>

                  {investigation?.policyDetails ? (
                    <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#DDD0C8] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#59493E] bg-[#F2ECE6] px-2 py-0.5 rounded border border-[#DDD0C8]">
                          {investigation.policyDetails.code}
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                          Max Auto Authority: ${investigation.policyDetails.authorityLimit.toFixed(2)}
                        </span>
                      </div>

                      <h5 className="font-bold text-sm text-[#212121]">{investigation.policyDetails.title}</h5>
                      <p className="text-xs text-[#524E4B] leading-relaxed italic bg-white p-3 rounded-lg border border-[#E8DFD7]">
                        "{investigation.policyExcerpt || investigation.policyDetails.summary}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-[#6E6A66]">Standard general policy applies to this case.</p>
                  )}
                </div>
              )}

              {/* TAB 6: AUDIT EVENTS */}
              {activeTab === 'AUDIT' && (
                <div className="space-y-3.5">
                  <h4 className="font-bold text-sm text-[#212121] flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#7A6555]" />
                    Case Audit Trail & State Transitions
                  </h4>

                  <div className="space-y-2">
                    {auditEvents.map((ev: any) => (
                      <div key={ev.id} className="p-2.5 rounded-lg border border-[#E8DFD7] bg-[#FAF8F5] text-xs">
                        <div className="flex items-center justify-between font-semibold text-[#212121]">
                          <span>{ev.eventType}</span>
                          <span className="text-[10px] text-[#8F8781]">
                            {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6E6A66] mt-0.5">
                          Actor: <strong>{ev.actorRole}</strong> {ev.newState ? `-> State: ${ev.newState}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
