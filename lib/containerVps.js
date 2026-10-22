/**
 * Container VPS Module
 * - Stock: host:port|password
 * - Paket: low / standard / high (spek tetap 1GB + 2 vCPU)
 * - Cek aktif TCP
 * - Railway: deploy Ubuntu SSH + Claude, auto-detect TCP proxy domain + port
 */

const fs = require("fs");
const path = require("path");
const net = require("net");
const axios = require("axios");
const dns = require("dns").promises;


/** Banner/MOTD bersih — hanya spek, tanpa parham / Railway / developer */
function buildVpsMotd() {
  // Tidak dipakai sebagai banner — MOTD Ubuntu default saja
  return "";
}



/**
 * SSH ke VPS lalu ganti MOTD/banner (hilangkan teks parham/railway/dev)
 * Optimized untuk Railway TCP proxy (retry + keepalive + keyboard-interactive)
 * Butuh: npm i ssh2
 */

/**
 * Eksekusi script bash via SSH (satu shot, lebih stabil di Railway TCP proxy)
 */
function sshExecOnce(host, port, password, username, script) {
  let Client;
  try {
    Client = require("ssh2").Client;
  } catch {
    return Promise.resolve({ ok: false, error: "package ssh2 belum terpasang (npm i ssh2)" });
  }

  return new Promise((resolve) => {
    const conn = new Client();
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { conn.end(); } catch (_) {}
      resolve(result);
    };
    const timer = setTimeout(() => done({ ok: false, error: "timeout SSH 45s" }), 45000);

    const runExec = (cmd) => {
      conn.exec(cmd, { pty: false }, (err, stream) => {
        if (err) return done({ ok: false, error: err.message, user: username });
        let out = "";
        stream.on("data", (d) => { out += d.toString(); });
        stream.stderr.on("data", (d) => { out += d.toString(); });
        stream.on("close", (code) => {
          done({
            ok: /OK_VPSNAT_CLEAN/.test(out) || code === 0,
            output: out.slice(0, 500),
            user: username,
            code
          });
        });
      });
    };

    conn
      .on("ready", () => {
        // Kirim script sebagai base64 agar tidak rusak di shell/proxy
        const b64 = Buffer.from(String(script || "") + "\necho OK_VPSNAT_CLEAN\n", "utf8").toString("base64");
        const cmd = `echo '${b64}' | base64 -d | bash -s`;
        runExec(cmd);
      })
      .on("keyboard-interactive", (name, instructions, lang, prompts, finish) => {
        finish(prompts.map(() => String(password)));
      })
      .on("error", (e) => done({ ok: false, error: e.message, user: username }))
      .connect({
        host: String(host).trim(),
        port: parseInt(port, 10) || 22,
        username: String(username || "root"),
        password: String(password),
        tryKeyboard: true,
        readyTimeout: 40000,
        keepaliveInterval: 8000,
        algorithms: {
          serverHostKey: [
            "ssh-ed25519",
            "ecdsa-sha2-nistp256",
            "ecdsa-sha2-nistp384",
            "rsa-sha2-512",
            "rsa-sha2-256",
            "ssh-rsa"
          ],
          cipher: [
            "aes128-ctr",
            "aes192-ctr",
            "aes256-ctr",
            "aes128-gcm",
            "aes128-gcm@openssh.com",
            "aes256-gcm",
            "aes256-gcm@openssh.com",
            "aes128-cbc",
            "aes256-cbc"
          ],
          hmac: [
            "hmac-sha2-256",
            "hmac-sha2-512",
            "hmac-sha1"
          ]
        }
      });
  });
}

/**
 * Hapus total branding ARA TM / parham / Claude dari VPS.
 * Tidak memasang banner custom — biar tampilan seperti Ubuntu default.
 */
async function customizeVpsBanner(host, port, password, username = "root") {
  if (!host || !password) return { ok: false, error: "host/password kosong" };

  // Sumber utama ARA TM = /etc/profile.d/ara-welcome.sh (ditemukan manual di VPS)
  const script = `
set +e

# === UTAMA: hapus banner login ARA TM ===
rm -f /etc/profile.d/ara-welcome.sh
rm -f /etc/profile.d/*ara*
rm -f /etc/profile.d/*parham*
rm -f /etc/profile.d/*claude*

# Perintah helper ARA TM
rm -f /usr/local/bin/usage /usr/local/bin/cl /usr/local/bin/src-sync
rm -f /usr/local/bin/*motd* /usr/local/bin/*welcome* /usr/local/bin/*banner* 2>/dev/null
rm -rf /var/lib/ara 2>/dev/null

# SSH banner off
rm -f /etc/ssh/banner /etc/ssh/sshd_banner /etc/banner 2>/dev/null
sed -i '/^Banner /d' /etc/ssh/sshd_config 2>/dev/null
grep -q '^Banner none' /etc/ssh/sshd_config 2>/dev/null || echo 'Banner none' >> /etc/ssh/sshd_config
sed -i 's/^#*PrintMotd.*/PrintMotd no/' /etc/ssh/sshd_config 2>/dev/null

# MOTD kosong
rm -f /etc/motd /etc/issue /etc/issue.net /etc/legal 2>/dev/null
touch /etc/motd
mkdir -p /etc/update-motd.d
rm -f /etc/update-motd.d/* 2>/dev/null

# Bersihkan sisa teks di profile/bashrc
for f in /etc/profile /etc/bash.bashrc /etc/bashrc /root/.bashrc /root/.profile /root/.bash_profile; do
  [ -f "$f" ] || continue
  sed -i '/ARA TM/d;/parham/Id;/Claude Code/Id;/developer by/Id;/Parham_7991/d' "$f" 2>/dev/null
done

# Hapus sisa profile.d yang masih ada teks ARA
for f in /etc/profile.d/*; do
  [ -f "$f" ] || continue
  if grep -qiE 'ARA TM|parham|Claude Code|Parham_7991|developer by' "$f" 2>/dev/null; then
    rm -f "$f"
  fi
done

true
`

  const users = [];
  if (username) users.push(username);
  for (const u of ["root", "hanz", "ubuntu", "myuser", "admin"]) {
    if (!users.includes(u)) users.push(u);
  }

  let lastErr = "unknown";
  for (let round = 0; round < 3; round++) {
    if (round > 0) await sleep(1500 * round);
    for (const user of users) {
      try {
        const res = await sshExecOnce(host, port, password, user, script);
        if (res.ok) return { ok: true, user, output: res.output };
        lastErr = res.error || res.output || lastErr;
        if (/authentication|All configured|Permission denied/i.test(String(lastErr))) {
          continue;
        }
      } catch (e) {
        lastErr = e.message;
      }
    }
  }
  return { ok: false, error: String(lastErr).slice(0, 120) };
}


