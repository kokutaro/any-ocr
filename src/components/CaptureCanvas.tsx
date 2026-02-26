import { Camera, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface CaptureCanvasProps {
  onCaptureRegion: (imageDataUrl: string) => void;
  setStatus: (status: "idle" | "capturing" | "processing" | "error") => void;
  captureTrigger?: number;
  previewImage?: string | null;
  onClearPreview?: () => void;
}

export const CaptureCanvas: React.FC<CaptureCanvasProps> = ({
  onCaptureRegion,
  setStatus,
  captureTrigger,
  previewImage,
  onClearPreview,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  const [isCapturing, setIsCapturing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const drawIdleState = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (previewImage) {
        const img = new Image();
        img.onload = () => {
          // Clear background (slate-900)
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const imgRatio = img.width / img.height;
          const canvasRatio = canvas.width / canvas.height;
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;
          let offsetX = 0;
          let offsetY = 0;

          if (imgRatio > canvasRatio) {
            drawHeight = canvas.width / imgRatio;
            offsetY = (canvas.height - drawHeight) / 2;
          } else {
            drawWidth = canvas.height * imgRatio;
            offsetX = (canvas.width - drawWidth) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        };
        img.src = previewImage;
      } else {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "16px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          'Press "Screen Capture" or Use Ctrl+V',
          canvas.width / 2,
          canvas.height / 2,
        );
      }
    },
    [previewImage],
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCapturing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCapturing || !startPos || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(e.clientX - rect.left, canvasRef.current.width),
    );
    const y = Math.max(
      0,
      Math.min(e.clientY - rect.top, canvasRef.current.height),
    );
    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (
      !isCapturing ||
      !startPos ||
      !currentPos ||
      !canvasRef.current ||
      !videoRef.current
    ) {
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    // Minimum crop size check
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    if (width < 20 || height < 20) {
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    // Perform capture of the selected area
    const canvas = canvasRef.current;
    const video = videoRef.current;

    // We need an offscreen canvas to get the precise image data
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offCtx = offscreenCanvas.getContext("2d");

    if (offCtx) {
      // Calculate original video coordinates corresponding to canvas crop region
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = canvas.width / canvas.height;

      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoRatio > canvasRatio) {
        drawHeight = canvas.width / videoRatio;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        drawWidth = canvas.height * videoRatio;
        offsetX = (canvas.width - drawWidth) / 2;
      }

      const startX = Math.min(startPos.x, currentPos.x);
      const startY = Math.min(startPos.y, currentPos.y);
      const endX = Math.max(startPos.x, currentPos.x);
      const endY = Math.max(startPos.y, currentPos.y);

      // Clamp to actual video projected area (offsetX, offsetY -> width, height)
      const clampedX = Math.max(offsetX, Math.min(startX, offsetX + drawWidth));
      const clampedY = Math.max(
        offsetY,
        Math.min(startY, offsetY + drawHeight),
      );
      const clampedEndX = Math.max(
        offsetX,
        Math.min(endX, offsetX + drawWidth),
      );
      const clampedEndY = Math.max(
        offsetY,
        Math.min(endY, offsetY + drawHeight),
      );

      const finalWidth = Math.abs(clampedEndX - clampedX);
      const finalHeight = Math.abs(clampedEndY - clampedY);

      if (finalWidth < 20 || finalHeight < 20) {
        // Crop area is outside video or too small
        setStartPos(null);
        setCurrentPos(null);
        return;
      }

      // Scale coordinates back to video resolution
      const scaleX = video.videoWidth / drawWidth;
      const scaleY = video.videoHeight / drawHeight;

      const sourceX = (clampedX - offsetX) * scaleX;
      const sourceY = (clampedY - offsetY) * scaleY;
      const sourceWidth = finalWidth * scaleX;
      const sourceHeight = finalHeight * scaleY;

      const targetWidth = Math.max(1, Math.floor(sourceWidth));
      const targetHeight = Math.max(1, Math.floor(sourceHeight));

      // Update offscreen canvas to match the native video cropped size
      // This is critical: if we use finalWidth/finalHeight, we aggressively
      // downscale the image to the UI CSS bounds, making text blurry and
      // causing Tesseract to hang indefinitely on noise patterns.
      offscreenCanvas.width = targetWidth;
      offscreenCanvas.height = targetHeight;

      // Fill with white to avoid any transparency issues
      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, targetWidth, targetHeight);

      offCtx.drawImage(
        video,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );

      const imageDataUrl = offscreenCanvas.toDataURL("image/png");
      stopCapture();
      onCaptureRegion(imageDataUrl);
    }
  };

  const drawVideoFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const video = videoRef.current;

    if (
      !canvas ||
      !ctx ||
      !video ||
      video.readyState < 2 // HAVE_CURRENT_DATA
    ) {
      if (isCapturing) {
        animationRef.current = requestAnimationFrame(drawVideoFrame);
      }
      return;
    }

    // Calculate aspect ratio fit
    const videoRatio = video.videoWidth / video.videoHeight;
    const canvasRatio = canvas.width / canvas.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    if (videoRatio > canvasRatio) {
      drawHeight = canvas.width / videoRatio;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawWidth = canvas.height * videoRatio;
      offsetX = (canvas.width - drawWidth) / 2;
    }

    // Clear background (black for letterboxing)
    ctx.fillStyle = "#0f172a"; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw video
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

    // Draw crop selection overlay if dragging
    if (startPos && currentPos) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      // Correct dimming logic:
      // Redraw the entire video frame first
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0f172a"; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

      // Draw 4 rectangles around the selection to dim the rest
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvas.width, y); // Top
      ctx.fillRect(0, y, x, height); // Left
      ctx.fillRect(x + width, y, canvas.width - (x + width), height); // Right
      ctx.fillRect(0, y + height, canvas.width, canvas.height - (y + height)); // Bottom

      // Draw blue border around selection
      ctx.strokeStyle = "#3b82f6"; // blue-500
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    }

    animationRef.current = requestAnimationFrame(drawVideoFrame);
  }, [isCapturing, startPos, currentPos]);

  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;

        if (!isCapturing && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) drawIdleState(ctx, canvasRef.current);
        }
      }
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isCapturing, drawIdleState]);

  useEffect(() => {
    if (isCapturing) {
      animationRef.current = requestAnimationFrame(drawVideoFrame);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) drawIdleState(ctx, canvasRef.current);
      }
    }
  }, [isCapturing, drawVideoFrame, drawIdleState]);

  const stopCapture = useCallback(() => {
    setIsCapturing(false);
    setStartPos(null);
    setCurrentPos(null);
    setStatus("idle");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [setStatus]);

  useEffect(() => {
    if (captureTrigger && captureTrigger > 0 && !isCapturing) {
      handleStartCapture();
    }
  }, [captureTrigger]);

  const handleStartCapture = async () => {
    try {
      if (onClearPreview) onClearPreview();
      setStatus("capturing");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });

      streamRef.current = stream;

      // Stop capture if user clicks 'Stop sharing' on browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };

      // Add a slight delay to allow the browser to fully establish the capture stream
      // before trying to play it, which avoids some browser-specific racing conditions.
      setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) await videoRef.current.play();
          } catch (e) {
            console.error("Video play failed:", e);
          }
          setIsCapturing(true);
          setStatus("idle"); // Status returns to idle when stream is ready and displayed
        };
      }, 300);
    } catch (err) {
      console.error("Error starting capture:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="w-full aspect-video bg-white rounded-xl border-2 border-dashed border-slate-300 relative overflow-hidden group max-h-full max-w-full m-auto shadow-sm">
      {/* Hidden video element to ensure the browser processes the stream */}
      <video ref={videoRef} className="hidden" muted playsInline autoPlay />

      <div
        ref={containerRef}
        className="flex-1 w-full h-full relative cursor-crosshair select-none touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Floating action bar - visibility controlled by opacity */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/95 backdrop-blur-md shadow-lg px-4 py-3 rounded-2xl border border-slate-200 opacity-90 transition-opacity group-hover:opacity-100">
        {isCapturing ? (
          <button
            onClick={stopCapture}
            className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
          >
            <X size={18} />
            <span>Cancel Capture</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleStartCapture}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
            >
              <Camera size={18} />
              <span>Screen Capture</span>
            </button>
          </>
        )}
      </div>

      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-xs font-semibold text-slate-500 px-2.5 py-1 rounded-md border border-slate-200/50 shadow-sm pointer-events-none">
        {isCapturing ? "Drag to select region" : "Shortcut: C"}
      </div>
    </div>
  );
};
