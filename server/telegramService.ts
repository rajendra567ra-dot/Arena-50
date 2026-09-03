import { Bot, TelegramConfig } from '../src/types';

class TelegramService {
  private config: TelegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    intervalHours: 3,
    lastSentTimestamp: 0,
    instantTradeAlerts: false,
  };

  private timer: NodeJS.Timeout | null = null;
  private botsProvider: () => Bot[] = () => [];

  constructor() {
    this.startScheduler();
  }

  public initBotsProvider(provider: () => Bot[]) {
    this.botsProvider = provider;
  }

  public getConfig(): TelegramConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<TelegramConfig>): TelegramConfig {
    this.config = {
      ...this.config,
      ...newConfig,
      enabled: newConfig.enabled !== undefined ? newConfig.enabled : (!!newConfig.botToken && !!newConfig.chatId),
    };

    this.startScheduler();
    return this.getConfig();
  }

  private startScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const intervalMs = Math.max(1, this.config.intervalHours) * 60 * 60 * 1000;
    
    // Check every minute if 3 hours elapsed
    this.timer = setInterval(() => {
      const now = Date.now();
      if (this.config.enabled && this.config.botToken && this.config.chatId) {
        if (now - (this.config.lastSentTimestamp || 0) >= intervalMs) {
          this.sendPeriodicReport();
        }
      }
    }, 60000);
  }

  public async sendPeriodicReport(): Promise<{ success: boolean; message: string; payload?: string }> {
    const bots = this.botsProvider();
    const reportText = this.generateReportMessage(bots);
    const result = await this.sendMessage(reportText);

    if (result.success) {
      this.config.lastSentTimestamp = Date.now();
      this.config.lastSentReport = reportText;
    }
    return { ...result, payload: reportText };
  }

  public async sendTradeAlert(bot: Bot, symbol: string, type: 'OPEN' | 'CLOSE', pnl?: number, reason?: string) {
    if (!this.config.enabled || !this.config.instantTradeAlerts) return;

    let text = '';
    if (type === 'OPEN') {
      text = `⚡ *LIVE TRADE EXECUTED*\n` +
        `🤖 *Bot:* ${bot.name} (\`${bot.serialNumber}\`)\n` +
        `🪙 *Symbol:* ${symbol}\n` +
        `📊 *Strategy:* ${bot.strategy.name}\n` +
        `🎯 *Confidence:* ${bot.brain.confidenceScore}% (Brain Lvl ${bot.brain.brainLevel})`;
    } else {
      const isProfit = (pnl || 0) >= 0;
      text = `${isProfit ? '🟢' : '🔴'} *TRADE CLOSED*\n` +
        `🤖 *Bot:* ${bot.name} (\`${bot.serialNumber}\`)\n` +
        `🪙 *Symbol:* ${symbol}\n` +
        `💰 *PnL:* ${isProfit ? '+' : ''}$${(pnl || 0).toFixed(2)} USD\n` +
        `🏁 *Reason:* ${reason || 'TARGET_HIT'}\n` +
        `📈 *Bot Balance:* $${bot.currentBalance.toFixed(2)}`;
    }

    await this.sendMessage(text);
  }

  public generateReportMessage(bots: Bot[]): string {
    const sortedByPerformance = [...bots].sort((a, b) => {
      // Primary score: Total PnL * (WinRate / 100) + TotalTrades
      const scoreB = b.totalPnl + (b.winRate * 0.5) + (b.winTrades * 2);
      const scoreA = a.totalPnl + (a.winRate * 0.5) + (a.winTrades * 2);
      return scoreB - scoreA;
    });

    const top10 = sortedByPerformance.slice(0, 10);
    const totalTrades = bots.reduce((acc, b) => acc + b.totalTrades, 0);
    const totalWins = bots.reduce((acc, b) => acc + b.winTrades, 0);
    const totalLosses = bots.reduce((acc, b) => acc + b.lossTrades, 0);
    const arenaPnl = bots.reduce((acc, b) => acc + b.totalPnl, 0);
    const arenaWinRate = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : '0.0';
    const activeTradesCount = bots.filter(b => b.activeTrade).length;

    let msg = `🏆 *TOP 50 AI TRADING BOT ARENA — 3-HOUR REPORT*\n`;
    msg += `⏱ *Time:* ${new Date().toUTCString()}\n`;
    msg += `🌐 *Status:* 24/7 Cloud Running | Fast Live Crypto Feed\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *ARENA AGGREGATE STATS*\n`;
    msg += `• *Total Arena Trades:* ${totalTrades} (Wins: ${totalWins} | Losses: ${totalLosses})\n`;
    msg += `• *Arena Win Rate:* ${arenaWinRate}%\n`;
    msg += `• *Net Arena PnL:* ${arenaPnl >= 0 ? '+' : ''}$${arenaPnl.toFixed(2)} USD\n`;
    msg += `• *Active Live Positions:* ${activeTradesCount} trades\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🥇 *TOP 10 PERFORMING AI BOTS*\n`;

    top10.forEach((bot, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
      const pnlSign = bot.totalPnl >= 0 ? '+' : '';
      msg += `${medal} *${bot.name}* (\`${bot.serialNumber}\`)\n`;
      msg += `   └ 💰 PnL: *${pnlSign}$${bot.totalPnl.toFixed(2)}* (${pnlSign}${bot.totalPnlPercent.toFixed(1)}%) | Bal: $${bot.currentBalance.toFixed(2)}\n`;
      msg += `   └ 🎯 WR: *${bot.winRate.toFixed(1)}%* (W: ${bot.winTrades} | L: ${bot.lossTrades} | Total: ${bot.totalTrades})\n`;
      msg += `   └ 🧠 Brain Lvl: ${bot.brain.brainLevel} | ${bot.strategy.coreArchetype}\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🧠 *LATEST AI BRAIN NEURAL LEARNINGS*\n`;
    
    // Pick 2 interesting recent lessons from any bot
    const allLessons = bots.flatMap(b => b.brain.lessons);
    if (allLessons.length > 0) {
      const recentLessons = allLessons.slice(-2);
      recentLessons.forEach((l, i) => {
        msg += `• *Mistake Filtered:* ${l.mistakeIdentified}\n  ↳ *Adaptation:* ${l.adaptationMade} (${l.parameterAdjusted})\n`;
      });
    } else {
      msg += `• *Neural State:* All 50 bots executing strict risk rules (3% dynamic capital, Max 1.5% SL of dynamic capital, TP1 < SL). Brains continuously optimizing!\n`;
    }

    msg += `\n🤖 _Continuous 24/7 scanning active in AIC Cloud Container._`;
    return msg;
  }

  public async sendMessage(text: string): Promise<{ success: boolean; message: string }> {
    if (!this.config.botToken || !this.config.chatId) {
      return {
        success: false,
        message: 'Telegram Bot Token or Chat ID is not configured. Please enter your credentials in the Telegram Settings.',
      };
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text: text,
          parse_mode: 'Markdown',
        }),
      });

      const resData: any = await response.json();
      if (response.ok && resData.ok) {
        return { success: true, message: 'Telegram update successfully dispatched!' };
      } else {
        return {
          success: false,
          message: `Telegram API Error: ${resData.description || 'Failed to send message'}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Network Error connecting to Telegram API: ${err.message || String(err)}`,
      };
    }
  }
}

export const telegramService = new TelegramService();
