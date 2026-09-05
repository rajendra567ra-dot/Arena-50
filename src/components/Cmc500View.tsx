import React, { useState, useMemo } from 'react';
import { 
  MarketCoin, 
  Bot, 
  Trade 
} from '../types';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Home, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Coins, 
  CheckCircle2, 
  Target, 
  Cpu,
  Copy,
  Check,
  ExternalLink,
  X,
  Lock,
  Ban,
  Radio
} from 'lucide-react';

interface Cmc500ViewProps {
  coins: MarketCoin[];
  bots: Bot[];
  liveTrades: Trade[];
  onReturnHome: () => void;
  onViewLiveTrades: () => void;
  onSelectBot?: (bot: Bot) => void;
}

export const Cmc500View: React.FC<Cmc500ViewProps> = ({
  coins,
  bots,
  liveTrades,
  onReturnHome,
  onViewLiveTrades,
  onSelectBot,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedConfluence, setSelectedConfluence] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'HIGH_CONF'>('ALL');
  const [sortField, setSortField] = useState<'RANK' | 'PRICE' | 'CHANGE' | 'VOLUME' | 'CONFLUENCE' | 'RSI'>('RANK');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [inspectCoin, setInspectCoin] = useState<MarketCoin | null>(null);

  // Build active trades coin lookup
  const coinActiveTrades = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of liveTrades) {
      const arr = map.get(t.symbol) || [];
      arr.push(t);
      map.set(t.symbol, arr);
    }
    return map;
  }, [liveTrades]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of coins) {
      if ((c as any).category) set.add((c as any).category);
    }
    return ['ALL', ...Array.from(set)];
  }, [coins]);

  // Filtered and sorted coins
  const filteredCoins = useMemo(() => {
    return coins.filter(coin => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !query ||
        coin.name.toLowerCase().includes(query) ||
        coin.symbol.toLowerCase().includes(query) ||
        (coin.contractAddress && coin.contractAddress.toLowerCase().includes(query)) ||
        (coin.network && coin.network.toLowerCase().includes(query));
      
      const coinCategory = (coin as any).category || 'Other';
      const matchesCategory = selectedCategory === 'ALL' || coinCategory === selectedCategory;

      let matchesConfluence = true;
      if (selectedConfluence === 'BULLISH') {
        matchesConfluence = coin.mtf.overallBias === 'BULLISH';
      } else if (selectedConfluence === 'BEARISH') {
        matchesConfluence = coin.mtf.overallBias === 'BEARISH';
      } else if (selectedConfluence === 'HIGH_CONF') {
        matchesConfluence = coin.mtf.confluenceScore >= 75;
      }

      return matchesSearch && matchesCategory && matchesConfluence;
    }).sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      switch (sortField) {
        case 'RANK':
          valA = a.rank;
          valB = b.rank;
          break;
        case 'PRICE':
          valA = a.price;
          valB = b.price;
          break;
        case 'CHANGE':
          valA = a.change24h;
          valB = b.change24h;
          break;
        case 'VOLUME':
          valA = a.volume24h;
          valB = b.volume24h;
          break;
        case 'CONFLUENCE':
          valA = a.mtf.confluenceScore;
          valB = b.mtf.confluenceScore;
          break;
        case 'RSI':
          valA = a.indicators.rsi;
          valB = b.indicators.rsi;
          break;
        default:
          valA = a.rank;
          valB = b.rank;
      }

      return sortDirection === 'ASC' ? valA - valB : valB - valA;
    });
  }, [coins, searchQuery, selectedCategory, selectedConfluence, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDirection('ASC');
    }
  };

  const copyAddress = (address: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => {
      setCopiedAddress(null);
    }, 2200);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner & Navigation */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-amber-950/20 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
                <Coins className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit'] sm:text-2xl">
                CMC Market Scanner &amp; Contract Verification
              </h2>
              <span className="rounded-md border border-emerald-500/40 bg-emerald-950/50 px-2 py-0.5 text-xs font-mono font-bold text-emerald-300 flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>{coins.length} Verified Contracts</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Verified token contracts &bull; Live exact Binance spot prices &bull; Kaspa strictly excluded &bull; Multi-Stage TP1 (1:1 SL distance), TP2, 40% Trailing Runner
            </p>
          </div>

          {/* Action Buttons: Return Home & View Live Trades */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="cmc-btn-return-home"
              onClick={onReturnHome}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-cyan-500 hover:bg-slate-800 hover:text-cyan-300 transition-all shadow-md"
            >
              <Home className="h-4 w-4 text-cyan-400" />
              <span>Return to Arena Home</span>
            </button>

            <button
              id="cmc-btn-view-live-trades"
              onClick={onViewLiveTrades}
              className="flex items-center space-x-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/50 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60 transition-all shadow-md"
            >
              <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span>View Live Trades ({liveTrades.length})</span>
            </button>
          </div>
        </div>

        {/* Security & Verification Notice Badges */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center space-x-2.5 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-emerald-300">Contract Verified:</span>
              <span className="text-slate-400 ml-1">Authentic smart contracts &amp; native mainnet ledgers</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 rounded-xl border border-rose-900/40 bg-rose-950/30 px-3 py-2">
            <Ban className="h-4 w-4 text-rose-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-rose-300">Kaspa Excluded:</span>
              <span className="text-slate-400 ml-1">KAS/Kaspa permanently prohibited from scanning &amp; trades</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 rounded-xl border border-cyan-900/40 bg-cyan-950/30 px-3 py-2">
            <Radio className="h-4 w-4 text-cyan-400 shrink-0 animate-pulse" />
            <div className="text-xs">
              <span className="font-bold text-cyan-300">Fast Live Sync:</span>
              <span className="text-slate-400 ml-1">Sub-second Binance Spot API feed &bull; Zero stale data</span>
            </div>
          </div>
        </div>

        {/* 3-Stage Profit Strategy Rule Explainer Box */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-slate-800/60">
          <div className="flex items-start space-x-2.5 rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-2.5">
            <Target className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-emerald-300">Stage 1: TP 1 (1:1 SL Dist)</div>
              <div className="text-[10px] text-slate-400">Books <span className="text-emerald-300 font-bold">35% Profit</span> &bull; Moves SL to Break-Even Entry</div>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 rounded-xl border border-cyan-900/50 bg-cyan-950/30 p-2.5">
            <Zap className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-cyan-300">Stage 2: TP 2 (+3.8% ~ +4.5%)</div>
              <div className="text-[10px] text-slate-400">Books <span className="text-cyan-300 font-bold">25% Margin</span> &bull; Moves SL to TP1 Level</div>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 rounded-xl border border-indigo-900/50 bg-indigo-950/30 p-2.5">
            <TrendingUp className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-indigo-300">Stage 3: 40% Runner</div>
              <div className="text-[10px] text-slate-400">Keeps 40% running with <span className="text-indigo-300 font-bold">Trailing Structure SL</span></div>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 rounded-xl border border-purple-900/50 bg-purple-950/30 p-2.5">
            <Cpu className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-purple-300">Cognitive Self-Correction</div>
              <div className="text-[10px] text-slate-400">When SL hit: <span className="text-purple-300 font-bold">Instant Human Tuning</span> of ADX / MTF</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
        {/* Search Input supporting Symbol, Name, Network, and Contract Address */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="cmc-search-input"
            type="text"
            placeholder="Search symbol, contract address, or network..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-9 pr-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
          {categories.slice(0, 8).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Confluence Bias Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">Bias:</span>
          {(['ALL', 'BULLISH', 'BEARISH', 'HIGH_CONF'] as const).map(bias => (
            <button
              key={bias}
              onClick={() => setSelectedConfluence(bias)}
              className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-all ${
                selectedConfluence === bias
                  ? bias === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    bias === 'BEARISH' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                    bias === 'HIGH_CONF' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                    'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {bias === 'HIGH_CONF' ? '75%+ Conf' : bias}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Matrix of Coins */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th 
                  className="py-3.5 pl-4 pr-2 cursor-pointer hover:text-cyan-300"
                  onClick={() => handleSort('RANK')}
                >
                  Rank {sortField === 'RANK' && (sortDirection === 'ASC' ? '▲' : '▼')}
                </th>
                <th className="py-3.5 px-3">Asset &amp; Contract Verification</th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-cyan-300"
                  onClick={() => handleSort('PRICE')}
                >
                  Live Price {sortField === 'PRICE' && (sortDirection === 'ASC' ? '▲' : '▼')}
                </th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-cyan-300"
                  onClick={() => handleSort('CHANGE')}
                >
                  24h Change {sortField === 'CHANGE' && (sortDirection === 'ASC' ? '▲' : '▼')}
                </th>
                <th 
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-cyan-300"
                  onClick={() => handleSort('CONFLUENCE')}
                >
                  MTF Confluence {sortField === 'CONFLUENCE' && (sortDirection === 'ASC' ? '▲' : '▼')}
                </th>
                <th 
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-cyan-300"
                  onClick={() => handleSort('RSI')}
                >
                  RSI / ADX {sortField === 'RSI' && (sortDirection === 'ASC' ? '▲' : '▼')}
                </th>
                <th className="py-3.5 px-3 text-center">Target TP1 / TP2</th>
                <th className="py-3.5 pr-4 pl-3 text-right">Active Bots</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {filteredCoins.map((coin) => {
                const isPositive = coin.change24h >= 0;
                const activeTradesOnCoin = coinActiveTrades.get(coin.symbol) || [];
                const mtfScore = coin.mtf.confluenceScore;
                
                // Calculated target previews (TP1 equal distance of SL)
                const longTp1 = Number((coin.price * 1.025).toFixed(coin.price < 1 ? 4 : 2));
                const longTp2 = Number((coin.price * 1.045).toFixed(coin.price < 1 ? 4 : 2));

                const isCopied = copiedAddress === coin.contractAddress;

                return (
                  <tr 
                    key={coin.symbol} 
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-3.5 pl-4 pr-2 font-mono text-slate-500 font-bold">
                      #{coin.rank}
                    </td>

                    {/* Asset / Symbol & Contract Address Verification */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-start space-x-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 font-mono font-bold text-xs text-cyan-400 group-hover:bg-cyan-950 group-hover:text-cyan-300 transition-colors mt-0.5">
                          {coin.symbol.replace('USDT', '')}
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center space-x-1.5">
                            <span>{coin.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">
                              {coin.symbol}
                            </span>
                            <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300 inline-flex items-center space-x-0.5">
                              <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />
                              <span>Verified</span>
                            </span>
                          </div>

                          {/* Network & Category */}
                          <div className="text-[10px] text-slate-400 flex items-center space-x-1.5">
                            <span className="text-slate-300 font-medium">{coin.network || 'Mainnet'}</span>
                            <span>&bull;</span>
                            <span>{coin.category || 'Crypto'}</span>
                            <span>&bull;</span>
                            <span>Vol ${(coin.volume24h / 1e6).toFixed(1)}M</span>
                          </div>

                          {/* Contract Address with Copy & Explorer buttons */}
                          {coin.contractAddress && (
                            <div className="flex items-center space-x-1.5 pt-0.5">
                              <button
                                onClick={() => setInspectCoin(coin)}
                                title="Inspect Contract Address & Verification"
                                className="inline-flex items-center space-x-1 rounded bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 transition-colors"
                              >
                                <Lock className="h-2.5 w-2.5 text-cyan-400" />
                                <span className="truncate max-w-[140px] sm:max-w-[200px]">
                                  {coin.contractAddress.length > 22
                                    ? `${coin.contractAddress.substring(0, 8)}...${coin.contractAddress.substring(coin.contractAddress.length - 6)}`
                                    : coin.contractAddress}
                                </span>
                              </button>

                              <button
                                onClick={(e) => copyAddress(coin.contractAddress, e)}
                                title="Copy Contract Address"
                                className={`rounded p-1 text-slate-400 hover:text-white transition-colors ${
                                  isCopied ? 'text-emerald-400 bg-emerald-950/60' : 'hover:bg-slate-800'
                                }`}
                              >
                                {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              </button>

                              {coin.explorerUrl && (
                                <a
                                  href={coin.explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View on Blockchain Explorer"
                                  className="rounded p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Live Exact Price */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-sm text-white">
                      <div>
                        ${coin.price.toLocaleString(undefined, { minimumFractionDigits: coin.price < 1 ? 4 : 2 })}
                      </div>
                      <div className="text-[9px] text-emerald-400/80 font-normal">
                        Live Binance Sync
                      </div>
                    </td>

                    {/* 24h Change */}
                    <td className="py-3.5 px-3 text-right">
                      <div className={`inline-flex items-center space-x-0.5 rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                        isPositive 
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40' 
                          : 'bg-red-950/60 text-red-400 border border-red-900/40'
                      }`}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        <span>{isPositive ? '+' : ''}{coin.change24h.toFixed(2)}%</span>
                      </div>
                    </td>

                    {/* Multi-Timeframe Confluence Grid */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-center space-x-1 mb-1">
                          <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                            coin.mtf.tf5m === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>5m</span>
                          <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                            coin.mtf.tf15m === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>15m</span>
                          <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                            coin.mtf.tf1h === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>1h</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <div className="w-14 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full ${
                                coin.mtf.overallBias === 'BULLISH' ? 'bg-emerald-400' : 'bg-red-400'
                              }`} 
                              style={{ width: `${mtfScore}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-slate-300">{mtfScore}%</span>
                        </div>
                      </div>
                    </td>

                    {/* RSI / ADX Indicators */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex flex-col items-center text-[10px] font-mono">
                        <span className={`font-bold ${
                          coin.indicators.rsi > 70 
                            ? 'text-rose-400' 
                            : coin.indicators.rsi < 30 
                            ? 'text-emerald-400' 
                            : 'text-slate-300'
                        }`}>
                          RSI: {coin.indicators.rsi.toFixed(1)}
                        </span>
                        <span className="text-slate-400 text-[9px]">
                          ADX: {coin.indicators.adx.adx.toFixed(1)} ({coin.indicators.adx.strength})
                        </span>
                      </div>
                    </td>

                    {/* Target TP1 / TP2 Previews */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex flex-col items-center text-[10px] font-mono">
                        <span className="text-emerald-400 font-bold">
                          TP1 (1:1 SL): ${longTp1}
                        </span>
                        <span className="text-cyan-400 font-bold">
                          TP2 (25%): ${longTp2}
                        </span>
                      </div>
                    </td>

                    {/* Active Bots Trading This Coin */}
                    <td className="py-3.5 pr-4 pl-3 text-right">
                      {activeTradesOnCoin.length > 0 ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/40 animate-pulse">
                            <Activity className="h-3 w-3 text-emerald-400" />
                            <span>{activeTradesOnCoin.length} Active {activeTradesOnCoin.length === 1 ? 'Trade' : 'Trades'}</span>
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {activeTradesOnCoin.map(t => t.botName.split(' ')[0]).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Scanning...
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Verification Modal */}
      {inspectCoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-slate-950 p-6 shadow-2xl relative text-slate-200">
            <button
              onClick={() => setInspectCoin(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center space-x-2">
                  <span>{inspectCoin.name}</span>
                  <span className="text-xs font-mono text-cyan-300">({inspectCoin.symbol})</span>
                </h3>
                <div className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verified Smart Contract &bull; Rank #{inspectCoin.rank}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Contract Address Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Contract Address / Genesis Identity</span>
                  {copiedAddress === inspectCoin.contractAddress && (
                    <span className="text-emerald-400 font-normal">Address Copied!</span>
                  )}
                </div>
                <div className="font-mono text-xs text-cyan-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 break-all select-all flex items-center justify-between">
                  <span>{inspectCoin.contractAddress}</span>
                  <button
                    onClick={() => copyAddress(inspectCoin.contractAddress)}
                    className="ml-2 rounded p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0"
                    title="Copy Address"
                  >
                    {copiedAddress === inspectCoin.contractAddress ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Network / Protocol</div>
                  <div className="font-semibold text-white mt-1">{inspectCoin.network || 'Mainnet'}</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Asset Category</div>
                  <div className="font-semibold text-white mt-1">{inspectCoin.category || 'Crypto'}</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Live Exact Price</div>
                  <div className="font-mono font-bold text-white mt-1">
                    ${inspectCoin.price.toLocaleString(undefined, { minimumFractionDigits: inspectCoin.price < 1 ? 4 : 2 })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">24h Price Change</div>
                  <div className={`font-mono font-bold mt-1 ${inspectCoin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {inspectCoin.change24h >= 0 ? '+' : ''}{inspectCoin.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Explorer Button */}
              {inspectCoin.explorerUrl && (
                <div className="pt-2">
                  <a
                    href={inspectCoin.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 w-full rounded-xl border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/60 py-2.5 text-xs font-bold text-emerald-300 transition-colors shadow-lg"
                  >
                    <span>View Contract on Official Block Explorer</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
