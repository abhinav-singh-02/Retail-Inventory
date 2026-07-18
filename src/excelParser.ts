import * as XLSX from "xlsx";
import { StoreMaster, WeeklyTransaction, MergedRow } from "./types";

// Helper to normalize column headers
function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s_-]/g, "");
}

export interface ParseResult<T> {
  data: T[];
  error: string | null;
}

export function parseStoreMaster(file: File): Promise<ParseResult<StoreMaster>> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ data: [], error: "Could not read file data." });
          return;
        }
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          resolve({ data: [], error: "The file is empty." });
          return;
        }

        // Detect columns
        const originalHeaders = Object.keys(jsonData[0]);
        const headerMap: Record<string, string> = {};
        
        originalHeaders.forEach((oh) => {
          const norm = normalizeHeader(oh);
          if (norm === "storeid" || norm === "id") headerMap["storeId"] = oh;
          else if (norm === "storename" || norm === "name" || norm === "store") headerMap["storeName"] = oh;
          else if (norm === "region") headerMap["region"] = oh;
          else if (norm === "city") headerMap["city"] = oh;
          else if (norm === "storeformat" || norm === "format") headerMap["storeFormat"] = oh;
        });

        // Validate required headers
        if (!headerMap["storeId"]) {
          resolve({ data: [], error: "Could not find a 'Store ID' column in the Excel file." });
          return;
        }

        const parsedStores: StoreMaster[] = jsonData.map((row) => {
          return {
            storeId: String(row[headerMap["storeId"]] || "").trim(),
            storeName: String(row[headerMap["storeName"]] || `Store ${row[headerMap["storeId"]] || ""}`).trim(),
            region: String(row[headerMap["region"]] || "Unknown").trim(),
            city: String(row[headerMap["city"]] || "Unknown").trim(),
            storeFormat: String(row[headerMap["storeFormat"]] || "Standard").trim(),
          };
        }).filter(item => item.storeId !== ""); // remove empty rows

        resolve({ data: parsedStores, error: null });
      } catch (err: any) {
        resolve({ data: [], error: `Parsing failed: ${err.message || err}` });
      }
    };
    reader.onerror = () => {
      resolve({ data: [], error: "File reading failed." });
    };
    reader.readAsBinaryString(file);
  });
}

export function parseWeeklyTransactions(file: File): Promise<ParseResult<WeeklyTransaction>> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ data: [], error: "Could not read file data." });
          return;
        }
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          resolve({ data: [], error: "The file is empty." });
          return;
        }

        // Map columns
        const originalHeaders = Object.keys(jsonData[0]);
        const headerMap: Record<string, string> = {};
        
        originalHeaders.forEach((oh) => {
          const norm = normalizeHeader(oh);
          if (norm === "storeid" || norm === "id") headerMap["storeId"] = oh;
          else if (norm === "week" || norm === "period" || norm === "date" || norm === "weekstartdate") headerMap["week"] = oh;
          else if (norm === "category" || norm === "productcategory") headerMap["category"] = oh;
          else if (norm === "footfall" || norm === "traffic") headerMap["footfall"] = oh;
          else if (norm === "transactions" || norm === "salescount" || norm === "txs" || norm === "tx") headerMap["transactions"] = oh;
          else if (norm === "unitssold" || norm === "units" || norm === "qty" || norm === "quantity") headerMap["unitsSold"] = oh;
          else if (norm === "grosssales" || norm === "gross" || norm === "sales") headerMap["grossSales"] = oh;
          else if (norm === "discountamount" || norm === "discount" || norm === "discounts") headerMap["discountAmount"] = oh;
          else if (norm === "target" || norm === "targetsales" || norm === "goal" || norm === "salestarget") headerMap["target"] = oh;
          else if (norm === "inventory" || norm === "stock" || norm === "inventoryonhand") headerMap["inventory"] = oh;
          else if (norm === "returns" || norm === "returnedunits" || norm === "returned" || norm === "returnsamount") headerMap["returns"] = oh;
          else if (norm === "marketingspend" || norm === "marketing" || norm === "ads" || norm === "adspend") headerMap["marketingSpend"] = oh;
        });

        // Validate essential headers
        const requiredFields = ["storeId", "week", "category"];
        for (const field of requiredFields) {
          if (!headerMap[field]) {
            resolve({ data: [], error: `Missing required column for '${field}' (e.g. 'Store ID', 'Week', 'Category') in Weekly Transactions.` });
            return;
          }
        }

        // Parse rows
        const parsedTx: WeeklyTransaction[] = jsonData.map((row) => {
          const parseNum = (val: any): number => {
            if (val === undefined || val === null) return 0;
            const parsed = Number(val);
            return isNaN(parsed) ? 0 : parsed;
          };

          return {
            storeId: String(row[headerMap["storeId"]] || "").trim(),
            week: String(row[headerMap["week"]] || "").trim(),
            category: String(row[headerMap["category"]] || "General").trim(),
            footfall: parseNum(row[headerMap["footfall"]]),
            transactions: parseNum(row[headerMap["transactions"]]),
            unitsSold: parseNum(row[headerMap["unitsSold"]]),
            grossSales: parseNum(row[headerMap["grossSales"]]),
            discountAmount: parseNum(row[headerMap["discountAmount"]]),
            target: parseNum(row[headerMap["target"]]),
            inventory: parseNum(row[headerMap["inventory"]]),
            returns: parseNum(row[headerMap["returns"]]),
            marketingSpend: parseNum(row[headerMap["marketingSpend"]]),
          };
        }).filter(item => item.storeId !== "" && item.week !== "");

        resolve({ data: parsedTx, error: null });
      } catch (err: any) {
        resolve({ data: [], error: `Parsing failed: ${err.message || err}` });
      }
    };
    reader.onerror = () => {
      resolve({ data: [], error: "File reading failed." });
    };
    reader.readAsBinaryString(file);
  });
}

// Client-side merging algorithm
export function mergeDatasets(stores: StoreMaster[], txs: WeeklyTransaction[]): { data: MergedRow[]; unmappedStoresCount: number } {
  let unmappedStoresCount = 0;
  
  const merged: MergedRow[] = txs.map((tx) => {
    const store = stores.find((s) => s.storeId.toLowerCase() === tx.storeId.toLowerCase());
    
    const netSales = Math.max(0, tx.grossSales - tx.discountAmount - tx.returns);
    
    if (!store) {
      unmappedStoresCount++;
      return {
        storeId: tx.storeId,
        storeName: `Unmapped Store (${tx.storeId})`,
        region: "Unmapped",
        city: "Unmapped",
        storeFormat: "Unmapped",
        ...tx,
        netSales,
      };
    }

    return {
      ...store,
      ...tx,
      netSales,
    };
  });

  return { data: merged, unmappedStoresCount };
}
