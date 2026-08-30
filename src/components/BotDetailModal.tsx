import React, { useState } from 'react';
import { 
  X, 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  Activity, 
  BarChart3, 
  Layers, 
  RotateCcw, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertTriangle,
  Award
} from 'lucide-react';
import { Bot, Trade } from '../types';
import { api } from '../services/api';

interface BotDetailModalProps {
  bot: Bot;
  onClose: () => void;
  onBotUpdated: (updatedBot: Bot) => void;
  onResetBot: (botId: string) => void;
}

export const BotDetailModal: React.FC<BotDetailModalProps> = ({
  bot,
  onClose,
  onBotUpdated,
  onResetBot,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BRAIN' | 'TRADES'>('OVERVIEW');
  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectionSuccess, setReflectionSuccess] = useState<string | null>(null);

  const isProfit = bot.totalPnl >= 0;

  // Handle AI Deep Reflection
  const handleTriggerAiReflection = async () => {
    setIsReflecting(true);
    setReflectionSuccess(null);
    try {
      const res = await api.triggerAiReflection(bot.id);
      if (res.success && res.bot) {
        onBotUpdated(res.bot);
        setReflectionSuccess('AI Neural Reflection complete! Strategy weights and learning memory calibrated.');
      }
    } catch (err: any) {
      console.error('Reflection failed:', err);
    } finally {
      setIsReflecting(false);
    }
  };

  // Full SVG Equity Curve builder
  const renderEquityCurve = () => {
    const points = bot.equityCurve;
    if (!points || points.length === 0) return null;

    const width = 650;
    const height = 200;
    const padding = 35;

    const balances = points.map(p => p.balance);
    const minBal = Math.min(...balances, 90);
    const maxBal = Math.max(...balances, 110);
    const range = maxBal - minBal || 1;

    const coords = points.map((p, idx) => {
      const x = padding + (idx / Math.max(1, points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p.balance - minBal) / range) * (height - padding * 2);
      return { x, y, balance: p.balance, count: p.tradeCount };
    });

    const pathString = `M ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;
    const baselineY = height - padding - ((100 - minBal) / range) * (height - padding * 2);

    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-slate-300">Portfolio Equity Trajectory (USD)</span>
          <span className="font-mono text-cyan-400 font-medium">Starting Balance: $100.00</span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
            {/* Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />

            {/* $100 Baseline */}
            <line
              x1={padding}
              y1={baselineY}
              x2={width - padding}
              y2={baselineY}
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text x={padding + 5} y={baselineY - 4} fill="#94a3b8" fontSize="10" fontFamily="monospace">
              $100 Baseline
            </text>

            {/* Main Equity Curve Path */}
            <path
              d={pathString}
              fill="none"
              stroke={isProfit ? '#10b981' : '#f43f5e'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive / Data Nodes */}
            {coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r="3.5"
                fill={c.balance >= 100 ? '#10b981' : '#f43f5e'}
                stroke="#020617"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Min: ${minBal.toFixed(2)}</span>
          <span>Current: <strong className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>${bot.currentBalance.toFixed(2)}</strong></span>
          <span>Max: ${maxBal.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 bg-slate-950/60 p-4 sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-bold font-mono text-sm shadow-md">
              {bot.serialNumber}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white font-['Outfit'] sm:text-xl">{bot.name}</h2>
                <span className="rounded bg-indigo-950/80 border border-indigo-500/30 px-2 py-0.5 text-xs font-bold text-indigo-300 flex items-center space-x-1">
                  <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Brain Lvl {bot.brain.brainLevel}</span>
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300">
                  Fixed Alpha #{bot.alphabeticalRank}
                </span>
              </div>
              <div className="mt-1 flex items-center space-x-3 text-xs text-slate-400">
                <span>Strategy: <strong className="text-cyan-300">{bot.strategy.coreArchetype}</strong></span>
                <span>•</span>
                <span>Timeframe: <strong className="text-white">{bot.strategy.primaryTimeframe}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onResetBot(bot.id)}
              className="flex items-center space-x-1 rounded-lg border border-red-900/50 bg-red-950/40 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/60 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset ($100)</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-800/80 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex items-center space-x-2 border-b-2 py-3 px-4 text-xs font-bold transition-all ${
              activeTab === 'OVERVIEW'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Overview &amp; Equity Curve</span>
          </button>

          <button
            onClick={() => setActiveTab('BRAIN')}
            className={`flex items-center space-x-2 border-b-2 py-3 px-4 text-xs font-bold transition-all ${
              activeTab === 'BRAIN'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="h-4 w-4" />
            <span>AI Brain &amp; Neural Learning ({bot.brain.lessons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TRADES')}
            className={`flex items-center space-x-2 border-b-2 py-3 px-4 text-xs font-bold transition-all ${
              activeTab === 'TRADES'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Trade Ledger ({bot.tradeHistory.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              
              {/* Top Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-400">Current Balance</div>
                  <div className="mt-1 font-mono text-xl font-bold text-white">${bot.currentBalance.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500">Initial: $100.00</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-400">Total Net PnL</div>
                  <div className={`mt-1 font-mono text-xl font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? '+' : ''}${bot.totalPnl.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-mono font-medium text-slate-400">
                    {isProfit ? '+' : ''}{bot.totalPnlPercent.toFixed(1)}% total
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-400">Win Rate</div>
                  <div className="mt-1 font-mono text-xl font-bold text-amber-400">{bot.winRate.toFixed(1)}%</div>
                  <div className="text-[10px] font-mono text-slate-400">{bot.winTrades}W / {bot.lossTrades}L</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-400">Dynamic Risk Envelope</div>
                  <div className="mt-1 font-mono text-base font-bold text-cyan-300">Max 5% / 3% SL</div>
                  <div className="text-[10px] text-slate-500">${(bot.currentBalance * 0.05).toFixed(2)} capital / trade</div>
                </div>
              </div>

              {/* Full SVG Equity Curve */}
              {renderEquityCurve()}

              {/* Strategy & 5+ Indicator Combination Detail */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <span>Multi-Indicator &amp; Confirmation Architecture (&gt;5 Indicators)</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  {bot.strategy.description}
                </p>

                <div className="mt-3">
                  <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Required Indicators Checklist:</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {bot.strategy.requiredIndicators.map((ind, i) => (
                      <span
                        key={i}
                        className="flex items-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-xs font-medium text-cyan-200"
                      >
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500">Min Confidence Gate:</span>{' '}
                    <strong className="text-white font-mono">{bot.strategy.minConfidenceToTrade}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Target Risk/Reward:</span>{' '}
                    <strong className="text-emerald-400 font-mono">{bot.strategy.riskRewardRatio}:1 R</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Timeframe:</span>{' '}
                    <strong className="text-cyan-300 font-mono">{bot.strategy.primaryTimeframe} Multi-TF</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI BRAIN & NEURAL LEARNING */}
          {activeTab === 'BRAIN' && (
            <div className="space-y-6">
              
              {/* Brain Evolution Banner */}
              <div className="rounded-xl border border-indigo-900/60 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/70 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <BrainCircuit className="h-5 w-5 text-indigo-400 animate-pulse" />
                      <h3 className="text-base font-bold text-white font-['Outfit']">
                        Autonomous Neural Brain (Level {bot.brain.brainLevel})
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-xl">
                      Like a human trader, this bot possesses an internal cognitive memory. It reviews every trade outcome, identifies root-cause mistakes, shifts its indicator parameter weights, and reinforces high-probability market setups.
                    </p>
                  </div>

                  <button
                    onClick={handleTriggerAiReflection}
                    disabled={isReflecting}
                    className="flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-950/60 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 transition-all shrink-0"
                  >
                    <Sparkles className={`h-4 w-4 ${isReflecting ? 'animate-spin' : ''}`} />
                    <span>{isReflecting ? 'Gemini AI Reflecting...' : 'Trigger AI Neural Reflection'}</span>
                  </button>
                </div>

                {reflectionSuccess && (
                  <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-950/60 p-2.5 text-xs text-emerald-300 flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    <span>{reflectionSuccess}</span>
                  </div>
                )}
              </div>

              {/* Dynamic Adaptive Parameter Matrix */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-3">
                  <span>Adaptive Learned Parameter Weights</span>
                  <span className="text-[11px] font-normal text-slate-400 font-mono">
                    Mistakes Analyzed: <strong className="text-indigo-300">{bot.brain.mistakesAnalyzed}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs font-mono">
                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5">
                    <div className="text-[10px] text-slate-400">Trend Weight Multiplier</div>
                    <div className="mt-1 text-sm font-bold text-cyan-300">{bot.brain.adaptiveWeights.trendWeight}x</div>
                  </div>

                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5">
                    <div className="text-[10px] text-slate-400">Min ADX Filter Gate</div>
                    <div className="mt-1 text-sm font-bold text-amber-300">&gt;{bot.brain.adaptiveWeights.adxThreshold} ADX</div>
                  </div>

                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5">
                    <div className="text-[10px] text-slate-400">Multi-TF Confluence Multiplier</div>
                    <div className="mt-1 text-sm font-bold text-indigo-300">{bot.brain.adaptiveWeights.mtfAlignmentStrictness}x</div>
                  </div>

                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5">
                    <div className="text-[10px] text-slate-400">RSI Reversal Bounds</div>
                    <div className="mt-1 text-sm font-bold text-emerald-300">&lt;{bot.brain.adaptiveWeights.rsiOversoldThreshold} / &gt;{bot.brain.adaptiveWeights.rsiOverboughtThreshold}</div>
                  </div>
                </div>
              </div>

              {/* Learned Lessons Ledger */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs font-bold text-slate-200 mb-3">
                  Cognitive Mistake Analysis &amp; Growth Log
                </div>

                {bot.brain.lessons.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Neural memory initialized. The AI Brain will record deep reflections as trades are completed.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bot.brain.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-800/40">
                            {lesson.improvementCategory}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(lesson.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div>
                          <div className="text-slate-400 font-medium">
                            🔴 <strong className="text-slate-300">Mistake Analyzed:</strong> {lesson.mistakeIdentified}
                          </div>
                          <div className="text-slate-400 font-medium mt-1">
                            🟢 <strong className="text-emerald-300">Adaptation:</strong> {lesson.adaptationMade}
                          </div>
                          <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                            ⚙️ <strong className="text-cyan-300">Parameter Tweak:</strong> {lesson.parameterAdjusted}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Memory Terminal Stream */}
              <div className="rounded-xl border border-slate-800 bg-black/80 p-4 font-mono text-xs">
                <div className="text-[11px] font-bold text-slate-400 mb-2">Neural Brain Activity Stream:</div>
                <div className="max-h-40 overflow-y-auto space-y-1 text-slate-300 text-[11px]">
                  {bot.brain.learningNotes.map((note, idx) => (
                    <div key={idx} className="flex items-start space-x-1.5">
                      <span className="text-cyan-500">›</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: TRADES LEDGER */}
          {activeTab === 'TRADES' && (
            <div className="space-y-4">
              
              {/* Active Trade if any */}
              {bot.activeTrade && (
                <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/30 p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-300 mb-2">
                    <span className="flex items-center">
                      <Zap className="mr-1.5 h-4 w-4 animate-spin text-cyan-400" />
                      Live Active Position
                    </span>
                    <span className="font-mono">${bot.activeTrade.capitalAllocated} Allocated (5% Max)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-slate-900/60 p-2 rounded">Symbol: <strong className="text-white">{bot.activeTrade.symbol}</strong></div>
                    <div className="bg-slate-900/60 p-2 rounded">Direction: <strong className={bot.activeTrade.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>{bot.activeTrade.direction}</strong></div>
                    <div className="bg-slate-900/60 p-2 rounded">Entry: ${bot.activeTrade.entryPrice}</div>
                    <div className="bg-slate-900/60 p-2 rounded">Live PnL: <strong className={bot.activeTrade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>${bot.activeTrade.pnl.toFixed(2)}</strong></div>
                  </div>
                </div>
              )}

              {/* Historical Trades Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-300">
                  Closed Trades History ({bot.tradeHistory.length})
                </div>

                {bot.tradeHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No closed trades recorded yet. Bot is scanning the live market.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono">
                        <tr>
                          <th className="p-2.5">Time</th>
                          <th className="p-2.5">Symbol</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Entry</th>
                          <th className="p-2.5">Exit</th>
                          <th className="p-2.5">PnL (USD)</th>
                          <th className="p-2.5">Exit Reason</th>
                          <th className="p-2.5">AI Review</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {bot.tradeHistory.map((t) => {
                          const isWin = t.pnl >= 0;
                          return (
                            <tr key={t.id} className="hover:bg-slate-900/40">
                              <td className="p-2.5 text-slate-500 whitespace-nowrap">
                                {t.exitTime ? new Date(t.exitTime).toLocaleTimeString() : '-'}
                              </td>
                              <td className="p-2.5 font-bold text-white">{t.symbol}</td>
                              <td className="p-2.5">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  t.direction === 'LONG' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                                }`}>
                                  {t.direction}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-300">${t.entryPrice}</td>
                              <td className="p-2.5 text-slate-300">${t.exitPrice || t.currentPrice}</td>
                              <td className={`p-2.5 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isWin ? '+' : ''}${t.pnl.toFixed(2)} ({isWin ? '+' : ''}{t.pnlPercent.toFixed(1)}%)
                              </td>
                              <td className="p-2.5 text-slate-400 text-[11px]">{t.exitReason}</td>
                              <td className="p-2.5 text-slate-400 text-[11px] max-w-xs truncate font-sans">
                                {t.aiReview || 'Analyzed by neural brain'}
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
          )}

        </div>

      </div>
    </div>
  );
};
