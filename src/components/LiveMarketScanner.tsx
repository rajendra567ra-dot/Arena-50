import React from 'react';
import { MarketCoin, Bot } from '../types';
import { Activity, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck } from 'lucide-react';

interface LiveMarketScannerProps {
  coins: MarketCoin[];
  bots: Bot[];
}

export const LiveMarketScanner: React.FC<LiveMarketScannerProps> = ({ coins, bots }) => {
  // Map symbols to active bots targeting them
  const activeTradeMap = new Map<string, string[]>();
  for (const b of bots) {
    if (b.activeTrade) {
      const list = activeTradeMap.get(b.activeTrade.symbol) || [];
      list.push(b.name);
      activeTradeMap.set(b.activeTrade.symbol, list);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit'] flex items-center space-x-2">
            <Activity className="h-4 w-4 text-cyan-400 animate-spin" />
            <span>Top Crypto Live Scanner (CMC &amp; Binance 24/7 Feed)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time multi-timeframe analysis across 45+ premier liquid crypto assets (High-decimal meme coins strictly filtered).
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Fast Feed Sync: <strong className="text-emerald-300 font-mono">2.5s</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-md">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
            <tr>
              <th className="p-3"># CMC</th>
              <th className="p-3">Asset</th>
              <th className="p-3">Live Price</th>
              <th className="p-3">24h Change</th>
              <th className="p-3">RSI (14)</th>
              <th className="p-3">MACD</th>
              <th className="p-3">ADX (Trend)</th>
              <th className="p-3">Bollinger Band</th>
              <th className="p-3">MTF Confluence</th>
              <th className="p-3">Arena Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {coins.map((coin) => {
              const isUp = coin.change24h >= 0;
              const ind = coin.indicators;
              const activeBots = activeTradeMap.get(coin.symbol);

              return (
                <tr key={coin.symbol} className="hover:bg-slate-800/40 transition-colors">
                  {/* Rank */}
                  <td className="p-3 text-slate-500 font-semibold">{coin.marketCapRank}</td>

                  {/* Name & Symbol */}
                  <td className="p-3 font-sans">
                    <div className="font-bold text-white text-xs">{coin.symbol.replace('USDT', '')}</div>
                    <div className="text-[10px] text-slate-400">{coin.name}</div>
                  </td>

                  {/* Price */}
                  <td className="p-3 font-bold text-white text-xs">
                    ${coin.price.toLocaleString('en-US', { minimumFractionDigits: coin.price > 10 ? 2 : 4 })}
                  </td>

                  {/* 24h Change */}
                  <td className="p-3">
                    <span className={`flex items-center font-bold text-xs ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? <ArrowUpRight className="mr-0.5 h-3 w-3" /> : <ArrowDownRight className="mr-0.5 h-3 w-3" />}
                      {isUp ? '+' : ''}{coin.change24h.toFixed(2)}%
                    </span>
                  </td>

                  {/* RSI */}
                  <td className="p-3">
                    <span
                      className={`rounded px-1.5 py-0.5 font-bold ${
                        ind.rsi > 70
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                          : ind.rsi < 30
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                          : 'text-slate-300'
                      }`}
                    >
                      {ind.rsi.toFixed(1)}
                    </span>
                  </td>

                  {/* MACD */}
                  <td className="p-3">
                    <span className={ind.macd.trend === 'BULLISH' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {ind.macd.trend} ({ind.macd.histogram > 0 ? '+' : ''}{ind.macd.histogram})
                    </span>
                  </td>

                  {/* ADX */}
                  <td className="p-3">
                    <span className={ind.adx.adx > 25 ? 'text-cyan-300 font-semibold' : 'text-slate-400'}>
                      {ind.adx.adx} ({ind.adx.strength})
                    </span>
                  </td>

                  {/* Bollinger */}
                  <td className="p-3">
                    <span className="text-slate-300">{ind.bollinger.state}</span>
                  </td>

                  {/* MTF Confluence */}
                  <td className="p-3">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400"
                          style={{ width: `${coin.mtf.confluenceScore}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] font-bold text-cyan-300">{coin.mtf.confluenceScore}%</span>
                    </div>
                  </td>

                  {/* Active Arena Positions */}
                  <td className="p-3 font-sans">
                    {activeBots && activeBots.length > 0 ? (
                      <span className="rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                        {activeBots.length} Bot{activeBots.length > 1 ? 's' : ''} Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Scanning</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
