import dotenv from "dotenv";
dotenv.config();

import express from "express";
import getResponse from "./services/responseEngine.js";
import { getClientConfig } from "./config/clientConfig.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const USE_AI = false;

app.post("/chat", (req, res) => {
  try {
    const { message, clientId } = req.body;

    const cfg = getClientConfig(clientId); // <- NU defineret
    const reply = getResponse(message, cfg);

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Der opstod en serverfejl." });
  }
});

app.listen(3000, () => {
  console.log("Server kører på http://localhost:3000");
});
