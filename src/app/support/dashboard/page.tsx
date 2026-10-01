'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Headphones, 
  Layers, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  User, 
  ChevronRight,
  SlidersHorizontal,
  Flame,
  FileText
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';

interface QueueCounts {
  total: number;
  escalated: number;
  pendingReview: number;
  active: number;
  resolved: number;
  closed: number;
}

interface SupportTicketItem {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  detected_category?: string;
  priority: string;
  status: string;
  resolution_summary?: string;
  customer_name: string;
  customer_email: string;
  customer_tier?: string;
  customer_risk_score?: number;
  is_vip: boolean;
  assigned_agent_name?: string;
  escalation_reason?: string;
  verification_status?: string;
  decision_outcome?: string;
  created_at: string;
  updated_at: string;
}

export default function SupportDashboardPage() {
  const router = useRouter();
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ESCALATED' | 'REVIEW' | 'ACTIVE' | 'RESOLVED' | 'CLOSED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSupportData();
  }, [statusFilter, priorityFilter, categoryFilter, searchQuery]);

  const fetchSupportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/support/dashboard?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/support/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts);
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load support dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#212121]">Agent Command Center</h1>
              <span className="text-xs bg-[#323232] text-white px-2.5 py-0.5 rounded-full font-semibold">
                Tier-1 / Lead
              </span>
            </div>
            <p className="text-xs text-[#6E6A66] mt-1">
              AI-investigated escalation packets, priority queues, and customer case workbench.
            </p>
          </div>

          <Link
            href="/support/policies"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#DDD0C8] hover:bg-[#FAF8F5] text-xs font-semibold text-[#323232] transition-colors shadow-subtle self-start sm:self-auto"
          >
            <FileText className="w-4 h-4 text-[#7A6555]" />
            Knowledge Base & Policies (RAG)
          </Link>
        </div>

        {/* Queue Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
          {/* Escalated Queue */}
          <div
            onClick={() => setStatusFilter('ESCALATED')}
            className={`p-4 rounded-xl border cursor-pointer transition-all shadow-subtle ${
              statusFilter === 'ESCALATED'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
                : 'bg-white border-[#EBE4DD] hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                Escalations
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
            </div>
            <p className="text-2xl font-black text-rose-950 mt-2">{counts?.escalated || 0}</p>
            <span className="text-[10px] text-rose-700 font-medium">Requires Specialist Action</span>
          </div>

          {/* Pending Review */}
          <div
            onClick={() => setStatusFilter('REVIEW')}
            className={`p-4 rounded-xl border cursor-pointer transition-all shadow-subtle ${
              statusFilter === 'REVIEW'
                ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200'
                : 'bg-white border-[#EBE4DD] hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900">Pending Review</span>
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            </div>
            <p className="text-2xl font-black text-purple-950 mt-2">{counts?.pendingReview || 0}</p>
            <span className="text-[10px] text-purple-700 font-medium">Customer or Rule flagged</span>
          </div>

          {/* Active / In Progress */}
          <div
            onClick={() => setStatusFilter('ACTIVE')}
            className={`p-4 rounded-xl border cursor-pointer transition-all shadow-subtle ${
              statusFilter === 'ACTIVE'
                ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
                : 'bg-white border-[#EBE4DD] hover:border-sky-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-900">Active Cases</span>
              <span className="w-2 h-2 rounded-full bg-sky-600"></span>
            </div>
            <p className="text-2xl font-black text-sky-950 mt-2">{counts?.active || 0}</p>
            <span className="text-[10px] text-sky-700 font-medium">Open & In Progress</span>
          </div>

          {/* Resolved */}
          <div
            onClick={() => setStatusFilter('RESOLVED')}
            className={`p-4 rounded-xl border cursor-pointer transition-all shadow-subtle ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                : 'bg-white border-[#EBE4DD] hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Resolved</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            </div>
            <p className="text-2xl font-black text-emerald-950 mt-2">{counts?.resolved || 0}</p>
            <span className="text-[10px] text-emerald-700 font-medium">AI & Agent Resolved</span>
          </div>

          {/* Closed */}
          <div
            onClick={() => setStatusFilter('CLOSED')}
            className={`p-4 rounded-xl border cursor-pointer transition-all shadow-subtle col-span-2 sm:col-span-1 ${
              statusFilter === 'CLOSED'
                ? 'bg-[#F2ECE6] border-[#7A6555] ring-2 ring-[#D8CDC3]'
                : 'bg-white border-[#EBE4DD] hover:border-[#DDD0C8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6E6A66]">Closed</span>
              <span className="w-2 h-2 rounded-full bg-stone-400"></span>
            </div>
            <p className="text-2xl font-black text-[#212121] mt-2">{counts?.closed || 0}</p>
            <span className="text-[10px] text-[#7A746E]">5-Day Retention Active</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-[#DDD0C8] rounded-2xl p-4 shadow-subtle mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8F8781] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, customer, email..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-1 focus:ring-[#323232] bg-[#FAF8F5] text-[#212121]"
              />
            </div>

            {/* Status Selector */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-1 focus:ring-[#323232] bg-[#FAF8F5] text-[#212121]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ESCALATED">🚨 Escalated Queue Only</option>
                <option value="REVIEW">🟣 Pending Human Review</option>
                <option value="ACTIVE">🔵 Active & Investigating</option>
                <option value="RESOLVED">🟢 Resolved Cases</option>
                <option value="CLOSED">⚪ Closed (In Retention)</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-1 focus:ring-[#323232] bg-[#FAF8F5] text-[#212121]"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">URGENT Priority</option>
                <option value="HIGH">HIGH Priority</option>
                <option value="MEDIUM">MEDIUM Priority</option>
                <option value="LOW">LOW Priority</option>
              </select>
            </div>

            {/* Category Selector */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-1 focus:ring-[#323232] bg-[#FAF8F5] text-[#212121]"
              >
                <option value="ALL">All Categories</option>
                <option value="Refund">Refunds</option>
                <option value="Payment">Payments & Billing</option>
                <option value="Delivery">Delivery & Courier</option>
                <option value="Order">Order Management</option>
                <option value="Security">Security & Risk</option>
                <option value="VIP">VIP Priority</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Workbench List */}
        {loading ? (
          <div className="bg-white border border-[#DDD0C8] rounded-2xl p-12 text-center text-xs text-[#6E6A66]">
            <Sparkles className="w-6 h-6 text-[#7A6555] animate-spin mx-auto mb-2" />
            Loading support queue...
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-[#DDD0C8] rounded-2xl p-12 text-center space-y-3 shadow-subtle">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD7] flex items-center justify-center mx-auto text-[#7A6555]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#212121]">No Cases In This Queue</h3>
            <p className="text-xs text-[#6E6A66] max-w-sm mx-auto">
              {searchQuery ? 'No tickets match the active search criteria.' : 'Great job! This support queue is currently clear.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/support/tickets/${t.id}`}
                className="block bg-white border border-[#EBE4DD] hover:border-[#323232] hover:shadow-card p-5 rounded-2xl transition-all group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Ticket & Customer Context */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#59493E] bg-[#F2ECE6] px-2.5 py-0.5 rounded border border-[#DDD0C8]">
                        {t.ticket_number}
                      </span>
                      <StatusBadge status={t.status} size="sm" />
                      <StatusBadge priority={t.priority} size="sm" />
                      {t.verification_status && (
                        <StatusBadge verification={t.verification_status} size="sm" />
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-[#212121] group-hover:text-[#7A6555] transition-colors">
                      {t.subject}
                    </h3>

                    {/* Customer info preview */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E6A66]">
                      <span className="flex items-center gap-1 font-semibold text-[#323232]">
                        <User className="w-3.5 h-3.5 text-[#7A6555]" />
                        {t.customer_name}
                      </span>
                      <span>({t.customer_email})</span>
                      <span className="bg-[#FAF8F5] border border-[#E8DFD7] px-1.5 py-0.2 rounded font-medium text-[#4A423C]">
                        Tier: {t.customer_tier || 'STANDARD'}
                      </span>
                      {t.is_vip && (
                        <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                          VIP
                        </span>
                      )}
                    </div>

                    {/* Escalation reason callout */}
                    {t.escalation_reason && (
                      <div className="text-xs bg-rose-50 border border-rose-200 text-rose-900 p-2 rounded-lg">
                        <strong>Escalation Reason:</strong> {t.escalation_reason}
                      </div>
                    )}
                  </div>

                  {/* Right Action Trigger */}
                  <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                    <div className="text-right text-[11px] text-[#8F8781]">
                      <span>Updated {new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="block">{new Date(t.updated_at).toLocaleDateString()}</span>
                    </div>

                    <div className="px-3.5 py-2 rounded-xl bg-[#323232] text-white group-hover:bg-[#1F1F1F] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
                      <span>Open Workbench</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#DDD0C8]" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
