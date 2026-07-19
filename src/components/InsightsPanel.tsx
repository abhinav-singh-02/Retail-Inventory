import React, { useState, useEffect } from "react";
import { Sparkles, Brain, AlertCircle, AlertTriangle, ShieldCheck, RefreshCw, Send, CheckCircle } from "lucide-react";
import { DashboardMetrics, MergedRow, StockoutRiskItem } from "../types";

interface InsightsPanelProps {
  filteredData: MergedRow[];
  metrics: DashboardMetrics;
}

export default function InsightsPanel({ filteredData, metrics }: InsightsPanelProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKey, setMissingKey] = useState<boolean>(false);

  // Derive specialized inputs for the Gemini summary (always client-side aggregated first to protect user privacy)
  const preparedData = useEffect(() => {
    // Reset insights whenever filtered data changes significantly so the user can re-trigger
    // Or we can let them click "Generate Strategic Recommendations" to avoid wasteful automatic API calls on every filter tick (highly recommended for saving tokens and rate limits!).
  }, [filteredData]);

  const generateInsights = async () => {
    if (filteredData.length === 0) return;

    setLoading(true);
    setError(null);
    setMissingKey(false);

    try {
      // 1. Calculate top & bottom categories by Net Sales
      const categorySales: Record<string, number> = {};
      filteredData.forEach((row) => {
        categorySales[row.category] = (categorySales[row.category] || 0) + row.netSales;
      });
      const sortedCategories = Object.entries(categorySales)
        .map(([category, netSales]) => ({ category, netSales }))
        .sort((a, b) => b.netSales - a.netSales);

      const topCategories = sortedCategories.slice(0, 3);
      const bottomCategories = sortedCategories.slice(-3).reverse();

      // 2. Regional performance
      const regionalStats: Record<string, { netSales: number; transactions: number; footfall: number }> = {};
      filteredData.forEach((row) => {
        if (!regionalStats[row.region]) {
          regionalStats[row.region] = { netSales: 0, transactions: 0, footfall: 0 };
        }
        regionalStats[row.region].netSales += row.netSales;
        regionalStats[row.region].transactions += row.transactions;
        regionalStats[row.region].footfall += row.footfall;
      });

      const regionalPerformance = Object.entries(regionalStats).map(([region, stat]) => ({
        region,
        netSales: stat.netSales,
        conversionRate: stat.footfall > 0 ? stat.transactions / stat.footfall : 0,
      }));

      // 3. High Stockout Risks
      const storeCategoryMap: Record<string, { storeName: string; category: string; inventory: number; unitsSold: number }> = {};
      filteredData.forEach((row) => {
        const key = `${row.storeId}_${row.category}`;
        if (!storeCategoryMap[key]) {
          storeCategoryMap[key] = { storeName: row.storeName, category: row.category, inventory: 0, unitsSold: 0 };
        }
        storeCategoryMap[key].inventory += row.inventory;
        storeCategoryMap[key].unitsSold += row.unitsSold;
      });

      const stockoutRisks: StockoutRiskItem[] = Object.values(storeCategoryMap)
        .map((item) => {
          const ratio = item.inventory > 0 ? item.unitsSold / item.inventory : item.unitsSold > 0 ? 10 : 0;
          let riskLevel: 'High' | 'Medium' | 'Low' = 'Low';
          if (ratio >= 1.5 || (item.inventory === 0 && item.unitsSold > 0)) riskLevel = 'High';
          else if (ratio >= 0.8) riskLevel = 'Medium';
          return {
            storeId: "",
            storeName: item.storeName,
            category: item.category,
            inventory: item.inventory,
            unitsSold: item.unitsSold,
            ratio,
            riskLevel,
          };
        })
        .filter((r) => r.riskLevel === "High" || r.riskLevel === "Medium")
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 5);

      // 4. Unique weeks/regions for context
      const weeks = Array.from(new Set(filteredData.map((d) => d.week)));
      const regions = Array.from(new Set(filteredData.map((d) => d.region)));
      const categories = Array.from(new Set(filteredData.map((d) => d.category)));

      const payload = {
        metrics,
        topCategories,
        bottomCategories,
        regionalPerformance,
        stockoutRisks,
        filterContext: { weeks, regions, categories },
      };

      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to contact strategic intelligence engine.");
      }

      setInsights(data.insights);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not retrieve AI recommendations. Check backend logs.");
      if (err.message?.includes("GEMINI_API_KEY") || err.message?.includes("key") || err.message?.toLowerCase().includes("unauthorized")) {
        setMissingKey(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Safe client-side markdown formatter for simple structured display
  const renderFormattedInsights = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // H3 headers
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={idx} className="text-[10px] font-bold text-blue-800 mt-3 mb-1 uppercase tracking-wider">
            {trimmed.replace(/^###\s*/, "")}
          </h4>
        );
      }
      // H2 headers
      if (trimmed.startsWith("##")) {
        return (
          <h3 key={idx} className="text-xs font-bold text-blue-900 border-b border-blue-100/80 pb-1 mt-4 mb-2 uppercase tracking-wide flex items-center gap-1.5">
            {trimmed.replace(/^##\s*/, "")}
          </h3>
        );
      }
      // Bold text or regular text lists
      if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
        const itemText = trimmed.replace(/^[\*\-]\s*/, "");
        // If the item starts with a bold title like "**Title**: text", let's extract it as a header
        const matches = itemText.match(/^\*\*([^*]+)\*\*:(.*)$/);
        if (matches) {
          const header = matches[1];
          const body = matches[2];
          return (
            <div key={idx} className="bg-white/80 p-2 rounded border border-blue-100/50 mb-1.5 shadow-xs transition-all hover:bg-white">
              <span className="text-blue-700 font-bold uppercase text-[9px] block mb-0.5">{header}</span>
              <p className="text-[11px] leading-relaxed font-medium text-slate-800">{body}</p>
            </div>
          );
        }

        return (
          <div key={idx} className="bg-white/70 p-2 rounded border border-blue-100/40 mb-1.5 shadow-xs transition-all hover:bg-white">
            <span className="text-blue-700 font-bold uppercase text-[9px] block mb-0.5">DIRECTIVE RECOMMENDATION</span>
            <p className="text-[11px] leading-relaxed font-medium text-slate-800">
              {parseBoldText(itemText)}
            </p>
          </div>
        );
      }

      if (/^\d+\./.test(trimmed)) {
        const itemText = trimmed.replace(/^\d+\.\s*/, "");
        const num = trimmed.match(/^\d+/)?.toString() || "1";
        return (
          <div key={idx} className="bg-white/70 p-2 rounded border border-blue-100/40 mb-1.5 shadow-xs transition-all hover:bg-white">
            <span className="text-blue-700 font-bold uppercase text-[9px] block mb-0.5">STRATEGIC DIRECTIVE {num}</span>
            <p className="text-[11px] leading-relaxed font-medium text-slate-800">
              {parseBoldText(itemText)}
            </p>
          </div>
        );
      }

      if (trimmed === "") {
        return <div key={idx} className="h-1" />;
      }

      return (
        <p key={idx} className="text-[11px] font-medium text-slate-700 leading-relaxed mb-1.5">
          {parseBoldText(trimmed)}
        </p>
      );
    });
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-slate-900">{part}</strong> : part));
  };

  return (
    <div id="ai-insights-panel" className="bg-blue-50/60 border border-blue-100 rounded-lg p-4 flex flex-col shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100/60 pb-3 mb-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-blue-500 rounded text-white shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              AI Strategic Insights
              <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[8px] font-extrabold tracking-widest rounded-sm uppercase">
                ACTIVE
              </span>
            </h3>
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">
              Executive tactical operations directives summarized from current KPI filter set.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
          <div className="flex items-center gap-1 text-[9px] text-blue-700 bg-blue-100/80 px-2 py-1 rounded font-bold uppercase tracking-wider border border-blue-200">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            100% Aggregated vectors
          </div>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-blue-500 font-medium">Please load datasets or interactive demo data to compile AI recommendations.</p>
        </div>
      ) : loading ? (
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-xs text-blue-700 font-bold uppercase tracking-wider">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
            Analyzing filters and compiling KPI vectors...
          </div>
          <div className="space-y-1.5">
            <div className="h-6 bg-white/60 rounded border border-blue-100/50 w-full animate-pulse"></div>
            <div className="h-6 bg-white/60 rounded border border-blue-100/50 w-5/6 animate-pulse"></div>
            <div className="h-6 bg-white/60 rounded border border-blue-100/50 w-2/3 animate-pulse"></div>
          </div>
        </div>
      ) : error ? (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Strategic Intelligence Service Error</h4>
            <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed font-medium">{error}</p>
            {missingKey && (
              <div className="mt-2 bg-white/80 p-2.5 rounded border border-rose-200 text-[10px] text-slate-600 leading-relaxed font-medium">
                <span className="font-bold text-rose-800 uppercase block mb-0.5">API KEY CONFIGURATION</span>
                Please configure your Gemini API Key in the <strong className="text-slate-900 font-bold">Secrets panel</strong> in the AI Studio UI by adding a secret named <strong className="text-slate-900 font-bold">GEMINI_API_KEY</strong>.
              </div>
            )}
            <button
              type="button"
              onClick={generateInsights}
              className="mt-2 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : insights ? (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-0.5 scrollbar-thin">
          <div className="flex items-center justify-between border-b border-blue-100/60 pb-1.5 mb-1.5">
            <span className="text-[9px] text-blue-700 font-bold uppercase tracking-wider">Strategic Directives Report</span>
            <button
              type="button"
              onClick={generateInsights}
              className="text-[9px] text-blue-700 hover:text-blue-900 flex items-center gap-1 font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Re-Analyze
            </button>
          </div>
          <div className="space-y-1">{renderFormattedInsights(insights)}</div>
        </div>
      ) : (
        <div className="bg-white/80 rounded border border-blue-100 p-4 text-center flex flex-col items-center justify-center">
          <Sparkles className="w-8 h-8 text-blue-500 mb-2" />
          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Generate Actionable Operations Directives</h4>
          <p className="text-[11px] text-slate-600 max-w-md mt-1 mb-3.5 leading-relaxed font-medium">
            Analyze the current filtered subset (Net Sales: <strong className="text-blue-700 font-bold">${metrics.totalNetSales.toLocaleString()}</strong>, Conversion Rate: <strong className="text-blue-700 font-bold">{(metrics.conversionRate * 100).toFixed(1)}%</strong>, return ratios) to generate strategic operations directives.
          </p>
          <button
            type="button"
            onClick={generateInsights}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            Generate Tactical Directives
          </button>
        </div>
      )}
    </div>
  );
}
