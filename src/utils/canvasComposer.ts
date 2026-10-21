import { AppSettings, ColorFilter, FrameConfig } from '../types';
import { getDriveDirectImageUrl } from './googleDrive';
import { getFilterDefinition } from './filters';

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

/**
 * Loads an image from a URL or data URL and handles CORS.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for remote URLs to avoid issues with data URLs
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image from source: ${e}`));
    img.src = src;
  });
}

/**
 * Draws the photo onto the canvas with proper aspect ratio cover, optional horizontal flip,
 * and applied image filter (Original, Black & White, Vintage).
 */
function drawPhotoCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement,
  mirror: boolean,
  colorFilter: ColorFilter = 'beauty',
  photoArea?: { x: number; y: number; width: number; height: number }
) {
  const targetX = photoArea?.x ?? 0;
  const targetY = photoArea?.y ?? 0;
  const targetWidth = photoArea?.width ?? CANVAS_WIDTH;
  const targetHeight = photoArea?.height ?? CANVAS_HEIGHT;

  const srcWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const srcHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  if (!srcWidth || !srcHeight) return;

  // Calculate object-fit: cover
  const srcRatio = srcWidth / srcHeight;
  const targetRatio = targetWidth / targetHeight;

  let sWidth = srcWidth;
  let sHeight = srcHeight;
  let sx = 0;
  let sy = 0;

  if (srcRatio > targetRatio) {
    // Source is wider than target -> crop sides
    sWidth = srcHeight * targetRatio;
    sx = (srcWidth - sWidth) / 2;
  } else {
    // Source is taller than target -> crop top/bottom
    sHeight = srcWidth / targetRatio;
    sy = (srcHeight - sHeight) / 2;
  }

  ctx.save();

  // Apply Canvas color filter to photo only
  const filterDef = getFilterDefinition(colorFilter);
  if (filterDef.canvasFilter && filterDef.canvasFilter !== 'none') {
    ctx.filter = filterDef.canvasFilter;
  } else {
    ctx.filter = 'none';
  }

  // Clip to target area if customized
  ctx.beginPath();
  ctx.rect(targetX, targetY, targetWidth, targetHeight);
  ctx.clip();

  if (mirror) {
    ctx.translate(targetX + targetWidth, targetY);
    ctx.scale(-1, 1);
    ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
  } else {
    ctx.drawImage(source, sx, sy, sWidth, sHeight, targetX, targetY, targetWidth, targetHeight);
  }

  ctx.restore();

  // Always reset filter for subsequent drawings
  ctx.filter = 'none';
}

/**
 * Renders built-in Frame 1: Classic Ivory Luxe (Clean Korean Photobooth / Minimalist Aesthetic)
 */
