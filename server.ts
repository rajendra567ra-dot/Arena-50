import express from 'express';
import http from 'http';
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { tradingEngine } from './server/tradingEngine';
import { cryptoScanner } from './server/cryptoScanner';
import { telegramService } from './server/telegramService';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

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

  // Engine Start / Pause / Toggle Controls
  app.post('/api/engine/start', (req, res) => {
    try {
      tradingEngine.resumeEngine();
      const state = tradingEngine.getArenaState();
      res.json({ success: true, message: 'Autonomous live scanning started', state });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/engine/pause', (req, res) => {
    try {
      tradingEngine.pauseEngine();
      const state = tradingEngine.getArenaState();
      res.json({ success: true, message: 'Autonomous live scanning paused', state });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/engine/toggle', (req, res) => {
    try {
      const active = tradingEngine.toggleScanning();
      const state = tradingEngine.getArenaState();
      res.json({ success: true, isScanningActive: active, state });
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
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
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

  const server = http.createServer(app);

  let listenAttempts = 0;
  const maxListenAttempts = 15;
  const retryDelayMs = 1500;

  function bindServer() {
    listenAttempts++;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] AI Trading Arena Server running successfully at http://0.0.0.0:${PORT} (PID: ${process.pid})`);
    });
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} is currently in use (attempt ${listenAttempts}/${maxListenAttempts}). Waiting for previous container process to release socket...`);
      
      // Attempt to free port from stale previous instances in container environments
      try {
        execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`);
      } catch {
        // Ignored if command is unavailable or restricted
      }

      if (listenAttempts < maxListenAttempts) {
        setTimeout(() => {
          try {
            server.close();
          } catch {
            // ignore if not yet open
          }
          bindServer();
        }, retryDelayMs);
      } else {
        console.error(`[Server] FATAL: Port ${PORT} remained busy after ${maxListenAttempts} attempts (${(maxListenAttempts * retryDelayMs) / 1000}s).`);
        process.exit(1);
      }
    } else {
      console.error('[Server] Fatal server error:', err);
      process.exit(1);
    }
  });

  // Graceful shutdown handling for cloud orchestrators (SIGTERM, SIGINT)
  const shutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}. Gracefully stopping and releasing port ${PORT}...`);
    try {
      tradingEngine.savePersistentState(true);
    } catch (e) {
      console.error('[Server] Error saving state during shutdown:', e);
    }

    server.close(() => {
      console.log(`[Server] Port ${PORT} closed cleanly.`);
      process.exit(0);
    });

    // Safety timeout to avoid hanging shutdown
    setTimeout(() => {
      process.exit(0);
    }, 3000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  bindServer();
}

startServer();
