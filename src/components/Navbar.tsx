'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  HelpCircle, 
  User as UserIcon, 
  LogOut, 
  PlusCircle, 
  Layers, 
  History, 
  FileText, 
  Headphones, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role: 'customer' | 'support_agent' | 'admin';
  tier?: string;
  isVip?: boolean;
}

export const Navbar: React.FC<{ onRaiseIssueClick?: () => void }> = ({ onRaiseIssueClick }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      if (pathname.startsWith('/support')) {
        router.push('/support/login');
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isSupportPortal = pathname.startsWith('/support');

  return (
    <nav className="bg-[#FAF8F5] border-b border-[#DDD0C8] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#323232] text-white flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
                <Sparkles className="w-5 h-5 text-[#DDD0C8]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-[#212121] tracking-tight">NoIssue</span>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-[#EBE3DC] text-[#4A423C] border border-[#D8CDC3]">
                    AI
                  </span>
                </div>
                <span className="text-[10px] text-[#7A746E] hidden sm:block tracking-wide uppercase font-medium">
                  Investigate • Verify • Resolve
                </span>
              </div>
            </Link>

            {/* Portal Indicator */}
            {isSupportPortal && (
              <span className="ml-3 hidden md:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-[#323232] text-white">
                <Headphones className="w-3.5 h-3.5 text-[#DDD0C8]" />
                Support Specialist Portal
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {!loading && user ? (
              user.role === 'support_agent' || user.role === 'admin' ? (
                // Support Agent Links
                <>
                  <Link 
                    href="/support/dashboard" 
                    className={`flex items-center gap-1.5 transition-colors ${pathname === '/support/dashboard' ? 'text-[#212121] font-semibold' : 'text-[#6E6A66] hover:text-[#212121]'}`}
                  >
                    <Layers className="w-4 h-4" />
                    Case Queue
                  </Link>
                  <Link 
                    href="/support/policies" 
                    className={`flex items-center gap-1.5 transition-colors ${pathname === '/support/policies' ? 'text-[#212121] font-semibold' : 'text-[#6E6A66] hover:text-[#212121]'}`}
                  >
                    <FileText className="w-4 h-4" />
                    Knowledge Policies (RAG)
                  </Link>
                </>
              ) : (
                // Customer Links
                <>
                  <Link 
                    href="/dashboard" 
                    className={`flex items-center gap-1.5 transition-colors ${pathname === '/dashboard' ? 'text-[#212121] font-semibold' : 'text-[#6E6A66] hover:text-[#212121]'}`}
                  >
                    <Layers className="w-4 h-4" />
                    My Tickets
                  </Link>
                  <Link 
                    href="/history" 
                    className={`flex items-center gap-1.5 transition-colors ${pathname === '/history' ? 'text-[#212121] font-semibold' : 'text-[#6E6A66] hover:text-[#212121]'}`}
                  >
                    <History className="w-4 h-4" />
                    History & Retention
                  </Link>
                </>
              )
            ) : null}
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {!loading && user ? (
              <>
                {user.role === 'customer' && (
                  <button
                    onClick={onRaiseIssueClick}
                    className="hidden sm:inline-flex items-center gap-1.5 bg-[#323232] text-white hover:bg-[#1F1F1F] px-3.5 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4 text-[#DDD0C8]" />
                    Raise an Issue
                  </button>
                )}

                {/* User Dropdown */}
                <div className="relative">
                  {(() => {
                    const displayName = user?.name || user?.fullName || user?.email || 'User';
                    const initial = displayName.charAt(0).toUpperCase();

                    return (
                      <>
                        <button 
                          onClick={() => setMenuOpen(!menuOpen)}
                          className="flex items-center gap-2 bg-[#F2ECE6] hover:bg-[#EBE3DC] px-3 py-1.5 rounded-lg border border-[#E0D5CC] transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-[#323232] text-white flex items-center justify-center text-xs font-semibold">
                            {initial}
                          </div>
                          <div className="text-left hidden sm:block">
                            <div className="text-xs font-semibold text-[#212121] leading-tight">
                              {displayName}
                              {user.isVip && (
                                <span className="ml-1.5 text-[10px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">
                                  VIP
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#6E6A66] uppercase">{user.role}</span>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 text-[#6E6A66]" />
                        </button>

                        {/* Dropdown Menu */}
                        {menuOpen && (
                          <div className="absolute right-0 mt-2 w-56 bg-white border border-[#DDD0C8] rounded-xl shadow-elevated p-2 text-xs z-50">
                            <div className="px-3 py-2 border-b border-[#EFE8E1] mb-1">
                              <p className="font-semibold text-[#212121]">{displayName}</p>
                              <p className="text-[#6E6A66] truncate">{user.email}</p>
                              <span className="inline-block mt-1 text-[10px] bg-[#F2ECE6] px-1.5 py-0.5 rounded text-[#594F47] font-medium uppercase">
                                Role: {user.role}
                              </span>
                            </div>

                      {user.role === 'customer' ? (
                        <>
                          <Link 
                            href="/dashboard" 
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FAF8F5] text-[#323232]"
                          >
                            <Layers className="w-4 h-4 text-[#6E6A66]" />
                            Dashboard
                          </Link>
                          <Link 
                            href="/history" 
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FAF8F5] text-[#323232]"
                          >
                            <History className="w-4 h-4 text-[#6E6A66]" />
                            History (5-Day Retention)
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link 
                            href="/support/dashboard" 
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FAF8F5] text-[#323232]"
                          >
                            <Layers className="w-4 h-4 text-[#6E6A66]" />
                            Agent Workbench
                          </Link>
                          <Link 
                            href="/support/policies" 
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FAF8F5] text-[#323232]"
                          >
                            <FileText className="w-4 h-4 text-[#6E6A66]" />
                            Knowledge Base
                          </Link>
                        </>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs font-medium text-[#323232] hover:text-[#1F1F1F] px-3 py-2 rounded-lg hover:bg-[#F2ECE6] transition-colors"
                >
                  Customer Login
                </Link>
                <Link
                  href="/register"
                  className="text-xs font-medium bg-[#DDD0C8] text-[#212121] hover:bg-[#D5C8BD] px-3.5 py-2 rounded-lg transition-colors"
                >
                  Register
                </Link>
                <Link
                  href="/support/login"
                  className="text-xs font-medium bg-[#323232] text-white hover:bg-[#1F1F1F] px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Headphones className="w-3.5 h-3.5 text-[#DDD0C8]" />
                  Agent Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
