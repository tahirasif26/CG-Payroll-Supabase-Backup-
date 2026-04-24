// Scan receipt/invoice using Lovable AI (Gemini vision) and return structured fields with confidence scores.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    const systemPrompt = `You are an expert receipt/invoice OCR engine. Extract structured fields from the provided receipt or invoice image.
For each field, return both the value AND a confidence rating of "high", "medium", or "low" based on how clearly visible/certain the value is in the image.
- amount: numeric total amount (string, no commas, e.g. "245.00"). If unclear, your best estimate.
- currency: ISO currency code (e.g. SAR, AED, USD, EUR, GBP, INR, PKR). Infer from symbols/context.
- date: ISO date string YYYY-MM-DD of the transaction/invoice date.
- category: one of ["Travel", "Client Entertainment", "Training", "Equipment", "Other"]. Pick the best fit.
- description: a concise 1-line description of what the expense is for (vendor + item summary).
If a field is completely missing/unreadable, set confidence "low" and provide a sensible empty/default value.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the receipt/invoice details from this image." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_receipt_data",
              description: "Return extracted receipt fields with confidence ratings.",
              parameters: {
                type: "object",
                properties: {
                  amount: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["value", "confidence"],
                  },
                  currency: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["value", "confidence"],
                  },
                  date: {
                    type: "object",
                    properties: {
                      value: { type: "string", description: "YYYY-MM-DD" },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["value", "confidence"],
                  },
                  category: {
                    type: "object",
                    properties: {
                      value: {
                        type: "string",
                        enum: ["Travel", "Client Entertainment", "Training", "Equipment", "Other"],
                      },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["value", "confidence"],
                  },
                  description: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["value", "confidence"],
                  },
                },
                required: ["amount", "currency", "date", "category", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_receipt_data" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Workspace Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI scan failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Could not extract structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ success: true, data: args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
