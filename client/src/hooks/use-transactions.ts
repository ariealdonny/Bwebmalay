import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertTransaction, type Transaction } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// POST /api/transactions
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertTransaction) => {
      const validated = api.transactions.create.input.parse(data);
      const res = await fetch(api.transactions.create.path, {
        method: api.transactions.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.transactions.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to create transaction');
      }
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate queries if we had a list endpoint, but mostly just for cache coherence
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// POST /api/transactions/:id/status
export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number, status: 'authorized' | 'rejected' }) => {
      const url = buildUrl(api.transactions.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.transactions.updateStatus.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error('Failed to update transaction status');
      }
      return await res.json();
    },
    onSuccess: () => {
      // Notification removed per user request
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}
