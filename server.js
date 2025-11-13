import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// === MCP MANIFEST ===
app.get("/manifest.json", (req, res) => {
  res.json({
    name: "n8n-hubspot",
    description: "Fetches HubSpot data via n8n webhook",
    tools: [
      {
        name: "getHubSpotDealSummary",
        description: "Gets all notes and emails from HubSpot for a deal",
        input_schema: {
          type: "object",
          properties: {
            dealId: { type: "string" }
          },
          required: ["dealId"]
        }
      }
    ]
  });
});

// === TOOL HANDLER ===
app.post("/tools/getHubSpotDealSummary", async (req, res) => {
  const { dealId } = req.body;
  try {
    const result = await fetch("https://aitenders.app.n8n.cloud/webhook/hubspot-deal-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId })
    });
    const data = await result.json();
    res.json(data);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to call n8n webhook" });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`✅ MCP server running on port ${PORT}`));
