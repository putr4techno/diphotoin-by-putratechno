import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Loader2,
  HardDrive,
} from 'lucide-react';
import { AppSettings } from '../types';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string;
  isUploading: boolean;
  settings: AppSettings;
  photoDataUrl: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  targetUrl,
  isUploading,
  settings,
  photoDataUrl,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // The actual URL encoded in the QR code
  // If no Google Drive link yet, fallback to the current page URL with a timestamp
  const effectiveUrl = targetUrl && targetUrl.trim() !== '' ? targetUrl : window.location.href;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    QRCode.toDataURL(effectiveUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveUrl, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(effectiveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRCode_${(settings.brandName || 'Photobooth').replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Scan QR Code Foto</h3>
              <p className="text-[10px] text-zinc-400">Unduh langsung di perangkat lain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center text-center">
          {/* Brand & Event Tag */}
          <div className="mb-3">
            <span className="text-[10px] font-bold tracking-widest text-rose-400 uppercase">
              {settings.brandName || 'SNAPMOMENT'}
            </span>
            <h4 className="text-xs font-semibold text-zinc-200 truncate max-w-[260px] mx-auto">
              {settings.eventName || 'Photobooth Experience'}
            </h4>
          </div>

          {/* QR Code Container with sleek white card */}
          <div className="relative p-3.5 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-zinc-950/20">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code Foto"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
            ) : (
              <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center gap-2 text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                <span className="text-[10px]">Menghasilkan QR Code...</span>
              </div>
            )}

            {/* Small center logo badge */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-xl bg-zinc-950 border-2 border-white flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-rose-400" />
              </div>
            </div>
          </div>

          {/* Status info */}
          {isUploading && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Menghubungkan tautan Google Drive publik...</span>
            </div>
          )}

          {targetUrl ? (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Terhubung langsung ke Google Drive Publik</span>
            </div>
          ) : (
            <p className="mt-3 text-[10px] text-zinc-400 max-w-xs leading-relaxed">
              Arahkan kamera smartphone ke QR Code ini untuk membuka tautan foto langsung di browser perangkat lain.
            </p>
          )}

          {/* Link box & Copy */}
          <div className="w-full mt-3 p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-zinc-400 truncate text-left select-all pl-1">
              {effectiveUrl}
            </span>
            <button
              onClick={handleCopy}
              type="button"
              className="py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-950/70 grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadQr}
            type="button"
            className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Simpan QR</span>
          </button>

          <a
            href={effectiveUrl}
            target="_blank"
            rel="noreferrer"
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:brightness-110 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 transition-all text-center"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Link</span>
          </a>
        </div>
      </div>
    </div>
  );
};
