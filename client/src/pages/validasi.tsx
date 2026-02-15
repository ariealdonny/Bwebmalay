import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useUpdateTransactionStatus } from "@/hooks/use-transactions";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ShieldCheck, Clock, FileText, User, CreditCard, Loader2 } from "lucide-react";
import type { Transaction } from "@shared/schema";

export default function Authorization() {
  const [, params] = useRoute("/authorize/:id");
  const [location, navigate] = useLocation();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [countdown, setCountdown] = useState(119); // 1:59
  const updateStatus = useUpdateTransactionStatus();
  const [status, setStatus] = useState<'pending' | 'success' | 'rejected'>('pending');

  const id = params?.id ? parseInt(params.id) : 0;

  useEffect(() => {
    const savedTrx = localStorage.getItem("trx");
    if (savedTrx) {
      setTransaction(JSON.parse(savedTrx));
    } else {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (!transaction) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [transaction]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAction = (action: 'authorized' | 'rejected') => {
    // Capture metadata
    const metadata = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      vendor: navigator.vendor,
      timestamp: new Date().toISOString()
    };
    
    updateStatus.mutate({ 
      id, 
      status: action,
      metadata: JSON.stringify(metadata) 
    } as any, {
      onSuccess: () => {
        setStatus(action === 'authorized' ? 'success' : 'rejected');
      }
    });
  };

  if (!transaction) return null;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex justify-center">
      <div className="max-w-[390px] w-full bg-black min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {status === 'pending' ? (
            <motion.div 
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div className="bg-[#1b1b1b] p-[22px] flex justify-between items-center">
                <div className="text-sm tracking-tight">
                  <span className="font-bold">BIMB</span> SECURE
                </div>
                <div className="bg-black px-3 py-1.5 rounded-full text-sm font-bold">
                  {formatTime(countdown)}
                </div>
              </div>

              {/* Main Card */}
              <div className="bg-[#eaeaea] m-4 rounded-[16px] p-[18px] text-black space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[13px] text-[#777] font-medium">Fund Transfer</span>
                  <span className="text-[13px] font-bold">RM {Number(transaction.amount).toFixed(2)}</span>
                </div>

                <div className="space-y-1">
                  <div className="text-[16px] font-semibold leading-tight">{transaction.recipientName}</div>
                  <div className="text-[16px] font-semibold leading-tight">{transaction.bank}</div>
                  <div className="text-[16px] font-semibold leading-tight">{transaction.accountNumber}</div>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <div className="text-[13px] text-[#777]">Transfer Mode</div>
                    <div className="text-[15px] font-medium">{transaction.transferMode}</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-[#777]">Transfer Type</div>
                    <div className="text-[15px] font-medium">Fund Transfer to Savings/ Current</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-[#777]">Transfer From</div>
                    <div className="text-[15px] font-medium">{transaction.transferFrom}</div>
                    <div className="text-[13px] text-[#555]">021111 02 222222 2</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-[#777]">Reference</div>
                    <div className="text-[15px] font-medium">{transaction.reference}</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-[#777]">Date</div>
                    <div className="text-[15px] font-medium">Today, {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1" />

              {/* Footer */}
              <div className="p-4 space-y-6">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[15px] text-white/70">Amount</span>
                  <span className="text-[32px] font-extrabold text-white">RM {Number(transaction.amount).toFixed(2)}</span>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleAction('rejected')}
                    disabled={updateStatus.isPending}
                    className="flex-1 py-4 bg-[#ddd] text-black font-bold rounded-[14px] text-[15px] active:opacity-80 transition-opacity"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => handleAction('authorized')}
                    disabled={updateStatus.isPending}
                    className="flex-1 py-4 bg-[#9e1b32] text-white font-bold rounded-[14px] text-[15px] active:opacity-80 transition-opacity flex justify-center items-center"
                  >
                    {updateStatus.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorise"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-white rounded-[24px] w-full max-w-[320px] p-8 flex flex-col items-center relative overflow-hidden">
                <button 
                  onClick={() => navigate('/')}
                  className="absolute top-4 right-4 p-2 text-[#777]"
                >
                  <XCircle className="w-6 h-6" />
                </button>

                <div className="text-[18px] font-bold text-black mb-6 mt-2">
                  Transaction {status === 'success' ? 'Authorised' : 'Rejected'}
                </div>

                <div className="mb-8 relative">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${status === 'success' ? 'bg-[#9e1b32]/10 text-[#9e1b32]' : 'bg-gray-100 text-gray-500'}`}>
                    {status === 'success' ? (
                      <div className="border-[3px] border-[#9e1b32] rounded-[14px] p-2 flex flex-col items-center">
                        <span className="text-[10px] font-black leading-none italic">b</span>
                        <ShieldCheck className="w-8 h-8 -mt-1" />
                      </div>
                    ) : (
                      <XCircle className="w-12 h-12" />
                    )}
                  </div>
                </div>
                
                <div className="text-center text-[15px] text-[#444] mb-8 leading-relaxed px-2">
                  {status === 'success' 
                    ? 'You have successfully AUTHORISED this transaction/ request.'
                    : 'You have successfully REJECTED this transaction/ request.'}
                </div>

                <button 
                  onClick={() => navigate('/')}
                  className="w-full py-[14px] bg-[#e32b50] text-white font-bold rounded-full text-[16px] active:opacity-90 transition-opacity"
                >
                  OK
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
