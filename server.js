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

5. **Paste it into GitHub**
6. **Scroll down** - the file should end with the `});` after `app.listen`
7. **Check**: The file should be exactly **91 lines** (no more, no less)
8. **Commit**: Add message "Clean server.js - remove all instructions"
9. Click **"Commit changes"**

---

## Important: Copy ONLY the Code

When you copy:
- ✅ Start from the first `import` line
- ✅ End at the last `});` 
- ❌ Don't copy anything before or after
- ❌ Don't copy line numbers
- ❌ Don't copy markdown formatting like backticks

---

## After You Commit:

1. Wait 1-2 minutes for Render to deploy
2. Check the Logs - you should see:
```
   Build successful 🎉
   MCP server running on port 10000
