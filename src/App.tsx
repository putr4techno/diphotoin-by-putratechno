/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AppSettings, AppView, ColorFilter, FrameConfig } from './types';
import { loadSettings, saveSettings, resetSettings } from './utils/storage';
import { compositePhoto } from './utils/canvasComposer';
import { Header } from './components/Header';
import { FrameSelector } from './components/FrameSelector';
import { CameraCapture } from './components/CameraCapture';
import { PhotoPreview } from './components/PhotoPreview';
import { AdminModal } from './components/AdminModal';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [view, setView] = useState<AppView>('select-frame');
  const [selectedFrameId, setSelectedFrameId] = useState<'frame1' | 'frame2' | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<ColorFilter>('original');
  const [isCompositing, setIsCompositing] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Active selected frame object
  const activeFrame: FrameConfig =
    selectedFrameId === 'frame2' ? settings.frame2 : settings.frame1;

  // Handle frame selection
  const handleSelectFrame = (id: 'frame1' | 'frame2') => {
    setSelectedFrameId(id);
  };

  // Start photo session
  const handleStartPhoto = () => {
    if (!selectedFrameId) return;
    setView('camera');
  };

  // Photo captured from camera with filter
  const handleCaptured = async (
    source: HTMLVideoElement | HTMLImageElement,
    mirror: boolean,
    filter: ColorFilter = 'original'
  ) => {
    setIsCompositing(true);
    setAppliedFilter(filter);
    try {
      const result = await compositePhoto(source, activeFrame, settings, mirror, filter);
      setPhotoDataUrl(result.dataUrl);
      setView('preview');
    } catch (err) {
      console.error('Compositing failed:', err);
      alert('Gagal memproses penggabungan foto. Silakan coba kembali.');
    } finally {
      setIsCompositing(false);
    }
  };

  // Retake photo with same frame
  const handleRetake = () => {
    setPhotoDataUrl(null);
    setView('camera');
  };

  // Change frame
  const handleChangeFrame = () => {
    setPhotoDataUrl(null);
    setView('select-frame');
  };

  // Save admin settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Reset settings
  const handleResetSettings = () => {
    const defaults = resetSettings();
    setSettings(defaults);
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Decorative ambient background glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[340px] h-[220px] bg-rose-600/10 blur-[100px] pointer-events-none rounded-full"></div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[340px] h-[220px] bg-cyan-600/10 blur-[100px] pointer-events-none rounded-full"></div>

      {/* Header */}
      <Header
        settings={settings}
        onOpenAdmin={() => setIsAdminOpen(true)}
        compact={view !== 'select-frame'}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-lg mx-auto">
        {view === 'select-frame' && (
          <FrameSelector
            settings={settings}
            selectedFrameId={selectedFrameId}
            onSelectFrame={handleSelectFrame}
            onStartPhoto={handleStartPhoto}
          />
        )}

        {view === 'camera' && (
          <CameraCapture
            settings={settings}
            frame={activeFrame}
            onCaptured={handleCaptured}
            onBack={() => setView('select-frame')}
          />
        )}

        {view === 'preview' && photoDataUrl && (
          <PhotoPreview
            photoDataUrl={photoDataUrl}
            frame={activeFrame}
            settings={settings}
            appliedFilter={appliedFilter}
            onRetake={handleRetake}
            onChangeFrame={handleChangeFrame}
            onOpenAdmin={() => setIsAdminOpen(true)}
          />
        )}
      </main>

      {/* High-res Compositing Loader Overlay */}
      {isCompositing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <h4 className="text-sm font-bold text-white tracking-wide">
              Menyatukan Foto 9:16 Resolusi Tinggi...
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Merender 1080 x 1920 piksel dengan frame & filter presisi
            </p>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onReset={handleResetSettings}
      />
    </div>
  );
}
