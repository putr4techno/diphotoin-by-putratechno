import React from 'react';
import { Camera, Check, Sparkles, HelpCircle } from 'lucide-react';
import { AppSettings, FrameConfig, ColorFilter } from '../types';
import { FrameOverlayVisual } from './DefaultFrames';
import { COLOR_FILTERS } from '../utils/filters';

interface FrameSelectorProps {
  settings: AppSettings;
  selectedFrameId: 'frame1' | 'frame2' | null;
  selectedFilter: ColorFilter;
  onSelectFrame: (id: 'frame1' | 'frame2') => void;
  onSelectFilter: (filter: ColorFilter) => void;
  onStartPhoto: () => void;
}

export const FrameSelector: React.FC<FrameSelectorProps> = ({
  settings,
  selectedFrameId,
  selectedFilter,
  onSelectFrame,
  onSelectFilter,
  onStartPhoto,
}) => {
  const frames: FrameConfig[] = [settings.frame1, settings.frame2];

  return (
    <div className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto px-4 pb-6 pt-1 select-none overflow-y-auto">
      {/* Intro Heading */}
      <div className="text-center my-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>Langkah 1: Pilih Frame & Efek Wajah</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          Pilih Tampilan Photobooth
        </h2>
        <p className="text-xs text-zinc-400 max-w-[280px] mx-auto mt-0.5">
          Pilih salah satu frame dan efek selfie favoritmu di bawah
        </p>
      </div>

      {/* Frame Cards Grid: 2 Portrait Cards (9:16) */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 my-auto py-1">
        {frames.map((frame, index) => {
          const isSelected = selectedFrameId === frame.id;
          return (
            <div
              key={frame.id}
              onClick={() => onSelectFrame(frame.id)}
              className={`group relative flex flex-col cursor-pointer transition-all duration-200 transform active:scale-95`}
            >
              {/* 9:16 Aspect Ratio Frame Container */}
              <div
                className={`relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border-2 transition-all duration-300 shadow-lg ${
                  isSelected
                    ? 'border-rose-500 ring-4 ring-rose-500/30 scale-[1.02] shadow-rose-950/50'
                    : 'border-zinc-800 hover:border-zinc-700 opacity-85 hover:opacity-100'
                }`}
              >
                {/* Visual sample selfie placeholder background */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-700/40 flex items-center justify-center text-zinc-500">
                    <Camera className="w-8 h-8 opacity-40" />
                  </div>
                </div>

                {/* The actual Frame Overlay rendered on top */}
                <FrameOverlayVisual
                  frame={frame}
                  settings={settings}
                  isViewfinder={false}
                  className="absolute inset-0"
                />

                {/* Active Indicator Badge */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md animate-bounce">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {/* Frame Slot Tag */}
                <div className="absolute top-2.5 left-2.5 z-20">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md uppercase tracking-wider ${
                      isSelected
                        ? 'bg-rose-500/90 text-white'
                        : 'bg-black/60 text-zinc-300 border border-white/10'
                    }`}
                  >
                    Opsi {index + 1}
                  </span>
                </div>
              </div>

              {/* Title & Description Below Card */}
              <div className="mt-1.5 text-center">
                <h3
                  className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                    isSelected ? 'text-rose-400' : 'text-zinc-200'
                  }`}
                >
                  {frame.name}
                </h3>
                <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                  {frame.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Menu Pilihan Efek (3 Pilihan: Tanpa Efek, Beauty, Glowing) */}
      <div className="w-full my-2.5 p-3 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-lg">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Pilihan Efek Kamera:</span>
          </div>
          <span className="text-[10px] font-semibold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            {selectedFilter === 'none'
              ? '🌿 Tanpa Efek Aktif'
              : selectedFilter === 'beauty'
              ? '✨ Beauty Aktif'
              : '🌟 Glowing Aktif'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {COLOR_FILTERS.map((filter) => {
            const isFilterActive = selectedFilter === filter.id;
            const isNone = filter.id === 'none';
            const isBeauty = filter.id === 'beauty';

            const activeStyle = isNone
              ? 'bg-gradient-to-br from-zinc-700/40 via-zinc-800/30 to-zinc-900 border-zinc-400 ring-2 ring-zinc-400/40 shadow-md text-zinc-200'
              : isBeauty
              ? 'bg-gradient-to-br from-rose-500/25 via-pink-500/15 to-zinc-900 border-rose-500 ring-2 ring-rose-500/40 shadow-rose-950/40 shadow-md text-rose-300'
              : 'bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-zinc-900 border-amber-400 ring-2 ring-amber-400/40 shadow-amber-950/40 shadow-md text-amber-300';

            const checkColor = isNone
              ? 'bg-zinc-300 text-zinc-950'
              : isBeauty
              ? 'bg-rose-500 text-white'
              : 'bg-amber-500 text-white';

            const icon = isNone ? '🌿' : isBeauty ? '✨' : '🌟';

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onSelectFilter(filter.id)}
                className={`p-2 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden min-h-[76px] ${
                  isFilterActive
                    ? activeStyle
                    : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 opacity-80 hover:opacity-100 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm">{icon}</span>
                  {isFilterActive && (
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${checkColor}`}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="mt-1">
                  <span
                    className={`text-[11px] font-bold block leading-snug ${
                      isFilterActive
                        ? isNone
                          ? 'text-white'
                          : isBeauty
                          ? 'text-rose-200'
                          : 'text-amber-200'
                        : 'text-zinc-200'
                    }`}
                  >
                    {filter.label}
                  </span>
                  <p className="text-[9px] text-zinc-400 leading-tight mt-0.5 line-clamp-2">
                    {filter.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start Button & Guidance (Updated to 5 seconds countdown) */}
      <div className="w-full flex flex-col gap-2 mt-auto pt-1">
        <button
          onClick={onStartPhoto}
          disabled={!selectedFrameId}
          type="button"
          className={`w-full py-3.5 sm:py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl transition-all duration-200 ${
            selectedFrameId
              ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white hover:brightness-110 active:scale-[0.98] shadow-rose-950/60 cursor-pointer animate-pulse'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span>{selectedFrameId ? 'Buka Kamera & Pose' : 'Pilih Salah Satu Frame di Atas'}</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-[11px]">
          <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Atur gaya di live preview, lalu tekan tombol untuk mulai hitung mundur 5 detik</span>
        </div>
      </div>
    </div>
  );
};
