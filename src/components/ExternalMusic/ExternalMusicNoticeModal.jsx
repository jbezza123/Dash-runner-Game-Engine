import React from 'react';
import { Info, X, ShieldAlert, ExternalLink } from 'lucide-react';

/**
 * Compliance and legal notice modal required for External Music.
 * Displays the exact specified disclosure verbatim with an accessible dialog.
 */
export default function ExternalMusicNoticeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-6 text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5 text-cyan-400">
            <Info className="w-5 h-5" />
            <h3 className="font-display font-bold text-lg text-white tracking-wide">
              External Music Notice
            </h3>
          </div>
          <button
            id="notice-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verbatim Required Notice Text */}
        <div className="mt-5 space-y-3.5 text-xs text-neutral-300 leading-relaxed font-sans">
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200">
            <p className="font-semibold text-sm mb-1 text-white">External Music</p>
            <p>
              This feature allows you to play YouTube content supplied by you through the official YouTube player.
            </p>
          </div>

          <p className="text-neutral-300">
            The game does not host, upload, download, extract, or distribute YouTube audio or video content.
          </p>

          <p className="text-neutral-300">
            You are responsible for ensuring that your use of any content you provide complies with applicable law and the terms that apply to that content.
          </p>

          <p className="text-neutral-300">
            YouTube content is provided by YouTube and remains subject to YouTube&apos;s terms and policies.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
          <button
            id="notice-modal-understood-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
