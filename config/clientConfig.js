// config/clientConfig.js

const clients = {
  demo_business: {
    company: {
      name: "Demo Business",
      website: "https://dinchatbot.com",
    },

    support: {
      email: "support@dinchatbot.com",
      phone: "+45 12 34 56 78",
      hours: "Man–Fre 09:00–16:00",
    },

    responses: {
      greeting: "Hej! Hvordan kan jeg hjælpe dig i dag?",
      openingHours: "Vi har åbent mandag til fredag kl. 09:00–17:00.",
      prices: "Priser afhænger af den konkrete ydelse. Kontakt os gerne for et konkret tilbud.",
      booking: "Du kan booke en tid via vores hjemmeside.",
      contact:
        "Du kan kontakte os på telefon +45 12 34 56 78 eller via e-mail kontakt@virksomhed.dk.",
      location: "Vi holder til på Gade 12, 1234 By.",
      shipping:
        "Vi leverer typisk inden for 1–3 hverdage. Du modtager tracking-link, når pakken er afsendt.",
      returns:
        "Du har 14 dages returret. Kontakt os, så guider vi dig igennem returnering/bytte.",
      orderStatus:
        "Send gerne dit ordrenummer, så kan vi hjælpe med status. Alternativt kan du finde status i din ordrebekræftelse/tracking.",
      payments:
        "Vi tager imod kortbetaling og MobilePay. Kontakt os ved behov for faktura.",

      fallback:
        "Jeg kan desværre ikke besvare det spørgsmål. Kontakt os venligst for yderligere information.",

      humanSupport: `
Selvfølgelig — her er de hurtigste måder at få fat i os:

• E-mail: support@dinchatbot.com
• Telefon: +45 12 34 56 78
• Supporttid: Man–Fre 09:00–16:00

Skriv gerne kort hvad det handler om + evt. ordrenummer.
`.trim(),
    },
  },
};

export function getClientConfig(clientId = "demo_business") {
  return clients[clientId] || clients.demo_business;
}
