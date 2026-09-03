import React, { useState, useMemo } from 'react';
import { Trade } from '../types';
import { Activity, ArrowUpRight, ArrowDownRight, Zap, ArrowLeft, Home, RotateCcw, Search, Filter, BrainCircuit, CheckCircle2, AlertTriangle } from 'lucide-react';
import { LiveTradesTicker } from './LiveTradesTicker';

interface AllTradesViewProps {
  liveTrades: Trade[];
  tradeHistory: Trade[];
  onSelectBot?: (botId: string) => void;
  onReturnHome?: () => void;
  onOpenResetConfirm?: () => void;
}

export const AllTradesView: React.FC<AllTradesViewProps> = ({
  liveTrades,
  tradeHistory,
  onSelectBot,
  onReturnHome,
  onOpenResetConfirm,
}) => {
  const [liveSearch, setLiveSearch] = useState('');
  const [liveFilter, setLiveFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'WINS' | 'LOSSES_SL'>('ALL');

  // Filtered Live Trades
  const filteredLiveTrades = useMemo(() => {
    return liveTrades.filter((t) => {
      const matchSearch =
        t.symbol.toLowerCase().includes(liveSearch.toLowerCase()) ||
        t.botName.toLowerCase().includes(liveSearch.toLowerCase()) ||
        (t.strategyUsed && t.strategyUsed.toLowerCase().includes(liveSearch.toLowerCase()));
      if (!matchSearch) return false;

      if (liveFilter === 'PROFIT') return t.pnl > 0;
      if (liveFilter === 'LOSS') return t.pnl < 0;
      return true;
    });
  }, [liveTrades, liveSearch, liveFilter]);

  // Filtered Trade History Ledger
  const filteredHistory = useMemo(() => {
    return tradeHistory.filter((t) => {
      const matchSearch =
        t.symbol.toLowerCase().includes(historySearch.toLowerCase()) ||
        t.botName.toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.exitReason && t.exitReason.toLowerCase().includes(historySearch.toLowerCase())) ||
        (t.humanAdaptationNote && t.humanAdaptationNote.toLowerCase().includes(historySearch.toLowerCase())) ||
        (t.aiReview && t.aiReview.toLowerCase().includes(historySearch.toLowerCase()));
      if (!matchSearch) return false;

      if (historyFilter === 'WINS') return t.pnl >= 0;
      if (historyFilter === 'LOSSES_SL') return t.pnl < 0 || t.exitReason === 'STOP_LOSS';
      return true;
    });
  }, [tradeHistory, historySearch, historyFilter]);

  return (
    <div className="space-y-6">
      
      {/* Quick Breadcrumb / Return to Home & Reset Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onReturnHome && (
          <button
            onClick={onReturnHome}
            className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-800 hover:text-white transition-all shadow-sm group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Home Page / Arena</span>
          </button>
        )}

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Active: <strong className="text-emerald-400">{liveTrades.length} (Unrestricted)</strong> • Stored History: <strong className="text-cyan-400">{tradeHistory.length}</strong> • Filter: <strong className="text-emerald-400">A+ Only</strong>
          </span>

          {onOpenResetConfirm && (
            <button
              id="live-trades-reset-btn"
              onClick={onOpenResetConfirm}
              className="flex items-center space-x-1.5 rounded-xl border border-red-500/40 bg-red-950/60 px-3.5 py-2 text-xs font-bold text-red-300 hover:border-red-500 hover:bg-red-900/70 hover:text-white transition-all shadow-sm group"
              title="Reset all trades and start from clean 0 live trades ($100 per bot)"
            >
              <RotateCcw className="h-3.5 w-3.5 text-red-400 group-hover:rotate-180 transition-transform duration-500" />
              <span>Reset to 0 Live Trades</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Trades Cards Stream */}
      <LiveTradesTicker
        liveTrades={liveTrades}
        onSelectBot={onSelectBot}
      />

      {/* Live Active Positions Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="text-sm font-bold text-white font-['Outfit']">
              Live Open Positions Across All Bots ({filteredLiveTrades.length} of {liveTrades.length})
            </h3>
            <span className="rounded bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
              Grade A+ Only
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search symbol or bot..."
                value={liveSearch}
                onChange={(e) => setLiveSearch(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/80 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none w-44"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/80 p-0.5 text-[11px]">
              <button
                onClick={() => setLiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  liveFilter === 'ALL' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({liveTrades.length})
              </button>
              <button
                onClick={() => setLiveFilter('PROFIT')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  liveFilter === 'PROFIT' ? 'bg-emerald-500 text-slate-950' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                In Profit
              </button>
              <button
                onClick={() => setLiveFilter('LOSS')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  liveFilter === 'LOSS' ? 'bg-rose-500 text-slate-950' : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                Drawdown
              </button>
            </div>
          </div>
        </div>

        {filteredLiveTrades.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {liveTrades.length === 0
              ? 'No live trades open right now. Bots are actively scanning for confluence setups.'
              : 'No live trades match the active filter/search criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="p-2.5">Bot Name</th>
                  <th className="p-2.5">Asset</th>
                  <th className="p-2.5">Setup Grade</th>
                  <th className="p-2.5">Direction</th>
                  <th className="p-2.5">Leverage</th>
                  <th className="p-2.5">Entry Price</th>
                  <th className="p-2.5">Current Price</th>
                  <th className="p-2.5">Allocated (3%)</th>
                  <th className="p-2.5">Multi-Stage TP / SL Progress</th>
                  <th className="p-2.5">Live Mark PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredLiveTrades.map((t) => {
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
                          title={t.confirmations ? t.confirmations.join(' • ') : 'Strict 10-Rule Confirmed Setup'}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                            t.setupGrade === 'A+' 
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                              : t.setupGrade === 'A'
                              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                              : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
                          }`}
                        >
                          Grade {t.setupGrade || 'A+'} ({t.confirmedRulesCount || 8}/10 Rules)
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            isLong ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span
                          title={t.leverageReason || `${t.leverage || 5}x Dynamic Leverage`}
                          className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          {t.leverage || 5}x
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">${t.entryPrice}</td>
                      <td className="p-2.5 font-bold text-white">${t.currentPrice}</td>
                      <td className="p-2.5 text-slate-400">${t.capitalAllocated}</td>
                      <td className="p-2.5">
                        <div className="flex flex-col gap-0.5 text-[10px]">
                          <div className="flex items-center space-x-1.5">
                            {t.tp1Hit ? (
                              <span className="text-emerald-400 font-bold">🎯 TP1 Booked (35%)</span>
                            ) : (
                              <span className="text-slate-400">TP1: ${t.tp1Price}</span>
                            )}
                            {t.tp2Hit && (
                              <span className="text-cyan-300 font-bold">🚀 TP2 Booked (25%)</span>
                            )}
                          </div>
                          <span className={t.tp1Hit ? "text-emerald-400" : "text-rose-400"}>
                            SL: ${t.stopLoss} {t.tp1Hit && "(Break-Even Protected)"}
                          </span>
                        </div>
                      </td>
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white font-['Outfit']">
              Completed Trades Ledger &amp; AI Post-Trade Reviews ({filteredHistory.length} of {tradeHistory.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* History Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search history or AI notes..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/80 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none w-52"
              />
            </div>

            {/* Filter History Buttons */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/80 p-0.5 text-[11px]">
              <button
                onClick={() => setHistoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  historyFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({tradeHistory.length})
              </button>
              <button
                onClick={() => setHistoryFilter('WINS')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  historyFilter === 'WINS' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Wins Only
              </button>
              <button
                onClick={() => setHistoryFilter('LOSSES_SL')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  historyFilter === 'LOSSES_SL' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                🧠 SL Hit &amp; Auto-Adapted
              </button>
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {tradeHistory.length === 0
              ? 'No completed trades logged yet.'
              : 'No completed trades match your filter criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="p-2.5">Exit Time</th>
                  <th className="p-2.5">Bot</th>
                  <th className="p-2.5">Asset</th>
                  <th className="p-2.5">Setup</th>
                  <th className="p-2.5">Side</th>
                  <th className="p-2.5">Lev</th>
                  <th className="p-2.5">Entry</th>
                  <th className="p-2.5">Exit</th>
                  <th className="p-2.5">PnL (USD)</th>
                  <th className="p-2.5">Exit Reason</th>
                  <th className="p-2.5">Neural AI Post-Trade Insight &amp; Auto-Adaptation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredHistory.map((t) => {
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
                          title={t.confirmations ? t.confirmations.join(' • ') : 'Strict 10-Rule Confirmed Setup'}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                            t.setupGrade === 'A+' 
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/40' 
                              : 'bg-cyan-950/70 text-cyan-300 border-cyan-600/40'
                          }`}
                        >
                          {t.setupGrade || 'A+'} ({t.confirmedRulesCount || 8}/10)
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            t.direction === 'LONG' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-amber-300 font-bold">
                          {t.leverage || 5}x
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">${t.entryPrice}</td>
                      <td className="p-2.5 text-slate-300">${t.exitPrice || t.currentPrice}</td>
                      <td className={`p-2.5 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${t.pnl.toFixed(2)} ({isWin ? '+' : ''}{t.pnlPercent.toFixed(1)}%)
                      </td>
                      <td className="p-2.5 text-slate-400">{t.exitReason}</td>
                      <td className="p-2.5 font-sans text-slate-300 text-[11px] max-w-sm">
                        {t.humanAdaptationNote ? (
                          <div className="rounded bg-purple-950/50 border border-purple-800/50 p-1.5 text-purple-200">
                            <span className="font-bold text-purple-300 flex items-center gap-1 mb-0.5">
                              <BrainCircuit className="h-3 w-3 text-purple-400 inline" />
                              Auto-Adapted on SL Hit:
                            </span> 
                            {t.humanAdaptationNote}
                          </div>
                        ) : (
                          <span>{t.aiReview || 'Processed by self-improving neural brain'}</span>
                        )}
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
