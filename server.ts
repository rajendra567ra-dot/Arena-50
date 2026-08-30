import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { tradingEngine } from './server/tradingEngine';
import { cryptoScanner } from './server/cryptoScanner';
import { telegramService } from './server/telegramService';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Arena full state
  app.get('/api/arena', (req, res) => {
    try {
      const state = tradingEngine.getArenaState();
      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // All 50 Bots
  app.get('/api/bots', (req, res) => {
    try {
      const bots = tradingEngine.getAllBots();
      res.json(bots);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Single Bot deep info
  app.get('/api/bots/:id', (req, res) => {
    try {
      const bot = tradingEngine.getBot(req.params.id);
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }
      res.json(bot);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Live and historical trades
  app.get('/api/trades', (req, res) => {
    try {
      const live = tradingEngine.getLiveTrades();
      const history = tradingEngine.getAllTrades();
      res.json({ live, history });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Market coins
  app.get('/api/market', (req, res) => {
    try {
      const coins = cryptoScanner.getAllCoins();
      res.json(coins);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset ALL 50 bots to fresh $100
  app.post('/api/reset', (req, res) => {
    try {
      tradingEngine.resetAllBots();
      const state = tradingEngine.getArenaState();
      res.json({ success: true, message: 'All 50 bots reset to $100 accounts', state });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset a single bot
  app.post('/api/reset/:id', (req, res) => {
    try {
      const success = tradingEngine.resetBot(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Bot not found' });
      }
      const bot = tradingEngine.getBot(req.params.id);
      res.json({ success: true, message: `Bot ${req.params.id} reset to $100`, bot });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Trigger Gemini AI Brain Reflection
  app.post('/api/ai/reflect/:botId', async (req, res) => {
    try {
      const result = await tradingEngine.triggerAiReflectionForBot(req.params.botId);
      if (!result) {
        return res.status(404).json({ error: 'Bot not found for reflection' });
      }
      const bot = tradingEngine.getBot(req.params.botId);
      res.json({ success: true, reflection: result, bot });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Telegram Config
  app.get('/api/telegram/config', (req, res) => {
    try {
      const config = telegramService.getConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/telegram/config', (req, res) => {
    try {
      const updated = telegramService.updateConfig(req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Send Test / On-demand Telegram 3-Hour Report
  app.post('/api/telegram/test', async (req, res) => {
    try {
      const result = await telegramService.sendPeriodicReport();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // --- Vite & Static Asset Handling ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Trading Arena Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
