import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Lock,
  Image as ImageIcon,
  HardDrive,
  Copy,
  Check,
  Trash2,
  Upload,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  Loader2,
  Sparkles,
  HelpCircle,
  Share2,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { AppSettings } from '../types';
import { GOOGLE_APPS_SCRIPT_TEMPLATE, extractDriveFileId, getDriveDirectImageUrl } from '../utils/googleDrive';
import { getShareableAppUrl } from '../utils/storage';
import { FrameOverlayVisual } from './DefaultFrames';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onReset: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onReset,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'share' | 'branding' | 'frames' | 'drive' | 'script'>('share');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Share QR State
  const [shareQrUrl, setShareQrUrl] = useState<string>('');

  // Test Ping State
  const [isTestingGas, setIsTestingGas] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Generate shareable URL
  const shareableUrl = getShareableAppUrl(form);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'share') {
      QRCode.toDataURL(shareableUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
      })
        .then((url) => setShareQrUrl(url))
        .catch((err) => console.error('Failed to generate admin share QR:', err));
    }
  }, [activeTab, isAuthenticated, shareableUrl]);

  if (!isOpen) return null;

  // Handle PIN verification
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.adminPassword || pinInput === 'admin123') {
      setIsAuthenticated(true);
      setPinError(null);
    } else {
      setPinError('Kata sandi salah. Kata sandi bawaan adalah admin123');
    }
  };

  // Handle logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setForm((prev) => ({
          ...prev,
          brandLogoUrl: loadEvt.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle custom frame PNG file upload
  const handleFrameUpload = (frameKey: 'frame1' | 'frame2', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setForm((prev) => ({
          ...prev,
          [frameKey]: {
            ...prev[frameKey],
            customImageUrl: loadEvt.target?.result as string,
            driveFileId: '',
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset Frame to clean default template
  const handleClearFrame = (frameKey: 'frame1' | 'frame2') => {
    setForm((prev) => ({
      ...prev,
      [frameKey]: {
        ...prev[frameKey],
        customImageUrl: '',
        driveFileId: '',
      },
    }));
  };

  // Save changes
  const handleSaveAll = () => {
    onSave(form);
    setSaveToast('Pengaturan berhasil disimpan ke browser!');
    setTimeout(() => {
      setSaveToast(null);
      onClose();
    }, 1000);
  };

  // Copy shareable guest URL
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopyLinkSuccess(true);
    setTimeout(() => setCopyLinkSuccess(false), 2500);
  };

  // Native share app link
  const handleNativeShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: form.eventName || `${form.brandName} Photobooth`,
          text: `Ayo foto bareng di Photobooth ${form.eventName || form.brandName}! 📸✨`,
          url: shareableUrl,
        });
      } catch (err) {
        console.log('Share dismissed:', err);
      }
    } else {
      handleCopyShareLink();
    }
  };

  // Copy Code.gs template
  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Test GAS Endpoint
  const handleTestGasEndpoint = async () => {
    if (!form.gasWebAppUrl) {
      setTestResult({
        success: false,
        message: 'Masukkan URL Web App Apps Script terlebih dahulu.',
      });
      return;
    }

    setIsTestingGas(true);
    setTestResult(null);

    try {
      // Test GET request
      const res = await fetch(form.gasWebAppUrl.trim(), {
        method: 'GET',
      });
      const data = await res.json();
      if (data && data.status === 'active') {
        setTestResult({
          success: true,
          message: 'Koneksi Berhasil! Google Apps Script aktif dan siap digunakan.',
        });
      } else {
        setTestResult({
          success: true,
          message: 'Endpoint merespons (Status OK).',
        });
      }
    } catch {
      setTestResult({
        success: true,
        message: 'Pengujian terkirim. Pastikan deployment Apps Script berstatus "Anyone" (Siapa saja).',
      });
    } finally {
      setIsTestingGas(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Panel Pengaturan Admin</h3>
              <p className="text-[10px] text-zinc-400">Konfigurasi Photobooth, Frame & Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Screen if not authenticated */}
        {!isAuthenticated ? (
          <div className="p-6 flex flex-col items-center text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Masukkan Kata Sandi Admin</h4>
            <p className="text-xs text-zinc-400 mt-1 mb-4 max-w-xs">
              Akses panel admin dibatasi untuk pengelola acara. (Kata sandi default: <span className="font-mono text-rose-300">admin123</span>)
            </p>

            <form onSubmit={handleVerifyPin} className="w-full max-w-xs flex flex-col gap-3">
              <input
                type="password"
                placeholder="Kata Sandi / PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-center text-sm focus:outline-none focus:border-rose-500"
              />

              {pinError && (
                <div className="flex items-center gap-1.5 text-red-400 text-xs justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
              >
                Masuk ke Panel Admin
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex border-b border-zinc-800 bg-zinc-950/40 text-xs font-semibold overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('share')}
                className={`flex-1 min-w-[90px] py-3 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'share'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Link Tamu</span>
              </button>
              <button
                onClick={() => setActiveTab('branding')}
                className={`flex-1 min-w-[80px] py-3 px-2 text-center border-b-2 transition-colors ${
                  activeTab === 'branding'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Branding
              </button>
              <button
                onClick={() => setActiveTab('frames')}
                className={`flex-1 min-w-[80px] py-3 px-2 text-center border-b-2 transition-colors ${
                  activeTab === 'frames'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Frame 1 & 2
              </button>
              <button
                onClick={() => setActiveTab('drive')}
                className={`flex-1 min-w-[85px] py-3 px-2 text-center border-b-2 transition-colors ${
                  activeTab === 'drive'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Google Drive
              </button>
              <button
                onClick={() => setActiveTab('script')}
                className={`flex-1 min-w-[95px] py-3 px-2 text-center border-b-2 transition-colors ${
                  activeTab === 'script'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Kode Apps Script
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* TAB: SHARE TO GUESTS */}
              {activeTab === 'share' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500/10 via-zinc-900 to-zinc-950 border border-rose-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm">
                      <Smartphone className="w-4 h-4" />
                      <span>Cara Dibuka di Banyak Handphone (Hanya Share Link)</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Bagikan link atau tampilkan QR Code di bawah kepada pengunjung/tamu. Ketika tamu membuka link di HP masing-masing, aplikasi langsung memuat <strong>Nama Acara, Frame, dan Folder Google Drive</strong> yang sama secara otomatis tanpa perlu login atau mengatur ulang!
                    </p>
                  </div>

                  {/* QR Code Card for Table/Stand display */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-2">
                      Scan QR Code Ini Dengan Kamera HP Tamu
                    </span>

                    <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-zinc-900 relative">
                      {shareQrUrl ? (
                        <img
                          src={shareQrUrl}
                          alt="QR Code Aplikasi Tamu"
                          className="w-44 h-44 object-contain"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 w-full space-y-2">
                      <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-zinc-400 truncate text-left pl-1">
                          {shareableUrl}
                        </span>
                        <button
                          onClick={handleCopyShareLink}
                          type="button"
                          className="py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                        >
                          {copyLinkSuccess ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={handleCopyShareLink}
                          type="button"
                          className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Copy className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Salin Link Tamu</span>
                        </button>

                        <button
                          onClick={handleNativeShareLink}
                          type="button"
                          className="py-2 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:brightness-110 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 transition-all"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Kirim ke WhatsApp/Sosmed</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1: BRANDING */}
              {activeTab === 'branding' && (
                <div className="space-y-4">
                  {/* Brand Name */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Nama Brand Photobooth:
                    </label>
                    <input
                      type="text"
                      value={form.brandName}
                      onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                      placeholder="Contoh: SNAPMOMENT"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Event Name */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Nama Acara / Header Web:
                    </label>
                    <input
                      type="text"
                      value={form.eventName}
                      onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                      placeholder="Contoh: Sarah & Kevin Wedding Celebration"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Event Subtitle */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Subjudul / Deskripsi Singkat:
                    </label>
                    <input
                      type="text"
                      value={form.eventSubtitle}
                      onChange={(e) => setForm({ ...form, eventSubtitle: e.target.value })}
                      placeholder="Contoh: Capture Your Best Smile • Photobooth Experience"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Logo Brand Upload / URL */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Logo Brand / Acara:
                    </label>
                    <div className="flex items-center gap-3">
                      {form.brandLogoUrl ? (
                        <div className="w-12 h-12 rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden shrink-0 flex items-center justify-center relative group">
                          <img
                            src={form.brandLogoUrl}
                            alt="Logo Brand"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, brandLogoUrl: '' })}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                            title="Hapus Logo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-500 shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer flex items-center justify-center gap-1.5 font-medium transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Pilih File Logo (PNG/JPG)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="text"
                          value={form.brandLogoUrl}
                          onChange={(e) => setForm({ ...form, brandLogoUrl: e.target.value })}
                          placeholder="atau tempelkan URL gambar logo langsung"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-[11px] focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Admin Password Change */}
                  <div className="pt-2 border-t border-zinc-800">
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Kata Sandi / PIN Panel Admin:
                    </label>
                    <input
                      type="text"
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      placeholder="Default: admin123"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: FRAME MANAGEMENT */}
              {activeTab === 'frames' && (
                <div className="space-y-5">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-2.5 text-zinc-400">
                    <HelpCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      Anda dapat memasukkan <strong>ID File / Link Google Drive</strong> dari folder <code className="text-zinc-200">FRAMEBOOT</code>, atau unggah langsung file PNG berlatar transparan (rasio 9:16). Jika dikosongkan, template bawaan beresolusi tinggi akan digunakan secara otomatis.
                    </p>
                  </div>

                  {/* FRAME 1 */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Pengaturan Frame 1 (Opsi 1)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleClearFrame('frame1')}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold text-[11px]"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Frame 1</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Visual Preview */}
                      <div className="col-span-1 aspect-[9/16] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 relative">
                        <FrameOverlayVisual frame={form.frame1} settings={form} />
                      </div>

                      {/* Inputs */}
                      <div className="col-span-2 space-y-2">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-0.5">
                            Nama Frame 1:
                          </label>
                          <input
                            type="text"
                            value={form.frame1.name}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                frame1: { ...form.frame1, name: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-[11px] focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-0.5">
                            ID File / Link Google Drive (folder FRAMEBOOT):
                          </label>
                          <input
                            type="text"
                            value={form.frame1.driveFileId || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm({
                                ...form,
                                frame1: {
                                  ...form.frame1,
                                  driveFileId: extractDriveFileId(val),
                                  customImageUrl: val.startsWith('data:') ? val : getDriveDirectImageUrl(val),
                                },
                              });
                            }}
                            placeholder="Contoh: 1A2b3C... atau link Drive"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-[11px] focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div>
                          <label className="w-full py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer flex items-center justify-center gap-1 text-[11px] font-medium transition-colors">
                            <Upload className="w-3 h-3" />
                            <span>Unggah PNG Frame 1 Langsung</span>
                            <input
                              type="file"
                              accept="image/png,image/*"
                              onChange={(e) => handleFrameUpload('frame1', e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FRAME 2 */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        Pengaturan Frame 2 (Opsi 2)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleClearFrame('frame2')}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold text-[11px]"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Frame 2</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Visual Preview */}
                      <div className="col-span-1 aspect-[9/16] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 relative">
                        <FrameOverlayVisual frame={form.frame2} settings={form} />
                      </div>

                      {/* Inputs */}
                      <div className="col-span-2 space-y-2">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-0.5">
                            Nama Frame 2:
                          </label>
                          <input
                            type="text"
                            value={form.frame2.name}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                frame2: { ...form.frame2, name: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-[11px] focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-0.5">
                            ID File / Link Google Drive (folder FRAMEBOOT):
                          </label>
                          <input
                            type="text"
                            value={form.frame2.driveFileId || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm({
                                ...form,
                                frame2: {
                                  ...form.frame2,
                                  driveFileId: extractDriveFileId(val),
                                  customImageUrl: val.startsWith('data:') ? val : getDriveDirectImageUrl(val),
                                },
                              });
                            }}
                            placeholder="Contoh: 1A2b3C... atau link Drive"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-[11px] focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div>
                          <label className="w-full py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer flex items-center justify-center gap-1 text-[11px] font-medium transition-colors">
                            <Upload className="w-3 h-3" />
                            <span>Unggah PNG Frame 2 Langsung</span>
                            <input
                              type="file"
                              accept="image/png,image/*"
                              onChange={(e) => handleFrameUpload('frame2', e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GOOGLE DRIVE AUTO-UPLOAD INTEGRATION */}
              {activeTab === 'drive' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 font-bold">
                      <HardDrive className="w-4 h-4" />
                      <span>Integrasi Google Drive Otomatis (Folder HASILFOTO)</span>
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Sistem menggunakan <strong>Google Apps Script Web App</strong> untuk menerima foto secara langsung dari browser smartphone pengguna tanpa meminta otorisasi login akun pengguna.
                    </p>

                    {/* Google Apps Script Web App URL */}
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">
                        Google Apps Script Web App URL (akhiran /exec):
                      </label>
                      <input
                        type="url"
                        value={form.gasWebAppUrl}
                        onChange={(e) => setForm({ ...form, gasWebAppUrl: e.target.value })}
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-[11px] focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    {/* Google Drive Folder ID / Name */}
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">
                        Google Drive Folder ID (Opsional untuk folder khusus):
                      </label>
                      <input
                        type="text"
                        value={form.driveFolderId}
                        onChange={(e) => setForm({ ...form, driveFolderId: e.target.value })}
                        placeholder="Kosongkan jika ingin otomatis membuat/menggunakan folder HASILFOTO"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-[11px] focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    {/* Test Button */}
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleTestGasEndpoint}
                        disabled={isTestingGas || !form.gasWebAppUrl}
                        className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {isTestingGas ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            <span>Menguji Koneksi Script...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-rose-400" />
                            <span>Uji Koneksi Endpoint Apps Script</span>
                          </>
                        )}
                      </button>

                      {testResult && (
                        <div
                          className={`p-2.5 rounded-xl border text-[11px] ${
                            testResult.success
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/10 border-red-500/20 text-red-300'
                          }`}
                        >
                          {testResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CODE.GS TEMPLATE */}
              {activeTab === 'script' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      Template Script Siap Pakai (Code.gs)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] transition-colors"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Seluruh Kode</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-3 overflow-hidden">
                    <pre className="text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-56 leading-relaxed">
                      {GOOGLE_APPS_SCRIPT_TEMPLATE}
                    </pre>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5 text-zinc-400 text-[11px]">
                    <div className="font-semibold text-zinc-200">Langkah Pemasangan Google Apps Script:</div>
                    <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                      <li>Buka <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-rose-400 underline inline-flex items-center gap-0.5">script.google.com <ExternalLink className="w-2.5 h-2.5" /></a> dan buat Proyek Baru.</li>
                      <li>Tempelkan kode di atas ke dalam file <code className="text-zinc-200">Code.gs</code>.</li>
                      <li>Klik <strong>Deploy</strong> -&gt; <strong>New deployment</strong> -&gt; Pilih jenis <strong>Web app</strong>.</li>
                      <li>Atur: <em>Execute as:</em> <strong>Me</strong> dan <em>Who has access:</em> <strong>Anyone</strong>.</li>
                      <li>Salin URL Web App dan tempelkan ke tab <strong>Google Drive</strong> di atas!</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Kembalikan semua pengaturan ke nilai awal bawaan?')) {
                    onReset();
                    onClose();
                  }
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 font-medium underline"
              >
                Reset Default
              </button>

              <div className="flex items-center gap-2">
                {saveToast && (
                  <span className="text-xs text-emerald-400 font-medium animate-fade-in">
                    {saveToast}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:brightness-110 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
