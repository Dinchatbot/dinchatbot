(() => {
  // --- DOM refs (works when markup exists) ---
  const openBtn = document.getElementById("chat-open");
  const widget = document.getElementById("chat-widget");
  const closeBtn = document.getElementById("chat-close");

  const messagesEl = document.getElementById("chat-messages");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");

  // ✅ Embed-safe: if markup isn't present, do nothing (prevents crashes on WP pages)
  if (!openBtn || !widget || !closeBtn || !messagesEl || !form || !input) {
    console.warn("Chatbot: widget elements not found. Skipping initialization.");
    return;
  }

  // --- ClientId + SessionId (stable production MVP) ---
  function getClientId() {
    // If widget.js is used (WordPress embed), it can set this global
    if (window.__DINCHATBOT_CLIENT_ID__) return window.__DINCHATBOT_CLIENT_ID__;

    // If chatbot.js is loaded directly with data-client-id
    const scriptEl = document.querySelector(
      'script[src*="chatbot.js"][data-client-id]'
    );
    return scriptEl?.dataset?.clientId || "demo_business";
  }

  const SESSION_KEY = "dcb_session_id";

  function getSessionId() {
    let sessionId = null;

    try {
      sessionId = localStorage.getItem(SESSION_KEY);
    } catch (e) {
      // ignore
    }

    if (!sessionId) {
      const hasCryptoUUID =
        typeof globalThis !== "undefined" &&
        globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === "function";

      sessionId = hasCryptoUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      try {
        localStorage.setItem(SESSION_KEY, sessionId);
      } catch (e) {
        // ignore
      }
    }

    return sessionId;
  }

  // --- UI helpers ---
  let hasWelcomed = false;

  function updateOpenButtonText() {
    openBtn.textContent = widget.classList.contains("chat-hidden")
      ? "Chat"
      : "Luk";
  }

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

  function sendWelcomeIfNeeded() {
    if (hasWelcomed) return;
    hasWelcomed = true;
    addBubble("Hej! Hvordan kan jeg hjælpe dig i dag?", "bot");
  }

  // --- Open / close handlers ---
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

  // --- Submit handler (robust) ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    addBubble(text, "user");
    input.value = "";

    try {
      const payload = {
        message: text,
        clientId: getClientId(),
        sessionId: getSessionId(),
      };

      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // If server returns non-2xx, still try to parse JSON; otherwise throw
      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        // if server didn't return JSON
      }

      if (!res.ok) {
        console.error("Chat HTTP error:", res.status, data);
        addBubble("Der opstod en fejl. Prøv igen senere.", "bot");
        return;
      }

      addBubble(data?.reply || "Ingen respons.", "bot");
    } catch (err) {
      console.error("CHAT FETCH ERROR:", err);
      addBubble("Der opstod en fejl. Prøv igen senere.", "bot");
    }
  });

  // Init state
  updateOpenButtonText();
})();
