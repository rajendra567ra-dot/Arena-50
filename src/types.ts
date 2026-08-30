export type TradeDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'OPEN' | 'CLOSED';

export interface IndicatorSignals {
  rsi: number;
  rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  ema: {
    ema9: number;
    ema21: number;
    ema50: number;
    ema200: number;
    alignment: 'BULLISH_STACK' | 'BEARISH_STACK' | 'MIXED';
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
    bandwidth: number;
    state: 'SQUEEZE' | 'EXPANSION' | 'NORMAL';
  };
  adx: {
    adx: number;
    plusDI: number;
    minusDI: number;
    strength: 'STRONG_TREND' | 'WEAK_TREND' | 'CHOPPY';
  };
  vwap: {
    vwap: number;
    distancePct: number;
    position: 'ABOVE' | 'BELOW';
  };
  superTrend: {
    value: number;
    direction: 'BULLISH' | 'BEARISH';
  };
  volumeFlow: {
    vfi: number;
    surge: boolean;
  };
  stochasticRsi: {
    k: number;
    d: number;
    state: 'OVERSOLD' | 'OVERBOUGHT' | 'CROSS_UP' | 'CROSS_DOWN' | 'NEUTRAL';
  };
}

export interface MultiTimeframeAnalysis {
  tf1m: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  tf5m: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  tf15m: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  tf1h: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confluenceScore: number; // 0 - 100
}

export interface Trade {
  id: string;
  botId: string;
  botName: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  currentPrice: number;
  exitPrice?: number;
  amount: number; // Coin amount
  capitalAllocated: number; // Max 5% of bot balance
  stopLoss: number; // Strict max 3% capital loss
  takeProfit: number;
  trailingStopPrice?: number;
  pnl: number;
  pnlPercent: number;
  status: TradeStatus;
  entryTime: number;
  exitTime?: number;
  exitReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'SIGNAL_REVERSAL' | 'MANUAL_CLOSE' | 'AI_ADAPTATION';
  strategyUsed: string;
  indicatorsAtEntry: {
    rsi: number;
    macdHistogram: number;
    adx: number;
    vwapDist: number;
    timeframeConfluence: number;
  };
  aiReview?: string;
}

export interface LearnedLesson {
  id: string;
  timestamp: number;
  tradeId?: string;
  symbol?: string;
  mistakeIdentified: string;
  adaptationMade: string;
  parameterAdjusted: string;
  improvementCategory: 'RISK_TOLERANCE' | 'FALSE_BREAKOUT_FILTER' | 'VOLATILITY_GUARD' | 'TIMEFRAME_ALIGNMENT' | 'ENTRY_TIMING';
  confidenceImpact: number; // e.g. +2% or -1%
}

export interface BrainMemory {
  brainLevel: number;
  experiencePoints: number;
  mistakesAnalyzed: number;
  patternsRecognized: number;
  confidenceScore: number; // 0 - 100
  learningNotes: string[];
  lessons: LearnedLesson[];
  adaptiveWeights: {
    trendWeight: number; // e.g. 1.0 to 2.0
    volatilityFilter: number; // e.g. 1.0 to 2.0
    volumeConfirmation: number;
    mtfAlignmentStrictness: number;
    adxThreshold: number; // dynamic min ADX required
    rsiOversoldThreshold: number;
    rsiOverboughtThreshold: number;
  };
  lastReflectionTime?: number;
  evolutionSummary: string;
}

export interface BotStrategy {
  name: string;
  coreArchetype: 'Breakout & Volume Surge' | 'Trend Exhaustion Pullback' | 'Mean Reversion & Liquidity Sweep' | 'Momentum Continuation' | 'VWAP Multi-Band Institutional' | 'Order Flow & Cloud Break' | 'Harmonic Wave & Oscillator' | 'Volatility Expansion Squeeze';
  primaryTimeframe: '1m' | '5m' | '15m' | '1h';
  requiredIndicators: string[];
  minConfidenceToTrade: number; // e.g. 80
  riskRewardRatio: number; // e.g. 2.0
  description: string;
}

export interface EquityPoint {
  timestamp: number;
  balance: number;
  tradeCount: number;
}

export interface Bot {
  id: string;
  serialNumber: string; // e.g. "BOT-01"
  alphabeticalRank: number; // 1 to 50
  name: string;
  avatarSeed: string;
  initialBalance: number; // 100
  currentBalance: number; // dynamic
  allocatedBalance: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number; // 0 - 100%
  profitFactor: number;
  maxDrawdownPct: number;
  strategy: BotStrategy;
  brain: BrainMemory;
  equityCurve: EquityPoint[];
  activeTrade?: Trade | null;
  tradeHistory: Trade[];
  isActive: boolean;
  createdAt: number;
  lastTradeTime?: number;
}

export interface MarketCoin {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCapRank: number;
  indicators: IndicatorSignals;
  mtf: MultiTimeframeAnalysis;
  lastUpdated: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  intervalHours: number; // default 3
  lastSentTimestamp?: number;
  lastSentReport?: string;
  instantTradeAlerts: boolean;
}

export interface ArenaState {
  bots: Bot[];
  coins: MarketCoin[];
  liveTrades: Trade[];
  totalArenaTrades: number;
  totalArenaPnl: number;
  arenaWinRate: number;
  telegramConfig: TelegramConfig;
  marketStatus: 'LIVE_SYNCING' | 'RECONNECTING' | 'STABLE';
  lastEngineTick: number;
  uptimeSeconds: number;
}

export type SortField = 'ALPHABETICAL' | 'WIN_RATE' | 'PORTFOLIO' | 'TOTAL_TRADES' | 'PNL_PERCENT' | 'BRAIN_LEVEL';
