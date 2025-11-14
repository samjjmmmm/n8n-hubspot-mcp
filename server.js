import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const N8N_WEBHOOK_URL = "https://aitenders.app.n8n.cloud/webhook/8e0a183d-9ede-4335-9859-960cc398016f";

app.get("/", (req, res) => {
  res.json({
    mcp: "0.1.0",
    name: "hubspot-mcp",
    version: "1.0.0",
    tools: [{
      name: "get_deal_data",
      description: "Fetch HubSpot deal data with emails and notes",
      input_schema: {
        type: "object",
        properties: {
          dealId: { type: "string" }
        },
        required: ["dealId"]
      }
    }]
  });
});

app.get("/sse", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  res.write("data: " + JSON.stringify({ type: "connected" }) + "\n\n");
  
  res.write("data: " + JSON.stringify({
    type: "tools",
    tools: [{
      name: "get_deal_data",
      description: "Fetch HubSpot deal data with emails and notes",
      input_schema: {
        type: "object",
        properties: {
          dealId: { type: "string" }
        },
        required: ["dealId"]
      }
    }]
  }) + "\n\n");

  req.on("close", () => res.end());
});

app.post("/call", async (req, res) => {
  const { tool, arguments: args } = req.body;

  if (tool === "get_deal_data") {
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: args.dealId })
      });

      const data = await response.json();

      res.json({
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        isError: false
      });
    } catch (err) {
      res.json({
        content: [{ type: "text", text: "Error: " + err.message }],
        isError: true
      });
    }
  } else {
    res.json({
      content: [{ type: "text", text: "Unknown tool" }],
      isError: true
    });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log("MCP server running on port " + port);
});
```

6. **Scroll down** and click **"Commit changes"**
7. Add message: "Fix syntax error - clean code"
8. Click **"Commit changes"**

---

## Wait for Render to Deploy

1. Go back to your Render dashboard
2. Watch the **Events** section
3. Wait for **"Deploy live"** with green checkmark ✅
4. This should take 1-2 minutes

---

## Then Test

Once you see "Deploy live" ✅:

1. Open: `https://n8n-hubspot-mcp.onrender.com/sse`
   - You should see streaming data (not an error!)

2. **Restart Claude completely**
   - Quit and reopen

3. Try in Claude:
```
   use hubspot-mcp.get_deal_data with {"dealId": "43694833922"}
