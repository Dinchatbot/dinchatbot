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
  try {
    const { message, clientId } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Missing 'message' in request body." });
    }

    const reply = getBotResponse(message, clientId || "demo_business");
    return res.json({ reply });
  } catch (err) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({ reply: "Der opstod en serverfejl." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server kører på port ${PORT}`);
});

