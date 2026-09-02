import React, { useState, useEffect } from 'react';
import { 
  Bot as BotIcon, 
  Send, 
  RotateCcw, 
  Cloud, 
  Activity, 
  ShieldCheck, 
  Sparkles,
  Volume2,
  VolumeX,
  Home,
  Zap,
  LayoutGrid,
  Coins,
  Play,
  Pause
} from 'lucide-react';
import { TelegramConfig } from '../types';

interface NavbarProps {
  onOpenTelegram: () => void;
  onOpenResetConfirm: () => void;
  telegramConfig?: TelegramConfig;
  uptimeSeconds: number;
  cloudStartedAt?: number;
  marketStatus: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeView?: 'GRID' | 'TABLE' | 'ALL_TRADES' | 'CMC500';
  onViewChange?: (view: 'GRID' | 'TABLE' | 'ALL_TRADES' | 'CMC500') => void;
  liveTradesCount?: number;
  totalCoinsCount?: number;
  isScanningActive?: boolean;
  onToggleEngine?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTelegram,
  onOpenResetConfirm,
  telegramConfig,
  uptimeSeconds,
  cloudStartedAt,
  marketStatus,
  soundEnabled,
  onToggleSound,
  activeView = 'GRID',
  onViewChange,
  liveTradesCount = 0,
  totalCoinsCount = 60,
  isScanningActive = true,
  onToggleEngine,
}) => {
  // Continuous 24x7 Cloud Uptime Clock Calculation
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const format24x7Uptime = () => {
    const start = cloudStartedAt || (Date.now() - uptimeSeconds * 1000);
    const diffSec = Math.max(0, Math.floor((nowTime - start) / 1000));
    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;
    return `${days.toString().padStart(2, '0')}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
        
        {/* Brand & Logo - Clickable to return to Home */}
        <div 
          onClick={() => onViewChange && onViewChange('GRID')} 
          className="flex items-center space-x-2.5 cursor-pointer group"
          title="Click to return to Arena Home"
        >
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30 group-hover:scale-105 transition-transform">
            <BotIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-['Outfit'] group-hover:text-cyan-300 transition-colors">
                QUANTUM 50 <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">ARENA</span>
              </h1>
              <span className="hidden sm:inline-block rounded-md border border-cyan-500/30 bg-cyan-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                50 AI BOTS
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400">
              Autonomous Market Scanner &bull; Multi-Stage TP1/TP2 &bull; Human Self-Improvement
            </p>
          </div>
        </div>

        {/* Center Primary Navigation Buttons: Home | Live Trades | CMC 500 */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          {/* Return to Home Page Button */}
          <button
            id="nav-btn-home"
            onClick={() => onViewChange && onViewChange('GRID')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all ${
              activeView === 'GRID'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Return to Home Page / 50 Bot Arena"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>

          {/* Dedicated Live Trades Button */}
          <button
            id="nav-btn-live-trades"
            onClick={() => onViewChange && onViewChange('ALL_TRADES')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all relative ${
              activeView === 'ALL_TRADES'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            title="View all live trades and open positions"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Live Trades</span>
            {liveTradesCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                activeView === 'ALL_TRADES' ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}>
                {liveTradesCount}
              </span>
            )}
          </button>

          {/* Dedicated CMC 500 Coins Button */}
          <button
            id="nav-btn-cmc-500"
            onClick={() => onViewChange && onViewChange('CMC500')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all relative ${
              activeView === 'CMC500'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/25 font-extrabold'
                : 'text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/20'
            }`}
            title="View CMC 500 Live Market Scanner, Multi-Timeframe Confluence & Indicators"
          >
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span>CMC 500</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
              activeView === 'CMC500' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {totalCoinsCount}
            </span>
          </button>
        </div>

        {/* Right Status Indicators & Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          
          {/* Continuous 24x7 Cloud Uptime Clock */}
          <div 
            className="hidden md:flex items-center space-x-2 rounded-lg border border-cyan-900/40 bg-cyan-950/40 px-2.5 py-1.5 text-xs text-cyan-300 shadow-sm"
            title="App Performing Time: Continuous 24/7 Cloud Running Time"
          >
            <Cloud className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-400 font-medium">24x7 Run Time:</span>
            <span className="font-mono font-bold text-cyan-200 tracking-tight">{format24x7Uptime()}</span>
          </div>

          {/* Engine Start / Pause Scanner Toggle */}
          {onToggleEngine && (
            <button
              id="nav-btn-toggle-engine"
              onClick={onToggleEngine}
              className={`hidden sm:flex items-center space-x-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                isScanningActive
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                  : 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40'
              }`}
              title={isScanningActive ? 'Engine is scanning market 24/7. Click to pause.' : 'Engine scanning is paused. Click to start scanning.'}
            >
              {isScanningActive ? (
                <>
                  <Pause className="h-3 w-3 text-emerald-400" />
                  <span>Scanning Live</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 text-amber-400" />
                  <span>Start Scanning</span>
                </>
              )}
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Alert Sounds' : 'Unmute Alert Sounds'}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Telegram Config Button */}
          <button
            onClick={onOpenTelegram}
            className={`flex items-center space-x-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
              telegramConfig?.enabled
                ? 'border-sky-500/50 bg-sky-950/60 text-sky-300 hover:bg-sky-900/60 shadow-md shadow-sky-950/40'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
            }`}
            title="Configure Telegram Trade & 3-Hour PnL Summary Alerts"
          >
            <Send className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden sm:inline">Telegram</span>
            {telegramConfig?.enabled && (
              <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            )}
          </button>

          {/* Reset Everything to New Button */}
          <button
            id="nav-btn-reset-all"
            onClick={onOpenResetConfirm}
            className="flex items-center space-x-1.5 rounded-lg border border-red-500/40 bg-red-950/50 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-red-300 hover:border-red-500 hover:bg-red-900/60 hover:text-white transition-all shadow-sm group"
            title="Reset everything to fresh 0 live trades and $100 starting accounts"
          >
            <RotateCcw className="h-3.5 w-3.5 text-red-400 group-hover:rotate-180 transition-transform duration-500" />
            <span>Reset (0 Trades)</span>
          </button>
        </div>

      </div>
    </header>
  );
};
