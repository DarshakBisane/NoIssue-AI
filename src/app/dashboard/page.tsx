'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, 
  Layers, 
  Clock, 
  CheckCircle2, 
  HelpCircle, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  Search,
  Filter,
  Package,
  History
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { RaiseIssueModal } from '@/components/RaiseIssueModal';

interface TicketItem {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  detected_category?: string;
  priority: string;
  status: string;
  resolution_summary?: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  activeCount: number;
  pendingReviewCount: number;
  resolvedCount: number;
  closedCount: number;
  totalTickets: number;
  tier: string;
  totalOrders: number;
  totalSpent: number;
}

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [filterTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard overview stats
      const dashRes = await fetch('/api/customer/dashboard');
      if (dashRes.status === 401 || dashRes.status === 403) {
        router.push('/login');
        return;
      }

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setStats(dashData.stats);
      }

      // 2. Fetch tickets with filter
      const tktRes = await fetch(`/api/customer/tickets?status=${filterTab}`);
      if (tktRes.ok) {
        const tktData = await tktRes.json();
        setTickets(tktData.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticket_number.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Navbar onRaiseIssueClick={() => setIsModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#212121]">Support Overview</h1>
            <p className="text-xs text-[#6E6A66] mt-1">
              Track active inquiries, review transparent AI investigations, and request human assistance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DDD0C8] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#323232] transition-colors shadow-subtle"
            >
              <History className="w-4 h-4 text-[#7A6555]" />
              Retention History
            </Link>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#323232] text-white hover:bg-[#1F1F1F] text-xs font-semibold transition-colors shadow-card"
            >
              <PlusCircle className="w-4 h-4 text-[#DDD0C8]" />
              Raise an Issue
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div 
            onClick={() => setFilterTab('ACTIVE')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${filterTab === 'ACTIVE' ? 'bg-[#F2ECE6] border-[#7A6555]' : 'bg-white border-[#EBE4DD] hover:border-[#DDD0C8]'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6E6A66]">Active Cases</span>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <p className="text-2xl font-bold text-[#212121] mt-2">{stats?.activeCount || 0}</p>
            <span className="text-[11px] text-[#7A746E]">Under investigation</span>
          </div>

          <div 
            onClick={() => setFilterTab('PENDING')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${filterTab === 'PENDING' ? 'bg-[#F2ECE6] border-[#7A6555]' : 'bg-white border-[#EBE4DD] hover:border-[#DDD0C8]'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6E6A66]">Human Review</span>
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            </div>
            <p className="text-2xl font-bold text-[#212121] mt-2">{stats?.pendingReviewCount || 0}</p>
            <span className="text-[11px] text-[#7A746E]">With specialist</span>
          </div>

          <div 
            onClick={() => setFilterTab('RESOLVED')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${filterTab === 'RESOLVED' ? 'bg-[#F2ECE6] border-[#7A6555]' : 'bg-white border-[#EBE4DD] hover:border-[#DDD0C8]'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6E6A66]">Resolved</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-2xl font-bold text-[#212121] mt-2">{stats?.resolvedCount || 0}</p>
            <span className="text-[11px] text-[#7A746E]">AI & Agent approved</span>
          </div>

          <div className="p-4 rounded-xl border bg-[#F6F2ED] border-[#E2D6CB]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#59493E]">Account Tier</span>
              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded font-bold text-[#59493E]">
                {stats?.tier || 'STANDARD'}
              </span>
            </div>
            <p className="text-sm font-bold text-[#212121] mt-2">
              {stats?.totalOrders || 0} Orders (${stats?.totalSpent?.toFixed(2) || '0.00'})
            </p>
            <span className="text-[11px] text-[#7A746E]">Verified customer profile</span>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white border border-[#DDD0C8] rounded-2xl shadow-subtle p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'ACTIVE', 'PENDING', 'RESOLVED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    filterTab === tab
                      ? 'bg-[#323232] text-white shadow-sm'
                      : 'text-[#6E6A66] hover:text-[#212121] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {tab === 'ALL' && 'All Tickets'}
                  {tab === 'ACTIVE' && 'Active / In-Progress'}
                  {tab === 'PENDING' && 'Pending Review'}
                  {tab === 'RESOLVED' && 'Resolved'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#8F8781] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket # or subject..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-[#E0D5CC] focus:outline-none focus:ring-1 focus:ring-[#7A6555] bg-[#FAF8F5] text-[#212121]"
              />
            </div>
          </div>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="bg-white border border-[#DDD0C8] rounded-2xl p-12 text-center text-[#6E6A66] text-xs">
            <Sparkles className="w-6 h-6 text-[#7A6555] animate-spin mx-auto mb-2" />
            Loading your tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white border border-[#DDD0C8] rounded-2xl p-12 text-center space-y-3 shadow-subtle">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD7] flex items-center justify-center mx-auto text-[#7A6555]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#212121]">No Tickets Found</h3>
            <p className="text-xs text-[#6E6A66] max-w-sm mx-auto">
              {searchQuery ? 'No tickets match your search query.' : 'You have no tickets in this category yet.'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#323232] text-white text-xs font-semibold hover:bg-[#1F1F1F] transition-colors shadow-sm mt-2"
            >
              <PlusCircle className="w-4 h-4 text-[#DDD0C8]" />
              Raise an Issue
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="block bg-white border border-[#EBE4DD] hover:border-[#DDD0C8] hover:shadow-card p-5 rounded-2xl transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#59493E] bg-[#F2ECE6] px-2 py-0.5 rounded border border-[#DDD0C8]">
                        {t.ticket_number}
                      </span>
                      <StatusBadge status={t.status} size="sm" />
                      <span className="text-xs text-[#8F8781]">
                        Category: <strong className="text-[#323232]">{t.detected_category || t.category}</strong>
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#212121] group-hover:text-[#7A6555] transition-colors">
                      {t.subject}
                    </h3>

                    {t.resolution_summary && (
                      <p className="text-xs text-[#524E4B] bg-[#FAF8F5] p-2 rounded-lg border border-[#EFE8E1] line-clamp-2">
                        <strong className="text-[#212121]">Resolution:</strong> {t.resolution_summary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right text-[11px] text-[#8F8781]">
                      <span>Updated {new Date(t.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] group-hover:bg-[#323232] group-hover:text-white flex items-center justify-center text-[#6E6A66] transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Raise Issue Modal */}
      <RaiseIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTicketCreated={(id) => router.push(`/tickets/${id}`)}
      />
    </div>
  );
}
