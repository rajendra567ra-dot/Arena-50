import React from 'react';
import { Trade } from '../types';
import { Activity, ArrowUpRight, ArrowDownRight, Zap, ArrowLeft, Home } from 'lucide-react';
import { LiveTradesTicker } from './LiveTradesTicker';

interface AllTradesViewProps {
  liveTrades: Trade[];
  tradeHistory: Trade[];
  onSelectBot?: (botId: string) => void;
  onReturnHome?: () => void;
}

export const AllTradesView: React.FC<AllTradesViewProps> = ({
  liveTrades,
  tradeHistory,
  onSelectBot,
  onReturnHome,
}) => {
  return (
    <div className="space-y-6">
      
      {/* Quick Breadcrumb / Return to Home Bar */}
      {onReturnHome && (
        <div className="flex items-center justify-between">
          <button
            onClick={onReturnHome}
            className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-800 hover:text-white transition-all shadow-sm group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Home Page / Arena</span>
          </button>

          <span className="text-xs text-slate-400 font-mono">
            Active Trades: <strong className="text-emerald-400">{liveTrades.length}</strong> • Completed: <strong className="text-cyan-400">{tradeHistory.length}</strong>
          </span>
        </div>
      )}

      {/* Active Trades Cards Stream */}
      <LiveTradesTicker
        liveTrades={liveTrades}
        onSelectBot={onSelectBot}
      />

      {/* Live Active Positions Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="text-sm font-bold text-white font-['Outfit']">
              Live Open Positions Across All 50 Bots ({liveTrades.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Fast Sync • Max 5% Capital / Trade
          </span>
        </div>

        {liveTrades.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No live trades open right now. Bots are actively scanning for confluence setups.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="p-2.5">Bot Name</th>
                  <th className="p-2.5">Asset</th>
                  <th className="p-2.5">Direction</th>
                  <th className="p-2.5">Entry Price</th>
                  <th className="p-2.5">Current Price</th>
                  <th className="p-2.5">Allocated (5%)</th>
                  <th className="p-2.5">Stop Loss (Max 3%)</th>
                  <th className="p-2.5">Take Profit</th>
                  <th className="p-2.5">Live Mark PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {liveTrades.map((t) => {
                  const isLong = t.direction === 'LONG';
                  const isProfit = t.pnl >= 0;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectBot && onSelectBot(t.botId)}
                      className="hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="p-2.5 font-sans font-bold text-cyan-300">
                        {t.botName}
                      </td>
                      <td className="p-2.5 font-bold text-white">{t.symbol}</td>
                      <td className="p-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            isLong ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">${t.entryPrice}</td>
                      <td className="p-2.5 font-bold text-white">${t.currentPrice}</td>
                      <td className="p-2.5 text-slate-400">${t.capitalAllocated}</td>
                      <td className="p-2.5 text-rose-400 font-semibold">${t.stopLoss}</td>
                      <td className="p-2.5 text-emerald-400 font-semibold">${t.takeProfit}</td>
                      <td className="p-2.5">
                        <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${t.pnl.toFixed(2)} ({isProfit ? '+' : ''}{t.pnlPercent.toFixed(1)}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global Trade History Ledger */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white font-['Outfit']">
              Completed Trades Ledger &amp; AI Post-Trade Reviews ({tradeHistory.length})
            </h3>
          </div>
        </div>

        {tradeHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No completed trades logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="p-2.5">Exit Time</th>
                  <th className="p-2.5">Bot</th>
                  <th className="p-2.5">Asset</th>
                  <th className="p-2.5">Side</th>
                  <th className="p-2.5">Entry</th>
                  <th className="p-2.5">Exit</th>
                  <th className="p-2.5">PnL (USD)</th>
                  <th className="p-2.5">Exit Reason</th>
                  <th className="p-2.5">Neural AI Post-Trade Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {tradeHistory.map((t) => {
                  const isWin = t.pnl >= 0;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectBot && onSelectBot(t.botId)}
                      className="hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="p-2.5 text-slate-500">
                        {t.exitTime ? new Date(t.exitTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="p-2.5 font-sans font-bold text-slate-300">
                        {t.botName}
                      </td>
                      <td className="p-2.5 font-bold text-white">{t.symbol}</td>
                      <td className="p-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            t.direction === 'LONG' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">${t.entryPrice}</td>
                      <td className="p-2.5 text-slate-300">${t.exitPrice || t.currentPrice}</td>
                      <td className={`p-2.5 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${t.pnl.toFixed(2)} ({isWin ? '+' : ''}{t.pnlPercent.toFixed(1)}%)
                      </td>
                      <td className="p-2.5 text-slate-400">{t.exitReason}</td>
                      <td className="p-2.5 font-sans text-slate-300 text-[11px] max-w-sm truncate">
                        {t.aiReview || 'Processed by self-improving neural brain'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
