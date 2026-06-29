const API_BASE = "/api/v1";
const STORAGE_TOKEN = "kharesiya_token";
const STORAGE_API_KEY = "kharesiya_api_key";
const STORAGE_EMAIL = "kharesiya_email";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const authScreen = $("#auth-screen");
const mainScreen = $("#main-screen");
const authError = $("#auth-error");
const messagesEl = $("#messages");
const chatForm = $("#chat-form");
const questionInput = $("#question-input");
const sendBtn = $("#send-btn");
const docList = $("#doc-list");
const userEmailEl = $("#user-email");

let isLoading = false;
let lastQuestion = "";

const FOLLOW_UP_TEMPLATES = [
  "Can you explain that more simply?",
  "What are the key steps I should follow?",
  "Is there anything else I should know?",
];

function getAuthHeaders() {
  const token = localStorage.getItem(STORAGE_TOKEN);
  const apiKey = localStorage.getItem(STORAGE_API_KEY);
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;
  else if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function showError(msg) {
  authError.textContent = msg;
  authError.classList.remove("hidden");
}

function clearError() {
  authError.classList.add("hidden");
  authError.textContent = "";
}

function isAuthenticated() {
  return !!(localStorage.getItem(STORAGE_TOKEN) || localStorage.getItem(STORAGE_API_KEY));
}

function showMain() {
  authScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
  userEmailEl.textContent = localStorage.getItem(STORAGE_EMAIL) || "Authenticated";
  loadDocuments();
}

function showAuth() {
  mainScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
}

function logout() {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_API_KEY);
  localStorage.removeItem(STORAGE_EMAIL);
  showAuth();
}

function handleSessionExpired(message) {
  logout();
  showError(message || "Your session expired. Please sign in again.");
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const detail = typeof body === "object" ? body.detail : body;
    const message = typeof detail === "string" ? detail : JSON.stringify(detail);
    if (res.status === 401) handleSessionExpired(message);
    throw new Error(message);
  }
  return body;
}

async function validateSession() {
  if (!isAuthenticated()) {
    showAuth();
    return;
  }
  try {
    await apiRequest("/documents?page_size=1", { headers: getAuthHeaders() });
    showMain();
  } catch {
    if (isAuthenticated()) showAuth();
  }
}

// Auth tabs
$$(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".auth-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    $("#login-form").classList.toggle("hidden", target !== "login");
    $("#register-form").classList.toggle("hidden", target !== "register");
    clearError();
  });
});

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const fd = new FormData(e.target);
  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });
    localStorage.setItem(STORAGE_TOKEN, data.access_token);
    localStorage.removeItem(STORAGE_API_KEY);
    localStorage.setItem(STORAGE_EMAIL, fd.get("email"));
    showMain();
  } catch (err) {
    showError(err.message);
  }
});

$("#register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const fd = new FormData(e.target);
  try {
    await apiRequest("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
        full_name: fd.get("full_name") || null,
      }),
    });
    const loginData = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });
    localStorage.setItem(STORAGE_TOKEN, loginData.access_token);
    localStorage.removeItem(STORAGE_API_KEY);
    localStorage.setItem(STORAGE_EMAIL, fd.get("email"));
    showMain();
  } catch (err) {
    showError(err.message);
  }
});

$("#apikey-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const key = new FormData(e.target).get("api_key");
  if (!key) return showError("Please enter an API key");
  localStorage.setItem(STORAGE_API_KEY, key);
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.setItem(STORAGE_EMAIL, "API Key user");
  showMain();
});

$("#logout-btn").addEventListener("click", logout);

