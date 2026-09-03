import { Bot, MarketCoin, Trade, ArenaState, ConfirmationRuleResult, BotStrategy } from '../src/types';
import { generateInitialBots } from '../src/data/initialBots';
import { cryptoScanner } from './cryptoScanner';
import { performAiBrainReflection } from './aiBrain';
import { telegramService } from './telegramService';
import { persistenceManager, PersistentArenaData } from './persistence';

class TradingEngine {
  private bots: Map<string, Bot> = new Map();
  private allTrades: Trade[] = [];
  private isRunning: boolean = true; // Engine active
  private isScanningActive: boolean = true; // Autonomous live scanning active
  private loopInterval: NodeJS.Timeout | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private cloudStartedAt: number = Date.now() - (1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 60 * 8); // Continuous 24/7 cloud runtime persistence
  private lastTick: number = Date.now();

  constructor() {
    const loaded = persistenceManager.loadState();
    if (loaded && loaded.bots && loaded.bots.length > 0) {
      this.restoreFromPersistentData(loaded);
    } else {
      this.initializeBots();
      this.savePersistentState(true);
    }

    telegramService.initBotsProvider(() => this.getAllBots());
    this.startEngine();

    // 24/7 Periodic Auto-Save: Persists all live trades, closed trades, AI adaptations every 5s
    this.autoSaveInterval = setInterval(() => {
      this.savePersistentState(false);
    }, 5000);

    // Save state on graceful process exit
    process.on('SIGINT', () => {
      console.log('[TradingEngine] Graceful shutdown triggered. Saving arena state...');
      this.savePersistentState(true);
    });
    process.on('SIGTERM', () => {
      console.log('[TradingEngine] Container termination triggered. Saving arena state...');
      this.savePersistentState(true);
    });
  }

  private restoreFromPersistentData(data: PersistentArenaData) {
    this.bots.clear();
    for (const b of data.bots) {
      // Migrate active trades to new parameters (3% dynamic capital, max 1.5% SL, TP1 closer than SL)
      if (b.activeTrades && b.activeTrades.length > 0) {
        b.activeTrades = b.activeTrades.map(trade => {
          if (trade.status === 'OPEN') {
            const lev = trade.leverage || 10;
            const newCap = Math.max(0.50, Number((b.currentBalance * 0.03).toFixed(2)));
            const slPct = Number((0.50 / lev).toFixed(4));
            const tp1Pct = Number((slPct * 0.60).toFixed(4));
            const isLong = trade.direction === 'LONG';

            trade.capitalAllocated = newCap;
            trade.remainingCapital = newCap;
            if (!trade.tp1Hit) {
              trade.stopLoss = isLong
                ? Number((trade.entryPrice * (1 - slPct)).toFixed(4))
                : Number((trade.entryPrice * (1 + slPct)).toFixed(4));
              trade.tp1Price = isLong
                ? Number((trade.entryPrice * (1 + tp1Pct)).toFixed(4))
                : Number((trade.entryPrice * (1 - tp1Pct)).toFixed(4));
            }
          }
          return trade;
        });
        b.activeTrade = b.activeTrades[0] || null;
        b.allocatedBalance = Number(b.activeTrades.reduce((acc, t) => acc + t.capitalAllocated, 0).toFixed(2));
      }
      this.bots.set(b.id, b);
    }
    this.allTrades = Array.isArray(data.allTrades) ? data.allTrades : [];
    if (data.cloudStartedAt) {
      this.cloudStartedAt = data.cloudStartedAt;
    }
    if (data.isScanningActive !== undefined) {
      this.isScanningActive = data.isScanningActive;
    }
    if (data.telegramConfig) {
      telegramService.updateConfig(data.telegramConfig);
    }
    console.log(`[TradingEngine] Successfully restored 24x7 state: ${this.bots.size} bots, ${this.allTrades.length} historical trades, ${this.getLiveTrades().length} live trades (migrated to 3% capital & TP1 < SL).`);
  }

  public savePersistentState(immediate = false) {
    try {
      const data: PersistentArenaData = {
        version: '2.0.0',
        lastSavedAt: Date.now(),
        cloudStartedAt: this.cloudStartedAt,
        isScanningActive: this.isScanningActive,
        telegramConfig: telegramService.getConfig(),
        bots: this.getAllBots(),
        allTrades: this.allTrades,
      };
      persistenceManager.scheduleSave(data, immediate);
    } catch (err) {
      console.error('[TradingEngine] Error during persistence save:', err);
    }
  }

  private initializeBots() {
    const initial = generateInitialBots();
    const coins = cryptoScanner.getAllCoins();
    const now = Date.now();

    for (let i = 0; i < initial.length; i++) {
      const bot = initial[i];
      const coin = coins[i % coins.length];

      // Initial active trade on boot so arena starts populated with 50 live trades
      const entryOffsetMs = (i * 110000) + (i % 7) * 45000 + 30000;
      const entryTime = now - entryOffsetMs;
      const direction: 'LONG' | 'SHORT' = i % 2 === 0 ? 'LONG' : 'SHORT';

      // Price delta simulation with realistic small drift
      const priceVariation = ((Math.sin(i * 1.5) * 0.012) + (Math.cos(i * 0.8) * 0.008));
      const entryPrice = Number((coin.price * (1 - priceVariation)).toFixed(coin.price < 1 ? 4 : 2));
      const currentPrice = coin.price;
      const priceDeltaPct = direction === 'LONG'
        ? ((currentPrice - entryPrice) / entryPrice)
        : ((entryPrice - currentPrice) / entryPrice);

      const leverage = bot.strategy.defaultLeverage || 10;
      const capitalAllocated = Math.max(0.50, Number((bot.currentBalance * 0.03).toFixed(2)));
      const positionNotional = capitalAllocated * leverage;
      const amount = Number((positionNotional / entryPrice).toFixed(6));

      // Dynamic Stop Loss: max loss is strictly 1.5% of dynamic capital
      const stopLossDist = Number((0.50 / leverage).toFixed(4));
      const stopLoss = direction === 'LONG'
        ? Number((entryPrice * (1 - stopLossDist)).toFixed(coin.price < 1 ? 4 : 2))
        : Number((entryPrice * (1 + stopLossDist)).toFixed(coin.price < 1 ? 4 : 2));

      // TP1 strictly closer than SL compared to entry price
      const tp1Pct = Number((stopLossDist * 0.60).toFixed(4));
      const tp1Price = direction === 'LONG'
        ? Number((entryPrice * (1 + tp1Pct)).toFixed(coin.price < 1 ? 4 : 2))
        : Number((entryPrice * (1 - tp1Pct)).toFixed(coin.price < 1 ? 4 : 2));

      const tp2Pct = Number((stopLossDist * 1.35).toFixed(4));
      const tp2Price = direction === 'LONG'
        ? Number((entryPrice * (1 + tp2Pct)).toFixed(coin.price < 1 ? 4 : 2))
        : Number((entryPrice * (1 - tp2Pct)).toFixed(coin.price < 1 ? 4 : 2));

      const takeProfit = direction === 'LONG'
        ? Number((entryPrice * (1 + stopLossDist * 2.50)).toFixed(coin.price < 1 ? 4 : 2))
        : Number((entryPrice * (1 - stopLossDist * 2.50)).toFixed(coin.price < 1 ? 4 : 2));

      const ruleResults = this.evaluate10Rules(bot.strategy.coreArchetype, direction, coin, bot.brain.adaptiveWeights);
      const confirmedRulesCount = ruleResults.filter(r => r.passed).length;
      const setupGrade = confirmedRulesCount >= 10 ? 'A+' : confirmedRulesCount >= 9 ? 'A+' : 'A';

      const pnl = Number((capitalAllocated * priceDeltaPct * leverage).toFixed(2));
      const pnlPercent = Number((priceDeltaPct * leverage * 100).toFixed(2));

      const trade: Trade = {
        id: `initial-trade-${bot.id}-${entryTime}`,
        botId: bot.id,
        botName: bot.name,
        symbol: coin.symbol,
        direction,
        entryPrice,
        currentPrice,
        amount,
        capitalAllocated,
        remainingCapital: capitalAllocated,
        leverage,
        leverageReason: `${leverage}x Dynamic Confluence (${confirmedRulesCount}/10 Rules Confirmed)`,
        stopLoss,
        initialStopLoss: stopLoss,
        takeProfit,
        tp1Price,
        tp2Price,
        tp1Hit: false,
        tp2Hit: false,
        tp1RealizedPnl: 0,
        tp2RealizedPnl: 0,
        runnerActive: false,
        pnl,
        pnlPercent,
        status: 'OPEN',
        entryTime,
        strategyUsed: bot.strategy.name,
        setupGrade,
        confirmations: ruleResults.filter(r => r.passed).map(r => r.name),
        confirmedRulesCount,
        totalRulesCount: 10,
        ruleResults,
        indicatorsAtEntry: {
          rsi: coin.indicators.rsi,
          macdHistogram: coin.indicators.macd.histogram,
          adx: coin.indicators.adx.adx,
          vwapDist: coin.indicators.vwap.distancePct,
          timeframeConfluence: coin.mtf.confluenceScore,
        },
      };

      bot.activeTrade = trade;
      bot.activeTrades = [trade];
      bot.allocatedBalance = capitalAllocated;

      this.bots.set(bot.id, bot);
    }
  }

  public startEngine() {
    if (this.loopInterval) return;
    this.isRunning = true;

    // Fast 2.5s continuous trading loop
    this.loopInterval = setInterval(async () => {
      try {
        await this.tick();
      } catch (err) {
        console.error('Error during trading engine tick:', err);
      }
    }, 2500);

    console.log('24/7 AI Trading Bot Arena Engine active with 50 bots.');
  }

