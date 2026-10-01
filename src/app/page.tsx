'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Headphones, 
  Layers, 
  CheckCircle2, 
  Search, 
  Cpu, 
  Lock, 
  Clock, 
  FileCheck2, 
  UserCheck,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function HomePage() {
  const router = useRouter();
  const [loggingIn, setLoggingIn] = useState(false);

  const handleQuickLogin = async (email: string, isAgent: boolean = false) => {
    setLoggingIn(true);
    try {
      const endpoint = isAgent ? '/api/auth/support-login' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' }),
      });

      if (res.ok) {
        if (isAgent) {
          router.push('/support/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error('Quick login failed:', err);
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F2ECE6] border border-[#DDD0C8] text-xs font-semibold text-[#524840] mb-6 shadow-subtle">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
            Agentic AI Customer Resolution Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-[#212121] tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Understand the Customer. <br className="hidden sm:block" />
            <span className="text-[#7A6555]">Investigate the Problem.</span> <br className="hidden sm:block" />
            Resolve It.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#6E6A66] max-w-2xl mx-auto leading-relaxed">
            Stop sending every support issue blindly to a human. <strong className="text-[#323232]">NoIssue AI</strong> investigates intent, audits order and payment records, cross-verifies company policies through RAG, and safely resolves queries or compiles rich investigation packets for specialists.
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-6 py-3.5 rounded-xl bg-[#323232] text-white hover:bg-[#1F1F1F] font-semibold text-sm transition-all shadow-card flex items-center gap-2 group"
            >
              <span>Customer Portal</span>
              <ArrowRight className="w-4 h-4 text-[#DDD0C8] group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/support/login"
              className="px-6 py-3.5 rounded-xl bg-[#EFEAE4] hover:bg-[#E5DDD5] text-[#323232] border border-[#DDD0C8] font-semibold text-sm transition-all shadow-subtle flex items-center gap-2"
            >
              <Headphones className="w-4 h-4 text-[#7A6555]" />
              <span>Support Specialist Portal</span>
            </Link>
          </div>

          {/* Quick Demo Selector */}
          <div className="mt-16 max-w-4xl mx-auto bg-white border border-[#DDD0C8] rounded-2xl p-6 shadow-card text-left">
            <div className="flex items-center justify-between border-b border-[#F0EAE4] pb-4 mb-5">
              <div>
                <h2 className="text-sm font-bold text-[#212121] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#7A6555]" />
                  Instant Demo Test Accounts (1-Click Login)
                </h2>
                <p className="text-xs text-[#6E6A66]">Jump directly into verified user accounts to test live end-to-end agent workflows.</p>
              </div>
              <span className="text-[10px] bg-[#F2ECE6] text-[#59493E] px-2 py-1 rounded font-bold uppercase tracking-wider">
                Full-Stack Demo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Accounts */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-[#6E6A66] uppercase tracking-wider block">
                  Customer Profiles
                </span>
                
                <button
                  disabled={loggingIn}
                  onClick={() => handleQuickLogin('marcus.vance@example.com')}
                  className="w-full text-left p-3 rounded-xl border border-[#EBE4DD] bg-[#FAF8F5] hover:bg-[#F5EFEA] hover:border-[#DDD0C8] transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#212121]">Marcus Vance</span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">Gold</span>
                    </div>
                    <p className="text-[11px] text-[#6E6A66]">Scenario: Duplicate charge auto-refund ($49.99)</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8F8781]" />
                </button>

                <button
                  disabled={loggingIn}
                  onClick={() => handleQuickLogin('sarah.chen@example.com')}
                  className="w-full text-left p-3 rounded-xl border border-[#EBE4DD] bg-[#FAF8F5] hover:bg-[#F5EFEA] hover:border-[#DDD0C8] transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#212121]">Sarah Chen</span>
                      <span className="text-[10px] bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded font-bold">VIP Platinum</span>
                    </div>
                    <p className="text-[11px] text-[#6E6A66]">Scenario: High-value damaged monitor claim ($650.00)</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8F8781]" />
                </button>

                <button
                  disabled={loggingIn}
                  onClick={() => handleQuickLogin('alex.rivers@example.com')}
                  className="w-full text-left p-3 rounded-xl border border-[#EBE4DD] bg-[#FAF8F5] hover:bg-[#F5EFEA] hover:border-[#DDD0C8] transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#212121]">Alex Rivers</span>
                      <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded font-medium">Standard</span>
                    </div>
                    <p className="text-[11px] text-[#6E6A66]">Scenario: Delayed refund banking timeline inquiry</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8F8781]" />
                </button>
              </div>

              {/* Support Agent Accounts */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-[#6E6A66] uppercase tracking-wider block">
                  Support Specialist Profiles
                </span>

                <button
                  disabled={loggingIn}
                  onClick={() => handleQuickLogin('agent.clara@noissue.ai', true)}
                  className="w-full text-left p-3 rounded-xl border border-[#EBE4DD] bg-[#FAF8F5] hover:bg-[#F5EFEA] hover:border-[#DDD0C8] transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#212121]">Clara Oswald</span>
                      <span className="text-[10px] bg-[#323232] text-white px-1.5 py-0.2 rounded font-medium">Lead Specialist</span>
                    </div>
                    <p className="text-[11px] text-[#6E6A66]">Access: Escalation Queue & 360° Case Workbench</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8F8781]" />
                </button>

                <button
                  disabled={loggingIn}
                  onClick={() => handleQuickLogin('agent.james@noissue.ai', true)}
                  className="w-full text-left p-3 rounded-xl border border-[#EBE4DD] bg-[#FAF8F5] hover:bg-[#F5EFEA] hover:border-[#DDD0C8] transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#212121]">James Holden</span>
                      <span className="text-[10px] bg-[#323232] text-white px-1.5 py-0.2 rounded font-medium">Escalations Manager</span>
                    </div>
                    <p className="text-[11px] text-[#6E6A66]">Access: High-Risk Claims & Policy Authority Sign-offs</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8F8781]" />
                </button>

                <div className="p-3 rounded-xl bg-[#F6F2ED] border border-[#E5DDD5] text-xs text-[#6E6A66]">
                  <span className="font-semibold text-[#212121] block mb-1">🔐 Universal Demo Password:</span>
                  <code>Password123!</code> (Bcrypt hashed in PostgreSQL)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Stage Agentic Architecture Section */}
        <div className="bg-[#F2ECE6] border-y border-[#DDD0C8] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold text-[#7A6555] uppercase tracking-wider">Multi-Agent Workflow</span>
              <h2 className="text-3xl font-extrabold text-[#212121] mt-1">
                7 Autonomous Stages Before Any Decision
              </h2>
              <p className="text-sm text-[#6E6A66] mt-2">
                NoIssue AI systematically coordinates specialized stages to gather verified facts before acting.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-[#DDD0C8] shadow-subtle">
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E2D7CF] text-[#7A6555] font-bold text-xs flex items-center justify-center mb-3">
                  01
                </div>
                <h3 className="font-bold text-sm text-[#212121]">Intent Agent</h3>
                <p className="text-xs text-[#6E6A66] mt-1">
                  Parses messy queries, extracts entity tokens (orders, amounts), and neutralizes prompt injections.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#DDD0C8] shadow-subtle">
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E2D7CF] text-[#7A6555] font-bold text-xs flex items-center justify-center mb-3">
                  02
                </div>
                <h3 className="font-bold text-sm text-[#212121]">History & CRM Agent</h3>
                <p className="text-xs text-[#6E6A66] mt-1">
                  Queries PostgreSQL for customer tier, VIP flags, past resolutions, and repeat dispute patterns.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#DDD0C8] shadow-subtle">
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E2D7CF] text-[#7A6555] font-bold text-xs flex items-center justify-center mb-3">
                  03
                </div>
                <h3 className="font-bold text-sm text-[#212121]">Order & Payment Audit</h3>
                <p className="text-xs text-[#6E6A66] mt-1">
                  Inspects courier tracking, package scans, transaction IDs, and detects gateway double-charges.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#DDD0C8] shadow-subtle">
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E2D7CF] text-[#7A6555] font-bold text-xs flex items-center justify-center mb-3">
                  04
                </div>
                <h3 className="font-bold text-sm text-[#212121]">Policy RAG Agent</h3>
                <p className="text-xs text-[#6E6A66] mt-1">
                  Performs vector cosine retrieval across 25+ company policies to retrieve exact governing clauses.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#DDD0C8] shadow-subtle">
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E2D7CF] text-[#7A6555] font-bold text-xs flex items-center justify-center mb-3">
                  05
                </div>
                <h3 className="font-bold text-sm text-[#212121]">Root Cause Diagnosis</h3>
                <p className="text-xs text-[#6E6A66] mt-1">
                  Attributes responsibility to carrier, gateway latency, warehouse packaging, or bank clearing cycles.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#DDD0C8] shadow-subtle">
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E2D7CF] text-[#7A6555] font-bold text-xs flex items-center justify-center mb-3">
                  06
                </div>
                <h3 className="font-bold text-sm text-[#212121]">Evidence Verification</h3>
                <p className="text-xs text-[#6E6A66] mt-1">
                  Cross-checks claims against DB facts. Flags CONFLICTING, PARTIALLY_SUPPORTED, or INSUFFICIENT evidence.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#DDD0C8] shadow-subtle">
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E2D7CF] text-[#7A6555] font-bold text-xs flex items-center justify-center mb-3">
                  07
                </div>
                <h3 className="font-bold text-sm text-[#212121]">Resolution Decision Gate</h3>
                <p className="text-xs text-[#6E6A66] mt-1">
                  Evaluates authority ceilings ($150-$350). Auto-resolves safe cases or generates Support Escalation Packets.
                </p>
              </div>

              <div className="bg-[#323232] text-white p-5 rounded-xl shadow-subtle flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-[#4A4A4A] text-[#DDD0C8] font-bold text-xs flex items-center justify-center mb-3">
                    08
                  </div>
                  <h3 className="font-bold text-sm text-white">Human Escalation Packet</h3>
                  <p className="text-xs text-[#D5C8BD] mt-1">
                    Delivers concise 360° context so agents never restart investigation from zero.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold text-[#7A6555] uppercase tracking-wider">The NoIssue Advantage</span>
            <h2 className="text-3xl font-extrabold text-[#212121] mt-1">
              Why We Are Different From Typical AI Chatbots
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-premium p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EFEA] border border-[#E0D5CC] flex items-center justify-center text-[#7A6555]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#212121]">Transparent Evidence</h3>
              <p className="text-xs text-[#6E6A66] leading-relaxed">
                Customers see verified checks, order & payment references, and clear explanations without exposed raw chain-of-thought.
              </p>
            </div>

            <div className="card-premium p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EFEA] border border-[#E0D5CC] flex items-center justify-center text-[#7A6555]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#212121]">Authority Ceilings & Safety</h3>
              <p className="text-xs text-[#6E6A66] leading-relaxed">
                High-value transactions, account security, and ambiguous claims automatically divert to human agents. LLMs never execute database changes unvalidated.
              </p>
            </div>

            <div className="card-premium p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EFEA] border border-[#E0D5CC] flex items-center justify-center text-[#7A6555]">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#212121]">5-Day Automated Retention</h3>
              <p className="text-xs text-[#6E6A66] leading-relaxed">
                Closed cases are preserved in customer history for 5 days before server-side automated cleanup and audit archiving.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#F2ECE6] border-t border-[#DDD0C8] py-8 text-xs text-[#6E6A66] text-center">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-[#323232]">NoIssue AI — Agentic Customer Resolution Platform</p>
          <p className="mt-1">Built with Next.js, PostgreSQL (Neon), Upstash Redis, and Google Gemini AI.</p>
        </div>
      </footer>
    </div>
  );
}
