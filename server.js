import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { getBotResponse } from "./services/responseEngine.js";

const app = express();

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Body parsing with size limit (prevent DOS attacks)
app.use(express.json({ limit: "10kb" }));
app.use(express.static("public"));

// Request ID + timing middleware
app.use((req, res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();
  next();
});

// CORS for embeds
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// ============================================
// LOGGING UTILITIES
// ============================================

class Logger {
  constructor(service = "customer-service-ai") {
    this.service = service;
    this.env = process.env.NODE_ENV || "production";
  }

  _log(level, event, data = {}) {
    const logEntry = {
      t: new Date().toISOString(),
      level,
      event,
      service: this.service,
      env: this.env,
      ...data,
    };

    const logString = JSON.stringify(logEntry);

    if (level === "error") {
      console.error(logString);
    } else if (level === "warn") {
      console.warn(logString);
    } else {
      console.log(logString);
    }
  }

  info(event, data) {
    this._log("info", event, data);
  }

  warn(event, data) {
    this._log("warn", event, data);
  }

  error(event, data, error) {
    const errorData = {
      ...data,
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
        name: error?.name,
      },
    };
    this._log("error", event, errorData);
  }
}

const logger = new Logger();

// ============================================
// IN-MEMORY METRICS
// ============================================

const metrics = {
  totalRequests: 0,
  totalFallbacks: 0,
  totalErrors: 0,
  slowResponses: 0,
  intentCounts: {},
  latencies: [],
  clientActivity: {},
  startTime: Date.now(),
};

function updateMetrics(data) {
  metrics.totalRequests++;

  if (data.isFallback) {
    metrics.totalFallbacks++;
  }

  if (data.intent) {
    metrics.intentCounts[data.intent] =
      (metrics.intentCounts[data.intent] || 0) + 1;
  }

  if (data.latencyMs) {
    metrics.latencies.push(data.latencyMs);
    if (data.latencyMs > 2000) {
      metrics.slowResponses++;
    }
    if (metrics.latencies.length > 1000) {
      metrics.latencies.shift();
    }
  }

  if (data.clientId) {
    if (!metrics.clientActivity[data.clientId]) {
      metrics.clientActivity[data.clientId] = {
        requests: 0,
        fallbacks: 0,
        lastSeen: null,
      };
    }
    metrics.clientActivity[data.clientId].requests++;
    metrics.clientActivity[data.clientId].lastSeen = new Date().toISOString();
    if (data.isFallback) {
      metrics.clientActivity[data.clientId].fallbacks++;
    }
  }
}

// ============================================
// RATE LIMITING
// ============================================

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 req/min per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(ip) || [];

  const recentRequests = userRequests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);
  return true;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitStore.entries()) {
    const recent = timestamps.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS
    );
    if (recent.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, recent);
    }
  }
}, 300000);

// ============================================
// ENDPOINTS
// ============================================

// Health check
app.get("/health", (req, res) => {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: `${uptime}s`,
    env: process.env.NODE_ENV || "production",
  };

  res.json(health);
});

