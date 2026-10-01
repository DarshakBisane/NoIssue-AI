'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Package, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RaiseIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated?: (ticketId: string) => void;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  items: { name: string }[];
}

export const RaiseIssueModal: React.FC<RaiseIssueModalProps> = ({
  isOpen,
  onClose,
  onTicketCreated,
}) => {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [investigatingStep, setInvestigatingStep] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCustomerOrders();
    }
  }, [isOpen]);

  const fetchCustomerOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/customer/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please provide both a subject and a description of your issue.');
      return;
    }

    setSubmitting(true);
    setError('');
    setInvestigatingStep('1. Identifying intent and analyzing query...');

    // Progress hints for user excitement
    const stepTimer1 = setTimeout(() => setInvestigatingStep('2. Retrieving account history & order details...'), 1200);
    const stepTimer2 = setTimeout(() => setInvestigatingStep('3. Querying policy knowledge base (RAG)...'), 2500);
    const stepTimer3 = setTimeout(() => setInvestigatingStep('4. Verifying evidence and computing resolution...'), 4000);

    try {
      const selectedOrder = orders.find(o => o.id === selectedOrderId);

      const res = await fetch('/api/customer/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          category,
          orderId: selectedOrderId || undefined,
          orderNumber: selectedOrder?.orderNumber || undefined,
          transactionId: transactionId.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit ticket');
      }

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      onClose();
      if (onTicketCreated) {
        onTicketCreated(data.ticket.id);
      } else {
        router.push(`/tickets/${data.ticket.id}`);
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setError(err.message || 'An error occurred while creating your ticket.');
      setSubmitting(false);
    }
  };

  const sampleScenarios = [
    {
      title: 'Refund for Damaged Item',
      sub: 'My package arrived with a cracked screen',
      desc: 'I received order ORD-77219 today and the screen is cracked. Need replacement or refund.',
      cat: 'Delivery',
    },
    {
      title: 'Duplicate Charge',
      sub: 'I was charged twice on my statement for ORD-61280',
      desc: 'I see two charges of $49.99 for order ORD-61280 on my card. Please refund the second charge.',
      cat: 'Payment',
    },
    {
      title: 'Delayed Delivery Inquiry',
      sub: 'My order has been delayed for over 4 days',
      desc: 'Order ORD-94102 has been stuck in transit for 4 days past the delivery date.',
      cat: 'Delivery',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#DDD0C8] rounded-2xl w-full max-w-2xl shadow-elevated overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#323232] text-white flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4 text-[#DDD0C8]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#212121]">Raise a Support Issue</h3>
              <p className="text-xs text-[#6E6A66]">NoIssue AI will immediately investigate and verify your case.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[#6E6A66] hover:text-[#212121] p-1.5 rounded-lg hover:bg-[#F2ECE6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {submitting ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F5EFEA] border border-[#DDD0C8] flex items-center justify-center mx-auto text-[#7A6555] animate-bounce">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-lg text-[#212121]">Investigating Your Issue...</h4>
            <p className="text-xs text-[#7A6555] font-medium animate-pulse">{investigatingStep}</p>
            <div className="max-w-md mx-auto bg-[#FAF8F5] p-3 rounded-xl border border-[#E8DFD7] text-xs text-[#6E6A66] text-left space-y-1.5 mt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Running specialized multi-agent workflow</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Checking customer records & verified policies</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Template Pills */}
            <div>
              <label className="block text-xs font-semibold text-[#6E6A66] mb-1.5">Quick Examples / Test Scenarios:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {sampleScenarios.map((sc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSubject(sc.sub);
                      setDescription(sc.desc);
                      setCategory(sc.cat);
                    }}
                    className="text-left p-2 rounded-lg border border-[#E8DFD7] bg-[#FAF8F5] hover:bg-[#F2ECE6] text-xs transition-colors"
                  >
                    <span className="font-semibold text-[#212121] block truncate">{sc.title}</span>
                    <span className="text-[10px] text-[#6E6A66] block truncate">{sc.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-[#323232] mb-1">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Broken item upon delivery or Duplicate charge"
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-white text-[#212121]"
              />
            </div>

            {/* Category & Order linking */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#323232] mb-1">
                  Category (Optional)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-white text-[#212121]"
                >
                  <option value="General">General Issue</option>
                  <option value="Refund">Refund Request</option>
                  <option value="Payment">Payment & Billing</option>
                  <option value="Delivery">Delivery & Transit</option>
                  <option value="Order">Order Issue</option>
                  <option value="Subscription">Subscription</option>
                  <option value="Account">Account & Access</option>
                  <option value="Product">Product / Defect</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#323232] mb-1">
                  Linked Order (Optional)
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  disabled={loadingOrders}
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-white text-[#212121]"
                >
                  <option value="">-- No Specific Order --</option>
                  {orders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderNumber} - ${ord.totalAmount} ({ord.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#323232] mb-1">
                Describe the problem in detail <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Feel free to write naturally. Include what happened, how you noticed it, and any details you have."
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#DDD0C8] focus:outline-none focus:ring-2 focus:ring-[#7A6555] bg-white text-[#212121]"
              />
              <p className="text-[10px] text-[#7A746E] mt-1">
                Natural language friendly. Typos, emotional wording, and incomplete queries are handled automatically.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E8DFD7]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#6E6A66] hover:bg-[#FAF8F5] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#323232] text-white hover:bg-[#1F1F1F] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Submit & Investigate</span>
                <ArrowRight className="w-4 h-4 text-[#DDD0C8]" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
