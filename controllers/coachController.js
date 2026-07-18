const Groq = require("groq-sdk");
const HealthLog = require("../models/HealthLog");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile"; // supports tool calling well on Groq

const SYSTEM_PROMPT = `You are PulseCoach, a sharp, encouraging AI health companion.
You see the user's real health data (water, steps, active calories, sleep) and give short,
specific, actionable feedback - never generic. Reference actual numbers. Keep responses under
4 sentences unless asked for detail. You are not a doctor - never give medical diagnoses or
medication advice; for real medical concerns, tell the user to see a professional.
When the user mentions doing something health-related but gives no specific number (e.g. "I drank
some water"), do NOT log it and do NOT guess a quantity - just ask them how much.`;

// OpenAI-style function definition (Groq uses this format, not Anthropic's tool schema)
const TOOLS = [
  {
    type: "function",
    function: {
      name: "log_health_action",
      description:
        "Call this ONLY when the user's message states a CLEAR, EXPLICIT quantity for something health-related they just did (e.g. 'drank 300ml of water', 'walked 2000 steps'). Do NOT call this if no number is stated, even if the action is clear — e.g. 'I drank some water' or 'I went for a walk' have no quantity and must NOT trigger a log. Never invent or estimate a default value.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["water", "steps", "activeEnergy", "sleep"]
          },
          value: {
            type: "number",
            description:
              "Amount in ml (water), count (steps), kcal (activeEnergy), or hours (sleep)"
          }
        },
        required: ["type", "value"]
      }
    }
  }
];

// POST /api/coach/chat  (Server-Sent Events stream)
const chat = async (req, res) => {
  const { message, healthSnapshot } = req.body;

  if (!message) {
    return res.status(400).json({ message: "message is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const contextBlock = healthSnapshot
    ? `Current health data:\n${JSON.stringify(healthSnapshot, null, 2)}`
    : "No health data available yet for this session.";

  try {
    const stream = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 512,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${contextBlock}\n\nUser message: ${message}` }
      ],
      tools: TOOLS,
      tool_choice: "auto"
    });

    // Tool call arguments arrive as fragmented JSON strings across chunks,
    // so we accumulate them and only parse once the stream finishes.
    let pendingToolCall = null; // { name, argsBuffer }

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        res.write(`data: ${JSON.stringify({ type: "text", text: delta.content })}\n\n`);
      }

      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          if (!pendingToolCall) {
            pendingToolCall = { name: "", argsBuffer: "" };
          }
          if (toolCallDelta.function?.name) {
            pendingToolCall.name += toolCallDelta.function.name;
          }
          if (toolCallDelta.function?.arguments) {
            pendingToolCall.argsBuffer += toolCallDelta.function.arguments;
          }
        }
      }
    }

    if (pendingToolCall?.name === "log_health_action") {
      try {
        const { type, value } = JSON.parse(pendingToolCall.argsBuffer);

        const log = await HealthLog.create({
          user: req.user._id,
          type,
          value,
          source: "chat"
        });

        res.write(`data: ${JSON.stringify({ type: "log_created", log })}\n\n`);
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError.message);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
    res.end();
  }
};

module.exports = { chat };
