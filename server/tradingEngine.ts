import { Bot, MarketCoin, Trade, ArenaState } from '../src/types';
import { generateInitialBots } from '../src/data/initialBots';
import { cryptoScanner } from './cryptoScanner';
import { performAiBrainReflection } from './aiBrain';
import { telegramService } from './telegramService';

class TradingEngine {
  private bots: Map<string, Bot> = new Map();
  private allTrades: Trade[] = [];
  private isRunning: boolean = false;
  private loopInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private lastTick: number = Date.now();

  constructor() {
    this.initializeBots();
    telegramService.initBotsProvider(() => this.getAllBots());
    this.startEngine();
  }

  private initializeBots() {
    const initial = generateInitialBots();
    for (const b of initial) {
      this.bots.set(b.id, b);
    }
  }

  public startEngine() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();

    // Fast 2.5s continuous trading loop
    this.loopInterval = setInterval(async () => {
      try {
        await this.tick();
      } catch (err) {
        console.error('Error during trading engine tick:', err);
      }
    }, 2500);

    console.log('24/7 AI Trading Bot Arena Engine started with 50 bots.');
  }

  public async tick() {
    this.lastTick = Date.now();
    const coins = await cryptoScanner.updateMarketData();
    if (!coins || coins.length === 0) return;

    // 1. Update all existing active trades
    await this.updateActiveTrades(coins);

    // 2. Scan for high-quality setups for bots that can take a trade
    await this.scanAndExecuteTrades(coins);
  }

  private async updateActiveTrades(coins: MarketCoin[]) {
    const coinMap = new Map<string, MarketCoin>(coins.map(c => [c.symbol, c]));

    for (const bot of this.bots.values()) {
      if (!bot.activeTrade) continue;

      const trade = bot.activeTrade;
      const coin = coinMap.get(trade.symbol);
      if (!coin) continue;

      const currentPrice = coin.price;
      trade.currentPrice = currentPrice;

      // Calculate raw price delta
      const priceDeltaPct = trade.direction === 'LONG'
        ? ((currentPrice - trade.entryPrice) / trade.entryPrice)
        : ((trade.entryPrice - currentPrice) / trade.entryPrice);

      // Mark-to-market PnL based on position capital
      // Leverage multiplier equivalent (e.g. 5x - 10x effective leverage on the 5% margin)
      const leverage = 5;
      trade.pnl = Number((trade.capitalAllocated * priceDeltaPct * leverage).toFixed(2));
      trade.pnlPercent = Number((priceDeltaPct * leverage * 100).toFixed(2));

      // Trailing stop adjustment when in profit
      if (trade.pnl > trade.capitalAllocated * 0.4) {
        const trailingBuffer = trade.direction === 'LONG' ? currentPrice * 0.988 : currentPrice * 1.012;
        if (!trade.trailingStopPrice || (trade.direction === 'LONG' ? trailingBuffer > trade.trailingStopPrice : trailingBuffer < trade.trailingStopPrice)) {
          trade.trailingStopPrice = Number(trailingBuffer.toFixed(4));
        }
      }

      // Check Exit Conditions:
      let shouldClose = false;
      let exitReason: Trade['exitReason'] = undefined;

      // Take Profit Hit
      if (
        (trade.direction === 'LONG' && currentPrice >= trade.takeProfit) ||
        (trade.direction === 'SHORT' && currentPrice <= trade.takeProfit)
      ) {
        shouldClose = true;
        exitReason = 'TAKE_PROFIT';
      }
      // Stop Loss Hit (Strict max 3% dynamic capital risk rule)
      else if (
        (trade.direction === 'LONG' && currentPrice <= trade.stopLoss) ||
        (trade.direction === 'SHORT' && currentPrice >= trade.stopLoss) ||
        trade.pnl <= -(bot.currentBalance * 0.03)
      ) {
        shouldClose = true;
        exitReason = 'STOP_LOSS';
      }
      // Trailing Stop Hit
      else if (
        trade.trailingStopPrice &&
        ((trade.direction === 'LONG' && currentPrice <= trade.trailingStopPrice) ||
         (trade.direction === 'SHORT' && currentPrice >= trade.trailingStopPrice))
      ) {
        shouldClose = true;
        exitReason = 'TRAILING_STOP';
      }

      if (shouldClose && exitReason) {
        await this.closeTrade(bot, trade, currentPrice, exitReason);
      }
    }
  }

  private async closeTrade(bot: Bot, trade: Trade, exitPrice: number, reason: NonNullable<Trade['exitReason']>) {
    trade.status = 'CLOSED';
    trade.exitPrice = exitPrice;
    trade.exitTime = Date.now();
    trade.exitReason = reason;

    // Strict cap: ensure loss never exceeds 3% of bot balance at time of trade
    const maxAllowedLoss = bot.currentBalance * 0.03;
    if (trade.pnl < -maxAllowedLoss) {
      trade.pnl = Number((-maxAllowedLoss).toFixed(2));
      trade.pnlPercent = -3.0;
    }

    const isWin = trade.pnl >= 0;
    bot.currentBalance = Number(Math.max(10, bot.currentBalance + trade.pnl).toFixed(2));
    bot.allocatedBalance = 0;
    bot.totalPnl = Number((bot.currentBalance - bot.initialBalance).toFixed(2));
    bot.totalPnlPercent = Number((((bot.currentBalance - bot.initialBalance) / bot.initialBalance) * 100).toFixed(2));
    bot.totalTrades += 1;

    if (isWin) {
      bot.winTrades += 1;
      bot.brain.experiencePoints += 25;
      if (bot.brain.experiencePoints >= bot.brain.brainLevel * 100) {
        bot.brain.brainLevel += 1;
        bot.brain.learningNotes.push(`🧠 Brain evolved to Level ${bot.brain.brainLevel}! Enhanced pattern recognition.`);
      }
    } else {
      bot.lossTrades += 1;
      bot.brain.mistakesAnalyzed += 1;
    }

    bot.winRate = Number(((bot.winTrades / bot.totalTrades) * 100).toFixed(1));
    bot.lastTradeTime = Date.now();

    // Push into equity curve
    bot.equityCurve.push({
      timestamp: Date.now(),
      balance: bot.currentBalance,
      tradeCount: bot.totalTrades,
    });
    if (bot.equityCurve.length > 80) {
      bot.equityCurve.shift();
    }

    // Add to histories
    bot.tradeHistory.unshift({ ...trade });
    if (bot.tradeHistory.length > 50) {
      bot.tradeHistory.pop();
    }
    this.allTrades.unshift({ ...trade });
    if (this.allTrades.length > 200) {
      this.allTrades.pop();
    }

    bot.activeTrade = null;

    // AI Brain Post-Trade Reflection on Loss or Milestones
    if (!isWin || bot.totalTrades % 5 === 0) {
      try {
        const reflection = await performAiBrainReflection(bot, trade);
        if (reflection) {
          bot.brain.lessons.unshift(reflection.lesson);
          if (bot.brain.lessons.length > 20) bot.brain.lessons.pop();
          bot.brain.evolutionSummary = reflection.newEvolutionSummary;
          bot.brain.learningNotes = reflection.notes;
          bot.brain.confidenceScore = Math.min(99, Math.max(50, bot.brain.confidenceScore + reflection.lesson.confidenceImpact));
          trade.aiReview = `${reflection.lesson.mistakeIdentified} -> ${reflection.lesson.adaptationMade}`;
        }
      } catch (err) {
        console.warn('AI Brain reflection error:', err);
      }
    }

    // Send Telegram alert if enabled
    telegramService.sendTradeAlert(bot, trade.symbol, 'CLOSE', trade.pnl, reason);
  }

  private async scanAndExecuteTrades(coins: MarketCoin[]) {
    // Check available bots
    const availableBots = Array.from(this.bots.values()).filter(b => b.isActive && !b.activeTrade);
    if (availableBots.length === 0) return;

    for (const bot of availableBots) {
      // Evaluate coins against bot strategy
      for (const coin of coins) {
        const signal = this.evaluateStrategySignal(bot, coin);
        if (signal.valid && signal.confidence >= bot.strategy.minConfidenceToTrade) {
          this.executeTrade(bot, coin, signal.direction, signal.confidence);
          break; // Bot entered 1 quality trade this cycle
        }
      }
    }
  }

  private evaluateStrategySignal(bot: Bot, coin: MarketCoin): { valid: boolean; direction: 'LONG' | 'SHORT'; confidence: number } {
    const ind = coin.indicators;
    const mtf = coin.mtf;
    const weights = bot.brain.adaptiveWeights;

    let longScore = 0;
    let shortScore = 0;
    const archetype = bot.strategy.coreArchetype;

    // Check Multi-Timeframe Alignment
    if (mtf.tf5m === 'BULLISH' && mtf.tf15m === 'BULLISH') longScore += 25 * weights.mtfAlignmentStrictness;
    if (mtf.tf5m === 'BEARISH' && mtf.tf15m === 'BEARISH') shortScore += 25 * weights.mtfAlignmentStrictness;
    if (mtf.tf1h === 'BULLISH') longScore += 15;
    if (mtf.tf1h === 'BEARISH') shortScore += 15;

    // Check ADX Trend Strength Filter
    if (ind.adx.adx >= weights.adxThreshold) {
      if (ind.adx.plusDI > ind.adx.minusDI) longScore += 20 * weights.trendWeight;
      else shortScore += 20 * weights.trendWeight;
    }

    // Archetype-Specific Multi-Indicator Logic
    switch (archetype) {
      case 'Breakout & Volume Surge':
        if (ind.bollinger.state === 'EXPANSION' && ind.volumeFlow.surge && ind.rsi > 52) longScore += 35;
        if (ind.bollinger.state === 'EXPANSION' && ind.volumeFlow.surge && ind.rsi < 48) shortScore += 35;
        break;

      case 'Trend Exhaustion Pullback':
        if (ind.rsi <= weights.rsiOversoldThreshold && ind.ema.alignment !== 'BEARISH_STACK' && ind.vwap.position === 'ABOVE') longScore += 38;
        if (ind.rsi >= weights.rsiOverboughtThreshold && ind.ema.alignment !== 'BULLISH_STACK' && ind.vwap.position === 'BELOW') shortScore += 38;
        break;

      case 'Mean Reversion & Liquidity Sweep':
        if (ind.bollinger.percentB < 0.15 && ind.stochasticRsi.state === 'CROSS_UP') longScore += 40;
        if (ind.bollinger.percentB > 0.85 && ind.stochasticRsi.state === 'CROSS_DOWN') shortScore += 40;
        break;

      case 'Momentum Continuation':
        if (ind.superTrend.direction === 'BULLISH' && ind.macd.trend === 'BULLISH' && ind.ema.alignment === 'BULLISH_STACK') longScore += 42;
        if (ind.superTrend.direction === 'BEARISH' && ind.macd.trend === 'BEARISH' && ind.ema.alignment === 'BEARISH_STACK') shortScore += 42;
        break;

      case 'VWAP Multi-Band Institutional':
        if (ind.vwap.position === 'ABOVE' && ind.vwap.distancePct > 0.3 && ind.macd.histogram > 0) longScore += 36;
        if (ind.vwap.position === 'BELOW' && ind.vwap.distancePct < -0.3 && ind.macd.histogram < 0) shortScore += 36;
        break;

      case 'Order Flow & Cloud Break':
      case 'Harmonic Wave & Oscillator':
      case 'Volatility Expansion Squeeze':
      default:
        if (ind.macd.trend === 'BULLISH' && ind.stochasticRsi.k > 45 && ind.superTrend.direction === 'BULLISH') longScore += 38;
        if (ind.macd.trend === 'BEARISH' && ind.stochasticRsi.k < 55 && ind.superTrend.direction === 'BEARISH') shortScore += 38;
        break;
    }

    const confidence = Math.max(longScore, shortScore);
    const direction = longScore >= shortScore ? 'LONG' : 'SHORT';

    return {
      valid: confidence >= bot.strategy.minConfidenceToTrade,
      direction,
      confidence: Math.min(96, Math.floor(confidence)),
    };
  }

  public executeTrade(bot: Bot, coin: MarketCoin, direction: 'LONG' | 'SHORT', confidence: number) {
    const entryPrice = coin.price;
    const now = Date.now();

    // Max 5% of Dynamic Capital per trade
    const capitalAllocated = Number((bot.currentBalance * 0.05).toFixed(2));
    
    // Strict Max 3% of Dynamic Capital Stop-Loss (Max $3.00 loss on $100 balance)
    // Dynamic stop loss distance in price based on ATR buffer
    const stopLossPct = 0.012; // 1.2% price move with leverage = ~3% capital loss
    const takeProfitPct = stopLossPct * bot.strategy.riskRewardRatio; // e.g. 2.4x reward

    const stopLoss = direction === 'LONG'
      ? Number((entryPrice * (1 - stopLossPct)).toFixed(4))
      : Number((entryPrice * (1 + stopLossPct)).toFixed(4));

    const takeProfit = direction === 'LONG'
      ? Number((entryPrice * (1 + takeProfitPct)).toFixed(4))
      : Number((entryPrice * (1 - takeProfitPct)).toFixed(4));

    const amount = Number((capitalAllocated / entryPrice).toFixed(6));

    const trade: Trade = {
      id: `trade-${bot.id}-${now}`,
      botId: bot.id,
      botName: bot.name,
      symbol: coin.symbol,
      direction,
      entryPrice,
      currentPrice: entryPrice,
      amount,
      capitalAllocated,
      stopLoss,
      takeProfit,
      pnl: 0,
      pnlPercent: 0,
      status: 'OPEN',
      entryTime: now,
      strategyUsed: bot.strategy.name,
      indicatorsAtEntry: {
        rsi: coin.indicators.rsi,
        macdHistogram: coin.indicators.macd.histogram,
        adx: coin.indicators.adx.adx,
        vwapDist: coin.indicators.vwap.distancePct,
        timeframeConfluence: coin.mtf.confluenceScore,
      },
    };

    bot.activeTrade = trade;
    bot.allocatedBalance = capitalAllocated;

    // Trigger instant Telegram alert if configured
    telegramService.sendTradeAlert(bot, coin.symbol, 'OPEN');

    return trade;
  }

  public resetAllBots(): void {
    const now = Date.now();
    for (const bot of this.bots.values()) {
      bot.currentBalance = 100.0;
      bot.initialBalance = 100.0;
      bot.allocatedBalance = 0.0;
      bot.totalPnl = 0.0;
      bot.totalPnlPercent = 0.0;
      bot.totalTrades = 0;
      bot.winTrades = 0;
      bot.lossTrades = 0;
      bot.winRate = 0.0;
      bot.activeTrade = null;
      bot.tradeHistory = [];
      bot.equityCurve = [
        {
          timestamp: now,
          balance: 100.0,
          tradeCount: 0,
        },
      ];
      bot.brain.learningNotes.push(`🔄 Account reset to $100.00 base. Neural brain memory retained!`);
    }
    this.allTrades = [];
    console.log('All 50 trading bots have been reset to fresh $100 accounts.');
  }

  public resetBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    const now = Date.now();
    bot.currentBalance = 100.0;
    bot.initialBalance = 100.0;
    bot.allocatedBalance = 0.0;
    bot.totalPnl = 0.0;
    bot.totalPnlPercent = 0.0;
    bot.totalTrades = 0;
    bot.winTrades = 0;
    bot.lossTrades = 0;
    bot.winRate = 0.0;
    bot.activeTrade = null;
    bot.tradeHistory = [];
    bot.equityCurve = [
      {
        timestamp: now,
        balance: 100.0,
        tradeCount: 0,
      },
    ];
    bot.brain.learningNotes.push(`🔄 Reset bot account to fresh $100.00.`);
    return true;
  }

  public async triggerAiReflectionForBot(botId: string) {
    const bot = this.bots.get(botId);
    if (!bot) return null;
    const reflection = await performAiBrainReflection(bot);
    if (reflection) {
      bot.brain.lessons.unshift(reflection.lesson);
      bot.brain.evolutionSummary = reflection.newEvolutionSummary;
      bot.brain.learningNotes = reflection.notes;
      bot.brain.confidenceScore = Math.min(99, Math.max(50, bot.brain.confidenceScore + reflection.lesson.confidenceImpact));
    }
    return reflection;
  }

  public getAllBots(): Bot[] {
    return Array.from(this.bots.values());
  }

  public getBot(id: string): Bot | undefined {
    return this.bots.get(id);
  }

  public getLiveTrades(): Trade[] {
    const live: Trade[] = [];
    for (const b of this.bots.values()) {
      if (b.activeTrade) {
        live.push(b.activeTrade);
      }
    }
    return live;
  }

  public getAllTrades(): Trade[] {
    return this.allTrades;
  }

  public getArenaState(): ArenaState {
    const bots = this.getAllBots();
    const liveTrades = this.getLiveTrades();
    const totalArenaTrades = bots.reduce((a, b) => a + b.totalTrades, 0);
    const totalArenaPnl = Number(bots.reduce((a, b) => a + b.totalPnl, 0).toFixed(2));
    const totalWins = bots.reduce((a, b) => a + b.winTrades, 0);
    const arenaWinRate = totalArenaTrades > 0 ? Number(((totalWins / totalArenaTrades) * 100).toFixed(1)) : 0;
    const coins = cryptoScanner.getAllCoins();

    return {
      bots,
      coins,
      liveTrades,
      totalArenaTrades,
      totalArenaPnl,
      arenaWinRate,
      telegramConfig: telegramService.getConfig(),
      marketStatus: 'LIVE_SYNCING',
      lastEngineTick: this.lastTick,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}

export const tradingEngine = new TradingEngine();
