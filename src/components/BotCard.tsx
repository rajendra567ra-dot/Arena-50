import React from 'react';
import { 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import { Bot } from '../types';

interface BotCardProps {
  bot: Bot;
  onSelect: (bot: Bot) => void;
  onReset: (botId: string) => void;
}

export const BotCard: React.FC<BotCardProps> = ({ bot, onSelect, onReset }) => {
  const isProfit = bot.totalPnl >= 0;
  const hasActiveTrade = !!bot.activeTrade;

  // Generate SVG path for mini equity curve
  const generateMiniSvgPath = () => {
    if (!bot.equityCurve || bot.equityCurve.length < 2) {
      return 'M 0 20 L 100 20';
    }
    const points = bot.equityCurve;
    const balances = points.map(p => p.balance);
    const minBal = Math.min(...balances, 95);
    const maxBal = Math.max(...balances, 105);
    const range = maxBal - minBal || 1;

    const width = 120;
    const height = 36;

    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p.balance - minBal) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${coords.join(' L ')}`;
  };

  const latestLesson = bot.brain.lessons.length > 0 ? bot.brain.lessons[0] : null;

  return (
    <div
      onClick={() => onSelect(bot)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-cyan-950/20 cursor-pointer"
    >
      {/* Active Trade Highlight Glow */}
      {hasActiveTrade && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 animate-pulse"></div>
      )}

      {/* Top Header: Serial, Name, Brain Level */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="flex h-6 items-center rounded-md border border-cyan-500/30 bg-cyan-950/70 px-2 font-mono text-xs font-bold text-cyan-300">
              {bot.serialNumber}
            </span>
            <div>
              <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors font-['Outfit']">
                {bot.name}
              </h3>
              <div className="text-[11px] text-slate-400 font-medium">
                #{bot.alphabeticalRank} Fixed Alpha Rank
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Brain Level Pill */}
            <span className="flex items-center space-x-1 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
              <BrainCircuit className="h-3 w-3 text-indigo-400" />
              <span>Lvl {bot.brain.brainLevel}</span>
            </span>

            {/* Active Trade Indicator */}
            {hasActiveTrade && (
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" title="Live In Trade" />
            )}
          </div>
        </div>

        {/* Strategy Archetype Badge */}
        <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-slate-300">
          <Layers className="h-3.5 w-3.5 text-sky-400 shrink-0" />
          <span className="truncate font-medium">{bot.strategy.coreArchetype}</span>
          <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
            {bot.strategy.primaryTimeframe}
          </span>
        </div>

        {/* Portfolio & Equity Section */}
        <div className="mt-3.5 flex items-baseline justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Portfolio Balance</div>
            <div className="font-mono text-lg font-bold text-white tracking-tight sm:text-xl">
              ${bot.currentBalance.toFixed(2)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              Allocated: <span className="font-mono text-cyan-300">${(bot.currentBalance * 0.05).toFixed(2)}</span> (5%)
            </div>
          </div>

          {/* Mini Equity Curve Chart */}
          <div className="flex flex-col items-end">
            <div className={`flex items-center space-x-0.5 font-mono text-xs font-bold ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isProfit ? <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> : <TrendingDown className="h-3.5 w-3.5 mr-0.5" />}
              <span>{isProfit ? '+' : ''}${bot.totalPnl.toFixed(2)}</span>
              <span>({isProfit ? '+' : ''}{bot.totalPnlPercent.toFixed(1)}%)</span>
            </div>

            <div className="mt-1 w-[110px] h-[32px]">
              <svg viewBox="0 0 120 36" className="w-full h-full overflow-visible">
                <path
                  d={generateMiniSvgPath()}
                  fill="none"
                  stroke={isProfit ? '#10b981' : '#f43f5e'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Performance Metrics Row (Win Rate, Total Trades, W / L) */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-2">
            <div className="text-[10px] text-slate-400 font-medium">Win Rate</div>
            <div className="mt-0.5 font-mono text-sm font-bold text-amber-400">
              {bot.winRate.toFixed(1)}%
            </div>
          </div>

          <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-2">
            <div className="text-[10px] text-slate-400 font-medium">Trades Taken</div>
            <div className="mt-0.5 font-mono text-sm font-bold text-white">
              {bot.totalTrades}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-2">
            <div className="text-[10px] text-slate-400 font-medium">Win / Loss</div>
            <div className="mt-0.5 font-mono text-xs font-bold">
              <span className="text-emerald-400">{bot.winTrades}W</span> / <span className="text-rose-400">{bot.lossTrades}L</span>
            </div>
          </div>
        </div>

        {/* Live Active Trade Snapshot if In Position */}
        {hasActiveTrade && bot.activeTrade && (
          <div className="mt-2.5 rounded-lg border border-cyan-900/50 bg-cyan-950/40 p-2 text-xs">
            <div className="flex items-center justify-between font-mono">
              <span className="flex items-center text-cyan-300 font-semibold">
                <Zap className="mr-1 h-3 w-3 text-cyan-400 animate-spin" />
                {bot.activeTrade.direction} {bot.activeTrade.symbol}
              </span>
              <span className={`font-bold ${bot.activeTrade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {bot.activeTrade.pnl >= 0 ? '+' : ''}${bot.activeTrade.pnl.toFixed(2)} ({bot.activeTrade.pnlPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {/* AI Brain Growth & Learning Reflection */}
        <div className="mt-2.5 rounded-lg border border-slate-800/60 bg-slate-950/40 p-2 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1 text-indigo-300 font-medium">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>AI Brain Reflection:</span>
          </div>
          <p className="mt-1 line-clamp-1 text-slate-300 italic">
            {latestLesson
              ? `Avoided ${latestLesson.mistakeIdentified.toLowerCase()} (${latestLesson.parameterAdjusted})`
              : bot.brain.evolutionSummary}
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset(bot.id);
          }}
          title="Reset this bot to $100"
          className="flex items-center space-x-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset ($100)</span>
        </button>

        <span className="flex items-center text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all">
          <span>Brain &amp; Trades</span>
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </span>
      </div>
    </div>
  );
};
