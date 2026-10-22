/**
 * Temp mail via mail.tm API (1secmail sering 403)
 */
const axios = require("axios");

const API = "https://api.mail.tm";
const TTL_MS = 15 * 60 * 1000;
const sessions = new Map();

function randomLogin() {
  const a = Math.random().toString(36).slice(2, 10);
  const b = Date.now().toString(36).slice(-4);
  return `hanz${a}${b}`;
}

function randomPass() {
  return `Hm${Math.random().toString(36).slice(2, 12)}A1!`;
}

async function createSession(userId) {
  // 1) domain aktif
  const domRes = await axios.get(`${API}/domains`, {
    timeout: 20000,
    headers: { Accept: "application/json" }
  });
  const members = domRes.data?.["hydra:member"] || domRes.data || [];
  const active = (Array.isArray(members) ? members : []).find((d) => d.isActive) || members[0];
  if (!active?.domain) throw new Error("Tidak ada domain temp mail aktif");

  const login = randomLogin();
  const address = `${login}@${active.domain}`;
  const password = randomPass();

  // 2) buat akun
  try {
    await axios.post(
      `${API}/accounts`,
      { address, password },
      { timeout: 20000, headers: { "Content-Type": "application/json", Accept: "application/json" } }
    );
  } catch (e) {
    const msg = e.response?.data?.detail || e.response?.data?.message || e.message;
    throw new Error("Gagal buat email: " + String(msg).slice(0, 120));
  }

  // 3) token
  let token = null;
  try {
    const tok = await axios.post(
      `${API}/token`,
      { address, password },
      { timeout: 20000, headers: { "Content-Type": "application/json", Accept: "application/json" } }
    );
    token = tok.data?.token;
  } catch (e) {
    throw new Error("Gagal login mailbox: " + (e.message || "token"));
  }
  if (!token) throw new Error("Token mailbox kosong");

  const sess = {
    login,
    domain: active.domain,
    email: address,
    password,
    token,
    createdAt: Date.now(),
    lastIds: new Set()
  };
  sessions.set(String(userId), sess);
  return sess;
}

function isExpired(sess) {
  if (!sess) return true;
  return Date.now() - (sess.createdAt || 0) > TTL_MS;
}

function remainingSec(sess) {
  if (!sess) return 0;
  return Math.max(0, Math.ceil((TTL_MS - (Date.now() - sess.createdAt)) / 1000));
}

function getSession(userId) {
  const sess = sessions.get(String(userId));
  if (!sess || isExpired(sess)) {
    if (sess) sessions.delete(String(userId));
    return null;
  }
  return sess;
}

async function refreshOrCreate(userId, forceNew = false) {
  if (!forceNew) {
    const cur = getSession(userId);
    if (cur) return cur;
  }
  return createSession(userId);
}

function authHeaders(sess) {
  return {
    Authorization: `Bearer ${sess.token}`,
    Accept: "application/json"
  };
}

async function fetchMessages(sess) {
  if (!sess?.token) return [];
  const { data } = await axios.get(`${API}/messages`, {
    timeout: 20000,
    headers: authHeaders(sess)
  });
  const list = data?.["hydra:member"] || data || [];
  return Array.isArray(list) ? list : [];
}

async function readMessage(sess, id) {
  if (!sess?.token || !id) return null;
  const { data } = await axios.get(`${API}/messages/${id}`, {
    timeout: 20000,
    headers: authHeaders(sess)
  });
  return data || null;
}

function extractCodes(text) {
  if (!text) return [];
  const s = String(text);
  const codes = [];
  const re = /\b(\d{4,8})\b/g;
  let m;
  while ((m = re.exec(s)) !== null) codes.push(m[1]);
  // Railway sering 6 digit
  return [...new Set(codes)].slice(0, 8);
}

async function pollInbox(userId) {
  const sess = getSession(userId);
  if (!sess) return { expired: true, messages: [], newMails: [] };

  let list = [];
  try {
    list = await fetchMessages(sess);
  } catch (e) {
    return {
      expired: false,
      email: sess.email,
      leftSec: remainingSec(sess),
      messages: [],
      newMails: [],
      error: e.message
    };
  }

  const newMails = [];
  for (const m of list) {
    const id = String(m.id || m["@id"] || "");
    if (!id) continue;
    const shortId = id.includes("/") ? id.split("/").pop() : id;
    if (sess.lastIds.has(shortId)) continue;
    sess.lastIds.add(shortId);

    let full = m;
    try {
      full = (await readMessage(sess, shortId)) || m;
    } catch (_) {}

    const text =
      full.text ||
      full.intro ||
      (typeof full.html === "string" ? full.html.replace(/<[^>]+>/g, " ") : "") ||
      "";
    const codes = extractCodes(text + " " + (full.subject || ""));

    newMails.push({
      id: shortId,
      from: full.from?.address || full.from || m.from?.address || "-",
      subject: full.subject || m.subject || "-",
      text: String(text).replace(/\s+/g, " ").slice(0, 400),
      codes
    });
  }

  return {
    expired: false,
    email: sess.email,
    leftSec: remainingSec(sess),
    messages: list.map((m) => ({
      id: m.id,
      from: m.from?.address || "-",
      subject: m.subject || "-"
    })),
    newMails
  };
}

function clearSession(userId) {
  sessions.delete(String(userId));
}

module.exports = {
  TTL_MS,
  createSession,
  getSession,
  refreshOrCreate,
  pollInbox,
  clearSession,
  remainingSec,
  isExpired
};
