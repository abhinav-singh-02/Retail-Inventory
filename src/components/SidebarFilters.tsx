import React, { useMemo } from "react";
import { Filter, Check, RotateCcw, X } from "lucide-react";
import { MergedRow, FilterState } from "../types";

interface SidebarFiltersProps {
  data: MergedRow[];
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
}

export default function SidebarFilters({ data, filterState, setFilterState }: SidebarFiltersProps) {
  // Dynamically extract unique values
  const uniqueValues = useMemo(() => {
    const weeksSet = new Set<string>();
    const regionsSet = new Set<string>();
    const citiesSet = new Set<string>();
    const formatsSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const storesMap = new Map<string, string>(); // storeId -> storeName

    data.forEach((row) => {
      if (row.week) weeksSet.add(row.week);
      if (row.region) regionsSet.add(row.region);
      if (row.city) citiesSet.add(row.city);
      if (row.storeFormat) formatsSet.add(row.storeFormat);
      if (row.category) categoriesSet.add(row.category);
      if (row.storeId && row.storeName) storesMap.set(row.storeId, row.storeName);
    });

    // Sort values for cleaner layout
    return {
      weeks: Array.from(weeksSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      regions: Array.from(regionsSet).sort(),
      cities: Array.from(citiesSet).sort(),
      storeFormats: Array.from(formatsSet).sort(),
      categories: Array.from(categoriesSet).sort(),
      stores: Array.from(storesMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [data]);

  const handleToggleValue = (key: keyof FilterState, value: string) => {
    setFilterState((prev) => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return {
        ...prev,
        [key]: next,
      };
    });
  };

  const handleSelectAll = (key: keyof FilterState, allValues: string[]) => {
    setFilterState((prev) => ({
      ...prev,
      [key]: allValues,
    }));
  };

  const handleClearAll = (key: keyof FilterState) => {
    setFilterState((prev) => ({
      ...prev,
      [key]: [],
    }));
  };

  const handleResetFilters = () => {
    setFilterState({
      weeks: uniqueValues.weeks,
      regions: uniqueValues.regions,
      cities: uniqueValues.cities,
      storeFormats: uniqueValues.storeFormats,
      categories: uniqueValues.categories,
      stores: uniqueValues.stores.map((s) => s.id),
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filterState.weeks.length < uniqueValues.weeks.length) count++;
    if (filterState.regions.length < uniqueValues.regions.length) count++;
    if (filterState.cities.length < uniqueValues.cities.length) count++;
    if (filterState.storeFormats.length < uniqueValues.storeFormats.length) count++;
    if (filterState.categories.length < uniqueValues.categories.length) count++;
    if (filterState.stores.length < uniqueValues.stores.length) count++;
    return count;
  };

  if (data.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 text-center">
        <Filter className="w-5 h-5 mx-auto text-slate-400 mb-2" />
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Upload data or load the interactive demo to unlock dashboard filters.
        </p>
      </div>
    );
  }

  const activeCount = getActiveFilterCount();

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 flex flex-col h-full text-slate-300">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="font-bold text-white text-xs uppercase tracking-wider">Dashboard Filters</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.2 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold rounded">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[10px] font-bold text-slate-400 hover:text-blue-400 flex items-center gap-0.5 transition-colors cursor-pointer uppercase tracking-wider"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Reset
          </button>
        )}
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto max-h-[70vh] pr-0.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {/* Weeks */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time Period (Week)</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectAll("weeks", uniqueValues.weeks)}
                className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold uppercase tracking-wider"
              >
                All
              </button>
              <span className="text-[9px] text-slate-700">|</span>
              <button
                type="button"
                onClick={() => handleClearAll("weeks")}
                className="text-[9px] text-slate-500 hover:text-slate-400 font-semibold uppercase tracking-wider"
              >
                None
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {uniqueValues.weeks.map((week) => {
              const selected = filterState.weeks.includes(week);
              return (
                <button
                  key={week}
                  type="button"
                  onClick={() => handleToggleValue("weeks", week)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-all cursor-pointer ${
                    selected
                      ? "bg-blue-600 border-blue-600 text-white font-bold"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {week}
                </button>
              );
            })}
          </div>
        </div>

        {/* Regions */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Regions</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectAll("regions", uniqueValues.regions)}
                className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold uppercase tracking-wider"
              >
                All
              </button>
              <span className="text-[9px] text-slate-700">|</span>
              <button
                type="button"
                onClick={() => handleClearAll("regions")}
                className="text-[9px] text-slate-500 hover:text-slate-400 font-semibold uppercase tracking-wider"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-[110px] overflow-y-auto pr-0.5">
            {uniqueValues.regions.map((region) => {
              const selected = filterState.regions.includes(region);
              return (
                <label
                  key={region}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-800/50 rounded text-[11px] text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleToggleValue("regions", region)}
                    className="rounded border-slate-700 text-blue-500 focus:ring-blue-500 w-3 h-3 bg-slate-800"
                  />
                  <span>{region}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Product Categories */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categories</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectAll("categories", uniqueValues.categories)}
                className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold uppercase tracking-wider"
              >
                All
              </button>
              <span className="text-[9px] text-slate-700">|</span>
              <button
                type="button"
                onClick={() => handleClearAll("categories")}
                className="text-[9px] text-slate-500 hover:text-slate-400 font-semibold uppercase tracking-wider"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto pr-0.5">
            {uniqueValues.categories.map((category) => {
              const selected = filterState.categories.includes(category);
              return (
                <label
                  key={category}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-800/50 rounded text-[11px] text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleToggleValue("categories", category)}
                    className="rounded border-slate-700 text-blue-500 focus:ring-blue-500 w-3 h-3 bg-slate-800"
                  />
                  <span>{category}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Cities */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cities</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectAll("cities", uniqueValues.cities)}
                className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold uppercase tracking-wider"
              >
                All
              </button>
              <span className="text-[9px] text-slate-700">|</span>
              <button
                type="button"
                onClick={() => handleClearAll("cities")}
                className="text-[9px] text-slate-500 hover:text-slate-400 font-semibold uppercase tracking-wider"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-[110px] overflow-y-auto pr-0.5">
            {uniqueValues.cities.map((city) => {
              const selected = filterState.cities.includes(city);
              return (
                <label
                  key={city}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-800/50 rounded text-[11px] text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleToggleValue("cities", city)}
                    className="rounded border-slate-700 text-blue-500 focus:ring-blue-500 w-3 h-3 bg-slate-800"
                  />
                  <span>{city}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Store Formats */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Store Formats</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectAll("storeFormats", uniqueValues.storeFormats)}
                className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold uppercase tracking-wider"
              >
                All
              </button>
              <span className="text-[9px] text-slate-700">|</span>
              <button
                type="button"
                onClick={() => handleClearAll("storeFormats")}
                className="text-[9px] text-slate-500 hover:text-slate-400 font-semibold uppercase tracking-wider"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-[110px] overflow-y-auto pr-0.5">
            {uniqueValues.storeFormats.map((format) => {
              const selected = filterState.storeFormats.includes(format);
              return (
                <label
                  key={format}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-800/50 rounded text-[11px] text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleToggleValue("storeFormats", format)}
                    className="rounded border-slate-700 text-blue-500 focus:ring-blue-500 w-3 h-3 bg-slate-800"
                  />
                  <span>{format}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Stores Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Specific Stores</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectAll("stores", uniqueValues.stores.map(s => s.id))}
                className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold uppercase tracking-wider"
              >
                All
              </button>
              <span className="text-[9px] text-slate-700">|</span>
              <button
                type="button"
                onClick={() => handleClearAll("stores")}
                className="text-[9px] text-slate-500 hover:text-slate-400 font-semibold uppercase tracking-wider"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-[130px] overflow-y-auto pr-0.5 border border-slate-800 rounded p-1.5 bg-slate-950">
            {uniqueValues.stores.map((store) => {
              const selected = filterState.stores.includes(store.id);
              return (
                <label
                  key={store.id}
                  className="flex items-start gap-1.5 px-1 py-0.5 hover:bg-slate-900 rounded text-[11px] text-slate-300 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleToggleValue("stores", store.id)}
                    className="rounded border-slate-700 text-blue-500 focus:ring-blue-500 w-3 h-3 bg-slate-850 mt-0.5 shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold line-clamp-1 text-slate-200">{store.name}</span>
                    <span className="text-[8px] text-slate-500 font-mono tracking-tight">{store.id}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
