import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  ShieldCheck, 
  BrainCircuit, 
  DollarSign,
  BarChart3
} from 'lucide-react';
import { Bot, Trade } from '../types';

interface ArenaStatsBannerProps {
  bots: Bot[];
  liveTrades: Trade[];
  onViewLiveTrades?: () => void;
}

export const ArenaStatsBanner: React.FC<ArenaStatsBannerProps> = ({ bots, liveTrades, onViewLiveTrades }) => {
  const initialTotal = bots.length * 100; // $5000.00
  const currentTotal = bots.reduce((acc, b) => acc + b.currentBalance, 0);
  const netPnl = currentTotal - initialTotal;
  const netPnlPercent = initialTotal > 0 ? (netPnl / initialTotal) * 100 : 0;
  const isProfit = netPnl >= 0;

  const totalTrades = bots.reduce((acc, b) => acc + b.totalTrades, 0);
  const totalWins = bots.reduce((acc, b) => acc + b.winTrades, 0);
  const totalLosses = bots.reduce((acc, b) => acc + b.lossTrades, 0);
  const winRate = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : '0.0';

  const totalLearnedLessons = bots.reduce((acc, b) => acc + b.brain.lessons.length, 0);
  const totalMistakesAvoided = bots.reduce((acc, b) => acc + b.brain.mistakesAnalyzed, 0);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
      {/* Subtle background ambient glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl"></div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        
        {/* Total Arena Capital */}
        <div className="col-span-1 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Arena Capital</span>
            <DollarSign className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl font-mono">
            ${currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Base: <span className="font-mono text-slate-300">$5,000.00</span> (50 x $100)
          </div>
        </div>

        {/* Aggregate Arena Net PnL */}
        <div className="col-span-1 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Arena Net PnL</span>
            {isProfit ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <div className={`mt-2 text-xl font-bold tracking-tight font-mono sm:text-2xl ${
            isProfit ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isProfit ? '+' : ''}${netPnl.toFixed(2)}
          </div>
          <div className={`mt-1 flex items-center space-x-1 text-xs font-semibold ${
            isProfit ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            <span>{isProfit ? '▲' : '▼'} {Math.abs(netPnlPercent).toFixed(2)}% total return</span>
          </div>
        </div>

        {/* Win Rate & Trade Count */}
        <div className="col-span-1 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Arena Win Rate</span>
            <Target className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl font-mono">
            {winRate}%
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono">
            <span className="text-emerald-400 font-semibold">{totalWins}W</span> /{' '}
            <span className="text-rose-400 font-semibold">{totalLosses}L</span> ({totalTrades} total)
          </div>
        </div>

        {/* Live Positions Active */}
        <div 
          onClick={onViewLiveTrades}
          className={`col-span-1 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 sm:p-4 transition-all ${
            onViewLiveTrades ? 'cursor-pointer hover:border-cyan-500/50 hover:bg-slate-900/90 group' : ''
          }`}
          title={onViewLiveTrades ? "Click to view Live Trades" : undefined}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium group-hover:text-cyan-300 transition-colors">Live Positions</span>
            <Zap className="h-4 w-4 text-cyan-400 animate-bounce" />
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-cyan-300 sm:text-2xl font-mono flex items-center space-x-2">
            <span>{liveTrades.length}</span>
            <span className="text-xs font-normal text-slate-400">in market</span>
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>Sync: <strong className="font-mono text-cyan-300 font-normal">2.5s</strong></span>
            {onViewLiveTrades && (
              <span className="text-[10px] text-cyan-400 font-bold group-hover:underline">View &rarr;</span>
            )}
          </div>
        </div>

        {/* Neural Brains & Risk Protocol */}
        <div className="col-span-2 rounded-xl border border-indigo-900/40 bg-gradient-to-br from-indigo-950/40 to-slate-900/80 p-3 sm:p-4 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-indigo-300">
            <span className="font-medium">AI Brain Network</span>
            <BrainCircuit className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl font-mono">
            50 <span className="text-sm font-normal text-indigo-300">Brains Evolving</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            <span className="text-indigo-300 font-mono font-medium">{totalMistakesAvoided}</span> loss reviews &amp; adaptions
          </div>
        </div>

      </div>

      {/* Rules & Precision Protocol Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <span>Strict Capital Allocation: <strong className="text-white">Max 5% / trade ($5 base)</strong></span>
          </div>
          <span className="hidden text-slate-600 sm:inline">•</span>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>Stop-Loss Limit: <strong className="text-white">Max 3% loss ($3 max risk)</strong></span>
          </div>
          <span className="hidden text-slate-600 sm:inline">•</span>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <span>Execution Gate: <strong className="text-white">&gt;5 Indicators &amp; Multi-TF Confluence</strong></span>
          </div>
        </div>

        <div className="text-slate-500 italic">
          High decimal sub-cent coins (BONK, SHIB, PEPE) strictly excluded
        </div>
      </div>
    </section>
  );
};
