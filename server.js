import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// ✅ Use production webhook URL from your live n8n workflow
const N8N_WEBHOOK_URL = "https://aitenders.app.n8n.cloud/webhook/8e0a183d-9ede-4335-9859-960cc398016f";

// MCP required metadata
const MCP_VERSION = "0.1.0";

// ---- MCP ROOT ENDPOINT ----
app.get("/", (req, res) => {
  res.json({
    mcp: MCP_VERSION,
    name: "hubspot-mcp",
    version: "1.0.0",
    tools: [
      {
        name: "get_deal_data",
        description: "Fetch merged HubSpot Engagements from n8n webhook",
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

// ---- MCP TOOL EXECUTION ENDPOINT ----
app.post("/call", async (req, res) => {
  const { tool, arguments: args } = req.body;

  if (tool === "get_deal_data") {
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: args.dealId })
      });

      const json = await response.json();

      return res.json({
        content: json,
        isError: false
      });

    } catch (err) {
      return res.json({
        content: { error: err.message },
        isError: true
      });
    }
  }

  res.json({
    content: { error: "Unknown tool" },
    isError: true
  });
});

// Start server
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`MCP server running on port ${port}`);
});