const CONTAINER_VPS_DB = path.join(process.cwd(), "database", "container_vps.json");
const RAILWAY_API = "https://backboard.railway.com/graphql/v2";

function ensureDb() {
  const dir = path.dirname(CONTAINER_VPS_DB);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONTAINER_VPS_DB)) {
    fs.writeFileSync(
      CONTAINER_VPS_DB,
      JSON.stringify(
        {
          stock: [],
          sold: [],
          settings: {
            harga: 6000, // VPS Nat default 6k (bisa diubah owner)
            garansi: { low: 1, standard: 3, high: 7 },
            replace: { low: 1, standard: 2, high: 3 },
            specs: {
              ram: "1 GB",
              vcpu: "2 vCPU",
              storage: "Shared / Ephemeral",
              os: "Ubuntu 22.04 / 24.04 (SSH)"
            }
          }
        },
        null,
        2
      )
    );
  }
}

function readContainerVpsDB() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(CONTAINER_VPS_DB, "utf8"));
  } catch {
    ensureDb();
    return JSON.parse(fs.readFileSync(CONTAINER_VPS_DB, "utf8"));
  }
}

function saveContainerVpsDB(data) {
  ensureDb();
  fs.writeFileSync(CONTAINER_VPS_DB, JSON.stringify(data, null, 2));
}

function getAvailableStock() {
  const db = readContainerVpsDB();
  return (db.stock || []).filter((s) => s.status === "available");
}

function getStockCount() {
  return getAvailableStock().length;
}

/**
 * Format: ip:port|password,ip2:port|pass2  ATAU  ip|password (port default 22)
 */
