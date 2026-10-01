import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, ShieldCheck, FileText, Package, CreditCard, Sparkles, AlertCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface InvestigationCardProps {
  investigation: {
    id: string;
    intentDetected?: string;
    intentCategory?: string;
    policyTitle?: string;
    policyExcerpt?: string;
    rootCause?: string;
    verificationStatus: string;
    verificationReason?: string;
    decisionOutcome: string;
    resolutionExplanation?: string;
    actionTakenSummary?: string;
    evidence?: { label: string; value: string; status?: 'verified' | 'warning' | 'alert' | 'info' }[];
    steps?: { step: string; status: string; summary: string }[];
  } | null;
  ticketStatus: string;
}

export const InvestigationCard: React.FC<InvestigationCardProps> = ({
  investigation,
  ticketStatus,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!investigation) {
    return (
      <div className="bg-[#F8F5F1] border border-[#E5DDD5] rounded-xl p-5 mb-6 text-[#6E6A66] flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-amber-600 animate-spin" />
        <div>
          <p className="font-medium text-[#323232]">AI Investigation in progress...</p>
          <p className="text-sm">Analyzing intent, retrieving policies, and verifying evidence.</p>
        </div>
      </div>
    );
  }

  const defaultChecklist = [
    { label: 'Customer history verified', done: true },
    { label: 'Previous tickets checked', done: true },
    { label: 'Order records retrieved', done: true },
    { label: 'Payment gateway status verified', done: true },
    { label: 'Relevant company policy matched (RAG)', done: true },
    { label: 'Evidence cross-verified', done: true },
    { label: 'Resolution path determined', done: true },
  ];

  return (
    <div className="bg-[#FAF8F5] border border-[#DDD0C8] rounded-xl overflow-hidden shadow-subtle mb-6">
      {/* Header Banner */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 bg-[#F2ECE6] border-b border-[#E2D7CF] flex items-center justify-between cursor-pointer hover:bg-[#EBE3DC] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#323232] text-white flex items-center justify-center font-semibold text-xs">
            AI
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-[#212121]">Transparent AI Investigation Summary</h3>
              <StatusBadge verification={investigation.verificationStatus} size="sm" />
            </div>
            <p className="text-xs text-[#6E6A66]">
              Verified multi-agent case audit • Category: <span className="font-medium text-[#323232]">{investigation.intentCategory || 'General'}</span>
            </p>
          </div>
        </div>

        <button className="text-[#6E6A66] hover:text-[#323232] flex items-center gap-1 text-xs font-medium">
          {isExpanded ? (
            <>Hide details <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>View evidence <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 space-y-5">
          {/* Completed Verification Checklist */}
          <div>
            <h4 className="text-xs font-semibold text-[#6E6A66] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Investigation Steps Completed
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {defaultChecklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-[#EBE4DD] text-[#323232]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Used */}
          {investigation.evidence && investigation.evidence.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[#6E6A66] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#7A6555]" />
                Evidence Used
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {investigation.evidence.map((ev, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-[#E8DFD7] text-xs">
                    <span className="text-[#8F8781] block font-medium mb-0.5">{ev.label}</span>
                    <span className="text-[#212121] font-semibold">{ev.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Policy */}
          {investigation.policyTitle && (
            <div className="bg-[#F6F1EC] p-3.5 rounded-lg border border-[#E2D6CB]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#59493E] mb-1">
                <FileText className="w-3.5 h-3.5" />
                Retrieved Policy: {investigation.policyTitle}
              </div>
              <p className="text-xs text-[#524E4B] italic">
                "{investigation.policyExcerpt || 'Governing standard terms applied.'}"
              </p>
            </div>
          )}

          {/* Resolution Findings */}
          <div className="bg-white p-4 rounded-xl border border-[#DDD0C8] shadow-subtle space-y-3">
            <h4 className="text-xs font-semibold text-[#323232] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#7A6555]" />
              Resolution Breakdown
            </h4>

            <div className="space-y-2 text-xs text-[#423E3B]">
              {investigation.rootCause && (
                <div>
                  <span className="font-semibold text-[#212121] block">What Was Found:</span>
                  <p className="mt-0.5">{investigation.rootCause}</p>
                </div>
              )}

              {investigation.resolutionExplanation && (
                <div>
                  <span className="font-semibold text-[#212121] block">Why This Resolution Applies:</span>
                  <p className="mt-0.5">{investigation.resolutionExplanation}</p>
                </div>
              )}

              {investigation.actionTakenSummary && (
                <div>
                  <span className="font-semibold text-[#212121] block">Action Taken:</span>
                  <p className="mt-0.5 font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200">
                    {investigation.actionTakenSummary}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
