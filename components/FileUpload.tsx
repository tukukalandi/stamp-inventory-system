
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { RawRow, ReportMetadata, MASTER_OFFICE_LIST } from '../types';
import { Upload, AlertCircle, Link, Globe, Files, Loader2, CheckCircle2, Database, Info, Clock, Sparkles, PlusCircle } from 'lucide-react';
import { parseGoogleSheetUrl, normalizeData, formatDateIndian } from '../utils/helpers';

interface InventorySummary {
  officeId: string;
  officeName: string;
  minDate: string;
  maxDate: string;
  rowCount: number;
}

interface FileUploadProps {
  onDataLoaded: (data: RawRow[], meta: ReportMetadata) => void;
  isAppendMode?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, isAppendMode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAndFinalize = (jsonData: any[]) => {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error("The data source is empty.");
    }

    const normalized = normalizeData(jsonData);
    
    // Auto-detect date range from data
    const dates = normalized
      .map(r => r.trans_date)
      .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const meta: ReportMetadata = {
      periodName: 'Consolidated Report',
      divisionName: 'Dhenkanal Division', // Default
      fromDate: dates.length > 0 ? formatDateIndian(dates[0]) : 'N/A',
      toDate: dates.length > 0 ? formatDateIndian(dates[dates.length - 1]) : 'N/A',
      officeName: 'Consolidated Units',
      officeId: 'MULTIPLE',
      generatedDate: new Date().toLocaleDateString('en-IN')
    };

    onDataLoaded(normalized, meta);
  };

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: files.length });

    try {
      const allJsonData: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length });
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsBinaryString(file);
        });
        const workbook = XLSX.read(data, { type: 'binary' });
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as any[];
          allJsonData.push(...jsonData);
        });
      }
      processAndFinalize(allJsonData);
    } catch (err: any) {
      setError(err.message || "An error occurred while processing the batch.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleFetchSheet = async () => {
    const csvUrl = parseGoogleSheetUrl(sheetUrl);
    if (!csvUrl) {
      setError("Please paste a valid Google Sheets URL.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(csvUrl);
      const text = await response.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const allJsonData: any[] = [];
      workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        allJsonData.push(...XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" }));
      });
      processAndFinalize(allJsonData);
    } catch (err: any) {
      setError(err.message || "Could not load data from the link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl items-start">
      <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white rounded-[3rem] shadow-2xl border-2 border-slate-100 w-full relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 blur-3xl pointer-events-none"></div>
        
        <div className="mb-10 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-[#c1272d] text-white rounded-[2rem] mb-6 shadow-2xl ring-8 ring-[#ffcc00]/20 rotate-3 hover:rotate-0 transition-transform duration-500">
            {loading ? <Loader2 className="w-12 h-12 animate-spin" /> : <Upload className="w-12 h-12" />}
          </div>
          <h2 className="text-4xl font-black text-[#c1272d] uppercase tracking-tighter leading-none">
            {isAppendMode ? 'Add More Data' : 'Instant Consolidation'}
          </h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-3 flex items-center justify-center gap-2">
            <Sparkles className="w-3 h-3 text-[#ffcc00]" />
            {isAppendMode ? 'Appending to Current Dataset' : 'Direct Multi-Office Upload'}
            <Sparkles className="w-3 h-3 text-[#ffcc00]" />
          </p>
          {isAppendMode && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider animate-bounce">
              <PlusCircle className="w-3 h-3" /> Append Mode Active
            </div>
          )}
        </div>

        <div className="w-full space-y-5 relative z-10">
          {!showLinkInput ? (
            <div className="flex flex-col gap-5">
              <label 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
                className={`relative cursor-pointer group flex flex-col items-center justify-center border-4 border-dashed rounded-[2.5rem] p-16 transition-all duration-500 ${
                  isDragging ? 'border-[#c1272d] bg-red-50 scale-[0.99]' : 'border-slate-100 hover:border-[#ffcc00] bg-slate-50/50 hover:bg-white hover:shadow-xl'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".xlsx, .xls, .csv" 
                  multiple 
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  disabled={loading}
                />
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-5 bg-white rounded-3xl shadow-lg text-[#c1272d] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <Files className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-800 uppercase tracking-tight">Drop your inventory dump</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em] max-w-[240px] leading-relaxed">
                      We'll auto-detect offices and categories from your sheets.
                    </p>
                  </div>
                </div>
              </label>

              <button 
                onClick={() => setShowLinkInput(true)}
                className="w-full py-6 bg-[#ffcc00] hover:bg-[#e6b800] text-[#c1272d] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-4 shadow-xl border-b-8 border-black/10 active:translate-y-1 active:border-b-4"
              >
                Fetch from Google Sheets
                <Link className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="relative group">
                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-[#c1272d] group-focus-within:rotate-180 transition-transform duration-700" />
                <input 
                  type="text"
                  placeholder="Paste Google Sheet Public Link..."
                  className="w-full pl-14 pr-4 py-6 bg-[#fffcf0] border-2 border-[#ffcc00]/30 rounded-[2rem] focus:border-[#c1272d] outline-none font-black text-slate-700 placeholder:text-slate-300 shadow-inner"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchSheet()}
                  disabled={loading}
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleFetchSheet}
                  className="flex-[2] px-8 py-6 bg-[#c1272d] text-white font-black uppercase tracking-widest rounded-2xl hover:bg-[#a12126] transition-all shadow-xl border-b-8 border-black/20 active:translate-y-1 active:border-b-4"
                  disabled={loading}
                >
                  {loading ? 'Crunching Data...' : 'Sync Now'}
                </button>
                <button onClick={() => setShowLinkInput(false)} className="flex-1 px-6 py-6 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase tracking-widest border-b-8 border-black/5 hover:bg-slate-200 transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {progress && (
          <div className="mt-10 w-full animate-fadeIn">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-[10px] font-black uppercase text-slate-400">Processing Batch</span>
              <span className="text-[10px] font-black uppercase text-[#c1272d]">{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
              <div className="h-full bg-gradient-to-r from-[#c1272d] to-[#ffcc00] rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 p-5 bg-red-50 border-2 border-red-100 rounded-2xl flex items-start gap-4 text-red-600 w-full font-black animate-shake">
            <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <p className="text-sm uppercase tracking-tight">{error}</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default FileUpload;
