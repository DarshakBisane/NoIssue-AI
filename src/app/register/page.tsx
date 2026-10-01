'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, Mail, User, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register account');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-xl font-bold text-[#212121]">Create Customer Account</h1>
            <p className="text-xs text-[#6E6A66] mt-1">Join NoIssue AI to manage and track your support inquiries.</p>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#323232] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8F8781] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-white text-[#212121]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#323232] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8F8781] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-white text-[#212121]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#323232] mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8F8781] absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
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
                    placeholder="Minimum 6 characters"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-white text-[#212121]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-xs font-semibold bg-[#323232] text-white hover:bg-[#1F1F1F] transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
              >
                {loading ? 'Creating Account...' : 'Register Account'}
                <ArrowRight className="w-4 h-4 text-[#DDD0C8]" />
              </button>
            </form>

            <div className="text-center text-xs text-[#6E6A66] pt-3 border-t border-[#EFE8E1]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#323232] underline hover:text-black">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
