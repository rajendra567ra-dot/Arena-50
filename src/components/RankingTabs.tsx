import React from 'react';
import { 
  ArrowUpDown, 
  Search, 
  Filter, 
  Trophy, 
  Percent, 
  DollarSign, 
  Activity, 
  BrainCircuit, 
  Grid3X3, 
  List, 
  Radio, 
  BarChart2
} from 'lucide-react';
import { SortField } from '../types';

interface RankingTabsProps {
  currentSort: SortField;
  onSortChange: (sort: SortField) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterActiveOnly: boolean;
  onToggleFilterActive: () => void;
  filterProfitableOnly: boolean;
  onToggleFilterProfitable: () => void;
  activeView: 'GRID' | 'TABLE' | 'ALL_TRADES' | 'MARKET';
  onViewChange: (view: 'GRID' | 'TABLE' | 'ALL_TRADES' | 'MARKET') => void;
  botCount: number;
}

export const RankingTabs: React.FC<RankingTabsProps> = ({
  currentSort,
  onSortChange,
  searchQuery,
  onSearchChange,
  filterActiveOnly,
  onToggleFilterActive,
  filterProfitableOnly,
  onToggleFilterProfitable,
  activeView,
  onViewChange,
  botCount,
}) => {
  return (
    <div className="space-y-3">
      {/* Top View Selector & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Main View Switcher */}
        <div className="flex items-center space-x-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          <button
            onClick={() => onViewChange('GRID')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeView === 'GRID'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            <span>50 Bot Arena</span>
          </button>

          <button
            onClick={() => onViewChange('TABLE')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeView === 'TABLE'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Leaderboard</span>
          </button>

          <button
            onClick={() => onViewChange('ALL_TRADES')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeView === 'ALL_TRADES'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Live Trades Ledger</span>
          </button>

          <button
            onClick={() => onViewChange('MARKET')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeView === 'MARKET'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>CMC Scanner</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search 50 bots or indicators..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

      </div>

      {/* Ranking Buttons & Quick Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-800/80 py-2.5">
        
        {/* Ranking Buttons requested by user */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-slate-400">Rank By:</span>

          {/* Alphabetical Button (Default Fixed Rank 1-50) */}
          <button
            onClick={() => onSortChange('ALPHABETICAL')}
            className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              currentSort === 'ALPHABETICAL'
                ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300 font-semibold'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span>🔤 Alphabetical (Fixed #1-50)</span>
          </button>

          {/* Win Rate Button */}
          <button
            onClick={() => onSortChange('WIN_RATE')}
            className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              currentSort === 'WIN_RATE'
                ? 'border-amber-500 bg-amber-950/60 text-amber-300 font-semibold'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Percent className="h-3 w-3 text-amber-400" />
            <span>Win Rate Button</span>
          </button>

          {/* Portfolio Button */}
          <button
            onClick={() => onSortChange('PORTFOLIO')}
            className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              currentSort === 'PORTFOLIO'
                ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <DollarSign className="h-3 w-3 text-emerald-400" />
            <span>Portfolio Button</span>
          </button>

          {/* Total Trades Button */}
          <button
            onClick={() => onSortChange('TOTAL_TRADES')}
            className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              currentSort === 'TOTAL_TRADES'
                ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300 font-semibold'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Activity className="h-3 w-3 text-indigo-400" />
            <span>Total Trades</span>
          </button>

          {/* Brain Level Button */}
          <button
            onClick={() => onSortChange('BRAIN_LEVEL')}
            className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              currentSort === 'BRAIN_LEVEL'
                ? 'border-purple-500 bg-purple-950/60 text-purple-300 font-semibold'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <BrainCircuit className="h-3 w-3 text-purple-400" />
            <span>AI Brain Level</span>
          </button>
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleFilterActive}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              filterActiveOnly
                ? 'border-cyan-500/70 bg-cyan-950/70 text-cyan-300 font-semibold'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
            }`}
          >
            Live In Trade ({botCount})
          </button>

          <button
            onClick={onToggleFilterProfitable}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              filterProfitableOnly
                ? 'border-emerald-500/70 bg-emerald-950/70 text-emerald-300 font-semibold'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
            }`}
          >
            Profitable (&gt;$100)
          </button>
        </div>

      </div>
    </div>
  );
};