function parseStockEntries(raw) {
  const entries = [];
  const parts = String(raw || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  for (const part of parts) {
    const [left, password] = part.split("|").map((x) => (x || "").trim());
    if (!left || !password) continue;

    let host, port;
    if (left.includes(":")) {
      const lastColon = left.lastIndexOf(":");
      host = left.slice(0, lastColon).trim();
      port = parseInt(left.slice(lastColon + 1), 10);
    } else {
      host = left;
      port = 22;
    }

    if (!host || isNaN(port) || port < 1 || port > 65535) continue;

    entries.push({
      id: `cvps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      host,
      port,
      password,
      username: "root",
      status: "available",
      addedAt: new Date().toISOString(),
      lastCheck: null,
      isAlive: null
    });
  }
  return entries;
}

function tcpConnect(host, port, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok, info = "") => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {}
      resolve({ ok, info });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true, "TCP open"));
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (e) => finish(false, e.message || "error"));
    try {
      socket.connect(port, host);
    } catch (e) {
      finish(false, e.message);
    }
  });
}

async function checkVpsAlive(entry) {
  const result = await tcpConnect(entry.host, entry.port);
  return {
    alive: result.ok,
    info: result.info,
    checkedAt: new Date().toISOString()
  };
}

/** Hapus stok available yang sudah >= days hari tidak terjual (default 15) */
function purgeExpiredStock(days = 15) {
  const db = readContainerVpsDB();
  if (!Array.isArray(db.stock)) db.stock = [];
  const ms = Math.max(1, days) * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const kept = [];
  const removed = [];
  for (const s of db.stock) {
    if (s.status !== "available") {
      kept.push(s);
      continue;
    }
    const added = new Date(s.addedAt || 0).getTime();
    if (!added || now - added >= ms) {
      removed.push({ host: s.host, port: s.port, addedAt: s.addedAt });
    } else {
      kept.push(s);
    }
  }
  db.stock = kept;
  db.purged = db.purged || [];
  for (const r of removed) {
    db.purged.unshift({ ...r, purgedAt: new Date().toISOString(), reason: `${days}d_unsold` });
  }
  db.purged = db.purged.slice(0, 200);
  saveContainerVpsDB(db);
  return { removed: removed.length, items: removed, totalLeft: getStockCount() };
}

/**
 * Cek realtime: TCP + coba SSH login (password)
 * Tidak mengubah banner.
 */
async function checkStockLoginStatus(entry) {
  const host = String(entry.host || "").trim();
  const port = parseInt(entry.port, 10) || 22;
  const password = String(entry.password || "");

  const tcp = await checkVpsAlive({ host, port });
  if (!tcp.alive) {
    return {
      host,
      port,
      tcp: false,
      ssh: false,
      ok: false,
      info: `TCP gagal: ${tcp.info || "-"}`
    };
  }

  let Client;
  try {
    Client = require("ssh2").Client;
  } catch {
    return {
      host,
      port,
      tcp: true,
      ssh: null,
      ok: true,
      info: "TCP OK (install: npm i ssh2 untuk cek login)"
    };
  }

  // Warm-up TCP (proxy Railway sering reset handshake pertama)
  await sleep(400);
  await tcpConnect(host, port, 5000);
  await sleep(600);

  const tryUser = (username, attempt = 1) =>
    new Promise((resolve) => {
      const conn = new Client();
      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        try { conn.end(); } catch (_) {}
        resolve(result);
      };
      const t = setTimeout(() => finish({ ok: false, error: "timeout 25s" }), 25000);

      conn
        .on("ready", () => finish({ ok: true }))
        .on("keyboard-interactive", (name, instructions, lang, prompts, finishKb) => {
          finishKb(prompts.map(() => password));
        })
        .on("error", (e) => finish({ ok: false, error: e.message }))
        .on("close", () => {
          // ignore if already finished
        })
        .connect({
          host,
          port,
          username: String(username),
          password,
          tryKeyboard: true,
          readyTimeout: 22000,
          keepaliveInterval: 8000,
          keepaliveCountMax: 3,
          // toleransi proxy
          algorithms: {
            serverHostKey: [
              "ssh-ed25519",
              "ecdsa-sha2-nistp256",
              "ecdsa-sha2-nistp384",
              "ecdsa-sha2-nistp521",
              "rsa-sha2-512",
              "rsa-sha2-256",
              "ssh-rsa"
            ],
            kex: [
              "curve25519-sha256",
              "curve25519-sha256@libssh.org",
              "ecdh-sha2-nistp256",
              "ecdh-sha2-nistp384",
              "ecdh-sha2-nistp521",
              "diffie-hellman-group-exchange-sha256",
              "diffie-hellman-group14-sha256",
              "diffie-hellman-group14-sha1"
            ],
            cipher: [
              "aes128-ctr",
              "aes192-ctr",
              "aes256-ctr",
              "aes128-gcm",
                "aes256-gcm"
            ]
          }
        });
    });

  const users = [entry.username || "root", "root", "hanz", "ubuntu", "myuser"].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  let lastErr = "";
  for (let round = 1; round <= 3; round++) {
    if (round > 1) await sleep(1500 * round);
    for (const u of users) {
      try {
        const r = await tryUser(u, round);
        if (r.ok) {
          return {
            host,
            port,
            tcp: true,
            ssh: true,
            ok: true,
            user: u,
            info: `Login OK (${u})`
          };
        }
        lastErr = r.error || lastErr;
        // auth fail → user lain; reset → retry round
        if (/authentication|All configured|Permission denied/i.test(String(r.error || ""))) {
          continue;
        }
        if (/ECONNRESET|ECONNREFUSED|Closed|handshake|Timed out|timeout/i.test(String(r.error || ""))) {
          await sleep(1200);
          continue;
        }
      } catch (e) {
        lastErr = e.message;
        await sleep(800);
      }
    }
  }

  // TCP hidup tapi SSH reset = sering masalah proxy/sshd belum stabil, bukan pasti password salah
  const soft =
    /ECONNRESET|handshake|Closed|timeout/i.test(String(lastErr || ""))
      ? " (proxy/sshd belum stabil — coba cek lagi 1–2 menit)"
      : "";

  return {
    host,
    port,
    tcp: true,
    ssh: false,
    ok: false,
    info: `Gagal login: ${lastErr || "auth failed"}${soft}`
  };
}

async function checkAllStockRealtime() {
  const list = getAvailableStock();
  const results = [];
  for (const s of list) {
    const r = await checkStockLoginStatus(s);
    s.isAlive = !!(r.tcp);
    s.sshOk = r.ssh;
    s.lastCheck = new Date().toISOString();
    s.lastCheckInfo = r.info;

    results.push(r);
    await sleep(3500); // jeda antar unit (proxy Railway)
  }
  const db = readContainerVpsDB();
  saveContainerVpsDB(db);
  return {
    total: list.length,
    ok: results.filter((x) => x.ok).length,
    tcpFail: results.filter((x) => !x.tcp).length,
    loginFail: results.filter((x) => x.tcp && x.ssh === false).length,
    results
  };
}



async function checkAndAddStock(rawText) {
  const parsed = parseStockEntries(rawText);
  if (!parsed.length) {
    return {
      success: false,
      msg: "Format salah. Contoh:\n/addstock 66.33.22.220:29798|password\natau beberapa:\n/addstock ip:port|pass,ip2:port|pass2"
    };
  }

  const db = readContainerVpsDB();
  if (!Array.isArray(db.stock)) db.stock = [];
  const results = [];

  // Tanpa jeda antar unit — cek cepat TCP + 1x SSH, langsung add
  for (const entry of parsed) {
    const exists = db.stock.find(
      (s) =>
        s.status === "available" &&
        String(s.host) === String(entry.host) &&
        Number(s.port) === Number(entry.port)
    );
    if (exists) {
      results.push({
        host: entry.host,
        port: entry.port,
        status: "skip_duplicate",
        info: "sudah ada di stok"
      });
      continue;
    }

    entry.username = "root";
    entry.lastCheck = new Date().toISOString();

    // 1) TCP cepat (tanpa retry panjang)
    let tcpOk = false;
    try {
      const tcp = await checkVpsAlive({ host: entry.host, port: entry.port });
      tcpOk = !!(tcp && tcp.alive);
    } catch (_) {
      tcpOk = false;
    }

    if (!tcpOk) {
      entry.isAlive = false;
      results.push({
        host: entry.host,
        port: entry.port,
        status: "dead",
        alive: false,
        info: "TCP mati / port tutup"
      });
      continue;
    }

    // 2) SSH 1 kali saja (tanpa multi-round / tanpa sleep)
    let sshOk = false;
    let sshInfo = "TCP OK";
    try {
      let Client;
      try { Client = require("ssh2").Client; } catch { Client = null; }
      if (Client) {
        sshOk = await new Promise((resolve) => {
          const conn = new Client();
          const to = setTimeout(() => {
            try { conn.end(); } catch (_) {}
            resolve(false);
          }, 8000);
          conn
            .on("ready", () => {
              clearTimeout(to);
              try { conn.end(); } catch (_) {}
              resolve(true);
            })
            .on("error", () => {
              clearTimeout(to);
              resolve(false);
            })
            .connect({
              host: entry.host,
              port: parseInt(entry.port, 10) || 22,
              username: "root",
              password: String(entry.password || ""),
              readyTimeout: 7000,
              tryKeyboard: true,
              algorithms: {
                serverHostKey: [
                  "ssh-ed25519",
                  "ecdsa-sha2-nistp256",
                  "rsa-sha2-512",
                  "rsa-sha2-256",
                  "ssh-rsa"
                ],
                cipher: [
                  "aes128-ctr",
                  "aes192-ctr",
                  "aes256-ctr",
                  "aes128-gcm",
                  "aes256-gcm",
                  "aes128-cbc",
                  "aes256-cbc"
                ],
                hmac: ["hmac-sha2-256", "hmac-sha2-512", "hmac-sha1"]
              }
            });
        });
        sshInfo = sshOk ? "Login OK" : "Gagal login SSH";
      } else {
        // ssh2 tidak ada → terima jika TCP hidup
        sshOk = true;
        sshInfo = "TCP OK (ssh2 belum terpasang)";
      }
    } catch (e) {
      sshOk = false;
      sshInfo = e.message || "SSH error";
    }

    if (!sshOk) {
      entry.isAlive = false;
      results.push({
        host: entry.host,
        port: entry.port,
        status: "dead",
        alive: false,
        info: sshInfo
      });
      continue;
    }

    entry.isAlive = true;

    // Hapus branding ARA TM setelah login OK
    let bannerInfo = "";
    try {
      const ed = await customizeVpsBanner(entry.host, entry.port, entry.password, "root");
      bannerInfo = ed.ok ? " · banner dibersihkan" : ` · banner: ${(ed.error || "gagal").slice(0, 40)}`;
    } catch (e) {
      bannerInfo = ` · banner: ${(e.message || "error").slice(0, 40)}`;
    }

    db.stock.push(entry);
    results.push({
      host: entry.host,
      port: entry.port,
      password: entry.password,
      username: "root",
      status: "added",
      alive: true,
      info: sshInfo + bannerInfo,
      id: entry.id
    });
  }

  saveContainerVpsDB(db);
  const added = results.filter((r) => r.status === "added").length;

  return {
    success: true,
    added,
    totalStock: getStockCount(),
    results,
    dbPath: CONTAINER_VPS_DB
  };
}

function takeStock(qty = 1) {
  const db = readContainerVpsDB();
  const available = (db.stock || []).filter((s) => s.status === "available");
  if (available.length < qty) return { success: false, msg: `Stok tidak cukup, stok hanya ${available.length}` };

  const taken = [];
  for (let i = 0; i < qty; i++) {
    const item = available[i];
    item.status = "sold";
    item.soldAt = new Date().toISOString();
    taken.push({ ...item });
  }
  saveContainerVpsDB(db);
  return { success: true, items: taken };
}

function markSold(userId, username, paket, items, harga) {
  const db = readContainerVpsDB();
  const garansiDays = Number(db.settings?.garansi) || 7;
  const code = "GZ" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const soldAt = Date.now();
  const expiresAt = soldAt + garansiDays * 24 * 60 * 60 * 1000;

  for (const it of items) {
    const idx = (db.stock || []).findIndex((s) => s.id === it.id);
    if (idx >= 0) {
      db.stock[idx].status = "sold";
      db.stock[idx].soldAt = new Date(soldAt).toISOString();
      db.stock[idx].buyerId = userId;
      db.stock[idx].buyerUsername = username;
      db.stock[idx].paket = paket;
    }
  }
  db.sold = db.sold || [];
  const rec = {
    code,
    buyerId: userId,
    buyerUsername: username,
    paket,
    harga,
    items: items.map((it) => ({
      host: it.host,
      port: it.port,
      password: it.password,
      username: it.username || "root",
      projectId: it.projectId,
      serviceId: it.serviceId,
      environmentId: it.environmentId,
      token: it.token
    })),
    soldAt,
    expiresAt,
    garansiDays,
    used: false
  };
  db.sold.unshift(rec);
  saveContainerVpsDB(db);
  return rec;
}

/** Klaim kode garansi — 1x pakai, valid 7 hari, auto ambil 1 VPS dari stok */
/** Cari record kode garansi (belum redeem) */
function findGaransiRecord(code) {
  const db = readContainerVpsDB();
  const c = String(code || "").trim().toUpperCase();
  if (!c) return { ok: false, msg: "Kode kosong" };
  const rec = (db.sold || []).find((s) => String(s.code || "").toUpperCase() === c);
  if (!rec) return { ok: false, msg: "Kode tidak ditemukan" };
  if (rec.used) return { ok: false, msg: "Kode sudah dipakai" };
  if (Date.now() > Number(rec.expiresAt || 0)) return { ok: false, msg: "Kode expired" };
  const items = rec.items || [];
  if (!items.length) return { ok: false, msg: "Data VPS pada kode ini kosong" };
  return { ok: true, rec, items };
}

/**
 * Klaim garansi:
 * 1) password harus cocok dengan VPS yang dibeli
 * 2) cek TCP saja (IP + port) TANPA password
 * 3) jika masih hidup → TOLAK
 * 4) jika mati → berikan 1 VPS baru, kode hangus
 */
async function redeemGaransi(code, passwordInput) {
  const found = findGaransiRecord(code);
  if (!found.ok) return found;

  const { rec, items } = found;
  const pw = String(passwordInput || "").trim();
  if (!pw) return { ok: false, msg: "Password wajib diisi", needPassword: true };

  // Password harus cocok dengan salah satu unit yang dibeli
  const matchItem = items.find((it) => String(it.password || "") === pw);
  if (!matchItem) {
    return { ok: false, msg: "Password salah — tidak cocok dengan VPS pada kode ini" };
  }

  // Cek hidup/mati: TCP IP+port SAJA (tanpa SSH password)
  const host = matchItem.host;
  const port = matchItem.port;
  let tcpAlive = false;
  try {
    const r = await checkVpsAlive({ host, port });
    tcpAlive = !!(r && r.alive);
  } catch (_) {
    tcpAlive = false;
  }

  if (tcpAlive) {
    return {
      ok: false,
      msg: `VPS masih nyala (${host}:${port}). Garansi hanya untuk VPS yang sudah mati.`,
      stillAlive: true,
      host,
      port
    };
  }

  const db = readContainerVpsDB();
  const avail = (db.stock || []).filter((s) => s.status === "available");
  if (!avail.length) return { ok: false, msg: "Stok kosong, hubungi admin" };

  const vps = avail[0];
  vps.status = "sold";
  vps.soldAt = new Date().toISOString();
  vps.buyerId = rec.buyerId;
  vps.viaGaransi = rec.code;

  const soldRec = (db.sold || []).find((s) => String(s.code || "").toUpperCase() === String(rec.code || "").toUpperCase());
  if (soldRec) {
    soldRec.used = true;
    soldRec.redeemedAt = Date.now();
    soldRec.redeemedVps = { host: vps.host, port: vps.port };
    soldRec.deadHost = host;
    soldRec.deadPort = port;
  }

  saveContainerVpsDB(db);
  return {
    ok: true,
    vps: {
      host: vps.host,
      port: vps.port,
      password: vps.password,
      username: vps.username || "root"
    },
    dead: { host, port },
    rec: soldRec || rec
  };
}

/** Redeploy service Railway (ganti ROOT_PASSWORD baru) */
async function railwayRedeploy(token, meta) {
  if (!token || !meta?.serviceId || !meta?.environmentId || !meta?.projectId) {
    throw new Error("Data railway tidak lengkap untuk redeploy");
  }
  const pass = "Hz" + Math.random().toString(36).slice(2, 10) + "xY";
  await railwayGql(
    token,
    `mutation($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    {
      input: {
        projectId: meta.projectId,
        environmentId: meta.environmentId,
        serviceId: meta.serviceId,
        variables: { ROOT_PASSWORD: pass }
      }
    }
  );
  try {
    await railwayGql(
      token,
      `mutation($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      { serviceId: meta.serviceId, environmentId: meta.environmentId }
    );
  } catch (_) {
    await railwayGql(
      token,
      `mutation($serviceId: String!, $environmentId: String!) {
        serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      { serviceId: meta.serviceId, environmentId: meta.environmentId }
    );
  }
  await sleep(15000);
  const tcp = await waitForTcpProxy(token, meta.projectId, meta.serviceId, meta.environmentId, 12);
  let host = null, port = null;
  if (tcp?.domain && tcp?.proxyPort) {
    host = (await resolveHostToIp(tcp.domain)) || tcp.domain;
    port = tcp.proxyPort;
  }
  return {
    host: host || meta.host,
    port: port || meta.port,
    password: pass,
    username: "root",
    domain: tcp?.domain || null,
    projectId: meta.projectId,
    serviceId: meta.serviceId,
    environmentId: meta.environmentId,
    token
  };
}

async function autoHealRailway() {
  const db = readContainerVpsDB();
  let changed = 0;
  for (const s of db.stock || []) {
    if (s.status !== "available" || !s.token || !s.serviceId) continue;
    const alive = await checkStockLoginStatus(s);
    if (alive.ok) continue;
    try {
      const neu = await railwayRedeploy(s.token, s);
      Object.assign(s, neu, { status: "available", healedAt: new Date().toISOString() });
      changed++;
    } catch (e) {
      console.error("[AUTO HEAL]", s.host, e.message);
    }
    await sleep(3000);
  }
  if (changed) saveContainerVpsDB(db);
  return { healed: changed };
}


// ========== RAILWAY ==========
async function railwayGql(token, query, variables = {}) {
  const clean = String(token || "").replace(/^Bearer\s+/i, "").trim();
  if (!clean) throw new Error("Token Railway kosong");
  const res = await axios.post(
    RAILWAY_API,
    { query, variables },
    {
      headers: {
        Authorization: `Bearer ${clean}`,
        "Content-Type": "application/json"
      },
      timeout: 45000
    }
  );
  if (res.data.errors?.length) {
    throw new Error(res.data.errors.map((e) => e.message).join("; "));
  }
  return res.data.data;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveHostToIp(host) {
  if (!host) return null;
  // sudah IP?
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
  try {
    const r = await dns.lookup(host, { family: 4 });
    return r && r.address ? r.address : null;
  } catch {
    try {
      const r = await dns.resolve4(host);
      return r && r[0] ? r[0] : null;
    } catch {
      return null;
    }
  }
}



/** Query TCP proxies yang sudah terpasang di service */
async function fetchTcpProxies(token, serviceId, environmentId) {
  try {
    const data = await railwayGql(
      token,
      `query($serviceId: String!, $environmentId: String!) {
        tcpProxies(serviceId: $serviceId, environmentId: $environmentId) {
          id
          domain
          proxyPort
          applicationPort
        }
      }`,
      { serviceId, environmentId }
    );
    const list = data.tcpProxies || [];
    // prioritaskan yang applicationPort 22
    const ssh = list.find((t) => Number(t.applicationPort) === 22) || list[0];
    return ssh || null;
  } catch {
    return null;
  }
}

/** Baca variable RAILWAY_TCP_PROXY_* dari service (setelah deploy) */
async function fetchTcpFromVariables(token, projectId, environmentId, serviceId) {
  try {
    const data = await railwayGql(
      token,
      `query($projectId: String!, $environmentId: String!, $serviceId: String) {
        variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
      }`,
      { projectId, environmentId, serviceId }
    );
    const vars = data.variables || {};
    const domain = vars.RAILWAY_TCP_PROXY_DOMAIN || vars.RAILWAY_TCP_PROXY_DOMAIN_PUBLIC;
    const port = vars.RAILWAY_TCP_PROXY_PORT;
    if (domain && port) {
      return {
        domain: String(domain),
        proxyPort: parseInt(port, 10),
        applicationPort: 22,
        source: "variables"
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Poll sampai TCP domain + port muncul (max ~90 detik)
 */
async function waitForTcpProxy(token, projectId, serviceId, environmentId, maxAttempts = 18) {
  for (let i = 0; i < maxAttempts; i++) {
    // 1) dari list tcpProxies
    let tcp = await fetchTcpProxies(token, serviceId, environmentId);
    if (tcp?.domain && tcp?.proxyPort) {
      return { ...tcp, source: "tcpProxies" };
    }
    // 2) dari env variables
    tcp = await fetchTcpFromVariables(token, projectId, environmentId, serviceId);
    if (tcp?.domain && tcp?.proxyPort) return tcp;

    await sleep(5000);
  }
  return null;
}


/**
 * Deploy 1 Ubuntu SSH container + auto-detect TCP proxy
 * Default: parham7991/railway-ubuntu-ssh-claude (ROOT_PASSWORD + TCP proxy otomatis)
 * Login: root + password
 */

/** List project di workspace token */
async function railwayListProjects(token) {
  try {
    const data = await railwayGql(
      token,
      `query {
        projects {
          edges {
            node {
              id
              name
              workspaces { id name }
            }
          }
        }
      }`
    );
    return (data.projects?.edges || []).map((e) => e.node).filter(Boolean);
  } catch (e) {
    // fallback schema alternatif
    try {
      const data = await railwayGql(
        token,
        `query {
          me {
            workspaces {
              edges {
                node {
                  id
                  name
                  projects {
                    edges { node { id name } }
                  }
                }
              }
            }
          }
        }`
      );
      const out = [];
      for (const w of data.me?.workspaces?.edges || []) {
        for (const p of w.node?.projects?.edges || []) {
          if (p.node) out.push({ ...p.node, workspaceId: w.node.id, workspaceName: w.node.name });
        }
      }
      return out;
    } catch {
      return [];
    }
  }
}

/**
 * Ambil / buat project utama (main) di workspace token
 * Nama default: Hanz-Main-VPS
 */
async function railwayGetOrCreateMainProject(token, mainName = "Hanz-Main-VPS") {
  const list = await railwayListProjects(token);
  const found =
    list.find((p) => String(p.name || "").toLowerCase() === mainName.toLowerCase()) ||
    list.find((p) => /hanz.*main|main.*vps/i.test(String(p.name || ""))) ||
    null;

  if (found?.id) {
    return { projectId: found.id, projectName: found.name, created: false, fromList: true };
  }

  const proj = await railwayGql(
    token,
    `mutation($input: ProjectCreateInput!) {
      projectCreate(input: $input) { id name }
    }`,
    { input: { name: mainName } }
  );
  return {
    projectId: proj.projectCreate.id,
    projectName: proj.projectCreate.name || mainName,
    created: true,
    fromList: false
  };
}

async function railwayCreateUbuntuSsh(token, options = {}) {
  const {
    projectName = `Hanz-ContainerVPS-${Date.now().toString().slice(-6)}`,
    rootPassword,
    sshUsername = "root",
    sshPassword,
    anthropicToken = "",
    template = "claude" // claude = ubuntu ssh+claude (TCP auto)
  } = options;

  if (!token) throw new Error("Railway token wajib diisi");
  if (!rootPassword && !sshPassword) throw new Error("Password SSH wajib");

  const finalPass = rootPassword || sshPassword;
  const finalUser = String(sshUsername || "hanz").replace(/[^a-zA-Z0-9_-]/g, "") || "hanz";

  // mode: "main" = taruh di project utama (reuse)
  // mode: "new"  = selalu buat project baru (seperti workspace/project terpisah)
  const mode = options.mode === "main" ? "main" : "new";
  let projectId;
  let resolvedProjectName = projectName;

  if (options.projectId) {
    projectId = options.projectId;
    resolvedProjectName = options.projectName || projectName;
  } else if (mode === "main") {
    const main = await railwayGetOrCreateMainProject(
      token,
      options.mainProjectName || "Hanz-Main-VPS"
    );
    projectId = main.projectId;
    resolvedProjectName = main.projectName;
  } else {
    const proj = await railwayGql(
      token,
      `mutation($input: ProjectCreateInput!) {
        projectCreate(input: $input) { id name }
      }`,
      { input: { name: projectName } }
    );
    projectId = proj.projectCreate.id;
    resolvedProjectName = proj.projectCreate.name || projectName;
  }

  const envData = await railwayGql(
    token,
    `query($id: String!) {
      project(id: $id) {
        id
        environments { edges { node { id name } } }
      }
    }`,
    { id: projectId }
  );
  const environmentId = envData.project?.environments?.edges?.[0]?.node?.id || null;
  if (!environmentId) throw new Error("Gagal ambil environmentId project");

  const repo =
    template === "claude"
      ? "parham7991/railway-ubuntu-ssh-claude"
      : "georgebrnv/railway-ubuntu-sshd";

  const svc = await railwayGql(
    token,
    `mutation($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id name }
    }`,
    {
      input: {
        projectId,
        name: options.serviceName || `ubuntu-ssh-${Date.now().toString().slice(-5)}`,
        source: { repo }
      }
    }
  );
  const serviceId = svc.serviceCreate.id;

  // Variables sesuai template
  let vars;
  const motdText = buildVpsMotd();
  // Template Ubuntu SSH + Claude: hanya ROOT_PASSWORD, user = root
  // Tidak perlu GitHub token / Anthropic token
  vars = {
    ROOT_PASSWORD: finalPass
  };

  await railwayGql(
    token,
    `mutation($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    {
      input: {
        projectId,
        environmentId,
        serviceId,
        variables: vars
      }
    }
  );

  // TCP Proxy port 22
  let tcpImmediate = null;
  try {
    const tcpRes = await railwayGql(
      token,
      `mutation($input: TCPProxyCreateInput!) {
        tcpProxyCreate(input: $input) {
          id domain proxyPort applicationPort
        }
      }`,
      {
        input: {
          serviceId,
          environmentId,
          applicationPort: 22
        }
      }
    );
    tcpImmediate = tcpRes.tcpProxyCreate;
  } catch (e) {
    tcpImmediate = { error: e.message };
  }

  // Deploy
  try {
    await railwayGql(
      token,
      `mutation($serviceId: String!, $environmentId: String!) {
        serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      { serviceId, environmentId }
    );
  } catch (_) {}

  // Tunggu TCP domain
  let tcp = null;
  if (tcpImmediate?.domain && tcpImmediate?.proxyPort) {
    tcp = tcpImmediate;
  } else {
    tcp = await waitForTcpProxy(token, projectId, serviceId, environmentId, 20);
    if (!tcp && tcpImmediate?.error) tcp = { error: tcpImmediate.error };
  }

  const domain = tcp?.domain || null;
  const port = tcp?.proxyPort || null;

  // Resolve domain proxy → IP publik (bukan domain)
  let ip = null;
  if (domain) {
    ip = await resolveHostToIp(domain);
  }

  const hostForStock = ip || domain; // prioritaskan IP
  const ready = !!(hostForStock && port);

  // Tidak auto-edit banner saat deploy (lebih stabil)
  const loginUser = "root";

  return {
    projectId,
    serviceId,
    environmentId,
    projectName: resolvedProjectName,
    mode: mode || "new",
    password: finalPass,
    username: loginUser,
    token: token, // simpan untuk auto-redeploy
    domain, // proxy domain (referensi)
    ip, // hasil resolve
    host: hostForStock, // IP jika ada
    port,
    ready,
    tcp,
    stockLine: ready ? `${hostForStock}:${port}|${finalPass}` : null,
    connectHint: ready
      ? `ssh ${loginUser}@${hostForStock} -p ${port}`
      : "Buka Railway → Service → Settings → Networking → TCP Proxy (port 22)",
    dashboard: `https://railway.com/project/${projectId}`,
    template
  };
}

const PROJECT_CREATE_DELAY_MS = 50000;

async function railwayCreateTwo(token, options = {}) {
  // 1 token = 2 CONTAINER TERPISAH (2 project berbeda)
  // Template: Ubuntu SSH + Claude — hanya ROOT_PASSWORD, user root
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const pass1 =
    options.password1 ||
    options.rootPassword ||
    `Hanz${Math.random().toString(36).slice(2, 10)}`;
  const pass2 =
    options.password2 ||
    `Hanz${Math.random().toString(36).slice(2, 10)}`;

  if (onProgress) await onProgress("𒁍 VPS #1 — project baru...");
  const a = await railwayCreateUbuntuSsh(token, {
    ...options,
    mode: "new",
    template: "claude",
    projectName: `Hanz-VPS-A-${Date.now().toString().slice(-5)}`,
    serviceName: `vps-a-${Date.now().toString().slice(-4)}`,
    rootPassword: pass1,
    sshPassword: pass1,
    sshUsername: "root"
  });

  if (onProgress) {
    await onProgress(
      (a.ready
        ? `✅ VPS #1\nIp : <code>${a.ip || a.host}</code>\nPort : <code>${a.port}</code>\nPassword : <code>${a.password}</code>`
        : `⚠️ VPS #1 dibuat, TCP pending`) +
        `\n⏳ Jeda 50 detik → VPS #2...`
    );
  }
  await sleep(PROJECT_CREATE_DELAY_MS);

  if (onProgress) await onProgress("𒁍 VPS #2 — project baru (terpisah)...");
  const b = await railwayCreateUbuntuSsh(token, {
    ...options,
    mode: "new",
    template: "claude",
    projectName: `Hanz-VPS-B-${Date.now().toString().slice(-5)}`,
    serviceName: `vps-b-${Date.now().toString().slice(-4)}`,
    rootPassword: pass2,
    sshPassword: pass2,
    sshUsername: "root"
  });

  return {
    first: a,
    second: b,
    units: [a, b],
    passwords: [pass1, pass2],
    stockLines: [a.stockLine, b.stockLine].filter(Boolean),
    autoAdd: null,
    displayText: formatDeployResultList([a, b])
  };
}

async function railwayCreateMultiTokens(tokens, options = {}) {
  const list = (tokens || [])
    .map((t) => String(t || "").trim())
    .filter((t) => t.length >= 20);

  if (!list.length) throw new Error("Minimal 1 Railway token");

  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const onTokenDone = typeof options.onTokenDone === "function" ? options.onTokenDone : null;
  const passwordBase =
    options.passwordBase ||
    options.password1 ||
    `Hanz${Math.random().toString(36).slice(2, 8)}`;

  const allUnits = [];
  const errors = [];

  for (let ti = 0; ti < list.length; ti++) {
    const token = list[ti];
    const tokenLabel = `Token ${ti + 1}/${list.length}`;
    const tokenUnits = [];

    for (let vi = 0; vi < 2; vi++) {
      const unitNo = allUnits.length + 1;
      const pass = `${passwordBase}${unitNo}${Math.random().toString(36).slice(2, 5)}`;

      // Jeda antar project (rate limit Railway 1 project / 30 dtk)
      if (allUnits.length > 0 || tokenUnits.length > 0) {
        if (onProgress) {
          await onProgress(`⏳ ${tokenLabel} — jeda 50 detik sebelum VPS #${unitNo}...`);
        }
        await sleep(PROJECT_CREATE_DELAY_MS);
      }

      if (onProgress) await onProgress(`🚀 ${tokenLabel} — build VPS #${unitNo}...`);

      try {
        const unit = await railwayCreateUbuntuSsh(token, {
          ...options,
          mode: "new",
          template: "claude",
          projectName: `Hanz-VPS-T${ti + 1}U${vi + 1}-${Date.now().toString().slice(-5)}`,
          serviceName: `vps-t${ti + 1}-u${vi + 1}-${Date.now().toString().slice(-4)}`,
          rootPassword: pass,
          sshPassword: pass,
          sshUsername: "root"
        });
        unit.tokenIndex = ti + 1;
        unit.unitIndex = unitNo;
        // pastikan stockLine
        if (!unit.stockLine && (unit.ip || unit.host) && unit.port && unit.password) {
          unit.stockLine = `${unit.ip || unit.host}:${unit.port}|${unit.password}`;
        }
        tokenUnits.push(unit);
        allUnits.push(unit);

        if (onProgress) {
          await onProgress(
            unit.ready || unit.stockLine
              ? `✅ VPS #${unitNo} (Token ${ti + 1})\nIp : <code>${unit.ip || unit.host}</code>\nPort : <code>${unit.port}</code>\nPassword : <code>${unit.password}</code>`
              : `⚠️ VPS #${unitNo} dibuat, TCP/IP belum terdeteksi`
          );
        }
      } catch (err) {
        const msg = err.message || String(err);
        errors.push({ tokenIndex: ti + 1, unitNo, error: msg });
        if (onProgress) await onProgress(`❌ VPS #${unitNo} gagal: ${msg.slice(0, 140)}`);
        if (/too quickly|30 seconds|rate|restricted/i.test(msg)) {
          if (onProgress) await onProgress(`⏳ Rate limit — tunggu 50 detik...`);
          await sleep(PROJECT_CREATE_DELAY_MS);
        }
      }
    }

    // Setelah 2 VPS per token selesai → callback data token
    if (onTokenDone) {
      try {
        await onTokenDone({
          tokenIndex: ti + 1,
          totalTokens: list.length,
          units: tokenUnits,
          stockLines: tokenUnits.map((u) => u.stockLine).filter(Boolean)
        });
      } catch (_) {}
    }
  }

  const stockLines = allUnits.map((u) => u.stockLine).filter(Boolean);
  const addstockCmd = stockLines.length ? `/addstock ${stockLines.join(",")}` : "";

  return {
    units: allUnits,
    errors,
    stockLines,
    addstockCmd,
    tokenCount: list.length,
    target: list.length * 2,
    success: allUnits.length,
    displayText: formatDeployResultList(allUnits, errors, list.length),
    autoAdd: null
  };
}

function formatDeployResultList(units, errors = [], tokenCount = 0) {
  const block = (n, d) => {
    let t = `<b>━━━━━━━━ Unit ${n} ━━━━━━━━</b>\n`;
    if (d.tokenIndex) t += `<b>Token :</b> #${d.tokenIndex}\n`;
    if (d.ready) {
      t += `<b>Ip :</b> <code>${d.ip || d.host}</code>\n`;
      t += `<b>Port :</b> <code>${d.port}</code>\n`;
      t += `<b>Password :</b> <code>${d.password}</code>\n`;
      t += `<b>User :</b> <code>${d.username || "root"}</code>\n`;
      if (d.domain && d.ip) t += `<b>Domain proxy :</b> <code>${d.domain}</code> <i>(referensi)</i>\n`;
      t += `<b>SSH :</b>\n<code>ssh ${d.username || "root"}@${d.ip || d.host} -p ${d.port}</code>\n`;
      t += `<b>Add stock :</b>\n<code>/addstock ${d.ip || d.host}:${d.port}|${d.password}</code>\n`;
    } else {
      t += `<b>Status :</b> TCP/IP belum terdeteksi\n`;
      t += `<b>Password :</b> <code>${d.password}</code>\n`;
      t += `<b>User :</b> <code>${d.username || "root"}</code>\n`;
      t += `<b>Dashboard :</b> ${d.dashboard || "-"}\n`;
      t += `<i>${d.connectHint || ""}</i>\n`;
    }
    if (d.projectId) t += `<b>Project :</b> <code>${d.projectId}</code>\n`;
    return t;
  };

  let msg = `✅ <b>DEPLOY RAILWAY SELESAI</b>\n`;
  if (tokenCount) {
    msg += `Token: <b>${tokenCount}</b> · Target: <b>${tokenCount * 2}</b> · Sukses: <b>${units.length}</b>\n`;
  } else {
    msg += `Sukses: <b>${units.length}</b> unit\n`;
  }
  msg += `<i>Stok TIDAK auto-add. Copy /addstock manual.</i>\n\n`;

  units.forEach((u, i) => {
    msg += block(u.unitIndex || i + 1, u);
    msg += `\n`;
  });

  if (errors && errors.length) {
    msg += `<b>⚠️ Gagal (${errors.length}):</b>\n`;
    errors.forEach((e) => {
      msg += `· Token#${e.tokenIndex} unit#${e.unitNo}: ${String(e.error).slice(0, 80)}\n`;
    });
    msg += `\n`;
  }

  const lines = units.map((u) => u.stockLine).filter(Boolean);
  if (lines.length) {
    msg += `<b>📦 Copy untuk add stock:</b>\n<code>/addstock ${lines.join(",")}</code>\n`;
  }
  return msg;
}

function formatDeployResult(a, b) {
  return formatDeployResultList([a, b].filter(Boolean));
}



/** Hapus stok available yang sudah >= 15 hari tidak terjual */
function expireOldStock(days = 15) {
  const db = readContainerVpsDB();
  if (!Array.isArray(db.stock)) db.stock = [];
  const ms = days * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const removed = [];
  const keep = [];
  for (const s of db.stock) {
    if (s.status !== "available") {
      keep.push(s);
      continue;
    }
    const added = s.addedAt ? new Date(s.addedAt).getTime() : 0;
    if (added && now - added >= ms) {
      removed.push({ host: s.host, port: s.port, addedAt: s.addedAt });
    } else {
      keep.push(s);
    }
  }
  db.stock = keep;
  saveContainerVpsDB(db);
  return { removed: removed.length, items: removed, totalLeft: getStockCount() };
}

/**
 * Cek realtime semua stok available (TCP).
 * status: alive | dead
 */


module.exports = {
  CONTAINER_VPS_DB,
  readContainerVpsDB,
  saveContainerVpsDB,
  getAvailableStock,
  getStockCount,
  parseStockEntries,
  checkVpsAlive,
  purgeExpiredStock,
  checkStockLoginStatus,
  checkAllStockRealtime,
  checkAndAddStock,
  takeStock,
  markSold,
  findGaransiRecord,
  redeemGaransi,
  railwayRedeploy,
  autoHealRailway,
  railwayCreateUbuntuSsh,
  railwayListProjects,
  railwayGetOrCreateMainProject,
  customizeVpsBanner,
  buildVpsMotd,
  railwayCreateTwo,
  railwayCreateMultiTokens,
  formatDeployResult,
  formatDeployResultList,
  PROJECT_CREATE_DELAY_MS,
  tcpConnect,
  waitForTcpProxy,
  fetchTcpProxies
};
