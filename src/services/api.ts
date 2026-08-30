import { ArenaState, Bot, MarketCoin, TelegramConfig, Trade } from '../types';

export const api = {
  async getArenaState(): Promise<ArenaState> {
    const res = await fetch('/api/arena');
    if (!res.ok) throw new Error('Failed to fetch arena state');
    return res.json();
  },

  async getBots(): Promise<Bot[]> {
    const res = await fetch('/api/bots');
    if (!res.ok) throw new Error('Failed to fetch bots');
    return res.json();
  },

  async getBot(id: string): Promise<Bot> {
    const res = await fetch(`/api/bots/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch bot ${id}`);
    return res.json();
  },

  async getTrades(): Promise<{ live: Trade[]; history: Trade[] }> {
    const res = await fetch('/api/trades');
    if (!res.ok) throw new Error('Failed to fetch trades');
    return res.json();
  },

  async getMarket(): Promise<MarketCoin[]> {
    const res = await fetch('/api/market');
    if (!res.ok) throw new Error('Failed to fetch market');
    return res.json();
  },

  async resetAllBots(): Promise<{ success: boolean; state: ArenaState }> {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset all bots');
    return res.json();
  },

  async resetBot(botId: string): Promise<{ success: boolean; bot: Bot }> {
    const res = await fetch(`/api/reset/${botId}`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to reset bot ${botId}`);
    return res.json();
  },

  async triggerAiReflection(botId: string): Promise<{ success: boolean; bot: Bot; reflection: any }> {
    const res = await fetch(`/api/ai/reflect/${botId}`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to trigger reflection for bot ${botId}`);
    return res.json();
  },

  async getTelegramConfig(): Promise<TelegramConfig> {
    const res = await fetch('/api/telegram/config');
    if (!res.ok) throw new Error('Failed to fetch Telegram config');
    return res.json();
  },

  async updateTelegramConfig(config: Partial<TelegramConfig>): Promise<{ success: boolean; config: TelegramConfig }> {
    const res = await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to update Telegram config');
    return res.json();
  },

  async sendTestTelegram(): Promise<{ success: boolean; message: string; payload?: string }> {
    const res = await fetch('/api/telegram/test', { method: 'POST' });
    return res.json();
  },
};
