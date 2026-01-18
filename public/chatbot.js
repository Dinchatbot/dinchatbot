const openBtn = document.getElementById("chat-open");
const widget = document.getElementById("chat-widget");
const closeBtn = document.getElementById("chat-close");

const messagesEl = document.getElementById("chat-messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");

openBtn.addEventListener("click", () => {
  const isHidden = widget.classList.contains("chat-hidden");

  if (isHidden) {
    widget.classList.remove("chat-hidden");
    input.focus();
  } else {
    widget.classList.add("chat-hidden");
  }
  {openBtn.textContent = widget.classList.contains("chat-hidden") ? "Chat" : "Luk";
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
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    addBubble(data.reply || "Ingen respons.", "bot");
  } catch (err) {
    addBubble("Der opstod en fejl. Prøv igen senere.", "bot");
  }
});
