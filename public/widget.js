(function () {
  // --- 1) Find script + clientId ---
  const scriptTag = document.currentScript;
  const clientId =
    scriptTag?.getAttribute("data-client-id") ||
    scriptTag?.getAttribute("data-client") ||
    "demo_business";

  // --- 2) Create root container (isolated) ---
  const root = document.createElement("div");
  root.id = "dinchatbot-root";
  document.body.appendChild(root);

  // --- 3) Load CSS once ---
  const cssHref = scriptTag.src.replace("widget.js", "chatbot.css");
  if (!document.querySelector(`link[href="${cssHref}"]`)) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = cssHref;
    document.head.appendChild(css);
  }

  // --- 4) Inject HTML ---
  root.innerHTML = `
    <button id="chat-open" type="button" aria-label="Åbn chat">Chat</button>

    <div id="chat-widget" class="chat-hidden" role="dialog" aria-label="Chat">
      <div class="chat-header">
        <div class="chat-title">Kontakt os</div>
        <button id="chat-close" type="button" aria-label="Luk chat">×</button>
      </div>

      <div id="chat-messages" class="chat-messages"></div>

      <form id="chat-form" class="chat-form">
        <input
          id="user-input"
          type="text"
          placeholder="Skriv din besked..."
          autocomplete="off"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  `;

  // --- 5) SessionId (same logic as main app, crash-safe) ---
  const SESSION_KEY = "dcb_session_id";

  function getSessionId() {
    let sessionId = null;
    try {
      sessionId = localStorage.getItem(SESSION_KEY);
    } catch {}

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
      } catch {}
    }

    return sessionId;
  }

  // --- 6) DOM refs ---
  const openBtn = root.querySelector("#chat-open");
  const widget = root.querySelector("#chat-widget");
  const closeBtn = root.querySelector("#chat-close");
  const messagesEl = root.querySelector("#chat-messages");
  const form = root.querySelector("#chat-form");
  const input = root.querySelector("#user-input");

  // --- 7) Open / close behaviour ---
  function updateButton() {
    openBtn.textContent = widget.classList.contains("chat-hidden")
      ? "Chat"
      : "Luk";
  }

  openBtn.addEventListener("click", () => {
    widget.classList.toggle("chat-hidden");
    if (!widget.classList.contains("chat-hidden")) {
      input.focus();
    }
    updateButton();
  });

  closeBtn.addEventListener("click", () => {
    widget.classList.add("chat-hidden");
    updateButton();
  });

  updateButton();

  // --- 8) Message rendering ---
  function addBubble(text, who) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${who}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // --- 9) Submit handler (robust, same contract as backend expects) ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    addBubble(text, "user");
    input.value = "";

    try {
      const res = await fetch(
        new URL("/chat", scriptTag.src).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            clientId,
            sessionId: getSessionId(),
          }),
        }
      );

      const data = await res.json();
      addBubble(data.reply || "Ingen respons.", "bot");
    } catch (err) {
      console.error("Chat widget error:", err);
      addBubble("Der opstod en fejl. Prøv igen senere.", "bot");
    }
  });
})();
