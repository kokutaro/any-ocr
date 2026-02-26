import { CheckCircle2, Copy } from "lucide-react";
import React from "react";

interface OcrResultProps {
  text: string;
  setText: (text: string) => void;
  isLoading?: boolean;
  progressMsg?: string;
}

export const OcrResult: React.FC<OcrResultProps> = ({
  text,
  setText,
  isLoading,
  progressMsg,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 relative">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span>Result</span>
          {isLoading && progressMsg && (
            <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {progressMsg}
            </span>
          )}
        </h2>
        <button
          onClick={handleCopy}
          disabled={!text || isLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            copied
              ? "bg-green-100 text-green-700"
              : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {copied ? (
            <>
              <CheckCircle2 size={16} /> Copied!
            </>
          ) : (
            <>
              <Copy size={16} /> Copy
            </>
          )}
        </button>
      </div>

      <div className="flex-1 relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            isLoading
              ? progressMsg || "Extracting text..."
              : "OCR result will appear here..."
          }
          disabled={isLoading}
          className={`w-full h-full resize-none p-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/50 ${
            isLoading ? "opacity-50 animate-pulse bg-slate-50" : ""
          }`}
        />
      </div>
    </div>
  );
};
