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

export interface ConfirmationRuleResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  actualValue: string;
  requiredCondition: string;
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
  capitalAllocated: number; // Dynamic capital margin (3% of dynamic bot balance)
  remainingCapital?: number; // Remaining capital after TP1/TP2 partial bookings
  leverage: number; // Dynamic leverage per trade (e.g., 2x, 3x, 5x, 8x, 10x, 15x, 20x, 25x)
  leverageReason?: string; // Reason for chosen leverage (e.g., "20x High Confluence Tier-1 Trend")
  stopLoss: number; // Dynamic SL (max 1.5% loss of dynamic capital with dynamic leverage)
  initialStopLoss?: number;
  takeProfit: number;
  tp1Price: number; // Stage 1 TP (equal distance of SL compared to entry price) -> Books 35% profit & moves SL to Entry
  tp2Price: number; // Stage 2 TP -> Books 25% margin & moves SL to TP1
  tp1Hit?: boolean;
  tp2Hit?: boolean;
  tp1RealizedPnl?: number;
  tp2RealizedPnl?: number;
  runnerActive?: boolean; // 40% runner remaining
  trailingStopPrice?: number;
  trailingStructure?: string; // e.g. "Swing Low Break Structure" / "ATR 1.8x Trail"
  pnl: number;
  pnlPercent: number;
  status: TradeStatus;
  entryTime: number;
  exitTime?: number;
  exitReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'SIGNAL_REVERSAL' | 'MANUAL_CLOSE' | 'AI_ADAPTATION' | 'TP_RUNNER_EXIT';
  strategyUsed: string;
  setupGrade?: 'A+' | 'A' | 'A-';
  confirmations?: string[];
  confirmedRulesCount?: number; // e.g. 8, 9, 10
  totalRulesCount?: number; // 10
  ruleResults?: ConfirmationRuleResult[];
  indicatorsAtEntry: {
    rsi: number;
    macdHistogram: number;
    adx: number;
    vwapDist: number;
    timeframeConfluence: number;
  };
  aiReview?: string;
  humanAdaptationNote?: string;
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
  maxLeverage?: number; // e.g. 25
  defaultLeverage?: number; // e.g. 10
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
  activeTrades?: Trade[]; // Support multiple concurrent quality trades per bot
  tradeHistory: Trade[];
  isActive: boolean;
  createdAt: number;
  lastTradeTime?: number;
  lastTradeCloseTime?: number;
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
  cloudStartedAt: number;
  isScanningActive: boolean;
  engineMode: 'RUNNING' | 'PAUSED';
}

export type SortField = 'ALPHABETICAL' | 'WIN_RATE' | 'PORTFOLIO' | 'TOTAL_TRADES' | 'PNL_PERCENT' | 'BRAIN_LEVEL';
