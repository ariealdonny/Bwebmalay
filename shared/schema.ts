import { pgTable, text, serial, numeric, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  recipientName: text("recipient_name").notNull(),
  bank: text("bank").notNull(),
  accountNumber: text("account_number").notNull(),
  transferMode: text("transfer_mode").notNull(),
  transferFrom: text("transfer_from").notNull(),
  reference: text("reference").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  fullName: text("full_name"),
  icCard: text("ic_card"),
  phoneNumber: text("phone_number"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true,
  status: true 
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
