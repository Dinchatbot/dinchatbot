(function () {
  const scriptTag = document.currentScript;
  const clientId =
    scriptTag?.getAttribute("data-client-id") ||
    scriptTag?.getAttribute("data-client") ||
    "demo_business";

  // Root host (outside theme flow)
  const host = document.createElement("div");
  host.id = "dinchatbot-host";
  host.style.position = "fixed";
  host.style.right = "20px";
  host.style.bottom = "20px";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "auto";
  document.body.appendChild(host);

  // Shadow DOM isolates CSS from WordPress theme
  const shadow = host.attachShadow({ mode: "open" });

  // Minimal, stable CSS (inside shadow only)
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }

    #chat-open {
      cursor: pointer;
      border: none;
      background: #111;
      color: #fff;
      padding: 12px 16px;
      border-radius: 999px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    }

    #chat-widget {
      position: fixed;
      right: 20px;
      bottom: 80px;

      width: 340px;
      height: 420px;

      background: #fff;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      overflow: hidden;

      display: flex;
      flex-direction: column;
    }

    .chat-hidden { display: none !important; }

    .chat-header {
      background: #111;
      color: #fff;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chat-title { font-weight: 600; }
    #chat-close {
      cursor: pointer;
      border: none;
      background: transparent;
      color: #fff;
      font-size: 20px;
      line-height: 1;
    }

    #chat-messages {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: #f7f7f7;
    }

    .msg { display: flex; margin-bottom: 10px; }
    .msg.user { justify-content: flex-end; }
    .msg.bot { justify-content: flex-start; }

    .bubble {
      max-width: 80%;
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.25;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .msg.user .bubble { background: #111; color: #fff; }
    .msg.bot .bubble { background: #eaeaea; color: #111; }

    #chat-form {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #ddd;
      background: #fff;
    }

    #user-input {
      flex: 1;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      outline: none;
    }

    #send-btn {
      cursor: pointer;
      border: none;
      background: #111;
      color: #fff;
      border-radius: 8px;
      padding: 10px 14px;
      font-weight: 600;
    }
  `;
  shadow.appendChild(style);

  // Markup inside shadow
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <button id="chat-open" type="button" aria-label="Åbn chat">Chat</button>

    <div id="chat-widget" class="chat-hidden" role="dialog" aria-label="Chat">
      <div class="chat-header">
        <div class="chat-title">Kontakt os</div>
        <button id="chat-close" type="button" aria-label="Luk chat">×</button>
      </div>

      <div id="chat-messages"></div>

      <form id="chat-form">
        <input id="user-input" type="text" placeholder="Skriv din besked..." autocomplete="off" />
        <button id="send-btn" type="submit">Send</button>
      </form>
    </div>
  `;
  shadow.appendChild(wrapper);

  // SessionId (same key as your app)
  const SESSION_KEY = "dcb_session_id";
  function getSessionId() {
    let sessionId = null;
    try { sessionId = localStorage.getItem(SESSION_KEY); } catch {}
    if (!sessionId) {
      const hasCryptoUUID =
        typeof globalThis !== "undefined" &&
        globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === "function";
      sessionId = hasCryptoUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      try { localStorage.setItem(SESSION_KEY, sessionId); } catch {}
    }
    return sessionId;
  }

  // DOM refs
  const openBtn = shadow.getElementById("chat-open");
  const widget = shadow.getElementById("chat-widget");
  const closeBtn = shadow.getElementById("chat-close");
  const messagesEl = shadow.getElementById("chat-messages");
  const form = shadow.getElementById("chat-form");
  const input = shadow.getElementById("user-input");

  let hasWelcomed = false;
  function sendWelcomeIfNeeded() {
    if (hasWelcomed) return;
    hasWelcomed = true;
    addBubble("Hej! Hvordan kan jeg hjælpe dig i dag?", "bot");
  }

  function updateButton() {
    openBtn.textContent = widget.classList.contains("chat-hidden") ? "Chat" : "Luk";
  }

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

  openBtn.addEventListener("click", () => {
    widget.classList.toggle("chat-hidden");
    if (!widget.classList.contains("chat-hidden")) {
      input.focus();
      sendWelcomeIfNeeded();
    }
    updateButton();
  });

  closeBtn.addEventListener("click", () => {
    widget.classList.add("chat-hidden");
    updateButton();
  });

  updateButton();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addBubble(text, "user");
    input.value = "";

    try {
      const res = await fetch(new URL("/chat", scriptTag.src).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          clientId,
          sessionId: getSessionId(),
        }),
      });

      const data = await res.json();
      addBubble(data.reply || "Ingen respons.", "bot");
    } catch (err) {
      console.error("Chat widget error:", err);
      addBubble("Der opstod en fejl. Prøv igen senere.", "bot");
    }
  });
})();
