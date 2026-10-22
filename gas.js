const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const crypto = require("crypto");
const sharp = require("sharp");
const {
  Telegraf,
  Markup,
} = require("telegraf");

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const TMP_DIR = path.join(DATA_DIR, "tmp");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_IDS = (process.env.OWNER_IDS || "").split(",").map(x => x.trim()).filter(Boolean);
const TEMPLATE_CODE = process.env.TEMPLATE_CODE || "ubuntu-ssh-claude";
const DEPLOY_COMMAND = process.env.DEPLOY_COMMAND || "railway";
const MAX_SLOTS_PER_KEY = Number(process.env.MAX_SLOTS_PER_KEY || 2);
const IMAGE_URL = process.env.START_IMAGE_URL || "https://files.catbox.moe/j85vn0.jpg";
const SUPPORT_USERNAME = process.env.SUPPORT_USERNAME || "@lowhbabuw";
const DB_SECRET = process.env.DB_SECRET || "change-this-secret";

if (!BOT_TOKEN) throw new Error("BOT_TOKEN belum diisi.");
if (!OWNER_IDS.length) throw new Error("OWNER_IDS belum diisi.");

function defaultDb() {
  return {
    users: {},
    groups: {},
    stock: [],
    vps: [],
    stats: { created: 0 },
    settings: { createdAt: Date.now() }
  };
}
function loadDb() {
  try {
    if (!fs.existsSync(DB_FILE)) return defaultDb();
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return defaultDb();
  }
}
let db = loadDb();
function saveDb() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
function now() { return Date.now(); }
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isOwner(id) { return OWNER_IDS.includes(String(id)); }
function user(id) {
  const key = String(id);
  if (!db.users[key]) db.users[key] = { id: key, role: null, daily: {}, createdAt: now() };
  return db.users[key];
}
function roleLimit(role) {
  if (role === "reseller") return 4;
  if (role === "premium") return 2;
  if (role === "owner") return Infinity;
  return 0;
}
function dailyUsed(u) {
  return Number((u.daily || {})[todayKey()] || 0);
}
function canCreate(u) {
  if (u.role === "owner") return true;
  const limit = roleLimit(u.role);
  return limit > dailyUsed(u);
}
function consumeDaily(u) {
  const k = todayKey();
  u.daily ||= {};
  u.daily[k] = dailyUsed(u) + 1;
}
function stockFree() {
  return db.stock.reduce((n, x) => n + Math.max(0, MAX_SLOTS_PER_KEY - x.used), 0);
}
function nextStockKey() {
  return db.stock.find(x => x.used < MAX_SLOTS_PER_KEY);
}
function mask(s) {
  if (!s) return "";
  if (s.length <= 8) return "••••";
  return s.slice(0, 4) + "••••" + s.slice(-4);
}
function encrypt(value) {
  const key = crypto.createHash("sha256").update(DB_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}
function decrypt(value) {
  const raw = Buffer.from(value, "base64");
  const key = crypto.createHash("sha256").update(DB_SECRET).digest();
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
function safeArg(s) {
  if (!/^[A-Za-z0-9._:@/+={}\- ]+$/.test(s)) throw new Error("Nilai variable mengandung karakter yang tidak diizinkan.");
  return s;
}

const sessions = new Map();
function setSession(id, value) { sessions.set(String(id), value); }
function getSession(id) { return sessions.get(String(id)); }
function clearSession(id) { sessions.delete(String(id)); }

function mainMenu(id) {
  const u = user(id);
  const buttons = [
    [Markup.button.callback("🚀 CREATE VPS", "create")],
    [Markup.button.callback("📦 STOK VPS", "stock")]
  ];
  if (isOwner(id)) buttons.push([Markup.button.callback("👑 OWNER CONTROL", "owner")]);
  return Markup.inlineKeyboard(buttons);
}

async function sendStart(ctx) {
  const id = ctx.from.id;
  const u = user(id);
  saveDb();

  const text =
`╭━━━〔 🧊 CONTAINER BASED VPS 〕━━━╮
┃ ⚡ Runtime      : ${formatRuntime()}
┃ 👥 Total User   : ${Object.keys(db.users).length}
┃ 🖥️ VPS Created  : ${db.vps.length}
┃ 📦 Stok VPS     : ${stockFree()}
┃ 🎟️ Your Role    : ${u.role || "NO ACCESS"}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> ✦ Cloud container siap dipakai.
> ✦ Akses dibuat otomatis sesuai role.
> ✦ Reseller: 4 create / hari.
> ✦ Premium : 2 create / hari.

${u.role ? "Pilih menu di bawah untuk melanjutkan. 🚀" : `> 🔒 Akses tidak ada.
> Silahkan chat ${SUPPORT_USERNAME} untuk membeli akses.`}`;

  try {
    await ctx.replyWithPhoto(IMAGE_URL, { caption: text, parse_mode: "HTML", ...mainMenu(id) });
  } catch {
    await ctx.reply(text, { parse_mode: "HTML", ...mainMenu(id) });
  }
}

function formatRuntime() {
  const sec = Math.floor(process.uptime());
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

async function renderBill(record) {
  const file = path.join(TMP_DIR, `bill-${record.id}.png`);
  const svg = `
<svg width="1200" height="780" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="780" rx="42" fill="#0b1020"/>
  <rect x="38" y="38" width="1124" height="704" rx="34" fill="#111a30" stroke="#33466e" stroke-width="3"/>
  <text x="80" y="115" fill="#ffffff" font-size="46" font-family="Arial" font-weight="700">CONTAINER BASED VPS</text>
  <text x="80" y="160" fill="#86a7ff" font-size="26" font-family="Arial">DEPLOYMENT RECEIPT</text>
  <text x="80" y="235" fill="#8fa3c7" font-size="24" font-family="Arial">STATUS</text>
  <text x="80" y="280" fill="#67e8a5" font-size="42" font-family="Arial" font-weight="700">✓ SUCCESS</text>
  <text x="80" y="355" fill="#8fa3c7" font-size="24" font-family="Arial">CREATE ID</text>
  <text x="80" y="395" fill="#ffffff" font-size="30" font-family="Arial">${escapeXml(record.id)}</text>
  <text x="520" y="355" fill="#8fa3c7" font-size="24" font-family="Arial">USERNAME</text>
  <text x="520" y="395" fill="#ffffff" font-size="30" font-family="Arial">${escapeXml(record.username)}</text>
  <line x1="80" y1="450" x2="1120" y2="450" stroke="#33466e" stroke-width="2"/>
  <text x="80" y="510" fill="#8fa3c7" font-size="24" font-family="Arial">OWNER</text>
  <text x="80" y="550" fill="#ffffff" font-size="30" font-family="Arial">${escapeXml(record.owner)}</text>
  <text x="520" y="510" fill="#8fa3c7" font-size="24" font-family="Arial">ROLE</text>
  <text x="520" y="550" fill="#ffffff" font-size="30" font-family="Arial">${escapeXml(record.role)}</text>
  <text x="80" y="655" fill="#6579a4" font-size="22" font-family="Arial">Generated automatically • Container Based VPS</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  return file;
}
function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;" }[c]));
}

function runDeploy(apiKey, variables) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      RAILWAY_TOKEN: apiKey
    };
    const args = ["deploy", "--template", TEMPLATE_CODE, "--json"];
    for (const [k,v] of Object.entries(variables)) {
      args.push("--variable", `${k}=${safeArg(String(v))}`);
    }
    execFile(DEPLOY_COMMAND, args, { env, timeout: 180000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || stdout || err.message).trim().slice(-4000)));
      let parsed;
      try { parsed = JSON.parse(stdout); } catch { parsed = { raw: stdout.trim() }; }
      resolve(parsed);
    });
  });
}

async function deployVps(ctx) {
  const id = ctx.from.id;
  const u = user(id);

  if (!u.role && !isOwner(id)) {
    return ctx.reply(`> 🔒 *AKSES TIDAK ADA*\n> Silahkan chat ${SUPPORT_USERNAME} untuk membeli akses.`, { parse_mode: "MarkdownV2" });
  }
  if (!canCreate(u) && !isOwner(id)) {
    return ctx.reply(`> ⛔ Limit harian habis\\.\n> Role: *${u.role}*\n> Limit: *${roleLimit(u.role)} VPS / hari*`, { parse_mode: "MarkdownV2" });
  }
  if (stockFree() <= 0) return ctx.reply("> 📦 *Stok VPS habis.*\n> Silahkan tunggu restock.", { parse_mode: "MarkdownV2" });

  setSession(id, { step: "ssh_user" });
  await ctx.reply(
`╭━━〔 🚀 CREATE VPS 〕━━╮
┃ 📦 Stok VPS : ${stockFree()}
┃ 🧩 Template  : ${TEMPLATE_CODE}
╰━━━━━━━━━━━━━━━━━━━━━━╯

> Masukkan *username SSH* untuk container:
> Contoh: \`root\``,
    { parse_mode: "MarkdownV2" }
  );
}

async function handleText(ctx) {
  const id = ctx.from.id;
  const s = getSession(id);
  if (!s) return;

  const text = (ctx.message.text || "").trim();
  if (text.startsWith("/")) return;

  if (s.step === "ssh_user") {
    if (!/^[A-Za-z_][A-Za-z0-9_-]{1,31}$/.test(text)) return ctx.reply("❌ Username SSH tidak valid.");
    s.sshUser = text;
    s.step = "ssh_pass";
    return ctx.reply("🔐 Masukkan *password SSH*:", { parse_mode: "Markdown" });
  }

  if (s.step === "ssh_pass") {
    if (text.length < 6 || text.length > 128) return ctx.reply("❌ Password harus 6–128 karakter.");
    s.sshPass = text;
    clearSession(id);

    const key = nextStockKey();
    if (!key) return ctx.reply("📦 Stok habis.");

    await ctx.reply("⏳ Membuat container…\n> Jangan kirim perintah lain sampai proses selesai.", { parse_mode: "Markdown" });

    try {
      const apiKey = decrypt(key.value);
      const vars = {};
      vars[process.env.SSH_USERNAME_VAR || "SSH_USERNAME"] = s.sshUser;
      vars[process.env.SSH_PASSWORD_VAR || "SSH_PASSWORD"] = s.sshPass;

      const result = await runDeploy(apiKey, vars);

      key.used += 1;
      const record = {
        id: crypto.randomBytes(4).toString("hex").toUpperCase(),
        username: s.sshUser,
        role: user(id).role || "owner",
        owner: ctx.from.username ? `@${ctx.from.username}` : String(id),
        telegramId: id,
        createdAt: now(),
        deployment: result
      };
      db.vps.push(record);
      db.stats.created += 1;
      consumeDaily(user(id));
      saveDb();

      const img = await renderBill(record);
      await ctx.replyWithPhoto({ source: img }, {
        caption:
`╭━━〔 ✅ BERHASIL CREATE 〕━━╮
┃ 👤 Usn create : ${record.username}
┃ 🆔 ID create  : ${record.id}
┃ 👑 Owner      : ${record.owner}
┃ 🎟️ Role       : ${record.role}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> Container berhasil diproses.
> Detail akses tidak diposting ke grup.`,
        parse_mode: "Markdown"
      });

      if (ctx.chat.type === "private") {
        await broadcastCreateNotice(ctx, record);
      }
      fs.unlink(img, () => {});
    } catch (e) {
      await ctx.reply(`❌ Deploy gagal.\n\n> ${String(e.message).slice(0, 2500)}`, { parse_mode: "Markdown" });
    }
  }
}

async function broadcastCreateNotice(ctx, record) {
  const text =
`╭━━〔 🟢 CREATE SUCCESS 〕━━╮
┃ 👤 Usn create : ${record.username}
┃ 🆔 ID         : ${record.id}
┃ 👑 Owner      : ${record.owner}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
> VPS berhasil dibuat.`;
  for (const gid of Object.keys(db.groups)) {
    try { await ctx.telegram.sendMessage(gid, text, { parse_mode: "Markdown" }); } catch {}
  }
}

function ownerKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📦 STOCK", "ostock"), Markup.button.callback("🖥️ VPS LIST", "ovps")],
    [Markup.button.callback("👥 ADD PREMIUM", "apremium"), Markup.button.callback("🧑‍💼 ADD RESELLER", "areseller")],
    [Markup.button.callback("👑 ADD OWNER", "aowner"), Markup.button.callback("➕ ADD GROUP", "agroup")],
    [Markup.button.callback("📢 BROADCAST", "broadcast")],
  ]);
}

