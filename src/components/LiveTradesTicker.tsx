import React from 'react';
import { Zap, ArrowUpRight, ArrowDownRight, Clock, ShieldAlert } from 'lucide-react';
import { Trade } from '../types';

interface LiveTradesTickerProps {
  liveTrades: Trade[];
  onSelectBot?: (botId: string) => void;
}

export const LiveTradesTicker: React.FC<LiveTradesTickerProps> = ({ liveTrades, onSelectBot }) => {
  if (liveTrades.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 text-center text-xs text-slate-400">
        <div className="flex items-center justify-center space-x-2">
          <Zap className="h-4 w-4 text-cyan-500/60" />
          <span>All 50 bots scanning top CMC coins for &gt;80% confluence quality setups...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            Active Live Trades ({liveTrades.length})
          </h3>
        </div>
        <span className="text-xs text-slate-400">Dynamic Capital: 3% / Trade | Max Loss Cap: 1.5% (TP1 &lt; SL)</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {liveTrades.map((trade) => {
          const isLong = trade.direction === 'LONG';
          const isProfit = trade.pnl >= 0;
          const timeElapsed = Math.floor((Date.now() - trade.entryTime) / 1000);

          return (
            <div
              key={trade.id}
              onClick={() => onSelectBot && onSelectBot(trade.botId)}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all hover:scale-[1.01] hover:shadow-lg ${
                isProfit
                  ? 'border-emerald-900/50 bg-gradient-to-br from-emerald-950/30 via-slate-900/80 to-slate-900/90 hover:border-emerald-700/60'
                  : 'border-rose-900/50 bg-gradient-to-br from-rose-950/30 via-slate-900/80 to-slate-900/90 hover:border-rose-700/60'
              }`}
            >
              {/* Bot Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                    {trade.botName.split(' ')[0]}
                  </span>
                  <span className="font-bold text-white text-xs tracking-tight">{trade.symbol}</span>
                  <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 text-[9px] font-bold" title="Only trades with >= 8/10 strict confirmation rules are executed">
                    {trade.setupGrade || 'A+'} ({trade.confirmedRulesCount || 8}/10)
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {trade.leverage && (
                    <span
                      title={trade.leverageReason || `${trade.leverage}x Dynamic Leverage`}
                      className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold font-mono"
                    >
                      {trade.leverage}x
                    </span>
                  )}
                  <span
                    className={`flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      isLong
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isLong ? <ArrowUpRight className="mr-0.5 h-3 w-3" /> : <ArrowDownRight className="mr-0.5 h-3 w-3" />}
                    {trade.direction}
                  </span>
                </div>
              </div>

              {/* Price & PnL Metrics */}
              <div className="mt-2.5 flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Entry: <span className="font-mono text-slate-200">${trade.entryPrice}</span></div>
                  <div className="text-[11px] text-slate-400">Now: <span className="font-mono text-white font-medium">${trade.currentPrice}</span></div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-mono text-sm font-bold tracking-tight ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isProfit ? '+' : ''}${trade.pnl.toFixed(2)}
                  </div>
                  <div
                    className={`text-[10px] font-bold font-mono ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isProfit ? '+' : ''}{trade.pnlPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Multi-Stage TP1 / TP2 / Runner Progress Tags */}
              <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-mono">
                {trade.tp1Hit ? (
                  <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 font-bold flex items-center space-x-1">
                    <span>🎯 TP1 (35% Booked)</span>
                  </span>
                ) : (
                  <span className="rounded bg-slate-800/80 text-slate-400 px-1.5 py-0.2">
                    TP1: ${trade.tp1Price}
                  </span>
                )}

                {trade.tp2Hit ? (
                  <span className="rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 font-bold flex items-center space-x-1">
                    <span>🚀 TP2 (25% Booked)</span>
                  </span>
                ) : (
                  <span className="rounded bg-slate-800/80 text-slate-400 px-1.5 py-0.2">
                    TP2: ${trade.tp2Price}
                  </span>
                )}

                {trade.runnerActive && (
                  <span className="rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 font-bold">
                    🏃 40% Runner
                  </span>
                )}
              </div>

              {/* Stop Loss & Trailing Bar */}
              <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-[10px] text-slate-400 font-mono">
                <span className={trade.tp1Hit ? "text-emerald-400 font-bold" : "text-rose-400"}>
                  SL: ${trade.stopLoss} {trade.tp1Hit && "(BE)"}
                </span>
                {trade.trailingStopPrice && (
                  <span className="text-indigo-300">Trail: ${trade.trailingStopPrice}</span>
                )}
                <span className="text-slate-500 flex items-center">
                  <Clock className="mr-0.5 h-2.5 w-2.5" />
                  {timeElapsed}s
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
