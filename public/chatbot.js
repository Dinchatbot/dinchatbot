const openBtn = document.getElementById("chat-open");
const widget = document.getElementById("chat-widget");
const closeBtn = document.getElementById("chat-close");

const messagesEl = document.getElementById("chat-messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");

// --- SessionId (one per browser/session) ---
const SESSION_KEY = "dcb_session_id";

function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId =
      (crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

let hasWelcomed = false;

function updateOpenButtonText() {
  openBtn.textContent = widget.classList.contains("chat-hidden") ? "Chat" : "Luk";
}

function sendWelcomeIfNeeded() {
  if (hasWelcomed) return;
  hasWelcomed = true;

  // Du kan ændre teksten her
  addBubble("Hej! Hvordan kan jeg hjælpe dig i dag?", "bot");
}

openBtn.addEventListener("click", () => {
  const isHidden = widget.classList.contains("chat-hidden");

  if (isHidden) {
    widget.classList.remove("chat-hidden");
    input.focus();
    sendWelcomeIfNeeded();
  } else {
    widget.classList.add("chat-hidden");
  }

  updateOpenButtonText();
});

closeBtn.addEventListener("click", () => {
  widget.classList.add("chat-hidden");
  updateOpenButtonText();
});

function addBubble(text, who) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${who}`;

  // Avatar (kun for bot)
  if (who === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "🤖"; // kan ændres til SVG senere
    wrap.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrap.appendChild(bubble);

  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  addBubble(text, "user");
  input.value = "";

  try {
    const res = await fetch("/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: text,
    clientId: getClientId(),
    sessionId: getSessionId()
  }),
});

    const data = await res.json();
    addBubble(data.reply || "Ingen respons.", "bot");
  } catch (err) {
    addBubble("Der opstod en fejl. Prøv igen senere.", "bot");
  }
});

// Sæt korrekt tekst ved load
updateOpenButtonText();