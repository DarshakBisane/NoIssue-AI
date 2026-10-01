'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  History, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';

interface HistoryTicket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  detected_category?: string;
  priority: string;
  status: string;
  resolution_summary?: string;
  root_cause?: string;
  created_at: string;
  closed_at?: string;
  retention_until?: string;
}

export default function CustomerHistoryPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<HistoryTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/customer/tickets?status=CLOSED');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (retentionUntil?: string) => {
    if (!retentionUntil) return 5;
    const diff = new Date(retentionUntil).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6A66] hover:text-[#212121] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Active Tickets
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#212121] flex items-center gap-2.5">
              <History className="w-7 h-7 text-[#7A6555]" />
              Ticket History & Data Retention
            </h1>
            <p className="text-xs text-[#6E6A66] mt-1">
              Historical view of closed support cases. Closed tickets are maintained for 5 days in accordance with data privacy compliance.
            </p>
          </div>
        </div>

        {/* 5-Day Data Retention Policy Banner */}
        <div className="bg-[#F5EFEA] border border-[#DDD0C8] rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-subtle">
          <div className="w-10 h-10 rounded-xl bg-[#323232] text-white flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[#DDD0C8]" />
          </div>
          <div className="flex-1 text-xs">
            <h3 className="font-bold text-[#212121]">5-Day Automated Cleanup Policy</h3>
            <p className="text-[#6E6A66] mt-0.5 leading-relaxed">
              When a ticket reaches final closure, it remains accessible in your history for 5 days. After 5 days, customer conversational and temporary AI audit records are automatically pruned server-side.
            </p>
          </div>
          <span className="text-[10px] bg-white border border-[#DDD0C8] text-[#59493E] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
            Server-Side Cron Managed
          </span>
        </div>

        {/* Historical Tickets List */}
        {loading ? (
          <div className="bg-white border border-[#DDD0C8] rounded-2xl p-12 text-center text-xs text-[#6E6A66]">
            <Sparkles className="w-6 h-6 text-[#7A6555] animate-spin mx-auto mb-2" />
            Loading historical cases...
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-[#DDD0C8] rounded-2xl p-12 text-center space-y-3 shadow-subtle">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD7] flex items-center justify-center mx-auto text-[#7A6555]">
              <History className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#212121]">No Closed Tickets in History</h3>
            <p className="text-xs text-[#6E6A66] max-w-sm mx-auto">
              You currently have no closed tickets. When active tickets are resolved and closed, they will appear here with retention countdowns.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => {
              const daysLeft = getDaysRemaining(t.retention_until);

              return (
                <div
                  key={t.id}
                  className="bg-white border border-[#EBE4DD] hover:border-[#DDD0C8] rounded-2xl p-6 shadow-subtle transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#59493E] bg-[#F2ECE6] px-2.5 py-0.5 rounded border border-[#DDD0C8]">
                          {t.ticket_number}
                        </span>
                        <StatusBadge status={t.status} size="sm" />
                        <span className="text-xs text-[#8F8781]">
                          Category: <strong className="text-[#323232]">{t.detected_category || t.category}</strong>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#212121]">{t.subject}</h3>

                      {t.resolution_summary && (
                        <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EFE8E1] text-xs text-[#423E3B]">
                          <strong className="text-[#212121] block mb-0.5">Final Resolution:</strong>
                          <p>{t.resolution_summary}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                      {/* Retention Countdown Pill */}
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span><strong>{daysLeft} days</strong> until auto-retention cleanup</span>
                      </div>

                      <Link
                        href={`/tickets/${t.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#323232] hover:text-[#7A6555] transition-colors"
                      >
                        <span>View Conversation</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
