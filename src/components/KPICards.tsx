import React from "react";
import { DollarSign, Percent, Target, Users, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { DashboardMetrics } from "../types";

interface KPICardsProps {
  metrics: DashboardMetrics;
}

export default function KPICards({ metrics }: KPICardsProps) {
  const formatCurrency = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}k`;
    return `$${val.toFixed(0)}`;
  };

  const formatPercentage = (val: number) => {
    return `${(val * 100).toFixed(2)}%`;
  };

  // Safe checks for NaN values
  const netSales = metrics.totalNetSales;
  const targetAch = isNaN(metrics.targetAchievement) ? 0 : metrics.targetAchievement;
  const atv = isNaN(metrics.averageTransactionValue) ? 0 : metrics.averageTransactionValue;
  const convRate = isNaN(metrics.conversionRate) ? 0 : metrics.conversionRate;
  const returnRate = isNaN(metrics.returnRate) ? 0 : metrics.returnRate;
  const discountRate = isNaN(metrics.discountRate) ? 0 : metrics.discountRate;

  // Let's assess healthy levels for quick color-coding context
  // Target achievement: >= 95% is good (green), 85-95% is moderate (amber), < 85% is critical (rose)
  const targetColorClass = targetAch >= 0.95 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : targetAch >= 0.85 ? "text-amber-600 bg-amber-50 border-amber-100" : "text-rose-600 bg-rose-50 border-rose-100";

  // Conversion: higher is better
  const conversionColorClass = convRate >= 0.25 ? "text-emerald-600 bg-emerald-50" : convRate >= 0.15 ? "text-blue-600 bg-blue-50" : "text-amber-600 bg-amber-50";

  // Return rate: lower is better (normal is under 5%)
  const returnsColorClass = returnRate <= 0.05 ? "text-emerald-600 bg-emerald-50" : returnRate <= 0.08 ? "text-amber-600 bg-amber-50" : "text-rose-600 bg-rose-50";

  // Discount rate: lower means better margins
  const discountColorClass = discountRate <= 0.12 ? "text-blue-600 bg-blue-50" : discountRate <= 0.20 ? "text-amber-600 bg-amber-50" : "text-rose-600 bg-rose-50";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
      {/* 1. Net Sales Card */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Sales</span>
          <div className="p-1 bg-blue-50 text-blue-600 rounded">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-base lg:text-lg font-bold text-slate-900 tracking-tight block">
            {formatCurrency(netSales)}
          </span>
          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
            Gross: {formatCurrency(metrics.totalGrossSales)}
          </span>
        </div>
      </div>

      {/* 2. Target Achievement % */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Achv.</span>
          <div className="p-1 bg-slate-50 text-slate-600 rounded">
            <Target className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-base lg:text-lg font-bold text-slate-900 tracking-tight block">
            {formatPercentage(targetAch)}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[9px] font-bold px-1 py-0.2 rounded-sm border ${targetColorClass}`}>
              {targetAch >= 1 ? "Goal Met" : `${((1 - targetAch) * 100).toFixed(0)}% Gap`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Average Transaction Value */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg. Ticket (ATV)</span>
          <div className="p-1 bg-blue-50 text-blue-600 rounded">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-base lg:text-lg font-bold text-slate-900 tracking-tight block">
            ${atv.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
            Across {metrics.totalTransactions.toLocaleString()} orders
          </span>
        </div>
      </div>

      {/* 4. Conversion Rate */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conversion</span>
          <div className="p-1 bg-slate-50 text-slate-600 rounded">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-base lg:text-lg font-bold text-slate-900 tracking-tight block">
            {formatPercentage(convRate)}
          </span>
          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
            Traffic: {formatCurrency(metrics.totalFootfall).replace("$", "")} visitors
          </span>
        </div>
      </div>

      {/* 5. Discount Rate */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discount Rate</span>
          <div className="p-1 bg-slate-50 text-slate-600 rounded">
            <Percent className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-base lg:text-lg font-bold text-slate-900 tracking-tight block">
            {formatPercentage(discountRate)}
          </span>
          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
            Saved: {formatCurrency(metrics.totalDiscounts)}
          </span>
        </div>
      </div>

      {/* 6. Return Rate */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Return Rate</span>
          <div className="p-1 bg-rose-50 text-rose-600 rounded">
            <Percent className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-base lg:text-lg font-bold text-slate-900 tracking-tight block">
            {formatPercentage(returnRate)}
          </span>
          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
            Loss: {formatCurrency(metrics.totalReturns)}
          </span>
        </div>
      </div>
    </div>
  );
}
