import React from 'react';
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
  LayoutGrid
} from 'lucide-react';
import { TelegramConfig } from '../types';

interface NavbarProps {
  onOpenTelegram: () => void;
  onOpenResetConfirm: () => void;
  telegramConfig?: TelegramConfig;
  uptimeSeconds: number;
  marketStatus: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeView?: 'GRID' | 'TABLE' | 'ALL_TRADES' | 'MARKET';
  onViewChange?: (view: 'GRID' | 'TABLE' | 'ALL_TRADES' | 'MARKET') => void;
  liveTradesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTelegram,
  onOpenResetConfirm,
  telegramConfig,
  uptimeSeconds,
  marketStatus,
  soundEnabled,
  onToggleSound,
  activeView = 'GRID',
  onViewChange,
  liveTradesCount = 0,
}) => {
  const formatUptime = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand & Logo - Clickable to return to Home */}
        <div 
          onClick={() => onViewChange && onViewChange('GRID')} 
          className="flex items-center space-x-3 cursor-pointer group"
          title="Click to return to Home Page"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30 group-hover:scale-105 transition-transform">
            <BotIcon className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-['Outfit'] sm:text-xl group-hover:text-cyan-300 transition-colors">
                QUANTUM 50 <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">ARENA</span>
              </h1>
              <span className="hidden rounded-md border border-cyan-500/30 bg-cyan-950/60 px-2 py-0.5 text-xs font-semibold text-cyan-300 sm:inline-block">
                50 AI BOT CORE
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              24/7 Autonomous Multi-Timeframe Algorithmic Engine &amp; Neural Brains
            </p>
          </div>
        </div>

        {/* Primary Center Navigation: Return to Home & See Live Trades */}
        <div className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          {/* Return to Home Page Button */}
          <button
            id="nav-btn-home"
            onClick={() => onViewChange && onViewChange('GRID')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeView === 'GRID'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Return to Home Page / Arena"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>

          {/* Separate Button to See Live Trades */}
          <button
            id="nav-btn-live-trades"
            onClick={() => onViewChange && onViewChange('ALL_TRADES')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all relative ${
              activeView === 'ALL_TRADES'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            title="See Live Trades Ledger & Open Positions"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Live Trades</span>
            {liveTradesCount > 0 && (
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                activeView === 'ALL_TRADES' ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}>
                {liveTradesCount}
              </span>
            )}
          </button>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Cloud 24x7 Badge */}
          <div className="hidden items-center space-x-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 md:flex">
            <Cloud className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>Cloud 24x7:</span>
            <span className="font-mono font-bold text-cyan-300">{formatUptime(uptimeSeconds)}</span>
          </div>

          {/* Market Sync Badge */}
          <div className="hidden items-center space-x-1.5 rounded-lg border border-emerald-900/40 bg-emerald-950/40 px-2.5 py-1.5 text-xs text-emerald-400 lg:flex">
            <Activity className="h-3.5 w-3.5 animate-spin" />
            <span className="font-medium">CMC Feed: Live</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Alert Sounds' : 'Unmute Alert Sounds'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Telegram Config Button */}
          <button
            onClick={onOpenTelegram}
            className={`flex items-center space-x-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              telegramConfig?.enabled
                ? 'border-sky-500/50 bg-sky-950/60 text-sky-300 hover:bg-sky-900/60 shadow-md shadow-sky-950/40'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Send className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden sm:inline">Telegram 3H Alerts</span>
            <span className="sm:hidden">Telegram</span>
            {telegramConfig?.enabled && (
              <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            )}
          </button>

          {/* Reset All Bots Button */}
          <button
            onClick={onOpenResetConfirm}
            className="flex items-center space-x-1.5 rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:border-red-700 hover:bg-red-900/50 hover:text-red-100 transition-all shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5 text-red-400" />
            <span>Reset ($100)</span>
          </button>
        </div>

      </div>
    </header>
  );
};
