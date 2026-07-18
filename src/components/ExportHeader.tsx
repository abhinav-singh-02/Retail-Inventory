import React, { useState } from "react";
import { Download, FileText, Image, Printer, Loader2, Sparkles, CheckCircle } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface ExportHeaderProps {
  hasData: boolean;
  filterContext: string;
}

export default function ExportHeader({ hasData, filterContext }: ExportHeaderProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setExportSuccess(msg);
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const exportToPng = async () => {
    if (!hasData) return;
    setExportingPng(true);
    try {
      const element = document.getElementById("dashboard-capture-area");
      if (!element) {
        throw new Error("Capture area not found.");
      }

      // Briefly style or hide elements that shouldn't be in the export if needed
      const canvas = await html2canvas(element, {
        scale: 2, // Retain high resolution
        useCORS: true,
        logging: false,
        backgroundColor: "#f8fafc", // matches background slate-50
        windowWidth: 1400, // force desktop widths for responsive cards to align beautifully
        onclone: (clonedDoc) => {
          // Hide data uploader section or backends inside cloned document to keep the report super professional!
          const clonedUploader = clonedDoc.getElementById("data-uploader-section");
          if (clonedUploader) clonedUploader.style.display = "none";
          
          const clonedActionBtn = clonedDoc.getElementById("insights-action-button");
          if (clonedActionBtn) clonedActionBtn.style.display = "none";
        }
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `Retail_Operations_KPI_Report_${dateStr}.png`;
      link.href = dataUrl;
      link.click();
      
      triggerNotification("Dashboard PNG downloaded successfully!");
    } catch (err) {
      console.error("PNG export error:", err);
      alert("Failed to export PNG. Try again.");
    } finally {
      setExportingPng(false);
    }
  };

  const exportToPdf = async () => {
    if (!hasData) return;
    setExportingPdf(true);
    try {
      const element = document.getElementById("dashboard-capture-area");
      if (!element) {
        throw new Error("Capture area not found.");
      }

      const canvas = await html2canvas(element, {
        scale: 1.5, // optimal size for PDFs to fit standard scale
        useCORS: true,
        logging: false,
        backgroundColor: "#f8fafc",
        windowWidth: 1400,
        onclone: (clonedDoc) => {
          const clonedUploader = clonedDoc.getElementById("data-uploader-section");
          if (clonedUploader) clonedUploader.style.display = "none";
        }
      });

      const imgData = canvas.toDataURL("image/png");
      
      // Page setup (A4 standard)
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 Width in mm
      const pageHeight = 297; // A4 Height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add image as page 1
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Span multiple pages if the dashboard stretches long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().split("T")[0];
      pdf.save(`Retail_Operations_Intelligence_Executive_Summary_${dateStr}.pdf`);
      
      triggerNotification("Executive PDF report generated!");
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF. Try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-[10px]">RI</span>
          </div>
          RETAIL SALES INTELLIGENCE PORTAL
        </h1>
        {hasData ? (
          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Active View:</span>
            <span className="bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded text-[9px] inline-block max-w-[350px] truncate border border-slate-200">
              {filterContext}
            </span>
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 mt-0.5">
            Upload offline Store Master & Weekly Transaction spreadsheets to boot the reporting engine.
          </p>
        )}
      </div>

      {hasData && (
        <div className="flex items-center gap-2 flex-wrap">
          {exportSuccess && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 animate-fade-in font-semibold uppercase tracking-wider">
              <CheckCircle className="w-3 h-3" />
              {exportSuccess}
            </div>
          )}

          <button
            type="button"
            onClick={exportToPng}
            disabled={exportingPng || exportingPdf}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium rounded transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {exportingPng ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                Capturing...
              </>
            ) : (
              <>
                <Image className="w-3.5 h-3.5 text-blue-500" />
                Export PNG Image
              </>
            )}
          </button>

          <button
            type="button"
            onClick={exportToPdf}
            disabled={exportingPdf || exportingPng}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium rounded transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {exportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-300" />
                Compiling...
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-blue-300" />
                Export Executive PDF
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
