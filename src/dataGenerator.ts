import * as XLSX from "xlsx";
import { StoreMaster, WeeklyTransaction, MergedRow } from "./types";

export const DEMO_STORES: StoreMaster[] = [
  { storeId: "STR001", storeName: "Downtown Flagship", region: "East", city: "New York", storeFormat: "Flagship" },
  { storeId: "STR002", storeName: "Metro Hub Mall", region: "East", city: "Boston", storeFormat: "Mall" },
  { storeId: "STR003", storeName: "North Suburban Center", region: "North", city: "Chicago", storeFormat: "Suburban" },
  { storeId: "STR004", storeName: "East Mall Express", region: "East", city: "New York", storeFormat: "Express" },
  { storeId: "STR005", storeName: "Westside Premium Outlet", region: "West", city: "Los Angeles", storeFormat: "Outlet" },
  { storeId: "STR006", storeName: "South Plaza Galleria", region: "South", city: "Miami", storeFormat: "Mall" },
  { storeId: "STR007", storeName: "Coastal Center", region: "South", city: "Atlanta", storeFormat: "Mall" },
  { storeId: "STR008", storeName: "Valley Suburban Outlet", region: "West", city: "San Francisco", storeFormat: "Suburban" },
];

export const CATEGORIES = ["Apparel", "Electronics", "Home & Living", "Beauty & Cosmetics", "Footwear"];
export const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4"];

// Helper to generate realistic transactions
export function generateDemoTransactions(): WeeklyTransaction[] {
  const transactions: WeeklyTransaction[] = [];

  DEMO_STORES.forEach((store) => {
    WEEKS.forEach((week) => {
      CATEGORIES.forEach((category) => {
        // Create baseline parameters based on Store Format
        let baseFootfall = 2000;
        let baseConversion = 0.22;
        let unitPrice = 50;

        if (store.storeFormat === "Flagship") {
          baseFootfall = 4500;
          baseConversion = 0.28;
        } else if (store.storeFormat === "Express") {
          baseFootfall = 1200;
          baseConversion = 0.35; // high conversion, fast purchases
        } else if (store.storeFormat === "Outlet") {
          baseFootfall = 3000;
          baseConversion = 0.25;
        }

        // Adjust parameters based on Category
        if (category === "Electronics") {
          unitPrice = 180;
          baseConversion *= 0.6; // lower conversion for high price
        } else if (category === "Beauty & Cosmetics") {
          unitPrice = 28;
          baseConversion *= 1.3; // higher impulse conversion
        } else if (category === "Home & Living") {
          unitPrice = 85;
          baseConversion *= 0.8;
        } else if (category === "Footwear") {
          unitPrice = 65;
        }

        // Add some random variation
        const randomFactor = 0.85 + Math.random() * 0.3; // ±15%
        const footfall = Math.round(baseFootfall * randomFactor);
        const conversion = Math.min(0.8, baseConversion * (0.9 + Math.random() * 0.2));
        const txCount = Math.round(footfall * conversion);
        
        // Units sold per transaction
        const unitsPerTx = 1.1 + Math.random() * 1.4;
        const unitsSold = Math.round(txCount * unitsPerTx);
        
        // Financials
        const grossSales = Math.round(unitsSold * unitPrice);
        // Outlets have higher discounts
        const discountRate = store.storeFormat === "Outlet" ? 0.25 + Math.random() * 0.15 : 0.05 + Math.random() * 0.12;
        const discountAmount = Math.round(grossSales * discountRate);
        
        // Target is slightly offset
        const targetOffset = 0.9 + Math.random() * 0.3; // 90% to 120% of sales
        const target = Math.round(grossSales * targetOffset);

        // Inventory: make some stores run extremely low to simulate stockout risk (West and South regions specifically)
        let inventoryMultiplier = 1.5 + Math.random() * 3;
        if ((store.region === "West" && category === "Electronics") || (store.region === "South" && category === "Apparel")) {
          inventoryMultiplier = 0.4 + Math.random() * 0.5; // low inventory relative to sales trajectory!
        }
        const inventory = Math.round(unitsSold * inventoryMultiplier);

        // Returns: Electronics and Apparel have higher returns
        let returnRate = 0.01 + Math.random() * 0.03;
        if (category === "Apparel" || category === "Electronics") {
          returnRate = 0.04 + Math.random() * 0.06;
        }
        const returns = Math.round(grossSales * returnRate);

        // Marketing spend
        const marketingSpend = Math.round((grossSales * 0.05) * (0.7 + Math.random() * 0.6));

        transactions.push({
          storeId: store.storeId,
          week,
          category,
          footfall,
          transactions: txCount,
          unitsSold,
          grossSales,
          discountAmount,
          target,
          inventory,
          returns,
          marketingSpend,
        });
      });
    });
  });

  return transactions;
}

// Function to immediately get merged demo data
export function getMergedDemoData(): MergedRow[] {
  const transactions = generateDemoTransactions();
  return transactions.map((t) => {
    const store = DEMO_STORES.find((s) => s.storeId === t.storeId)!;
    const netSales = Math.max(0, t.grossSales - t.discountAmount - t.returns);
    return {
      ...store,
      ...t,
      netSales,
    };
  });
}

// Function to create and download the "Store Master" template XLSX
export function downloadStoreMasterTemplate() {
  const headers = [["Store ID", "Store Name", "Region", "City", "Store Format"]];
  const rows = DEMO_STORES.map((s) => [s.storeId, s.storeName, s.region, s.city, s.storeFormat]);
  
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Store Master");
  
  // Download file
  XLSX.writeFile(wb, "Store_Master_Template.xlsx");
}

// Function to create and download the "Weekly Transactions" template XLSX
export function downloadWeeklyTransactionsTemplate() {
  const headers = [[
    "Store ID", 
    "Week", 
    "Category", 
    "Footfall", 
    "Transactions", 
    "Units Sold", 
    "Gross Sales", 
    "Discount Amount", 
    "Target", 
    "Inventory", 
    "Returns", 
    "Marketing Spend"
  ]];
  
  const transactions = generateDemoTransactions();
  const rows = transactions.map((t) => [
    t.storeId,
    t.week,
    t.category,
    t.footfall,
    t.transactions,
    t.unitsSold,
    t.grossSales,
    t.discountAmount,
    t.target,
    t.inventory,
    t.returns,
    t.marketingSpend
  ]);
  
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Weekly Transactions");
  
  XLSX.writeFile(wb, "Weekly_Transactions_Template.xlsx");
}
