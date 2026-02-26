import { useCallback, useEffect, useState } from "react";
import { CaptureCanvas } from "./components/CaptureCanvas";
import { Header, type LanguageCode } from "./components/Header";
import { OcrResult } from "./components/OcrResult";
import { performOcr } from "./utils/ocr";

function App() {
  const [lang, setLang] = useState<LanguageCode>("jpn+eng");
  const [status, setStatus] = useState<
    "idle" | "capturing" | "processing" | "error"
  >("idle");
  const [ocrText, setOcrText] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Layout state
  const [leftWidth, setLeftWidth] = useState(60); // 60% initially
  const [isDragging, setIsDragging] = useState(false);

  // Expose a trigger to start capture programmatically
  const [captureTrigger, setCaptureTrigger] = useState(0);

  const handleCaptureRegion = async (imageDataUrl: string) => {
    setStatus("processing");
    setProgressMsg("Starting OCR...");
    setPreviewImage(imageDataUrl);
    try {
      const text = await performOcr(imageDataUrl, lang, (p, s) => {
        setProgressMsg(`${s} (${Math.round(p * 100)}%)`);
      });
      setOcrText(text);
      setStatus("idle");
      setProgressMsg("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setOcrText("OCR Processing failed. Please try again.");
      setProgressMsg("");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newLeftWidth = (e.clientX / window.innerWidth) * 100;
      // clamp between 20% and 80%
      setLeftWidth(Math.max(20, Math.min(newLeftWidth, 80)));
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 'c' or 'C' triggers screen capture if not typing in an input/textarea
      if (
        e.key.toLowerCase() === "c" &&
        e.target instanceof Element &&
        e.target.tagName !== "TEXTAREA" &&
        e.target.tagName !== "INPUT"
      ) {
        setCaptureTrigger((t) => t + 1);
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              if (dataUrl) handleCaptureRegion(dataUrl);
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("paste", handlePaste);
    };
  }, [lang]); // Depend on lang so handlePaste gets the latest handleCaptureRegion closure

  return (
    <div className="h-screen w-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      <Header selectedLang={lang} onLangChange={setLang} status={status} />

      <main className="flex-1 p-6 flex flex-col md:flex-row min-h-0 overflow-hidden items-stretch">
        {/* Left column: Capture Area */}
        <section
          className="min-w-0 flex flex-col h-full rounded-2xl overflow-hidden shadow-sm bg-white p-2 w-full md:w-[var(--left-width)] flex-shrink-0"
          style={
            {
              "--left-width": `calc(${leftWidth}%)`,
            } as React.CSSProperties
          }
        >
          <div className="flex-1 w-full h-full flex items-center justify-center p-2 bg-slate-50 overflow-hidden rounded-xl">
            <CaptureCanvas
              onCaptureRegion={handleCaptureRegion}
              setStatus={setStatus}
              captureTrigger={captureTrigger}
              previewImage={previewImage}
              onClearPreview={() => setPreviewImage(null)}
            />
          </div>
        </section>

        {/* Column Resizer */}
        <div
          className="hidden md:flex w-6 h-full cursor-col-resize items-center justify-center group z-10 shrink-0 mx-[-12px]"
          onMouseDown={() => setIsDragging(true)}
        >
          <div className="w-1.5 h-16 bg-slate-300 group-hover:bg-blue-400 rounded-full transition-colors" />
        </div>

        {/* Right column: Results Area */}
        <section
          className="min-w-0 h-full flex flex-col shadow-sm rounded-2xl w-full md:w-[var(--right-width)] flex-shrink-0 flex-1 md:flex-none"
          style={
            {
              "--right-width": `calc(${100 - leftWidth}%)`,
            } as React.CSSProperties
          }
        >
          <OcrResult
            text={ocrText}
            setText={setOcrText}
            isLoading={status === "processing"}
            progressMsg={progressMsg}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
