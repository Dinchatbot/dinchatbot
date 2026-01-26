// services/responseEngine.js
import { getClientConfig } from "../config/clientConfig.js";

/**
 * Normalize text for Danish + general usage:
 * - lowercase
 * - remove punctuation (keep letters/numbers/spaces incl. æøå)
 * - collapse whitespace
 */
function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // unicode-safe: keeps æøå
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert message into a Set of words for whole-word matching */
function toWordSet(text) {
  const n = normalize(text);
  if (!n) return new Set();
  return new Set(n.split(" "));
}

/**
 * Intent matching:
 * - If keyword contains spaces -> treat as phrase and match against normalized message (includes)
 * - Else -> treat as single word and match whole-word using Set lookup
 */
function matchesIntent(normalizedMessage, wordSet, intent) {
  return intent.keywords.some((kw) => {
    const nkw = normalize(kw);
    if (!nkw) return false;

    // Phrase match (e.g. "book en tid")
    if (nkw.includes(" ")) {
      return normalizedMessage.includes(nkw);
    }

    // Whole-word match (e.g. "tid" matches only the word "tid", not "åbningstider")
    return wordSet.has(nkw);
  });
}

/**
 * Your intents:
 * - Keep "tid" for booking, BUT we also include phrase keywords so the bot is smarter.
 * - Put the more specific intents earlier if you add more later.
 */
const intents = [
  {
    name: "greeting",
    keywords: ["hej", "goddag", "hello", "hejsa"],
    responseKey: "greeting",
  },
  {
    name: "opening_hours",
    keywords: [
      "åbningstid",
      "åbningstider",
      "åbent",
      "lukket",
      "åbner",
      "lukker",
      "opening hours",
    ],
    responseKey: "openingHours",
  },
  {
    name: "prices",
    keywords: ["pris", "priser", "koster", "betaling", "honorar", "price", "prices"],
    responseKey: "prices",
  },
  {
    name: "booking",
    keywords: [
      "book",
      "booking",
      "bestil",
      "aftale",
      "reservation",
      "reserver",
      "tid",          // keep it (whole-word match prevents "åbningstider" bug)
      "tidspunkt",
      // phrase keywords (extra professional / higher recall)
      "book en tid",
      "bestil tid",
      "bestille tid",
      "bestil en tid",
      "booke en tid",
      "book tid",
    ],
    responseKey: "booking",
  },
  {
    name: "contact",
    keywords: ["kontakt", "telefon", "email", "e-mail", "mail", "nummer", "contact"],
    responseKey: "contact",
  },
  {
    name: "location",
    keywords: [
      "adresse",
      "lokation",
      "location",
      "finde jer",
      "hvor ligger i",
      "hvor er i",
      "hvor er i henne",
      "vej",
      "by",
    ],
    responseKey: "location",
  },
];

/**
 * Main response function
 * @param {string} userMessage
 * @param {string} clientId - used to select config per customer
 * @returns {string}
 */
export function getBotResponse(userMessage, clientId = "demo_business") {
  const cfg = getClientConfig(clientId);
  const responses = cfg?.responses || {};

  const normalizedMessage = normalize(userMessage);
  const wordSet = toWordSet(userMessage);

  // Empty message safety
  if (!normalizedMessage) {
    return responses.fallback || "I’m not sure I understood that. Please contact us for help.";
  }

  const matched = intents.find((intent) =>
    matchesIntent(normalizedMessage, wordSet, intent)
  );

  if (!matched) {
    return responses.fallback || "I’m not sure I understood that. Please contact us for help.";
  }

  // If the responseKey is missing in client config, fallback safely
  return responses[matched.responseKey] || responses.fallback || "I’m not sure I understood that. Please contact us for help.";
}
