import React, { useState, useMemo } from "react";
import { Database, LayoutDashboard, FileSpreadsheet, Sparkles, FilterX } from "lucide-react";
import { MergedRow, FilterState, DashboardMetrics } from "./types";
import ExportHeader from "./components/ExportHeader";
import DataUploader from "./components/DataUploader";
import SidebarFilters from "./components/SidebarFilters";
import KPICards from "./components/KPICards";
import DashboardCharts from "./components/DashboardCharts";
import InsightsPanel from "./components/InsightsPanel";

export default function App() {
  const [rawData, setRawData] = useState<MergedRow[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({
    weeks: [],
    regions: [],
    cities: [],
    storeFormats: [],
    categories: [],
    stores: [],
  });

  const handleDataLoaded = (data: MergedRow[]) => {
    setRawData(data);
    
    // Automatically select all categories by default on initial upload
    const uniqueWeeks = Array.from(new Set(data.map((r) => r.week)));
    const uniqueRegions = Array.from(new Set(data.map((r) => r.region)));
    const uniqueCities = Array.from(new Set(data.map((r) => r.city)));
    const uniqueFormats = Array.from(new Set(data.map((r) => r.storeFormat)));
    const uniqueCategories = Array.from(new Set(data.map((r) => r.category)));
    const uniqueStores = Array.from(new Set(data.map((r) => r.storeId)));

    setFilterState({
      weeks: uniqueWeeks,
      regions: uniqueRegions,
      cities: uniqueCities,
      storeFormats: uniqueFormats,
      categories: uniqueCategories,
      stores: uniqueStores,
    });
  };

  // 1. Reactive Filtering Logic
  const filteredData = useMemo(() => {
    if (rawData.length === 0) return [];
    
    return rawData.filter((row) => {
      const matchWeek = filterState.weeks.includes(row.week);
      const matchRegion = filterState.regions.includes(row.region);
      const matchCity = filterState.cities.includes(row.city);
      const matchFormat = filterState.storeFormats.includes(row.storeFormat);
      const matchCategory = filterState.categories.includes(row.category);
      const matchStore = filterState.stores.includes(row.storeId);
      return matchWeek && matchRegion && matchCity && matchFormat && matchCategory && matchStore;
    });
  }, [rawData, filterState]);

  // 2. High-Performance Metrics Aggregation
  const metrics = useMemo<DashboardMetrics>(() => {
    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalReturns = 0;
    let totalNetSales = 0;
    let totalTarget = 0;
    let totalTransactions = 0;
    let totalFootfall = 0;
    let totalMarketingSpend = 0;
    let totalUnitsSold = 0;

    filteredData.forEach((row) => {
      totalGrossSales += row.grossSales;
      totalDiscounts += row.discountAmount;
      totalReturns += row.returns;
      totalNetSales += row.netSales;
      totalTarget += row.target;
      totalTransactions += row.transactions;
      totalFootfall += row.footfall;
      totalMarketingSpend += row.marketingSpend;
      totalUnitsSold += row.unitsSold;
    });

    const targetAchievement = totalTarget > 0 ? totalNetSales / totalTarget : 0;
    const averageTransactionValue = totalTransactions > 0 ? totalNetSales / totalTransactions : 0;
    const conversionRate = totalFootfall > 0 ? totalTransactions / totalFootfall : 0;
    const returnRate = totalGrossSales > 0 ? totalReturns / totalGrossSales : 0;
    const discountRate = totalGrossSales > 0 ? totalDiscounts / totalGrossSales : 0;

    return {
      totalGrossSales,
      totalDiscounts,
      totalReturns,
      totalNetSales,
      totalTarget,
      targetAchievement,
      totalTransactions,
      totalFootfall,
      averageTransactionValue,
      conversionRate,
      returnRate,
      discountRate,
      totalMarketingSpend,
      totalUnitsSold,
    };
  }, [filteredData]);

  // Descriptive context string for reporting headers
  const activeFiltersLabel = useMemo(() => {
    if (rawData.length === 0) return "No active dataset";
    const weeksLabel = filterState.weeks.length === 0 ? "None" : `Weeks: ${filterState.weeks.join(", ")}`;
    const regionsLabel = filterState.regions.length === 0 ? "None" : `Regions: ${filterState.regions.join(", ")}`;
    return `${weeksLabel} | ${regionsLabel}`;
  }, [rawData, filterState]);

  const hasData = rawData.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased py-3 px-3 md:px-6">
      <div id="dashboard-capture-area" className="max-w-7xl mx-auto">
        
        {/* Header and Export controls */}
        <ExportHeader hasData={hasData && filteredData.length > 0} filterContext={activeFiltersLabel} />

        {/* Excel upload interface */}
        <DataUploader onDataLoaded={handleDataLoaded} />

        {/* Dashboard workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
          
          {/* Sidebar controls (Col width 1) */}
          <div className="lg:col-span-1">
            <SidebarFilters
              data={rawData}
              filterState={filterState}
              setFilterState={setFilterState}
            />
          </div>

          {/* KPI Dashboard Workspace (Col width 3) */}
          <div className="lg:col-span-3 space-y-3">
            {hasData ? (
              filteredData.length > 0 ? (
                <>
                  {/* High level KPI counts */}
                  <KPICards metrics={metrics} />

                  {/* Operational analytics charts */}
                  <DashboardCharts filteredData={filteredData} />

                  {/* Secure AI directives generator */}
                  <InsightsPanel filteredData={filteredData} metrics={metrics} />
                </>
              ) : (
                <div className="bg-white rounded border border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-2">
                    <FilterX className="w-8 h-8" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filtered subset is empty</h3>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed">
                    You have deselected all filters in the sidebar, or no transaction records match the current criteria. Please toggle some boxes to re-compute calculations.
                  </p>
                </div>
              )
            ) : (
              <div className="bg-white rounded border border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="p-4 bg-slate-50 text-blue-600 rounded mb-3 border border-slate-100 animate-bounce">
                  <Database className="w-10 h-10" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Reporting Workspace Offline</h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                  No datasets have been loaded. Please upload your Store Master spreadsheet and Weekly Transactions spreadsheet to activate operations reporting.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Offline excel sheets
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                    <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
                    Interactive Recharts
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Gemini Intelligence
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
