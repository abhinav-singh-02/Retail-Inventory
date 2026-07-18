import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AlertCircle, HelpCircle, PackageOpen, RefreshCw } from "lucide-react";
import { MergedRow, StockoutRiskItem } from "../types";

interface DashboardChartsProps {
  filteredData: MergedRow[];
}

const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#10b981", "#f59e0b", "#ef4444", "#64748b", "#1e3a8a"];

export default function DashboardCharts({ filteredData }: DashboardChartsProps) {
  // 1. Check if we have data to display
  const hasData = filteredData.length > 0;

  // Formatting helpers
  const formatValue = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}k`;
    return `$${val}`;
  };

  const formatRawValue = (val: number) => `$${val.toLocaleString()}`;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 text-white p-2 rounded shadow-lg border border-slate-800 text-[10px]">
          <p className="font-bold mb-1 text-slate-400 uppercase tracking-wider">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-400 font-medium capitalize">{entry.name}:</span>
              <span className="font-bold text-white">
                {typeof entry.value === "number" && entry.name.toLowerCase().includes("rate")
                  ? `${(entry.value * 100).toFixed(1)}%`
                  : typeof entry.value === "number" && !entry.name.toLowerCase().includes("units")
                  ? formatRawValue(entry.value)
                  : entry.value.toLocaleString()}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Aggregators
  const chartsData = useMemo(() => {
    if (!hasData) return null;

    // A. Net Sales vs Target over time
    const salesOverTimeMap: Record<string, { week: string; netSales: number; target: number }> = {};
    // B. Sales by Category
    const categoryMap: Record<string, { category: string; netSales: number; grossSales: number }> = {};
    // C. Sales Distribution by Region
    const regionMap: Record<string, { name: string; value: number }> = {};
    // D. Store Format Performance
    const formatMap: Record<string, { format: string; netSales: number; target: number }> = {};
    // E. Store Returns Analysis
    const returnsMap: Record<string, { storeName: string; returns: number; returnRate: number; grossSales: number }> = {};
    // F. Stockout Risk
    const riskList: StockoutRiskItem[] = [];

    filteredData.forEach((row) => {
      // Time aggregation
      const week = row.week;
      if (!salesOverTimeMap[week]) {
        salesOverTimeMap[week] = { week, netSales: 0, target: 0 };
      }
      salesOverTimeMap[week].netSales += row.netSales;
      salesOverTimeMap[week].target += row.target;

      // Category aggregation
      const category = row.category;
      if (!categoryMap[category]) {
        categoryMap[category] = { category, netSales: 0, grossSales: 0 };
      }
      categoryMap[category].netSales += row.netSales;
      categoryMap[category].grossSales += row.grossSales;

      // Region aggregation
      const region = row.region;
      if (!regionMap[region]) {
        regionMap[region] = { name: region, value: 0 };
      }
      regionMap[region].value += row.netSales;

      // Store Format aggregation
      const format = row.storeFormat;
      if (!formatMap[format]) {
        formatMap[format] = { format, netSales: 0, target: 0 };
      }
      formatMap[format].netSales += row.netSales;
      formatMap[format].target += row.target;

      // Returns aggregation (by store)
      const sName = row.storeName;
      if (!returnsMap[sName]) {
        returnsMap[sName] = { storeName: sName, returns: 0, returnRate: 0, grossSales: 0 };
      }
      returnsMap[sName].returns += row.returns;
      returnsMap[sName].grossSales += row.grossSales;
    });

    // Process Returns percentages
    Object.keys(returnsMap).forEach((key) => {
      const item = returnsMap[key];
      item.returnRate = item.grossSales > 0 ? item.returns / item.grossSales : 0;
    });

    // Stockout risk evaluation: Units Sold trajectory vs Inventory on hand
    // Group by Store and Category to find specific items running low
    const storeCategoryKeyMap: Record<string, { storeId: string; storeName: string; category: string; inventory: number; unitsSold: number }> = {};
    filteredData.forEach((row) => {
      const key = `${row.storeId}_${row.category}`;
      if (!storeCategoryKeyMap[key]) {
        storeCategoryKeyMap[key] = {
          storeId: row.storeId,
          storeName: row.storeName,
          category: row.category,
          inventory: 0,
          unitsSold: 0,
        };
      }
      storeCategoryKeyMap[key].inventory += row.inventory;
      storeCategoryKeyMap[key].unitsSold += row.unitsSold;
    });

    Object.keys(storeCategoryKeyMap).forEach((key) => {
      const item = storeCategoryKeyMap[key];
      // Ratio reflects sales pressure on inventory: higher means higher stockout risk
      // e.g. if sold 100 and inventory is only 20, ratio is 5x (extreme risk)
      const ratio = item.inventory > 0 ? item.unitsSold / item.inventory : item.unitsSold > 0 ? 10 : 0;
      
      let riskLevel: 'High' | 'Medium' | 'Low' = 'Low';
      if (ratio >= 1.5 || (item.inventory === 0 && item.unitsSold > 0)) {
        riskLevel = 'High';
      } else if (ratio >= 0.8) {
        riskLevel = 'Medium';
      }

      riskList.push({
        storeId: item.storeId,
        storeName: item.storeName,
        category: item.category,
        inventory: item.inventory,
        unitsSold: item.unitsSold,
        ratio,
        riskLevel,
      });
    });

    // Sort risk list to show highest risk first
    const sortedRisks = riskList
      .filter((r) => r.unitsSold > 0) // only evaluate items actually selling
      .sort((a, b) => b.ratio - a.ratio);

    return {
      overTime: Object.values(salesOverTimeMap).sort((a, b) => a.week.localeCompare(b.week, undefined, { numeric: true })),
      category: Object.values(categoryMap).sort((a, b) => b.netSales - a.netSales),
      region: Object.values(regionMap).sort((a, b) => b.value - a.value),
      format: Object.values(formatMap).sort((a, b) => b.netSales - a.netSales),
      returns: Object.values(returnsMap).sort((a, b) => b.returns - a.returns).slice(0, 5), // Top 5 stores by returns
      stockoutRisks: sortedRisks.slice(0, 5), // Top 5 high risk items
    };
  }, [filteredData, hasData]);

  if (!hasData) {
    return (
      <div className="bg-white rounded border border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
        <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-2">
          <PackageOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Filtered Results Found</h3>
        <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed">
          The selected combination of Filters yielded zero transaction rows. Try resetting or relaxing your filters in the sidebar.
        </p>
      </div>
    );
  }

  const data = chartsData!;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-4">
      {/* Chart 1: Net Sales vs. Target Over Time */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col h-[280px]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Sales vs. Target</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Chronological sales performance against goals</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.overTime} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={formatValue} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: 9 }} />
              <Area name="Weekly Target" dataKey="target" fill="#eff6ff" stroke="#93c5fd" strokeWidth={1} />
              <Line name="Net Sales" dataKey="netSales" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Sales by Product Category */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col h-[280px]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sales by Category</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Revenue and gross yield by department</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.category} layout="vertical" margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={formatValue} />
              <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar name="Net Sales" dataKey="netSales" fill="#2563eb" radius={[0, 2, 2, 0]} barSize={10} />
              <Bar name="Gross Sales" dataKey="grossSales" fill="#cbd5e1" radius={[0, 2, 2, 0]} barSize={5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Sales Distribution by Region */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col h-[280px]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sales Distribution by Region</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Geographical revenue contribution share</p>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="w-full sm:w-1/2 h-full min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.region}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.region.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatRawValue(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full sm:w-1/2 space-y-1 text-[11px]">
            {data.region.map((r, index) => {
              const total = data.region.reduce((sum, item) => sum + item.value, 0);
              const percentage = total > 0 ? (r.value / total) * 100 : 0;
              return (
                <div key={r.name} className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-600 font-semibold truncate">{r.name}</span>
                  </div>
                  <div className="text-right whitespace-nowrap shrink-0">
                    <span className="font-bold text-slate-800">{formatValue(r.value)}</span>
                    <span className="text-[9px] text-slate-400 font-medium ml-1">({percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart 4: Store Format Performance */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col h-[280px]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Store Format Performance</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Net sales versus expansion model targets</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.format} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="format" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={formatValue} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: 9 }} />
              <Bar name="Net Sales" dataKey="netSales" fill="#2563eb" radius={[2, 2, 0, 0]} barSize={14} />
              <Bar name="Format Target" dataKey="target" fill="#60a5fa" radius={[2, 2, 0, 0]} barSize={8} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 5: Store Returns Analysis */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col h-[280px]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Store Returns Analysis</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Top 5 stores experiencing highest return costs</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.returns} margin={{ top: 5, right: -10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="storeName" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={formatValue} />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: 9 }} />
              <Bar yAxisId="left" name="Return Amount ($)" dataKey="returns" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={14} />
              <Line yAxisId="right" name="Return Rate (%)" dataKey="returnRate" stroke="#f97316" strokeWidth={1.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 6: Stockout Risk Assessment */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col h-[280px]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stockout Risk Assessment</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Sold units vs. inventory buffer on hand</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {data.stockoutRisks.length > 0 ? (
            <>
              <div className="flex-1 min-h-[120px] mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.stockoutRisks} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="storeName" stroke="#94a3b8" fontSize={8} tickLine={false} tickFormatter={(name) => name.split(" ")[0]} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: 9 }} />
                    <Bar name="Units Sold (Demand)" dataKey="unitsSold" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={10} />
                    <Bar name="Inventory Buffer" dataKey="inventory" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-y-auto max-h-[85px] border border-slate-100 rounded text-[10px] bg-slate-50/50 p-1.5 scrollbar-thin">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-slate-400 text-[8px] uppercase font-bold tracking-wider">
                      <th className="pb-1">Store / Category</th>
                      <th className="pb-1 text-center">Demand</th>
                      <th className="pb-1 text-center">Stock</th>
                      <th className="pb-1 text-right">Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.stockoutRisks.map((item, idx) => (
                      <tr key={idx} className="text-slate-700">
                        <td className="py-0.5 font-medium truncate max-w-[120px]">
                          <span className="font-semibold text-slate-800 block truncate">{item.storeName}</span>
                          <span className="text-[8px] text-slate-400 block">{item.category}</span>
                        </td>
                        <td className="py-0.5 text-center font-bold">{item.unitsSold}</td>
                        <td className={`py-0.5 text-center font-bold ${item.inventory < 10 ? "text-rose-600 font-extrabold" : ""}`}>
                          {item.inventory}
                        </td>
                        <td className="py-0.5 text-right">
                          <span className={`px-1 py-0.2 rounded-sm font-bold text-[8px] ${
                            item.riskLevel === 'High' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {item.ratio.toFixed(1)}x
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded border border-dashed border-slate-250">
              <AlertCircle className="w-6 h-6 text-slate-400 mb-1" />
              <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">No Imminent Stockout Risks</h4>
              <p className="text-[9px] text-slate-500 max-w-xs mt-0.5">
                Your currently filtered store and category inventory buffers are adequate compared to sales velocity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
