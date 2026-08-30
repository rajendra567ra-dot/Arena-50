import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Clock, Shield, Sparkles, HelpCircle } from 'lucide-react';
import { TelegramConfig } from '../types';
import { api } from '../services/api';

interface TelegramConfigModalProps {
  config?: TelegramConfig;
  onClose: () => void;
  onConfigSaved: (config: TelegramConfig) => void;
}

export const TelegramConfigModal: React.FC<TelegramConfigModalProps> = ({
  config,
  onClose,
  onConfigSaved,
}) => {
  const [botToken, setBotToken] = useState(config?.botToken || '');
  const [chatId, setChatId] = useState(config?.chatId || '');
  const [intervalHours, setIntervalHours] = useState(config?.intervalHours || 3);
  const [instantAlerts, setInstantAlerts] = useState(config?.instantTradeAlerts || false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; payload?: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.updateTelegramConfig({
        botToken,
        chatId,
        intervalHours,
        instantTradeAlerts: instantAlerts,
        enabled: !!(botToken && chatId),
      });
      if (res.success) {
        onConfigSaved(res.config);
      }
    } catch (err: any) {
      console.error('Failed to save Telegram config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestReport = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // First save current inputs
      await api.updateTelegramConfig({
        botToken,
        chatId,
        intervalHours,
        instantTradeAlerts: instantAlerts,
        enabled: !!(botToken && chatId),
      });

      const res = await api.sendTestTelegram();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Error triggering test report' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 p-4 sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit'] sm:text-lg">
                Telegram 3-Hour Automated Broadcasts
              </h2>
              <p className="text-xs text-slate-400">
                24/7 autonomous updates with Top 10 bots, Win Rates, Total Trades &amp; Neural Brain learnings.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-800/80 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Cloud Running Guarantee Banner */}
          <div className="rounded-xl border border-sky-900/50 bg-sky-950/40 p-3.5 text-xs text-sky-200 flex items-start space-x-2.5">
            <Shield className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-sky-300">24/7 Cloud Background Execution:</strong> This trading engine runs persistently on the cloud server. Even when your phone or computer is switched off, the server continues scanning the market, executing trades, evolving AI brains, and sending your Telegram updates every 3 hours!
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            
            {/* Telegram Bot Token */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telegram Bot Token
              </label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="e.g. 7123456789:AAHkL7eZ..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <p className="mt-1 text-[11px] text-slate-500 flex items-center">
                <HelpCircle className="mr-1 h-3 w-3" />
                Obtain in 30 seconds for free by messaging <strong>@BotFather</strong> on Telegram and typing <code className="text-sky-400 ml-1">/newbot</code>.
              </p>
            </div>

            {/* Telegram Chat ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telegram Chat ID (Your User ID or Channel ID)
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. 123456789 or -100123456789"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                To find your Chat ID, message <strong>@userinfobot</strong> or <strong>@getmyid_bot</strong> on Telegram.
              </p>
            </div>

            {/* Interval and Instant alerts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
                  <Clock className="mr-1 h-3.5 w-3.5 text-sky-400" />
                  <span>Broadcast Interval (Hours)</span>
                </label>
                <select
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value={1}>Every 1 Hour</option>
                  <option value={2}>Every 2 Hours</option>
                  <option value={3}>Every 3 Hours (Recommended)</option>
                  <option value={6}>Every 6 Hours</option>
                  <option value={12}>Every 12 Hours</option>
                  <option value={24}>Every 24 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instant Trade Alerts
                </label>
                <button
                  type="button"
                  onClick={() => setInstantAlerts(!instantAlerts)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                    instantAlerts
                      ? 'border-sky-500 bg-sky-950/60 text-sky-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <span>Real-time Trade Pings</span>
                  <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    instantAlerts ? 'border-sky-400 bg-sky-400 text-slate-950 font-bold text-[10px]' : 'border-slate-700'
                  }`}>
                    {instantAlerts ? '✓' : ''}
                  </span>
                </button>
              </div>
            </div>

          </div>

          {/* Test Dispatch Feedback */}
          {testResult && (
            <div
              className={`rounded-xl border p-3.5 text-xs space-y-2 ${
                testResult.success
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold">
                {testResult.success ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-rose-400" />}
                <span>{testResult.message}</span>
              </div>
              {testResult.payload && (
                <div className="rounded-lg bg-black/60 p-2 font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap text-slate-300">
                  {testResult.payload}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/70 p-4 sm:p-5">
          <button
            type="button"
            onClick={handleSendTestReport}
            disabled={isTesting || !botToken || !chatId}
            className="flex items-center space-x-1.5 rounded-xl border border-sky-500/40 bg-sky-950/60 px-3.5 py-2 text-xs font-bold text-sky-300 hover:bg-sky-900/60 disabled:opacity-40 transition-all"
          >
            <Send className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Dispatching...' : '📡 Send Test 3-Hour Report Now'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-950/40 transition-all"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
