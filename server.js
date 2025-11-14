import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const N8N_WEBHOOK_URL = "https://aitenders.app.n8n.cloud/webhook/8e0a183d-9ede-4335-9859-960cc398016f";

const TOOL_DEFINITION = {
  name: "get_deal_data",
  description: "Fetch HubSpot deal data with emails and notes from n8n workflow",
  inputSchema: {
    type: "object",
    properties: {
      dealId: { 
        type: "string",
        description: "The HubSpot deal ID to fetch data for"
      }
    },
    required: ["dealId"]
  }
};

app.get("/", (req, res) => {
  res.json({
    mcp: "0.1.0",
    name: "hubspot-mcp",
    version: "1.0.0",
    tools: [TOOL_DEFINITION]
  });
});

app.get("/sse", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("message", {
    jsonrpc: "2.0",
    method: "notifications/initialized"
  });

  const toolsListMessage = {
    jsonrpc: "2.0",
    method: "tools/list",
    result: {
      tools: [TOOL_DEFINITION]
    }
  };
  
  res.write(`data: ${JSON.stringify(toolsListMessage)}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(keepAlive);
    res.end();
  });
});

app.post("/message", async (req, res) => {
  console.log("[MCP] Received message:", JSON.stringify(req.body, null, 2));
  
  const { jsonrpc, id, method, params } = req.body;

  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id: id,
      result: {
        tools: [TOOL_DEFINITION]
      }
    });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    
    if (name === "get_deal_data") {
      try {
        console.log(`[MCP] Calling n8n with dealId: ${args.dealId}`);
        
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealId: args.dealId })
        });

        if (!response.ok) {
          throw new Error(`n8n returned ${response.status}`);
        }

        const data = await response.json();
        
        console.log("[MCP] Successfully got data from n8n");

        return res.json({
          jsonrpc: "2.0",
          id: id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(data, null, 2)
              }
            ]
          }
        });
      } catch (err) {
        console.error("[MCP] Error:", err.message);
        
        return res.json({
          jsonrpc: "2.0",
          id: id,
          error: {
            code: -32603,
            message: err.message
          }
        });
      }
    }
  }

  return res.json({
    jsonrpc: "2.0",
    id: id,
    error: {
      code: -32601,
      message: "Method not found"
    }
  });
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
