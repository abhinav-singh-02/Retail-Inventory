import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Lazy initialize the Gemini Client to prevent crash on boot if API key is not present
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to your secrets or environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser limit increased to handle larger aggregated payloads
  app.use(express.json({ limit: "50mb" }));

  // API endpoints
  app.post("/api/insights", async (req, res) => {
    try {
      // Lazy-check if API Key exists
      const ai = getGeminiClient();
      const payload = req.body;

      if (!payload || !payload.metrics) {
        return res.status(400).json({ error: "Invalid data payload. Missing metric summaries." });
      }

      const { metrics, topCategories, bottomCategories, regionalPerformance, stockoutRisks, filterContext } = payload;

      // Build a concise aggregated summary to stay within token limits and respect privacy (no PII sent)
      const promptContext = `
Analyze the following aggregated retail performance data for a Retail Operations Manager:

=== CONTEXT ===
- Filtered Weeks: ${filterContext?.weeks?.join(", ") || "All Weeks"}
- Filtered Regions: ${filterContext?.regions?.join(", ") || "All Regions"}
- Filtered Categories: ${filterContext?.categories?.join(", ") || "All Categories"}

=== AGGREGATED KPIs ===
- Net Sales: $${metrics.totalNetSales.toLocaleString()} (Gross: $${metrics.totalGrossSales.toLocaleString()}, Discounts: $${metrics.totalDiscounts.toLocaleString()}, Returns: $${metrics.totalReturns.toLocaleString()})
- Target Achievement Rate: ${(metrics.targetAchievement * 100).toFixed(1)}% (Total Target: $${metrics.totalTarget.toLocaleString()})
- Footfall: ${metrics.totalFootfall.toLocaleString()} | Transactions: ${metrics.totalTransactions.toLocaleString()}
- Average Transaction Value (ATV): $${metrics.averageTransactionValue.toFixed(2)}
- Conversion Rate: ${(metrics.conversionRate * 100).toFixed(2)}%
- Return Rate: ${(metrics.returnRate * 100).toFixed(2)}% of Gross Sales
- Discount Rate: ${(metrics.discountRate * 100).toFixed(2)}% of Gross Sales
- Total Marketing Spend: $${metrics.totalMarketingSpend.toLocaleString()}
- Total Units Sold: ${metrics.totalUnitsSold.toLocaleString()}

=== PRODUCT CATEGORY PERFORMANCE (Net Sales) ===
- Top Performing Categories:
${topCategories.map((c: any) => `  * ${c.category}: $${c.netSales.toLocaleString()}`).join("\n")}
- Bottom Performing Categories:
${bottomCategories.map((c: any) => `  * ${c.category}: $${c.netSales.toLocaleString()}`).join("\n")}

=== REGIONAL PERFORMANCE (Net Sales & Conversion) ===
${regionalPerformance.map((r: any) => `- ${r.region}: Net Sales $${r.netSales.toLocaleString()}, Conversion Rate ${(r.conversionRate * 100).toFixed(2)}%`).join("\n")}

=== CRITICAL STOCKOUT RISKS (Units Sold vs. Inventory) ===
${stockoutRisks.slice(0, 10).map((s: any) => `- Store "${s.storeName}" (${s.category}): Inventory ${s.inventory} units | Sold ${s.unitsSold} units. Sold-to-inventory ratio: ${(s.ratio).toFixed(1)}x (${s.riskLevel} Risk)`).join("\n") || "No immediate high-risk stockouts found in the selected subset."}

Based on these numbers, provide highly strategic, actionable, and specific recommendations. Group them into three clear sections:
1. **Immediate Tactical Actions**: Low-hanging fruits, quick wins or urgent interventions (e.g., immediate inventory re-allocation to high stockout-risk stores, discount adjustments, or returns optimization).
2. **Strategic Operational Improvements**: Medium-term solutions (e.g., shifting marketing budget from low-performing/saturated regions to high-conversion regions, store format specific strategies, regional footfall conversion plays).
3. **Risks to Mitigate**: Critical alert signals (e.g., margins being compressed by high discount rates, regions where conversion rate is lagging despite high footfall and marketing spend, high-return categories/stores).

Be direct, corporate, professional, and practical. Avoid hand-wavy advice; make it trace back directly to the provided KPIs and numbers.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptContext,
        config: {
          systemInstruction: "You are a professional retail operations executive and senior business analyst. You produce brief, high-impact, actionable, bulleted markdown insights based on real aggregated numbers. Do not include verbose intros or generic advice. Keep recommendations sharp, numbered, and direct.",
        },
      });

      res.json({ insights: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({
        error: error.message || "An unexpected error occurred while generating insights.",
        missingKey: !process.env.GEMINI_API_KEY
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