export function drawClassicFrame(ctx: CanvasRenderingContext2D, settings: AppSettings) {
  ctx.save();
  ctx.filter = 'none';

  const margin = 48;
  const bottomBarHeight = 240;
  const photoBottom = CANVAS_HEIGHT - margin - bottomBarHeight;

  // Solid bottom plate for metadata
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(margin, photoBottom, CANVAS_WIDTH - margin * 2, bottomBarHeight);

  // Outer framing overlay border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = margin;
  ctx.strokeRect(margin / 2, margin / 2, CANVAS_WIDTH - margin, CANVAS_HEIGHT - margin);

  // Delicate inner hairline border
  ctx.strokeStyle = '#d4af37'; // subtle champagne gold
  ctx.lineWidth = 3;
  ctx.strokeRect(margin + 12, margin + 12, CANVAS_WIDTH - (margin + 12) * 2, photoBottom - (margin + 12));

  // Corner decorative marks
  const cornerSize = 24;
  ctx.fillStyle = '#d4af37';
  // Top left
  ctx.fillRect(margin + 16, margin + 16, cornerSize, 3);
  ctx.fillRect(margin + 16, margin + 16, 3, cornerSize);
  // Top right
  ctx.fillRect(CANVAS_WIDTH - margin - 16 - cornerSize, margin + 16, cornerSize, 3);
  ctx.fillRect(CANVAS_WIDTH - margin - 16 - 3, margin + 16, 3, cornerSize);

  // Bottom card divider line
  ctx.strokeStyle = '#f1f1f1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + 24, photoBottom);
  ctx.lineTo(CANVAS_WIDTH - margin - 24, photoBottom);
  ctx.stroke();

  // Branding Typography in bottom plate
  const centerX = CANVAS_WIDTH / 2;

  // Brand Name
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.fillText((settings.brandName || 'SNAPMOMENT').toUpperCase(), centerX, photoBottom + 70);

  // Event Name
  ctx.fillStyle = '#b45309'; // warm amber gold
  ctx.font = 'italic 600 44px "Playfair Display", Georgia, serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(settings.eventName || 'Special Celebration', centerX, photoBottom + 130);

  // Date & Subtitle
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  ctx.fillStyle = '#71717a';
  ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText(`• ${dateStr.toUpperCase()} • MEMORY EDITION •`, centerX, photoBottom + 185);

  ctx.restore();
}

/**
 * Renders built-in Frame 2: Cyber Party Glow (Vibrant Neon / Dark Club / Modern Aesthetic)
 */
export function drawNeonFrame(ctx: CanvasRenderingContext2D, settings: AppSettings) {
  ctx.save();
  ctx.filter = 'none';

  const margin = 44;
  const bottomBarHeight = 220;
  const photoBottom = CANVAS_HEIGHT - margin - bottomBarHeight;

  // Dark bottom strip with frosted glass vibe
  ctx.fillStyle = 'rgba(9, 9, 11, 0.94)';
  ctx.fillRect(margin, photoBottom, CANVAS_WIDTH - margin * 2, bottomBarHeight);

  // Outer framing border
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = margin;
  ctx.strokeRect(margin / 2, margin / 2, CANVAS_WIDTH - margin, CANVAS_HEIGHT - margin);

  // Glowing neon gradient border
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#f43f5e'); // Rose
  gradient.addColorStop(0.5, '#a855f7'); // Purple
  gradient.addColorStop(1, '#06b6d4'); // Cyan

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 6;
  ctx.strokeRect(margin + 8, margin + 8, CANVAS_WIDTH - (margin + 8) * 2, photoBottom - (margin + 8));

  // Futuristic HUD Corner Brackets
  const bracketLen = 40;
  const bracketThick = 5;
  ctx.fillStyle = '#ffffff';

  // TL
  ctx.fillRect(margin + 20, margin + 20, bracketLen, bracketThick);
  ctx.fillRect(margin + 20, margin + 20, bracketThick, bracketLen);
  // TR
  ctx.fillRect(CANVAS_WIDTH - margin - 20 - bracketLen, margin + 20, bracketLen, bracketThick);
  ctx.fillRect(CANVAS_WIDTH - margin - 20 - bracketThick, margin + 20, bracketThick, bracketLen);
  // BL
  ctx.fillRect(margin + 20, photoBottom - 20 - bracketThick, bracketLen, bracketThick);
  ctx.fillRect(margin + 20, photoBottom - 20 - bracketLen, bracketThick, bracketLen);
  // BR
  ctx.fillRect(CANVAS_WIDTH - margin - 20 - bracketLen, photoBottom - 20 - bracketThick, bracketLen, bracketThick);
  ctx.fillRect(CANVAS_WIDTH - margin - 20 - bracketThick, photoBottom - 20 - bracketLen, bracketThick, bracketLen);

  // Top header status badges (Rec indicator)
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(margin + 40, margin + 48, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px "Plus Jakarta Sans", monospace';
  ctx.textAlign = 'left';
  ctx.letterSpacing = '3px';
  ctx.fillText('REC [9:16]', margin + 60, margin + 56);

  ctx.textAlign = 'right';
  ctx.fillText('SNAP BOOTH 2.0', CANVAS_WIDTH - margin - 40, margin + 56);

  // Center crosshair watermark
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  const centerX = CANVAS_WIDTH / 2;
  const centerY = (photoBottom + margin) / 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 16, centerY);
  ctx.lineTo(centerX + 16, centerY);
  ctx.moveTo(centerX, centerY - 16);
  ctx.lineTo(centerX, centerY + 16);
  ctx.stroke();

  // Bottom Typography
  // Neon Brand Name
  ctx.fillStyle = '#f43f5e';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '8px';
  ctx.fillText((settings.brandName || 'SNAPMOMENT').toUpperCase(), centerX, photoBottom + 65);

  // Event Name with neon cyan
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 42px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(settings.eventName || 'AFTER PARTY NIGHT', centerX, photoBottom + 125);

  // Barcode / Timecode line
  const timeCode = new Date().toLocaleTimeString('id-ID', { hour12: false });
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '600 22px monospace';
  ctx.letterSpacing = '4px';
  ctx.fillText(`ID #SB-${timeCode.replace(/:/g, '')} • ALL ACCESS PASS`, centerX, photoBottom + 180);

  ctx.restore();
}

