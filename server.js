import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { getBotResponse } from "./services/responseEngine.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Health check (valgfrit men rart)
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/chat", (req, res) => {
  const start = Date.now();

  const { message, clientId } = req.body || {};
  const safeMessage = typeof message === "string" ? message.trim() : "";

  if (!safeMessage) {
    return res.json({ reply: "Skriv gerne en besked, så hjælper jeg 😊" });
  }

  const result = getBotResponse(safeMessage, clientId || "demo_business");
  const reply = result.reply;
  const isFallback = result.isFallback;
  const intent = result.intent;
  const latencyMs = Date.now() - start;

  console.log(JSON.stringify({
  t: new Date().toISOString(),
  event: "chat_message",
  clientId: clientId ?? null,
  message: safeMessage,
  reply,
  intent,
  isFallback,
  latencyMs
}));

  res.json({ reply });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server kører på port ${PORT}`);
});

