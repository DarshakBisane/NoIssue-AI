import React from 'react';
import { Priority, TicketStatus, VerificationStatus } from '@/types';

interface StatusBadgeProps {
  status?: TicketStatus | string;
  priority?: Priority | string;
  verification?: VerificationStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  priority,
  verification,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-medium',
  }[size];

  if (status) {
    switch (status) {
      case 'OPEN':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            Open
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 animate-pulse ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            AI Investigating
          </span>
        );
      case 'AI_RESOLVED':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
            AI Resolved
          </span>
        );
      case 'HUMAN_REVIEW':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-purple-50 text-purple-800 border border-purple-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mr-1.5"></span>
            Human Review
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-sky-50 text-sky-800 border border-sky-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mr-1.5"></span>
            In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-teal-50 text-teal-800 border border-teal-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mr-1.5"></span>
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-stone-100 text-stone-600 border border-stone-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400 mr-1.5"></span>
            Closed
          </span>
        );
      case 'ESCALATED':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5"></span>
            Escalated
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-stone-100 text-stone-700 border border-stone-200 ${sizeClasses}`}>
            {status}
          </span>
        );
    }
  }

  if (priority) {
    switch (priority) {
      case 'URGENT':
        return (
          <span className={`inline-flex items-center font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className={`inline-flex items-center font-medium rounded-md bg-orange-50 text-orange-700 border border-orange-200 ${sizeClasses}`}>
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className={`inline-flex items-center font-medium rounded-md bg-stone-100 text-stone-700 border border-stone-200 ${sizeClasses}`}>
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className={`inline-flex items-center font-medium rounded-md bg-stone-50 text-stone-500 border border-stone-200 ${sizeClasses}`}>
            LOW
          </span>
        );
    }
  }

  if (verification) {
    switch (verification) {
      case 'SUPPORTED':
        return (
          <span className={`inline-flex items-center font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 ${sizeClasses}`}>
            ✓ SUPPORTED
          </span>
        );
      case 'PARTIALLY_SUPPORTED':
        return (
          <span className={`inline-flex items-center font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-300 ${sizeClasses}`}>
            ⚠ PARTIALLY SUPPORTED
          </span>
        );
      case 'CONFLICTING':
        return (
          <span className={`inline-flex items-center font-medium rounded-md bg-rose-50 text-rose-800 border border-rose-300 ${sizeClasses}`}>
            ✕ CONFLICTING EVIDENCE
          </span>
        );
      case 'INSUFFICIENT_EVIDENCE':
        return (
          <span className={`inline-flex items-center font-medium rounded-md bg-stone-100 text-stone-700 border border-stone-300 ${sizeClasses}`}>
            ? INSUFFICIENT EVIDENCE
          </span>
        );
    }
  }

  return null;
};
