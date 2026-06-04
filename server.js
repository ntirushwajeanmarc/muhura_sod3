const express = require("express");
const axios = require("axios");
const cors = require("cors");

console.log("Starting Ollama Chat Server...");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
// Override with OLLAMA_MODEL env var. gemma3:4b-it-qat needs ~5.3 GiB RAM.
const MODEL = process.env.OLLAMA_MODEL || "gemma3:270m";

// In-memory conversation storage
let memory = [];

/*
|--------------------------------------------------------------------------
| Health Route
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    model: MODEL,
  });
});

/*
|--------------------------------------------------------------------------
| Chat Route
|--------------------------------------------------------------------------
*/
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    // Validate input
    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({
        success: false,
        error: "Request body must contain a message string",
      });
    }

    // Save user message
    memory.push({
      role: "user",
      content: userMessage,
    });

    // Keep only recent messages
    memory = memory.slice(-10);

    // Build conversation
    const messages = [
      {
        role: "system",
        content: "You are a helpful AI assistant.",
      },
      ...memory,
    ];

    console.log("Sending request to Ollama...");

    // Call Ollama
    const response = await axios.post(
      OLLAMA_URL,
      {
        model: MODEL,
        messages: messages,
        stream: false,
      },
      {
        timeout: 60000,
      }
    );

    // Validate Ollama response
    if (
      !response.data ||
      !response.data.message ||
      !response.data.message.content
    ) {
      return res.status(500).json({
        success: false,
        error: "Invalid response from Ollama",
      });
    }

    const assistantReply = response.data.message.content;

    // Save assistant reply
    memory.push({
      role: "assistant",
      content: assistantReply,
    });

    console.log("Response generated successfully");

    return res.json({
      success: true,
      reply: assistantReply,
    });

  } catch (error) {
    console.error("SERVER ERROR:");
    console.error(error.message);

    // Axios / Ollama connection errors
    if (error.code === "ECONNREFUSED") {
      return res.status(500).json({
        success: false,
        error:
          "Cannot connect to Ollama. Make sure 'ollama serve' is running.",
      });
    }

    // Timeout
    if (error.code === "ECONNABORTED") {
      return res.status(500).json({
        success: false,
        error: "Ollama request timed out",
      });
    }

    // Ollama returned 4xx/5xx with a body (e.g. out of memory, model not found)
    const ollamaError = error.response?.data?.error;
    if (ollamaError) {
      console.error("Ollama:", ollamaError);
      return res.status(500).json({
        success: false,
        error: ollamaError,
      });
    }

    // Generic fallback
    return res.status(500).json({
      success: false,
      error: error.message || "Unknown server error",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/
app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log(`Using model: ${MODEL}`);
  console.log("Ready for requests...");
});