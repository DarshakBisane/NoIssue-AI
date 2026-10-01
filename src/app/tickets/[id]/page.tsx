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
  ShieldAlert, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Package,
  CreditCard,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { InvestigationCard } from '@/components/InvestigationCard';

interface MessageItem {
  id: string;
  senderRole: 'CUSTOMER' | 'AI' | 'SUPPORT_AGENT' | 'SYSTEM';
  senderName: string;
  messageText: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  detectedCategory?: string;
  priority: string;
  status: string;
  resolutionSummary?: string;
  rootCause?: string;
  closedAt?: string;
  retentionUntil?: string;
  reopenedAt?: string;
  reopenCount?: number;
  createdAt: string;
  updatedAt: string;
  assignedAgentName?: string;
  order?: {
    orderNumber: string;
    status: string;
    total: number;
    courier?: string;
    trackingNumber?: string;
    items?: { name: string; price: number; quantity: number }[];
  } | null;
  payment?: {
    transactionId: string;
    status: string;
    amount: number;
    method: string;
  } | null;
}

export default function CustomerTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [investigation, setInvestigation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  
  // Human Request Modal
  const [isHumanModalOpen, setIsHumanModalOpen] = useState(false);
  const [humanReason, setHumanReason] = useState('');
  const [requestingHuman, setRequestingHuman] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTicketData();
  }, [ticketId]);

  const fetchTicketData = async () => {
    try {
      const res = await fetch(`/api/customer/tickets/${ticketId}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
        setMessages(data.messages || []);
        setInvestigation(data.investigation);
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent, isReopenAction: boolean = false) => {
    if (e) e.preventDefault();
    if (!replyText.trim()) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/customer/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: replyText.trim(), isReopen: isReopenAction }),
      });

      const data = await res.json();

      if (res.ok) {
        setReplyText('');
        showToast(isReopenAction ? 'Ticket reopened for investigation.' : 'Reply sent successfully.', 'success');
        await fetchTicketData();
      } else {
        showToast(data.error || 'Failed to send reply', 'error');
      }
    } catch (err) {
      showToast('Network error sending reply.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleRequestHuman = async () => {
    setRequestingHuman(true);
    try {
      const res = await fetch(`/api/customer/tickets/${ticketId}/request-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: humanReason.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsHumanModalOpen(false);
        setHumanReason('');
        showToast('Ticket transferred to Human Support Specialist.', 'success');
        await fetchTicketData();
      } else {
        showToast(data.error || 'Failed to request human support.', 'error');
      }
    } catch (err) {
      showToast('Network error requesting human support.', 'error');
    } finally {
      setRequestingHuman(false);
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

  if (!ticket) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl border border-[#DDD0C8] text-center max-w-md">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-[#212121]">Ticket Not Found</h2>
            <p className="text-xs text-[#6E6A66] mt-1 mb-4">This ticket does not exist or you do not have permission to view it.</p>
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-[#323232] text-white text-xs font-semibold">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isResolvedOrClosed = ['AI_RESOLVED', 'RESOLVED', 'CLOSED'].includes(ticket.status);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Navbar />

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-elevated text-xs font-medium border flex items-center gap-2 animate-in slide-in-from-top-2 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6A66] hover:text-[#212121] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tickets
          </Link>

          {/* Quick Request Human Support Button */}
          {!['HUMAN_REVIEW', 'ESCALATED', 'CLOSED'].includes(ticket.status) && (
            <button
              onClick={() => setIsHumanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#DDD0C8] bg-[#FAF8F5] hover:bg-[#F2ECE6] text-xs font-medium text-[#4C3D32] transition-colors shadow-subtle"
            >
              <Headphones className="w-3.5 h-3.5 text-[#7A6555]" />
              Request Human Support
            </button>
          )}
        </div>

        {/* Ticket Header Card */}
        <div className="bg-white border border-[#DDD0C8] rounded-2xl p-6 shadow-card mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F0EAE4] pb-5 mb-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#59493E] bg-[#F2ECE6] px-2.5 py-1 rounded border border-[#DDD0C8]">
                  {ticket.ticketNumber}
                </span>
                <StatusBadge status={ticket.status} size="md" />
                <span className="text-xs text-[#6E6A66]">
                  Category: <strong className="text-[#323232]">{ticket.detectedCategory || ticket.category}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#212121]">{ticket.subject}</h1>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs text-[#6E6A66]">
              <div>
                <span className="block text-[10px] uppercase font-bold text-[#8F8781]">Created</span>
                <span className="font-medium text-[#323232]">{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>

              {ticket.assignedAgentName && (
                <div className="bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#E8DFD7]">
                  <span className="block text-[10px] uppercase font-bold text-[#8F8781]">Assigned Agent</span>
                  <span className="font-semibold text-[#212121] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                    {ticket.assignedAgentName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Order & Payment pill tags */}
          {(ticket.order || ticket.payment) && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {ticket.order && (
                <div className="flex items-center gap-1.5 bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#E8DFD7] text-[#4A423C]">
                  <Package className="w-3.5 h-3.5 text-[#7A6555]" />
                  <span>Linked Order: <strong>{ticket.order.orderNumber}</strong> (${ticket.order.total.toFixed(2)} - {ticket.order.status})</span>
                </div>
              )}
              {ticket.payment && (
                <div className="flex items-center gap-1.5 bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#E8DFD7] text-[#4A423C]">
                  <CreditCard className="w-3.5 h-3.5 text-[#7A6555]" />
                  <span>Transaction: <strong>{ticket.payment.transactionId}</strong> (${ticket.payment.amount.toFixed(2)} - {ticket.payment.status})</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 1: Transparent AI Investigation & Evidence Breakdown */}
        <InvestigationCard investigation={investigation} ticketStatus={ticket.status} />

        {/* Section 2: Conversation Thread */}
        <div className="bg-white border border-[#DDD0C8] rounded-2xl p-6 shadow-card mb-6">
          <h3 className="text-sm font-bold text-[#212121] uppercase tracking-wider mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#7A6555]" />
            Case Conversation & Activity Log
          </h3>

          <div className="space-y-4 mb-6">
            {messages.map((m) => {
              const isCustomer = m.senderRole === 'CUSTOMER';
              const isAI = m.senderRole === 'AI';
              const isAgent = m.senderRole === 'SUPPORT_AGENT';
              const isSystem = m.senderRole === 'SYSTEM';

              if (isSystem) {
                return (
                  <div key={m.id} className="text-center my-3">
                    <span className="inline-block text-[11px] bg-[#F4EFEA] text-[#6E6A66] px-3 py-1 rounded-full border border-[#E0D5CC]">
                      {m.messageText} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-3xl ${isCustomer ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Sender Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                      isCustomer
                        ? 'bg-[#DDD0C8] text-[#323232]'
                        : isAI
                        ? 'bg-[#323232] text-white'
                        : 'bg-purple-700 text-white'
                    }`}
                  >
                    {isCustomer ? <User className="w-4 h-4" /> : isAI ? <Sparkles className="w-4 h-4 text-[#DDD0C8]" /> : <Headphones className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-xs space-y-1.5 shadow-subtle ${
                      isCustomer
                        ? 'bg-[#F5EFEA] border border-[#DDD0C8] text-[#212121]'
                        : isAI
                        ? 'bg-white border border-[#DDD0C8] text-[#323232]'
                        : 'bg-purple-50 border border-purple-200 text-purple-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-[#212121] flex items-center gap-1">
                        {m.senderName}
                        {isAI && <span className="text-[10px] bg-[#323232] text-white px-1 py-0.2 rounded">AI</span>}
                        {isAgent && <span className="text-[10px] bg-purple-200 text-purple-900 px-1 py-0.2 rounded font-bold">Specialist</span>}
                      </span>
                      <span className="text-[10px] text-[#8F8781]">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="whitespace-pre-wrap leading-relaxed">
                      {m.messageText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Form / Reopen Option */}
          {ticket.status === 'CLOSED' ? (
            <div className="bg-[#FAF8F5] border border-[#DDD0C8] rounded-xl p-5 text-center space-y-2">
              <p className="text-xs font-medium text-[#6E6A66]">
                This ticket is currently closed. If your problem has recurred or you need follow-up assistance, you can reopen it.
              </p>
              <button
                onClick={(e) => {
                  setReplyText('Reopening ticket: I need further assistance regarding this issue.');
                  handleSendReply(e, true);
                }}
                disabled={sendingReply}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#323232] text-white hover:bg-[#1F1F1F] text-xs font-semibold transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4 text-[#DDD0C8]" />
                Reopen Ticket
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => handleSendReply(e)} className="pt-4 border-t border-[#EFE8E1] space-y-3">
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  isResolvedOrClosed
                    ? 'Write a reply to reopen this case or ask follow-up questions...'
                    : 'Type your reply or additional information here...'
                }
                className="w-full text-xs p-3.5 rounded-xl border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-[#FAF8F5] text-[#212121]"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#8F8781]">
                  Responses are analyzed by our automated investigation system.
                </span>

                <div className="flex items-center gap-2">
                  {isResolvedOrClosed && (
                    <button
                      type="button"
                      onClick={(e) => handleSendReply(e, true)}
                      disabled={sendingReply || !replyText.trim()}
                      className="px-4 py-2 rounded-lg border border-[#DDD0C8] bg-white hover:bg-[#F2ECE6] text-xs font-semibold text-[#323232] transition-colors flex items-center gap-1.5 shadow-subtle"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#7A6555]" />
                      Reopen & Send
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="px-5 py-2 rounded-lg bg-[#323232] text-white hover:bg-[#1F1F1F] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                    <Send className="w-3.5 h-3.5 text-[#DDD0C8]" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Human Support Request Modal */}
      {isHumanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD0C8] rounded-2xl w-full max-w-md shadow-elevated p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center">
                <Headphones className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-[#212121]">Request Human Support</h3>
            </div>

            <p className="text-xs text-[#6E6A66] mb-4">
              If the automated resolution did not solve your issue, our Support Team will take over. The full investigation packet and verified records will be delivered directly to a specialist.
            </p>

            <div className="space-y-3 mb-4">
              <label className="block text-xs font-semibold text-[#323232]">
                Reason for requesting human assistance (Optional):
              </label>
              <textarea
                rows={3}
                value={humanReason}
                onChange={(e) => setHumanReason(e.target.value)}
                placeholder="e.g. The automated resolution doesn't cover my circumstance or I need a custom exception..."
                className="w-full text-xs p-3 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-[#FAF8F5] text-[#212121]"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsHumanModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#6E6A66] hover:bg-[#FAF8F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestHuman}
                disabled={requestingHuman}
                className="px-4 py-2 rounded-lg bg-purple-700 text-white hover:bg-purple-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                {requestingHuman ? 'Transferring...' : 'Transfer to Human Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
