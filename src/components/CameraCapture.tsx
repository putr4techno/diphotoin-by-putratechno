import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, FlipHorizontal, ArrowLeft, AlertCircle, Upload, Zap, Sparkles, Repeat } from 'lucide-react';
import { AppSettings, CaptureMode, ColorFilter, FrameConfig } from '../types';
import { FrameOverlayVisual } from './DefaultFrames';
import { soundEffects } from '../utils/audio';
import { COLOR_FILTERS, getFilterDefinition } from '../utils/filters';
import { captureBoomerangFrames, createBoomerangVideo, BoomerangResult } from '../utils/boomerang';

interface CameraCaptureProps {
  settings: AppSettings;
  frame: FrameConfig;
  initialFilter?: ColorFilter;
  initialMode?: CaptureMode;
  onCapturedPhoto: (source: HTMLVideoElement | HTMLImageElement, mirror: boolean, filter: ColorFilter) => void;
  onCapturedBoomerang: (result: BoomerangResult, filter: ColorFilter) => void;
  onBack: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  settings,
  frame,
  initialFilter = 'none',
  initialMode = 'photo',
  onCapturedPhoto,
  onCapturedBoomerang,
  onBack,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [captureMode, setCaptureMode] = useState<CaptureMode>(initialMode);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirror, setIsMirror] = useState<boolean>(settings.mirrorDefault);
  const [selectedFilter, setSelectedFilter] = useState<ColorFilter>(initialFilter);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [streamAspectRatio, setStreamAspectRatio] = useState<number | null>(null);

  // Boomerang recording progress state
  const [isRecordingBoomerang, setIsRecordingBoomerang] = useState<boolean>(false);
  const [boomerangProgress, setBoomerangProgress] = useState<number>(0);
  const [isProcessingBoomerang, setIsProcessingBoomerang] = useState<boolean>(false);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Detect native stream aspect ratio on metadata load
  const handleVideoMetadata = () => {
    if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
      const ratio = videoRef.current.videoWidth / videoRef.current.videoHeight;
      setStreamAspectRatio(ratio);
    }
  };

  // Start camera stream: follows device's native resolution and aspect ratio (no 9:16 lock)
  const startCamera = useCallback(async () => {
    setIsLoadingCamera(true);
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Perangkat ini tidak mendukung akses kamera langsung (MediaDevices API tidak tersedia).');
      }

      // Native resolution constraints: allows each phone to use its own native aspect ratio
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback with looser constraints
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode },
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }

      setIsLoadingCamera(false);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Camera Init Error:', err);
      setIsLoadingCamera(false);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('Kamera tidak ditemukan di perangkat ini.');
      } else {
        setCameraError(`Gagal mengakses kamera: ${error.message || 'Error tidak diketahui'}`);
      }
    }
  }, [facingMode, stopCamera]);

  // Boomerang recording execution
  const executeBoomerangCapture = useCallback(async () => {
    if (!videoRef.current) return;
    setIsRecordingBoomerang(true);
    setBoomerangProgress(0);

    try {
      soundEffects.playShutter();
      const frames = await captureBoomerangFrames(videoRef.current, {
        durationMs: 1500,
        fps: 20,
        onProgress: (p) => setBoomerangProgress(p),
      });

      setIsRecordingBoomerang(false);
      setIsProcessingBoomerang(true);

      const result = await createBoomerangVideo(frames, {
        frame,
        settings,
        mirror: isMirror && facingMode === 'user',
        colorFilter: selectedFilter,
        loops: 2,
        fps: 24,
      });

      onCapturedBoomerang(result, selectedFilter);
    } catch (err) {
      console.error('Boomerang Capture Failed:', err);
      alert('Gagal merekam Boomerang. Silakan coba kembali.');
    } finally {
      setIsRecordingBoomerang(false);
      setIsProcessingBoomerang(false);
      setCountdown(null);
    }
  }, [facingMode, frame, isMirror, onCapturedBoomerang, selectedFilter, settings]);

  // Handle countdown & capture
  const triggerCapture = useCallback(() => {
    if (countdown !== null || isRecordingBoomerang || isProcessingBoomerang) return;

    let currentCount = settings.countdownSeconds || 5;
    setCountdown(currentCount);
    soundEffects.playTick();

    const intervalId = window.setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
        soundEffects.playTick();
      } else {
        window.clearInterval(intervalId);
        setCountdown(0);
        soundEffects.playFinalTick();

        if (captureMode === 'boomerang') {
          setCountdown(null);
          executeBoomerangCapture();
        } else {
          // Standard photo capture
          soundEffects.playShutter();
          setIsFlashing(true);

          setTimeout(() => {
            if (videoRef.current) {
              onCapturedPhoto(videoRef.current, isMirror && facingMode === 'user', selectedFilter);
            }
            setIsFlashing(false);
            setCountdown(null);
          }, 150);
        }
      }
    }, 1000);
  }, [
    captureMode,
    countdown,
    executeBoomerangCapture,
    facingMode,
    isMirror,
    isProcessingBoomerang,
    isRecordingBoomerang,
    onCapturedPhoto,
    selectedFilter,
    settings.countdownSeconds,
  ]);

  // Initial camera startup
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Auto trigger countdown when camera starts
  useEffect(() => {
    if (!isLoadingCamera && !cameraError && countdown === null && !isRecordingBoomerang && !isProcessingBoomerang) {
      const timer = setTimeout(() => {
        triggerCapture();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isLoadingCamera, cameraError, triggerCapture, isRecordingBoomerang, isProcessingBoomerang]);

  // Flip front/rear camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => {
      const next = prev === 'user' ? 'environment' : 'user';
      setIsMirror(next === 'user');
      return next;
    });
  };

  // Fallback photo upload for testing without webcam
  const handleFallbackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const img = new Image();
        img.onload = () => {
          onCapturedPhoto(img, false, selectedFilter);
        };
        img.src = loadEvt.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const activeFilterDef = getFilterDefinition(selectedFilter);

  return (
    <div className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto px-3 pb-3 pt-1 select-none relative">
      {/* Top Bar Navigation & Controls */}
      <div className="flex items-center justify-between py-1 px-1 z-20">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold active:scale-95 transition-all shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        {/* Mode Switcher: Foto vs Boomerang */}
        <div className="flex items-center p-0.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur-md shadow-md">
          <button
            type="button"
            onClick={() => setCaptureMode('photo')}
            className={`py-1 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              captureMode === 'photo'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>📸 Foto</span>
          </button>
          <button
            type="button"
            onClick={() => setCaptureMode('boomerang')}
            className={`py-1 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              captureMode === 'boomerang'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>Boomerang</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mirror toggle (only relevant for front camera) */}
          {facingMode === 'user' && (
            <button
              onClick={() => setIsMirror(!isMirror)}
              type="button"
              className={`p-2 rounded-full border transition-all text-xs font-medium flex items-center justify-center ${
                isMirror
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
              }`}
              title="Cermin (Mirror Selfie)"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          )}

          {/* Switch Camera */}
          <button
            onClick={toggleFacingMode}
            type="button"
            className="p-2 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white transition-all active:scale-95"
            title="Ganti Kamera Depan/Belakang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Camera Viewport: Follows phone's native camera ratio without 9:16 lock */}
      <div
        style={{
          aspectRatio: streamAspectRatio ? `${streamAspectRatio}` : undefined,
        }}
        className="relative w-full max-w-sm max-h-[70dvh] mx-auto rounded-3xl overflow-hidden bg-black border-2 border-zinc-800 shadow-2xl flex items-center justify-center transition-all duration-300"
      >
        {/* Loading Spinner */}
        {isLoadingCamera && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 gap-3">
            <div className="w-10 h-10 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"></div>
            <p className="text-xs text-zinc-300 font-medium">Menghubungkan Kamera Handphone...</p>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/95 gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-200">{cameraError}</p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={startCamera}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all"
              >
                Coba Akses Kamera Lagi
              </button>
              <label className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Unggah Foto dari Galeri</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFallbackUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Live Video Feed: Natural full camera display */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleVideoMetadata}
          style={{ filter: activeFilterDef.cssFilter === 'none' ? 'none' : activeFilterDef.cssFilter }}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isMirror && facingMode === 'user' ? 'scale-x-[-1]' : 'scale-x-1'
          }`}
        />

        {/* Live Transparent Frame Overlay */}
        <FrameOverlayVisual
          frame={frame}
          settings={settings}
          isViewfinder={true}
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Big Countdown Timer Overlay (5 to 1) */}
        {countdown !== null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none">
            <div className="relative flex items-center justify-center animate-ping duration-700">
              <span className="text-8xl sm:text-9xl font-black text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] font-mono">
                {countdown > 0 ? countdown : captureMode === 'boomerang' ? '🔄' : '📸'}
              </span>
            </div>
          </div>
        )}

        {/* Boomerang Recording Progress Overlay */}
        {isRecordingBoomerang && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] pointer-events-none p-4">
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/40 text-center flex flex-col items-center gap-2 shadow-2xl">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
                <span>Merekam Boomerang...</span>
              </div>
              <div className="w-40 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-75"
                  style={{ width: `${boomerangProgress}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-zinc-300 font-mono">{boomerangProgress}%</span>
            </div>
          </div>
        )}

        {/* Boomerang Encoding Loader */}
        {isProcessingBoomerang && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none p-4 gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
            <p className="text-xs text-white font-bold tracking-wide">Menyusun Video Boomerang Loop...</p>
          </div>
        )}

        {/* Flash Effect Overlay */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white camera-flash z-40 pointer-events-none"></div>
        )}
      </div>

      {/* Filter Selector Utility & Shutter Bar */}
      <div className="flex flex-col items-center gap-2 pt-2 z-20">
        {/* Effect Selector: 3 choices (Tanpa Efek, Beauty, Glowing) */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md shadow-lg max-w-sm w-full justify-center">
          {COLOR_FILTERS.map((f) => {
            const isActive = selectedFilter === f.id;
            const isNone = f.id === 'none';
            const isBeauty = f.id === 'beauty';

            const activeClass = isNone
              ? 'bg-zinc-700 text-white shadow-md scale-[1.02]'
              : isBeauty
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-950/50 scale-[1.02]'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-950/50 scale-[1.02]';

            const icon = isNone ? '🌿' : isBeauty ? '✨' : '🌟';

            return (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                type="button"
                className={`flex-1 py-1.5 px-2.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer ${
                  isActive
                    ? activeClass
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <span>{icon}</span>
                <span className="truncate">{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Shutter Controls */}
        <button
          onClick={triggerCapture}
          disabled={countdown !== null || isLoadingCamera || !!cameraError || isRecordingBoomerang || isProcessingBoomerang}
          type="button"
          className="relative group p-1 rounded-full transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title={captureMode === 'boomerang' ? 'Rekam Boomerang' : 'Ambil Foto'}
        >
          {/* Outer glowing ring */}
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-white/80 group-hover:border-rose-400 flex items-center justify-center transition-all p-1 shadow-lg bg-black/40 backdrop-blur-sm">
            {/* Inner Shutter Button */}
            <div
              className={`w-full h-full rounded-full transition-transform flex items-center justify-center shadow-inner ${
                captureMode === 'boomerang'
                  ? 'bg-gradient-to-tr from-amber-500 to-rose-500 group-hover:scale-95'
                  : 'bg-gradient-to-tr from-rose-500 to-pink-500 group-hover:scale-95'
              }`}
            >
              {captureMode === 'boomerang' ? (
                <Repeat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              ) : (
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