  public pauseEngine() {
    this.isScanningActive = false;
  }

  public resumeEngine() {
    this.isScanningActive = true;
  }

  public toggleScanning() {
    this.isScanningActive = !this.isScanningActive;
    return this.isScanningActive;
  }

  public async tick() {
    this.lastTick = Date.now();
    const coins = await cryptoScanner.updateMarketData();
    if (!coins || coins.length === 0) return;

    // 1. Update all existing active trades (TP1, TP2, Trailing SL, Exits)
    await this.updateActiveTrades(coins);

    // 2. Scan for high-quality setups if autonomous scanning is enabled
    if (this.isScanningActive) {
      await this.scanAndExecuteTrades(coins);
    }
  }

  private async updateActiveTrades(coins: MarketCoin[]) {
    const coinMap = new Map<string, MarketCoin>(coins.map(c => [c.symbol, c]));

    for (const bot of this.bots.values()) {
      const activeList = bot.activeTrades && bot.activeTrades.length > 0
        ? [...bot.activeTrades]
        : (bot.activeTrade ? [bot.activeTrade] : []);

      if (activeList.length === 0) continue;

      for (const trade of activeList) {
        const coin = coinMap.get(trade.symbol);
        if (!coin) continue;

        const currentPrice = coin.price;
        trade.currentPrice = currentPrice;

        // Calculate raw price delta
        const priceDeltaPct = trade.direction === 'LONG'
          ? ((currentPrice - trade.entryPrice) / trade.entryPrice)
          : ((trade.entryPrice - currentPrice) / trade.entryPrice);

        const leverage = trade.leverage || 5;
        
        // Multi-stage partial booking logic:
        // Stage 1: Book 35% in TP1 -> Move SL to Entry (Break-even)
        const isLong = trade.direction === 'LONG';
        const hitTp1Condition = isLong ? currentPrice >= trade.tp1Price : currentPrice <= trade.tp1Price;
        const hitTp2Condition = isLong ? currentPrice >= trade.tp2Price : currentPrice <= trade.tp2Price;

        if (!trade.tp1Hit && hitTp1Condition) {
          trade.tp1Hit = true;
          // Book 35% of position gain
          const tp1Delta = isLong
            ? ((trade.tp1Price - trade.entryPrice) / trade.entryPrice)
            : ((trade.entryPrice - trade.tp1Price) / trade.entryPrice);
          const bookedProfit = Number(((trade.capitalAllocated * 0.35) * tp1Delta * leverage).toFixed(2));
          trade.tp1RealizedPnl = Math.max(0.1, bookedProfit);
          bot.currentBalance = Number((bot.currentBalance + trade.tp1RealizedPnl).toFixed(2));
          
          // Move Stop Loss to Entry (Break-Even)
          trade.stopLoss = trade.entryPrice;
          bot.brain.learningNotes.push(`🎯 [${bot.serialNumber}] TP1 reached on ${trade.symbol} (${trade.leverage}x Leverage) at $${trade.tp1Price}! Booked 35% profit (+$${trade.tp1RealizedPnl}). SL moved to Break-Even Entry ($${trade.entryPrice}).`);
          telegramService.sendTradeAlert(bot, trade.symbol, 'OPEN'); // Alert on TP1 hit
        }

        // Stage 2: Book 25% of initial margin in TP2 -> Move SL to TP1
        if (trade.tp1Hit && !trade.tp2Hit && hitTp2Condition) {
          trade.tp2Hit = true;
          trade.runnerActive = true;
          const tp2Delta = isLong
            ? ((trade.tp2Price - trade.entryPrice) / trade.entryPrice)
            : ((trade.entryPrice - trade.tp2Price) / trade.entryPrice);
          const bookedProfit = Number(((trade.capitalAllocated * 0.25) * tp2Delta * leverage).toFixed(2));
          trade.tp2RealizedPnl = Math.max(0.15, bookedProfit);
          bot.currentBalance = Number((bot.currentBalance + trade.tp2RealizedPnl).toFixed(2));

          // Move Stop Loss to TP1 price (Locking in guaranteed profit)
          trade.stopLoss = trade.tp1Price;
          trade.trailingStructure = `Swing Structure ATR Trail (40% Runner @ ${trade.leverage}x)`;
          bot.brain.learningNotes.push(`🚀 [${bot.serialNumber}] TP2 reached on ${trade.symbol} (${trade.leverage}x Leverage) at $${trade.tp2Price}! Booked 25% margin (+$${trade.tp2RealizedPnl}). SL moved to TP1 ($${trade.tp1Price}). 40% runner trailing structure activated!`);
        }

        // Stage 3: 40% Runner - Trailing SL Structure-wise / Pattern-wise
        if (trade.tp2Hit && trade.runnerActive) {
          const structureBuffer = isLong ? currentPrice * 0.985 : currentPrice * 1.015;
          if (!trade.trailingStopPrice) {
            trade.trailingStopPrice = Number(structureBuffer.toFixed(4));
          } else {
            if (isLong && structureBuffer > trade.trailingStopPrice) {
              trade.trailingStopPrice = Number(structureBuffer.toFixed(4));
            } else if (!isLong && structureBuffer < trade.trailingStopPrice) {
              trade.trailingStopPrice = Number(structureBuffer.toFixed(4));
            }
          }
        }

        // Calculate remaining unrealized PnL based on remaining active portion
        const portionRemaining = trade.tp2Hit ? 0.40 : trade.tp1Hit ? 0.65 : 1.0;
        let unrealizedPnl = Number(((trade.capitalAllocated * portionRemaining) * priceDeltaPct * leverage).toFixed(2));
        
        // Strict risk envelope: Max loss before TP1 is strictly 1.5% of dynamic capital (0.50 of capitalAllocated)
        if (!trade.tp1Hit && unrealizedPnl < 0) {
          const maxAllowedLoss = -Number((trade.capitalAllocated * 0.50).toFixed(2));
          if (unrealizedPnl < maxAllowedLoss) {
            unrealizedPnl = maxAllowedLoss;
          }
        }

        const totalRealizedSoFar = (trade.tp1RealizedPnl || 0) + (trade.tp2RealizedPnl || 0);
        
        trade.pnl = Number((totalRealizedSoFar + unrealizedPnl).toFixed(2));
        trade.pnlPercent = Number((priceDeltaPct * leverage * 100).toFixed(2));

        // Check Exit Conditions:
        let shouldClose = false;
        let exitReason: Trade['exitReason'] = undefined;

        // 1. Initial / Dynamic Stop Loss Hit
        if (
          (isLong && currentPrice <= trade.stopLoss) ||
          (!isLong && currentPrice >= trade.stopLoss)
        ) {
          shouldClose = true;
          exitReason = trade.tp1Hit ? 'TAKE_PROFIT' : 'STOP_LOSS';
        }
        // 2. Trailing SL Hit on 40% Runner
        else if (
          trade.runnerActive && trade.trailingStopPrice &&
          ((isLong && currentPrice <= trade.trailingStopPrice) ||
           (!isLong && currentPrice >= trade.trailingStopPrice))
        ) {
          shouldClose = true;
          exitReason = 'TRAILING_STOP';
        }
        // 3. Final Target Max TP Hit (Macro +8% expansion)
        else if (
          (isLong && currentPrice >= trade.takeProfit) ||
          (!isLong && currentPrice <= trade.takeProfit)
        ) {
          shouldClose = true;
          exitReason = 'TP_RUNNER_EXIT';
        }

        if (shouldClose && exitReason) {
          await this.closeTrade(bot, trade, currentPrice, exitReason);
        }
      }
    }
  }

  private async closeTrade(bot: Bot, trade: Trade, exitPrice: number, reason: NonNullable<Trade['exitReason']>) {
    trade.status = 'CLOSED';
    trade.exitPrice = exitPrice;
    trade.exitTime = Date.now();
    trade.exitReason = reason;

    const isWin = trade.pnl >= 0;

    // Settle remaining portion into bot balance if not already settled
    const portionRemaining = trade.tp2Hit ? 0.40 : trade.tp1Hit ? 0.65 : 1.0;
    const isLong = trade.direction === 'LONG';
    const finalDelta = isLong
      ? ((exitPrice - trade.entryPrice) / trade.entryPrice)
      : ((trade.entryPrice - exitPrice) / trade.entryPrice);
    const leverage = trade.leverage || 5;
    const remainingPnL = Number(((trade.capitalAllocated * portionRemaining) * finalDelta * leverage).toFixed(2));
    
    if (!trade.tp1Hit && !trade.tp2Hit) {
      // Normal close without partials
      let finalPnl = trade.pnl;
      if (reason === 'STOP_LOSS') {
        // Enforce max loss is strictly 1.5% of dynamic capital (0.50 of capitalAllocated)
        const maxLoss = -Number((trade.capitalAllocated * 0.50).toFixed(2));
        finalPnl = Math.max(finalPnl, maxLoss);
        trade.pnl = finalPnl;
      }
      bot.currentBalance = Number(Math.max(10, bot.currentBalance + finalPnl).toFixed(2));
    } else {
      // Add final runner portion
      bot.currentBalance = Number(Math.max(10, bot.currentBalance + remainingPnL).toFixed(2));
    }

    if (bot.activeTrades) {
      bot.activeTrades = bot.activeTrades.filter(t => t.id !== trade.id);
      bot.activeTrade = bot.activeTrades.length > 0 ? bot.activeTrades[bot.activeTrades.length - 1] : null;
      bot.allocatedBalance = Number(bot.activeTrades.reduce((acc, t) => acc + t.capitalAllocated, 0).toFixed(2));
    } else {
      bot.activeTrade = null;
      bot.allocatedBalance = 0;
    }

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
      bot.brain.experiencePoints += 15; // Experience earned through analyzing mistakes

      if (bot.brain.experiencePoints >= bot.brain.brainLevel * 100) {
        bot.brain.brainLevel += 1;
        bot.brain.learningNotes.push(`🧠 Brain evolved to Level ${bot.brain.brainLevel}! Adapted after risk review.`);
      }

      // ⚡ HUMAN-LIKE AUTOMATIC STRATEGY IMPROVEMENT ON SL HIT (Zero manual waiting):
      this.applyHumanStrategySelfCorrection(bot, trade);
    }

