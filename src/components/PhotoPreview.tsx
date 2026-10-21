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
  Sparkles,
  Check,
  QrCode,
  Repeat,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppSettings, ColorFilter, FrameConfig, UploadStatus, CaptureMode } from '../types';
import { uploadToGoogleDrive, extractDriveFolderId } from '../utils/googleDrive';
import { soundEffects } from '../utils/audio';
import { getFilterDefinition } from '../utils/filters';
import { QRCodeModal } from './QRCodeModal';

interface PhotoPreviewProps {
  photoDataUrl: string;
  videoUrl?: string;
  videoBlob?: Blob;
  mediaType?: CaptureMode;
  frame: FrameConfig;
  settings: AppSettings;
  appliedFilter?: ColorFilter;
  onRetake: () => void;
  onChangeFrame: () => void;
  onOpenAdmin: () => void;
}

export const PhotoPreview: React.FC<PhotoPreviewProps> = ({
  photoDataUrl,
  videoUrl,
  videoBlob,
  mediaType = 'photo',
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
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  const filterDef = getFilterDefinition(appliedFilter);
  const isBoomerang = mediaType === 'boomerang';

  // Launch celebration confetti and sound
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

  // Helper to convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Auto-upload in background to Google Drive for Photo or Boomerang Video
  useEffect(() => {
    let isMounted = true;

    const performUpload = async () => {
      const folderId = settings.driveFolderId ? extractDriveFolderId(settings.driveFolderId) : '';
      if (!folderId && (!settings.gasWebAppUrl || !settings.gasWebAppUrl.trim())) {
        if (isMounted) {
          setUploadStatus({
            state: 'idle',
            message: 'Folder Google Drive belum diatur di Admin',
          });
        }
        return;
      }

      // If Google Apps Script Web App URL is provided
      if (settings.gasWebAppUrl && settings.gasWebAppUrl.trim()) {
        if (isMounted) {
          setUploadStatus({
            state: 'uploading',
            message: isBoomerang ? 'Menyimpan video boomerang ke Google Drive...' : 'Menyimpan foto ke Google Drive...',
          });
        }

        try {
          let base64Payload = photoDataUrl;
          let mimeType = 'image/png';

          if (isBoomerang && videoBlob) {
            base64Payload = await blobToBase64(videoBlob);
            mimeType = videoBlob.type || 'video/mp4';
          }

          const result = await uploadToGoogleDrive({
            gasWebAppUrl: settings.gasWebAppUrl,
            folderId: settings.driveFolderId,
            base64Data: base64Payload,
            mimeType,
            mediaType,
            eventName: settings.eventName,
          });

          if (isMounted) {
            if (result.success) {
              setUploadStatus({
                state: 'success',
                message: isBoomerang ? 'Video Boomerang tersimpan di Drive!' : 'Tersimpan ke Google Drive!',
                fileUrl: result.fileUrl,
                fileId: result.fileId,
              });
              return;
            } else {
              setUploadStatus({
                state: 'error',
                message: result.message,
              });
              return;
            }
          }
        } catch (uploadErr) {
          console.warn('Auto upload failed:', uploadErr);
        }
      }

      // If direct folder link is configured without GAS URL
      if (isMounted && folderId) {
        setUploadStatus({
          state: 'success',
          message: 'Folder Google Drive Terhubung!',
          fileUrl: `https://drive.google.com/drive/folders/${folderId}`,
          fileId: folderId,
        });
      }
    };

    performUpload();

    return () => {
      isMounted = false;
    };
  }, [isBoomerang, mediaType, photoDataUrl, settings.driveFolderId, settings.eventName, settings.gasWebAppUrl, videoBlob]);

  // Download photo or video to local device
  const handleDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeBrand = (settings.brandName || 'Photobooth').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (isBoomerang && videoUrl) {
      const ext = videoBlob?.type.includes('webm') ? 'webm' : 'mp4';
      const filename = `${safeBrand}_Boomerang_${timestamp}.${ext}`;
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShareToast('Video Boomerang diunduh ke galeri! 📥');
      setTimeout(() => setShareToast(null), 3000);
    } else {
      const filename = `${safeBrand}_${timestamp}.png`;
      const a = document.createElement('a');
      a.href = photoDataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShareToast('Foto diunduh ke galeri! 📥');
      setTimeout(() => setShareToast(null), 3000);
    }
  };

  // Native Web Share API (share video or image file directly)
  const handleNativeShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeBrand = (settings.brandName || 'Photobooth').replace(/[^a-zA-Z0-9_-]/g, '_');
      const shareText = isBoomerang
        ? `Video Boomerang photobooth di ${settings.eventName || settings.brandName}! 🔄✨`
        : `Selfie photobooth di ${settings.eventName || settings.brandName}! 📸✨`;
      const shareTitle = settings.eventName || `${settings.brandName} Photobooth`;

      let fileToShare: File | null = null;

      if (isBoomerang && videoBlob) {
        const ext = videoBlob.type.includes('webm') ? 'webm' : 'mp4';
        const filename = `${safeBrand}_Boomerang_${timestamp}.${ext}`;
        fileToShare = new File([videoBlob], filename, { type: videoBlob.type || 'video/mp4' });
      } else {
        const res = await fetch(photoDataUrl);
        const blob = await res.blob();
        const filename = `${safeBrand}_${timestamp}.png`;
        fileToShare = new File([blob], filename, { type: 'image/png' });
      }

      // 1. Try sharing actual file via Web Share API
      if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
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

  const handleRetryUpload = async () => {
    setUploadStatus({
      state: 'uploading',
      message: 'Mencoba kembali menyimpan ke Google Drive...',
    });

    try {
      let base64Payload = photoDataUrl;
      let mimeType = 'image/png';

      if (isBoomerang && videoBlob) {
        base64Payload = await blobToBase64(videoBlob);
        mimeType = videoBlob.type || 'video/mp4';
      }

      const result = await uploadToGoogleDrive({
        gasWebAppUrl: settings.gasWebAppUrl,
        folderId: settings.driveFolderId,
        base64Data: base64Payload,
        mimeType,
        mediaType,
        eventName: settings.eventName,
      });

      if (result.success) {
        setUploadStatus({
          state: 'success',
          message: isBoomerang ? 'Video Boomerang tersimpan di Drive!' : 'Tersimpan ke Google Drive!',
          fileUrl: result.fileUrl,
          fileId: result.fileId,
        });
      } else {
        setUploadStatus({
          state: 'error',
          message: result.message,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadStatus({
        state: 'error',
        message: `Gagal: ${msg}`,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto px-4 pb-4 pt-1 select-none">
      {/* Auto-upload Status Bar */}
      <div className="w-full mb-2">
        {uploadStatus.state === 'uploading' && (
          <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span className="truncate">{uploadStatus.message}</span>
          </div>
        )}

        {uploadStatus.state === 'success' && (
          <div className="flex items-center justify-between py-1.5 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{uploadStatus.message}</span>
            </div>
            <div className="flex items-center gap-2 ml-2 shrink-0">
              <button
                onClick={() => setIsQrModalOpen(true)}
                type="button"
                className="flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded-md font-semibold transition-colors"
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
                  className="flex items-center gap-1 text-[11px] text-emerald-400 underline font-bold"
                >
                  <span>Buka Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {uploadStatus.state === 'error' && (
          <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate text-[11px]">{uploadStatus.message}</span>
            </div>
            <button
              onClick={handleRetryUpload}
              className="text-[11px] font-bold text-amber-300 underline shrink-0 hover:text-white"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {uploadStatus.state === 'idle' && !settings.driveFolderId && (
          <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Link Google Drive belum diatur di Admin</span>
            </div>
            <button
              onClick={onOpenAdmin}
              className="text-amber-300 hover:text-white font-bold underline shrink-0 ml-2"
            >
              Atur Drive
            </button>
          </div>
        )}
      </div>

      {/* Finished Media Preview Card: Adaptive to native phone ratio */}
      <div className="relative w-full max-w-sm max-h-[66dvh] mx-auto rounded-3xl overflow-hidden bg-zinc-950 border-2 border-zinc-800 shadow-2xl flex items-center justify-center my-auto aspect-auto min-h-[360px]">
        {isBoomerang && videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={photoDataUrl}
            alt="Hasil Photobooth"
            className="w-full h-full object-contain"
          />
        )}

        {/* Frame, Boomerang, and Filter Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider">
            {frame.name}
          </span>

          {isBoomerang && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 backdrop-blur-md text-white border border-amber-300/30 flex items-center gap-1 shadow-md">
              <Repeat className="w-2.5 h-2.5" />
              <span>Boomerang</span>
            </span>
          )}

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
        <button
          onClick={() => setIsQrModalOpen(true)}
          type="button"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:text-rose-400 active:scale-95 transition-all shadow-md"
          title="Buka QR Code"
        >
          <QrCode className="w-4 h-4" />
        </button>

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

      {/* Action Buttons: Download, Native Share, QR Code, Retake, Change Frame */}
      <div className="w-full flex flex-col gap-2 mt-auto pt-2">
        {/* Main Actions: Unduh & Bagikan */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownload}
            type="button"
            className="w-full py-3 px-3 rounded-2xl bg-zinc-850 hover:bg-zinc-800 active:scale-[0.98] text-zinc-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-zinc-700 shadow-md transition-all"
          >
            <Download className="w-4 h-4 text-zinc-300" />
            <span>{isBoomerang ? 'Unduh Boomerang' : 'Unduh Foto'}</span>
          </button>

          <button
            onClick={handleNativeShare}
            disabled={isSharing}
            type="button"
            className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all disabled:opacity-75"
          >
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Menyiapkan...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-white" />
                <span>Bagikan {isBoomerang ? 'Video' : 'Foto'}</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary Row: Scan QR Code Button */}
        <button
          onClick={() => setIsQrModalOpen(true)}
          type="button"
          className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 border border-zinc-800 shadow-sm transition-all"
        >
          <QrCode className="w-4 h-4 text-rose-400" />
          <span>Scan QR Code untuk Unduh di Perangkat Lain</span>
        </button>

        {/* Tertiary Actions: Foto Ulang & Ganti Frame */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRetake}
            type="button"
            className="w-full py-2 px-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-800 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ulangi Pengambilan</span>
          </button>

          <button
            onClick={onChangeFrame}
            type="button"
            className="w-full py-2 px-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-800 transition-all"
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
