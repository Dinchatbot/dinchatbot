(function () {
  const scriptTag = document.currentScript;
  const clientId = scriptTag?.getAttribute("data-client") || "demo_business";

  // Container (shadow-free MVP)
  const root = document.createElement("div");
  root.id = "malth-chatbot-root";
  document.body.appendChild(root);

  // Load CSS
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = scriptTag.src.replace("widget.js", "chatbot.css");
  document.head.appendChild(css);

  // Inject HTML
  root.innerHTML = `
    <button id="chat-open" aria-label="Åbn chat">Chat</button>

    <div id="chat-widget" class="chat-hidden" role="dialog" aria-label="Chat">
      <div id="chat-header">
        <div id="chat-title">Kontakt os</div>
        <button id="chat-close" type="button" aria-label="Luk chat">×</button>
      </div>

      <div id="chat-messages"></div>

      <form id="chat-form">
        <input id="user-input" type="text" placeholder="Skriv din besked..." autocomplete="off" />
        <button id="send-btn" type="submit">Send</button>
      </form>
    </div>
  `;

  // Behaviour (samme som chatbot.js, men med clientId)
  const openBtn = root.querySelector("#chat-open");
  const widget = root.querySelector("#chat-widget");
  const closeBtn = root.querySelector("#chat-close");

  const messagesEl = root.querySelector("#chat-messages");
  const form = root.querySelector("#chat-form");
  const input = root.querySelector("#user-input");

  openBtn.addEventListener("click", () => {
    const isHidden = widget.classList.contains("chat-hidden");
    if (isHidden) {
      widget.classList.remove("chat-hidden");
      input.focus();
    } else {
      widget.classList.add("chat-hidden");
    }
  });

  closeBtn.addEventListener("click", () => {
    widget.classList.add("chat-hidden");
  });

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addBubble(text, "user");
    input.value = "";

    try {
      const res = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, clientId })
      });

      const data = await res.json();
      addBubble(data.reply || "Ingen respons.", "bot");
    } catch {
      addBubble("Der opstod en fejl. Prøv igen senere.", "bot");
    }
  });
})();