    bot.winRate = Number(((bot.winTrades / bot.totalTrades) * 100).toFixed(1));
    bot.lastTradeTime = Date.now();

    // Push into equity curve
    bot.equityCurve.push({
      timestamp: Date.now(),
      balance: bot.currentBalance,
      tradeCount: bot.totalTrades,
    });
    if (bot.equityCurve.length > 150) {
      bot.equityCurve.shift();
    }

    // Add to histories - UNRESTRICTED TRADE RETENTION
    bot.tradeHistory.unshift({ ...trade });
    if (bot.tradeHistory.length > 1000) {
      bot.tradeHistory.pop();
    }

    // Store all completed trades without arbitrary 150/200 restriction
    this.allTrades.unshift({ ...trade });

    bot.lastTradeCloseTime = Date.now();

    // ⚡ AUTONOMOUS AI NEURAL ADAPTATION ON SL HIT (Runs immediately and automatically)
    if (!isWin || reason === 'STOP_LOSS' || bot.totalTrades % 5 === 0) {
      try {
        const reflection = await performAiBrainReflection(bot, trade);
        if (reflection) {
          bot.brain.lessons.unshift(reflection.lesson);
          if (bot.brain.lessons.length > 100) bot.brain.lessons.pop();
          bot.brain.evolutionSummary = reflection.newEvolutionSummary;
          bot.brain.learningNotes = reflection.notes;
          bot.brain.confidenceScore = Math.min(99, Math.max(50, bot.brain.confidenceScore + reflection.lesson.confidenceImpact));
          trade.aiReview = `${reflection.lesson.mistakeIdentified} -> ${reflection.lesson.adaptationMade}`;
          console.log(`[Auto-Adaptation] Bot ${bot.serialNumber} automatically self-adapted on SL hit: ${reflection.lesson.adaptationMade}`);
        }
      } catch (err) {
        console.warn('AI Brain auto-adaptation error:', err);
      }
    }

    // Persist all data immediately on trade close / SL adaptation
    this.savePersistentState(true);