async function ownerPanel(ctx) {
  if (!isOwner(ctx.from.id)) return ctx.answerCbQuery("Owner only.");
  await ctx.reply(
`╭━━━〔 👑 OWNER CONTROL 〕━━━╮
┃ 👥 Users : ${Object.keys(db.users).length}
┃ 🖥️ VPS   : ${db.vps.length}
┃ 📦 Stock : ${stockFree()}
┃ 👑 Owners: ${OWNER_IDS.length}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    ownerKeyboard()
  );
}

function parseId(text) {
  const m = String(text).match(/-?\d+/);
  return m ? m[0] : null;
}

async function ownerAction(ctx, action) {
  if (!isOwner(ctx.from.id)) return ctx.answerCbQuery("Owner only.");
  const id = ctx.from.id;

  if (action === "ostock") {
    const lines = db.stock.length
      ? db.stock.map((x,i)=>`${i+1}. ${mask(decrypt(x.value))} • ${x.used}/${MAX_SLOTS_PER_KEY}`).join("\n")
      : "Belum ada stock.";
    return ctx.reply(`📦 *STOCK*\n\n${lines}\n\nFree slot: *${stockFree()}*`, { parse_mode:"Markdown" });
  }
  if (action === "ovps") {
    if (!db.vps.length) return ctx.reply("🖥️ Belum ada VPS.");
    const lines = db.vps.slice(-30).reverse().map(x=>`• ${x.id} | ${x.username} | ${x.role} | ${x.owner}`).join("\n");
    return ctx.reply(`🖥️ *VPS TERAKHIR*\n\n${lines}`, { parse_mode:"Markdown" });
  }

  const prompts = {
    "apremium": "Kirim Telegram ID user untuk diberi role premium.",
    "areseller": "Kirim Telegram ID user untuk diberi role reseller.",
    "aowner": "Kirim Telegram ID user untuk ditambahkan sebagai owner.",
    "agroup": "Kirim Chat ID grup yang akan diizinkan."
  };
  if (prompts[action]) {
    setSession(id, { step: action });
    return ctx.reply(prompts[action]);
  }
  if (action === "broadcast") {
    setSession(id, { step: "broadcast" });
    return ctx.reply("Kirim teks broadcast. Bot akan mengirim ke user yang pernah /start dan grup yang terdaftar.");
  }
}

async function handleOwnerSession(ctx) {
  const id = ctx.from.id;
  if (!isOwner(id)) return;
  const s = getSession(id);
  if (!s) return false;
  const text = (ctx.message.text || "").trim();

  if (s.step === "apremium" || s.step === "areseller") {
    const target = parseId(text);
    if (!target) return ctx.reply("❌ ID tidak valid.");
    user(target).role = s.step === "apremium" ? "premium" : "reseller";
    saveDb(); clearSession(id);
    return ctx.reply(`✅ Role *${user(target).role}* ditambahkan ke ${target}.`, { parse_mode:"Markdown" });
  }
  if (s.step === "aowner") {
    const target = parseId(text);
    if (!target) return ctx.reply("❌ ID tidak valid.");
    if (!OWNER_IDS.includes(target)) {
      // Owner IDs are configured by env; runtime-added owner is stored separately.
      db.users[target] ||= { id: target, role: "owner", daily: {}, createdAt: now() };
      db.users[target].role = "owner";
      saveDb();
    }
    clearSession(id);
    return ctx.reply(`✅ ${target} diberi role owner di database.\nCatatan: untuk akses owner penuh saat restart, tambahkan ID ke OWNER_IDS.`);
  }
  if (s.step === "agroup") {
    if (!/^-?\d+$/.test(text)) return ctx.reply("❌ Chat ID tidak valid.");
    db.groups[text] = { id: text, addedBy: id, createdAt: now() };
    saveDb(); clearSession(id);
    return ctx.reply(`✅ Grup ${text} ditambahkan.`);
  }
  if (s.step === "broadcast") {
    clearSession(id);
    let ok=0, fail=0;
    const targets = new Set([...Object.keys(db.users), ...Object.keys(db.groups)]);
    for (const target of targets) {
      try { await ctx.telegram.sendMessage(target, text); ok++; } catch { fail++; }
    }
    return ctx.reply(`📢 Broadcast selesai.\n✅ ${ok} terkirim\n❌ ${fail} gagal`);
  }
  return false;
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(sendStart);

bot.command("addstock", async ctx => {
  if (!isOwner(ctx.from.id)) return ctx.reply("⛔ Owner only.");
  const raw = (ctx.message.text || "").replace(/^\/addstock(@\w+)?\s*/i, "").trim();
  if (!raw) return ctx.reply("Format:\n/addstock api_1|api_2|api_3");
  const keys = raw.split("|").map(x=>x.trim()).filter(Boolean);
  let added=0;
  for (const k of keys) {
    try {
      // Validate the key is non-empty and keep it encrypted at rest.
      db.stock.push({ id: crypto.randomBytes(5).toString("hex"), value: encrypt(k), used: 0, createdAt: now() });
      added++;
    } catch {}
  }
  saveDb();
  return ctx.reply(`✅ Stock ditambahkan: ${added}\n📦 Free slot: ${stockFree()}`);
});

bot.command("owner", async ctx => {
  if (!isOwner(ctx.from.id)) return ctx.reply("⛔ Owner only.");
  return ownerPanel(ctx);
});

bot.command("stock", async ctx => {
  const u = user(ctx.from.id);
  if (!isOwner(ctx.from.id) && !u.role) return ctx.reply(`> 🔒 Akses tidak ada.\n> Silahkan chat ${SUPPORT_USERNAME} untuk membeli akses.`, {parse_mode:"Markdown"});
  return ctx.reply(`📦 *Stok VPS*\n👉 ${stockFree()}`, {parse_mode:"Markdown"});
});

bot.command("id", async ctx => ctx.reply(`🆔 Chat ID: ${ctx.chat.id}\n👤 User ID: ${ctx.from.id}`));

bot.action("create", async ctx => { await ctx.answerCbQuery(); return deployVps(ctx); });
bot.action("stock", async ctx => {
  await ctx.answerCbQuery();
  return ctx.reply(`📦 *Stok VPS*\n👉 ${stockFree()}`, {parse_mode:"Markdown"});
});
bot.action("owner", async ctx => { await ctx.answerCbQuery(); return ownerPanel(ctx); });
for (const a of ["ostock","ovps","apremium","areseller","aowner","agroup","broadcast"]) {
  bot.action(a, async ctx => { await ctx.answerCbQuery(); return ownerAction(ctx, a); });
}

bot.on("text", async ctx => {
  if (ctx.chat.type !== "private" && !db.groups[String(ctx.chat.id)]) {
    try { await ctx.telegram.leaveChat(ctx.chat.id); } catch {}
    return;
  }
  if (await handleOwnerSession(ctx)) return;
  await handleText(ctx);
});

bot.catch((err, ctx) => {
  console.error("BOT ERROR", err);
  try { ctx.reply("⚠️ Terjadi error internal. Coba lagi beberapa saat."); } catch {}
});

bot.launch().then(()=>console.log("Container Based VPS bot online."));
process.once("SIGINT", ()=>bot.stop("SIGINT"));
process.once("SIGTERM", ()=>bot.stop("SIGTERM"));
