import React from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
  isResetting: boolean;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  isResetting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-red-900/60 bg-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center space-x-3 text-rose-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-['Outfit']">Reset All 50 Bots</h3>
            <p className="text-xs text-slate-400">Start from fresh $100.00 accounts</p>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            Are you sure you want to reset all <strong>50 trading bots</strong>?
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
            <li>All 50 bot portfolio balances will reset to <strong className="text-white">$100.00</strong>.</li>
            <li>All active positions will be closed.</li>
            <li>Win/loss statistics and trade counts will be reset to 0.</li>
            <li><strong className="text-cyan-300">Note:</strong> AI Brain neural memory and learned lessons will remain preserved!</li>
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={isResetting}
            className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={onConfirmReset}
            disabled={isResetting}
            className="flex items-center space-x-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-lg shadow-rose-950/50 disabled:opacity-50 transition-all"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting 50 Bots...' : 'Confirm Reset ($100)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
