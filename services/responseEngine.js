// services/responseEngine.js
import { getClientConfig } from "../config/clientConfig.js";

/**
 * Normalize text for Danish + general usage:
 * - lowercase
 * - remove punctuation (keep letters/numbers/spaces incl. æøå)
 * - collapse whitespace
 */
function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // unicode-safe: keeps æøå
    .replace(/\s+/g, " ")
    .trim();
}

function toWordSet(text) {
  const n = normalize(text);
  if (!n) return new Set();
  return new Set(n.split(" "));
}

/**
 * @typedef {Object} Intent
 * @property {string} name
 * @property {string[]} keywords
 * @property {string} responseKey
 */

/** @type {Intent[]} */
const intents = [
  {
    name: "greeting",
    keywords: [
      "hej", "goddag", "hello", "hejsa", "halløj", "hey",
      "godmorgen", "godaften", "hi",
      "good morning", "good afternoon", "good evening",
    ],
    responseKey: "greeting",
  },
  {
    name: "opening_hours",
    keywords: [
      "åbningstid", "åbningstider", "åbent", "lukket", "åbner", "lukker",
      "hvornår åbner i", "hvornår lukker i", "hvilke tider har i åbent",
      "opening hours", "when are you open", "when do you close",
    ],
    responseKey: "openingHours",
  },
  {
    name: "prices",
    keywords: [
      "pris", "priser", "koster", "honorar", "tilbud",
      "hvad koster", "hvad er prisen", "prisoverslag",
      "price", "prices", "cost", "pricing",
    ],
    responseKey: "prices",
  },
  {
    name: "booking",
    keywords: [
      "book", "booking", "bestil", "aftale", "reservation", "reserver",
      "tid",
      "tidspunkt",
      "book en tid", "bestil tid", "bestille tid", "bestil en tid",
      "booke en tid", "book tid",
      "book appointment", "make an appointment", "schedule",
    ],
    responseKey: "booking",
  },
  {
    name: "contact",
    keywords: [
      "kontakt", "kontakt os", "telefon", "email", "e-mail", "mail",
      "nummer", "ring", "skriv til",
      "contact", "phone",
    ],
    responseKey: "contact",
  },
  {
    name: "location",
    keywords: [
      "adresse", "lokation", "finde jer", "hvor ligger i", "hvor er i",
      "hvor er i henne", "vej", "by", "parkering",
      "address", "location", "where are you", "directions", "parking",
    ],
    responseKey: "location",
  },
  {
    name: "shipping",
    keywords: [
      "forsendelse", "levering", "fragt", "porto", "sendes", "sender i",
      "leveringstid", "hvornår kommer", "track", "tracking", "spor",
      "shipping", "delivery", "shipment", "track my order",
    ],
    responseKey: "shipping",
  },
  {
    name: "returns",
    keywords: [
      "returnering", "retur", "bytte", "refusion", "fortryd", "fortrydelse",
      "pengene tilbage", "refund", "return", "returns", "exchange", "cancel",
    ],
    responseKey: "returns",
  },
  {
    name: "order_status",
    keywords: [
      "ordre", "ordrenummer", "min ordre", "ordrestatus", "status på ordre",
      "hvor er min ordre", "order status", "my order", "order number",
    ],
    responseKey: "orderStatus",
  },
  {
    name: "payments",
    keywords: [
      "betaling", "betalingsmetoder", "kort", "visa", "mastercard", "mobilepay",
      "faktura", "ean", "betale", "hvordan kan man betale",
      "invoice", "payment", "payments",
    ],
    responseKey: "payments",
  },
  {
    name: "human_support",
    keywords: [
      "support", "kundeservice", "menneske", "medarbejder", "agent",
      "tal med", "snak med", "kontakt support", "ring til jer",
    ],
    responseKey: "humanSupport",
  },
];

/**
 * @typedef {Object} CompiledKeyword
 * @property {string} text
 * @property {boolean} isPhrase
 * @property {number} length
 */

/**
 * @typedef {Intent & { compiledKeywords: CompiledKeyword[] }} CompiledIntent
 */

/** @type {CompiledIntent[]} */
const compiledIntents = intents.map((intent) => {
  const seen = new Set();
  const compiledKeywords = intent.keywords
    .map((kw) => normalize(kw))
    .filter(Boolean)
    .filter((nkw) => {
      if (seen.has(nkw)) return false;
      seen.add(nkw);
      return true;
    })
    .map((nkw) => ({
      text: nkw,
      isPhrase: nkw.includes(" "),
      length: nkw.length,
    }));

  return { ...intent, compiledKeywords };
});

/**
 * @typedef {Object} BestMatch
 * @property {CompiledIntent} intent
 * @property {string} keyword
 * @property {number} score
 */

/**
 * @param {string} normalizedMessage
 * @param {Set<string>} wordSet
 * @returns {BestMatch | null}
 */
function findBestMatch(normalizedMessage, wordSet) {
  /** @type {BestMatch | null} */
  let best = null;

  for (const intent of compiledIntents) {
    for (const kw of intent.compiledKeywords) {
      let matched = false;
      let score = 0;

      if (kw.isPhrase) {
        matched = normalizedMessage.includes(kw.text);
        if (matched) score = 2000 + kw.length;
      } else {
        matched = wordSet.has(kw.text);
        if (matched) score = 1000 + kw.length;
      }

      if (matched && (!best || score > best.score)) {
        best = { intent, keyword: kw.text, score };
      }
    }
  }

  return best;
}

/**
 * Main response function (Logging 2.0 output)
 * @param {string} userMessage
 * @param {string} clientId
 * @returns {{ reply: string, isFallback: boolean, intent: string | null }}
 */
export function getBotResponse(userMessage, clientId = "demo_business") {
  const cfg = getClientConfig(clientId);
  const responses = cfg?.responses || {};

  const FALLBACK_TEXT =
    responses.fallback ||
    "Jeg er ikke sikker på, at jeg forstod det. Kontakt os venligst for hjælp.";

  const normalizedMessage = normalize(userMessage);
  const wordSet = toWordSet(userMessage);

  if (!normalizedMessage) {
    return { reply: FALLBACK_TEXT, intent: null, isFallback: true };
  }

  const best = findBestMatch(normalizedMessage, wordSet);

  if (!best) {
    return { reply: FALLBACK_TEXT, intent: null, isFallback: true };
  }

  const reply = responses[best.intent.responseKey] || FALLBACK_TEXT;
  const isFallback = !responses[best.intent.responseKey];

  return {
    reply,
    intent: best.intent.name,
    isFallback,
  };
}
