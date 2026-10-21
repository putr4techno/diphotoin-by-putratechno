import React, { useEffect, useState } from 'react';
import {
  Download,
  RotateCcw,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Share2,
  ExternalLink,
  Check,
  QrCode,
  HardDrive,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppSettings, ColorFilter, FrameConfig, UploadStatus } from '../types';
import { uploadToGoogleDrive, extractDriveFolderId } from '../utils/googleDrive';
import { soundEffects } from '../utils/audio';
import { getFilterDefinition } from '../utils/filters';
import { QRCodeModal } from './QRCodeModal';

interface PhotoPreviewProps {
  photoDataUrl: string;
  frame: FrameConfig;
  settings: AppSettings;
  appliedFilter?: ColorFilter;
  onRetake: () => void;
  onChangeFrame: () => void;
  onOpenAdmin: () => void;
}

export const PhotoPreview: React.FC<PhotoPreviewProps> = ({
  photoDataUrl,
  frame,
  settings,
  appliedFilter = 'none',
  onRetake,
  onChangeFrame,
  onOpenAdmin,
}) => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    state: 'idle',
    message: '',
  });
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  const filterDef = getFilterDefinition(appliedFilter);
  const parsedFolderId = settings.driveFolderId ? extractDriveFolderId(settings.driveFolderId) : '';
  const hasDriveConfig = !!parsedFolderId || !!(settings.gasWebAppUrl && settings.gasWebAppUrl.trim());

  // Launch celebration confetti and sound on preview screen load
  useEffect(() => {
    soundEffects.playSuccess();
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#f43f5e', '#ec4899', '#a855f7', '#38bdf8', '#fbbf24'],
      });
    } catch {
      // Ignore if confetti fails
    }
  }, []);

  // Trigger Google Drive upload helper
  const performDriveUpload = async (): Promise<boolean> => {
    if (!hasDriveConfig) {
      setUploadStatus({
        state: 'idle',
        message: 'Link Google Drive belum diisi di Panel Admin',
      });
      return false;
    }

    setUploadStatus({
      state: 'uploading',
      message: 'Menyimpan foto ke folder Google Drive...',
    });

    try {
      // If GAS Web App URL is provided
      if (settings.gasWebAppUrl && settings.gasWebAppUrl.trim()) {
        const result = await uploadToGoogleDrive({
          gasWebAppUrl: settings.gasWebAppUrl,
          folderId: settings.driveFolderId,
          base64Data: photoDataUrl,
          mimeType: 'image/png',
          eventName: settings.eventName,
        });

        if (result.success) {
          setUploadStatus({
            state: 'success',
            message: 'Foto berhasil tersimpan di Google Drive!',
            fileUrl: result.fileUrl,
            fileId: result.fileId,
          });
          return true;
        } else {
          setUploadStatus({
            state: 'error',
            message: result.message || 'Gagal menyimpan ke Google Drive.',
          });
          return false;
        }
      }

      // If direct folder link is provided without GAS URL
      if (parsedFolderId) {
        setUploadStatus({
          state: 'success',
          message: 'Foto siap diakses pada folder Google Drive!',
          fileUrl: `https://drive.google.com/drive/folders/${parsedFolderId}`,
          fileId: parsedFolderId,
        });
        return true;
      }

      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadStatus({
        state: 'error',
        message: `Gagal upload ke Drive: ${msg}`,
      });
      return false;
    }
  };

  // Download photo to local device & automatically upload to Google Drive upon download click
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeBrand = (settings.brandName || 'Photobooth').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeBrand}_${timestamp}.png`;

    // 1. Trigger local download immediately
    try {
      const a = document.createElement('a');
      a.href = photoDataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShareToast('Foto diunduh ke galeri! 📥');
      setTimeout(() => setShareToast(null), 3000);
    } catch (err) {
      console.warn('Local download trigger warning:', err);
    }

    // 2. Automatically upload to Google Drive target link
    if (hasDriveConfig) {
      await performDriveUpload();
    } else {
      setUploadStatus({
        state: 'idle',
        message: 'Foto diunduh ke HP. Link Drive belum diisi di Admin.',
      });
    }

    setIsDownloading(false);
  };

  // Native Web Share API (share image file or Drive link directly)
  const handleNativeShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeBrand = (settings.brandName || 'Photobooth').replace(/[^a-zA-Z0-9_-]/g, '_');
      const shareText = `Selfie photobooth di ${settings.eventName || settings.brandName}! 📸✨`;
      const shareTitle = settings.eventName || `${settings.brandName} Photobooth`;

      const res = await fetch(photoDataUrl);
      const blob = await res.blob();
      const filename = `${safeBrand}_${timestamp}.png`;
      const fileToShare = new File([blob], filename, { type: 'image/png' });

      // 1. Try sharing actual file via Web Share API
      if (navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [fileToShare],
        });
        setShareToast('Berhasil dibagikan! 🎉');
        setTimeout(() => setShareToast(null), 3000);
      }
      // 2. Fallback: Share URL / text
      else if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: uploadStatus.fileUrl || window.location.href,
        });
        setShareToast('Tautan berhasil dibagikan! 🎉');
        setTimeout(() => setShareToast(null), 3000);
      }
      // 3. Fallback: Download
      else {
        handleDownload();
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error && error.name === 'AbortError') {
        console.log('User cancelled native share dialog.');
      } else {
        console.error('Web Share failed:', err);
        handleDownload();
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto px-4 pb-4 pt-1 select-none">
      {/* Google Drive Status Bar */}
      <div className="w-full mb-2">
        {uploadStatus.state === 'uploading' && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span className="truncate">{uploadStatus.message}</span>
          </div>
        )}

        {uploadStatus.state === 'success' && (
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{uploadStatus.message}</span>
            </div>
            <div className="flex items-center gap-2 ml-2 shrink-0">
              <button
                onClick={() => setIsQrModalOpen(true)}
                type="button"
                className="flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer"
                title="Tampilkan QR Code Drive"
              >
                <QrCode className="w-3 h-3" />
                <span>QR</span>
              </button>
              {uploadStatus.fileUrl && (
                <a
                  href={uploadStatus.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-emerald-400 underline font-bold cursor-pointer"
                >
                  <span>Buka Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {uploadStatus.state === 'error' && (
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate text-[11px]">{uploadStatus.message}</span>
            </div>
            <button
              onClick={performDriveUpload}
              className="text-[11px] font-bold text-amber-300 underline shrink-0 hover:text-white cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {uploadStatus.state === 'idle' && (
          <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <HardDrive className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate text-[11px]">
                {hasDriveConfig
                  ? 'Tekan "Unduh Foto" untuk unduh ke HP & upload ke Google Drive'
                  : 'Link Google Drive belum diisi di Admin'}
              </span>
            </div>
            {!hasDriveConfig && (
              <button
                onClick={onOpenAdmin}
                className="text-rose-400 hover:text-rose-300 font-bold underline shrink-0 ml-2 text-[11px] cursor-pointer"
              >
                Atur Drive
              </button>
            )}
          </div>
        )}
      </div>

      {/* Finished Photo Preview Card: Adaptive to native phone ratio */}
      <div className="relative w-full max-w-sm max-h-[66dvh] mx-auto rounded-3xl overflow-hidden bg-zinc-950 border-2 border-zinc-800 shadow-2xl flex items-center justify-center my-auto aspect-auto min-h-[360px]">
        <img
          src={photoDataUrl}
          alt="Hasil Photobooth"
          className="w-full h-full object-contain"
        />

        {/* Frame & Filter Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider">
            {frame.name}
          </span>

          {filterDef && (
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md text-white border flex items-center gap-1 ${
                appliedFilter === 'none'
                  ? 'bg-zinc-800/80 border-white/20'
                  : appliedFilter === 'beauty'
                  ? 'bg-rose-500/80 border-rose-400/30'
                  : 'bg-amber-500/80 border-amber-400/30'
              }`}
            >
              <span>{appliedFilter === 'none' ? '🌿' : appliedFilter === 'beauty' ? '✨' : '🌟'}</span>
              <span>{filterDef.label}</span>
            </span>
          )}
        </div>

        {/* Floating Quick QR Button */}
        {uploadStatus.fileUrl && (
          <button
            onClick={() => setIsQrModalOpen(true)}
            type="button"
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:text-rose-400 active:scale-95 transition-all shadow-md cursor-pointer"
            title="Buka QR Code Drive"
          >
            <QrCode className="w-4 h-4" />
          </button>
        )}

        {/* Share Toast Notification Badge */}
        {shareToast && (
          <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="py-2 px-3.5 rounded-full bg-zinc-900/95 border border-zinc-700 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{shareToast}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Unduh Foto (Downloads & Uploads to Drive), Share, QR Code, Retake, Change Frame */}
      <div className="w-full flex flex-col gap-2 mt-auto pt-2">
        {/* Main Actions: Unduh Foto & Bagikan */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            type="button"
            className="w-full py-3 px-3 rounded-2xl bg-zinc-850 hover:bg-zinc-800 active:scale-[0.98] text-zinc-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-zinc-700 shadow-md transition-all cursor-pointer disabled:opacity-75"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-zinc-300" />
                <span>Unduh Foto</span>
              </>
            )}
          </button>

          <button
            onClick={handleNativeShare}
            disabled={isSharing}
            type="button"
            className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all disabled:opacity-75 cursor-pointer"
          >
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Menyiapkan...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-white" />
                <span>Bagikan Foto</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary Row: Scan QR Code Button */}
        <button
          onClick={() => setIsQrModalOpen(true)}
          type="button"
          className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 border border-zinc-800 shadow-sm transition-all cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-rose-400" />
          <span>Scan QR Code untuk Unduh di Perangkat Lain</span>
        </button>

        {/* Tertiary Actions: Foto Ulang & Ganti Frame */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRetake}
            type="button"
            className="w-full py-2 px-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-800 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Foto Ulang</span>
          </button>

          <button
            onClick={onChangeFrame}
            type="button"
            className="w-full py-2 px-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-800 transition-all cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Ganti Frame</span>
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        targetUrl={uploadStatus.fileUrl || ''}
        isUploading={uploadStatus.state === 'uploading'}
        settings={settings}
        photoDataUrl={photoDataUrl}
      />
    </div>
  );
};
