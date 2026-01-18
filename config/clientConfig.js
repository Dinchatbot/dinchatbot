// config/clientConfig.js

const clients = {
  demo_business: {
    responses: {
      greeting: "Hej. Hvordan kan jeg hjælpe dig i dag?",
      openingHours: "Vi har åbent mandag til fredag kl. 09:00–17:00.",
      prices: "Priser afhænger af den konkrete ydelse. Kontakt os gerne for et konkret tilbud.",
      booking: "Du kan booke en tid via vores hjemmeside.",
      contact: "Du kan kontakte os på telefon +45 12 34 56 78 eller via e-mail kontakt@virksomhed.dk.",
      location: "Vi holder til på Gade 12, 1234 By.",
      fallback: "Jeg kan desværre ikke besvare det spørgsmål. Kontakt os venligst for yderligere information."
    }
  }
};

export function getClientConfig(clientId = "demo_business") {
  return clients[clientId] || clients.demo_business;
}