/**
 * Composite the captured video or photo with the selected frame and color filter into a high resolution 1080x1920 canvas.
 */
export async function compositePhoto(
  source: HTMLVideoElement | HTMLImageElement,
  frame: FrameConfig,
  settings: AppSettings,
  mirror: boolean = true,
  colorFilter: ColorFilter = 'beauty'
): Promise<{ dataUrl: string; blob: Blob }> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not get 2D canvas context');
  }

  // 1. Draw black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. Draw Camera Photo with Cover, Mirroring and Color Filter
  let photoArea = { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

  // If using built-in frames, photo sits neatly above the bottom card
  if (!frame.customImageUrl && !frame.driveFileId) {
    if (frame.theme === 'classic') {
      const margin = 48;
      const bottomBarHeight = 240;
      photoArea = {
        x: margin,
        y: margin,
        width: CANVAS_WIDTH - margin * 2,
        height: CANVAS_HEIGHT - margin * 2 - bottomBarHeight,
      };
    } else if (frame.theme === 'neon') {
      const margin = 44;
      const bottomBarHeight = 220;
      photoArea = {
        x: margin,
        y: margin,
        width: CANVAS_WIDTH - margin * 2,
        height: CANVAS_HEIGHT - margin * 2 - bottomBarHeight,
      };
    }
  }

  drawPhotoCover(ctx, source, mirror, colorFilter, photoArea);

  // Ensure filter is none for frame overlay
  ctx.filter = 'none';

  // 3. Draw Frame Overlay
  const customImgSrc = frame.customImageUrl || (frame.driveFileId ? getDriveDirectImageUrl(frame.driveFileId) : null);

  if (customImgSrc) {
    try {
      const overlayImg = await loadImage(customImgSrc);
      ctx.drawImage(overlayImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } catch (err) {
      console.warn('Failed to load custom frame image, falling back to built-in frame:', err);
      // Fallback to built-in
      if (frame.id === 'frame2') {
        drawNeonFrame(ctx, settings);
      } else {
        drawClassicFrame(ctx, settings);
      }
    }
  } else {
    // Render built-in aesthetic frame
    if (frame.id === 'frame2' || frame.theme === 'neon') {
      drawNeonFrame(ctx, settings);
    } else {
      drawClassicFrame(ctx, settings);
    }
  }

  // 4. Generate Output (PNG for crisp transparent borders & typography)
  const dataUrl = canvas.toDataURL('image/png', 0.95);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas to Blob failed'));
    }, 'image/png', 0.95);
  });

  return { dataUrl, blob };
}