async function loadDocuments() {
  try {
    const data = await apiRequest("/documents?page_size=50", { headers: getAuthHeaders() });
    docList.innerHTML = "";
    if (!data.items.length) {
      docList.innerHTML = '<li class="doc-empty">No documents yet</li>';
      return;
    }
    data.items.forEach((doc) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="doc-title">${escapeHtml(doc.title)}</div>
        <div class="doc-meta">
          <span class="doc-status ${doc.status}">${doc.status}</span>
        </div>`;
      docList.appendChild(li);
    });
  } catch {
    docList.innerHTML = '<li class="doc-empty">Could not load documents</li>';
  }
}

$("#refresh-docs").addEventListener("click", loadDocuments);

// Chat helpers
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatAnswer(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered">$2</li>');
  html = html.replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");
  return `<p>${html}</p>`;
}

function clearWelcome() {
  const welcome = $(".welcome-card");
  if (welcome) welcome.remove();
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendUserMessage(content) {
  clearWelcome();
  const msg = document.createElement("div");
  msg.className = "message user";
  msg.innerHTML = `
    <div class="message-row">
      <div class="message-bubble">${escapeHtml(content)}</div>
      <div class="avatar user-avatar">You</div>
    </div>`;
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function createAssistantMessageShell() {
  clearWelcome();
  const msg = document.createElement("div");
  msg.className = "message assistant";
  msg.innerHTML = `
    <div class="message-row">
      <div class="avatar bot-avatar">Kh</div>
      <div class="message-body">
        <div class="message-bubble answer-content"></div>
        <div class="follow-ups hidden"></div>
      </div>
    </div>`;
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

async function typewriterEffect(element, text, speed = 12) {
  element.innerHTML = "";
  const plain = text;
  let i = 0;
  return new Promise((resolve) => {
    const tick = () => {
      if (i < plain.length) {
        const chunk = plain.slice(0, i + 1);
        element.innerHTML = formatAnswer(chunk);
        i += 1;
        scrollToBottom();
        setTimeout(tick, speed);
      } else {
        element.innerHTML = formatAnswer(text);
        resolve();
      }
    };
    tick();
  });
}

function addFollowUps(container, question) {
  const followUps = container.querySelector(".follow-ups");
  if (!followUps) return;

  const suggestions = [
    ...FOLLOW_UP_TEMPLATES.slice(0, 2),
    question.includes("how") ? "What do I need before starting?" : "Can you give me an example?",
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3);

  followUps.innerHTML = "";
  suggestions.forEach((q) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "follow-up-chip";
    btn.textContent = q;
    btn.addEventListener("click", () => sendQuestion(q));
    followUps.appendChild(btn);
  });
  followUps.classList.remove("hidden");
}

function showTyping() {
  clearWelcome();
  const el = document.createElement("div");
  el.className = "message assistant";
  el.id = "typing";
  el.innerHTML = `
    <div class="message-row">
      <div class="avatar bot-avatar pulse">Kh</div>
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>`;
  messagesEl.appendChild(el);
  scrollToBottom();
}

function hideTyping() {
  const el = $("#typing");
  if (el) el.remove();
}

async function sendQuestion(question) {
  if (isLoading || !question.trim()) return;
  isLoading = true;
  sendBtn.disabled = true;
  lastQuestion = question.trim();

  appendUserMessage(lastQuestion);
  questionInput.value = "";
  questionInput.style.height = "auto";
  showTyping();

  try {
    const data = await apiRequest("/chat", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        question: lastQuestion,
        top_k: 3,
      }),
    });
    hideTyping();
    const msg = createAssistantMessageShell();
    const contentEl = msg.querySelector(".answer-content");
    contentEl.innerHTML = formatAnswer(data.answer);
    scrollToBottom();
    addFollowUps(msg, lastQuestion);
  } catch (err) {
    hideTyping();
    if (err.message.includes("expired") || err.message.includes("Invalid")) return;
    const msg = createAssistantMessageShell();
    const friendly =
      err.message.includes("Groq") ||
      err.message.includes("GROQ") ||
      err.message.includes("Pinecone") ||
      err.message.includes("PINECONE")
        ? err.message
        : `Sorry, something went wrong. Please try again. (${err.message})`;
    msg.querySelector(".answer-content").innerHTML = formatAnswer(friendly);
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    questionInput.focus();
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendQuestion(questionInput.value);
});

questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendQuestion(questionInput.value);
  }
});

questionInput.addEventListener("input", () => {
  questionInput.style.height = "auto";
  questionInput.style.height = `${Math.min(questionInput.scrollHeight, 140)}px`;
});

$$(".suggestion").forEach((btn) => {
  btn.addEventListener("click", () => sendQuestion(btn.dataset.q));
});

validateSession();
