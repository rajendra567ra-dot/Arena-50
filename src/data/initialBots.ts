import { Bot, BotStrategy } from '../types';

const strategyTemplates: {
  archetype: BotStrategy['coreArchetype'];
  indicators: string[];
  timeframe: BotStrategy['primaryTimeframe'];
  ratio: number;
  defaultLeverage: number;
  maxLeverage: number;
  desc: string;
}[] = [
  {
    archetype: 'Breakout & Volume Surge',
    indicators: ['Bollinger Band Squeeze', 'Volume Flow Index (VFI)', 'ADX Trend (>25)', 'EMA 21/50 Cross', 'ATR Volatility Filter', 'Stochastic RSI'],
    timeframe: '5m',
    ratio: 2.4,
    defaultLeverage: 15,
    maxLeverage: 25,
    desc: 'Detects contraction in Bollinger bands followed by abnormal volume flow and ADX expansion to ride explosive momentum moves.',
  },
  {
    archetype: 'Trend Exhaustion Pullback',
    indicators: ['RSI Divergence (14)', 'EMA Ribbon (9/21/50/200)', 'VWAP Dynamic Band', 'MACD Signal Cross', 'Stochastic RSI Overbought/Oversold', 'ATR Stop Filter'],
    timeframe: '15m',
    ratio: 2.2,
    defaultLeverage: 10,
    maxLeverage: 20,
    desc: 'Catches healthy trend pullbacks to EMA21/50 support with RSI exhaustion confirmation and institutional VWAP alignment.',
  },
  {
    archetype: 'Mean Reversion & Liquidity Sweep',
    indicators: ['Bollinger 2.5 Dev Rejection', 'RSI Extreme (<28 / >72)', 'Volume Imbalance Sweep', 'Stochastic RSI K/D Cross', 'MACD Histogram Reversal', 'VWAP Deviations'],
    timeframe: '5m',
    ratio: 2.0,
    defaultLeverage: 8,
    maxLeverage: 15,
    desc: 'Capitalizes on liquidity grabs at outer volatility bands and captures snap-back reversals to standard mean value.',
  },
  {
    archetype: 'Momentum Continuation',
    indicators: ['SuperTrend (10,3)', 'MACD Momentum Stack', 'ADX Strength (+DI > -DI)', 'EMA 9/21 Dynamic Support', 'Volume Flow Surge', '15m Multi-TF Confluence'],
    timeframe: '15m',
    ratio: 2.5,
    defaultLeverage: 12,
    maxLeverage: 25,
    desc: 'Enters aligned momentum trends verified across 5m and 15m timeframes with SuperTrend trail and volume confirmation.',
  },
  {
    archetype: 'VWAP Multi-Band Institutional',
    indicators: ['VWAP 1st & 2nd Dev Bands', 'Volume Weighted Momentum', 'EMA 50 Institutional Filter', 'RSI 14 Smoothed', 'MACD Zero-Line Cross', 'ATR Trailing Filter'],
    timeframe: '15m',
    ratio: 2.1,
    defaultLeverage: 10,
    maxLeverage: 20,
    desc: 'Mirrors institutional order execution by trading re-tests of daily VWAP with volume-weighted confirmation.',
  },
  {
    archetype: 'Order Flow & Cloud Break',
    indicators: ['Ichimoku Cloud Kumo Break', 'Tenkan/Kijun Cross', 'Chikou Span Confirmation', 'Volume Surge Index', 'ADX Trend Strength', 'RSI Trend Filter'],
    timeframe: '1h',
    ratio: 2.6,
    defaultLeverage: 10,
    maxLeverage: 20,
    desc: 'Multi-indicator Japanese Ichimoku system confirming cloud breakouts only when volume and trend acceleration are validated.',
  },
  {
    archetype: 'Harmonic Wave & Oscillator',
    indicators: ['Stochastic RSI Cross', 'MACD Double Bottom/Top', 'Bollinger Width Contraction', 'EMA 200 Macro Bias', 'ATR Volatility Guard', 'RSI Centerline Cross'],
    timeframe: '15m',
    ratio: 2.3,
    defaultLeverage: 8,
    maxLeverage: 15,
    desc: 'Identifies harmonic price oscillations at macro EMA200 support/resistance with dual oscillator confirmation.',
  },
  {
    archetype: 'Volatility Expansion Squeeze',
    indicators: ['Keltner Channel Squeeze', 'Bollinger Bands (20,2)', 'Volume Flow Surge', 'ADX Directional Surge', 'EMA 9 Steep Slope', 'RSI Momentum Confirmation'],
    timeframe: '5m',
    ratio: 2.8,
    defaultLeverage: 15,
    maxLeverage: 25,
    desc: 'Scans for periods when Bollinger bands compress inside Keltner channels, triggering on explosive directional volatility release.',
  },
];

