import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const N8N_WEBHOOK_URL = "https://aitenders.app.n8n.cloud/webhook/8e0a183d-9ede-4335-9859-960cc398016f";

// Helper function to format deal data for human readability
function formatDealData(data) {
  let output = "";
  
  // Deal basic info
  if (data.dealProperties) {
    output += "DEAL INFORMATION\n\n";
    output += `Deal Name: ${data.dealProperties.dealname || 'N/A'}\n`;
    output += `Amount: ${data.dealProperties.amount || 'N/A'} ${data.dealProperties.deal_currency_code || ''}\n`;
    output += `Deal Type: ${data.dealProperties.dealtype || 'N/A'}\n`;
    output += `Deal Stage: ${data.dealProperties.dealstage || 'N/A'}\n`;
    output += `Status: ${data.dealProperties.hs_is_closed_won === 'true' ? 'Closed Won' : data.dealProperties.hs_is_closed_lost === 'true' ? 'Closed Lost' : 'Open'}\n`;
    output += `Market: ${data.dealProperties.market_matrix || 'N/A'}\n`;
    output += `Segment: ${data.dealProperties.deal_segment_size || 'N/A'}\n`;
    output += `Created: ${data.dealProperties.createdate || 'N/A'}\n`;
    output += `Closed: ${data.dealProperties.closedate || 'N/A'}\n`;
    output += `Days to Close: ${data.dealProperties.days_to_close || 'N/A'}\n`;
    output += `Owner ID: ${data.dealProperties.hubspot_owner_id || 'N/A'}\n`;
    output += `Pipeline: ${data.dealProperties.pipeline || 'N/A'}\n`;
    output += `Forecast Category: ${data.dealProperties.hs_manual_forecast_category || 'N/A'}\n`;
    output += `Forecast Amount: ${data.dealProperties.hs_forecast_amount || 'N/A'}\n`;
    output += `\nView deal: ${data.dealUrl || ''}\n\n`;
  }
  
  // Engagement summary
  if (data.totalItems) {
    output += `ENGAGEMENT HISTORY\n\n`;
    output += `Total Engagements: ${data.totalItems}\n\n`;
  }
  
  // Separate engagements by type
  const emails = [];
  const notes = [];
  const calls = [];
  const meetings = [];
  const tasks = [];
  
  if (data.engagements && Array.isArray(data.engagements)) {
    data.engagements.forEach(eng => {
      switch(eng.type) {
        case 'EMAIL': emails.push(eng); break;
        case 'NOTE': notes.push(eng); break;
        case 'CALL': calls.push(eng); break;
        case 'MEETING': meetings.push(eng); break;
        case 'TASK': tasks.push(eng); break;
      }
    });
  }
  
  // Emails
  if (emails.length > 0) {
    output += `EMAILS (${emails.length} total)\n\n`;
    emails.forEach(email => {
      output += `Date: ${email.createdAt}\n`;
      output += `Author: ${email.author || 'unknown'}\n`;
      output += `${email.body}\n\n`;
      output += `---\n\n`;
    });
  }
  
  // Notes
  if (notes.length > 0) {
    output += `NOTES (${notes.length} total)\n\n`;
    notes.forEach(note => {
      output += `Date: ${note.createdAt}\n`;
      output += `Author: User ${note.author || 'unknown'}\n`;
      output += `${note.body}\n\n`;
      output += `---\n\n`;
    });
  }
  
  // Calls
  if (calls.length > 0) {
    output += `CALLS (${calls.length} total)\n\n`;
    calls.forEach(call => {
      output += `Date: ${call.createdAt}\n`;
      output += `Author: ${call.author || 'unknown'}\n`;
      output += `${call.body}\n\n`;
      output += `---\n\n`;
    });
  }
  
  // Meetings
  if (meetings.length > 0) {
    output += `MEETINGS (${meetings.length} total)\n\n`;
    meetings.forEach(meeting => {
      output += `Date: ${meeting.createdAt}\n`;
      output += `Author: ${meeting.author || 'unknown'}\n`;
      output += `${meeting.body}\n\n`;
      output += `---\n\n`;
    });
  }
  
  // Tasks
  if (tasks.length > 0) {
    output += `TASKS (${tasks.length} total)\n\n`;
    tasks.forEach(task => {
      output += `Date: ${task.createdAt}\n`;
      output += `Author: ${task.author || 'unknown'}\n`;
      output += `${task.body}\n\n`;
      output += `---\n\n`;
    });
  }
  
  return output;
}

const TOOL_DEFINITION = {
  name: "get_deal_data",
  description: "Fetch HubSpot deal data with all emails, notes, calls, meetings, and tasks. Returns formatted plain text with complete deal information and all engagement content in human-readable format.",
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

        // Format the data into human-readable text
        const formattedText = formatDealData(data);

        return res.json({
          jsonrpc: "2.0",
          id: id,
          result: {
            content: [
              {
                type: "text",
                text: formattedText
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

      // Format the data into human-readable text
      const formattedText = formatDealData(data);

      res.json({
        content: [{ type: "text", text: formattedText }],
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
