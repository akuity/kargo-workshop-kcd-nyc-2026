// LAMBDA_URL is injected at deploy time via config.js (see docker-entrypoint.d).
// When set, the page calls the AWS Lambda Function URL to show the backend's
// greeting/version ("beyond Kubernetes"). Guestbook entries are kept client-side
// so the app works in every environment regardless of whether a Lambda is wired.
const LAMBDA_URL = (window.APP_CONFIG && window.APP_CONFIG.lambdaUrl) || "";
const STAGE = (window.APP_CONFIG && window.APP_CONFIG.stage) || "an environment";
const STORE_KEY = `guestbook:${STAGE}`;

const entriesEl = document.getElementById("entries");
const statusEl = document.getElementById("status");
const backendEl = document.getElementById("backend");
const formEl = document.getElementById("entry-form");

document.getElementById("stage").textContent = STAGE;

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "error" : "muted";
}

function loadEntries() {
  let entries = [];
  try {
    entries = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch (_) {
    entries = [];
  }
  if (entries.length === 0) {
    entriesEl.innerHTML = '<li class="muted">No entries yet. Be the first!</li>';
    return;
  }
  entriesEl.innerHTML = "";
  for (const e of entries.slice().reverse()) {
    const li = document.createElement("li");
    const who = document.createElement("strong");
    who.textContent = e.name || "anonymous";
    li.appendChild(who);
    li.appendChild(document.createTextNode(`: ${e.message || ""}`));
    entriesEl.appendChild(li);
  }
}

function saveEntry(entry) {
  let entries = [];
  try {
    entries = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch (_) {
    entries = [];
  }
  entries.push(entry);
  localStorage.setItem(STORE_KEY, JSON.stringify(entries.slice(-50)));
}

// Show the Lambda backend greeting/version if a Function URL is configured.
async function pingBackend() {
  if (!LAMBDA_URL) {
    backendEl.textContent = "Backend: no Lambda configured for this environment.";
    return;
  }
  backendEl.textContent = `Backend: ${LAMBDA_URL} …`;
  try {
    const res = await fetch(LAMBDA_URL, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    backendEl.textContent = `Backend says: ${data.message || "(no message)"}`;
  } catch (err) {
    backendEl.className = "error";
    backendEl.textContent = `Backend unreachable: ${err.message}`;
  }
}

formEl.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const name = document.getElementById("name").value.trim();
  const message = document.getElementById("message").value.trim();
  if (!name || !message) return;
  saveEntry({ name, message });
  formEl.reset();
  loadEntries();
  setStatus("Saved!", false);
  // Best-effort: also tell the Lambda backend (echo only).
  if (LAMBDA_URL) {
    try {
      await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
    } catch (_) {
      /* client-side entry already saved; ignore backend errors */
    }
  }
});

loadEntries();
pingBackend();

// workshop re-test build marker
