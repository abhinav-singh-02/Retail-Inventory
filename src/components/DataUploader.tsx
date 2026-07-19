import React, { useState, useRef } from "react";
import { Upload, Download, Sparkles, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { StoreMaster, WeeklyTransaction, MergedRow } from "../types";
import { parseStoreMaster, parseWeeklyTransactions, mergeDatasets } from "../excelParser";
import { downloadStoreMasterTemplate, downloadWeeklyTransactionsTemplate, getMergedDemoData } from "../dataGenerator";

interface DataUploaderProps {
  onDataLoaded: (data: MergedRow[]) => void;
}

export default function DataUploader({ onDataLoaded }: DataUploaderProps) {
  const [storeFile, setStoreFile] = useState<File | null>(null);
  const [txFile, setTxFile] = useState<File | null>(null);
  const [storeStatus, setStoreStatus] = useState<{ loading: boolean; count: number; error: string | null }>({
    loading: false,
    count: 0,
    error: null,
  });
  const [txStatus, setTxStatus] = useState<{ loading: boolean; count: number; error: string | null }>({
    loading: false,
    count: 0,
    error: null,
  });

  const [parsedStores, setParsedStores] = useState<StoreMaster[]>([]);
  const [parsedTxs, setParsedTxs] = useState<WeeklyTransaction[]>([]);
  const [mergeWarning, setMergeWarning] = useState<string | null>(null);

  const storeInputRef = useRef<HTMLInputElement>(null);
  const txInputRef = useRef<HTMLInputElement>(null);

  const handleStoreUpload = async (file: File) => {
    setStoreFile(file);
    setStoreStatus({ loading: true, count: 0, error: null });
    const result = await parseStoreMaster(file);
    if (result.error) {
      setStoreStatus({ loading: false, count: 0, error: result.error });
    } else {
      setStoreStatus({ loading: false, count: result.data.length, error: null });
      setParsedStores(result.data);
      checkAndMerge(result.data, parsedTxs);
    }
  };

  const handleTxUpload = async (file: File) => {
    setTxFile(file);
    setTxStatus({ loading: true, count: 0, error: null });
    const result = await parseWeeklyTransactions(file);
    if (result.error) {
      setTxStatus({ loading: false, count: 0, error: result.error });
    } else {
      setTxStatus({ loading: false, count: result.data.length, error: null });
      setParsedTxs(result.data);
      checkAndMerge(parsedStores, result.data);
    }
  };

  const checkAndMerge = (stores: StoreMaster[], txs: WeeklyTransaction[]) => {
    if (stores.length > 0 && txs.length > 0) {
      const { data, unmappedStoresCount } = mergeDatasets(stores, txs);
      onDataLoaded(data);
      if (unmappedStoresCount > 0) {
        setMergeWarning(
          `Merged ${data.length} transactions, but found ${unmappedStoresCount} transaction records where Store ID was not found in Store Master. These have been assigned to 'Unmapped' placeholder stores.`
        );
      } else {
        setMergeWarning(null);
      }
    }
  };

  const handleLoadDemo = () => {
    const demoData = getMergedDemoData();
    onDataLoaded(demoData);
    setStoreFile(new File([], "Store_Master_Demo.xlsx"));
    setTxFile(new File([], "Weekly_Transactions_Demo.xlsx"));
    setStoreStatus({ loading: false, count: 8, error: null });
    setTxStatus({ loading: false, count: 160, error: null });
    setMergeWarning(null);
  };

  const clearFiles = () => {
    setStoreFile(null);
    setTxFile(null);
    setStoreStatus({ loading: false, count: 0, error: null });
    setTxStatus({ loading: false, count: 0, error: null });
    setParsedStores([]);
    setParsedTxs([]);
    setMergeWarning(null);
    onDataLoaded([]);
  };

  return (
    <div id="data-uploader-section" className="bg-white rounded border border-slate-200 p-4 mb-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-blue-600" />
            Dataset Integration Hub
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Upload Excel spreadsheets client-side. Processing happens 100% locally in your browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadDemo}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] uppercase tracking-wider rounded border border-blue-200 cursor-pointer shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Load Demo Data
          </button>
          {(storeFile || txFile) && (
            <button
              type="button"
              onClick={clearFiles}
              className="px-2 py-1.5 text-slate-500 hover:text-slate-800 font-bold text-[10px] uppercase tracking-wider rounded border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Dataset A: Store Master */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase flex items-center gap-1">
              Dataset A: Store Master
              <span className="text-blue-600 font-medium normal-case italic text-[9px]">(Store ID, Region, Format)</span>
            </span>
            <button
              type="button"
              onClick={downloadStoreMasterTemplate}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Download template file"
            >
              <Download className="w-3 h-3" /> Template
            </button>
          </div>

          <div
            onClick={() => storeInputRef.current?.click()}
            className={`border border-dashed rounded p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[90px] ${
              storeFile
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50"
            }`}
          >
            <input
              type="file"
              ref={storeInputRef}
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleStoreUpload(file);
              }}
            />

            {storeStatus.loading ? (
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-[10px] text-slate-500 mt-1.5 font-semibold">Parsing Store Master...</span>
              </div>
            ) : storeFile ? (
              <div className="flex flex-col items-center">
                <div className="p-1.5 bg-emerald-100 rounded-full text-emerald-600 mb-1">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 line-clamp-1">{storeFile.name}</span>
                <span className="text-[9px] text-emerald-600 font-bold mt-0.5 uppercase tracking-wider">
                  Loaded {storeStatus.count} Stores
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-[11px] font-bold text-slate-700">Click to upload Store Master</span>
                <span className="text-[9px] text-slate-400">Excel .xlsx / .xls</span>
              </div>
            )}
          </div>

          {storeStatus.error && (
            <div className="mt-1.5 text-[10px] font-medium text-rose-600 flex items-start gap-1 p-1.5 bg-rose-50 rounded border border-rose-100">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{storeStatus.error}</span>
            </div>
          )}
        </div>

        {/* Dataset B: Weekly Transactions */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase flex items-center gap-1">
              Dataset B: Weekly Transactions
              <span className="text-blue-600 font-medium normal-case italic text-[9px]">(Sales, Conversion, Stock)</span>
            </span>
            <button
              type="button"
              onClick={downloadWeeklyTransactionsTemplate}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Download template file"
            >
              <Download className="w-3 h-3" /> Template
            </button>
          </div>

          <div
            onClick={() => txInputRef.current?.click()}
            className={`border border-dashed rounded p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[90px] ${
              txFile
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50"
            }`}
          >
            <input
              type="file"
              ref={txInputRef}
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleTxUpload(file);
              }}
            />

            {txStatus.loading ? (
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-[10px] text-slate-500 mt-1.5 font-semibold">Parsing Transactions...</span>
              </div>
            ) : txFile ? (
              <div className="flex flex-col items-center">
                <div className="p-1.5 bg-emerald-100 rounded-full text-emerald-600 mb-1">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 line-clamp-1">{txFile.name}</span>
                <span className="text-[9px] text-emerald-600 font-bold mt-0.5 uppercase tracking-wider">
                  Loaded {txStatus.count} Rows
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-[11px] font-bold text-slate-700">Click to upload Transactions Sheet</span>
                <span className="text-[9px] text-slate-400">Excel .xlsx / .xls</span>
              </div>
            )}
          </div>

          {txStatus.error && (
            <div className="mt-1.5 text-[10px] font-medium text-rose-600 flex items-start gap-1 p-1.5 bg-rose-50 rounded border border-rose-100">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{txStatus.error}</span>
            </div>
          )}
        </div>
      </div>

      {mergeWarning && (
        <div className="mt-3 text-[10px] font-medium text-amber-700 bg-amber-50 rounded p-2 flex items-start gap-1.5 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span>{mergeWarning}</span>
        </div>
      )}

      {!storeFile && !txFile && (
        <div className="mt-3 p-2.5 bg-slate-50 rounded border border-slate-200/60 flex items-start gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">New to the platform?</h4>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-medium">
              Click <strong className="text-blue-600 font-bold">Load Demo Data</strong> above to activate full interactive reports, stockout logs, and secure Gemini intelligence recommendations instantly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
