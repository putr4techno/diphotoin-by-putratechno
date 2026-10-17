import React from 'react';
import { FrameConfig, AppSettings } from '../types';
import { getDriveDirectImageUrl } from '../utils/googleDrive';

interface FrameOverlayProps {
  frame: FrameConfig;
  settings: AppSettings;
  className?: string;
  isViewfinder?: boolean; // if true, center cutout is completely transparent
}

export const FrameOverlayVisual: React.FC<FrameOverlayProps> = ({
  frame,
  settings,
  className = '',
  isViewfinder = false,
}) => {
  const customImgSrc = frame.customImageUrl || (frame.driveFileId ? getDriveDirectImageUrl(frame.driveFileId) : null);

  if (customImgSrc) {
    return (
      <div className={`relative w-full h-full pointer-events-none ${className}`}>
        <img
          src={customImgSrc}
          alt={frame.name}
          className="w-full h-full object-fill pointer-events-none"
        />
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Built-in Frame 1: Classic Ivory Minimalist
  if (frame.id === 'frame1' || frame.theme === 'classic') {
    return (
      <div className={`relative w-full h-full flex flex-col justify-between pointer-events-none select-none ${className}`}>
        {/* Top/Side Border Structure */}
        <div className="absolute inset-0 border-[10px] sm:border-[14px] border-white pointer-events-none">
          {/* Inner gold hairline */}
          <div className="w-full h-full border border-amber-300/80 p-2 flex flex-col justify-between">
            {/* Corner marks */}
            <div className="flex justify-between items-start">
              <span className="w-3 h-3 border-t-2 border-l-2 border-amber-400"></span>
              <span className="w-3 h-3 border-t-2 border-r-2 border-amber-400"></span>
            </div>
            <div className="flex justify-between items-end">
              <span className="w-3 h-3 border-b-2 border-l-2 border-amber-400"></span>
              <span className="w-3 h-3 border-b-2 border-r-2 border-amber-400"></span>
            </div>
          </div>
        </div>

        {/* Viewfinder Target Guidelines */}
        {isViewfinder && (
          <div className="absolute inset-x-8 top-1/4 bottom-1/3 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-24 h-24 border border-dashed border-white rounded-full"></div>
          </div>
        )}

        {/* Bottom Metadata Card */}
        <div className="mt-auto z-10 w-full bg-white text-zinc-900 px-3 py-3 sm:py-4 shadow-lg text-center flex flex-col items-center justify-center border-t border-zinc-200">
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.25em] text-zinc-800 uppercase">
            {settings.brandName || 'SNAPMOMENT'}
          </span>
          <h4 className="font-serif-display italic text-sm sm:text-base font-semibold text-amber-800 leading-tight my-0.5 truncate max-w-[90%]">
            {settings.eventName || 'Special Celebration'}
          </h4>
          <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] tracking-widest text-zinc-500 font-medium">
            <span>•</span>
            <span>{currentDate.toUpperCase()}</span>
            <span>•</span>
            <span>PHOTOBOOTH</span>
            <span>•</span>
          </div>
        </div>
      </div>
    );
  }

  // Built-in Frame 2: Cyber Party Glow
  return (
    <div className={`relative w-full h-full flex flex-col justify-between pointer-events-none select-none ${className}`}>
      {/* Outer border & Gradient stroke */}
      <div className="absolute inset-0 border-[8px] sm:border-[12px] border-zinc-950 pointer-events-none">
        <div className="w-full h-full border-2 border-gradient p-2 flex flex-col justify-between relative"
             style={{
               borderImage: 'linear-gradient(to bottom right, #f43f5e, #a855f7, #06b6d4) 1',
             }}>
          {/* Top HUD bar */}
          <div className="flex justify-between items-center text-[9px] font-mono font-bold tracking-wider px-1 text-white drop-shadow">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              REC [9:16]
            </span>
            <span className="text-cyan-300">SNAP EDITION</span>
          </div>

          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white"></div>
          <div className="absolute bottom-16 left-2 w-4 h-4 border-b-2 border-l-2 border-white"></div>
          <div className="absolute bottom-16 right-2 w-4 h-4 border-b-2 border-r-2 border-white"></div>

          {/* Center viewfinder reticle */}
          {isViewfinder && (
            <div className="absolute inset-0 flex items-center justify-center opacity-40">
              <div className="w-4 h-4 relative">
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white"></div>
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Neon Info Card */}
      <div className="mt-auto z-10 w-full bg-zinc-950/95 backdrop-blur-sm border-t border-rose-500/30 px-3 py-3 sm:py-4 text-center flex flex-col items-center justify-center">
        <span className="text-[10px] sm:text-xs font-black tracking-[0.25em] text-rose-400 uppercase">
          {settings.brandName || 'SNAPMOMENT'}
        </span>
        <h4 className="text-xs sm:text-sm font-bold text-cyan-300 tracking-wider truncate max-w-[90%] my-0.5">
          {settings.eventName || 'AFTER PARTY NIGHT'}
        </h4>
        <div className="text-[8px] font-mono tracking-widest text-zinc-400">
          ALL ACCESS PASS • 9:16 HD
        </div>
      </div>
    </div>
  );
};
