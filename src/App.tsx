import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bot, MarketCoin, Trade, SortField, TelegramConfig } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { ArenaStatsBanner } from './components/ArenaStatsBanner';
import { RankingTabs } from './components/RankingTabs';
import { BotCard } from './components/BotCard';
import { BotDetailModal } from './components/BotDetailModal';
import { TelegramConfigModal } from './components/TelegramConfigModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { LeaderboardTable } from './components/LeaderboardTable';
import { AllTradesView } from './components/AllTradesView';
import { Cmc500View } from './components/Cmc500View';
import confetti from 'canvas-confetti';

export default function App() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [liveTrades, setLiveTrades] = useState<Trade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | undefined>(undefined);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [cloudStartedAt, setCloudStartedAt] = useState<number | undefined>(undefined);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [marketStatus, setMarketStatus] = useState('LIVE_SYNCING');
  const [isLoading, setIsLoading] = useState(true);

  // Modals & UI States
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sorting & Filtering
  const [currentSort, setCurrentSort] = useState<SortField>('ALPHABETICAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [filterProfitableOnly, setFilterProfitableOnly] = useState(false);
  const [activeView, setActiveView] = useState<'GRID' | 'TABLE' | 'ALL_TRADES' | 'CMC500'>('GRID');

  const previousTradesCount = useRef(0);

  // Play subtle sound effect
  const playSound = (type: 'WIN' | 'TRADE') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'WIN') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(554.37, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      }
    } catch (e) {
      // AudioContext policy fallback
    }
  };

  // Fetch full Arena state
  const fetchArenaState = async () => {
    try {
      const state = await api.getArenaState();
      setBots(state.bots);
      setCoins(state.coins);
      setLiveTrades(state.liveTrades);
      setTelegramConfig(state.telegramConfig);
      setUptimeSeconds(state.uptimeSeconds);
      setCloudStartedAt(state.cloudStartedAt);
      setIsScanningActive(state.isScanningActive !== undefined ? state.isScanningActive : true);
      setMarketStatus(state.marketStatus);

      // Check if new trade happened to play subtle audio
      if (previousTradesCount.current > 0 && state.totalArenaTrades > previousTradesCount.current) {
        playSound('WIN');
      }
      previousTradesCount.current = state.totalArenaTrades;

      // Update selectedBot if currently open
      if (selectedBot) {
        const updated = state.bots.find(b => b.id === selectedBot.id);
        if (updated) setSelectedBot(updated);
      }
    } catch (err) {
      console.error('Error polling arena state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll Arena State every 2 seconds for ultra-fast price synchronization
  useEffect(() => {
    fetchArenaState();
    const interval = setInterval(fetchArenaState, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch full trade history periodically
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const { history } = await api.getTrades();
        setTradeHistory(history);
      } catch (err) {
        console.error('Error fetching trade history:', err);
      }
    };
    fetchTrades();
    const tradeInterval = setInterval(fetchTrades, 4000);
    return () => clearInterval(tradeInterval);
  }, []);

  // Handle Toggle Autonomous Engine Scanning
  const handleToggleEngine = async () => {
    try {
      const res = await api.toggleEngine();
      if (res.success) {
        setIsScanningActive(res.isScanningActive);
        setBots(res.state.bots);
      }
    } catch (err) {
      console.error('Toggle engine error:', err);
    }
  };

  // Handle Reset All 50 Bots
  const handleConfirmResetAll = async () => {
    setIsResetting(true);
    try {
      const res = await api.resetAllBots();
      if (res.success) {
        setBots(res.state.bots);
        setLiveTrades([]);
        setTradeHistory([]);
        setIsResetConfirmOpen(false);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Reset all bots failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Handle Reset Single Bot
  const handleResetSingleBot = async (botId: string) => {
    try {
      const res = await api.resetBot(botId);
      if (res.success && res.bot) {
        setBots(prev => prev.map(b => b.id === botId ? res.bot : b));
        if (selectedBot && selectedBot.id === botId) {
          setSelectedBot(res.bot);
        }
      }
    } catch (err) {
      console.error(`Failed to reset bot ${botId}:`, err);
    }
  };

  // Filter & Sort 50 Bots
  const filteredAndSortedBots = useMemo(() => {
    let result = [...bots];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        b =>
          b.name.toLowerCase().includes(q) ||
          b.serialNumber.toLowerCase().includes(q) ||
          b.strategy.name.toLowerCase().includes(q) ||
          b.strategy.coreArchetype.toLowerCase().includes(q) ||
          b.strategy.requiredIndicators.some(i => i.toLowerCase().includes(q))
      );
    }

    // Toggle active positions
    if (filterActiveOnly) {
      result = result.filter(b => !!b.activeTrade);
    }

    // Toggle profitable only
    if (filterProfitableOnly) {
      result = result.filter(b => b.totalPnl > 0);
    }

    // Sorting Modes
    switch (currentSort) {
      case 'ALPHABETICAL':
        return result.sort((a, b) => a.alphabeticalRank - b.alphabeticalRank);

      case 'WIN_RATE':
        return result.sort((a, b) => {
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return b.totalTrades - a.totalTrades;
        });

      case 'PORTFOLIO':
        return result.sort((a, b) => b.currentBalance - a.currentBalance);

      case 'TOTAL_TRADES':
        return result.sort((a, b) => b.totalTrades - a.totalTrades);

      case 'BRAIN_LEVEL':
        return result.sort((a, b) => b.brain.brainLevel - a.brain.brainLevel);

      default:
        return result;
    }
  }, [bots, searchQuery, filterActiveOnly, filterProfitableOnly, currentSort]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black">
      
      {/* Header Navigation */}
      <Navbar
        onOpenTelegram={() => setIsTelegramModalOpen(true)}
        onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
        telegramConfig={telegramConfig}
        uptimeSeconds={uptimeSeconds}
        cloudStartedAt={cloudStartedAt}
        marketStatus={marketStatus}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        activeView={activeView}
        onViewChange={setActiveView}
        liveTradesCount={liveTrades.length}
        totalCoinsCount={coins.length}
        isScanningActive={isScanningActive}
        onToggleEngine={handleToggleEngine}
      />

      {/* Main Arena Dashboard */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 py-5 sm:py-6 space-y-6">
        
        {/* Arena Statistics HUD (Visible on Home and Leaderboard views) */}
        {(activeView === 'GRID' || activeView === 'TABLE') && (
          <ArenaStatsBanner 
            bots={bots} 
            liveTrades={liveTrades} 
            uptimeSeconds={uptimeSeconds}
            cloudStartedAt={cloudStartedAt}
            onViewLiveTrades={() => setActiveView('ALL_TRADES')}
            onViewCmc500={() => setActiveView('CMC500')}
            totalCoinsCount={coins.length}
            onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
          />
        )}

        {/* Sorting, Search & View Controls (Home / Table view) */}
        {(activeView === 'GRID' || activeView === 'TABLE') && (
          <RankingTabs
            currentSort={currentSort}
            onSortChange={setCurrentSort}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterActiveOnly={filterActiveOnly}
            onToggleFilterActive={() => setFilterActiveOnly(!filterActiveOnly)}
            filterProfitableOnly={filterProfitableOnly}
            onToggleFilterProfitable={() => setFilterProfitableOnly(!filterProfitableOnly)}
            activeView={activeView}
            onViewChange={setActiveView}
            botCount={liveTrades.length}
          />
        )}

        {/* Content View Switching */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center space-y-3 text-cyan-400">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <span className="text-xs font-mono">Syncing 50 Trading Bots &amp; CMC Market Feeds...</span>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: 50 BOTS ARENA GRID */}
            {activeView === 'GRID' && (
              <div>
                {filteredAndSortedBots.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-300">No bots match your current search or filter criteria.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterActiveOnly(false);
                        setFilterProfitableOnly(false);
                      }}
                      className="mt-3 text-xs font-bold text-cyan-400 hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredAndSortedBots.map((bot) => (
                      <BotCard
                        key={bot.id}
                        bot={bot}
                        onSelect={setSelectedBot}
                        onReset={handleResetSingleBot}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: COMPACT LEADERBOARD TABLE */}
            {activeView === 'TABLE' && (
              <LeaderboardTable
                bots={filteredAndSortedBots}
                onSelectBot={setSelectedBot}
                onResetBot={handleResetSingleBot}
              />
            )}

            {/* VIEW 3: ALL LIVE & HISTORICAL TRADES LEDGER */}
            {activeView === 'ALL_TRADES' && (
              <AllTradesView
                liveTrades={liveTrades}
                tradeHistory={tradeHistory}
                onReturnHome={() => setActiveView('GRID')}
                onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
                onSelectBot={(botId) => {
                  const found = bots.find(b => b.id === botId);
                  if (found) setSelectedBot(found);
                }}
              />
            )}

            {/* VIEW 4: DEDICATED CMC 500 MARKET SCANNER MATRIX */}
            {activeView === 'CMC500' && (
              <Cmc500View 
                coins={coins} 
                bots={bots} 
                liveTrades={liveTrades}
                onReturnHome={() => setActiveView('GRID')}
                onViewLiveTrades={() => setActiveView('ALL_TRADES')}
                onSelectBot={(bot) => setSelectedBot(bot)}
              />
            )}
          </>
        )}

      </main>

      {/* Modals */}
      {selectedBot && (
        <BotDetailModal
          bot={selectedBot}
          onClose={() => setSelectedBot(null)}
          onBotUpdated={(updated) => {
            setBots(prev => prev.map(b => b.id === updated.id ? updated : b));
            setSelectedBot(updated);
          }}
          onResetBot={handleResetSingleBot}
        />
      )}

      {isTelegramModalOpen && (
        <TelegramConfigModal
          config={telegramConfig}
          onClose={() => setIsTelegramModalOpen(false)}
          onConfigSaved={(cfg) => {
            setTelegramConfig(cfg);
            setIsTelegramModalOpen(false);
          }}
        />
      )}

      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirmReset={handleConfirmResetAll}
        isResetting={isResetting}
      />

    </div>
  );
}

