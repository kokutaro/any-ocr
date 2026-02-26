import React from "react";

export const LANGUAGES = [
  { code: "jpn+eng", label: "日本語" },
  { code: "eng", label: "English" },
  { code: "kor+eng", label: "한국어" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

interface HeaderProps {
  selectedLang: LanguageCode;
  onLangChange: (lang: LanguageCode) => void;
  status: "idle" | "capturing" | "processing" | "error";
}

export const Header: React.FC<HeaderProps> = ({
  selectedLang,
  onLangChange,
  status,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="bg-slate-900 text-white font-bold px-2 py-1 rounded text-sm tracking-widest">
          any
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">OCR</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {status === "capturing" && (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
          {status === "processing" && (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          )}
          <span className="text-sm font-medium text-slate-500 capitalize min-w-[80px] text-right">
            {status}
          </span>
        </div>

        <div className="h-6 w-px bg-slate-200"></div>

        <select
          value={selectedLang}
          onChange={(e) => onLangChange(e.target.value as LanguageCode)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};
