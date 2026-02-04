import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { getBotResponse } from "./services/responseEngine.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// --- CORS for embeds (WordPress/landing pages) ---
app.use((req, res, next) => {
  // Tillad embed fra alle domæner i MVP (kan strammes senere pr kunde)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Health check (valgfrit men rart)
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/chat", (req, res) => {
  const start = Date.now();

  try {
    const {
      message,
      clientId = "demo_business",
      sessionId = null,
      msgIndex = null,
    } = req.body || {};

    const safeMessage =
      typeof message === "string" ? message.trim() : "";

    if (!safeMessage) {
      return res.json({
        reply: "Skriv gerne en besked, så hjælper jeg 😊",
      });
    }

    // Logging 2.0-compatible response
    const result = getBotResponse(safeMessage, clientId);

    const reply = result?.reply || "Der opstod en fejl.";
    const intent = result?.intent ?? null;
    const isFallback = Boolean(result?.isFallback);

    const latencyMs = Date.now() - start;

    // Structured log
    console.log(
      JSON.stringify({
        t: new Date().toISOString(),
        event: "chat_message",

        clientId,
        sessionId,
        msgIndex,

        message: safeMessage,
        reply,

        intent,
        isFallback,

        latencyMs,
      })
    );

    return res.json({ reply });
  } catch (err) {
    console.error("CHAT ERROR:", err);

    return res.status(500).json({
      reply: "Der opstod en serverfejl. Prøv igen senere.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server kører på port ${PORT}`);
});