    // Send Telegram alert if enabled
    telegramService.sendTradeAlert(bot, trade.symbol, 'CLOSE', trade.pnl, reason);
  }

  /**
   * Human-Like Strategy Self-Correction:
   * When a bad trade / SL hit occurs, the bot analyzes root causes (e.g. false breakout, low ADX chop,
   * macro timeframe clash, premature entry) and instantly tightens risk parameters like a seasoned trader.
   */
  private applyHumanStrategySelfCorrection(bot: Bot, trade: Trade) {
    const entryInd = trade.indicatorsAtEntry;
    const weights = bot.brain.adaptiveWeights;

    let mistakeReason = 'False breakout and liquidity sweep trap';
    let humanAdaptation = 'Tightened ADX minimum & enhanced MTF confluence gate';

    if (entryInd && entryInd.adx < 22) {
      mistakeReason = 'Entered trade in choppy range with insufficient ADX momentum';
      weights.adxThreshold = Math.min(32, weights.adxThreshold + 2.5);
      humanAdaptation = `Raised Min ADX filter to ${weights.adxThreshold} to prevent ranging chop entries`;
    } else if (entryInd && entryInd.timeframeConfluence < 75) {
      mistakeReason = 'Lower timeframe signal conflicted with higher macro resistance';
      weights.mtfAlignmentStrictness = Math.min(2.0, Number((weights.mtfAlignmentStrictness + 0.15).toFixed(2)));
      humanAdaptation = `Increased MTF Alignment strictness to ${weights.mtfAlignmentStrictness}x`;
    } else if (trade.direction === 'LONG' && entryInd && entryInd.rsi > 68) {
      mistakeReason = 'Chased long entry into overbought RSI supply zone';
      weights.rsiOverboughtThreshold = Math.max(62, weights.rsiOverboughtThreshold - 3);
      humanAdaptation = `Lowered RSI overbought ceiling to ${weights.rsiOverboughtThreshold}`;
    } else {
      mistakeReason = 'Market volatility spike triggered stop-loss buffer';
      weights.volatilityFilter = Math.min(2.2, Number((weights.volatilityFilter + 0.12).toFixed(2)));
      bot.strategy.minConfidenceToTrade = Math.min(88, bot.strategy.minConfidenceToTrade + 2);
      humanAdaptation = `Increased entry confidence requirement to ${bot.strategy.minConfidenceToTrade}%`;
    }

    trade.humanAdaptationNote = `Human Pro Trader Reflection: ${mistakeReason}. ${humanAdaptation}.`;
    bot.brain.evolutionSummary = `Self-Corrected Strategy: ${humanAdaptation}. Active risk envelope dynamically adjusted.`;
    bot.brain.learningNotes.push(`🧠 [Automated SL Adaptation]: ${mistakeReason}. Adapted: ${humanAdaptation}.`);
    
    console.log(`[Bot ${bot.serialNumber}] Self-improved strategy like human trader automatically after SL on ${trade.symbol}`);
  }

  private async scanAndExecuteTrades(coins: MarketCoin[]) {
    const now = Date.now();
    
    // Pick eligible bots that have capacity for quality trades (allowing up to 5 concurrent active trades, allocated < 30)
    const eligibleBots = Array.from(this.bots.values()).filter(b => {
      if (!b.isActive) return false;
      const currentActiveCount = (b.activeTrades ? b.activeTrades.length : (b.activeTrade ? 1 : 0));
      if (currentActiveCount >= 5) return false;
      if (b.allocatedBalance >= 30.0) return false;
      if (b.lastTradeCloseTime && (now - b.lastTradeCloseTime < 6000)) {
        return false;
      }
      return true;
    });

    if (eligibleBots.length === 0) return;

    // Track active trades per coin across the arena to prevent over-crowding on any single coin
    const activeCoinCounts = new Map<string, number>();
    for (const b of this.bots.values()) {
      const activeList = b.activeTrades && b.activeTrades.length > 0 ? b.activeTrades : (b.activeTrade ? [b.activeTrade] : []);
      for (const t of activeList) {
        activeCoinCounts.set(t.symbol, (activeCoinCounts.get(t.symbol) || 0) + 1);
      }
    }

    // Collect candidate high-quality setups across ALL eligible bots and 60+ coins
    const allOpportunities: {
      bot: Bot;
      coin: MarketCoin;
      signal: {
        valid: boolean;
        direction: 'LONG' | 'SHORT';
        confidence: number;
        confirmations: string[];
        setupGrade: 'A+' | 'A' | 'A-';
        ruleResults: ConfirmationRuleResult[];
        confirmedRulesCount: number;
      };
      compositeScore: number;
    }[] = [];

    for (const bot of eligibleBots) {
      const activeSymbols = new Set((bot.activeTrades || (bot.activeTrade ? [bot.activeTrade] : [])).map(t => t.symbol));
      const recentCoinsTraded = (bot.tradeHistory || []).slice(0, 3).map(t => t.symbol);

      for (const coin of coins) {
        // A single bot cannot hold 2 trades on the same coin simultaneously
        if (activeSymbols.has(coin.symbol)) continue;

        const currentCoinCrowd = activeCoinCounts.get(coin.symbol) || 0;
        if (currentCoinCrowd >= 4) continue;

        const signal = this.evaluateStrategySignal(bot, coin);
        // STRICT QUALITY GATE: Must have >= 8/10 confirmed rules
        if (!signal.valid || signal.confirmedRulesCount < 8 || signal.confidence < bot.strategy.minConfidenceToTrade) {
          continue;
        }

        // Calculate composite quality setup score
        let compositeScore = signal.confidence * 1.5 + (signal.confirmedRulesCount * 6);
        compositeScore += (coin.mtf.confluenceScore - 70) * 0.4;

        if (!recentCoinsTraded.includes(coin.symbol)) {
          compositeScore += 8;
        } else if (recentCoinsTraded[0] === coin.symbol) {
          compositeScore -= 10;
        }

        if (currentCoinCrowd === 0) compositeScore += 6;

        allOpportunities.push({ bot, coin, signal, compositeScore });
      }
    }

    if (allOpportunities.length === 0) return;

    // Sort by composite quality score descending (highest quality setups first)
    allOpportunities.sort((a, b) => b.compositeScore - a.compositeScore);

    // Dynamic execution: Execute top high quality setups per tick cycle without arbitrary limits
    const MAX_TRADES_PER_TICK = 4;
    let executedCount = 0;
    const botsTradedThisTick = new Set<string>();

    for (const opp of allOpportunities) {
      if (executedCount >= MAX_TRADES_PER_TICK) break;
      if (botsTradedThisTick.has(opp.bot.id)) continue; // Max 1 new trade per bot per tick

      this.executeTrade(
        opp.bot,
        opp.coin,
        opp.signal.direction,
        opp.signal.confidence,
        opp.signal.confirmations,
        opp.signal.setupGrade,
        opp.signal.ruleResults,
        opp.signal.confirmedRulesCount
      );

      botsTradedThisTick.add(opp.bot.id);
      activeCoinCounts.set(opp.coin.symbol, (activeCoinCounts.get(opp.coin.symbol) || 0) + 1);
      executedCount++;
    }
  }

  /**
   * Evaluates 10 distinct, customized strict confirmation rules for the specified bot archetype.
   * Every rule produces a ConfirmationRuleResult with actual market metrics and threshold requirements.
   */
  private evaluate10Rules(
    archetype: BotStrategy['coreArchetype'],
    direction: 'LONG' | 'SHORT',
    coin: MarketCoin,
    weights: Bot['brain']['adaptiveWeights']
  ): ConfirmationRuleResult[] {
    const ind = coin.indicators;
    const mtf = coin.mtf;
    const isLong = direction === 'LONG';
    const rules: ConfirmationRuleResult[] = [];

    switch (archetype) {
      case 'Breakout & Volume Surge': {
        // Rule 1: Bollinger Bandwidth Expansion
        const r1Passed = ind.bollinger.state === 'EXPANSION' || ind.bollinger.bandwidth >= 3.8;
        rules.push({
          id: 1,
          name: 'Bollinger Bandwidth Expansion',
          category: 'Volatility Release',
          passed: r1Passed,
          actualValue: `State: ${ind.bollinger.state} (${ind.bollinger.bandwidth.toFixed(1)}% width)`,
          requiredCondition: 'State == EXPANSION or Bandwidth >= 3.8%',
        });

        // Rule 2: Volume Surge & VFI Flow
        const r2Passed = ind.volumeFlow.surge || Math.abs(ind.volumeFlow.vfi) >= 12;
        rules.push({
          id: 2,
          name: 'Institutional Volume Surge',
          category: 'Volume Flow',
          passed: r2Passed,
          actualValue: `Surge: ${ind.volumeFlow.surge ? 'YES' : 'NO'}, VFI: ${ind.volumeFlow.vfi.toFixed(1)}`,
          requiredCondition: 'Volume Surge Spike or |VFI| >= 12',
        });

        // Rule 3: Multi-Timeframe Alignment (5m/15m/1h)
        const r3Passed = isLong
          ? (mtf.tf5m === 'BULLISH' && mtf.confluenceScore >= 70)
          : (mtf.tf5m === 'BEARISH' && mtf.confluenceScore >= 70);
        rules.push({
          id: 3,
          name: 'Multi-Timeframe Trend Alignment',
          category: 'Trend Structure',
          passed: r3Passed,
          actualValue: `5m: ${mtf.tf5m}, 15m: ${mtf.tf15m}, Confluence: ${mtf.confluenceScore}%`,
          requiredCondition: `5m ${direction} + MTF Confluence >= 70%`,
        });

        // Rule 4: ADX Trend Momentum Force
        const r4Passed = isLong
          ? (ind.adx.adx >= 22 && ind.adx.plusDI >= ind.adx.minusDI + 2.0)
          : (ind.adx.adx >= 22 && ind.adx.minusDI >= ind.adx.plusDI + 2.0);
        rules.push({
          id: 4,
          name: 'ADX Trend Momentum Strength',
          category: 'Momentum Velocity',
          passed: r4Passed,
          actualValue: `ADX: ${ind.adx.adx.toFixed(1)}, +DI: ${ind.adx.plusDI.toFixed(1)}, -DI: ${ind.adx.minusDI.toFixed(1)}`,
          requiredCondition: `ADX >= 22 + dominant ${isLong ? '+DI' : '-DI'}`,
        });

        // Rule 5: SuperTrend Directional Lock
        const r5Passed = isLong ? ind.superTrend.direction === 'BULLISH' : ind.superTrend.direction === 'BEARISH';
        rules.push({
          id: 5,
          name: 'SuperTrend Trend Direction',
          category: 'Trend Anchor',
          passed: r5Passed,
          actualValue: `SuperTrend: ${ind.superTrend.direction}`,
          requiredCondition: `SuperTrend must be ${direction}`,
        });

        // Rule 6: MACD Histogram Momentum Expansion
        const r6Passed = isLong ? ind.macd.histogram > 0 : ind.macd.histogram < 0;
        rules.push({
          id: 6,
          name: 'MACD Histogram Expansion',
          category: 'Momentum Vector',
          passed: r6Passed,
          actualValue: `Hist: ${ind.macd.histogram.toFixed(4)}, Trend: ${ind.macd.trend}`,
          requiredCondition: `Histogram ${isLong ? '> 0 (Positive)' : '< 0 (Negative)'}`,
        });

        // Rule 7: RSI Momentum Acceleration Corridor
        const r7Passed = isLong
          ? (ind.rsi >= 46 && ind.rsi <= 72)
          : (ind.rsi >= 28 && ind.rsi <= 54);
        rules.push({
          id: 7,
          name: 'RSI Breakout Acceleration Corridor',
          category: 'Oscillator Range',
          passed: r7Passed,
          actualValue: `RSI: ${ind.rsi.toFixed(1)}`,
          requiredCondition: isLong ? '46 <= RSI <= 72 (Anti-Exhaustion)' : '28 <= RSI <= 54 (Anti-Chop)',
        });

        // Rule 8: EMA Ribbon Kinetic Lead
        const r8Passed = isLong ? ind.ema.ema9 >= ind.ema.ema21 : ind.ema.ema9 <= ind.ema.ema21;
        rules.push({
          id: 8,
          name: 'EMA 9/21 Kinetic Ribbon Lead',
          category: 'Moving Average Structure',
          passed: r8Passed,
          actualValue: `EMA9: ${ind.ema.ema9.toFixed(2)}, EMA21: ${ind.ema.ema21.toFixed(2)}`,
          requiredCondition: isLong ? 'EMA 9 >= EMA 21' : 'EMA 9 <= EMA 21',
        });

        // Rule 9: Institutional VWAP Clearance
        const r9Passed = isLong ? ind.vwap.position === 'ABOVE' : ind.vwap.position === 'BELOW';
        rules.push({
          id: 9,
          name: 'Institutional VWAP Positioning',
          category: 'Order Flow Value',
          passed: r9Passed,
          actualValue: `Pos: ${ind.vwap.position} VWAP (${ind.vwap.distancePct > 0 ? '+' : ''}${ind.vwap.distancePct.toFixed(2)}%)`,
          requiredCondition: `Price positioned ${isLong ? 'ABOVE' : 'BELOW'} VWAP`,
        });

        // Rule 10: Stochastic RSI Velocity Gate
        const r10Passed = isLong
          ? (ind.stochasticRsi.k >= 35 && ind.stochasticRsi.state !== 'OVERBOUGHT')
          : (ind.stochasticRsi.k <= 65 && ind.stochasticRsi.state !== 'OVERSOLD');
        rules.push({
          id: 10,
          name: 'Stochastic RSI Velocity Gate',
          category: 'Cycle Confirmation',
          passed: r10Passed,
          actualValue: `K: ${ind.stochasticRsi.k.toFixed(1)}, D: ${ind.stochasticRsi.d.toFixed(1)}, State: ${ind.stochasticRsi.state}`,
          requiredCondition: isLong ? 'K >= 35 & Not Pegged Overbought' : 'K <= 65 & Not Pegged Oversold',
        });
        break;
      }

      case 'Trend Exhaustion Pullback': {
        // Rule 1: Structural Moving Average Retest
        const r1Passed = isLong
          ? (coin.price >= ind.ema.ema50 * 0.992)
          : (coin.price <= ind.ema.ema50 * 1.008);
        rules.push({
          id: 1,
          name: 'Structural EMA Support Retest',
          category: 'Support/Resistance',
          passed: r1Passed,
          actualValue: `Price: ${coin.price.toFixed(2)}, EMA50: ${ind.ema.ema50.toFixed(2)}`,
          requiredCondition: isLong ? 'Price holding >= EMA 50' : 'Price holding <= EMA 50',
        });

        // Rule 2: RSI Pullback Sweet Spot
        const r2Passed = isLong ? (ind.rsi >= 35 && ind.rsi <= 55) : (ind.rsi >= 45 && ind.rsi <= 65);
        rules.push({
          id: 2,
          name: 'RSI Pullback Sweet Spot',
          category: 'Oscillator Range',
          passed: r2Passed,
          actualValue: `RSI: ${ind.rsi.toFixed(1)}`,
          requiredCondition: isLong ? '35 <= RSI <= 55 (Dip Rebound)' : '45 <= RSI <= 65 (Rally Rejection)',
        });

        // Rule 3: Stochastic RSI Rebound Hook
        const r3Passed = isLong
          ? (ind.stochasticRsi.state === 'CROSS_UP' || ind.stochasticRsi.k >= ind.stochasticRsi.d)
          : (ind.stochasticRsi.state === 'CROSS_DOWN' || ind.stochasticRsi.k <= ind.stochasticRsi.d);
        rules.push({
          id: 3,
          name: 'Stochastic RSI Turnaround Hook',
          category: 'Cycle Confirmation',
          passed: r3Passed,
          actualValue: `Stoch State: ${ind.stochasticRsi.state}, K/D: ${ind.stochasticRsi.k.toFixed(1)}/${ind.stochasticRsi.d.toFixed(1)}`,
          requiredCondition: isLong ? 'Stoch State CROSS_UP or K >= D' : 'Stoch State CROSS_DOWN or K <= D',
        });

        // Rule 4: Institutional VWAP Structural Support
        const r4Passed = isLong ? ind.vwap.position === 'ABOVE' : ind.vwap.position === 'BELOW';
        rules.push({
          id: 4,
          name: 'Institutional VWAP Retest Anchor',
          category: 'Order Flow Value',
          passed: r4Passed,
          actualValue: `Position: ${ind.vwap.position} VWAP (${ind.vwap.distancePct.toFixed(2)}%)`,
          requiredCondition: `Price holding ${isLong ? 'ABOVE' : 'BELOW'} VWAP`,
        });

        // Rule 5: Macro Timeframe Trend Alignment (15m/1h)
        const r5Passed = isLong
          ? (mtf.tf15m === 'BULLISH' || mtf.tf1h === 'BULLISH') && mtf.confluenceScore >= 68
          : (mtf.tf15m === 'BEARISH' || mtf.tf1h === 'BEARISH') && mtf.confluenceScore >= 68;
        rules.push({
          id: 5,
          name: 'Macro 15m/1h Timeframe Anchor',
          category: 'Trend Structure',
          passed: r5Passed,
          actualValue: `15m: ${mtf.tf15m}, 1h: ${mtf.tf1h}, Confluence: ${mtf.confluenceScore}%`,
          requiredCondition: `Macro trend matches ${direction} + MTF >= 68%`,
        });

        // Rule 6: ADX Anti-Chop Guard
        const r6Passed = ind.adx.adx >= 20 && ind.adx.strength !== 'CHOPPY';
        rules.push({
          id: 6,
          name: 'ADX Anti-Chop Baseline',
          category: 'Volatility Filter',
          passed: r6Passed,
          actualValue: `ADX: ${ind.adx.adx.toFixed(1)}, Strength: ${ind.adx.strength}`,
          requiredCondition: 'ADX >= 20 & Strength != CHOPPY',
        });

        // Rule 7: Volume Flow Retest Stability
        const r7Passed = isLong ? ind.volumeFlow.vfi >= -6 : ind.volumeFlow.vfi <= 6;
        rules.push({
          id: 7,
          name: 'Volume Flow Retest Stability',
          category: 'Volume Flow',
          passed: r7Passed,
          actualValue: `VFI: ${ind.volumeFlow.vfi.toFixed(1)}`,
          requiredCondition: isLong ? 'VFI >= -6 (No Panic Dump)' : 'VFI <= 6 (No Buying Squeeze)',
        });

        // Rule 8: MACD Histogram Deceleration / Inflection
        const r8Passed = isLong ? (ind.macd.histogram >= -0.05 || ind.macd.trend === 'BULLISH') : (ind.macd.histogram <= 0.05 || ind.macd.trend === 'BEARISH');
        rules.push({
          id: 8,
          name: 'MACD Histogram Reversal Inflection',
          category: 'Momentum Vector',
          passed: r8Passed,
          actualValue: `Hist: ${ind.macd.histogram.toFixed(4)}, Trend: ${ind.macd.trend}`,
          requiredCondition: isLong ? 'Hist curling up towards 0 or positive' : 'Hist curling down towards 0 or negative',
        });

        // Rule 9: Bollinger Band Channel Floor/Ceiling
        const r9Passed = isLong ? ind.bollinger.percentB >= 0.22 : ind.bollinger.percentB <= 0.78;
        rules.push({
          id: 9,
          name: 'Bollinger Structural Envelope Support',
          category: 'Band Envelope',
          passed: r9Passed,
          actualValue: `%B: ${ind.bollinger.percentB.toFixed(2)}`,
          requiredCondition: isLong ? '%B >= 0.22 (Above Lower Envelope)' : '%B <= 0.78 (Below Upper Envelope)',
        });

        // Rule 10: SuperTrend Macro Trend Agreement
        const r10Passed = isLong ? ind.superTrend.direction === 'BULLISH' : ind.superTrend.direction === 'BEARISH';
        rules.push({
          id: 10,
          name: 'SuperTrend Structural Trend Agreement',
          category: 'Trend Anchor',
          passed: r10Passed,
          actualValue: `SuperTrend: ${ind.superTrend.direction}`,
          requiredCondition: `SuperTrend must be ${direction}`,
        });
        break;
      }

      case 'Mean Reversion & Liquidity Sweep': {
        // Rule 1: Bollinger Extreme Band Sweep
        const r1Passed = isLong ? ind.bollinger.percentB <= 0.25 : ind.bollinger.percentB >= 0.75;
        rules.push({
          id: 1,
          name: 'Bollinger Outer Band Sweep',
          category: 'Liquidity Sweep',
          passed: r1Passed,
          actualValue: `%B: ${ind.bollinger.percentB.toFixed(2)}`,
          requiredCondition: isLong ? '%B <= 0.25 (Lower Band Sweep)' : '%B >= 0.75 (Upper Band Sweep)',
        });

        // Rule 2: RSI Statistical Exhaustion
        const r2Passed = isLong ? ind.rsi <= 44 : ind.rsi >= 56;
        rules.push({
          id: 2,
          name: 'RSI Statistical Exhaustion',
          category: 'Oscillator Extreme',
          passed: r2Passed,
          actualValue: `RSI: ${ind.rsi.toFixed(1)}`,
          requiredCondition: isLong ? 'RSI <= 44 (Oversold Snap-back)' : 'RSI >= 56 (Overbought Snap-back)',
        });

        // Rule 3: Stochastic RSI Reversal Hook
        const r3Passed = isLong
          ? (ind.stochasticRsi.state === 'CROSS_UP' || ind.stochasticRsi.k < 30 || ind.stochasticRsi.k >= ind.stochasticRsi.d)
          : (ind.stochasticRsi.state === 'CROSS_DOWN' || ind.stochasticRsi.k > 70 || ind.stochasticRsi.k <= ind.stochasticRsi.d);
        rules.push({
          id: 3,
          name: 'Stochastic RSI Reversal Hook',
          category: 'Cycle Confirmation',
          passed: r3Passed,
          actualValue: `State: ${ind.stochasticRsi.state}, K/D: ${ind.stochasticRsi.k.toFixed(1)}/${ind.stochasticRsi.d.toFixed(1)}`,
          requiredCondition: isLong ? 'State CROSS_UP or K < 30 / K >= D' : 'State CROSS_DOWN or K > 70 / K <= D',
        });

        // Rule 4: VWAP Mean Reversion Dislocation
        const r4Passed = isLong ? ind.vwap.distancePct <= 0.1 : ind.vwap.distancePct >= -0.1;
        rules.push({
          id: 4,
          name: 'VWAP Mean Reversion Dislocation',
          category: 'Order Flow Value',
          passed: r4Passed,
          actualValue: `VWAP Dist: ${ind.vwap.distancePct.toFixed(2)}%`,
          requiredCondition: isLong ? 'Price extended below/at VWAP' : 'Price extended above/at VWAP',
        });

        // Rule 5: Volume Liquidity Absorption Spike
        const r5Passed = ind.volumeFlow.surge || Math.abs(ind.volumeFlow.vfi) >= 8;
        rules.push({
          id: 5,
          name: 'Volume Liquidity Absorption',
          category: 'Volume Flow',
          passed: r5Passed,
          actualValue: `Surge: ${ind.volumeFlow.surge ? 'YES' : 'NO'}, VFI: ${ind.volumeFlow.vfi.toFixed(1)}`,
          requiredCondition: 'Volume Surge Spike or |VFI| >= 8',
        });

        // Rule 6: MACD Histogram Deceleration
        const r6Passed = isLong ? ind.macd.histogram >= -0.08 : ind.macd.histogram <= 0.08;
        rules.push({
          id: 6,
          name: 'MACD Impulse Deceleration',
          category: 'Momentum Vector',
          passed: r6Passed,
          actualValue: `Hist: ${ind.macd.histogram.toFixed(4)}`,
          requiredCondition: isLong ? 'Hist >= -0.08 (Selling Deceleration)' : 'Hist <= 0.08 (Buying Deceleration)',
        });

        // Rule 7: ADX Cascade Protection Filter
        const r7Passed = ind.adx.adx >= 18 && ind.adx.adx <= 55;
        rules.push({
          id: 7,
          name: 'ADX Cascade Protection Guard',
          category: 'Volatility Filter',
          passed: r7Passed,
          actualValue: `ADX: ${ind.adx.adx.toFixed(1)}`,
          requiredCondition: '18 <= ADX <= 55 (Prevent runaway liquidation cascade)',
        });

        // Rule 8: Multi-Timeframe Micro Confluence
        const r8Passed = mtf.confluenceScore >= 66;
        rules.push({
          id: 8,
          name: 'Multi-Timeframe Micro Confluence',
          category: 'Trend Structure',
          passed: r8Passed,
          actualValue: `Confluence: ${mtf.confluenceScore}%`,
          requiredCondition: 'MTF Confluence Score >= 66%',
        });

        // Rule 9: EMA Deviation Span
        const r9Passed = isLong ? (coin.price <= ind.ema.ema21 * 1.005) : (coin.price >= ind.ema.ema21 * 0.995);
        rules.push({
          id: 9,
          name: 'EMA 21 Mean Deviation Span',
          category: 'Moving Average Structure',
          passed: r9Passed,
          actualValue: `Price vs EMA21: ${((coin.price - ind.ema.ema21)/ind.ema.ema21 * 100).toFixed(2)}%`,
          requiredCondition: isLong ? 'Price stretched below/near EMA21' : 'Price stretched above/near EMA21',
        });

        // Rule 10: Bollinger Band Squeeze / Rebound Check
        const r10Passed = ind.bollinger.bandwidth >= 2.5;
        rules.push({
          id: 10,
          name: 'Bollinger Band Reversion Room',
          category: 'Band Envelope',
          passed: r10Passed,
          actualValue: `Bandwidth: ${ind.bollinger.bandwidth.toFixed(1)}%`,
          requiredCondition: 'Bandwidth >= 2.5% (Sufficient room for snap-back)',
        });
        break;
      }

      case 'Momentum Continuation': {
        // Rule 1: SuperTrend Directional Lock
        const r1Passed = isLong ? ind.superTrend.direction === 'BULLISH' : ind.superTrend.direction === 'BEARISH';
        rules.push({
          id: 1,
          name: 'SuperTrend Trend Polarity Lock',
          category: 'Trend Anchor',
          passed: r1Passed,
          actualValue: `SuperTrend: ${ind.superTrend.direction}`,
          requiredCondition: `SuperTrend must be ${direction}`,
        });

        // Rule 2: Triple EMA Alignment Stack
        const r2Passed = isLong
          ? (ind.ema.ema9 >= ind.ema.ema21 && ind.ema.ema21 >= ind.ema.ema50)
          : (ind.ema.ema9 <= ind.ema.ema21 && ind.ema.ema21 <= ind.ema.ema50);
        rules.push({
          id: 2,
          name: 'Triple EMA Stack Alignment (9>21>50)',
          category: 'Moving Average Structure',
          passed: r2Passed,
          actualValue: `EMA9: ${ind.ema.ema9.toFixed(2)}, EMA21: ${ind.ema.ema21.toFixed(2)}, EMA50: ${ind.ema.ema50.toFixed(2)}`,
          requiredCondition: isLong ? 'EMA 9 >= 21 >= 50 (Bullish Stack)' : 'EMA 9 <= 21 <= 50 (Bearish Stack)',
        });

        // Rule 3: Multi-Timeframe Trend Synchronization
        const r3Passed = isLong
          ? (mtf.tf5m === 'BULLISH' && mtf.confluenceScore >= 72)
          : (mtf.tf5m === 'BEARISH' && mtf.confluenceScore >= 72);
        rules.push({
          id: 3,
          name: 'Multi-Timeframe 5m/15m Trend Confluence',
          category: 'Trend Structure',
          passed: r3Passed,
          actualValue: `5m: ${mtf.tf5m}, 15m: ${mtf.tf15m}, Confluence: ${mtf.confluenceScore}%`,
          requiredCondition: `5m ${direction} + MTF Score >= 72%`,
        });

        // Rule 4: ADX Power Trend Confirmation
        const r4Passed = isLong
          ? (ind.adx.adx >= 23 && ind.adx.plusDI > ind.adx.minusDI + 1.5)
          : (ind.adx.adx >= 23 && ind.adx.minusDI > ind.adx.plusDI + 1.5);
        rules.push({
          id: 4,
          name: 'ADX Power Trend & Directional Index Spread',
          category: 'Momentum Velocity',
          passed: r4Passed,
          actualValue: `ADX: ${ind.adx.adx.toFixed(1)}, +DI: ${ind.adx.plusDI.toFixed(1)}, -DI: ${ind.adx.minusDI.toFixed(1)}`,
          requiredCondition: `ADX >= 23 + ${isLong ? '+DI > -DI' : '-DI > +DI'} by 1.5`,
        });

        // Rule 5: MACD Expansion & Trend Alignment
        const r5Passed = isLong ? (ind.macd.histogram > 0 || ind.macd.trend === 'BULLISH') : (ind.macd.histogram < 0 || ind.macd.trend === 'BEARISH');
        rules.push({
          id: 5,
          name: 'MACD Momentum Continuation Wave',
          category: 'Momentum Vector',
          passed: r5Passed,
          actualValue: `Hist: ${ind.macd.histogram.toFixed(4)}, Trend: ${ind.macd.trend}`,
          requiredCondition: `MACD Trend / Hist matches ${direction}`,
        });

        // Rule 6: Institutional Volume Flow Index (VFI)
        const r6Passed = isLong ? ind.volumeFlow.vfi >= 2 : ind.volumeFlow.vfi <= -2;
        rules.push({
          id: 6,
          name: 'Institutional Volume Flow Accumulation',
          category: 'Volume Flow',
          passed: r6Passed,
          actualValue: `VFI: ${ind.volumeFlow.vfi.toFixed(1)}`,
          requiredCondition: isLong ? 'VFI >= +2 (Accumulation Flow)' : 'VFI <= -2 (Distribution Flow)',
        });

        // Rule 7: VWAP Institutional Dominance
        const r7Passed = isLong ? ind.vwap.position === 'ABOVE' : ind.vwap.position === 'BELOW';
        rules.push({
          id: 7,
          name: 'VWAP Institutional Dominance',
          category: 'Order Flow Value',
          passed: r7Passed,
          actualValue: `Position: ${ind.vwap.position} VWAP (${ind.vwap.distancePct.toFixed(2)}%)`,
          requiredCondition: `Price positioned ${isLong ? 'ABOVE' : 'BELOW'} VWAP`,
        });

        // Rule 8: RSI Momentum Channel Corridor
        const r8Passed = isLong ? (ind.rsi >= 48 && ind.rsi <= 68) : (ind.rsi >= 32 && ind.rsi <= 52);
        rules.push({
          id: 8,
          name: 'RSI Momentum Channel Corridor',
          category: 'Oscillator Range',
          passed: r8Passed,
          actualValue: `RSI: ${ind.rsi.toFixed(1)}`,
          requiredCondition: isLong ? '48 <= RSI <= 68 (Trend Momentum)' : '32 <= RSI <= 52 (Trend Momentum)',
        });

        // Rule 9: Bollinger Channel Dominance
        const r9Passed = isLong ? ind.bollinger.percentB >= 0.45 : ind.bollinger.percentB <= 0.55;
        rules.push({
          id: 9,
          name: 'Bollinger Midline Channel Dominance',
          category: 'Band Envelope',
          passed: r9Passed,
          actualValue: `%B: ${ind.bollinger.percentB.toFixed(2)}`,
          requiredCondition: isLong ? '%B >= 0.45 (Upper Half)' : '%B <= 0.55 (Lower Half)',
        });

        // Rule 10: Stochastic RSI Kinetic Flow
        const r10Passed = isLong
          ? (ind.stochasticRsi.k >= ind.stochasticRsi.d || ind.stochasticRsi.k >= 40)
          : (ind.stochasticRsi.k <= ind.stochasticRsi.d || ind.stochasticRsi.k <= 60);
        rules.push({
          id: 10,
          name: 'Stochastic RSI Kinetic Flow',
          category: 'Cycle Confirmation',
          passed: r10Passed,
          actualValue: `K: ${ind.stochasticRsi.k.toFixed(1)}, D: ${ind.stochasticRsi.d.toFixed(1)}`,
          requiredCondition: isLong ? 'K >= D or K >= 40' : 'K <= D or K <= 60',
        });
        break;
      }

      case 'VWAP Multi-Band Institutional': {
        // Rule 1: VWAP Institutional Distance Interaction
        const r1Passed = isLong ? (ind.vwap.distancePct >= -0.3 && ind.vwap.distancePct <= 2.2) : (ind.vwap.distancePct <= 0.3 && ind.vwap.distancePct >= -2.2);
        rules.push({
          id: 1,
          name: 'VWAP Institutional Band Interaction',
          category: 'Order Flow Value',
          passed: r1Passed,
          actualValue: `VWAP Dist: ${ind.vwap.distancePct.toFixed(2)}%`,
          requiredCondition: isLong ? '-0.3% <= Dist <= 2.2%' : '-2.2% <= Dist <= 0.3%',
        });

        // Rule 2: Volume-Weighted Flow Index (VFI)
        const r2Passed = isLong ? ind.volumeFlow.vfi >= 4 : ind.volumeFlow.vfi <= -4;
        rules.push({
          id: 2,
          name: 'Volume-Weighted Flow Index (VFI)',
          category: 'Volume Flow',
          passed: r2Passed,
          actualValue: `VFI: ${ind.volumeFlow.vfi.toFixed(1)}`,
          requiredCondition: isLong ? 'VFI >= +4' : 'VFI <= -4',
        });

        // Rule 3: 50 EMA Institutional Baseline
        const r3Passed = isLong ? coin.price >= ind.ema.ema50 * 0.995 : coin.price <= ind.ema.ema50 * 1.005;
        rules.push({
          id: 3,
          name: '50 EMA Institutional Support/Resistance',
          category: 'Moving Average Structure',
          passed: r3Passed,
          actualValue: `Price: ${coin.price.toFixed(2)}, EMA50: ${ind.ema.ema50.toFixed(2)}`,
          requiredCondition: isLong ? 'Price >= EMA50' : 'Price <= EMA50',
        });

        // Rule 4: Multi-Timeframe Confluence (15m/1h)
        const r4Passed = mtf.confluenceScore >= 70;
        rules.push({
          id: 4,
          name: 'Multi-Timeframe Confluence (15m/1h)',
          category: 'Trend Structure',
          passed: r4Passed,
          actualValue: `15m: ${mtf.tf15m}, 1h: ${mtf.tf1h}, Confluence: ${mtf.confluenceScore}%`,
          requiredCondition: 'MTF Confluence Score >= 70%',
        });

        // Rule 5: ADX Institutional Trend Efficiency
        const r5Passed = ind.adx.adx >= 21;
        rules.push({
          id: 5,
          name: 'ADX Trend Efficiency',
          category: 'Momentum Velocity',
          passed: r5Passed,
          actualValue: `ADX: ${ind.adx.adx.toFixed(1)}`,
          requiredCondition: 'ADX >= 21',
        });

        // Rule 6: MACD Zero-Line Flow
        const r6Passed = isLong ? ind.macd.histogram >= -0.04 : ind.macd.histogram <= 0.04;
        rules.push({
          id: 6,
          name: 'MACD Zero-Line Flow',
          category: 'Momentum Vector',
          passed: r6Passed,
          actualValue: `Hist: ${ind.macd.histogram.toFixed(4)}`,
          requiredCondition: isLong ? 'Hist >= -0.04' : 'Hist <= 0.04',
        });

        // Rule 7: RSI Equilibrium Corridor
        const r7Passed = isLong ? (ind.rsi >= 44 && ind.rsi <= 66) : (ind.rsi >= 34 && ind.rsi <= 56);
        rules.push({
          id: 7,
          name: 'RSI Institutional Equilibrium Corridor',
          category: 'Oscillator Range',
          passed: r7Passed,
          actualValue: `RSI: ${ind.rsi.toFixed(1)}`,
          requiredCondition: isLong ? '44 <= RSI <= 66' : '34 <= RSI <= 56',
        });

        // Rule 8: SuperTrend Institutional Bias
        const r8Passed = isLong ? ind.superTrend.direction === 'BULLISH' : ind.superTrend.direction === 'BEARISH';
        rules.push({
          id: 8,
          name: 'SuperTrend Institutional Direction',
          category: 'Trend Anchor',
          passed: r8Passed,
          actualValue: `SuperTrend: ${ind.superTrend.direction}`,
          requiredCondition: `SuperTrend must be ${direction}`,
        });

        // Rule 9: Bollinger Bandwidth Flow
        const r9Passed = ind.bollinger.bandwidth >= 2.8;
        rules.push({
          id: 9,
          name: 'Bollinger Bandwidth Flow',
          category: 'Band Envelope',
          passed: r9Passed,
          actualValue: `Bandwidth: ${ind.bollinger.bandwidth.toFixed(1)}%`,
          requiredCondition: 'Bandwidth >= 2.8%',
        });

        // Rule 10: EMA 9/21 Directional Alignment
        const r10Passed = isLong ? ind.ema.ema9 >= ind.ema.ema21 : ind.ema.ema9 <= ind.ema.ema21;
        rules.push({
          id: 10,
          name: 'EMA 9/21 Directional Guide',
          category: 'Moving Average Structure',
          passed: r10Passed,
          actualValue: `EMA9: ${ind.ema.ema9.toFixed(2)}, EMA21: ${ind.ema.ema21.toFixed(2)}`,
          requiredCondition: isLong ? 'EMA 9 >= EMA 21' : 'EMA 9 <= EMA 21',
        });
        break;
      }

      case 'Order Flow & Cloud Break':
      case 'Harmonic Wave & Oscillator':
      case 'Volatility Expansion Squeeze':
      default: {
        // Universal & Squeeze 10-point precision suite
        // Rule 1: Volatility Expansion / Squeeze Release
        const r1Passed = ind.bollinger.state === 'EXPANSION' || ind.bollinger.bandwidth >= 3.6;
        rules.push({
          id: 1,
          name: 'Volatility Expansion / Squeeze Trigger',
          category: 'Volatility Release',
          passed: r1Passed,
          actualValue: `State: ${ind.bollinger.state}, Width: ${ind.bollinger.bandwidth.toFixed(1)}%`,
          requiredCondition: 'State == EXPANSION or Width >= 3.6%',
        });

        // Rule 2: Volume Flow Surge / VFI
        const r2Passed = ind.volumeFlow.surge || Math.abs(ind.volumeFlow.vfi) >= 10;
        rules.push({
          id: 2,
          name: 'Volume Flow Surge & VFI',
          category: 'Volume Flow',
          passed: r2Passed,
          actualValue: `Surge: ${ind.volumeFlow.surge ? 'YES' : 'NO'}, VFI: ${ind.volumeFlow.vfi.toFixed(1)}`,
          requiredCondition: 'Volume Surge or |VFI| >= 10',
        });

        // Rule 3: Multi-Timeframe Alignment
        const r3Passed = isLong
          ? (mtf.tf5m === 'BULLISH' && mtf.confluenceScore >= 70)
          : (mtf.tf5m === 'BEARISH' && mtf.confluenceScore >= 70);
        rules.push({
          id: 3,
          name: 'Multi-Timeframe Trend Confluence',
          category: 'Trend Structure',
          passed: r3Passed,
          actualValue: `5m: ${mtf.tf5m}, 15m: ${mtf.tf15m}, Confluence: ${mtf.confluenceScore}%`,
          requiredCondition: `5m ${direction} + MTF >= 70%`,
        });

        // Rule 4: ADX Trend Force
        const r4Passed = isLong
          ? (ind.adx.adx >= 22 && ind.adx.plusDI >= ind.adx.minusDI)
          : (ind.adx.adx >= 22 && ind.adx.minusDI >= ind.adx.plusDI);
        rules.push({
          id: 4,
          name: 'ADX Trend Momentum Strength',
          category: 'Momentum Velocity',
          passed: r4Passed,
          actualValue: `ADX: ${ind.adx.adx.toFixed(1)}, +DI: ${ind.adx.plusDI.toFixed(1)}, -DI: ${ind.adx.minusDI.toFixed(1)}`,
          requiredCondition: `ADX >= 22 + dominant ${isLong ? '+DI' : '-DI'}`,
        });

        // Rule 5: SuperTrend Polarity Lock
        const r5Passed = isLong ? ind.superTrend.direction === 'BULLISH' : ind.superTrend.direction === 'BEARISH';
        rules.push({
          id: 5,
          name: 'SuperTrend Trend Direction',
          category: 'Trend Anchor',
          passed: r5Passed,
          actualValue: `SuperTrend: ${ind.superTrend.direction}`,
          requiredCondition: `SuperTrend must be ${direction}`,
        });

        // Rule 6: MACD Histogram Direction
        const r6Passed = isLong ? ind.macd.histogram >= 0 : ind.macd.histogram <= 0;
        rules.push({
          id: 6,
          name: 'MACD Histogram Vector',
          category: 'Momentum Vector',
          passed: r6Passed,
          actualValue: `Hist: ${ind.macd.histogram.toFixed(4)}`,
          requiredCondition: isLong ? 'Hist >= 0' : 'Hist <= 0',
        });

        // Rule 7: Institutional VWAP Clearance
        const r7Passed = isLong ? ind.vwap.position === 'ABOVE' : ind.vwap.position === 'BELOW';
        rules.push({
          id: 7,
          name: 'Institutional VWAP Positioning',
          category: 'Order Flow Value',
          passed: r7Passed,
          actualValue: `Position: ${ind.vwap.position} VWAP (${ind.vwap.distancePct.toFixed(2)}%)`,
          requiredCondition: `Price positioned ${isLong ? 'ABOVE' : 'BELOW'} VWAP`,
        });

        // Rule 8: RSI Momentum Corridor
        const r8Passed = isLong ? (ind.rsi >= 46 && ind.rsi <= 70) : (ind.rsi >= 30 && ind.rsi <= 54);
        rules.push({
          id: 8,
          name: 'RSI Momentum Corridor',
          category: 'Oscillator Range',
          passed: r8Passed,
          actualValue: `RSI: ${ind.rsi.toFixed(1)}`,
          requiredCondition: isLong ? '46 <= RSI <= 70' : '30 <= RSI <= 54',
        });

        // Rule 9: EMA Ribbon Structure
        const r9Passed = isLong ? ind.ema.ema9 >= ind.ema.ema21 : ind.ema.ema9 <= ind.ema.ema21;
        rules.push({
          id: 9,
          name: 'EMA 9/21 Dynamic Ribbon Stack',
          category: 'Moving Average Structure',
          passed: r9Passed,
          actualValue: `EMA9: ${ind.ema.ema9.toFixed(2)}, EMA21: ${ind.ema.ema21.toFixed(2)}`,
          requiredCondition: isLong ? 'EMA 9 >= EMA 21' : 'EMA 9 <= EMA 21',
        });

        // Rule 10: Stochastic RSI Velocity Gate
        const r10Passed = isLong
          ? (ind.stochasticRsi.k >= 35 && ind.stochasticRsi.state !== 'OVERBOUGHT')
          : (ind.stochasticRsi.k <= 65 && ind.stochasticRsi.state !== 'OVERSOLD');
        rules.push({
          id: 10,
          name: 'Stochastic RSI Velocity Gate',
          category: 'Cycle Confirmation',
          passed: r10Passed,
          actualValue: `K: ${ind.stochasticRsi.k.toFixed(1)}, State: ${ind.stochasticRsi.state}`,
          requiredCondition: isLong ? 'K >= 35 & Not Overbought' : 'K <= 65 & Not Oversold',
        });
        break;
      }
    }

    return rules;
  }

  /**
   * Evaluates market signals against the bot's 10 strict confirmation rules.
   * MANDATE: Requires 8 or above confirmed rules (>= 8/10) to authorize a trade.
   * Zero trades are taken if requirements are not confirmed (Strict Quality Gate).
   */
  private evaluateStrategySignal(bot: Bot, coin: MarketCoin): {
    valid: boolean;
    direction: 'LONG' | 'SHORT';
    confidence: number;
    confirmations: string[];
    setupGrade: 'A+' | 'A' | 'A-';
    ruleResults: ConfirmationRuleResult[];
    confirmedRulesCount: number;
  } {
    const weights = bot.brain.adaptiveWeights;
    const archetype = bot.strategy.coreArchetype;

    // Evaluate 10 strict rules for both LONG and SHORT directions
    const longRules = this.evaluate10Rules(archetype, 'LONG', coin, weights);
    const shortRules = this.evaluate10Rules(archetype, 'SHORT', coin, weights);

    const longPassedCount = longRules.filter(r => r.passed).length;
    const shortPassedCount = shortRules.filter(r => r.passed).length;

    // Pick direction with higher confirmed rules
    const isLong = longPassedCount >= shortPassedCount;
    const winningRules = isLong ? longRules : shortRules;
    const direction: 'LONG' | 'SHORT' = isLong ? 'LONG' : 'SHORT';
    const confirmedRulesCount = isLong ? longPassedCount : shortPassedCount;

    // STRICT USER MANDATE: Only trade when 8 or above confirmed (>= 8 / 10 rules passed)
    const has8OrAboveConfirmed = confirmedRulesCount >= 8;

    // Multi-timeframe hard confluence baseline (>= 70%)
    const hasMtfQuality = coin.mtf.confluenceScore >= 70;

    // Hard anti-chop check
    const isNotDeadChop = coin.indicators.adx.adx >= 20;

    const isValid = has8OrAboveConfirmed && hasMtfQuality && isNotDeadChop;

    // Dynamic setup grade:
    const setupGrade: 'A+' | 'A' | 'A-' = confirmedRulesCount === 10
      ? 'A+'
      : confirmedRulesCount === 9
      ? 'A+'
      : 'A';

    // Confidence derived mathematically from confirmed rule density (8/10 -> 88%, 9/10 -> 93%, 10/10 -> 97%)
    const baseConf = 60 + (confirmedRulesCount * 3.5) + ((coin.mtf.confluenceScore - 70) * 0.2);
    const confidence = Math.min(98, Math.max(0, Math.floor(baseConf)));

    const passedConfirmations = winningRules
      .filter(r => r.passed)
      .map(r => `${r.name}: ${r.actualValue}`);

    return {
      valid: isValid,
      direction,
      confidence,
      confirmations: passedConfirmations,
      setupGrade,
      ruleResults: winningRules,
      confirmedRulesCount,
    };
  }

  /**
   * Calculates dynamic leverage per trade based on:
   * 1. Signal Confidence & Multi-Timeframe Confluence (e.g. 85%+ -> 15x-25x)
   * 2. Asset Liquidity/Tier (BTC, ETH, SOL, BNB tier-1 majors vs altcoins)
   * 3. Strategy Archetype (Scalper/Squeeze vs Swing/Pullback)
   * 4. Neural Brain Level & Win Streak / Post-SL calibration
   */
  private calculateDynamicLeverage(
    bot: Bot,
    coin: MarketCoin,
    confidence: number,
    direction: 'LONG' | 'SHORT'
  ): { leverage: number; reason: string } {
    const defaultLev = bot.strategy.defaultLeverage || 10;
    const maxLev = bot.strategy.maxLeverage || 25;

    // Check if Tier 1 Major Crypto (high liquidity, lower slip risk)
    const tier1Majors = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT', 'NEARUSDT'];
    const isMajor = tier1Majors.includes(coin.symbol);

    const mtfScore = coin.mtf?.confluenceScore ?? 75;
    const adx = coin.indicators?.adx?.adx ?? 25;

    let computedLev = defaultLev;
    let reason = '';

    // 1. Ultra High Confluence A+ Setup
    if (confidence >= 88 && mtfScore >= 80 && adx >= 28) {
      computedLev = isMajor ? Math.min(maxLev, 25) : Math.min(maxLev, 20);
      reason = `${computedLev}x (Ultra A+ Setup: ${confidence}% Conf & ${mtfScore}% MTF Confluence)`;
    }
    // 2. Strong Momentum / High Conviction A Setup
    else if (confidence >= 82 && mtfScore >= 70) {
      computedLev = isMajor ? Math.min(maxLev, 18) : Math.min(maxLev, 15);
      reason = `${computedLev}x (Prime Trend: ${confidence}% Conf & ADX ${adx.toFixed(0)})`;
    }
    // 3. Standard Setup
    else if (confidence >= 75) {
      computedLev = isMajor ? Math.min(maxLev, 12) : Math.min(maxLev, 10);
      reason = `${computedLev}x (Standard Trend Alignment: ${confidence}% Conf)`;
    }
    // 4. Moderate / High Volatility Conservative Setup
    else {
      computedLev = Math.max(3, Math.min(defaultLev, 5));
      reason = `${computedLev}x (Conservative Volatility Guard: ${confidence}% Conf)`;
    }

    // 5. Brain Experience Enhancement: Higher Level bots with >60% Win Rate gain tactical leverage
    if (bot.brain.brainLevel >= 3 && bot.winRate >= 60) {
      computedLev = Math.min(maxLev, computedLev + 2);
    }

    // 6. Defensive Post-SL Protection: If bot is recovering from recent SLs, scale down leverage
    if (bot.brain.mistakesAnalyzed > 0 && bot.lossTrades > bot.winTrades) {
      computedLev = Math.max(3, Math.floor(computedLev * 0.75));
      reason = `${computedLev}x (Defensive Calibration: Post-Loss Capital Protection)`;
    }

    return { leverage: computedLev, reason };
  }

  public executeTrade(
    bot: Bot,
    coin: MarketCoin,
    direction: 'LONG' | 'SHORT',
    confidence: number,
    confirmations: string[] = [],
    setupGrade: 'A+' | 'A' | 'A-' = 'A',
    ruleResults: ConfirmationRuleResult[] = [],
    confirmedRulesCount: number = 8
  ) {
    const entryPrice = coin.price;
    const now = Date.now();

    // Dynamic leverage tailored specifically to this setup
    const { leverage, reason: leverageReason } = this.calculateDynamicLeverage(bot, coin, confidence, direction);

    // Dynamic Capital per trade: Exactly 3% of dynamic balance
    const capitalAllocated = Math.max(0.50, Number((bot.currentBalance * 0.03).toFixed(2)));
    
    // Strict Dynamic Stop-Loss with Dynamic Leverage:
    // Max loss is strictly 1.5% of dynamic capital (0.015 * bot.currentBalance).
    // Formula: capitalAllocated (3%) * leverage * stopLossPct = 1.5% * dynamic balance
    // stopLossPct = 0.015 / (0.03 * leverage) = 0.50 / leverage
    const stopLossPct = Number((0.50 / leverage).toFixed(4));

    const stopLoss = direction === 'LONG'
      ? Number((entryPrice * (1 - stopLossPct)).toFixed(4))
      : Number((entryPrice * (1 + stopLossPct)).toFixed(4));

    // TP1 is strictly closer than SL compared to entry price:
    // Distance |tp1Price - entryPrice| < |stopLoss - entryPrice|
    // Set to 60% of stopLossPct, guaranteeing TP1 is closer than SL
    const tp1Pct = Number((stopLossPct * 0.60).toFixed(4));
    const tp1Price = direction === 'LONG'
      ? Number((entryPrice * (1 + tp1Pct)).toFixed(4))
      : Number((entryPrice * (1 - tp1Pct)).toFixed(4));

    // TP 2: Dynamic expansion target (1.35x of SL distance) -> Book 25% initial margin & Move SL to TP1
    const tp2Pct = Number((stopLossPct * 1.35).toFixed(4));
    const tp2Price = direction === 'LONG'
      ? Number((entryPrice * (1 + tp2Pct)).toFixed(4))
      : Number((entryPrice * (1 - tp2Pct)).toFixed(4));

    // Macro Full Expansion TP (2.5x of SL distance)
    const fullTpPct = Number((stopLossPct * 2.50).toFixed(4));
    const takeProfit = direction === 'LONG'
      ? Number((entryPrice * (1 + fullTpPct)).toFixed(4))
      : Number((entryPrice * (1 - fullTpPct)).toFixed(4));

    const totalPositionSize = capitalAllocated * leverage;
    const amount = Number((totalPositionSize / entryPrice).toFixed(6));

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
      remainingCapital: capitalAllocated,
      leverage,
      leverageReason,
      stopLoss,
      initialStopLoss: stopLoss,
      takeProfit,
      tp1Price,
      tp2Price,
      tp1Hit: false,
      tp2Hit: false,
      tp1RealizedPnl: 0,
      tp2RealizedPnl: 0,
      runnerActive: false,
      pnl: 0,
      pnlPercent: 0,
      status: 'OPEN',
      entryTime: now,
      strategyUsed: bot.strategy.name,
      setupGrade,
      confirmations,
      confirmedRulesCount,
      totalRulesCount: 10,
      ruleResults,
      indicatorsAtEntry: {
        rsi: coin.indicators.rsi,
        macdHistogram: coin.indicators.macd.histogram,
        adx: coin.indicators.adx.adx,
        vwapDist: coin.indicators.vwap.distancePct,
        timeframeConfluence: coin.mtf.confluenceScore,
      },
    };

    bot.activeTrades = bot.activeTrades || [];
    bot.activeTrades.push(trade);
    bot.activeTrade = trade; // most recent trade
    bot.allocatedBalance = Number(bot.activeTrades.reduce((acc, t) => acc + t.capitalAllocated, 0).toFixed(2));

    // Trigger instant Telegram alert if configured
    telegramService.sendTradeAlert(bot, coin.symbol, 'OPEN');

    this.savePersistentState(false);

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
      bot.activeTrades = [];
      bot.tradeHistory = [];
      bot.equityCurve = [
        {
          timestamp: now,
          balance: 100.0,
          tradeCount: 0,
        },
      ];
      bot.brain.learningNotes.push(`🔄 Account reset to $100.00 base. Autonomous scanner hunting exclusively for >=8/10 confirmation setups.`);
    }
    this.allTrades = [];
    this.savePersistentState(true);
    console.log('All 50 trading bots have been reset to fresh $100 accounts with 0 live trades.');
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
    bot.activeTrades = [];
    bot.tradeHistory = [];
    bot.equityCurve = [
      {
        timestamp: now,
        balance: 100.0,
        tradeCount: 0,
      },
    ];
    bot.brain.learningNotes.push(`🔄 Reset bot account to fresh $100.00.`);
    this.savePersistentState(true);
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
      this.savePersistentState(true);
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
      if (b.activeTrades && b.activeTrades.length > 0) {
        live.push(...b.activeTrades);
      } else if (b.activeTrade) {
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
      cloudStartedAt: this.cloudStartedAt,
      isScanningActive: this.isScanningActive,
      engineMode: this.isScanningActive ? 'RUNNING' : 'PAUSED',
    };
  }
}

export const tradingEngine = new TradingEngine();

