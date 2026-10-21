import { ColorFilter, FrameConfig, AppSettings } from '../types';
import { getFilterDefinition } from './filters';
import { drawClassicFrame, drawNeonFrame, loadImage } from './canvasComposer';
import { getDriveDirectImageUrl } from './googleDrive';

export interface BoomerangResult {
  videoBlob: Blob;
  videoUrl: string;
  posterDataUrl: string;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Capture high-frequency snapshots from video stream for boomerang.
 */
export async function captureBoomerangFrames(
  video: HTMLVideoElement,
  options: {
    durationMs?: number;
    fps?: number;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<ImageBitmap[]> {
  const durationMs = options.durationMs || 1500; // 1.5 seconds capture
  const fps = options.fps || 20; // 20 frames per second
  const totalFrames = Math.round((durationMs / 1000) * fps); // ~30 frames
  const intervalMs = durationMs / totalFrames;

  const width = video.videoWidth || 720;
  const height = video.videoHeight || 1280;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

  const bitmaps: ImageBitmap[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const startTime = performance.now();

    if (tempCtx) {
      tempCtx.drawImage(video, 0, 0, width, height);
      try {
        const bitmap = await createImageBitmap(tempCanvas);
        bitmaps.push(bitmap);
      } catch (err) {
        console.warn('Could not create ImageBitmap, drawing fallback:', err);
      }
    }

    if (options.onProgress) {
      options.onProgress(Math.round(((i + 1) / totalFrames) * 100));
    }

    const elapsed = performance.now() - startTime;
    const wait = Math.max(0, intervalMs - elapsed);
    if (wait > 0 && i < totalFrames - 1) {
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  return bitmaps;
}

/**
 * Composites the boomerang frames with mirror, filter, and frame overlay,
 * then records a seamless forward-and-reverse looping video.
 */
export async function createBoomerangVideo(
  frames: ImageBitmap[],
  options: {
    frame: FrameConfig;
    settings: AppSettings;
    mirror: boolean;
    colorFilter: ColorFilter;
    loops?: number;
    fps?: number;
  }
): Promise<BoomerangResult> {
  const { frame, settings, mirror, colorFilter, loops = 2, fps = 24 } = options;

  if (frames.length === 0) {
    throw new Error('No frames captured for boomerang');
  }

  const width = frames[0].width;
  const height = frames[0].height;

  // Build the forward-backward loop sequence
  // e.g. [0, 1, 2, ..., n-1, n-2, ..., 1]
  const forwardSequence = frames.map((_, idx) => idx);
  const backwardSequence = frames.slice(1, -1).map((_, idx) => frames.length - 2 - idx);
  const singleLoop = [...forwardSequence, ...backwardSequence];

  // Repeat for the desired number of loops (e.g. 2 times => ~3.5 seconds)
  const fullSequence: number[] = [];
  for (let l = 0; l < loops; l++) {
    fullSequence.push(...singleLoop);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not create 2D canvas context for boomerang');
  }

  // Pre-load custom frame overlay image if applicable
  let customOverlayImg: HTMLImageElement | null = null;
  const customImgSrc = frame.customImageUrl || (frame.driveFileId ? getDriveDirectImageUrl(frame.driveFileId) : null);
  if (customImgSrc) {
    try {
      customOverlayImg = await loadImage(customImgSrc);
    } catch (err) {
      console.warn('Could not load custom frame for boomerang:', err);
    }
  }

  // Render a single frame with filter & overlay
  const renderFrameToCanvas = (bitmap: ImageBitmap) => {
    ctx.save();

    // 1. Clear background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // 2. Apply color filter to photo
    const filterDef = getFilterDefinition(colorFilter);
    if (filterDef.canvasFilter && filterDef.canvasFilter !== 'none') {
      ctx.filter = filterDef.canvasFilter;
    } else {
      ctx.filter = 'none';
    }

    // 3. Draw video frame with optional mirror
    if (mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(bitmap, 0, 0, width, height);
    } else {
      ctx.drawImage(bitmap, 0, 0, width, height);
    }

    ctx.restore();
    ctx.filter = 'none';

    // 4. Draw frame overlay on top
    if (customOverlayImg) {
      ctx.drawImage(customOverlayImg, 0, 0, width, height);
    } else {
      if (frame.id === 'frame2' || frame.theme === 'neon') {
        drawNeonFrame(ctx, settings);
      } else {
        drawClassicFrame(ctx, settings);
      }
    }
  };

  // Render first frame as poster thumbnail
  renderFrameToCanvas(frames[0]);
  const posterDataUrl = canvas.toDataURL('image/png', 0.95);

  // Determine optimal supported MIME type
  let mimeType = 'video/mp4';
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }
  }

  // Record video from canvas
  const stream = canvas.captureStream ? canvas.captureStream(fps) : null;
  if (!stream || typeof MediaRecorder === 'undefined') {
    // If MediaRecorder is not supported, return poster as fallback
    const dummyBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b || new Blob()), 'image/png'));
    return {
      videoBlob: dummyBlob,
      videoUrl: posterDataUrl,
      posterDataUrl,
      mimeType: 'image/png',
      width,
      height,
    };
  }

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2500000, // 2.5 Mbps crisp quality
  });

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType.split(';')[0] });
      resolve(blob);
    };
    mediaRecorder.onerror = (err) => reject(err);
  });

  mediaRecorder.start();

  // Play through the sequence at the given FPS
  const frameDurationMs = 1000 / fps;
  for (let i = 0; i < fullSequence.length; i++) {
    const frameIndex = fullSequence[i];
    renderFrameToCanvas(frames[frameIndex]);
    await new Promise((r) => setTimeout(r, frameDurationMs));
  }

  // Small delay to ensure the last frame registers
  await new Promise((r) => setTimeout(r, 100));
  mediaRecorder.stop();

  const videoBlob = await recordingPromise;
  const videoUrl = URL.createObjectURL(videoBlob);

  // Clean up bitmap memory
  frames.forEach((b) => {
    try {
      b.close();
    } catch {
      // ignore
    }
  });

  return {
    videoBlob,
    videoUrl,
    posterDataUrl,
    mimeType: mimeType.split(';')[0],
    width,
    height,
  };
}
