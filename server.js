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

// ---- SSE ENDPOINT FOR CLAUDE ----
app.get("/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  // Send tool list
  const toolList = {
    type: "tools",
    tools: [
      {
        name: "get_deal_data",
        description: "Fetch merged HubSpot deal data with emails and notes from n8n",
        input_schema: {
          type: "object",
          properties: {
            dealId: { 
              type: "string",
              description: "The HubSpot deal ID to fetch"
            }
          },
          required: ["dealId"]
        }
      }
    ]
  };
  res.write(`data: ${JSON.stringify(toolList)}\n\n`);

  // Handle tool calls via SSE
  req.on("close", () => {
    res.end();
  });
});

// ---- MCP TOOL EXECUTION ENDPOINT ----
app.post("/call", async (req, res) => {
  const { tool, arguments: args } = req.body;

  console.log(`[MCP] Tool called: ${tool} with args:`, args);

  if (tool === "get_deal_data") {
    try {
      console.log(`[MCP] Calling n8n webhook with dealId: ${args.dealId}`);
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: args.dealId })
      });

      if (!response.ok) {
        throw new Error(`n8n webhook returned ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      
      console.log(`[MCP] Successfully received data from n8n`);

      return res.json({
        content: [
          {
            type: "text",
            text: JSON.stringify(json, null, 2)
          }
        ],
        isError: false
      });
    } catch (err) {
      console.error(`[MCP] Error:`, err.message);
      
      return res.json({
        content: [
          {
            type: "text",
            text: `Error fetching deal data: ${err.message}`
          }
        ],
        isError: true
      });
    }
  }

  console.log(`[MCP] Unknown tool requested: ${tool}`);
  
  res.json({
    content: [
      {
        type: "text",
        text: `Unknown tool: ${tool}`
      }
    ],
    isError: true
  });
});

// Start server
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`✅ MCP server running on port ${port}`);
  console.log(`📍 Root: http://localhost:${port}/`);
  console.log(`📍 SSE: http://localhost:${port}/sse`);
  console.log(`📍 Call: http://localhost:${port}/call`);
});
```

### Step 2: Commit the Changes

1. Scroll down
2. Add commit message: "Add SSE endpoint for Claude integration"
3. Click **"Commit changes"**

### Step 3: Wait for Render to Deploy

1. Go back to your Render dashboard
2. You'll see a new deployment starting (in the Events section)
3. Wait 1-2 minutes for it to finish
4. Look for "Deploy live" with a green checkmark ✅

---

## Step 4: Verify the SSE Endpoint Works

Open this URL in your browser:
```
https://n8n-hubspot-mcp.onrender.com/sse
```

You should see text streaming like:
```
data: {"type":"connected"}

data: {"type":"tools","tools":[{"name":"get_deal_data",...}]}