const botNames = [
  'Alpha Apex',
  'Aegis Sentinel',
  'Aero Dynamic',
  'Aura Catalyst',
  'Avalon Vector',
  'Beacon Matrix',
  'Bolt Breakout',
  'Boreas Flow',
  'Bullseye Quant',
  'Byte Horizon',
  'Chronos Scalp',
  'Cipher Momentum',
  'Cobalt Drift',
  'Cosmo Trend',
  'Cypher Alpha',
  'Delta Surge',
  'Dynamo Pulse',
  'Echo Reversion',
  'Eclipse Swing',
  'Electra Break',
  'Falcon Strike',
  'Flux Channel',
  'Fractal Edge',
  'Genesis Wave',
  'Gravity Pullback',
  'Helios Orbit',
  'Hyperion Macro',
  'Infinity Loop',
  'Ion Accelerator',
  'Krypton Sweep',
  'Luminary Vol',
  'Matrix Fibonacci',
  'Nebula Liquidity',
  'Nexus Oscillator',
  'Nova Explosion',
  'Omega Squeeze',
  'Orion Grid',
  'Pegasus Momentum',
  'Phantom Divergence',
  'Polaris Directional',
  'Prism Harmonic',
  'Quantum Scalpel',
  'Radiant Ichimoku',
  'Sigma Reversal',
  'Specter Volume',
  'Titan Heavyweight',
  'Vanguard Trendline',
  'Vortex Oscillator',
  'Xenon Precision',
  'Zenith Master',
];

export function generateInitialBots(): Bot[] {
  const now = Date.now();
  return botNames.map((name, index) => {
    const rank = index + 1;
    const serial = `BOT-${rank.toString().padStart(2, '0')}`;
    const tpl = strategyTemplates[index % strategyTemplates.length];
    
    // Custom strategic tweak per bot to give unique personality
    const strategyName = `${name} ${tpl.archetype.split(' ')[0]} Engine`;

    return {
      id: `bot-${rank}`,
      serialNumber: serial,
      alphabeticalRank: rank,
      name,
      avatarSeed: `arena-bot-${rank}-${name.toLowerCase().replace(/\s+/g, '-')}`,
      initialBalance: 100.0,
      currentBalance: 100.0,
      allocatedBalance: 0.0,
      totalPnl: 0.0,
      totalPnlPercent: 0.0,
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      winRate: 0.0,
      profitFactor: 0.0,
      maxDrawdownPct: 0.0,
      strategy: {
        name: strategyName,
        coreArchetype: tpl.archetype,
        primaryTimeframe: tpl.timeframe,
        requiredIndicators: tpl.indicators,
        minConfidenceToTrade: 78 + (index % 7), // 78 to 84 strict confidence
        riskRewardRatio: tpl.ratio,
        defaultLeverage: tpl.defaultLeverage,
        maxLeverage: tpl.maxLeverage,
        description: tpl.desc,
      },
      brain: {
        brainLevel: 1,
        experiencePoints: 0,
        mistakesAnalyzed: 0,
        patternsRecognized: 0,
        confidenceScore: 82,
        learningNotes: [
          `Neural memory initialized for ${name}. Base strategy: ${tpl.archetype}.`,
          `Dynamic leverage active: Scaled dynamically from 2x up to ${tpl.maxLeverage}x based on trade confluence & volatility.`,
          `Risk limits armed: 3% dynamic capital per trade, Max 1.5% stop loss of dynamic capital with dynamic leverage, TP1 equal distance of SL from entry.`,
          `Multi-timeframe scanner synced to live crypto market (excluding high-decimal/sub-cent meme coins).`,
        ],
        lessons: [],
        adaptiveWeights: {
          trendWeight: 1.2,
          volatilityFilter: 1.1,
          volumeConfirmation: 1.3,
          mtfAlignmentStrictness: 1.25,
          adxThreshold: 24,
          rsiOversoldThreshold: 30,
          rsiOverboughtThreshold: 70,
        },
        lastReflectionTime: now,
        evolutionSummary: `Adaptive learning active. Synthesizes every trade outcome, calibrating indicator threshold gates to prevent recurring loss patterns.`,
      },
      equityCurve: [
        {
          timestamp: now,
          balance: 100.0,
          tradeCount: 0,
        },
      ],
      activeTrade: null,
      tradeHistory: [],
      isActive: true,
      createdAt: now,
    };
  });
}