// Metrics endpoint
app.get("/metrics", (req, res) => {
  const avgLatency =
    metrics.latencies.length > 0
      ? Math.round(
          metrics.latencies.reduce((a, b) => a + b, 0) /
            metrics.latencies.length
        )
      : 0;

  const fallbackRate =
    metrics.totalRequests > 0
      ? ((metrics.totalFallbacks / metrics.totalRequests) * 100).toFixed(1)
      : "0.0";

  const errorRate =
    metrics.totalRequests > 0
      ? ((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(1)
      : "0.0";

  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);

  const metricsData = {
    uptime: `${uptime}s`,
    totalRequests: metrics.totalRequests,
    totalFallbacks: metrics.totalFallbacks,
    fallbackRate: `${fallbackRate}%`,
    totalErrors: metrics.totalErrors,
    errorRate: `${errorRate}%`,
    slowResponses: metrics.slowResponses,
    avgLatencyMs: avgLatency,
    topIntents: Object.entries(metrics.intentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([intent, count]) => ({ intent, count })),
    activeClients: Object.keys(metrics.clientActivity).length,
    clientActivity: Object.entries(metrics.clientActivity)
      .map(([clientId, data]) => ({
        clientId,
        ...data,
        fallbackRate:
          data.requests > 0
            ? `${((data.fallbacks / data.requests) * 100).toFixed(1)}%`
            : "0%",
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10),
  };

  logger.info("metrics_accessed", {
    requestId: req.requestId,
    ip: req.ip || req.headers["x-forwarded-for"],
  });

  res.json(metricsData);
});

// Main chat endpoint
app.post("/chat", (req, res) => {
  const requestId = req.requestId;
  const start = req.startTime;

  try {
    // Rate limiting
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
    if (!checkRateLimit(clientIp)) {
      logger.warn("rate_limit_exceeded", {
        requestId,
        ip: clientIp,
      });
      return res.status(429).json({
        reply: "For mange forespørgsler. Prøv igen om et øjeblik.",
      });
    }

    const {
      message,
      clientId = "demo_business",
      sessionId = null,
      msgIndex = null,
    } = req.body || {};

    // Validation
    if (!message || typeof message !== "string") {
      logger.warn("invalid_message", {
        requestId,
        clientId,
        messageType: typeof message,
      });
      return res.json({
        reply: "Skriv gerne en besked, så hjælper jeg 😊",
      });
    }

    const safeMessage = message.trim();

    if (!safeMessage) {
      logger.warn("empty_message", {
        requestId,
        clientId,
        sessionId,
      });
      return res.json({
        reply: "Skriv gerne en besked, så hjælper jeg 😊",
      });
    }

    // Message length validation
    if (safeMessage.length > 1000) {
      logger.warn("message_too_long", {
        requestId,
        clientId,
        messageLength: safeMessage.length,
      });
      return res.json({
        reply: "Beskeden er for lang. Hold den venligst under 1000 tegn.",
      });
    }

    // Get bot response
    const result = getBotResponse(safeMessage, clientId);

    const reply = result?.reply || "Der opstod en fejl.";
    const intent = result?.intent ?? null;
    const isFallback = Boolean(result?.isFallback);
    const msgIndexNum = msgIndex == null ? null : Number(msgIndex);

    const latencyMs = Date.now() - start;

    // Conversation start logging
    if (msgIndexNum === 1) {
      logger.info("conversation_start", {
        requestId,
        clientId,
        sessionId,
        firstIntent: intent,
        firstIsFallback: isFallback,
        firstMessagePreview: safeMessage.substring(0, 100),
      });
    }

    // Main message logging
    logger.info("chat_message", {
      requestId,
      clientId,
      sessionId,
      msgIndex: msgIndexNum,

      message: safeMessage,
      messageLength: safeMessage.length,
      reply,
      replyLength: reply.length,

      intent,
      isFallback,

      latencyMs,
      slowResponse: latencyMs > 1000,

      userAgent: req.headers["user-agent"],
      ip: clientIp,
    });

    // Update metrics
    updateMetrics({
      clientId,
      intent,
      isFallback,
      latencyMs,
    });

    // Performance warning
    if (latencyMs > 2000) {
      logger.warn("slow_response", {
        requestId,
        clientId,
        latencyMs,
        intent,
      });
    }

    // Fallback tracking
    if (isFallback) {
      logger.warn("fallback_triggered", {
        requestId,
        clientId,
        sessionId,
        messagePreview: safeMessage.substring(0, 100),
        intent,
      });
    }

    return res.json({ reply });
  } catch (err) {
    metrics.totalErrors++;

    const latencyMs = Date.now() - start;

    logger.error(
      "chat_error",
      {
        requestId,
        clientId: req.body?.clientId,
        sessionId: req.body?.sessionId,
        messagePreview: req.body?.message?.substring(0, 100),
        latencyMs,
      },
      err
    );

    return res.status(500).json({
      reply: "Der opstod en serverfejl. Prøv igen senere.",
    });
  }
});

// 404 handler
app.use((req, res) => {
  logger.warn("route_not_found", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.headers["x-forwarded-for"],
  });
  res.status(404).json({ error: "Endpoint ikke fundet" });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info("server_start", {
    port: PORT,
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV || "production",
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
    },
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

function shutdown(signal) {
  logger.info("server_shutdown_initiated", {
    signal,
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    totalRequests: metrics.totalRequests,
  });

  server.close(() => {
    logger.info("server_shutdown_complete", { signal });
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("server_shutdown_forced", { signal });
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error(
    "uncaught_exception",
    {
      uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    },
    err
  );
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(
    "unhandled_rejection",
    {
      reason: String(reason),
      uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    },
    reason instanceof Error ? reason : new Error(String(reason))
  );
});

// ============================================
// PERIODIC HEALTH LOGGING (every 5 minutes)
// ============================================

setInterval(() => {
  const avgLatency =
    metrics.latencies.length > 0
      ? Math.round(
          metrics.latencies.reduce((a, b) => a + b, 0) /
            metrics.latencies.length
        )
      : 0;

  logger.info("health_snapshot", {
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    totalRequests: metrics.totalRequests,
    fallbackRate:
      metrics.totalRequests > 0
        ? `${((metrics.totalFallbacks / metrics.totalRequests) * 100).toFixed(1)}%`
        : "0%",
    avgLatencyMs: avgLatency,
    activeClients: Object.keys(metrics.clientActivity).length,
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
    },
  });
}, 300000);