import React, { useState } from 'react';
import { Camera, Settings, Sparkles, Share2, Check } from 'lucide-react';
import { AppSettings } from '../types';
import { getShareableAppUrl } from '../utils/storage';

interface HeaderProps {
  settings: AppSettings;
  onOpenAdmin: () => void;
  compact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ settings, onOpenAdmin, compact = false }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleShareApp = async () => {
    const url = getShareableAppUrl(settings);
    if (navigator.share) {
      try {
        await navigator.share({
          title: settings.eventName || `${settings.brandName} Photobooth`,
          text: `Ayo selfie bareng di Photobooth ${settings.eventName || settings.brandName}! 📸✨`,
          url: url,
        });
      } catch (err) {
        console.log('Share dismissed:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <header className="w-full max-w-md mx-auto px-4 py-2.5 flex items-center justify-between select-none z-30 relative">
      {/* Brand & Logo Area */}
      <div className="flex items-center gap-2.5">
        {settings.brandLogoUrl ? (
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shadow-sm flex items-center justify-center">
            <img
              src={settings.brandLogoUrl}
              alt={settings.brandName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-[1.5px] shadow-sm">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Camera className="w-4 h-4 text-rose-400" />
            </div>
          </div>
        )}

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-wider text-xs sm:text-sm text-zinc-100 uppercase">
              {settings.brandName || 'SNAPMOMENT'}
            </span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </div>
          {!compact && (
            <p className="text-[11px] text-zinc-400 truncate max-w-[190px] sm:max-w-[220px]">
              {settings.eventName || 'Photobooth Experience'}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons: Share App Link & Admin */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleShareApp}
          type="button"
          className="w-9 h-9 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-rose-400 hover:border-zinc-700 active:scale-95 transition-all flex items-center justify-center shadow-sm"
          title="Bagikan Link Photobooth ke HP Lain"
          aria-label="Bagikan Link Photobooth"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onOpenAdmin}
          type="button"
          className="w-9 h-9 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 active:scale-95 transition-all flex items-center justify-center shadow-sm"
          title="Buka Panel Admin"
          aria-label="Pengaturan Admin"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Copied Toast */}
      {copied && (
        <div className="absolute top-12 right-4 z-40 bg-zinc-900 border border-zinc-700 text-white text-[10px] font-semibold py-1.5 px-3 rounded-full shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
          <Check className="w-3 h-3 text-emerald-400" />
          <span>Link Acara Tersalin! Siap Dibagikan</span>
        </div>
      )}
    </header>
  );
};
