// services/responseEngine.js

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")
    .trim();
}

const intents = [
  {
    name: "greeting",
    keywords: ["hej", "goddag", "hello", "hejsa"],
    responseKey: "greeting"
  },
  {
    name: "opening_hours",
    keywords: ["åbningstid", "åbent", "lukket", "åbner", "lukker"],
    responseKey: "openingHours"
  },
  {
    name: "prices",
    keywords: ["pris", "priser", "koster", "betaling", "honorar"],
    responseKey: "prices"
  },
  {
    name: "booking",
    keywords: ["book", "bestil", "aftale", "tid", "reservation"],
    responseKey: "booking"
  },
  {
    name: "contact",
    keywords: ["kontakt", "telefon", "email", "mail", "nummer"],
    responseKey: "contact"
  },
  {
    name: "location",
    keywords: ["adresse", "hvor", "lokation", "finde jer"],
    responseKey: "location"
  }
];

function getResponse(userMessage, clientConfig) {
  const message = normalize(userMessage);

  for (const intent of intents) {
    for (const keyword of intent.keywords) {
      if (message.includes(keyword)) {
        return clientConfig.responses[intent.responseKey];
      }
    }
  }

  return clientConfig.responses.fallback;
}

export default getResponse;
