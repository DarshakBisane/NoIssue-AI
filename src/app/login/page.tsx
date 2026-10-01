'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle, UserCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    if (!loginEmail || !loginPass) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      if (data.user.role === 'support_agent' || data.user.role === 'admin') {
        router.push('/support/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    handleLogin(undefined, demoEmail, 'Password123!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md bg-white border border-[#DDD0C8] rounded-2xl shadow-card overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-[#FAF8F5] border-b border-[#E8DFD7] text-center">
            <div className="w-10 h-10 rounded-xl bg-[#323232] text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Sparkles className="w-5 h-5 text-[#DDD0C8]" />
            </div>
            <h1 className="text-xl font-bold text-[#212121]">Customer Portal</h1>
            <p className="text-xs text-[#6E6A66] mt-1">Sign in to raise issues and track AI case resolutions.</p>
          </div>

          <div className="p-6 space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#323232] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8F8781] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-white text-[#212121]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#323232] mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8F8781] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-white text-[#212121]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-xs font-semibold bg-[#323232] text-white hover:bg-[#1F1F1F] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? 'Authenticating...' : 'Sign In as Customer'}
                <ArrowRight className="w-4 h-4 text-[#DDD0C8]" />
              </button>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="pt-3 border-t border-[#EFE8E1]">
              <span className="text-[11px] font-bold text-[#7A746E] uppercase tracking-wider block mb-2">
                1-Click Demo Login:
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleDemoFill('marcus.vance@example.com')}
                  className="w-full text-left p-2 rounded-lg border border-[#EBE4DD] bg-[#FAF8F5] hover:bg-[#F2ECE6] text-xs flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-[#212121]">Marcus Vance (Gold Customer)</span>
                  <span className="text-[10px] text-[#7A6555]">Duplicate Charge Case</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoFill('sarah.chen@example.com')}
                  className="w-full text-left p-2 rounded-lg border border-[#EBE4DD] bg-[#FAF8F5] hover:bg-[#F2ECE6] text-xs flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-[#212121]">Sarah Chen (VIP Platinum)</span>
                  <span className="text-[10px] text-[#7A6555]">High-Value Damaged Case</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoFill('alex.rivers@example.com')}
                  className="w-full text-left p-2 rounded-lg border border-[#EBE4DD] bg-[#FAF8F5] hover:bg-[#F2ECE6] text-xs flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-[#212121]">Alex Rivers (Standard Customer)</span>
                  <span className="text-[10px] text-[#7A6555]">Delayed Refund Case</span>
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-[#6E6A66] pt-2">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-[#323232] underline hover:text-black">
                Register now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
