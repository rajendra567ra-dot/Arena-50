import React from 'react';
import { Bot } from '../types';
import { BrainCircuit, TrendingUp, TrendingDown, Zap, RotateCcw, ChevronRight } from 'lucide-react';

interface LeaderboardTableProps {
  bots: Bot[];
  onSelectBot: (bot: Bot) => void;
  onResetBot: (botId: string) => void;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  bots,
  onSelectBot,
  onResetBot,
}) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-md">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
          <tr>
            <th className="p-3">Serial &amp; Rank</th>
            <th className="p-3">Bot Name</th>
            <th className="p-3">Strategy Archetype</th>
            <th className="p-3">AI Brain</th>
            <th className="p-3">Portfolio Balance</th>
            <th className="p-3">Total Net PnL</th>
            <th className="p-3">Win Rate %</th>
            <th className="p-3">Trades (W / L)</th>
            <th className="p-3">Live Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {bots.map((bot) => {
            const isProfit = bot.totalPnl >= 0;
            const hasTrade = !!bot.activeTrade;

            return (
              <tr
                key={bot.id}
                onClick={() => onSelectBot(bot)}
                className="hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                {/* Serial */}
                <td className="p-3">
                  <div className="flex items-center space-x-1.5">
                    <span className="rounded bg-cyan-950/80 border border-cyan-800/40 px-1.5 py-0.5 font-bold text-cyan-300">
                      {bot.serialNumber}
                    </span>
                    <span className="text-slate-500 text-[10px]">#{bot.alphabeticalRank}</span>
                  </div>
                </td>

                {/* Name */}
                <td className="p-3 font-sans font-bold text-white text-xs">
                  {bot.name}
                </td>

                {/* Strategy */}
                <td className="p-3 font-sans text-slate-300">
                  <div className="font-medium text-xs truncate max-w-[180px]">
                    {bot.strategy.coreArchetype}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {bot.strategy.primaryTimeframe} | {bot.strategy.requiredIndicators.length} Inds
                  </div>
                </td>

                {/* Brain */}
                <td className="p-3">
                  <span className="flex items-center space-x-1 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-300 w-fit">
                    <BrainCircuit className="h-3 w-3 text-indigo-400" />
                    <span>Lvl {bot.brain.brainLevel}</span>
                  </span>
                </td>

                {/* Balance */}
                <td className="p-3 font-bold text-white text-xs">
                  ${bot.currentBalance.toFixed(2)}
                </td>

                {/* PnL */}
                <td className="p-3">
                  <span className={`font-bold flex items-center ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? <TrendingUp className="mr-0.5 h-3 w-3" /> : <TrendingDown className="mr-0.5 h-3 w-3" />}
                    {isProfit ? '+' : ''}${bot.totalPnl.toFixed(2)} ({isProfit ? '+' : ''}{bot.totalPnlPercent.toFixed(1)}%)
                  </span>
                </td>

                {/* Win Rate */}
                <td className="p-3 font-bold text-amber-400">
                  {bot.winRate.toFixed(1)}%
                </td>

                {/* Trades count */}
                <td className="p-3">
                  <span className="text-white font-semibold">{bot.totalTrades}</span>{' '}
                  <span className="text-slate-500 text-[10px]">
                    (<strong className="text-emerald-400">{bot.winTrades}W</strong> / <strong className="text-rose-400">{bot.lossTrades}L</strong>)
                  </span>
                </td>

                {/* Live Status */}
                <td className="p-3 font-sans">
                  {hasTrade && bot.activeTrade ? (
                    <span className="flex items-center text-cyan-300 font-mono text-[11px] font-semibold">
                      <Zap className="mr-1 h-3 w-3 text-cyan-400 animate-spin" />
                      {bot.activeTrade.symbol} ({bot.activeTrade.direction})
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Idle (Scanning)</span>
                  )}
                </td>

                {/* Actions */}
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onResetBot(bot.id)}
                      title="Reset to $100"
                      className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-red-400"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onSelectBot(bot)}
                      className="rounded p-1 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
