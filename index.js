const { Telegraf, Markup, session } = require("telegraf");
const axios = require("axios");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const qs = require("querystring");
const FormData = require("form-data");
const archiver = require("archiver");
const readline = require("readline");
const QRCode = require("qrcode");
const { createCanvas, loadImage } = require("canvas");
const config = require("./config");
const { Run, startBot } = require("./run");
const { createdQris, cekStatus, toRupiah } = require("./lib/payment");
const {
  readContainerVpsDB,
  saveContainerVpsDB,
  getAvailableStock,
  getStockCount,
  checkAndAddStock,
  takeStock,
  markSold,
  findGaransiRecord,
  redeemGaransi,
  autoHealRailway,
  checkVpsAlive,
  purgeExpiredStock,
  checkAllStockRealtime,
  railwayCreateUbuntuSsh,
  railwayCreateTwo,
  railwayCreateMultiTokens,
  customizeVpsBanner
} = require("./lib/containerVps");
const tempmail = require("./lib/tempmail");

// ========== DATABASE GAMES ==========
const GAMES_DB = "./database/games.json";

function readGamesDB() {
  if (!fs.existsSync(GAMES_DB)) {
    fs.writeFileSync(GAMES_DB, JSON.stringify([], null, 2));
  }
  return JSON.parse(fs.readFileSync(GAMES_DB));
}

function saveGamesDB(data) {
  fs.writeFileSync(GAMES_DB, JSON.stringify(data, null, 2));
}
// ========== END DATABASE GAMES ==========

function isPrivateChat(ctx) {
  return ctx.chat.type === 'private';
}

async function notifyOwnerNewUser(user) {
  try {
    const username = user.username ? `@${user.username}` : "-"
    const name = `${user.first_name || ""} ${user.last_name || ""}`.trim()
    const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    
    const users = loadUsers()
    const totalUsers = users.length

    const text = `👤 <b>USER BARU TERDETEKSI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Nama :</b> ${name}\n` +
      `<b>Username :</b> ${username}\n` +
      `<b>ID :</b> <code>${user.id}</code>\n` +
      `<b>Waktu :</b> ${time}\n\n` +
      `📊 <b>Total User:</b> ${totalUsers}`

    await bot.telegram.sendMessage(config.ownerId, text, { parse_mode: "HTML" })
  } catch (e) {
    console.log(e)
  }
}

async function requirePrivateChat(ctx, actionName) {
  if (!isPrivateChat(ctx)) {
    await ctx.answerCbQuery("❌ Perintah ini hanya bisa digunakan di Private Chat!", { show_alert: true });
    
    try {
      await ctx.reply("🚫 𝗙𝗜𝗧𝗨𝗥 𝗧𝗜𝗗𝗔𝗞 𝗕𝗜𝗦𝗔 𝗗𝗜𝗚𝗨𝗡𝗔𝗞𝗔𝗡!\n━━━━━━━━━━━━━━━━━━━━❍\n🚀 𝗛𝗮𝗻𝘆𝗮 𝗕𝗶𝘀𝗮 𝗗𝗶𝗴𝘂𝗻𝗮𝗸𝗮𝗻 𝗗𝗶\n𝗣𝗿𝗶𝘃𝗮𝘁𝗲 𝗖𝗵𝗮𝘁 𝗕𝗼𝘁!:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌸 𝗖𝗵𝗮𝘁 𝗕𝗼𝘁 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", url: `https://t.me/${bot.botInfo.username}` }]
          ]
        }
      });
    } catch (e) {}
    
    return false;
  }
  return true;
}

async function generateQrisPremium(qrString, amount) {
  const canvas = createCanvas(1000, 1000);
  const ctx = canvas.getContext("2d");

  // ===== BACKGROUND =====
  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, 1000, 1000);

  // ===== HEX PATTERN =====
  ctx.strokeStyle = "#00eaff22";
  for (let x = 0; x < 1000; x += 40) {
    for (let y = 0; y < 1000; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ===== TEXT ATAS =====
  ctx.fillStyle = "#00eaff";
  ctx.font = "bold 28px Sans";
  ctx.textAlign = "center";
  ctx.fillText("SYSTEM READY FOR UPLINK", 500, 60);

  ctx.font = "bold 80px Sans";
  ctx.fillStyle = "#b6faff";
  ctx.fillText("ACCESS GRANTED", 500, 140);

  // ===== BOX QR (NEON) =====
  ctx.shadowColor = "#00eaff";
  ctx.shadowBlur = 60;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(200, 200, 600, 600);
  ctx.shadowBlur = 0;

  // ===== GARIS MERAH CYBER =====
  ctx.strokeStyle = "#ff003c";
  ctx.lineWidth = 4;

  // kiri atas
  ctx.beginPath();
  ctx.moveTo(180, 200);
  ctx.lineTo(200, 200);
  ctx.lineTo(200, 180);
  ctx.stroke();

  // kanan atas
  ctx.beginPath();
  ctx.moveTo(800, 180);
  ctx.lineTo(800, 200);
  ctx.lineTo(820, 200);
  ctx.stroke();

  // kiri bawah
  ctx.beginPath();
  ctx.moveTo(180, 800);
  ctx.lineTo(200, 800);
  ctx.lineTo(200, 820);
  ctx.stroke();

  // kanan bawah
  ctx.beginPath();
  ctx.moveTo(800, 820);
  ctx.lineTo(800, 800);
  ctx.lineTo(820, 800);
  ctx.stroke();

  // ===== LABEL ATAS =====
  ctx.fillStyle = "#ff2e63";
  ctx.font = "20px Sans";
  ctx.textAlign = "left";
  ctx.fillText("SECURE ENCRYPTION: AES-256", 220, 230);

  ctx.textAlign = "right";
  ctx.fillText("STATUS: PENDING", 780, 230);

  // ===== QR =====
  const qrBuffer = await QRCode.toBuffer(qrString, { width: 500 });
  const qrImage = await loadImage(qrBuffer);
  ctx.drawImage(qrImage, 250, 270, 500, 500);

  // ===== BUTTON =====
  ctx.fillStyle = "#ff004c";
  ctx.fillRect(350, 800, 300, 50);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Sans";
  ctx.textAlign = "center";
  ctx.fillText("QRIS PAKASIR", 500, 835);

  // ===== TOTAL =====
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px Sans";
  ctx.fillText(`Rp ${amount}`, 500, 900);

  // ===== BRAND =====
  ctx.fillStyle = "#00eaff";
  ctx.font = "bold 60px Sans";
  ctx.fillText("TOKO - HANZ", 500, 960);

  return canvas.toBuffer();
}

/**
 * Banner INFO STOK VPS NAT — gaya neon cyber (Toko VPS Hanz)
 */
async function generateContainerVpsStockImage(totalStock, added = 0, used = 0) {
  const W = 1200, H = 700;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, W, H);

  // Grid dots
  ctx.fillStyle = "#00eaff15";
  for (let x = 20; x < W; x += 28) {
    for (let y = 20; y < H; y += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer neon frame
  ctx.strokeStyle = "#00eaff";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#00eaff";
  ctx.shadowBlur = 20;
  roundRect(ctx, 24, 24, W - 48, H - 48, 18);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Top badge
  ctx.fillStyle = "#0a1628";
  ctx.strokeStyle = "#00eaff88";
  ctx.lineWidth = 2;
  roundRect(ctx, W / 2 - 220, 40, 440, 42, 21);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "bold 18px Sans";
  ctx.textAlign = "center";
  ctx.fillText("▣  INFO STOK VPS NAT — TOKO VPS HANZ", W / 2, 68);

  // Title
  ctx.shadowColor = "#00eaff";
  ctx.shadowBlur = 25;
  ctx.fillStyle = "#e0f7ff";
  ctx.font = "bold 64px Sans";
  ctx.fillText("INFO STOK VPS", W / 2, 150);
  ctx.shadowBlur = 0;

  // Main card
  const cardX = 80, cardY = 190, cardW = W - 160, cardH = 320;
  ctx.fillStyle = "#06101c";
  ctx.strokeStyle = "#00eaff99";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#00eaff55";
  ctx.shadowBlur = 15;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Status online badge
  ctx.fillStyle = "#052e16";
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX + cardW - 160, cardY + 24, 130, 36, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(cardX + cardW - 140, cardY + 42, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "bold 16px Sans";
  ctx.textAlign = "left";
  ctx.fillText("ONLINE", cardX + cardW - 128, cardY + 48);

  // Label
  ctx.fillStyle = "#67e8f9";
  ctx.font = "bold 28px Sans";
  ctx.textAlign = "left";
  ctx.fillText("●  VPS NAT", cardX + 40, cardY + 55);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "18px Sans";
  ctx.fillText("Spek lumayan · Full 1 bulan · OS Ubuntu · Murah", cardX + 40, cardY + 88);

  // Big number
  ctx.textAlign = "center";
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 30;
  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 140px Sans";
  ctx.fillText(String(totalStock), cardX + cardW / 2, cardY + 230);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "bold 28px Sans";
  ctx.fillText("unit VPS", cardX + cardW / 2, cardY + 275);

  // Status bar text
  const statusLabel = totalStock <= 0 ? "HABIS" : totalStock < 5 ? "STOK MENIPIS" : "GOOD STOCK";
  const statusColor = totalStock <= 0 ? "#ef4444" : totalStock < 5 ? "#f59e0b" : "#22c55e";
  ctx.fillStyle = statusColor;
  ctx.font = "bold 22px Sans";
  ctx.fillText(statusLabel, cardX + cardW / 2, cardY + 305);

  // Bottom pills
  const pills = ["⚡ FAST RESPON", "◆ TRUSTED", "⏱ 24 JAM"];
  const pillW = 200;
  const startX = (W - (pills.length * pillW + (pills.length - 1) * 20)) / 2;
  pills.forEach((p, i) => {
    const x = startX + i * (pillW + 20);
    ctx.fillStyle = "#0c1929";
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2;
    roundRect(ctx, x, 540, pillW, 44, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px Sans";
    ctx.textAlign = "center";
    ctx.fillText(p, x + pillW / 2, 568);
  });

  // Footer
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 26px Sans";
  ctx.textAlign = "center";
  ctx.fillText("Ayo Beli Sebelum Kehabisan!", W / 2, 620);

  const waktu = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  ctx.fillStyle = "#64748b";
  ctx.font = "16px Sans";
  ctx.fillText(`Toko VPS Hanz • Update ${waktu} WIB`, W / 2, 655);

  return canvas.toBuffer("image/png");
}


/** Banner INFO STOK VPS DIGITAL OCEAN */
async function generateDoVpsStockImage(sisaStock, usedApprox = 0) {
  const W = 1200, H = 700;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#0080ff15";
  for (let x = 20; x < W; x += 28) {
    for (let y = 20; y < H; y += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "#0080ff";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#0080ff";
  ctx.shadowBlur = 20;
  roundRect(ctx, 24, 24, W - 48, H - 48, 18);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#0a1628";
  ctx.strokeStyle = "#0080ff88";
  ctx.lineWidth = 2;
  roundRect(ctx, W / 2 - 240, 40, 480, 42, 21);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "bold 18px Sans";
  ctx.textAlign = "center";
  ctx.fillText("▣  INFO STOK VPS DIGITAL OCEAN — TOKO VPS HANZ", W / 2, 68);

  ctx.shadowColor = "#0080ff";
  ctx.shadowBlur = 25;
  ctx.fillStyle = "#e0f7ff";
  ctx.font = "bold 56px Sans";
  ctx.fillText("INFO STOK VPS DO", W / 2, 150);
  ctx.shadowBlur = 0;

  const cardX = 80, cardY = 190, cardW = W - 160, cardH = 320;
  ctx.fillStyle = "#06101c";
  ctx.strokeStyle = "#0080ff99";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#052e16";
  ctx.strokeStyle = "#22c55e";
  roundRect(ctx, cardX + cardW - 160, cardY + 24, 130, 36, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(cardX + cardW - 140, cardY + 42, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "bold 16px Sans";
  ctx.textAlign = "left";
  ctx.fillText("ONLINE", cardX + cardW - 128, cardY + 48);

  ctx.fillStyle = "#60a5fa";
  ctx.font = "bold 28px Sans";
  ctx.fillText("●  DIGITAL OCEAN VPS", cardX + 40, cardY + 55);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "18px Sans";
  ctx.fillText("Stok slot droplet · Auto create", cardX + 40, cardY + 88);

  ctx.textAlign = "center";
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 30;
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 140px Sans";
  ctx.fillText(String(sisaStock), cardX + cardW / 2, cardY + 230);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#93c5fd";
  ctx.font = "bold 28px Sans";
  ctx.fillText("slot tersedia", cardX + cardW / 2, cardY + 275);

  const statusLabel = sisaStock <= 0 ? "HABIS" : sisaStock < 3 ? "STOK MENIPIS" : "GOOD STOCK";
  const statusColor = sisaStock <= 0 ? "#ef4444" : sisaStock < 3 ? "#f59e0b" : "#22c55e";
  ctx.fillStyle = statusColor;
  ctx.font = "bold 22px Sans";
  ctx.fillText(statusLabel, cardX + cardW / 2, cardY + 305);

  const pills = ["⚡ FAST RESPON", "◆ TRUSTED", "⏱ 24 JAM"];
  const pillW = 200;
  const startX = (W - (pills.length * pillW + (pills.length - 1) * 20)) / 2;
  pills.forEach((p, i) => {
    const x = startX + i * (pillW + 20);
    ctx.fillStyle = "#0c1929";
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    roundRect(ctx, x, 540, pillW, 44, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#60a5fa";
    ctx.font = "bold 16px Sans";
    ctx.textAlign = "center";
    ctx.fillText(p, x + pillW / 2, 568);
  });

  ctx.fillStyle = "#facc15";
  ctx.font = "bold 26px Sans";
  ctx.fillText("Ayo Beli Sebelum Kehabisan!", W / 2, 620);
  const waktu = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  ctx.fillStyle = "#64748b";
  ctx.font = "16px Sans";
  ctx.fillText(`Toko VPS Hanz • Update ${waktu} WIB`, W / 2, 655);

  return canvas.toBuffer("image/png");
}


/** Banner 2 kolom: VPS NAT + VPS DIGITAL OCEAN */
async function generateDualStockImage(natSisa, doSisa) {
  const W = 1200, H = 720;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#00eaff12";
  for (let x = 16; x < W; x += 26) {
    for (let y = 16; y < H; y += 26) {
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "#00eaff";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#00eaff";
  ctx.shadowBlur = 18;
  roundRect(ctx, 20, 20, W - 40, H - 40, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // top badge
  ctx.fillStyle = "#0a1628";
  ctx.strokeStyle = "#00eaff88";
  ctx.lineWidth = 2;
  roundRect(ctx, W / 2 - 230, 36, 460, 40, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "bold 17px Sans";
  ctx.textAlign = "center";
  ctx.fillText("▣  INFO STOK VPS — TOKO VPS HANZ", W / 2, 62);

  ctx.shadowColor = "#00eaff";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#e0f7ff";
  ctx.font = "bold 52px Sans";
  ctx.fillText("INFO STOK VPS", W / 2, 130);
  ctx.shadowBlur = 0;

  function drawCard(x, y, w, h, title, color, num, sub, online) {
    ctx.fillStyle = "#06101c";
    ctx.strokeStyle = color + "cc";
    ctx.lineWidth = 2;
    ctx.shadowColor = color + "66";
    ctx.shadowBlur = 12;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // online badge
    const badgeColor = online ? "#22c55e" : "#ef4444";
    ctx.fillStyle = online ? "#052e16" : "#3f0a0a";
    ctx.strokeStyle = badgeColor;
    roundRect(ctx, x + w - 140, y + 18, 120, 32, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(x + w - 122, y + 34, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "bold 14px Sans";
    ctx.textAlign = "left";
    ctx.fillText(online ? "ONLINE" : "OFFLINE", x + w - 110, y + 39);

    ctx.fillStyle = color;
    ctx.font = "bold 22px Sans";
    ctx.fillText("●  " + title, x + 24, y + 42);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px Sans";
    ctx.fillText(sub, x + 24, y + 68);

    ctx.textAlign = "center";
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.fillStyle = color;
    ctx.font = "bold 110px Sans";
    ctx.fillText(String(num), x + w / 2, y + 200);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 22px Sans";
    ctx.fillText("unit / slot", x + w / 2, y + 240);

    const st = num <= 0 ? "HABIS" : num < 3 ? "STOK MENIPIS" : "GOOD STOCK";
    const sc = num <= 0 ? "#ef4444" : num < 3 ? "#f59e0b" : "#22c55e";
    ctx.fillStyle = sc;
    ctx.font = "bold 18px Sans";
    ctx.fillText(st, x + w / 2, y + 275);
  }

  const cardY = 160, cardH = 310, gap = 24;
  const cardW = (W - 80 - gap) / 2;
  drawCard(40, cardY, cardW, cardH, "VPS NAT", "#22d3ee", natSisa, "Spek lumayan · Full 1 bulan · Ubuntu", true);
  drawCard(40 + cardW + gap, cardY, cardW, cardH, "DIGITAL OCEAN", "#3b82f6", doSisa, "Droplet auto create · Garansi paket", true);

  const pills = ["⚡ FAST RESPON", "◆ TRUSTED", "⏱ 24 JAM"];
  const pillW = 200;
  const startX = (W - (pills.length * pillW + (pills.length - 1) * 16)) / 2;
  pills.forEach((p, i) => {
    const x = startX + i * (pillW + 16);
    ctx.fillStyle = "#0c1929";
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2;
    roundRect(ctx, x, 500, pillW, 40, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 15px Sans";
    ctx.textAlign = "center";
    ctx.fillText(p, x + pillW / 2, 526);
  });

  ctx.fillStyle = "#facc15";
  ctx.font = "bold 24px Sans";
  ctx.textAlign = "center";
  ctx.fillText("Ayo Beli Sebelum Kehabisan!", W / 2, 580);
  const waktu = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  ctx.fillStyle = "#64748b";
  ctx.font = "15px Sans";
  ctx.fillText(`Toko VPS Hanz • Update ${waktu} WIB`, W / 2, 615);

  return canvas.toBuffer("image/png");
}


/** Edit pesan bot (caption/media) — hindari spam pesan baru */
async function editOrSendPhoto(ctx, imgBuffer, caption, reply_markup) {
  const opts = { caption, parse_mode: "HTML" };
  if (reply_markup) opts.reply_markup = reply_markup;
  try {
    if (ctx.callbackQuery?.message?.photo) {
      await ctx.editMessageMedia(
        { type: "photo", media: { source: imgBuffer }, caption, parse_mode: "HTML" },
        reply_markup ? { reply_markup } : {}
      );
      return;
    }
    if (ctx.callbackQuery?.message) {
      try {
        await ctx.deleteMessage();
      } catch (_) {}
      await ctx.replyWithPhoto({ source: imgBuffer }, opts);
      return;
    }
    await ctx.replyWithPhoto({ source: imgBuffer }, opts);
  } catch (e) {
    try {
      await ctx.replyWithPhoto({ source: imgBuffer }, opts);
    } catch (e2) {
      await safeReply(ctx, caption, { parse_mode: "HTML", reply_markup });
    }
  }
}

async function editOrSendText(ctx, textHtml, reply_markup) {
  const opts = { parse_mode: "HTML" };
  if (reply_markup) opts.reply_markup = reply_markup;
  try {
    if (ctx.callbackQuery?.message?.photo) {
      await ctx.editMessageCaption(textHtml, opts);
      return;
    }
    if (ctx.callbackQuery?.message) {
      await ctx.editMessageText(textHtml, opts);
      return;
    }
    await safeReply(ctx, textHtml, opts);
  } catch {
    await safeReply(ctx, textHtml, opts);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}



const bot = new Telegraf(config.botToken);
bot.use(session());

const globalNokos = {
  cachedServices: [],
  cachedCountries: {},
  lastServicePhoto: {},
  activeOrders: {}
};

async function getDropletCount() {
  try {
    const apiDO = (typeof getDoApiKey === "function" ? getDoApiKey() : null) || config.ApiDO1 || "";
    if (!apiDO || apiDO === "-") return null;

    const res = await axios.get("https://api.digitalocean.com/v2/droplets?per_page=200", {
      headers: { Authorization: `Bearer ${apiDO}` },
      timeout: 20000
    });

    return res.data.droplets?.length || 0;
  } catch (e) {
    console.error("Error checking droplet count:", e.message);
    return null;
  }
}

/** Max slot DO per akun (default 10, bisa di do_settings.json) */
function getDoMaxSlots() {
  try {
    const f = path.join(process.cwd(), "database", "do_settings.json");
    if (fs.existsSync(f)) {
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      if (j.maxSlots && Number(j.maxSlots) > 0) return Number(j.maxSlots);
    }
  } catch (_) {}
  return 10;
}

function getBotOrderUsername() {
  return (
    (bot.botInfo && bot.botInfo.username) ||
    config.botUsername ||
    "Tokovpshanzx61bot"
  ).replace(/^@/, "");
}

function getOwnerUsername() {
  return String(config.ownerUsername || config.ownerUser || "lowhbabuw").replace(/^@/, "");
}

function formatWibNow() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) + " WIB";
}

/** Caption info stok gaya channel (DO + Nat) */
function buildStockInfoCaption(doSisa, natSisa) {
  const botUser = getBotOrderUsername();
  const ownerUser = getOwnerUsername();
  return (
    `<blockquote expandable><b>🖥 INFO STOK VPS TOKO VPS HANZ</b>
━━━━━━━━━━━━━━━━━━━━━━
🌊 <b>Digital Ocean</b>
└ Sisa : <b>${doSisa}</b> unit VPS

📦 <b>VPS Nat</b>
└ Sisa : <b>${natSisa}</b> unit VPS
━━━━━━━━━━━━━━━━━━━━━━
🔥 Ayo Beli Sebelum Kehabisan!!
⚡ Fast Respon · Auto Order · 24 Jam
💎 Terpercaya & Premium Quality

🕐 ${formatWibNow()}
🛒 Order : @${botUser}
👤 Owner : @${ownerUser}
</blockquote>`
  );
}

function stockInfoOrderKeyboard() {
  const botUser = getBotOrderUsername();
  return {
    inline_keyboard: [
      [
        { text: "🌊 Order VPS DO", url: `https://t.me/${botUser}?start=order`, style: "primary" },
        { text: "📦 Order VPS Nat", url: `https://t.me/${botUser}?start=order`, style: "success" }
      ]
    ]
  };
}



/** ========== VPS DO TIERS (replace semua 1x) ========== */
const DO_TIERS = {
  // Akun DO 50k / 10 slot = modal 5rb/slot
  sublow:   { label: "SUBLOW",   garansi: 5,  garansiUnit: "jam",  replace: 1, color: "#64748b", emoji: "⬜", hargaMulai: 5000 },
  low:      { label: "LOW",      garansi: 1,  garansiUnit: "hari", replace: 1, color: "#22c55e", emoji: "🟢", hargaMulai: 8000 },
  standart: { label: "STANDART", garansi: 5,  garansiUnit: "hari", replace: 1, color: "#3b82f6", emoji: "🔵", hargaMulai: 12000 },
  medium:   { label: "MEDIUM",   garansi: 7,  garansiUnit: "hari", replace: 1, color: "#eab308", emoji: "🟡", hargaMulai: 15000 },
  high:     { label: "HIGH",     garansi: 12, garansiUnit: "hari", replace: 1, color: "#ef4444", emoji: "🔴", hargaMulai: 20000 },
  ultra:    { label: "ULTRA",    garansi: 15, garansiUnit: "hari", replace: 1, color: "#a855f7", emoji: "💎", hargaMulai: 25000 }
};

function getDoTier(paket) {
  const k = String(paket || "low").toLowerCase();
  return DO_TIERS[k] || DO_TIERS.low;
}

function getDoHarga(paket, plan) {
  const fromCfg = config.hargaVPS?.[paket]?.[plan];
  if (fromCfg && Number(fromCfg) > 0) return Number(fromCfg);
  // fallback murah tapi tetap margin
  const base = getDoTier(paket).hargaMulai;
  const planMul = { "2c2": 1, "4c2": 1.6, "8c4": 2.4 };
  return Math.round(base * (planMul[plan] || 1));
}

function getDoApiKey() {
  try {
    const f = path.join(process.cwd(), "database", "do_settings.json");
    if (fs.existsSync(f)) {
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      if (j.apiKey && String(j.apiKey).trim().length > 10) return String(j.apiKey).trim();
    }
  } catch (_) {}
  return config.ApiDO1 || config.ApiDO || "";
}

function setDoApiKey(key) {
  const dir = path.join(process.cwd(), "database");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, "do_settings.json");
  let j = {};
  try { if (fs.existsSync(f)) j = JSON.parse(fs.readFileSync(f, "utf8")); } catch (_) {}
  j.apiKey = String(key || "").trim();
  j.updatedAt = new Date().toISOString();
  fs.writeFileSync(f, JSON.stringify(j, null, 2));
  return true;
}

async function generateDoCatalogImage() {
  const W = 900, H = 1100;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  // bg
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#020617");
  g.addColorStop(1, "#0f172a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 22px Sans";
  ctx.textAlign = "center";
  ctx.fillText("PILIH TYPE VPS YANG TERSEDIA", W / 2, 42);

  const tiers = Object.entries(DO_TIERS);
  const cardH = 150;
  const gap = 12;
  let y = 60;
  for (const [key, tier] of tiers) {
    // card
    ctx.fillStyle = "#0b1220";
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 2;
    roundRect(ctx, 40, y, W - 80, cardH, 14);
    ctx.fill();
    ctx.stroke();
    // accent bar left
    ctx.fillStyle = tier.color + "33";
    ctx.fillRect(40, y, 8, cardH);

    ctx.textAlign = "left";
    ctx.fillStyle = tier.color;
    ctx.font = "bold 26px Sans";
    ctx.fillText(`${tier.emoji}  VPS ${tier.label}`, 70, y + 38);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px Sans";
    const gUnit = tier.garansiUnit === "jam" ? "Jam" : "Hari";
    ctx.fillText(`├─ Garansi Do Sus : ${tier.garansi} ${gUnit}`, 70, y + 72);
    ctx.fillText(`├─ Replace : 1x`, 70, y + 98);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 18px Sans";
    ctx.fillText(`└─ Harga Mulai Dari : Rp ${Number(tier.hargaMulai).toLocaleString("id-ID")}`, 70, y + 128);

    y += cardH + gap;
  }
  return canvas.toBuffer("image/png");
}

async function broadcastDoStockSafe(extraCaption = "") {
  const ch =
    (typeof TESTIMONI_CHANNEL !== "undefined" && TESTIMONI_CHANNEL) ||
    config.testimoniChannel ||
    (config.channelName ? `@${String(config.channelName).replace(/^@/, "")}` : "");
  if (!ch) return { ok: false, error: "channel kosong" };

  let doSisa = 0;
  let dropletCount = null;
  try {
    dropletCount = await getDropletCount();
    if (dropletCount !== null) doSisa = Math.max(0, getDoMaxSlots() - dropletCount);
  } catch (_) {}

  let natSisa = 0;
  try { natSisa = getStockCount(); } catch (_) {}

  let caption = buildStockInfoCaption(doSisa, natSisa);
  if (extraCaption) caption = String(extraCaption) + "\n\n" + caption;

  try {
    let img;
    try {
      img = await generateDualStockImage(natSisa, doSisa);
    } catch {
      img = await generateDoCatalogImage();
    }
    await bot.telegram.sendPhoto(ch, { source: img }, {
      caption,
      parse_mode: "HTML",
      reply_markup: stockInfoOrderKeyboard()
    });
    return { ok: true, doSisa, natSisa, dropletCount };
  } catch (e) {
    console.error("[DO BROADCAST]", e.message);
    try {
      await bot.telegram.sendMessage(ch, caption, {
        parse_mode: "HTML",
        reply_markup: stockInfoOrderKeyboard()
      });
      return { ok: true, fallback: true, doSisa, natSisa };
    } catch (e2) {
      return { ok: false, error: e2.message };
    }
  }
}


async function createVPSDroplet(userId, vpsData) {
  try {
    const apiDO = getDoApiKey();
    if (!apiDO) {
      return { success: false, msg: "API KEY DigitalOcean tidak ditemukan! Set di Owner Menu." };
    }

    const sizeMap = {
      "2c2": "s-2vcpu-2gb",
      "4c2": "s-2vcpu-4gb",
      "8c4": "s-4vcpu-8gb"
    };

    const size = sizeMap[vpsData.plan] || sizeMap["2c2"];
    const hostname = `HanzHost`;
    const password = `${config.CostumPassVps || "Hanz"}` + Math.random().toString(36).slice(-10);

    const payload = {
      name: hostname,
      region: vpsData.region || "sgp1",
      size: size,
      image: vpsData.os,
      ipv6: true,
      backups: false,
      tags: ["order-BuyVPS"],
      user_data: `#cloud-config
password: ${password}
chpasswd: { expire: False }`
    };

    console.log("Creating VPS with payload:", JSON.stringify(payload, null, 2));

    const resp = await axios.post("https://api.digitalocean.com/v2/droplets", payload, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiDO}`
      },
      timeout: 30000
    });

    if (resp.status !== 202) {
      return { success: false, msg: "Gagal membuat VPS: " + JSON.stringify(resp.data) };
    }

    const dropletId = resp.data.droplet.id;
    console.log(`VPS Created - ID: ${dropletId}, Hostname: ${hostname}`);

    // Poll sampai IP benar-benar ada di DO (max ~3.5 menit)
    let ip = null;
    const maxTries = 21; // 21 * 10s = 210s
    for (let i = 0; i < maxTries; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      try {
        const cek = await axios.get(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
          headers: { Authorization: `Bearer ${apiDO}` },
          timeout: 15000
        });
        const nets = cek.data?.droplet?.networks?.v4 || [];
        const pub = nets.find((n) => n.type === "public") || nets[0];
        if (pub?.ip_address) {
          ip = pub.ip_address;
          console.log(`VPS IP ready (try ${i + 1}): ${ip}`);
          break;
        }
        console.log(`VPS IP belum ada (try ${i + 1}/${maxTries})`);
      } catch (e) {
        console.error("Poll droplet:", e.message);
      }
    }

    if (!ip) {
      return {
        success: false,
        msg: `Droplet #${dropletId} dibuat tapi IP belum muncul setelah menunggu. Cek dashboard DO.`
      };
    }

    console.log(`VPS IP: ${ip}`);

    const vpsFolder = "./database";
    const vpsPath = `${vpsFolder}/data_vps.json`;

    if (!fs.existsSync(vpsFolder)) {
      fs.mkdirSync(vpsFolder, { recursive: true });
    }

    if (!fs.existsSync(vpsPath)) {
      fs.writeFileSync(vpsPath, JSON.stringify([], null, 2));
    }

    let vpsDB = [];
    try {
      vpsDB = JSON.parse(fs.readFileSync(vpsPath));
      if (!Array.isArray(vpsDB)) vpsDB = [];
    } catch (err) {
      vpsDB = [];
    }

    const created = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const paketInfo = {
      sublow: { garansi: 5, garansiUnit: "jam", replace: 1 },
      low: { garansi: 1, garansiUnit: "hari", replace: 1 },
      standart: { garansi: 5, garansiUnit: "hari", replace: 1 },
      medium: { garansi: 7, garansiUnit: "hari", replace: 1 },
      high: { garansi: 12, garansiUnit: "hari", replace: 1 },
      ultra: { garansi: 15, garansiUnit: "hari", replace: 1 }
    };

    const newVpsData = {
      userId: userId,
      username: vpsData.username || "-",
      hostname: hostname,
      ip: ip,
      password: password,
      region: vpsData.region,
      osFamily: vpsData.osFamily,
      os: vpsData.os,
      paket: vpsData.paket,
      plan: vpsData.plan,
      garansi: paketInfo[vpsData.paket]?.garansi || 7,
      replace: paketInfo[vpsData.paket]?.replace || 1,
      harga: vpsData.harga,
      dropletId: dropletId,
      created: created,
      penjual: bot.botInfo.username
    };

    vpsDB.push(newVpsData);
    fs.writeFileSync(vpsPath, JSON.stringify(vpsDB, null, 2));

    return {
      success: true,
      data: {
        hostname,
        ip,
        password,
        dropletId: dropletId,
        region: vpsData.region,
        os: vpsData.os,
        plan: vpsData.plan,
        garansi: paketInfo[vpsData.paket]?.garansi || 7,
        replace: paketInfo[vpsData.paket]?.replace || 1,
        created
      }
    };

  } catch (error) {
    console.error("Error creating VPS:", error);
    return { 
      success: false, 
      msg: error.response?.data?.message || error.message || "Unknown error" 
    };
  }
}

async function atlanticTransfer(nominal, config, note = "Withdraw Saldo Bot") {
  try {
    const reffId = `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const body = {
      api_key: config.apiAtlantic,
      ref_id: reffId,
      kode_bank: config.wd_balance.bank_code,
      nomor_akun: config.wd_balance.destination_number,
      nama_pemilik: config.wd_balance.destination_name,
      nominal: Number(nominal),
      email: "reggaardiansyah28@gmail.com",
      phone: config.wd_balance.destination_number,
      note: note
    };

    const response = await axios.post("https://atlantich2h.com/transfer/create", qs.stringify(body), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000
    });

    return response.data;
  } catch (error) {
    throw new Error(`Gagal membuat transfer: ${error.message}`);
  }
}

async function atlanticTransferStatus(transferId, api_key) {
  const body = { api_key, id: String(transferId) };
  const response = await axios.post("https://atlantich2h.com/transfer/status", qs.stringify(body), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  return response.data;
}

async function editMenuMessage(ctx, text, keyboard) {
  try {
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      ...keyboard
    });
  } catch (e) {
    try {
      const newMsg = await safeReply(ctx, text, {
        parse_mode: "HTML",
        ...keyboard
      });
      
      try {
        if (ctx.callbackQuery) {
          await ctx.deleteMessage();
        }
      } catch (err) {}
      
      return newMsg;
    } catch (replyErr) {
      console.error("Edit menu error:", replyErr);
      return null;
    }
  }
}

async function editMenuMessageWithPhoto(ctx, photo, caption, keyboard) {
  try {
    await ctx.editMessageMedia({
      type: 'photo',
      media: photo,
      caption: caption,
      parse_mode: 'HTML'
    }, {
      parse_mode: "HTML",
      ...keyboard
    });
  } catch (e) {
    try {
      try {
        if (ctx.callbackQuery) {
          await ctx.deleteMessage();
        }
      } catch (err) {}
      
      await ctx.replyWithPhoto(photo, {
        caption: caption,
        parse_mode: "HTML",
        ...keyboard
      });
    } catch (replyErr) {
      console.error("Edit menu with photo error:", replyErr);
      return null;
    }
  }
}

async function safeSend(method, chatId, ...args) {
  try {
    return await bot.telegram[method](chatId, ...args);
  } catch (err) {
    const m = err?.response?.description || err?.description || err?.message || String(err);
    if (typeof m === 'string' && (m.toLowerCase().includes('user is deactivated') || m.toLowerCase().includes('bot was blocked') || m.toLowerCase().includes('blocked'))) {
      return null;
    }
    throw err;
  }
}

async function safeReply(ctx, text, extra = {}) {
  try {
    return await ctx.reply(text, extra);
  } catch (err) {
    const m = err?.response?.description || err?.description || err?.message || String(err);
    if (typeof m === 'string' && (m.toLowerCase().includes('user is deactivated') || m.toLowerCase().includes('bot was blocked') || m.toLowerCase().includes('blocked'))) {
      return null;
    }
    throw err;
  }
}

const USERS_DB = "./users.json";
const DB_PATH = "./database.json";
const MANUAL_PAYMENTS_DB = "./manual_payments.json";
const activeTransactions = {};
const userState = {};
const liveChatState = {};
const ownerReplyState = {};
const SMM_HISTORY_DB = "./database/smm_history.json";

function getSmmHistory(userId) {
  if (!fs.existsSync(SMM_HISTORY_DB)) fs.writeFileSync(SMM_HISTORY_DB, JSON.stringify({}));
  const db = JSON.parse(fs.readFileSync(SMM_HISTORY_DB));
  return db[userId] || [];
}

function saveSmmHistory(userId, orderData) {
  const db = JSON.parse(fs.readFileSync(SMM_HISTORY_DB));
  if (!db[userId]) db[userId] = [];
  db[userId].unshift(orderData); 
  fs.writeFileSync(SMM_HISTORY_DB, JSON.stringify(db, null, 2));
}

async function callSmmApi(path, params = {}) {
  try {
    const requestBody = {
        api_id: config.smm.apiId,
        api_key: config.smm.apiKey,
        ...params
    };

    const response = await axios.post(`${config.smm.baseUrl}${path}`, requestBody, {
        headers: { 'Content-Type': 'application/json' }
    });
    
    return response.data;
  } catch (e) {
    console.error("SMM API Error:", e.message);
    return { status: false, msg: "Gagal connect ke server SMM" };
  }
}

let botStartTime = Date.now();

const TESTIMONI_CHANNEL = config.testimoniChannel || "";

/** Channel wajib join (testimoni) */
function getForceJoinChatId() {
  if (TESTIMONI_CHANNEL) return TESTIMONI_CHANNEL;
  if (config.channelName) return `@${String(config.channelName).replace(/^@/, "")}`;
  return null;
}

function getForceJoinLink() {
  const name = config.channelName || "";
  if (name) return `https://t.me/${String(name).replace(/^@/, "")}`;
  if (TESTIMONI_CHANNEL && String(TESTIMONI_CHANNEL).startsWith("@")) {
    return `https://t.me/${String(TESTIMONI_CHANNEL).replace(/^@/, "")}`;
  }
  return null;
}

async function isUserJoinedTesti(userId) {
  if (userId === config.ownerId) return true;
  const chatId = getForceJoinChatId();
  if (!chatId) return true; // tidak dikonfigurasi → skip
  try {
    const member = await bot.telegram.getChatMember(chatId, userId);
    return ["creator", "administrator", "member", "restricted"].includes(member.status);
  } catch (e) {
    console.error("[FORCE JOIN CHECK]", e.message);
    // jika bot bukan admin channel, jangan kunci total user owner-only path
    return false;
  }
}

async function sendForceJoinMessage(ctx) {
  const link = getForceJoinLink() || "https://t.me/";
  const text =
    `<blockquote><b>🔒 WAJIB JOIN CHANNEL</b>
━━━━━━━━━━━━━━━━━━━━━━
Untuk memakai bot, kamu harus join
channel testimoni dulu.

Setelah join, tekan tombol
✅ <b>Saya Sudah Join</b>
</blockquote>`;
  const kb = {
    inline_keyboard: [
      [{ text: "📢 Join Channel Testimoni", url: link, style: "primary" }],
      [{ text: "✅ Saya Sudah Join", callback_data: "check_join_testi", style: "success" }]
    ]
  };
  try {
    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
      } catch {
        await safeReply(ctx, text, { parse_mode: "HTML", reply_markup: kb });
      }
    } else {
      await safeReply(ctx, text, { parse_mode: "HTML", reply_markup: kb });
    }
  } catch {
    await safeReply(ctx, text, { parse_mode: "HTML", reply_markup: kb });
  }
}

async function requireJoinTesti(ctx) {
  const uid = ctx.from?.id;
  if (!uid) return false;
  if (uid === config.ownerId) return true;
  const ok = await isUserJoinedTesti(uid);
  if (!ok) {
    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery("⚠️ Join channel testimoni dulu!", { show_alert: true });
      } catch (_) {}
    }
    await sendForceJoinMessage(ctx);
    return false;
  }
  return true;
}



async function createAndSendFullBackup(ctx = null, isAuto = false) {
  const timestamp = new Date().toLocaleString("id-ID", { 
    timeZone: "Asia/Jakarta" 
  }).replace(/[\/:]/g, '-').replace(/, /g, '_');
  
  const backupName = `${config.botName || 'Bot'}_${timestamp}.zip`;
  const backupPath = path.join(__dirname, backupName);
  const output = fs.createWriteStream(backupPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  console.log(`[BACKUP] Memulai proses zip full SC...`);

  return new Promise((resolve, reject) => {
    output.on('close', async () => {
      console.log(`[BACKUP] Selesai. Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
      
      try {
        const caption = isAuto 
          ? `♻️ <b>AUTO BACKUP SC</b>\n📅 ${timestamp}`
          : `📦 <b>BACKUP SOURCE CODE</b>\n📅 ${timestamp}`;

        await bot.telegram.sendDocument(config.ownerId, {
          source: backupPath,
          filename: backupName
        }, { caption: caption, parse_mode: "HTML" });

        fs.unlinkSync(backupPath);
        if (ctx) await ctx.reply("✅ <b>Backup SC Terkirim ke Owner!</b>", { parse_mode: "HTML" });
        resolve(true);
      } catch (err) {
        console.error("[BACKUP FAIL]", err);
        if (ctx) await ctx.reply("❌ Gagal kirim backup.");
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        reject(err);
      }
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    archive.glob('**/*', {
      cwd: __dirname,
      ignore: [
        'node_modules/**',
        '.git/**',
        'session.json',
        '*.zip',
        'backups/**'
      ]
    });

    archive.finalize();
  });
}

async function generateLocalQr(qrString) {
  try {
    return await QRCode.toBuffer(qrString, {
      type: 'png',
      width: 800,           // diperbesar dari 400 → 800px agar modul QR cukup besar untuk di-scan
      margin: 4,            // quiet zone lebih lebar sesuai standar QRIS
      errorCorrectionLevel: 'M',  // standar QRIS gunakan ECL Medium
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error("QR Generate Error:", err);
    return null;
  }
}

function createReceipt(input = {}) {
  const sanitize = v => String(v ?? "").replace(/[<>]/g, "").trim()
  const rupiah = n => "Rp " + Number(n).toLocaleString("id-ID")

  const dashed = (ctx, x1, x2, y) => {
    ctx.save()
    ctx.setLineDash([6, 8])
    ctx.lineWidth = 2
    ctx.strokeStyle = "#bdbdbd"
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y)
    ctx.stroke()
    ctx.restore()
  }

  const wrap = (ctx, text, maxWidth) => {
    const words = String(text || "").split(/\s+/)
    const lines = []
    let line = ""
    for (const w of words) {
      const t = line ? line + " " + w : w
      if (ctx.measureText(t).width <= maxWidth) line = t
      else { if (line) lines.push(line); line = w }
    }
    if (line) lines.push(line)
    return lines
  }

  const drawBarcode = (ctx, x, y, w, h) => {
    ctx.fillStyle = "#fff"
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = "#111"
    const bars = 120
    const gap = w / bars
    for (let i = 0; i < bars; i++) {
      const tall = (i % 9 === 0 || i % 13 === 0) ? 0.92 : 0.62
      const bw = (i % 5 === 0) ? 3 : 2
      const bh = h * tall
      ctx.fillRect(x + i * gap, y + (h - bh) / 2, bw, bh)
    }
  }

  const now = new Date()
  const tanggal = sanitize(input.tanggal || now.toLocaleDateString("id-ID"))
  const jam = sanitize(input.jam || now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))

  const nominal = Number(input.nominal || 0)
  const fee = Number(input.fee ?? 0)
  const total = nominal + fee

  const data = {
    trx: sanitize(input.trx || ("TRX-" + Date.now().toString().slice(-8))),
    status: sanitize(input.status || "BERHASIL"),
    metode: sanitize(input.metode || "QRIS (Pakasir)"),
    username: sanitize(input.username || "User"),
    userId: sanitize(input.userId || "-"),
    item: sanitize(input.item || "-"),
    productLabel: sanitize(input.productLabel || ""),
    nominal, fee, total, tanggal, jam
  }

  // details: array of { label, value }
  const details = Array.isArray(input.details) ? input.details.map(d => ({
    label: sanitize(d.label),
    value: sanitize(d.value)
  })) : []

  // Hitung tinggi tambahan dari section detail produk
  const detailSectionH = details.length > 0 ? (60 + 42 + details.length * 36 + 20) : 0
  const W = 980, H = 1300 + detailSectionH
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#f2f2f2"
  ctx.fillRect(0, 0, W, H)

  const cardX = 60, cardY = 50, cardW = W - 120, cardH = H - 100, r = 26
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.moveTo(cardX + r, cardY)
  ctx.lineTo(cardX + cardW - r, cardY)
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r)
  ctx.lineTo(cardX + cardW, cardY + cardH - r)
  ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH)
  ctx.lineTo(cardX + r, cardY + cardH)
  ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r)
  ctx.lineTo(cardX, cardY + r)
  ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY)
  ctx.closePath()
  ctx.fill()

  const pad = 54
  const L = cardX + pad, R = cardX + cardW - pad
  const colLabel = L, colMid = L + 250, colRight = R
  let y = cardY + 70

  ctx.textAlign = "center"
  ctx.fillStyle = "#111"
  ctx.font = "bold 52px serif"
  ctx.fillText("TOKO HANZ 🛍️", cardX + cardW / 2, y)
  y += 46

  ctx.font = "700 20px monospace"
  ctx.fillStyle = "#222"
  ctx.fillText("STRUK TRANSAKSI" + (data.productLabel ? " " + data.productLabel.toUpperCase() : ""), cardX + cardW / 2, y)
  y += 34

  dashed(ctx, L, R, y); y += 52

  ctx.font = "700 18px monospace"
  ctx.fillStyle = "#111"

  const kv = (label, value) => {
    ctx.textAlign = "left";  ctx.fillText(label, colLabel, y)
    ctx.textAlign = "right"; ctx.fillText(value, colRight, y)
    y += 34
  }

  kv("NO TRX", data.trx)
  kv("STATUS", data.status)
  kv("TANGGAL", data.tanggal)
  kv("JAM", data.jam)

  y += 10; dashed(ctx, L, R, y); y += 50

  ctx.textAlign = "left"
  ctx.font = "bold 20px monospace"
  ctx.fillStyle = "#111"
  ctx.fillText("INFORMASI PEMBELI", colLabel, y)
  y += 42

  ctx.font = "700 18px monospace"
  ctx.textAlign = "left"
  ctx.fillText("• Username", colLabel, y)
  ctx.fillText(data.username, colMid, y)
  y += 36

  ctx.fillText("• User ID", colLabel, y)
  ctx.fillText(data.userId, colMid, y)
  y += 42

  y += 6; dashed(ctx, L, R, y); y += 50

  ctx.font = "bold 20px monospace"
  ctx.fillText("ITEM", colLabel, y)
  y += 42

  ctx.font = "700 18px monospace"
  ctx.fillText("• Nama", colLabel, y)
  const iLines = wrap(ctx, data.item, (colRight - colMid) - 10)
  ctx.fillText(iLines[0] || "-", colMid, y)
  y += 36
  if (iLines[1]) { ctx.fillText(iLines[1], colMid, y); y += 36 }

  y += 10; dashed(ctx, L, R, y); y += 50

  // ========== DETAIL PRODUK ==========
  if (details.length > 0) {
    ctx.textAlign = "left"
    ctx.font = "bold 20px monospace"
    ctx.fillStyle = "#111"
    ctx.fillText("DETAIL PRODUK", colLabel, y)
    y += 42

    ctx.font = "700 18px monospace"
    for (const d of details) {
      ctx.textAlign = "left"
      ctx.fillText("• " + d.label, colLabel, y)
      ctx.fillText(d.value, colMid, y)
      y += 36
    }

    y += 20; dashed(ctx, L, R, y); y += 50
  }
  // ========== END DETAIL PRODUK ==========

  ctx.font = "bold 20px monospace"
  ctx.fillText("INFORMASI TRANSAKSI", colLabel, y)
  y += 42

  ctx.font = "700 18px monospace"

  const moneyRow = (left, amt) => {
    ctx.textAlign = "left";  ctx.fillText("• " + left, colLabel, y)
    ctx.fillText(amt, colMid, y)
    ctx.textAlign = "right"; ctx.fillText(amt, colRight, y)
    y += 36
  }

  moneyRow("Nominal", rupiah(data.nominal))
  if (data.fee > 0) moneyRow("Biaya Admin", rupiah(data.fee))
  moneyRow("Total Bayar", rupiah(data.total))

  y += 10; dashed(ctx, L, R, y); y += 46

  ctx.font = "700 18px monospace"
  ctx.textAlign = "left"
  ctx.fillText("Metode", colLabel, y)
  ctx.fillText(data.metode, colMid, y)
  ctx.textAlign = "right"; ctx.fillText(data.trx, colRight, y)
  y += 36

  ctx.textAlign = "left"
  ctx.fillText("Status", colLabel, y)
  ctx.fillText(data.status, colMid, y)
  y += 36

  y += 14; dashed(ctx, L, R, y); y += 56

  const barX = L + 10, barW = (R - L) - 20, barH = 120
  drawBarcode(ctx, barX, y, barW, barH)
  y += barH + 60

  ctx.textAlign = "center"
  ctx.fillStyle = "#111"
  ctx.font = "700 22px monospace"
  ctx.fillText("Terima kasih sudah melakukan order - @lowhbabuw", cardX + cardW / 2, y)
  y += 36
  ctx.fillStyle = "#555"
  ctx.font = "600 18px monospace"
  ctx.fillText("Simpan struk ini sebagai bukti transaksi.", cardX + cardW / 2, y)

  return canvas.toBuffer("image/png")
}

function buildProductLabel(productData) {
  if (!productData) return ""
  const labels = {
    script: "Script",
    app: "Aplikasi",
    game: "Game",
    panel_legal: "Panel Legal",
    panel: "Panel",
    admin_panel: "Admin Panel",
    ubot_prem: "Ubot Premium",
    reseller_panel_legal: "Reseller Panel Legal",
    reseller_vps: "Reseller VPS",
    reseller_panel: "Reseller Panel",
    vps: "VPS",
    container_vps: "VPS Nat",
    topup_saldo: "Deposit Saldo"
  }
  return labels[productData.type] || ""
}

function buildReceiptDetails(productData) {
  if (!productData) return []
  const d = productData
  switch (d.type) {
    case "script":
      return [
        { label: "Nama", value: d.nama || d.item || "-" }
      ]
    case "app":
      return [
        { label: "Produk", value: d.nama || "-" },
        { label: "Jumlah", value: String(d.qty || 1) + " akun" },
        { label: "Deskripsi", value: d.deskripsi || "-" }
      ]
    case "game":
      return [
        { label: "Game", value: d.gameName || "-" },
        { label: "Tipe", value: d.gameType ? d.gameType.toUpperCase() : "-" },
        { label: "Jumlah", value: String(d.qty || 1) + " akun" }
      ]
    case "panel_legal":
      return [
        { label: "Tipe", value: "Panel Legal" },
        { label: "RAM", value: d.ram === 0 ? "Unlimited" : (d.ram / 1024) + " GB" },
        { label: "Username", value: d.username || "-" }
      ]
    case "panel":
      return [
        { label: "Tipe", value: "Panel" },
        { label: "RAM", value: d.ram === 0 ? "Unlimited" : (d.ram / 1024) + " GB" },
        { label: "Username", value: d.username || "-" }
      ]
    case "admin_panel":
      return [
        { label: "Tipe", value: "Admin Panel" },
        { label: "Username", value: d.username || "-" }
      ]
    case "ubot_prem":
      return [
        { label: "Tipe", value: "Ubot Premium" },
        { label: "Akses", value: "Grup Eksklusif" }
      ]
    case "reseller_panel_legal":
      return [
        { label: "Tipe", value: "Reseller Panel Legal" },
        { label: "Akses", value: "Grup Reseller" }
      ]
    case "reseller_vps":
      return [
        { label: "Tipe", value: "Reseller VPS" },
        { label: "Akses", value: "Grup Reseller" }
      ]
    case "reseller_panel":
      return [
        { label: "Tipe", value: "Reseller Panel" },
        { label: "Akses", value: "Grup Reseller" }
      ]
    case "vps":
      return [
        { label: "Paket", value: d.vpsData?.paket ? d.vpsData.paket.toUpperCase() : "-" },
        { label: "Spesifikasi", value: d.vpsData?.plan || "-" },
        { label: "Region", value: d.vpsData?.region ? d.vpsData.region.toUpperCase() : "-" },
        { label: "OS", value: d.vpsData?.osFamily || d.vpsData?.os || "-" },
        { label: "Garansi", value: d.vpsData?.paket === "low" ? "1 Hari" : d.vpsData?.paket === "medium" ? "3 Hari" : "7 Hari" }
      ]
    case "container_vps":
      return [
        { label: "Tipe", value: "VPS Nat" },
        { label: "Paket", value: (d.paket || "-").toUpperCase() },
        { label: "Spek", value: "Spek lumayan · Full 1 bulan" },
        { label: "Jumlah", value: String(d.qty || 1) }
      ]
    default:
      return []
  }
}

function buildTestimoniCaption(userName, userId, productName, amount, waktuWIB, status) {
  const statusLine = status === "SELESAI"
    ? "╰⌑ 📦 𝗦𝘁𝗮𝘁𝘂𝘀 : ✅ 𝗦𝗘𝗟𝗘𝗦𝗔𝗜"
    : "╰⌑ 📦 𝗦𝘁𝗮𝘁𝘂𝘀 : ⏳ 𝗣𝗥𝗢𝗦𝗘𝗦";
  return `📜 𝗦𝗧𝗥𝗨𝗞 𝗣𝗘𝗠𝗕𝗘𝗟𝗜𝗔𝗡 𝗣𝗥𝗢𝗗𝗨𝗞
━━━━━━━━━━━━━━━━━━━━━⨳
🪪 𝗜𝗗𝗘𝗡𝗧𝗜𝗧𝗔𝗦 𝗣𝗘𝗠𝗕𝗘𝗟𝗜
├⌑ 👤 𝗡𝗮𝗺𝗮 : ${userName}
╰⌑ 🆔 𝗜𝗗 : ${userId}

🎀 𝗗𝗔𝗧𝗔 𝗣𝗥𝗢𝗗𝗨𝗞
├⌑ 🛒 𝗣𝗿𝗼𝗱𝘂𝗸 : ${productName}
├⌑ 💰 𝗛𝗮𝗿𝗴𝗮 : ${toRupiah(amount)}
├⌑ ⏰ 𝗪𝗮𝗸𝘁𝘂 : ${waktuWIB} WIB
${statusLine}

📨 𝗧𝗲𝗿𝗶𝗺𝗮𝗸𝗮𝘀𝗶𝗵 𝗦𝘂𝗱𝗮𝗵 𝗕𝗲𝗹𝗮𝗻𝗷𝗮 𝗗𝗶 :
 ➥ ${config.botName} 𝗕𝗼𝘁`;
}

async function sendTestimoniKeChannel(userName, userId, productName, amount, userTgUsername, details = [], productData = null) {
  try {
    if (!TESTIMONI_CHANNEL) {
      console.log("[INFO] Channel testimoni belum diatur di config.js");
      return null;
    }

    const waktuWIB = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric',
      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      second: '2-digit', hour12: false
    });

    const caption = buildTestimoniCaption(userName, userId, productName, amount, waktuWIB, "PROSES");

    const receiptBuffer = createReceipt({
      username: userTgUsername || userName,
      userId: String(userId),
      item: productName,
      nominal: amount,
      fee: 0,
      status: "SELESAI",
      metode: "QRIS (Pakasir)",
      details: details,
      productLabel: buildProductLabel(productData)
    });

    const sent = await bot.telegram.sendPhoto(TESTIMONI_CHANNEL, { source: receiptBuffer }, {
      caption: caption,
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 𝗢𝗿𝗱𝗲𝗿 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", url: `https://t.me/${bot.botInfo.username}` }]
        ]
      }
    });

    console.log("[SUCCESS] Struk PROSES berhasil dikirim ke channel");
    return { messageId: sent.message_id, waktuWIB };
  } catch (error) {
    console.error("[ERROR] Gagal mengirim testimoni ke channel:", error.message);
    return null;
  }
}

async function updateTestimoniSelesai(testimoniResult, userName, userId, productName, amount) {
  try {
    if (!TESTIMONI_CHANNEL || !testimoniResult) return;
    const caption = buildTestimoniCaption(userName, userId, productName, amount, testimoniResult.waktuWIB, "SELESAI");
    await bot.telegram.editMessageCaption(TESTIMONI_CHANNEL, testimoniResult.messageId, null, caption, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 𝗢𝗿𝗱𝗲𝗿 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", url: `https://t.me/${bot.botInfo.username}` }]
        ]
      }
    });
    console.log("[SUCCESS] Status testimoni diupdate ke SELESAI");
  } catch (error) {
    console.error("[ERROR] Gagal update testimoni SELESAI:", error.message);
  }
}

function readManualPayments() {
  if (!fs.existsSync(MANUAL_PAYMENTS_DB)) {
    fs.writeFileSync(MANUAL_PAYMENTS_DB, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(MANUAL_PAYMENTS_DB));
}

function saveManualPayments(data) {
  fs.writeFileSync(MANUAL_PAYMENTS_DB, JSON.stringify(data, null, 2));
}

function getBotStats() {
  try {
    const users = loadUsers();
    const totalUsers = users.length;

    const uptime = Date.now() - botStartTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    return {
      totalUsers,
      runtime: `${days}d ${hours}h ${minutes}m`,
      botName: config.botName || "BOT TELEGRAM",
      ownerName: config.ownerName || "Owner",
      backupCount: "Auto" 
    };
  } catch (e) {
    return {
      totalUsers: "Error",
      runtime: "Unknown",
      botName: config.botName || "BOT TELEGRAM",
      ownerName: config.ownerName || "Owner",
      backupCount: "-"
    };
  }
}

function formatUserCard(ctx, msg) {
  const username = ctx.from.username ? `@${ctx.from.username}` : '-';
  return `<b>📩 PESAN DARI USER</b>\n<b>Username :</b> ${username}\n<b>ID User  :</b> ${ctx.from.id}\n\n<b>Pesan:</b>\n${msg}`;
}

bot.on("document", async (ctx, next) => {
  const userId = ctx.from.id;
  const state = userState[userId];

  if (state?.step === "WAITING_SCRIPT_FILE" && userId === config.ownerId) {
    const doc = ctx.message.document;

    if (!doc.file_name.endsWith(".zip"))
      return safeReply(ctx, "<blockquote>❌ File harus format .zip!</blockquote>", { parse_mode: "HTML" });

    userState[userId] = {
      step: "WAITING_SCRIPT_DETAIL",
      file_id: doc.file_id,
      temp_fileName: doc.file_name.replace(/\s/g, "_"),
    };

    return safeReply(ctx, `<blockquote>✅ <b>File diterima!</b>\n<b>Kirim detail:</b>\nNama | Harga | Deskripsi</blockquote>`, { parse_mode: "HTML" });
  }

  return next();
});

bot.command("pesan", async (ctx) => {
  const raw = ctx.message.text || "";
  const msg = raw.replace(/^\/pesan(@\w+)?\s*/i, "").trim();

  if (!msg) {
    liveChatState[ctx.from.id] = { step: "WAITING_MESSAGE" };
    return safeReply(ctx, "📝 <b>𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗲𝘁𝗶𝗸 𝗣𝗲𝘀𝗮𝗻 𝗔𝗻𝗱𝗮 𝗨𝗻𝘁𝘂𝗸 𝗗𝗶𝗸𝗶𝗿𝗶𝗺 𝗞𝗲 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>\n❌ 𝗞𝗲𝘁𝗶𝗸 /batal 𝗨𝗻𝘁𝘂𝗸 𝗠𝗲𝗺𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻 𝗠𝗲𝗻𝗴𝗶𝗿𝗶𝗺 𝗣𝗲𝘀𝗮𝗻", { parse_mode: "HTML" });
  }

  return sendToOwner(ctx, msg);
});

bot.command("batal", (ctx) => {
  if (liveChatState[ctx.from.id]?.step === "WAITING_MESSAGE") {
    delete liveChatState[ctx.from.id];
    return safeReply(ctx, "❌ 𝗣𝗲𝗻𝗴𝗶𝗿𝗶𝗺𝗮𝗻 𝗣𝗲𝘀𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗗𝗶𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.");
  }
  if (ownerReplyState[ctx.from.id]) {
    delete ownerReplyState[ctx.from.id];
    return safeReply(ctx, "❌ 𝗠𝗼𝗱𝗲 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗢𝘄𝗻𝗲𝗿 𝗗𝗶𝗵𝗲𝗻𝘁𝗶𝗸𝗮𝗻.");
  }
  if (userState[ctx.from.id]?.step === "WAITING_BROADCAST" && ctx.from.id === config.ownerId) {
    delete userState[ctx.from.id];
    return safeReply(ctx, "❌ 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁 𝗗𝗶𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.");
  }
  return; 
});

bot.on("text", async (ctx, next) => {
  try {
    const st = liveChatState[ctx.from.id];
    if (st && st.step === "WAITING_MESSAGE") {
      const text = ctx.message.text;
      delete liveChatState[ctx.from.id];
      return await sendToOwner(ctx, text);
    }
  } catch (e) {}
  return next();
});

async function sendToOwner(ctx, messageText) {
  try {
    const owner = config.ownerId;
    const layout = formatUserCard(ctx, messageText);
    await bot.telegram.sendMessage(owner, layout, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📨 𝗕𝗮𝗹𝗮𝘀 𝗣𝗲𝘀𝗮𝗻 𝗨𝘀𝗲𝗿", callback_data: `reply_${ctx.from.id}` }]
        ]
      }
    });
    await safeReply(ctx, "✅ <b>𝗣𝗲𝘀𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗗𝗶𝗸𝗶𝗿𝗶𝗺𝗸𝗮𝗻 𝗞𝗲𝗽𝗮𝗱𝗮 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>", { parse_mode: "HTML" });
  } catch (err) {
    return safeReply(ctx, "❌ 𝗣𝗲𝗻𝗴𝗶𝗿𝗶𝗺𝗮𝗻 𝗣𝗲𝘀𝗮𝗻 𝗚𝗮𝗴𝗮𝗹, 𝗧𝗲𝗿𝗷𝗮𝗱𝗶 𝗘𝗿𝗿𝗼𝗿 𝗦𝗶𝘀𝘁𝗲𝗺.");
  }
}

bot.action(/reply_(\d+)/, async (ctx) => {
  try {
    if (String(ctx.from.id) !== String(config.ownerId)) {
      await ctx.answerCbQuery("❌ 𝗛𝗮𝗻𝘆𝗮 𝗢𝘄𝗻𝗲𝗿 𝗦𝗮𝗷𝗮 𝗬𝗮𝗻𝗴 𝗕𝗶𝘀𝗮 𝗠𝗲𝗺𝗯𝗮𝗹𝗮𝘀 𝗣𝗲𝘀𝗮𝗻 𝗨𝘀𝗲𝗿.", { show_alert: true });
      return;
    }
    const targetId = ctx.match[1];
    ownerReplyState[ctx.from.id] = { target: targetId, step: "WAITING_REPLY" };
    await ctx.answerCbQuery();
    await safeReply(ctx, "✉️ <b>𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗶𝗿𝗶𝗺 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗔𝗻𝗱𝗮 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴!</b>\n━━━━━━━━━━━━━━━━━━━━❍\n<b>🌸 𝗝𝗲𝗻𝗶𝘀 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗕𝗶𝘀𝗮 𝗕𝗲𝗿𝘂𝗽𝗮 :</b>\n<b>➥ 𝗧𝗲𝗸𝘀 | 𝗙𝗼𝘁𝗼 | 𝗩𝗶𝗱𝗲𝗼 | 𝗙𝗶𝗹𝗲</b>\n<b>➥ 𝗞𝗲𝘁𝗶𝗸 /batal 𝗨𝗻𝘁𝘂𝗸 𝗠𝗲𝗺𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.</b>", { parse_mode: "HTML" });
  } catch (e) {}
});

async function forwardReplyToUser(ownerCtx, targetUserId, messageType, payload) {
  try {
    if (messageType === "text") {
      await bot.telegram.sendMessage(targetUserId, `💬 <b>𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗗𝗮𝗿𝗶 𝗢𝘄𝗻𝗲𝗿:</b>\n\n${payload}`, { parse_mode: "HTML" });
      await ownerCtx.reply("✅ 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗧𝗲𝗿𝗸𝗶𝗿𝗶𝗺 𝗦𝗲𝗯𝗮𝗴𝗮𝗶 𝗧𝗲𝗸𝘀.");
      return;
    }
  } catch (e) {
    await ownerCtx.reply("❌ 𝗚𝗮𝗴𝗮𝗹 𝗠𝗲𝗻𝗴𝗶𝗿𝗶𝗺 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗞𝗲 𝗨𝘀𝗲𝗿.");
  }
}

bot.on("text", async (ctx, next) => {
  try {
    const st = ownerReplyState[ctx.from.id];
    if (st && st.step === "WAITING_REPLY") {
      const target = st.target;
      const text = ctx.message.text;
      delete ownerReplyState[ctx.from.id];
      await forwardReplyToUser(ctx, target, "text", text);
      return;
    }
  } catch (e) {}
  return next();
});

function getFileExtension(name) {
    const ext = name.split(".").pop().toLowerCase();
    if (["js"].includes(ext)) return "javascript";
    if (["py"].includes(ext)) return "python";
    if (["html","htm"].includes(ext)) return "html";
    if (["css"].includes(ext)) return "css";
    if (["json"].includes(ext)) return "json";
    if (["zip","rar","7z","tar","gz"].includes(ext)) return "archive";
    return "text";
}

async function downloadFile(fileId) {
    try {
        const fileLink = await bot.telegram.getFileLink(fileId);
        const res = await axios.get(fileLink, { responseType: "arraybuffer" });
        return res.data;
    } catch (err) {
        throw new Error("Gagal download file: " + err.message);
    }
}

function getFileContent(buffer) {
    try {
        return Buffer.from(buffer).toString("utf8");
    } catch (err) {
        throw new Error("Gagal membaca file: " + err.message);
    }
}

async function analyzeErrorWithGemini(codeContent, fileName) {
    try {
        if (getFileExtension(fileName) === "archive") {
            return "❌ <b>File adalah arsip (zip/rar), bukan file kode.</b>\nSilakan ekstrak dulu dan kirim file kode individual (js, py, html, css, json).";
        }
        
        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: `Deteksi error pada file bernama ${fileName}. Berikan hasilnya dalam format:

\`\`\`${getFileExtension(fileName)}
(kode atau analisis singkat di sini)
\`\`\`

JANGAN beri penjelasan panjang. Singkat & jelas saja.

Isi file:
${codeContent}
`
                    }]
                }]
            }
        );
        return res.data.candidates[0].content.parts[0].text;
    } catch (err) {
        throw new Error("Gemini error: " + err.message);
    }
}

async function fixErrorWithGemini(codeContent, fileName) {
    try {
        if (getFileExtension(fileName) === "archive") {
            throw new Error("File adalah arsip (zip/rar), bukan file kode. Silakan ekstrak dulu.");
        }
        
        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: `Perbaiki error dalam file ${fileName} dan kirimkan hanya kode final:\n\n${codeContent}`
                    }]
                }]
            }
        );
        return res.data.candidates[0].content.parts[0].text;
    } catch (err) {
        throw new Error("Gemini error: " + err.message);
    }
}

const premiumUsers = new Set([config.ownerId]);
let userLimits = new Map();

function updateUserLimit(userId) {
    if (premiumUsers.has(userId)) return 999;
    const now = userLimits.get(userId) || config.USER_LIMIT;
    const sisa = now - 1;
    userLimits.set(userId, sisa);
    return sisa;
}

function getUserLimit(userId) {
    return premiumUsers.has(userId) ? "Unlimited" : (userLimits.get(userId) || config.USER_LIMIT);
}

function loadUsers() {
  if (!fs.existsSync(USERS_DB)) {
    fs.writeFileSync(USERS_DB, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(USERS_DB));
}

function saveUsers(list) {
  fs.writeFileSync(USERS_DB, JSON.stringify(list, null, 2));
}

function checkAndAddUser(user) {
  const users = loadUsers()
  const isNewUser = !users.includes(user.id)
  
  if (isNewUser) {
    users.push(user.id)
    saveUsers(users)
    
    notifyOwnerNewUser(user)
    
    return true
  }
  return false
}

bot.on("message", (ctx, next) => {
  try {
    checkAndAddUser(ctx.from);
  } catch (e) {
    console.error("[ERROR] Error adding user:", e);
  }
  return next();
});

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      isPanelOpen: true,
      isPanelLegalOpen: true,
      scripts: [],
      apps: [],
      paymentMethod: config.payment?.method || 'orkut'
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getActivePaymentMethod() {
  const db = readDb();
  return (db && db.paymentMethod) ? db.paymentMethod : (config.payment?.method || 'orkut');
}

function setActivePaymentMethod(method) {
  const db = readDb();
  db.paymentMethod = method;
  saveDb(db);
}

async function createAdminAccount(username) {
  try {
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.panel.apikey}`
    };
    
    const password = username + "001";
    const email = `${username.toLowerCase()}@admin.com`;

    const userRes = await axios.post(`${config.panel.domain}/api/application/users`, {
      email: email,
      username: username.toLowerCase(),
      first_name: username,
      last_name: "Admin",
      language: "en",
      password: password,
      root_admin: true
    }, { headers });

    const user = userRes.data.attributes;

    return { 
        success: true, 
        data: { 
            id: user.id,
            username: user.username, 
            password: password, 
            email: user.email,
            login: config.panel.domain 
        } 
    };
  } catch (error) {
    console.error("Create Admin Error:", error.response?.data || error.message);
    return { success: false, msg: error.response?.data?.errors?.[0]?.detail || error.message };
  }
}

async function createPanelAccount(username, ram, disk, cpu) {
  try {
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.panel.apikey}`
    };
    const expired = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
    const password = username + Math.random().toString(36).slice(2, 5);
    const email = `${username.toLowerCase()}@gmail.com`;

    const userRes = await axios.post(`${config.panel.domain}/api/application/users`, {
      email, username: username.toLowerCase(), first_name: username, last_name: "User", language: "en", password
    }, { headers });

    const user = userRes.data.attributes;

    await axios.post(`${config.panel.domain}/api/application/servers`, {
      name: `${username} Server`,
      user: user.id,
      egg: config.panel.eggId,
      docker_image: config.panel.image,
      startup: spc,
      description: expired,
      environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
      limits: { memory: ram, swap: 0, disk: disk, io: 500, cpu: cpu },
      feature_limits: { databases: 1, backups: 1, allocations: 1 },
      deploy: { locations: [config.panel.locationId], dedicated_ip: false, port_range: [] }
    }, { headers });

    return { success: true, data: { username: user.username, password, login: config.panel.domain } };
  } catch (error) {
    return { success: false, msg: error.response?.data?.errors?.[0]?.detail || error.message };
  }
}

async function createPanelLegalAccount(username, ram, disk, cpu) {
  try {
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.panellegal.apikey}`
    };
    const expired = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
    const password = username + Math.random().toString(36).slice(2, 5);
    const email = `${username.toLowerCase()}@gmail.com`;

    const userRes = await axios.post(`${config.panellegal.domain}/api/application/users`, {
      email, username: username.toLowerCase(), first_name: username, last_name: "User", language: "en", password
    }, { headers });

    const user = userRes.data.attributes;

    await axios.post(`${config.panellegal.domain}/api/application/servers`, {
      name: `${username} Server`,
      user: user.id,
      egg: config.panellegal.eggId,
      docker_image: config.panellegal.image,
      startup: spc,
      description: expired,
      environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
      limits: { memory: ram, swap: 0, disk: disk, io: 500, cpu: cpu },
      feature_limits: { databases: 1, backups: 1, allocations: 1 },
      deploy: { locations: [config.panellegal.locationId], dedicated_ip: false, port_range: [] }
    }, { headers });

    return { success: true, data: { username: user.username, password, login: config.panellegal.domain } };
  } catch (error) {
    return { success: false, msg: error.response?.data?.errors?.[0]?.detail || error.message };
  }
}


bot.action("check_join_testi", async (ctx) => {
  const joined = await isUserJoinedTesti(ctx.from.id);
  if (!joined) {
    await ctx.answerCbQuery("❌ Belum join channel! Join dulu lalu coba lagi.", { show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCbQuery("✅ Terima kasih sudah join!").catch(() => {});
  // arahkan ke /start flow: kirim welcome singkat + menu
  try {
    await ctx.deleteMessage().catch(() => {});
  } catch (_) {}
  // trigger start-like welcome via fake - call reply with menu
  const stats = getBotStats();
  const welcomeText = buildWelcomeText(stats);
  await safeReply(ctx, welcomeText, {
    parse_mode: "HTML",
    reply_markup: buildHomeKeyboard()
  });
});




/** ===================== TELEGRAM RICH MESSAGE (Bot API 9.4) ===================== */
/**
 * Kirim rich message via endpoint baru sendRichMessage
 * Fallback ke sendMessage HTML biasa jika gagal
 */
async function sendRichMessage(chatId, html, reply_markup = null, extra = {}) {
  const htmlClean = String(html || "").trim();
  if (!htmlClean) return { ok: false, error: "html kosong" };

  const payload = {
    chat_id: chatId,
    rich_message: { html: htmlClean }
  };
  if (reply_markup) payload.reply_markup = reply_markup;
  // jangan spread extra yang bisa nambah field text (saling eksklusif dengan rich_message)
  if (extra && typeof extra === "object") {
    for (const k of Object.keys(extra)) {
      if (k === "text" || k === "parse_mode" || k === "rich_message") continue;
      payload[k] = extra[k];
    }
  }

  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${config.botToken}/sendRichMessage`,
      payload,
      { timeout: 20000, headers: { "Content-Type": "application/json" } }
    );
    if (res.data?.ok) return { ok: true, result: res.data.result, rich: true };
    const desc = res.data?.description || "sendRichMessage failed";
    console.error("[RICH send]", desc);
    throw new Error(desc);
  } catch (e) {
    const desc = e.response?.data?.description || e.message;
    console.error("[RICH send fail]", desc);
    // Fallback: pesan HTML biasa
    try {
      const res2 = await axios.post(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: stripRichToHtml(htmlClean),
          parse_mode: "HTML",
          reply_markup: reply_markup || undefined,
          disable_web_page_preview: true
        },
        { timeout: 20000 }
      );
      return { ok: true, result: res2.data?.result, rich: false, fallback: true, error: desc };
    } catch (e2) {
      return { ok: false, error: e2.message || desc };
    }
  }
}

/**
 * Edit pesan dengan rich_message (editMessageText + field rich_message)
 * text dan rich_message saling eksklusif
 */
async function editRichMessage(chatId, messageId, html, reply_markup = null) {
  const htmlClean = String(html || "").trim();
  // PENTING: jangan kirim field "text" bersama rich_message (saling eksklusif)
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    rich_message: { html: htmlClean }
  };
  if (reply_markup) payload.reply_markup = reply_markup;

  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${config.botToken}/editMessageText`,
      payload,
      { timeout: 20000, headers: { "Content-Type": "application/json" } }
    );
    if (res.data?.ok) return { ok: true, result: res.data.result, rich: true };
    const desc = res.data?.description || "editRich failed";
    console.error("[RICH edit]", desc);
    throw new Error(desc);
  } catch (e) {
    const desc = e.response?.data?.description || e.message;
    console.error("[RICH edit fail]", desc);
    try {
      const res2 = await axios.post(
        `https://api.telegram.org/bot${config.botToken}/editMessageText`,
        {
          chat_id: chatId,
          message_id: messageId,
          text: stripRichToHtml(htmlClean),
          parse_mode: "HTML",
          reply_markup: reply_markup || undefined
        },
        { timeout: 20000 }
      );
      return { ok: true, result: res2.data?.result, rich: false, fallback: true, error: desc };
    } catch (e2) {
      return { ok: false, error: e2.message || desc };
    }
  }
}

/** Strip tag rich yang tidak didukung parse_mode HTML biasa */
function stripRichToHtml(html) {
  return String(html || "")
    .replace(/<\/?h[1-6]>/gi, (m) => (m.startsWith("</") ? "</b>" : "<b>"))
    .replace(/<\/?details[^>]*>/gi, "")
    .replace(/<\/?summary>/gi, (m) => (m.startsWith("</") ? "</b>" : "<b>"))
    .replace(/<\/?table[^>]*>/gi, "")
    .replace(/<\/?t[rdh][^>]*>/gi, " ")
    .replace(/<\/?ul>/gi, "")
    .replace(/<\/?ol>/gi, "")
    .replace(/<\/?li>/gi, " • ")
    .replace(/<\/?figure>/gi, "")
    .replace(/<\/?figcaption>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<tg-emoji[^>]*>.*?<\/tg-emoji>/gi, "")
    .replace(/<\/?tg-slideshow>/gi, "")
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .trim();
}

function buildRichLoadingHtml(step = 1) {
  const frames = [
    { title: "Menyiapkan tampilan...", sub: "Menghubungkan server", pct: "33%" },
    { title: "Menyiapkan tampilan...", sub: "Memuat antarmuka", pct: "66%" },
    { title: "Menyiapkan tampilan...", sub: "Sinkronisasi data", pct: "100%" }
  ];
  const f = frames[Math.max(0, Math.min(step - 1, frames.length - 1))];
  // Pola sama seperti bot yang tabelnya tampil: heading singkat + 1 tabel bersih
  return (
    "<h2>" + f.title + "</h2>" +
    "<table bordered striped>" +
    "<tr><th>Proses</th><th>Status</th></tr>" +
    "<tr><td>" + f.sub + "</td><td><b>" + f.pct + "</b></td></tr>" +
    "<tr><td>Mode</td><td><b>PROCESSING</b></td></tr>" +
    "</table>"
  );
}

function buildRichWelcomeHtml(stats) {
  const owner = escapeHtml(String(stats.ownerName || "-"));
  const bot = escapeHtml(String(stats.botName || "-"));
  const users = escapeHtml(String(stats.totalUsers ?? 0));
  const runtime = escapeHtml(String(stats.runtime || "-"));

  // SAMA PERSIS pola loading yang dulu TABELNYA MUNCUL
  // Hanya beda isi baris: info bot, runtime, total user, dll
  return (
    "<h2>Toko VPS Hanz</h2>" +
    "<table bordered striped>" +
    "<tr><th>Info</th><th>Nilai</th></tr>" +
    "<tr><td>Owner</td><td>" + owner + "</td></tr>" +
    "<tr><td>Bot</td><td>" + bot + "</td></tr>" +
    "<tr><td>Versi</td><td>VIP 10.0</td></tr>" +
    "<tr><td>Total User</td><td>" + users + "</td></tr>" +
    "<tr><td>Runtime</td><td>" + runtime + "</td></tr>" +
    "<tr><td>Status</td><td><b>Ready</b></td></tr>" +
    "</table>" +
    "<p>Pilih menu di bawah untuk mulai order</p>"
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uiSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function playStartLoadingRich(ctx) {
  // Step 1
  const sent = await sendRichMessage(ctx.chat.id, buildRichLoadingHtml(1));
  if (!sent.ok || !sent.result?.message_id) return null;
  const mid = sent.result.message_id;

  await uiSleep(500);
  await editRichMessage(ctx.chat.id, mid, buildRichLoadingHtml(2));

  await uiSleep(500);
  await editRichMessage(ctx.chat.id, mid, buildRichLoadingHtml(3));

  await uiSleep(350);
  return { message_id: mid, rich: sent.rich };
}


/** ===================== UI HELPERS (premium / rich) ===================== */

const UI = {
  line: "━━━━━━━━━━━━━━━━━━━━━━",
  soft: "──────────────────────",
  brand: "𝗧𝗢𝗞𝗢 𝗩𝗣𝗦 𝗛𝗔𝗡𝗭",
  spark: "𖤓",
  bullet: "𒁍",
  star: "𐚁"
};

function buildLoadingText(title = "Memuat", subtitle = "Mohon tunggu sebentar...", step = 1, maxStep = 3) {
  const bars = ["▱▱▱▱▱", "▰▱▱▱▱", "▰▰▱▱▱", "▰▰▰▱▱", "▰▰▰▰▱", "▰▰▰▰▰"];
  const idx = Math.max(0, Math.min(step, bars.length - 1));
  const bar = bars[idx];
  const pct = Math.min(100, Math.round((step / Math.max(1, maxStep)) * 100));
  return (
    `<blockquote expandable><b>${UI.spark} ${title}</b>\n` +
    `${UI.line}\n` +
    `${UI.bullet} Status · <b>PROCESSING</b>\n` +
    `${UI.bullet} Progress · <code>${bar}</code> <b>${pct}%</b>\n` +
    `${UI.bullet} ${subtitle}\n` +
    `${UI.line}</blockquote>\n` +
    `<i>✦ Mohon tunggu · jangan spam</i>`
  );
}

function uiSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Edit pesan jadi loading elegan (callback) */
async function showRichLoading(ctx, title = "Memuat menu", subtitle = "Menyiapkan tampilan premium...", step = 2, maxStep = 3) {
  const text = buildLoadingText(title, subtitle, step, maxStep);
  try {
    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(text, { parse_mode: "HTML" });
        return;
      } catch (_) {}
      try {
        await ctx.editMessageCaption(text, { parse_mode: "HTML" });
        return;
      } catch (_) {}
    }
  } catch (_) {}
}

/**
 * Loading mewah multi-step untuk /start
 * return message object loading
 */
async function playStartLoading(ctx) {
  const frames = [
    { title: "𝗜𝗡𝗜𝗧𝗜𝗔𝗟𝗜𝗭𝗜𝗡𝗚", sub: "Menghubungkan ke server toko...", step: 1 },
    { title: "𝗟𝗢𝗔𝗗𝗜𝗡𝗚 𝗨𝗜", sub: "Menyiapkan tampilan premium...", step: 2 },
    { title: "𝗦𝗬𝗡𝗖 𝗗𝗔𝗧𝗔", sub: "Sinkronisasi stok realtime...", step: 3 }
  ];
  let msg = null;
  try {
    msg = await ctx.reply(buildLoadingText(frames[0].title, frames[0].sub, 1, 3), {
      parse_mode: "HTML"
    });
  } catch (e) {
    return null;
  }
  for (let i = 1; i < frames.length; i++) {
    await uiSleep(480);
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        undefined,
        buildLoadingText(frames[i].title, frames[i].sub, frames[i].step, 3),
        { parse_mode: "HTML" }
      );
    } catch (_) {}
  }
  await uiSleep(320);
  return msg;
}

function buildWelcomeExpandable(stats) {
  // Blockquote expandable = bisa di-tap buka ke bawah (HTML biasa, stabil)
  return (
    `<blockquote expandable><b>𖤓 WELCOME · TOKO VPS HANZ</b>
━━━━━━━━━━━━━━━━━━━━━━
Tap bar di bawah untuk lihat detail
</blockquote>

<blockquote expandable><b>👤 Info User / Bot</b>
━━━━━━━━━━━━━━━━━━━━━━
𒁍 <b>Owner</b>   · ${stats.ownerName}
𒁍 <b>Bot</b>     · ${stats.botName}
𒁍 <b>Versi</b>   · <code>VIP · 10.0</code>
𒁍 <b>Prefix</b>  · <code>/</code>
𒁍 <b>User</b>    · <code>${stats.totalUsers}</code>
𒁍 <b>Runtime</b> · <code>${stats.runtime}</code>
━━━━━━━━━━━━━━━━━━━━━━
</blockquote>

<blockquote expandable><b>📦 Info Layanan</b>
━━━━━━━━━━━━━━━━━━━━━━
𒁍 VPS Nat · Ready
𒁍 VPS Digital Ocean · Ready
𒁍 Garansi · Aktif 7 hari
𒁍 Transaksi · Otomatis
━━━━━━━━━━━━━━━━━━━━━━
</blockquote>

<i>𖤓 Silakan pilih menu di bawah untuk mulai order</i>`
  );
}

function buildWelcomeText(stats) {
  return (
    `<blockquote expandable><b>${UI.spark} 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 · ${UI.brand}</b>\n` +
    `${UI.line}\n` +
    `${UI.bullet} <b>Owner</b>   · ${stats.ownerName}\n` +
    `${UI.bullet} <b>Bot</b>     · ${stats.botName}\n` +
    `${UI.bullet} <b>Versi</b>   · <code>VIP · 10.0</code>\n` +
    `${UI.bullet} <b>Prefix</b>  · <code>/</code>\n` +
    `\n` +
    `<b>📊 Statistik realtime</b>\n` +
    `${UI.bullet} User aktif · <code>${stats.totalUsers}</code>\n` +
    `${UI.bullet} Runtime    · <code>${stats.runtime}</code>\n` +
    `${UI.line}</blockquote>\n` +
    `<blockquote><b>${UI.star} Halo, selamat datang</b>\n` +
    `Silakan pilih menu di bawah untuk mulai order.\n` +
    `Transaksi otomatis · stok realtime · support cepat.</blockquote>`
  );
}

function buildHomeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📦  𝗩𝗣𝗦 𝗡𝗮𝘁", callback_data: "menu_container_vps", style: "success" },
        { text: "🖥️  𝗩𝗣𝗦 𝗗𝗢", callback_data: "buyvps_start", style: "primary" }
      ],
      [
        { text: "🛡️  𝗔𝗺𝗯𝗶𝗹 𝗚𝗮𝗿𝗮𝗻𝘀𝗶", callback_data: "garansi_menu", style: "primary" }
      ],
      [
        { text: "🛍️  𝗠𝗲𝗻𝘂 𝗟𝗮𝘆𝗮𝗻𝗮𝗻", callback_data: "shop_menu", style: "success" },
        { text: "🛠️  𝗠𝗲𝗻𝘂 𝗧𝗼𝗼𝗹𝘀", callback_data: "menu_tools", style: "primary" }
      ],
      [
        { text: "🌸  𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁", callback_data: "menu_owner_contact", style: "danger" }
      ],
      [
        { text: "🍂  𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗧𝗲𝘀𝘁𝗶", url: `https://t.me/${config.channelName}` },
        { text: "🚀  𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗜𝗻𝗳𝗼", url: `https://t.me/${config.grubName}` }
      ]
    ]
  };
}

function buildShopMenuText() {
  return (
    `<blockquote expandable><b>🛍️ 𝗗𝗔𝗙𝗧𝗔𝗥 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 · ${UI.brand}</b>\n` +
    `${UI.line}\n` +
    `${UI.bullet} Pilih produk yang ingin di-order\n` +
    `${UI.bullet} Semua transaksi aman & otomatis\n` +
    `${UI.bullet} Butuh bantuan? hubungi Owner\n` +
    `${UI.line}</blockquote>\n` +
    `<i>${UI.spark} Silakan pilih kategori di bawah</i>`
  );
}

function buildShopKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📱  𝗢𝗿𝗱𝗲𝗿 𝗡𝗼𝗸𝗼𝘀 (𝗩𝗶𝗿𝘁𝘂𝗮𝗹)", callback_data: "choose_service", style: "primary" }],
      [
        { text: "📁  𝗕𝘂𝘆 𝗦𝗰𝗿𝗶𝗽𝘁", callback_data: "menu_scripts", style: "primary" },
        { text: "📱  𝗔𝗽𝗽𝘀 𝗣𝗿𝗲𝗺𝗶𝘂𝗺", callback_data: "menu_apps", style: "primary" }
      ],
      [
        { text: "🛠️  𝗔𝗱𝗺𝗶𝗻 𝗣𝗮𝗻𝗲𝗹", callback_data: "buy_admin_panel", style: "primary" },
        { text: "📡  𝗣𝗮𝗻𝗲𝗹 𝗣𝘁𝗲𝗿𝗼𝗱𝗮𝗰𝘁𝘆𝗹", callback_data: "menu_panel", style: "primary" }
      ],
      [
        { text: "👨‍💻  𝗥𝗲𝘀𝗲𝗹𝗹𝗲𝗿 𝗩𝗣𝗦", callback_data: "buy_reseller_vps", style: "primary" },
        { text: "🖥️  𝗩𝗣𝗦 𝗗𝗶𝗴𝗶𝘁𝗮𝗹 𝗢𝗰𝗲𝗮𝗻", callback_data: "buyvps_start", style: "success" }
      ],
      [{ text: "📦  𝗩𝗣𝗦 𝗡𝗮𝘁", callback_data: "menu_container_vps", style: "success" }],
      [
        { text: "🤝  𝗥𝗲𝘀𝗲𝗹𝗹𝗲𝗿 𝗣𝗮𝗻𝗲𝗹", callback_data: "buy_reseller_panel", style: "primary" },
        { text: "🤖  𝗨𝗯𝗼𝘁", callback_data: "buy_ubot", style: "primary" }
      ],
      [{ text: "🌟  𝗥𝗲𝘀𝗲𝗹𝗹𝗲𝗿 𝗣𝗮𝗻𝗲𝗹 𝗟𝗲𝗴𝗮𝗹", callback_data: "buy_reseller_panel_legal", style: "primary" }],
      [{ text: "🌐  𝗣𝗮𝗻𝗲𝗹 𝗣𝘁𝗲𝗿𝗼𝗱𝗮𝗰𝘁𝘆𝗹 𝗟𝗲𝗴𝗮𝗹", callback_data: "menu_panel_legal", style: "primary" }],
      [{ text: "🔙  𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]
    ]
  };
}


bot.start(async (ctx) => {
  checkAndAddUser(ctx.from);

  if (ctx.from.id !== config.ownerId) {
    const joined = await isUserJoinedTesti(ctx.from.id);
    if (!joined) {
      await sendForceJoinMessage(ctx);
      return;
    }
  }

  const stats = getBotStats();
  const menuKeyboard = buildHomeKeyboard();
  const richHtml = buildRichWelcomeHtml(stats);

  // Loading singkat (teks biasa)
  let loadingMsg = null;
  try {
    loadingMsg = await ctx.reply("<b>⏳ Menyiapkan tampilan...</b>", { parse_mode: "HTML" });
  } catch (_) {}
  await uiSleep(400);
  if (loadingMsg) {
    try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (_) {}
  }

  // 1) Gambar start (tanpa caption panjang — caption tidak support rich table)
  if (config.startPhoto) {
    try {
      await ctx.replyWithPhoto(config.startPhoto);
    } catch (e) {
      console.error("[START PHOTO]", e.message);
    }
  }

  // 2) Rich message + TABEL (pesan terpisah, biar tabel benar-benar rich)
  let sent = await sendRichMessage(ctx.chat.id, richHtml, menuKeyboard);
  console.log("[START]", sent.rich ? "RICH_TABLE_OK" : "FALLBACK", sent.error || "");

  if (!sent.rich) {
    sent = await sendRichMessage(ctx.chat.id, richHtml, null);
    console.log("[START retry]", sent.rich ? "RICH_TABLE_OK" : "FALLBACK", sent.error || "");
    if (sent.ok && sent.rich && sent.result?.message_id) {
      try {
        await axios.post(
          `https://api.telegram.org/bot${config.botToken}/editMessageReplyMarkup`,
          {
            chat_id: ctx.chat.id,
            message_id: sent.result.message_id,
            reply_markup: menuKeyboard
          },
          { timeout: 15000 }
        );
      } catch (_) {}
    } else {
      // Hanya kalau rich total gagal
      await safeReply(ctx, buildWelcomeExpandable(stats), {
        parse_mode: "HTML",
        reply_markup: menuKeyboard
      });
    }
  }

  if (config.startAudio && String(config.startAudio).trim() !== "") {
    try {
      await ctx.replyWithAudio(config.startAudio, {
        caption: config.startAudioCaption || "",
        parse_mode: "HTML"
      });
    } catch (_) {}
  }

  if (ctx.from.id === config.ownerId) {
    await safeReply(
      ctx,
      `<blockquote expandable><b>🌸 Welcome My Owner</b>\nAkses panel owner siap.</blockquote>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀  𝗧𝗮𝗺𝗽𝗶𝗹𝗸𝗮𝗻 𝗠𝗲𝗻𝘂 𝗢𝘄𝗻𝗲𝗿", callback_data: "menu_owner", style: "primary" }]
          ]
        }
      }
    );
  }
})

bot.action("menu_scripts", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'menu_scripts')) return;
  
  const db = readDb();
  if ((db.scripts || []).length === 0) {
    await editMenuMessage(ctx, "🚫 <b>𝗠𝗼𝗵𝗼𝗻 𝗠𝗮𝗮𝗳, 𝗕𝗲𝗹𝘂𝗺 𝗔𝗱𝗮 𝗦𝗰𝗿𝗶𝗽𝘁 𝗕𝗼𝘁 𝗬𝗮𝗻𝗴 𝗗𝗶𝗷𝘂𝗮𝗹 𝗢𝗹𝗲𝗵 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]
        ]
      }
    });
    return;
  }
  
  const buttons = db.scripts.map((item, index) => {
    return [{ text: `${item.nama} - ${toRupiah(item.harga)}`, callback_data: `buy_sc_${index}` }];
  });
  
  buttons.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]);
  
  await editMenuMessage(ctx, "<b>📂 𝗣𝗶𝗹𝗶𝗵 𝗦𝗰𝗿𝗶𝗽𝘁 𝗗𝗶𝗯𝗮𝘄𝗮𝗵 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗞𝗮𝗺𝘂 𝗕𝗲𝗹𝗶 :</b>", {
    reply_markup: { inline_keyboard: buttons }
  });
})

bot.action("menu_apps", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'menu_apps')) return;
  
  const db = readDb();
  if ((db.apps || []).length === 0) {
    await editMenuMessage(ctx, "🚫 <b>𝗠𝗼𝗵𝗼𝗻 𝗠𝗮𝗮𝗳, 𝗕𝗲𝗹𝘂𝗺 𝗔𝗱𝗮 𝗔𝗽𝗽𝘀 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗬𝗮𝗻𝗴 𝗗𝗶𝗷𝘂𝗮𝗹 𝗢𝗹𝗲𝗵 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]
        ]
      }
    });
    return;
  }
  
  const buttons = db.apps.map((app, i) => {
    const stock = (app.accounts || []).length;
    return [{ text: `${app.nama} (${stock} stok) - ${toRupiah(app.harga)}`, callback_data: `buy_app_${i}` }];
  });
  
  buttons.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]);
  
  await editMenuMessage(ctx, "<b>📱 𝗗𝗮𝗳𝘁𝗮𝗿 𝗔𝗽𝗽𝘀 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 :</b>", {
    reply_markup: { inline_keyboard: buttons }
  });
})

// ========== MENU GAMES ==========
bot.action("menu_games", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'menu_games')) return;
  
  const gamesDB = readGamesDB();
  if (gamesDB.length === 0) {
    await editMenuMessage(ctx, "🚫 <b>𝗠𝗼𝗵𝗼𝗻 𝗠𝗮𝗮𝗳, 𝗕𝗲𝗹𝘂𝗺 𝗔𝗱𝗮 𝗔𝗸𝘂𝗻 𝗚𝗮𝗺𝗲 𝗬𝗮𝗻𝗴 𝗗𝗶𝗷𝘂𝗮𝗹 𝗢𝗹𝗲𝗵 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]
        ]
      }
    });
    return;
  }
  
  const freeFireGames = gamesDB.filter(game => game.gameType === "freefire");
  const mlGames = gamesDB.filter(game => game.gameType === "mobilelegends");
  const robloxGames = gamesDB.filter(game => game.gameType === "roblox");
  
  let caption = `<b>🎮 𝗗𝗔𝗙𝗧𝗔𝗥 𝗔𝗞𝗨𝗡 𝗚𝗔𝗠𝗘</b>\n\n`;
  
  if (freeFireGames.length > 0) {
    caption += `<b>🔫 FREE FIRE (${freeFireGames.length})</b>\n`;
    freeFireGames.forEach((game, i) => {
      caption += `${i+1}. ${game.name} - ${toRupiah(game.price)}\n`;
    });
    caption += `\n`;
  }
  
  if (mlGames.length > 0) {
    caption += `<b>⚔️ MOBILE LEGENDS (${mlGames.length})</b>\n`;
    mlGames.forEach((game, i) => {
      caption += `${i+1}. ${game.name} - ${toRupiah(game.price)}\n`;
    });
    caption += `\n`;
  }
  
  if (robloxGames.length > 0) {
    caption += `<b>🧱 ROBLOX (${robloxGames.length})</b>\n`;
    robloxGames.forEach((game, i) => {
      caption += `${i+1}. ${game.name} - ${toRupiah(game.price)}\n`;
    });
    caption += `\n`;
  }
  
  const buttons = [
    [{ text: "🔫 FREE FIRE", callback_data: "game_category_freefire" }],
    [{ text: "⚔️ MOBILE LEGENDS", callback_data: "game_category_mobilelegends" }],
    [{ text: "🧱 ROBLOX", callback_data: "game_category_roblox" }],
    [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "shop_menu", style: "danger" }]
  ];
  
  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons }
  });
})

bot.action(/game_category_(freefire|mobilelegends|roblox)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'game_category')) return;
  
  const gameType = ctx.match[1];
  const gamesDB = readGamesDB();
  const filteredGames = gamesDB.filter(game => game.gameType === gameType);
  
  if (filteredGames.length === 0) {
    await editMenuMessage(ctx, `🚫 <b>𝗕𝗲𝗹𝘂𝗺 𝗔𝗱𝗮 𝗔𝗸𝘂𝗻 ${gameType.toUpperCase()} 𝗬𝗮𝗻𝗴 𝗧𝗲𝗿𝘀𝗲𝗱𝗶𝗮.</b>`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "menu_games", style: "danger" }]
        ]
      }
    });
    return;
  }
  
  let caption = `<b>🎮 ${gameType.toUpperCase()} ACCOUNTS</b>\n\n`;
  
  filteredGames.forEach((game, i) => {
    const stock = game.accounts ? game.accounts.length : 0;
    caption += `<b>${i+1}. ${game.name}</b>\n`;
    caption += `├💰 Harga: ${toRupiah(game.price)}\n`;
    caption += `├📦 Stok: ${stock}\n`;
    caption += `└📝 Deskripsi: ${game.description || '-'}\n\n`;
  });
  
  const buttons = filteredGames.map((game, i) => {
    return [{ text: `${i+1}. ${game.name} - ${toRupiah(game.price)}`, callback_data: `buy_game_${game.id}` }];
  });
  
  buttons.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "menu_games", style: "danger" }]);
  
  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons }
  });
})

bot.action(/buy_game_(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_game')) return;
  
  const gameId = ctx.match[1];
  const gamesDB = readGamesDB();
  const game = gamesDB.find(g => g.id === gameId);
  
  if (!game) {
    await ctx.answerCbQuery("❌ Game tidak ditemukan!", { show_alert: true });
    return;
  }
  
  const stock = game.accounts ? game.accounts.length : 0;
  if (stock <= 0) {
    await ctx.answerCbQuery("❌ Stok habis!", { show_alert: true });
    return;
  }
  
  userState[ctx.from.id] = {
    step: "PURCHASE_GAME",
    gameId: gameId,
    qty: 1,
    message: null
  };
  
  const total = game.price * 1;
  const caption = `<b>🎮 ORDER AKUN GAME</b>\n\n` +
    `<b>Game:</b> ${game.name}\n` +
    `<b>Tipe:</b> ${game.gameType.toUpperCase()}\n` +
    `<b>Deskripsi:</b> ${game.description || '-'}\n` +
    `<b>Stok Tersedia:</b> ${stock}\n\n` +
    `<b>Harga Satuan:</b> ${toRupiah(game.price)}\n` +
    `<b>Jumlah:</b> 1\n` +
    `<b>Total Harga:</b> ${toRupiah(total)}\n\n` +
    `<i>Silakan pilih jumlah yang ingin dibeli:</i>`;
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [ 
          { text: "➖", callback_data: `game_qty_minus_${gameId}` }, 
          { text: "1", callback_data: `game_qty_show_${gameId}` }, 
          { text: "➕", callback_data: `game_qty_plus_${gameId}` } 
        ],
        [ { text: "🛒 𝗢𝗿𝗱𝗲𝗿 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", callback_data: `game_buy_now_${gameId}` } ],
        [ { text: "🔙 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: `game_category_${game.gameType}` } ]
      ]
    }
  };
  
  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    ...keyboard
  });
  
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/game_qty_minus_(.+)/, async (ctx) => {
  const uid = ctx.from.id;
  const gameId = ctx.match[1];
  
  if (!userState[uid] || userState[uid].step !== "PURCHASE_GAME" || userState[uid].gameId !== gameId) {
    userState[uid] = { step: "PURCHASE_GAME", gameId: gameId, qty: 1, message: null };
  }
  
  const gamesDB = readGamesDB();
  const game = gamesDB.find(g => g.id === gameId);
  if (!game) {
    ctx.answerCbQuery("🚫 Game tidak ditemukan!");
    return;
  }
  
  userState[uid].qty = Math.max(1, (userState[uid].qty || 1) - 1);
  const qty = userState[uid].qty;
  const stock = game.accounts ? game.accounts.length : 0;
  
  if (qty > stock) userState[uid].qty = stock;
  const total = game.price * userState[uid].qty;
  
  const caption = `<b>🎮 ORDER AKUN GAME</b>\n\n` +
    `<b>Game:</b> ${game.name}\n` +
    `<b>Tipe:</b> ${game.gameType.toUpperCase()}\n` +
    `<b>Deskripsi:</b> ${game.description || '-'}\n` +
    `<b>Stok Tersedia:</b> ${stock}\n\n` +
    `<b>Harga Satuan:</b> ${toRupiah(game.price)}\n` +
    `<b>Jumlah:</b> ${userState[uid].qty}\n` +
    `<b>Total Harga:</b> ${toRupiah(total)}\n\n` +
    `<i>Silakan pilih jumlah yang ingin dibeli:</i>`;
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [ 
          { text: "➖", callback_data: `game_qty_minus_${gameId}` }, 
          { text: `${userState[uid].qty}`, callback_data: `game_qty_show_${gameId}` }, 
          { text: "➕", callback_data: `game_qty_plus_${gameId}` } 
        ],
        [ { text: "🛒 𝗢𝗿𝗱𝗲𝗿 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", callback_data: `game_buy_now_${gameId}` } ],
        [ { text: "🔙 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: `game_category_${game.gameType}` } ]
      ]
    }
  };
  
  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    ...keyboard
  });
  
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/game_qty_plus_(.+)/, async (ctx) => {
  const uid = ctx.from.id;
  const gameId = ctx.match[1];
  
  if (!userState[uid] || userState[uid].step !== "PURCHASE_GAME" || userState[uid].gameId !== gameId) {
    userState[uid] = { step: "PURCHASE_GAME", gameId: gameId, qty: 1, message: null };
  }
  
  const gamesDB = readGamesDB();
  const game = gamesDB.find(g => g.id === gameId);
  if (!game) {
    ctx.answerCbQuery("🚫 Game tidak ditemukan!");
    return;
  }
  
  const stock = game.accounts ? game.accounts.length : 0;
  userState[uid].qty = (userState[uid].qty || 1) + 1;
  if (userState[uid].qty > stock) userState[uid].qty = stock;
  
  const total = game.price * userState[uid].qty;
  
  const caption = `<b>🎮 ORDER AKUN GAME</b>\n\n` +
    `<b>Game:</b> ${game.name}\n` +
    `<b>Tipe:</b> ${game.gameType.toUpperCase()}\n` +
    `<b>Deskripsi:</b> ${game.description || '-'}\n` +
    `<b>Stok Tersedia:</b> ${stock}\n\n` +
    `<b>Harga Satuan:</b> ${toRupiah(game.price)}\n` +
    `<b>Jumlah:</b> ${userState[uid].qty}\n` +
    `<b>Total Harga:</b> ${toRupiah(total)}\n\n` +
    `<i>Silakan pilih jumlah yang ingin dibeli:</i>`;
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [ 
          { text: "➖", callback_data: `game_qty_minus_${gameId}` }, 
          { text: `${userState[uid].qty}`, callback_data: `game_qty_show_${gameId}` }, 
          { text: "➕", callback_data: `game_qty_plus_${gameId}` } 
        ],
        [ { text: "🛒 𝗢𝗿𝗱𝗲𝗿 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", callback_data: `game_buy_now_${gameId}` } ],
        [ { text: "🔙 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: `game_category_${game.gameType}` } ]
      ]
    }
  };
  
  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    ...keyboard
  });
  
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/game_buy_now_(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'game_buy_now')) return;
  
  const uid = ctx.from.id;
  const gameId = ctx.match[1];
  const gamesDB = readGamesDB();
  const game = gamesDB.find(g => g.id === gameId);
  
  if (!game) {
    ctx.answerCbQuery("🚫 Game tidak ditemukan!");
    return;
  }
  
  const st = userState[uid];
  if (!st || st.step !== "PURCHASE_GAME" || st.gameId !== gameId) {
    userState[uid] = { step: "PURCHASE_GAME", gameId: gameId, qty: 1, message: null };
  }
  
  const qty = Math.max(1, userState[uid].qty || 1);
  const stock = game.accounts ? game.accounts.length : 0;
  
  if (qty > stock) {
    ctx.answerCbQuery("🚫 Jumlah melebihi stok!");
    return;
  }
  
  const total = game.price * qty;
  
  await handlePayment(ctx, total, `Akun ${game.name} (${game.gameType}) x${qty}`, {
    type: "game",
    gameId: gameId,
    qty: qty,
    total: total
  });
  
  ctx.answerCbQuery().catch(()=>{});
})
// ========== END MENU GAMES ==========

bot.action("menu_panel", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'menu_panel')) return;
  
  const db = readDb();
  if (!db.isPanelOpen) {
    await editMenuMessage(ctx, "<b>🚫 𝗠𝗼𝗵𝗼𝗻 𝗠𝗮𝗮𝗳, 𝗦𝘁𝗼𝗸 𝗣𝗮𝗻𝗲𝗹 𝗕𝗲𝗹𝘂𝗺 𝗧𝗲𝗿𝘀𝗲𝗱𝗶𝗮 𝗨𝗻𝘁𝘂𝗸 𝗦𝗮𝗮𝘁 𝗜𝗻𝗶. 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗖𝗼𝗯𝗮 𝗟𝗮𝗴𝗶 𝗡𝗮𝗻𝘁𝗶</b>.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]
        ]
      }
    });
    return;
  }

  userState[ctx.from.id] = { step: "WAITING_USERNAME_PANEL" };

  await editMenuMessage(ctx,
    "<b>🍂 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗶𝗿𝗶𝗺 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 𝗨𝗻𝘁𝘂𝗸 𝗣𝗮𝗻𝗲𝗹 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗞𝗮𝗺𝘂 𝗕𝗲𝗹𝗶 𝗗𝗲𝗻𝗴𝗮𝗻 𝗠𝗶𝗻𝗶𝗺𝗮𝗹 𝟱-𝟴 𝗛𝘂𝗿𝘂𝗳.</b>\n",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗠𝗲𝗺𝗯𝗲𝗹𝗶 𝗣𝗮𝗻𝗲𝗹", callback_data: "back_home", style: "danger" }]
        ]
      }
    }
  );
})

bot.action("menu_panel_legal", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'menu_panel_legal')) return;
  
  const db = readDb();
  if (!db.isPanelLegalOpen) {
    await editMenuMessage(ctx, "<b>🚫 𝗠𝗼𝗵𝗼𝗻 𝗠𝗮𝗮𝗳, 𝗦𝘁𝗼𝗸 𝗣𝗮𝗻𝗲𝗹 𝗟𝗲𝗴𝗮𝗹 𝗕𝗲𝗹𝘂𝗺 𝗧𝗲𝗿𝘀𝗲𝗱𝗶𝗮 𝗨𝗻𝘁𝘂𝗸 𝗦𝗮𝗮𝘁 𝗜𝗻𝗶. 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗖𝗼𝗯𝗮 𝗟𝗮𝗴𝗶 𝗡𝗮𝗻𝘁𝗶</b>.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]
        ]
      }
    });
    return;
  }

  userState[ctx.from.id] = { step: "WAITING_USERNAME_PANEL_LEGAL" };

  await editMenuMessage(ctx,
    "<b>🍂 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗶𝗿𝗶𝗺 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 𝗨𝗻𝘁𝘂𝗸 𝗣𝗮𝗻𝗲𝗹 𝗟𝗲𝗴𝗮𝗹 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗞𝗮𝗺𝘂 𝗕𝗲𝗹𝗶 𝗗𝗲𝗻𝗴𝗮𝗻 𝗠𝗶𝗻𝗶𝗺𝗮𝗹 𝟱-𝟴 𝗛𝘂𝗿𝘂𝗳.</b>\n",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗠𝗲𝗺𝗯𝗲𝗹𝗶 𝗣𝗮𝗻𝗲𝗹 𝗟𝗲𝗴𝗮𝗹", callback_data: "back_home", style: "danger" }]
        ]
      }
    }
  );
})

bot.action("shop_menu", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'shop_menu')) return;
  if (!(await requireJoinTesti(ctx))) return;
  await ctx.answerCbQuery().catch(() => {});
  await showRichLoading(ctx, "Memuat layanan", "Menyiapkan katalog produk...");
  await editMenuMessage(ctx, buildShopMenuText(), {
    parse_mode: "HTML",
    reply_markup: buildShopKeyboard()
  });
})

bot.action("menu_tools", async (ctx) => {
  await editMenuMessage(ctx, 
    `<blockquote><b>╭━━━✧「 𝗧𝗢𝗢𝗟𝗦 𝗠𝗘𝗡𝗨 」✧━━━❍</b>
<b>┃ 🎬 𝗬𝗼𝘂𝘁𝘂𝗯𝗲 𝗠𝗲𝗻𝘂</b>
<b>┃ ├⌑</b> /ytsearch <i>(Searching YouTube)</i>
<b>┃ └⌑</b> /ytmp3 <i>(Audio)</i>
<b>┃</b>
<b>┃ 🎥 𝗧𝗶𝗸𝗧𝗼𝗸 𝗠𝗲𝗻𝘂</b>
<b>┃ └⌑</b> /tiktokmp4 <i>(Video)</i>
<b>┃</b>
<b>┃ 📝 𝗛𝗲𝗹𝗽 𝗠𝗲𝗻𝘂</b>
<b>┃ ├⌑</b> /checkerror
<b>┃ └⌑</b> /fixerror
<b>┃</b>
<b>┃ 🛠️ 𝗧𝗼𝗼𝗹𝘀 𝗠𝗲𝗻𝘂</b>
<b>┃ ├⌑</b> /makeqr
<b>┃ ├⌑</b> /ssweb
<b>┃ ├⌑</b> /shorten
<b>┃ ├⌑</b> /react <i>(React WA Channel)</i>
<b>┃ ├⌑</b> /qc <i>(Quote Creator)</i>
<b>┃ ├⌑</b> /brat <i>(Brat Sticker)</i>
<b>┃ └⌑</b> /tourl <i>(Upload to URL)</i>
<b>╰━━━━━━━━━━━━━━━━━━━━━━❍</b></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "primary" }]
        ]
      }
    }
  );
})

bot.action("menu_owner_contact", async (ctx) => {
  await editMenuMessage(ctx,
    `<blockquote><b>📞「 𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗢𝗪𝗡𝗘𝗥 𝗕𝗢𝗧 」</b></blockquote>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━━❍</b>\n` +
    `<b>🍂 𝗡𝗮𝗺𝗲 :</b> ${config.ownerName || "𝗔𝗱𝗺𝗶𝗻"}\n` +
    `<b>📲 𝗪𝗵𝗮𝘁𝘀𝗮𝗽𝗽 :</b> ${config.ownerWa}\n` +
    `<b>✈️ 𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 :</b> ${config.ownerUser}\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━━❍</b>\n` +
    `📩 𝗞𝗮𝗺𝘂 𝗟𝗶𝗺𝗶𝘁? 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗹𝗶𝗸 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗗𝗶𝗯𝗮𝘄𝗮𝗵 :\n`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💬 𝗞𝗶𝗿𝗶𝗺 𝗣𝗲𝘀𝗮𝗻 𝗞𝗲 𝗢𝘄𝗻𝗲𝗿", callback_data: "send_message_owner", style: "success" }],
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]
        ]
      }
    }
  );
})

bot.action("send_message_owner", async (ctx) => {
  liveChatState[ctx.from.id] = { step: "WAITING_MESSAGE" };
  await editMenuMessage(ctx, 
    "📝 <b>𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗲𝘁𝗶𝗸 𝗣𝗲𝘀𝗮𝗻 𝗨𝗻𝘁𝘂𝗸 𝗗𝗶𝗸𝗶𝗿𝗶𝗺 𝗞𝗲𝗽𝗮𝗱𝗮 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>\n<b>🍂 𝗧𝗲𝗸𝗮𝗻 𝗕𝘂𝘁𝘁𝗼𝗻 𝗕𝗮𝘁𝗮𝗹 𝗗𝗶𝗯𝗮𝘄𝗮𝗵 𝗨𝗻𝘁𝘂𝗸 𝗠𝗲𝗺𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.</b>",
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗠𝗲𝗻𝗴𝗶𝗿𝗶𝗺 𝗣𝗲𝘀𝗮𝗻", callback_data: "back_home", style: "danger" }]
        ]
      }
    }
  );
})

bot.action("back_home", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const stats = getBotStats();
  const menuKeyboard = buildHomeKeyboard();
  const richHtml = buildRichWelcomeHtml(stats);

  // Hapus pesan lama sebisa mungkin, kirim ulang foto + rich table
  try {
    await ctx.deleteMessage();
  } catch (_) {}

  if (config.startPhoto) {
    try {
      await ctx.replyWithPhoto(config.startPhoto);
    } catch (e) {
      console.error("[BACK PHOTO]", e.message);
    }
  }

  const sent = await sendRichMessage(ctx.chat.id, richHtml, menuKeyboard);
  if (!sent.rich) {
    await safeReply(ctx, buildWelcomeExpandable(stats), {
      parse_mode: "HTML",
      reply_markup: menuKeyboard
    });
  }
})



function showOwnerMenu(ctx) {
  if (String(ctx.from.id) !== String(config.ownerId)) {
    return safeReply(ctx, "<blockquote>🚫 <b>Kamu Bukan Owner Bot!</b></blockquote>", { parse_mode: "HTML" });
  }

  const text =
    `<blockquote expandable><b>🌸 𝗢𝗪𝗡𝗘𝗥 𝗠𝗘𝗡𝗨</b>
━━━━━━━━━━━━━━━━━━━━━━
Silahkan tekan button di bawah
</blockquote>`;

  const kb = {
    inline_keyboard: [
      [{ text: "🟢  Setting Panel (On/Off)", callback_data: "owner_panel", style: "primary" }],
      [{ text: "🟢  Setting Panel Legal (On/Off)", callback_data: "owner_panel_legal", style: "primary" }],
      [{ text: "📢  Broadcast", callback_data: "owner_broadcast", style: "primary" }],
      [
        { text: "➕  Add Script", callback_data: "add_script", style: "success" },
        { text: "🗑  Delete Script", callback_data: "del_script", style: "danger" }
      ],
      [
        { text: "📱  Add App", callback_data: "add_app", style: "success" },
        { text: "🗑  Delete App", callback_data: "del_app", style: "danger" }
      ],
      [
        { text: "🎮  Add Akun Game", callback_data: "add_game", style: "success" },
        { text: "🗑  Delete Akun Game", callback_data: "del_game", style: "danger" }
      ],
      [
        { text: "➕  Add Account", callback_data: "owner_add_account", style: "success" },
        { text: "🗑  Delete Account", callback_data: "owner_del_account", style: "danger" }
      ],
      [{ text: "🖥️  List VPS Orders", callback_data: "list_vps_orders", style: "primary" }],
      [{ text: "📦  Stock VPS Nat", callback_data: "owner_container_vps", style: "success" }],
      [{ text: "🚂  Create VPS Railway", callback_data: "owner_railway_create", style: "success" }],
      [{ text: "📧  Temp Mail", callback_data: "owner_tempmail", style: "primary" }],
      [{ text: "🔑  Set API Key DigitalOcean", callback_data: "owner_set_do_api", style: "primary" }],
      [{ text: "📢  Broadcast Stok DO", callback_data: "owner_broadcast_do", style: "success" }],
      [{ text: "📃  List App Premium", callback_data: "list_apps", style: "primary" }],
      [{ text: "🎮  List Akun Game", callback_data: "list_games", style: "primary" }],
      [{ text: "💳  Ganti Metode Payment", callback_data: "change_payment", style: "primary" }],
      [{ text: "🧾  Menu Manual Payments", callback_data: "manual_payments_menu", style: "primary" }],
      [{ text: "💸  Withdraw Saldo", callback_data: "menu_wd_info", style: "primary" }],
      [{ text: "💾  Backup Database", callback_data: "backup_database", style: "danger" }],
      [{ text: "🔙  Kembali", callback_data: "back_home", style: "danger" }]
    ]
  };

  return safeReply(ctx, text, { parse_mode: "HTML", reply_markup: kb });
}

bot.action("menu_owner", async (ctx) => {
  try {
    await ctx.answerCbQuery().catch(() => {});
    await showOwnerMenu(ctx);
  } catch (e) {
    console.error("[menu_owner]", e.message);
    try {
      await ctx.reply("❌ Gagal buka owner menu: " + (e.message || "error"));
    } catch (_) {}
  }
})


bot.action("smm_menu", async (ctx) => {
    const userId = ctx.from.id;
    const saldoData = JSON.parse(fs.readFileSync("./database/saldoOtp.json", "utf8") || "{}");
    const saldo = saldoData[userId] || 0;

    const text = `
╔══════════════════════════╗
║     🔥 <b>𝗦𝗨𝗡𝗧𝗜𝗞 𝗦𝗢𝗦𝗠𝗘𝗗</b> 🔥     ║
╠══════════════════════════╣
║ 👤 <b>𝖴𝗌𝖾𝗋 :</b> ${ctx.from.first_name}
║ 💰 <b>𝖲𝖺𝗅𝖽𝗈 :</b> ${toRupiah(saldo)}
║
║ 🚀 <i>𝖡𝖾𝗋𝗂𝗄𝗎𝗍 𝖫𝖺𝗒𝖺𝗇𝖺𝗇 𝖲𝗎𝗇𝗍𝗂𝗄 𝖲𝗈𝗌𝗆𝖾𝖽</i>
╚══════════════════════════╝`;

    await editMenuMessage(ctx, text, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "➕ 𝗗𝗲𝗽𝗼𝘀𝗶𝘁", callback_data: "topup_nokos", style: "success" }],
                [{ text: "🛒 𝗗𝗮𝗳𝘁𝗮𝗿 𝗟𝗮𝘆𝗮𝗻𝗮𝗻", callback_data: "smm_services_0" }],
                [{ text: "📜 𝗥𝗶𝘄𝗮𝘆𝗮𝘁 𝗢𝗿𝗱𝗲𝗿", callback_data: "smm_history" }],
                [{ text: "🔍 𝗖𝗲𝗸 𝗦𝘁𝗮𝘁𝘂𝘀 𝗢𝗿𝗱𝗲𝗿", callback_data: "smm_check_status" }],
                [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "shop_menu", style: "danger" }]
            ]
        }
    });
})

bot.action("list_vps_orders", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Hanya owner yang boleh melihat order VPS!", { show_alert: true });
  }
  
  const vpsPath = "./database/data_vps.json";
  
  if (!fs.existsSync(vpsPath)) {
    return safeReply(ctx, "<blockquote>📭 Belum ada data VPS yang terjual.</blockquote>", { 
      parse_mode: "HTML" 
    });
  }
  
  try {
    const vpsDB = JSON.parse(fs.readFileSync(vpsPath));
    
    if (!Array.isArray(vpsDB) || vpsDB.length === 0) {
      return safeReply(ctx, "<blockquote>📭 Belum ada data VPS yang terjual.</blockquote>", { 
        parse_mode: "HTML" 
      });
    }
    
    let message = "<b>📋 DAFTAR ORDER VPS</b>\n\n";
    
    vpsDB.forEach((vps, i) => {
      message += `<b>${i + 1}. ${vps.hostname}</b>\n`;
      message += `<code>   User:</code> ${vps.username} (${vps.userId})\n`;
      message += `<code>   IP:</code> ${vps.ip}\n`;
      message += `<code>   Region:</code> ${vps.region}\n`;
      message += `<code>   DropletID:</code> <code>${vps.dropletId}\n<code>`;
      message += `<code>   Paket:</code> ${vps.paket}\n`;
      message += `<code>   Harga:</code> ${toRupiah(vps.harga)}\n`;
      message += `<code>   Tanggal:</code> ${vps.created}\n\n`;
    });
    
    await safeReply(ctx, message, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner")]
      ])
    });
    
  } catch (error) {
    console.error("Error reading VPS data:", error);
    safeReply(ctx, "<blockquote>❌ Gagal membaca data VPS.</blockquote>", { 
      parse_mode: "HTML" 
    });
  }
})

bot.action("backup_database", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Hanya owner yang boleh backup!", { show_alert: true });
  }
  
  await ctx.answerCbQuery("⏳ Memproses Full Backup...", { show_alert: false });
  await safeReply(ctx, "<blockquote>📦 <b>Sedang mempacking seluruh Source Code & Database...</b>\n<i>Mohon tunggu, proses tergantung ukuran file.</i></blockquote>", { parse_mode: "HTML" });
  
  createAndSendFullBackup(ctx, false);
})

bot.action("manual_payments_menu", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  ctx.answerCbQuery().catch(()=>{});
  
  const payments = readManualPayments();
  const pendingCount = payments.filter(p => p.status === "pending").length;
  
  safeReply(ctx, `<blockquote><b>🧾 𝗠𝗲𝗻𝘂 𝗣𝗮𝘆𝗺𝗲𝗻𝘁 𝗠𝗮𝗻𝘂𝗮𝗹</b>\n<b>𝖯𝖾𝗇𝖽𝗂𝗇𝗀:</b> ${pendingCount}</blockquote>`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [ Markup.button.callback("📋 𝗟𝗶𝘀𝘁 𝗣𝗲𝗻𝗱𝗶𝗻𝗴", "list_pending_payments") ],
      [ Markup.button.callback("📜 𝗔𝗹𝗹 𝗣𝗮𝘆𝗺𝗲𝗻𝘁", "list_all_payments") ],
      [ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner") ]
    ])
  });
})

bot.action("list_pending_payments", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("🚫 𝗞𝗮𝗺𝘂 𝗕𝘂𝗸𝗮𝗻𝗹𝗮𝗵 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁!");
  
  const payments = readManualPayments();
  const pending = payments.filter(p => p.status === "pending");
  
  if (pending.length === 0) {
    safeReply(ctx, "⏳ 𝗧𝗶𝗱𝗮𝗸 𝗔𝗱𝗮 𝗣𝗲𝗺𝗯𝗮𝘆𝗮𝗿𝗮𝗻 𝗬𝗮𝗻𝗴 𝗦𝗲𝗱𝗮𝗻𝗴 𝗣𝗲𝗻𝗱𝗶𝗻𝗴");
    return showOwnerMenu(ctx);
  }
  
  let message = "<b>📋 𝗗𝗮𝘁𝗮 𝗣𝗲𝗺𝗯𝗮𝘆𝗮𝗿𝗮𝗻 𝗣𝗲𝗻𝗱𝗶𝗻𝗴</b>\n\n";
  pending.forEach((p, i) => {
    message += `<b>${i+1}. ${p.userName} (${p.userId})</b>\n`;
    message += `<code>   𝗜𝘁𝗲𝗺 :</code> ${p.itemName}\n`;
    message += `<code>   𝗔𝗺𝗼𝘂𝗻𝘁 :</code> ${toRupiah(p.amount)}\n`;
    message += `<code>   𝗧𝗶𝗺𝗲 :</code> ${new Date(p.timestamp).toLocaleString()}\n`;
    message += `   [Verify](tg://user?id=${p.userId})\n\n`;
  });
  
  safeReply(ctx, message, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "manual_payments_menu") ]
    ])
  });
})

bot.action("list_all_payments", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  
  const payments = readManualPayments();
  
  if (payments.length === 0) {
    safeReply(ctx, "❌ 𝗕𝗲𝗹𝘂𝗺 𝗔𝗱𝗮 𝗥𝗶𝘄𝗮𝘆𝗮𝘁 𝗣𝗲𝗺𝗯𝗮𝘆𝗮𝗿𝗮𝗻 𝗠𝗮𝗻𝘂𝗮𝗹.");
    return showOwnerMenu(ctx);
  }
  
  let message = "<b>📜 𝗕𝗲𝗿𝗶𝗸𝘂𝘁 𝗥𝗶𝘄𝗮𝘆𝗮𝘁 𝗣𝗲𝗺𝗯𝗮𝘆𝗮𝗿𝗮𝗻 𝗠𝗮𝗻𝘂𝗮𝗹l</b>\n\n";
  payments.forEach((p, i) => {
    const statusEmoji = p.status === "𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱" ? "✅" : p.status === "𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱" ? "❌" : "⏳";
    message += `<b>${i+1}. ${statusEmoji} ${p.userName}</b>\n`;
    message += `<code>   𝗜𝘁𝗲𝗺 :</code> ${p.itemName}\n`;
    message += `<code>   𝗔𝗺𝗼𝘂𝗻𝘁 :</code> ${toRupiah(p.amount)}\n`;
    message += `<code>   𝗦𝘁𝗮𝘁𝘂𝘀 :</code> ${p.status}\n`;
    message += `<code>   𝗧𝗶𝗺𝗲 :</code> ${new Date(p.timestamp).toLocaleString()}\n\n`;
  });
  
  safeReply(ctx, message, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "manual_payments_menu") ]
    ])
  });
})

bot.action("change_payment", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  ctx.answerCbQuery().catch(()=>{});
  const active = getActivePaymentMethod();
  safeReply(ctx, `<b>💸 𝗠𝗲𝘁𝗼𝗱𝗲 𝗣𝗲𝗺𝗯𝗮𝘆𝗮𝗿𝗮𝗻 𝗬𝗮𝗻𝗴 𝗔𝗸𝘁𝗶𝗳 𝗦𝗮𝗮𝘁 𝗜𝗻𝗶 :</b> <code>${active.toUpperCase()}</code>\n<b>🚀 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗣𝗶𝗹𝗶𝗵 𝗣𝗮𝘆𝗺𝗲𝗻𝘁 𝗕𝗮𝗿𝘂 𝗗𝗶𝗯𝗮𝘄𝗮𝗵:</b>`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [ Markup.button.callback("🌊 𝗔𝘁𝗹𝗮𝗻𝘁𝗶𝗰", "set_payment_atlantic") ],
      [ Markup.button.callback("🍂 𝗢𝗿𝗸𝘂𝘁 / 𝗢𝗿𝗱𝗲𝗿𝗞𝘂𝗼𝘁𝗮", "set_payment_orkut") ],
      [ Markup.button.callback("💳 𝗣𝗮𝗸𝗮𝘀𝗶𝗿 (𝗤𝗥𝗜𝗦)", "set_payment_pakasir") ],
      [ Markup.button.callback("🌸 𝗠𝗮𝗻𝘂𝗮𝗹 (𝗤𝗥𝗜𝗦 𝗙𝗼𝘁𝗼)", "set_payment_manual") ],
      [ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner") ]
    ])
  });
})

bot.action("set_payment_atlantic", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  setActivePaymentMethod("atlantic");
  safeReply(ctx, "✅ <b>𝗠𝗲𝘁𝗼𝗱𝗲 𝗣𝗲𝗺𝗯𝗮𝘆𝗮𝗿𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗗𝗶𝗴𝗮𝗻𝘁𝗶 𝗞𝗲 𝗔𝗧𝗟𝗔𝗡𝗧𝗜𝗖</b>", { parse_mode: "HTML" });
  showOwnerMenu(ctx);
})

bot.action("set_payment_orkut", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  setActivePaymentMethod("orkut");
  safeReply(ctx, "✅ <b>𝗠𝗲𝘁𝗼𝗱𝗲 𝗣𝗲𝗺𝗯𝗮𝘆𝗮𝗿𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗗𝗶𝗴𝗮𝗻𝘁𝗶 𝗞𝗲 𝗢𝗥𝗞𝗨𝗧</b>", { parse_mode: "HTML" });
  showOwnerMenu(ctx);
})

bot.action("set_payment_pakasir", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  if (!config.pakasir?.apiKey || config.pakasir.apiKey === "ISI_API_KEY_PAKASIR_KAMU_DISINI") {
    return safeReply(ctx, "❌ <b>Pakasir belum dikonfigurasi!</b>\n\nSilakan isi <code>pakasir.apiKey</code> dan <code>pakasir.project</code> di <code>config.js</code> terlebih dahulu.", { parse_mode: "HTML" });
  }
  setActivePaymentMethod("pakasir");
  safeReply(ctx, "✅ <b>𝗠𝗲𝘁𝗼𝗱𝗲 𝗣𝗲𝗺𝗯𝗮𝘆𝗮𝗿𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗗𝗶𝗴𝗮𝗻𝘁𝗶 𝗞𝗲 𝗣𝗔𝗞𝗔𝗦𝗜𝗥 (𝗤𝗥𝗜𝗦)</b>", { parse_mode: "HTML" });
  showOwnerMenu(ctx);
})

bot.action("set_payment_manual", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  setActivePaymentMethod("manual");
  safeReply(ctx, "✅ <b>𝗠𝗲𝘁𝗼𝗱𝗲 𝗣𝗲𝗺𝗯𝗮𝘆𝗮𝗿𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗗𝗶𝗴𝗮𝗻𝘁𝗶 𝗞𝗲 𝗤𝗥𝗜𝗦 𝗠𝗮𝗻𝘂𝗮𝗹</b>", { parse_mode: "HTML" });
  showOwnerMenu(ctx);
})

bot.action("owner_panel", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const db = readDb();
  db.isPanelOpen = !db.isPanelOpen;
  saveDb(db);
  const status = db.isPanelOpen ? "🟢 𝗣𝗮𝗻𝗲𝗹 𝗢𝗻𝗹𝗶𝗻𝗲" : "🔴 𝗣𝗮𝗻𝗲𝗹 𝗢𝗳𝗳𝗹𝗶𝗻𝗲";
  safeReply(ctx, `<b>🚀 𝗦𝘁𝗮𝘁𝘂𝘀 𝗣𝗮𝗻𝗲𝗹 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴 :</b> ${status}`, { parse_mode: "HTML" });
})

bot.action("owner_panel_legal", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const db = readDb();
  db.isPanelLegalOpen = !db.isPanelLegalOpen;
  saveDb(db);
  const status = db.isPanelLegalOpen ? "🟢 𝗣𝗮𝗻𝗲𝗹 𝗟𝗲𝗴𝗮𝗹 𝗢𝗻𝗹𝗶𝗻𝗲" : "🔴 𝗣𝗮𝗻𝗲𝗹 𝗟𝗲𝗴𝗮𝗹 𝗢𝗳𝗳𝗹𝗶𝗻𝗲";
  safeReply(ctx, `<b>🚀 𝗦𝘁𝗮𝘁𝘂𝘀 𝗣𝗮𝗻𝗲𝗹 𝗟𝗲𝗴𝗮𝗹 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴 :</b> ${status}`, { parse_mode: "HTML" });
})

bot.action("owner_broadcast", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  ctx.answerCbQuery().catch(()=>{});
  userState[ctx.from.id] = { step: "WAITING_BROADCAST" };
  safeReply(ctx, "📨 <b>𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗶𝗿𝗶𝗺 𝗧𝗲𝗸𝘀/𝗙𝗼𝘁𝗼 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗞𝗮𝗺𝘂 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁..</b>\n🍂 𝗧𝗲𝗸𝗮𝗻 𝗕𝘂𝘁𝘁𝗼𝗻 𝗗𝗶𝗯𝗮𝘄𝗮𝗵 𝗨𝗻𝘁𝘂𝗸 𝗠𝗲𝗺𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.", {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁", "cancel_broadcast")]
    ])
  });
})

bot.action("cancel_broadcast", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  if (userState[ctx.from.id]?.step === "WAITING_BROADCAST") {
    delete userState[ctx.from.id];
    safeReply(ctx, "❌ 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗗𝗶𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.");
    showOwnerMenu(ctx);
  }
})

bot.action("buyvps_start", async (ctx) => {
  if (!await requirePrivateChat(ctx, "buyvps_start")) return;
  if (typeof requireJoinTesti === "function") {
    try { if (!(await requireJoinTesti(ctx))) return; } catch (_) {}
  }
  await ctx.answerCbQuery().catch(() => {});

  let dropletCount = null;
  try {
    dropletCount = await getDropletCount();
  } catch (_) {}
  const sisaVPS = dropletCount !== null ? Math.max(0, 10 - dropletCount) : "?";

  const caption =
`<blockquote expandable><b>🖥️ KATALOG VPS DIGITAL OCEAN</b>
━━━━━━━━━━━━━━━━━━━━━━
📦 Stok slot: <b>${sisaVPS}</b>
Detail tier ada di gambar di atas.

🚨 <b>PENTING</b>
• Semua tier spek bisa dipilih sama (RAM/OS/region)
• Yang beda: <b>garansi & harga</b>
• Replace semua tier: <b>1×</b>
• NO REFUND
• Suspend dalam masa garansi = replace (data lama hangus)
• Membeli = setuju ketentuan ini
</blockquote>

🔥 Silakan pilih kategori VPS:`;

  const kb = {
    inline_keyboard: [
      [{ text: "⬜  SUBLOW", callback_data: "buyvps_pkg:sublow", style: "danger" }],
      [{ text: "🟢  LOW", callback_data: "buyvps_pkg:low", style: "success" }],
      [{ text: "🔵  STANDART", callback_data: "buyvps_pkg:standart", style: "primary" }],
      [{ text: "🟡  MEDIUM", callback_data: "buyvps_pkg:medium", style: "success" }],
      [{ text: "🔴  HIGH", callback_data: "buyvps_pkg:high", style: "danger" }],
      [{ text: "💎  ULTRA", callback_data: "buyvps_pkg:ultra", style: "primary" }],
      [{ text: "📜  Detail Garansi", callback_data: "buyvps_garansi_detail", style: "primary" }],
      [{ text: "🔙  Kembali", callback_data: "back_home", style: "danger" }]
    ]
  };

  try {
    const img = await generateDoCatalogImage();
    await editOrSendPhoto(ctx, img, caption, kb);
  } catch (e) {
    console.error("[DO CATALOG]", e.message);
    try {
      await ctx.replyWithPhoto(
        { source: await generateDoCatalogImage() },
        { caption, parse_mode: "HTML", reply_markup: kb }
      );
    } catch {
      await editMenuMessage(ctx, caption, { parse_mode: "HTML", reply_markup: kb });
    }
  }
})

bot.action("buyvps_garansi_detail", async (ctx) => {
  if (!await requirePrivateChat(ctx, "buyvps_garansi_detail")) return;
  await ctx.answerCbQuery().catch(() => {});
  let lines = "";
  for (const [k, tier] of Object.entries(DO_TIERS)) {
    lines += `${tier.emoji} <b>${tier.label}</b> — Garansi <b>${tier.garansi} ${tier.garansiUnit === "jam" ? "jam" : "hari"}</b> · Replace <b>1×</b> · Mulai ${toRupiah(tier.hargaMulai)}\n`;
  }
  const text =
`<blockquote expandable><b>📜 KETENTUAN & GARANSI VPS DO</b>
━━━━━━━━━━━━━━━━━━━━━━
${lines}
━━━━━━━━━━━━━━━━━━━━━━
• NO REFUND
• Suspend dalam masa garansi = replace 1× (data lama hangus)
• Spek (RAM/OS/region) dipilih setelah pilih tier
</blockquote>`;
  await editMenuMessage(ctx, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 Kembali Katalog", callback_data: "buyvps_start", style: "danger" }]
      ]
    }
  });
})

bot.action(/buyvps_pkg:(sublow|low|standart|medium|high|ultra)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_pkg')) return;
  
  const paket = ctx.match[1];
  const userId = ctx.from.id;
  
  const count = await getDropletCount();
  if (count === null) {
  return editMenuMessage(ctx,
`<blockquote>🚫 𝗦𝗧𝗢𝗞 𝗩𝗣𝗦 𝗦𝗨𝗗𝗔𝗛 𝗛𝗔𝗕𝗜𝗦! 
━━━━━━━━━━━━━━━━━━━━⨳
📨 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗛𝘂𝗯𝘂𝗻𝗴𝗶 𝗢𝘄𝗻𝗲𝗿
𝗨𝗻𝘁𝘂𝗸 𝗦𝗲𝗴𝗲𝗿𝗮 𝗥𝗲𝘀𝘁𝗼𝗰𝗸 𝗩𝗣𝗦.</blockquote>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "buyvps_start", style: "danger" }]
          ]
        }
      }
    );
  };
  const sisaVPS = Math.max(0, 10 - count);

  if (sisaVPS <= 0) {
    return editMenuMessage(ctx,
`<blockquote>🚫 𝗦𝗧𝗢𝗞 𝗩𝗣𝗦 𝗦𝗨𝗗𝗔𝗛 𝗛𝗔𝗕𝗜𝗦! 
━━━━━━━━━━━━━━━━━━━━⨳
📨 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗛𝘂𝗯𝘂𝗻𝗴𝗶 𝗢𝘄𝗻𝗲𝗿
𝗨𝗻𝘁𝘂𝗸 𝗦𝗲𝗴𝗲𝗿𝗮 𝗥𝗲𝘀𝘁𝗼𝗰𝗸 𝗩𝗣𝗦.</blockquote>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "buyvps_start", style: "danger" }]
          ]
        }
      }
    );
  }

  if (!userState[userId]) userState[userId] = {};
  userState[userId].vpsData = { paket };

  let listRam = [];
  const dataHarga = config.hargaVPS?.[paket] || {};

  listRam = [
    { id: 1, label: "2GB 2 CPU | 60GB SSD | 3TB BW", plan: "2c2" },
    { id: 2, label: "4GB 2 CPU | 80GB SSD | 4TB BW", plan: "4c2" },
    { id: 3, label: "8GB 4 CPU | 240GB SSD | 6TB BW", plan: "8c4" }
      ];

  listRam = listRam.map(x => ({
    ...x,
    harga: dataHarga[x.plan] || 0
  }));

  let teks = `🖥 *PILIH SPESIFIKASI VPS*\n` +
             `──────────────────────────\n\n`;

  for (const item of listRam) {
    teks += `*${item.id}.* ${item.label}\n` +
            `└➤ *Rp ${item.harga.toLocaleString("id-ID")}*\n` +
            `──────────────────────────\n`;
  }

  teks += `\n✅ *STOK TERSEDIA : ${sisaVPS} VPS*`;

  const keyboard = listRam.map(v => [
    { 
      text: `${v.id}. ${v.label.split("|")[0].trim()} - Rp ${v.harga.toLocaleString("id-ID")}`, 
      callback_data: `buyvps_ram:${v.plan}` 
    }
  ]);

  keyboard.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "buyvps_start", style: "danger" }]);

  await editMenuMessage(ctx, teks, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
})

bot.action(/buyvps_ram:(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_ram')) return;
  
  const plan = ctx.match[1];
  const userId = ctx.from.id;
  
  if (userState[userId]?.vpsData) {
    userState[userId].vpsData.plan = plan;
  }

  const osFamily = [
    { name: "Ubuntu", key: "ubuntu" },
    { name: "Debian", key: "debian" },
    { name: "CentOS Stream", key: "centos" },
    { name: "Fedora", key: "fedora" },
    { name: "AlmaLinux", key: "almalinux" },
    { name: "Rocky Linux", key: "rocky" },
  ];

  const keyboard = osFamily.map(os => [{
    text: os.name,
    callback_data: `buyvps_osfamily:${os.key}`
  }]);

  keyboard.push([
    { text: "🔙 Kembali", callback_data: `buyvps_pkg:${userState[userId]?.vpsData?.paket}`, style: "danger" }
  ]);

  await editMenuMessage(ctx,
    `💾 *Spesifikasi Dipilih*: ${plan}\n\nPilih *OS Family*:`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    }
  ); 
})

bot.action(/buyvps_osfamily:(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_osfamily')) return;
  
  const osKey = ctx.match[1];
  const userId = ctx.from.id;
  
  if (userState[userId]?.vpsData) {
    userState[userId].vpsData.osFamily = osKey;
  }

  const osVersions = {
    ubuntu: [
      { name: "Ubuntu 20.04 (Not Recommended)", slug: "ubuntu-20-04-x64" },
      { name: "Ubuntu 22.04", slug: "ubuntu-22-04-x64" },
      { name: "Ubuntu 24.04", slug: "ubuntu-24-04-x64" },
    ],
    debian: [
      { name: "Debian 12", slug: "debian-12-x64" },
      { name: "Debian 13", slug: "debian-13-x64" },
    ],
    centos: [
      { name: "CentOS Stream 9", slug: "centos-stream-9-x64" },
    ],
    fedora: [
      { name: "Fedora 42", slug: "fedora-42-x64" },
    ],
    almalinux: [
      { name: "AlmaLinux 8", slug: "almalinux-8-x64" },
      { name: "AlmaLinux 9", slug: "almalinux-9-x64" },
    ],
    rocky: [
      { name: "Rocky Linux 8", slug: "rockylinux-8-x64" },
      { name: "Rocky Linux 9", slug: "rockylinux-9-x64" },
    ]
  };

  const versionList = osVersions[osKey] || [];

  const keyboard = versionList.map(v => [{
    text: v.name,
    callback_data: `buyvps_os:${v.slug}`
  }]);

  keyboard.push([
    { text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶 𝗞𝗲 𝗢𝗦 𝗙𝗮𝗺𝗶𝗹𝘆", callback_data: `buyvps_ram:${userState[userId]?.vpsData?.plan}`, style: "danger" }
  ]);

  await editMenuMessage(ctx,
    `🖥 *OS Dipilih*: ${osKey.toUpperCase()}\n\nPilih *Versi OS*:`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    }
  );
})

bot.action(/buyvps_os:(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_os')) return;
  
  const osSlug = ctx.match[1];
  const userId = ctx.from.id;
  
  if (userState[userId]?.vpsData) {
    userState[userId].vpsData.os = osSlug;
  }

  const regionList = [
    { name: "𝗦𝗜𝗡𝗚𝗔𝗣𝗢𝗥𝗘", code: "sgp1" },
    { name: "𝗡𝗘𝗪 𝗬𝗢𝗥𝗞", code: "nyc3" },
    { name: "𝗦𝗔𝗡 𝗙𝗥𝗔𝗡𝗖𝗜𝗦𝗖𝗢", code: "sfo3" },
    { name: "𝗔𝗠𝗦𝗧𝗘𝗥𝗗𝗔𝗠", code: "ams3" },
    { name: "𝗟𝗢𝗡𝗗𝗢𝗡", code: "lon1" },
    { name: "𝗙𝗥𝗔𝗡𝗞𝗙𝗨𝗥𝗧", code: "fra1" },
    { name: "𝗕𝗔𝗡𝗚𝗟𝗢𝗥𝗘", code: "blr1" },
    { name: "𝗧𝗢𝗥𝗢𝗡𝗧𝗢", code: "tor1" },
  ];

  let text = `📍 *PILIH REGION VPS*\n\n`;
  regionList.forEach((r, i) => text += `${i + 1}. ${r.name}\n`);

  if (userState[userId]?.vpsData) {
    userState[userId].vpsData.regionList = regionList;
  }

  const buttons = regionList.map((r, i) => [
    { text: `${i + 1}. ${r.name}`, callback_data: `buyvps_region:${r.code}` }
  ]);

  buttons.push([
    { text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: `buyvps_osfamily:${userState[userId]?.vpsData?.osFamily}`, style: "danger" }
  ]);

  await editMenuMessage(ctx, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
})

bot.action(/buyvps_region:(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_region')) return;
  
  const region = ctx.match[1];
  const userId = ctx.from.id;
  
  if (!userState[userId]?.vpsData) {
    return ctx.answerCbQuery("❌ Session VPS tidak ditemukan!", { show_alert: true });
  }

  const vpsData = userState[userId].vpsData;
  vpsData.region = region;

  const paket = vpsData.paket;
  const plan = vpsData.plan;
  const hargaRaw = getDoHarga(paket, plan);
  
  vpsData.harga = hargaRaw;
  vpsData.username = ctx.from.username || ctx.from.first_name;

  const paketInfo = {
    sublow: { garansi: "5 Jam", replace: "1x" },
    low: { garansi: "1 Hari", replace: "1x" },
    standart: { garansi: "5 Hari", replace: "1x" },
    medium: { garansi: "7 Hari", replace: "1x" },
    high: { garansi: "12 Hari", replace: "1x" },
    ultra: { garansi: "15 Hari", replace: "1x" }
  };

  const specList = {
    "2c2": "2GB 2 VCPU | 60GB SSD | 3TB BW",
    "4c2": "4GB 2 VCPU | 80GB SSD | 4TB BW",
    "8c4": "8GB 4 VCPU | 240 GB SSD | 6TB BW"
  };

  const labelSpec = specList[plan] || "-";
  const harga = `Rp ${hargaRaw.toLocaleString("id-ID")}`;

  await editMenuMessage(ctx,
`✅ *KONFIRMASI PEMESANAN VPS*
━━━━━━━━━━━━━━━━━━━━━━

📦 *Paket*: ${paket.toUpperCase()}
💸 *Harga*: *${harga}*

🛡️ *Garansi*: ${(paketInfo[paket]||paketInfo.low).garansi}
♻️ *Replace*: ${(paketInfo[paket]||paketInfo.low).replace}

🖥 *Spesifikasi*
• ${labelSpec}
• CPU/RAM Code: *${plan}*

🧩 *OS Family*: ${vpsData.osFamily.toUpperCase()}
🖥 *OS Version*: ${vpsData.os}
🌍 *Region*: ${region}

━━━━━━━━━━━━━━━━━━━━━━.`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💰 𝗢𝗿𝗱𝗲𝗿 𝗩𝗽𝘀 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", callback_data: "buyvps_pay_qris", style: "success" }],
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: `buyvps_os:${vpsData.os}`, style: "danger" }]
        ]
      }
    }
  );
})

bot.action(/choose_service(_page_(\d+))?/, async (ctx) => {
  const page = ctx.match[2] ? parseInt(ctx.match[2]) : 1;
  const perPage = 20;
  const apiKey = config.RUMAHOTP;

  try {
    if (!ctx.match[2]) {
       await ctx.editMessageCaption("⏳ <b>Memuat daftar layanan...</b>", { parse_mode: "HTML" }).catch(() => {});
    }

    if (globalNokos.cachedServices.length === 0) {
      const res = await axios.get("https://www.rumahotp.com/api/v2/services", { headers: { "x-apikey": apiKey } });
      if (res.data.success) globalNokos.cachedServices = res.data.data;
    }

    const services = globalNokos.cachedServices;
    const totalPages = Math.ceil(services.length / perPage);
    const start = (page - 1) * perPage;
    const list = services.slice(start, start + perPage);

    const buttons = list.map(srv => [{
      text: `${srv.service_name}`,
      callback_data: `service_${srv.service_code}`
    }]);

    const nav = [];
    if (page > 1) nav.push({ text: "⬅️ 𝗣𝗿𝗲𝘃", callback_data: `choose_service_page_${page - 1}` });
    if (page < totalPages) nav.push({ text: "➡️ 𝗡𝗲𝘅𝘁 𝗹", callback_data: `choose_service_page_${page + 1}` });
    if (nav.length) buttons.push(nav);

    buttons.push([{ text: "💰 𝗗𝗲𝗽𝗼𝘀𝗶𝘁", callback_data: "topup_nokos", style: "success" }]); 
    buttons.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "shop_menu", style: "danger" }]);

    const caption = `<b>📱 𝗗𝗔𝗙𝗧𝗔𝗥 𝗔𝗣𝗟𝗜𝗞𝗔𝗦𝗜 𝗢𝗧𝗣</b>\n\nSilakan pilih aplikasi:\nHalaman ${page}/${totalPages}`;

    globalNokos.lastServicePhoto[ctx.from.id] = { chatId: ctx.chat.id, messageId: ctx.callbackQuery.message.message_id };

    if (config.ppthumb && !ctx.match[2]) {
       await editMenuMessageWithPhoto(ctx, config.ppthumb, caption, { reply_markup: { inline_keyboard: buttons } });
    } else {
       await ctx.editMessageCaption(caption, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    }

  } catch (error) {
    console.error(error);
    await ctx.answerCbQuery("❌ Gagal memuat layanan.");
  }
})

bot.action(/service_(.+)/, async (ctx) => {
  const serviceId = ctx.match[1];
  const apiKey = config.RUMAHOTP;

  await ctx.editMessageCaption("⏳ <b>Memuat negara...</b>", { parse_mode: "HTML" }).catch(() => {});

  try {
    if (!globalNokos.cachedCountries[serviceId]) {
      const res = await axios.get(`https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`, {
        headers: { "x-apikey": apiKey }
      });
      if (res.data.success) {
         globalNokos.cachedCountries[serviceId] = res.data.data.filter(x => x.pricelist && x.pricelist.length > 0);
      }
    }

    const countries = globalNokos.cachedCountries[serviceId] || [];
    if (countries.length === 0) return ctx.editMessageCaption("❌ Negara tidak tersedia.", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{text: "🔙 Kembali", callback_data: "choose_service"}]] } });

    const slice = countries.slice(0, 20);
    
    const buttons = slice.map(c => [{
      text: `${c.name} (${c.stock_total})`,
      callback_data: `country_${serviceId}_${c.iso_code}_${c.number_id}`
    }]);

    buttons.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "choose_service", style: "danger" }]);

    await ctx.editMessageCaption(`<b>🌍 𝗣𝗜𝗟𝗜𝗛 𝗡𝗘𝗚𝗔𝗥𝗔</b>\nLayanan ID: ${serviceId}`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {
    ctx.answerCbQuery("Error memuat negara");
  }
})

bot.action(/country_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, serviceId, iso, numberId] = ctx.match;
  const apiKey = config.RUMAHOTP;
  const untung = config.UNTUNG_NOKOS || 500;

  await ctx.editMessageCaption("⏳ <b>Memuat harga...</b>", { parse_mode: "HTML" }).catch(() => {});

  try {
    let countryData = globalNokos.cachedCountries[serviceId]?.find(c => String(c.number_id) === String(numberId));
    
    if (!countryData) {
       const res = await axios.get(`https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`, { headers: { "x-apikey": apiKey } });
       countryData = res.data.data.find(c => String(c.number_id) === String(numberId));
    }

    if (!countryData) return ctx.answerCbQuery("Negara data error");

    const providers = (countryData.pricelist || [])
      .filter(p => p.available && p.stock > 0)
      .map(p => {
        const finalPrice = (parseInt(p.price) || 0) + untung;
        return { ...p, finalPrice };
      })
      .sort((a, b) => a.finalPrice - b.finalPrice);

    if (providers.length === 0) return ctx.editMessageCaption("❌ Stok kosong untuk negara ini.", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{text: "🔙 Kembali", callback_data: `service_${serviceId}`}]] } });

    const buttons = providers.map(p => [{
      text: `${toRupiah(p.finalPrice)} (Stok: ${p.stock})`,
      callback_data: `buy_nokos_${numberId}_${p.provider_id}_${serviceId}_${p.finalPrice}`
    }]);

    buttons.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: `service_${serviceId}` }]);

    await ctx.editMessageCaption(`<b>💵 𝗣𝗜𝗟𝗜𝗛 𝗛𝗔𝗥𝗚𝗔</b>\n𝗡𝗲𝗴𝗮𝗿𝗮 : ${countryData.name}\n\n𝗣𝗶𝗹𝗶𝗵 𝗛𝗮𝗿𝗴𝗮 𝗬𝗮𝗻𝗴 𝗞𝗮𝗺𝘂 𝗠𝗮𝘂 :`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });

  } catch (e) {
    ctx.answerCbQuery("Gagal memuat harga");
  }
})

bot.action(/buy_nokos_(.+)_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, numberId, providerId, serviceId, price] = ctx.match;
  
  const buttons = [
    [{ text: "✅ 𝗞𝗼𝗻𝗳𝗶𝗿𝗺𝗮𝘀𝗶 𝗢𝗿𝗱𝗲𝗿 (𝗥𝗮𝗻𝗱𝗼𝗺 𝗢𝗽𝗲𝗿𝗮𝘁𝗼𝗿)", callback_data: `confirm_nokos_${numberId}_${providerId}_${serviceId}_any_${price}`, style: "success" }],
    [{ text: "📡 𝗣𝗶𝗹𝗶𝗵 𝗢𝗽𝗲𝗿𝗮𝘁𝗼𝗿 𝗧𝗲𝗿𝘁𝗲𝗻𝘁𝘂", callback_data: `operator_${numberId}_${providerId}_${serviceId}_${price}`, style: "primary" }],
    [{ text: "🔙 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "choose_service", style: "danger" }]
  ];

  await ctx.editMessageCaption(`<b>🛒 𝗞𝗢𝗡𝗙𝗢𝗥𝗠𝗔𝗦𝗜 𝗢𝗥𝗗𝗘𝗥</b>\n└⌑ 💰 𝖧𝖺𝗋𝗀𝖺 : ${toRupiah(price)}\n\n𝖫𝖺𝗇𝗃𝗎𝗍𝗄𝖺𝗇 𝖮𝗋𝖽𝖾𝗋`, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons }
  });
})

bot.action(/operator_(.+)_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, numberId, providerId, serviceId, price] = ctx.match;
  const apiKey = config.RUMAHOTP;

  try {
     const countryData = globalNokos.cachedCountries[serviceId]?.find(c => String(c.number_id) === String(numberId));
     if (!countryData) return ctx.answerCbQuery("Data negara hilang, ulangi dari awal.");

     const res = await axios.get(`https://www.rumahotp.com/api/v2/operators?country=${encodeURIComponent(countryData.name)}&provider_id=${providerId}`, { headers: { "x-apikey": apiKey } });
     
     const ops = res.data.data || [];
     if(ops.length === 0) return ctx.answerCbQuery("Operator spesifik tidak tersedia, gunakan random.");

     const buttons = ops.map(op => [{
        text: op.name,
        callback_data: `confirm_nokos_${numberId}_${providerId}_${serviceId}_${op.id}_${price}`
     }]);
     buttons.push([{text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: `buy_nokos_${numberId}_${providerId}_${serviceId}_${price}`, style: "danger"}]);

     await ctx.editMessageCaption(`<b>📡 𝗣𝗜𝗟𝗜𝗛 𝗢𝗣𝗘𝗥𝗔𝗧𝗢𝗥</b>\n└⌑ 𝖯𝗋𝗈𝗏𝗂𝖽𝖾𝗋 𝖨𝖣 : ${providerId}`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
     });

  } catch(e) {
     ctx.answerCbQuery("Gagal load operator");
  }
})

bot.action(/confirm_nokos_(.+)_(.+)_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, numberId, providerId, serviceId, operatorId, priceStr] = ctx.match;
  const price = parseInt(priceStr);
  const userId = ctx.from.id;
  const apiKey = config.RUMAHOTP;

  const saldoData = JSON.parse(fs.readFileSync("./database/saldoOtp.json", "utf8") || "{}");
  const userSaldo = saldoData[userId] || 0;

  if (userSaldo < price) {
    return ctx.answerCbQuery("🚫 𝗦𝗮𝗹𝗱𝗼 𝗞𝗮𝗺𝘂 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴 𝗥𝗽.𝟬, 𝗝𝗮𝗱𝗶 𝗗𝗲𝗽𝗼𝘀𝗶𝘁 𝗧𝗲𝗿𝗹𝗲𝗯𝗶𝗵 𝗗𝗮𝗵𝘂𝗹𝘂.", { show_alert: true });
  }

  await ctx.editMessageCaption("⏳ <b>𝗦𝗲𝗱𝗮𝗻𝗴 𝗠𝗲𝗺𝗽𝗿𝗼𝘀𝗲𝘀 𝗣𝗲𝗺𝗯𝗲𝗹𝗶𝗮𝗻...</b>", { parse_mode: "HTML" }).catch(()=>{});

  try {
    saldoData[userId] = userSaldo - price;
    fs.writeFileSync("./database/saldoOtp.json", JSON.stringify(saldoData, null, 2));

    let url = `https://www.rumahotp.com/api/v2/orders?number_id=${numberId}&provider_id=${providerId}`;
    if (operatorId && operatorId !== 'any') {
        url += `&operator_id=${operatorId}`;
    }
    
    const res = await axios.get(url, { headers: { "x-apikey": apiKey } });

    if (!res.data.success) {
      saldoData[userId] += price;
      fs.writeFileSync("./database/saldoOtp.json", JSON.stringify(saldoData, null, 2));
      
      const errMsg = res.data.message || res.data.msg || "Stok habis atau gangguan provider";
      
      return ctx.editMessageCaption(`❌ <b>𝗢𝗿𝗱𝗲𝗿 𝗚𝗮𝗴𝗮𝗹 :</b> ${errMsg}\n└⌑ 𝖲𝖺𝗅𝖽𝗈 𝖡𝖾𝗋𝗁𝖺𝗌𝗂𝗅 𝖣𝗂𝗄𝖾𝗆𝖻𝖺𝗅𝗂𝗄𝖺𝗇`, { 
          parse_mode: "HTML", 
          reply_markup: { inline_keyboard: [[{text:"🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data:"choose_service", style: "danger"}]] } 
      });
    }

    const d = res.data.data;
    
    globalNokos.activeOrders[d.order_id] = {
      userId,
      price,
      messageId: ctx.callbackQuery.message.message_id,
      startTime: Date.now()
    };

    const text = `✅ <b>𝗢𝗥𝗗𝗘𝗥 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟</b>\n├⌑ 🆔 𝖨𝖣 : <code>${d.order_id}</code>\n├⌑ 📞 𝖭𝗈𝗆𝗈𝗋: <code>${d.phone_number}</code>\n├⌑ 📱 𝖠𝗉𝗉𝗌 : ${d.service}\n├⌑ 💰 𝖧𝖺𝗋𝗀𝖺 : ${toRupiah(price)}\n└⌑ ⏳ 𝖲𝗍𝖺𝗍𝗎𝗌 : Menunggu 𝖪𝗈𝖽𝖾 𝖲𝖬𝖲...`;

    await ctx.editMessageCaption(text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📩 𝗖𝗲𝗸 𝗦𝗠𝗦", callback_data: `check_sms_${d.order_id}` }],
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻", callback_data: `cancel_sms_${d.order_id}` }]
        ]
      }
    });

  } catch (e) {
    console.error("Order Error:", e);
    const saldoCurrent = JSON.parse(fs.readFileSync("./database/saldoOtp.json", "utf8") || "{}");
    saldoCurrent[userId] = (saldoCurrent[userId] || 0) + price;
    fs.writeFileSync("./database/saldoOtp.json", JSON.stringify(saldoCurrent, null, 2));

    ctx.editMessageCaption(`❌ <b>𝗦𝘆𝘀𝘁𝗲𝗺 𝗘𝗿𝗿𝗼𝗿 :</b> ${e.message}\n└⌑ 𝖲𝖺𝗅𝖽𝗈 𝖡𝖾𝗋𝗁𝖺𝗌𝗂𝗅 𝖣𝗂𝗄𝖾𝗆𝖻𝖺𝗅𝗂𝗄𝖺𝗇.`);
  }
})

bot.action(/check_sms_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const apiKey = config.RUMAHOTP;

  try {
    const res = await axios.get(`https://www.rumahotp.com/api/v1/orders/get_status?order_id=${orderId}`, {
       headers: { "x-apikey": apiKey }
    });

    const d = res.data.data;
    if (d.status === "completed" || (d.otp_code && d.otp_code !== "-")) {
       await ctx.editMessageCaption(`✅ <b>𝗦𝗠𝗦 𝗗𝗜𝗧𝗘𝗥𝗜𝗠𝗔!</b>\n├⌑ 📞 𝖭𝗈𝗆𝗈𝗋 : <code>${d.phone_number}</code>\n├⌑ 💬 <b>𝖮𝖳𝖯 :</b> <code>${d.otp_code}</code>\n└⌑ ⏳ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖳𝗋𝖺𝗇𝗌𝖺𝗄𝗌𝗂 𝖲𝖾𝗅𝖾𝗌𝖺𝗂.`, { parse_mode: "HTML" });
       delete globalNokos.activeOrders[orderId];
    } else if (d.status === 'processing') {
       await ctx.answerCbQuery("⏳ 𝗦𝗠𝗦 𝗕𝗲𝗹𝘂𝗺 𝗠𝗮𝘀𝘂𝗸, 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗖𝗼𝗯𝗮 𝗟𝗮𝗴𝗶", { show_alert: false });
    } else {
       await ctx.editMessageCaption(`ℹ️ 𝗦𝘁𝗮𝘁𝘂𝘀 𝗢𝗿𝗱𝗲𝗿 : ${d.status}
<blockquote><b>Silahkan klik sms ulang untung mengecek sms, dimohon untuk tidak spam!!</blockquote></b>`, { parse_mode: "HTML",
reply_markup: {
        inline_keyboard: [
          [{ text: "📩 𝗖𝗲𝗸 𝗦𝗠𝗦 𝘂𝗹𝗮𝗻𝗴", callback_data: `check_sms_${d.order_id}` }],
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻", callback_data: `cancel_sms_${d.order_id}` }]
        ]
      }});
    }
  } catch(e) {
    ctx.answerCbQuery("Gagal cek status [ Ulangi Cek SMS ]");
  }
})

bot.action(/cancel_sms_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const apiKey = config.RUMAHOTP;
  const userId = ctx.from.id;

  const orderInfo = globalNokos.activeOrders[orderId];
  if (orderInfo && (Date.now() - orderInfo.startTime < 300000)) {
      return ctx.answerCbQuery("⏳ Tunggu 5 menit baru bisa cancel!", { show_alert: true });
  }

  try {
    const res = await axios.get(`https://www.rumahotp.com/api/v1/orders/set_status?order_id=${orderId}&status=cancel`, {
       headers: { "x-apikey": apiKey }
    });

    if (res.data.success) {
       if (orderInfo) {
          const saldoData = JSON.parse(fs.readFileSync("./database/saldoOtp.json", "utf8"));
          saldoData[userId] = (saldoData[userId] || 0) + orderInfo.price;
          fs.writeFileSync("./database/saldoOtp.json", JSON.stringify(saldoData, null, 2));
          delete globalNokos.activeOrders[orderId];
       }
       await ctx.editMessageCaption("✅ <b>Order Dibatalkan & Saldo Direfund.</b>", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{text:"🔙 Menu", callback_data:"choose_service", style: "danger"}]] } });
    } else {
       ctx.answerCbQuery("Gagal cancel: " + res.data.message);
    }
  } catch(e) {
    ctx.answerCbQuery("Error cancel");
  }
})

bot.action("topup_nokos", async (ctx) => {
    if (ctx.chat.type !== 'private') {
        return ctx.reply("❌ Menu deposit hanya bisa diakses via Private Chat (PC).", {
            reply_markup: {
                inline_keyboard: [[{ text: "📩 𝗖𝗵𝗮𝘁 𝗕𝗼𝘁 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", url: `https://t.me/${ctx.botInfo.username}` }]]
            }
        });
    }

    const userId = ctx.from.id;
    userState[userId] = { step: "WAITING_TOPUP_RUMAHOTP" };

    await editMenuMessage(ctx, 
        `💰 <b>𝗗𝗘𝗣𝗢𝗦𝗜𝗧 𝗦𝗔𝗟𝗗𝗢</b>\n\nSilakan masukkan nominal deposit (Hanya Angka).\nMinimal: Rp 2.000\n\nContoh: <code>2000</code>`, 
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗗𝗲𝗽𝗼𝘀𝗶𝘁", callback_data: "shop_menu", style: "danger" }]
                ]
            }
        }
    );
})

bot.action(/batal_depo_rumahotp_(.+)/, async (ctx) => {
   const depoId = ctx.match[1];
   const apiKey = config.RUMAHOTP;
   try {
     await axios.get(`https://www.rumahotp.com/api/v1/deposit/cancel?deposit_id=${depoId}`, { headers: { "x-apikey": apiKey } });
     await ctx.deleteMessage();
     await ctx.reply("✅ Deposit dibatalkan.", {reply_markup: {inline_keyboard: [[{text:"🔙 Menu", callback_data:"shop_menu", style: "danger"}]]}});
   } catch(e) {
     ctx.answerCbQuery("Gagal batal");
   }
})

bot.action(/smm_services_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await ctx.answerCbQuery("⏳ Memuat layanan...").catch(()=>{});
    
    const res = await callSmmApi('/services'); 
    
    let services = [];
    if (res.status === true && res.data) services = res.data;
    else if (Array.isArray(res)) services = res;
    else if (res.services) services = res.services;

    if (!services || services.length === 0) {
        return ctx.reply("❌ Gagal mengambil layanan. Cek Config API ID/Key.");
    }

    const categories = [...new Set(services.map(s => s.category))];
    const perPage = 5;
    const paginated = categories.slice(page * perPage, (page + 1) * perPage);

    const buttons = paginated.map((cat) => [
        Markup.button.callback(`📂 ${cat}`, `smm_cat_${categories.indexOf(cat)}_0`)
    ]);

    const nav = [];
    if (page > 0) nav.push(Markup.button.callback('⬅️ 𝗣𝗿𝗲𝘃', `smm_services_${page - 1}`));
    if ((page + 1) * perPage < categories.length) nav.push(Markup.button.callback('Next ➡️', `smm_services_${page + 1}`));
    if (nav.length > 0) buttons.push(nav);
    buttons.push([Markup.button.callback('🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶', 'smm_menu')]);

    await editMenuMessage(ctx, "<b>📂 𝗣𝗜𝗟𝗜𝗛 𝗞𝗔𝗧𝗘𝗚𝗢𝗥𝗜 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 :</b>", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
    });
})

bot.action(/smm_cat_(\d+)_(\d+)/, async (ctx) => {
    const catIndex = parseInt(ctx.match[1]);
    const page = parseInt(ctx.match[2]);
    
    const res = await callSmmApi('/services');
    let services = res.data || res.services || (Array.isArray(res) ? res : []);
    
    const categories = [...new Set(services.map(s => s.category))];
    const targetCat = categories[catIndex];
    const filtered = services.filter(s => s.category === targetCat);
    
    const perPage = 5;
    const paginated = filtered.slice(page * perPage, (page + 1) * perPage);

    let text = `<b>📦 𝖪𝖠𝖳𝖤𝖦𝖮𝖱𝖨 : ${targetCat}</b>\n\n`;
    const buttons = paginated.map(s => {
        text += `🆔 <b>𝖨𝖣 : ${s.id}</b>\n🏷 ${s.name}\n💰 ${toRupiah(s.price)}/1000\nMin: ${s.min} | Max: ${s.max}\n\n`;
        return [Markup.button.callback(`𝖡𝖾𝗅𝗂 𝖨𝖣: ${s.id}`, `smm_buy_${s.id}`)];
    });

    const nav = [];
    if (page > 0) nav.push(Markup.button.callback('⬅️ 𝗣𝗿𝗲𝘃', `smm_cat_${catIndex}_${page - 1}`));
    if ((page + 1) * perPage < filtered.length) nav.push(Markup.button.callback('Next ➡️', `smm_cat_${catIndex}_${page + 1}`));
    if (nav.length > 0) buttons.push(nav);
    buttons.push([Markup.button.callback('🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶', `smm_services_0`)]);

    try { await ctx.deleteMessage(); } catch(e){}
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
})

bot.action(/smm_buy_(\d+)/, async (ctx) => {
    const serviceId = ctx.match[1];
    userState[ctx.from.id] = { step: "SMM_WAITING_LINK", serviceId: serviceId };
    
    await editMenuMessage(ctx, 
        `🔗 <b>𝗦𝗜𝗟𝗔𝗛𝗞𝗔𝗡 𝗞𝗜𝗥𝗜𝗠 𝗟𝗜𝗡𝗞 𝗧𝗔𝗥𝗚𝗘𝗧</b>\n\n☘︎ Silakan kirim link/username target untuk layanan ID <b>${serviceId}</b>.\n\n<i>Ketik /batal untuk membatalkan.</i>`, 
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[Markup.button.callback('❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻', 'smm_menu')]] }
        }
    );
})

bot.action("smm_history", async (ctx) => {
    const history = getSmmHistory(ctx.from.id);
    if (history.length === 0) return ctx.answerCbQuery("Belum ada riwayat.", { show_alert: true });

    let msg = "<b>📜 𝟱 𝗥𝗜𝗪𝗔𝗬𝗔𝗧 𝗧𝗘𝗥𝗔𝗞𝗛𝗜𝗥</b>\n\n";
    history.slice(0, 5).forEach(h => {
        msg += `🆔 <b>#${h.orderId}</b>\n📦 ${h.serviceName}\n💰 ${h.price}\n📅 ${h.date}\n\n`;
    });

    await editMenuMessage(ctx, msg, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 Kembali', 'smm_menu')]] }
    });
})

bot.action("smm_check_status", (ctx) => {
    userState[ctx.from.id] = { step: "SMM_WAITING_STATUS_ID" };
    ctx.reply("🔍 <b>Kirim ID Pesanan:</b>", { 
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[Markup.button.callback('❌ Batal', 'smm_menu')]] } 
    });
})

bot.action("smm_exec_order", async (ctx) => {
    const userId = ctx.from.id;
    const pending = userState[userId]?.pendingOrder;

    if (!pending) {
        return ctx.answerCbQuery("❌ Sesi habis, ulangi pesanan.", { show_alert: true });
    }

    const dbSaldoPath = "./database/saldoOtp.json";
    const saldoData = JSON.parse(fs.readFileSync(dbSaldoPath, "utf8") || "{}");
    const userSaldo = saldoData[userId] || 0;

    if (userSaldo < pending.price) {
        return ctx.answerCbQuery("❌ Saldo tidak cukup!", { show_alert: true });
    }

    await ctx.editMessageText("⏳ <b>Memproses pesanan...</b>", { parse_mode: "HTML" });

    const orderRes = await callSmmApi('/order', {
        service: pending.serviceId,
        target: pending.target,
        quantity: pending.quantity
    });

    if (orderRes.status === true) {
        saldoData[userId] = userSaldo - pending.price;
        fs.writeFileSync(dbSaldoPath, JSON.stringify(saldoData, null, 2));

        const orderId = orderRes.order;
        saveSmmHistory(userId, {
            orderId: orderId, 
            serviceName: pending.serviceName,
            price: toRupiah(pending.price),
            date: new Date().toLocaleString("id-ID")
        });

        await ctx.editMessageText(
            `✅ <b>𝗢𝗥𝗗𝗘𝗥 𝗦𝗨𝗞𝗦𝗘𝗦!</b>\n` +
            `├⌑ 🆔 <b>𝖨𝖣 𝖮𝗋𝖽𝖾𝗋 :</b> <code>${orderId}</code>\n` +
            `├⌑ 📦 <b>𝖫𝖺𝗒𝖺𝗇𝖺𝗇 :</b> ${pending.serviceName}\n` +
            `├⌑ 💰 <b>𝖧𝖺𝗋𝗀𝖺 :</b> ${toRupiah(pending.price)}\n` +
            `└⌑ 📉 <b>𝖲𝗂𝗌𝖺 𝖲𝖺𝗅𝖽𝗈:</b> ${toRupiah(saldoData[userId])}`,
            { 
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: [[{ text: "🔙 Kembali ke Menu", callback_data: "smm_menu", style: "danger" }]] }
            }
        );
    } else {
        const errorMsg = orderRes.msg || "Gagal memproses order.";
        await ctx.editMessageText(
            `❌ <b>𝗢𝗥𝗗𝗘𝗥 𝗚𝗔𝗚𝗔𝗟!</b>\n└⌑ Alasan: ${errorMsg}\n\n<i>Saldo tidak terpotong.</i>`,
            { 
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: [[{ text: "🔙 𝗖𝗼𝗯𝗮 𝗟𝗮𝗴𝗶", callback_data: "smm_menu", style: "danger" }]] }
            }
        );
    }
    
    delete userState[userId];
})

// ========== OWNER MENU UNTUK GAME ==========
bot.action("add_game", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  userState[ctx.from.id] = { step: "WAITING_GAME_TEXT" };
  safeReply(ctx, "<blockquote><b>🎮 𝗔𝗗𝗗 𝗔𝗞𝗨𝗡 𝗚𝗔𝗠𝗘</b>\n\nKirim data dengan format:\n<code>nama game|game type|harga|deskripsi|link foto</code>\n\n<b>Contoh:</b>\n<code>Free Fire Akun Pro|freefire|50000|Akun pro skin lengkap|https://example.com/foto.jpg</code>\n\n<b>Game Type:</b> freefire, mobilelegends, roblox</blockquote>", { parse_mode: "HTML" });
})

bot.action("del_game", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const gamesDB = readGamesDB();
  if (gamesDB.length === 0) return ctx.editMessageText("Belum ada akun game.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]));

  const buttons = gamesDB.map((game, i) => [Markup.button.callback(`❌ ${game.name} (${game.gameType})`, `delete_game_${i}`)]);
  buttons.push([Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner")]);
  ctx.editMessageText("<blockquote><b>🗑️ 𝗣𝗶𝗹𝗶𝗵 𝗔𝗸𝘂𝗻 𝗚𝗮𝗺𝗲 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗗𝗶𝗵𝗮𝗽𝘂𝘀 :</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
})

bot.action(/delete_game_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const idx = parseInt(ctx.match[1]);
  const gamesDB = readGamesDB();
  const game = gamesDB[idx];
  if (!game) {
    ctx.answerCbQuery("❌ Game tidak ditemukan.");
    return showOwnerMenu(ctx);
  }
  gamesDB.splice(idx, 1);
  saveGamesDB(gamesDB);
  ctx.answerCbQuery(`✅ Game ${game?.name || 'Item'} berhasil dihapus.`);
  showOwnerMenu(ctx);
})

bot.action("list_games", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const gamesDB = readGamesDB();
  if (gamesDB.length === 0) return safeReply(ctx, "Tidak ada akun game.");
  
  gamesDB.forEach((game, i) => {
    const stock = game.accounts ? game.accounts.length : 0;
    const text = `<blockquote><b>🎮 ${game.name}</b>\n<b>├⌑ 🎮 𝖳𝗂𝗉𝖾 :</b> ${game.gameType}\n<b>├⌑ 💰 𝖧𝖺𝗋𝗀𝖺 :</b> ${toRupiah(game.price)}\n<b>├⌑ 📦 𝖲𝗍𝗈𝖼𝗄 :</b> ${stock}\n<b>└⌑ 📝 𝖣𝖾𝗌𝗄𝗋𝗂𝗉𝗌𝗂 :</b> ${game.description || ''}</blockquote>`;
    const buttons = [
      [ Markup.button.callback("📄 𝗟𝗶𝘀𝘁 𝗔𝗰𝗰𝗼𝘂𝗻𝘁", `list_game_accounts_${i}`) ],
      [ Markup.button.callback("➕ 𝗧𝗮𝗺𝗯𝗮𝗵 𝗔𝗸𝘂𝗻", `add_account_to_game_${i}`) ]
    ];
    safeReply(ctx, text, { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
  });
})

bot.action(/list_game_accounts_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const idx = parseInt(ctx.match[1]);
  const gamesDB = readGamesDB();
  const game = gamesDB[idx];
  if (!game) return ctx.answerCbQuery("❌ Game tidak ditemukan.");
  const accounts = game.accounts || [];
  let txt = `<b>📄 List Accounts - ${game.name}</b>\n<b>Stock:</b> ${accounts.length}\n\n`;
  if (!accounts.length) txt += "<i>Belum ada akun.</i>\n";
  accounts.forEach((a, i) => {
    txt += `<b>${i+1}.</b> Email: ${a.email} | Pass: ${a.password}\n`;
  });
  safeReply(ctx, txt, { parse_mode: "HTML" });
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/add_account_to_game_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const idx = parseInt(ctx.match[1]);
  const gamesDB = readGamesDB();
  if (!gamesDB[idx]) return ctx.answerCbQuery("❌ Game tidak ditemukan.");
  userState[ctx.from.id] = { step: "WAITING_GAME_ACCOUNT", gameIndex: idx };
  safeReply(ctx, "<blockquote><b>✏️ Kirim akun game dengan format:</b>\n<code>email|password|additional info</code>\n\n<b>Contoh:</b>\n<code>player123@gmail.com|password123|Level 100, Skin Pro</code></blockquote>", { parse_mode: "HTML" });
  ctx.answerCbQuery().catch(()=>{});
})
// ========== END OWNER MENU GAME ==========

bot.action("add_script", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  userState[ctx.from.id] = { step: "WAITING_SCRIPT_FILE" };
  safeReply(ctx, `<blockquote><b>📥 𝗖𝗔𝗥𝗔 𝗠𝗘𝗡𝗔𝗠𝗕𝗔𝗛𝗞𝗔𝗡 𝗦𝗖𝗥𝗜𝗣𝗧</b>\n<b>├⌑ 𝖪𝗂𝗋𝗂𝗆 𝖥𝗂𝗅𝖾 𝖲𝖼𝗋𝗂𝗉𝗍 (𝖶𝖺𝗃𝗂𝖻 .𝗓𝗂𝗉) </b>\n<b>└⌑ 𝖩𝗂𝗄𝖺 𝖲𝗎𝖽𝖺𝗁, 𝖡𝗈𝗍 𝖠𝗄𝖺𝗇 𝖬𝖾𝗆𝗂𝗇𝗍𝖺 𝖣𝖾𝗍𝖺𝗂𝗅 𝖲𝖼𝗋𝗂𝗉𝗍</b></blockquote>`,
    { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 𝗕𝗮𝘁𝗮𝗹 𝗠𝗲𝗻𝗮𝗺𝗯𝗮𝗵𝗸𝗮𝗻 𝗦𝗰𝗿𝗶𝗽𝘁", "menu_owner")]]) }
  );
})

bot.action("add_app", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  userState[ctx.from.id] = { step: "WAITING_APP_TEXT" };
  safeReply(ctx, "<blockquote><b>✏️ 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗶𝗿𝗶𝗺 𝗔𝗽𝗽𝘀 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗗𝗲𝗻𝗴𝗮𝗻 𝗙𝗼𝗿𝗺𝗮𝘁 :</b>\n<code>└⌑ 𝖭𝖺𝗆𝖺 | 𝖧𝖺𝗋𝗀𝖺 | 𝖣𝖾𝗌𝗄𝗋𝗂𝗉𝗌𝗂</code>\n\n<b>🍂 𝖤𝗑𝖺𝗆𝗉𝗅𝖾 :</b>\n<code>𝖢𝖠𝖭𝖵𝖠 𝖯𝖱𝖮 | 𝟥𝟢𝟢𝟢 | 𝖠𝗄𝗌𝖾𝗌 𝖯𝗋𝖾𝗆𝗂𝗎𝗆 𝖠𝖼𝗍𝗂𝗏𝖾</code></blockquote>", { parse_mode: "HTML" });
})

bot.action("del_script", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const db = readDb();
  if (db.scripts.length === 0) return ctx.editMessageText("Belum ada produk script.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]));

  const buttons = db.scripts.map((sc, i) => [Markup.button.callback(`❌ ${sc.nama}`, `delete_sc_${i}`)]);
  buttons.push([Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner")]);
  ctx.editMessageText("<blockquote><b>🗑️ 𝗣𝗶𝗹𝗶𝗵 𝗦𝗰𝗿𝗶𝗽𝘁 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗔𝗻𝗱𝗮 𝗛𝗮𝗽𝘂𝘀 :</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) })
    .catch(() => {
      safeReply(ctx, "<blockquote><b>🗑️ 𝗣𝗶𝗹𝗶𝗵 𝗦𝗰𝗿𝗶𝗽𝘁 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗔𝗻𝗱𝗮 𝗛𝗮𝗽𝘂𝘀 :</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
    });
})

bot.action("del_app", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const db = readDb();
  if ((db.apps || []).length === 0) return ctx.editMessageText("Belum ada app.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]));

  const buttons = db.apps.map((a, i) => [Markup.button.callback(`❌ ${a.nama}`, `delete_app_${i}`)]);
  buttons.push([Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner")]);
  ctx.editMessageText("<blockquote><b>🗑️ 𝗣𝗶𝗹𝗶𝗵 𝗔𝗽𝗽𝘀 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗗𝗶𝗵𝗮𝗽𝘂𝘀 :</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
})

bot.action("list_apps", (ctx) => {
  const db = readDb();
  if ((db.apps || []).length === 0) return safeReply(ctx, "Tidak ada app.");
  const isOwner = ctx.from.id === config.ownerId;
  db.apps.forEach((x, i) => {
    const stock = (x.accounts || []).length;
    const text = `<blockquote><b>📱 ${x.nama}</b>\n<b>├⌑ 💰 𝖧𝖺𝗋𝗀𝖺 :</b> ${toRupiah(x.harga)}\n<b>└⌑ 📦 𝖲𝗍𝗈𝖼𝗄 :</b> ${stock}\n${x.deskripsi || ''}</blockquote>`;
    const buttons = [];
    if (isOwner) {
      buttons.push([ Markup.button.callback("📄 𝗟𝗶𝘀𝘁 𝗔𝗰𝗰𝗼𝘂𝗻𝘁", `list_accounts_${i}`) ]);
    }
    safeReply(ctx, text, { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
  });
})

bot.action("buyvps_pay_qris", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_pay_qris')) return;
  
  const userId = ctx.from.id;
  
  if (!userState[userId]?.vpsData) {
    return ctx.answerCbQuery("❌ 𝗗𝗮𝘁𝗮 𝗩𝗽𝘀 𝗧𝗶𝗱𝗮𝗸 𝗗𝗶𝘁𝗲𝗺𝘂𝗸𝗮𝗻!", { show_alert: true });
  }

  const vpsData = userState[userId].vpsData;
  const nominal = vpsData.harga;
  const itemName = `VPS ${vpsData.paket.toUpperCase()} - ${vpsData.plan} - ${vpsData.region}`;

  await handlePayment(ctx, nominal, itemName, {
    type: "vps",
    vpsData: vpsData
  });
})

bot.action(/buy_sc_(\d+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_sc')) return;
  
  const index = parseInt(ctx.match[1]);
  const db = readDb();
  const item = db.scripts[index];
  if (!item || !item.file_id) return safeReply(ctx, "Script tidak ditemukan/file hilang.");
  
  await handlePayment(ctx, item.harga, "Script: " + item.nama, {
    type: "script",
    index: index
  });
})

bot.action(/buy_app_(\d+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_app')) return;
  
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  const stock = (app.accounts || []).length;
  if (stock <= 0) return ctx.answerCbQuery("❌ Stock habis.");

  userState[ctx.from.id] = {
    step: "PURCHASE_APP",
    appIndex: idx,
    qty: 1,
    message: null
  };

  const base = parseInt(app.harga) || 0;
  const qty = 1;
  const total = calcTotalPrice(base, qty);
  const caption = renderPurchaseText(app, qty, total);
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [ 
          { text: "➖", callback_data: `app_qty_minus_${idx}` }, 
          { text: `${qty}`, callback_data: `app_qty_show_${idx}` }, 
          { text: "➕", callback_data: `app_qty_plus_${idx}` } 
        ],
        [ { text: "🛒 𝗢𝗿𝗱𝗲𝗿 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", callback_data: `app_buy_now_${idx}` } ],
        [ { text: "🔙 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "back_home" } ]
      ]
    }
  };

  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    ...keyboard
  });
  
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/app_qty_minus_(\d+)/, async (ctx) => {
  const uid = ctx.from.id;
  const idx = parseInt(ctx.match[1]);
  if (!userState[uid] || userState[uid].step !== "PURCHASE_APP" || userState[uid].appIndex !== idx) {
    userState[uid] = { step: "PURCHASE_APP", appIndex: idx, qty: 1, message: null };
  }
  const db = readDb();
  const app = db.apps[idx];
  if (!app) {
    ctx.answerCbQuery("🚫 𝗔𝗽𝗽𝘀 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗧𝗶𝗱𝗮𝗸 𝗗𝗶𝘁𝗲𝗺𝘂𝗸𝗮𝗻.");
    return;
  }
  userState[uid].qty = Math.max(1, (userState[uid].qty || 1) - 1);
  const qty = userState[uid].qty;
  const base = parseInt(app.harga) || 0;
  const stock = (app.accounts || []).length;
  if (qty > stock) userState[uid].qty = stock;
  const total = calcTotalPrice(base, userState[uid].qty);
  const caption = renderPurchaseText(app, userState[uid].qty, total);

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [ 
          { text: "➖", callback_data: `app_qty_minus_${idx}` }, 
          { text: `${userState[uid].qty}`, callback_data: `app_qty_show_${idx}` }, 
          { text: "➕", callback_data: `app_qty_plus_${idx}` } 
        ],
        [ { text: "🛒 Buy Now", callback_data: `app_buy_now_${idx}` } ],
        [ { text: "🔙 Batal", callback_data: "back_home" } ]
      ]
    }
  };

  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    ...keyboard
  });
  
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/app_qty_plus_(\d+)/, async (ctx) => {
  const uid = ctx.from.id;
  const idx = parseInt(ctx.match[1]);
  if (!userState[uid] || userState[uid].step !== "PURCHASE_APP" || userState[uid].appIndex !== idx) {
    userState[uid] = { step: "PURCHase_APP", appIndex: idx, qty: 1, message: null };
  }
  const db = readDb();
  const app = db.apps[idx];
  if (!app) {
    ctx.answerCbQuery("🚫 𝗔𝗽𝗽𝘀 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗧𝗶𝗱𝗮𝗸 𝗗𝗶𝘁𝗲𝗺𝘂𝗸𝗮𝗻");
    return;
  }
  const stock = (app.accounts || []).length;
  userState[uid].qty = (userState[uid].qty || 1) + 1;
  if (userState[uid].qty > stock) userState[uid].qty = stock;
  const total = calcTotalPrice(parseInt(app.harga) || 0, userState[uid].qty);
  const caption = renderPurchaseText(app, userState[uid].qty, total);

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [ 
          { text: "➖", callback_data: `app_qty_minus_${idx}` }, 
          { text: `${userState[uid].qty}`, callback_data: `app_qty_show_${idx}` }, 
          { text: "➕", callback_data: `app_qty_plus_${idx}` } 
        ],
        [ { text: "🛒 𝗢𝗿𝗱𝗲𝗿 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", callback_data: `app_buy_now_${idx}` } ],
        [ { text: "🔙 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "back_home" } ]
      ]
    }
  };

  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    ...keyboard
  });
  
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/app_qty_show_(\d+)/, (ctx) => {
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/app_buy_now_(\d+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'app_buy_now')) return;
  
  const uid = ctx.from.id;
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) return ctx.answerCbQuery("🚫 𝗔𝗽𝗽𝘀 𝗧𝗶𝗱𝗮𝗸 𝗗𝗶𝘁𝗲𝗺𝘂𝗸𝗮𝗻.");
  const stock = (app.accounts || []).length;
  const st = userState[uid];
  if (!st || st.step !== "PURCHASE_APP" || st.appIndex !== idx) {
    userState[uid] = { step: "PURCHASE_APP", appIndex: idx, qty: 1, message: null };
  }
  const qty = Math.max(1, userState[uid].qty || 1);
  if (qty > stock) return ctx.answerCbQuery("🚫 𝗝𝘂𝗺𝗹𝗮𝗵 𝗗𝗲𝗽𝗼𝘀𝗶𝘁 𝗠𝗲𝗹𝗲𝗯𝗶𝗵𝗶 𝗦𝘁𝗼𝗰𝗸.");
  const total = calcTotalPrice(parseInt(app.harga) || 0, qty);

  await handlePayment(ctx, total, `App: ${app.nama} x${qty}`, {
    type: "app",
    idx: idx,
    qty: qty,
    total: total
  });

  ctx.answerCbQuery().catch(()=>{});
})

bot.action("buy_reseller_vps", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_reseller_vps')) return;

  const harga = config.hargaResellerVps || 25000;

  await editMenuMessage(ctx,
    `<blockquote><b>🤝 𝗔𝗞𝗦𝗘𝗦 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥 𝗩𝗣𝗦</b>
━━━━━━━━━━━━━━━━━━━━━━━━
<b>💎 𝗞𝗲𝘂𝗻𝘁𝘂𝗻𝗴𝗮𝗻 𝗝𝗼𝗶𝗻 𝗥𝗲𝘀𝘀𝗲𝗹𝗲𝗿 𝗥𝗲𝘀𝗲𝗹𝗹𝗲𝗿 𝗩𝗣𝗦:</b>
├≫ Dapat Membuat VPS Sendiri 
├≫ 𝖡𝗂𝗌𝖺 𝖬𝖾𝗇𝗃𝗎𝖺𝗅 VPS
├≫ Pajak Per Create VPS 5.000 (Bisa Turun/Naik)
├≫ Anti PT PT Kalo DO Suspend
├≫ Pasti Balmod Besar
├≫ Pasti Diurus 100%
├≫ Disediakan 10 Droplet VPS
├≫ Bebas Create Ram VPS
├≫ Sudah Disediakan Bot Install & Subdomain

<b>💰 𝗛𝗮𝗿𝗴𝗮 𝗝𝗼𝗶𝗻 :</b> ${toRupiah(harga)}
<i>╰┈⸙ 𝖢𝗎𝗄𝗎𝗉 𝖡𝖺𝗒𝖺𝗋 𝖲𝖾𝗄𝖺𝗅𝗂 𝖲𝖺𝗃𝖺
𝖳𝖾𝗍𝖺𝗉𝗂 𝖣𝗎𝗋𝖺𝗌𝗂 𝖯𝖾𝗋𝗆𝖺𝗇𝖾𝗇</i>
━━━━━━━━━━━━━━━━━━━━━━
<b>🚀 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖳𝖾𝗄𝖺𝗇 𝖲𝖺𝗅𝖺𝗁 𝖲𝖺𝗍𝗎 𝖡𝗎𝗍𝗍𝗈𝗇
𝖣𝗂𝖻𝖺𝗐𝖺𝗁 𝖨𝗇𝗂 𝖴𝗇𝗍𝗎𝗄 𝖬𝖾𝗅𝖺𝗇𝗃𝗎𝗍𝗄𝖺𝗇 :</b></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ 𝗞𝗼𝗻𝗳𝗼𝗿𝗺𝗮𝘀𝗶 𝗢𝗿𝗱𝗲𝗿", callback_data: "pay_reseller_vps", style: "success" }],
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "shop_menu", style: "danger" }]
        ]
      }
    }
  );
})

bot.action("pay_reseller_vps", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'pay_reseller_vps')) return;

  const harga = config.hargaResellerVps || 25000;

  try { await ctx.deleteMessage(); } catch (e) {}

  await handlePayment(ctx, harga, "Join Reseller VPS", {
    type: "reseller_vps",
    price: harga
  });
})

bot.action("buy_ubot", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_ubot')) return;

  const harga = config.hargaUbot || 25000;

  await editMenuMessage(ctx,
    `<blockquote><b>🤖 𝗔𝗞𝗦𝗘𝗦 𝗨𝗕𝗢𝗧 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 </b>
━━━━━━━━━━━━━━━━━━━━━━━━
<b>💎 𝗞𝗲𝘂𝗻𝘁𝘂𝗻𝗴𝗮𝗻 𝗕𝘂𝘆 𝗨𝗯𝗼𝘁 𝗣𝗿𝗲𝗺𝗶𝘂𝗺:</b>
├≫ 𝖧𝖺𝗋𝗀𝖺 𝖳𝖾𝗋𝗃𝖺𝗇𝗀𝗄𝖺𝗎
├≫ 𝖡𝗂𝗌𝖺 Broadcast Secara Instant
├≫ 𝖡𝗂𝗌𝖺 Mempermudah Anda Untuk Berjualan
├≫ 𝖡anyak Fitur² Berguna
└≫ Bermodule 226

<b>💰 𝗛𝗮𝗿𝗴𝗮 𝗕𝘂𝘆 :</b> ${toRupiah(harga)}
<i>╰┈⸙ 𝖢𝗎𝗄𝗎𝗉 𝖡𝖺𝗒𝖺𝗋 𝖲𝖾𝗄𝖺𝗅𝗂 𝖲𝖺𝗃𝖺
𝖳𝖾𝗍𝖺𝗉𝗂 𝖣𝗎𝗋𝖺𝗌𝗂 𝖯𝖾𝗋𝗆𝖺𝗇𝖾𝗇</i>
━━━━━━━━━━━━━━━━━━━━━━
<b>🚀 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖳𝖾𝗄𝖺𝗇 𝖲𝖺𝗅𝖺𝗁 𝖲𝖺𝗍𝗎 𝖡𝗎𝗍𝗍𝗈𝗇
𝖣𝗂𝖻𝖺𝗐𝖺𝗁 𝖨𝗇𝗂 𝖴𝗇𝗍𝗎𝗄 𝖬𝖾𝗅𝖺𝗇𝗃𝗎𝗍𝗄𝖺𝗇 :</b></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ 𝗞𝗼𝗻𝗳𝗼𝗿𝗺𝗮𝘀𝗶 𝗢𝗿𝗱𝗲𝗿", callback_data: "pay_ubot", style: "success" }],
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "shop_menu", style: "danger" }]
        ]
      }
    }
  );
})

bot.action("pay_ubot", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'pay_ubot')) return;

  const harga = config.hargaUbot || 25000;

  try { await ctx.deleteMessage(); } catch (e) {}

  await handlePayment(ctx, harga, "Akses Ubot Premium", {
    type: "ubot_prem",
    price: harga
  });
})

bot.action("buy_reseller_panel_legal", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_reseller_panel_legal')) return;

  const harga = config.hargaResellerPanelLegal || 25000;

  await editMenuMessage(ctx,
    `<blockquote><b>🤝 𝗔𝗞𝗦𝗘𝗦 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥 𝗣𝗔𝗡𝗘𝗟 𝗟𝗘𝗚𝗔𝗟</b>
━━━━━━━━━━━━━━━━━━━━━━━━
<b>💎 𝗞𝗲𝘂𝗻𝘁𝘂𝗻𝗴𝗮𝗻 𝗝𝗼𝗶𝗻 𝗥𝗲𝘀𝘀𝗲𝗹𝗲𝗿 𝗣𝗮𝗻𝗲𝗹 𝗟𝗲𝗴𝗮𝗹:</b>
├≫ 𝖧𝖺𝗋𝗀𝖺 𝖳𝖾𝗋𝗃𝖺𝗇𝗀𝗄𝖺𝗎
├≫ 𝖡𝗂𝗌𝖺 𝖬𝖾𝗇𝗃𝗎𝖺𝗅 𝖯𝖺𝗇𝖾𝗅 Legal 𝖪𝖾𝗆𝖻𝖺𝗅𝗂
├≫ Panel Anti Mokad Atau Mati
├≫ Panel On 24Jam Nonstop
├≫ Menggunakan VPS NAT Bukan DO
├≫ Bisa Diperpanjang Masa Aktifnya
├≫ Anti Razia Razia an
└≫ 𝖩𝖺𝗆𝗂𝗇 𝖡𝖺𝗅𝗆𝗈𝖽 𝖪𝖺𝗅𝗈 𝖠𝖽𝖺 𝖴𝗌𝖺𝗁𝖺

<b>💰 𝗛𝗮𝗿𝗴𝗮 𝗝𝗼𝗶𝗻 :</b> ${toRupiah(harga)}
<i>╰┈⸙ 𝖢𝗎𝗄𝗎𝗉 𝖡𝖺𝗒𝖺𝗋 𝖲𝖾𝗄𝖺𝗅𝗂 𝖲𝖺𝗃𝖺
𝖳𝖾𝗍𝖺𝗉𝗂 𝖣𝗎𝗋𝖺𝗌𝗂 𝖯𝖾𝗋𝗆𝖺𝗇𝖾𝗇</i>
━━━━━━━━━━━━━━━━━━━━━━
<b>🚀 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖳𝖾𝗄𝖺𝗇 𝖲𝖺𝗅𝖺𝗁 𝖲𝖺𝗍𝗎 𝖡𝗎𝗍𝗍𝗈𝗇
𝖣𝗂𝖻𝖺𝗐𝖺𝗁 𝖨𝗇𝗂 𝖴𝗇𝗍𝗎𝗄 𝖬𝖾𝗅𝖺𝗇𝗃𝗎𝗍𝗄𝖺𝗇 :</b></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ 𝗞𝗼𝗻𝗳𝗼𝗿𝗺𝗮𝘀𝗶 𝗢𝗿𝗱𝗲𝗿", callback_data: "pay_reseller_panel_legal", style: "success" }],
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "shop_menu", style: "danger" }]
        ]
      }
    }
  );
})

bot.action("pay_reseller_panel_legal", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'pay_reseller_panel_legal')) return;

  const harga = config.hargaResellerPanelLegal || 25000;

  try { await ctx.deleteMessage(); } catch (e) {}

  await handlePayment(ctx, harga, "Akses Reseller Panel Legal", {
    type: "reseller_panel_legal",
    price: harga
  });
})

bot.action("buy_reseller_panel", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_reseller_panel')) return;

  const harga = config.hargaResellerPanel || 25000;

  await editMenuMessage(ctx,
    `<blockquote><b>🤝 𝗔𝗞𝗦𝗘𝗦 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥 𝗣𝗔𝗡𝗘𝗟</b>
━━━━━━━━━━━━━━━━━━━━━━━━
<b>💎 𝗞𝗲𝘂𝗻𝘁𝘂𝗻𝗴𝗮𝗻 𝗝𝗼𝗶𝗻 𝗥𝗲𝘀𝘀𝗲𝗹𝗲𝗿 𝗣𝗮𝗻𝗲𝗹:</b>
├≫ 𝖧𝖺𝗋𝗀𝖺 𝖳𝖾𝗋𝗃𝖺𝗇𝗀𝗄𝖺𝗎 𝖴𝗇𝗍𝗎𝗄 𝖯𝖾𝗆𝗎𝗅𝖺
├≫ 𝖡𝗂𝗌𝖺 𝖬𝖾𝗇𝗃𝗎𝖺𝗅 𝖯𝖺𝗇𝖾𝗅 𝖪𝖾𝗆𝖻𝖺𝗅𝗂
├≫ 𝖡𝗂𝗌𝖺 𝖮𝗉𝖾𝗇 𝖩𝖺𝗌𝖺 𝖲𝖾𝗐𝖺 𝖡𝗈𝗍
├≫ 𝖡𝗂𝗌𝖺 𝖮𝗉𝖾𝗇 𝖩𝖺𝗌𝖺 𝖱𝗎𝗇 𝖡𝗈𝗍
└≫ 𝖩𝖺𝗆𝗂𝗇 𝖡𝖺𝗅𝗆𝗈𝖽 𝖪𝖺𝗅𝗈 𝖠𝖽𝖺 𝖴𝗌𝖺𝗁𝖺

<b>💰 𝗛𝗮𝗿𝗴𝗮 𝗝𝗼𝗶𝗻 :</b> ${toRupiah(harga)}
<i>╰┈⸙ 𝖢𝗎𝗄𝗎𝗉 𝖡𝖺𝗒𝖺𝗋 𝖲𝖾𝗄𝖺𝗅𝗂 𝖲𝖺𝗃𝖺
𝖳𝖾𝗍𝖺𝗉𝗂 𝖣𝗎𝗋𝖺𝗌𝗂 𝖯𝖾𝗋𝗆𝖺𝗇𝖾𝗇</i>
━━━━━━━━━━━━━━━━━━━━━━
<b>🚀 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖳𝖾𝗄𝖺𝗇 𝖲𝖺𝗅𝖺𝗁 𝖲𝖺𝗍𝗎 𝖡𝗎𝗍𝗍𝗈𝗇
𝖣𝗂𝖻𝖺𝗐𝖺𝗁 𝖨𝗇𝗂 𝖴𝗇𝗍𝗎𝗄 𝖬𝖾𝗅𝖺𝗇𝗃𝗎𝗍𝗄𝖺𝗇 :</b></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ 𝗞𝗼𝗻𝗳𝗼𝗿𝗺𝗮𝘀𝗶 𝗢𝗿𝗱𝗲𝗿", callback_data: "pay_reseller_panel", style: "success" }],
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "shop_menu", style: "danger" }]
        ]
      }
    }
  );
})

bot.action("pay_reseller_panel", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'pay_reseller_panel')) return;

  const harga = config.hargaResellerPanel || 25000;

  try { await ctx.deleteMessage(); } catch (e) {}

  await handlePayment(ctx, harga, "Akses Reseller Panel", {
    type: "reseller_panel",
    price: harga
  });
})

bot.action("buy_admin_panel", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_admin_panel')) return;
  
  const db = readDb();
  if (!db.isPanelOpen) {
    await editMenuMessage(ctx, "<b>🚫 𝗠𝗼𝗵𝗼𝗻 𝗠𝗮𝗮𝗳, 𝗦𝘁𝗼𝗸 𝗣𝗮𝗻𝗲𝗹 𝗕𝗲𝗹𝘂𝗺 𝗧𝗲𝗿𝘀𝗲𝗱𝗶𝗮 𝗨𝗻𝘁𝘂𝗸 𝗦𝗮𝗮𝘁 𝗜𝗻𝗶. 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗖𝗼𝗯𝗮 𝗟𝗮𝗴𝗶 𝗡𝗮𝗻𝘁𝗶</b>.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home", style: "danger" }]
        ]
      }
    });
    return;
  }

  userState[ctx.from.id] = { step: "WAITING_USERNAME_ADMIN_PANEL" };

  await editMenuMessage(ctx,
    `<b>🛠️ 𝗕𝗘𝗟𝗜 𝗔𝗗𝗠𝗜𝗡 𝗣𝗔𝗡𝗘𝗟</b>\n\n` +
    `Harga: <b>${toRupiah(config.hargaAdminPanel)}</b>\n` +
    `Benefit: Akun Root Admin (Full Akses)\n\n` +
    `<i>Silahkan Kirim Username Untuk Akun Admin Kamu (Min 5 Huruf)...</i>`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "shop_menu", style: "danger" }]
        ]
      }
    }
  );
})

bot.action(/pay_panellegal_(\d+)_(\d+)_(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'pay_panellegal')) return;
  
  const ram = parseInt(ctx.match[1]);
  const price = parseInt(ctx.match[2]);
  const username = ctx.match[3];

  await handlePayment(ctx, price, `Panel ${ram === 0 ? "Unlimited" : ram/1024 + "GB"}`, {
    type: "panel_legal",
    username: username,
    ram: ram,
    price: price
  });
})

bot.action(/pay_panel_(\d+)_(\d+)_(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'pay_panel')) return;
  
  const ram = parseInt(ctx.match[1]);
  const price = parseInt(ctx.match[2]);
  const username = ctx.match[3];

  await handlePayment(ctx, price, `Panel ${ram === 0 ? "Unlimited" : ram/1024 + "GB"}`, {
    type: "panel",
    username: username,
    ram: ram,
    price: price
  });
})

bot.on('audio', async (ctx) => {
  console.log('Audio File ID:', ctx.message.audio.file_id);
  console.log('Audio Metadata:', {
    title: ctx.message.audio.title,
    performer: ctx.message.audio.performer,
    duration: ctx.message.audio.duration
  });
})

bot.on("text", async (ctx, next) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (["📁 ☇ 𝗦𝗰𝗿𝗶𝗽𝘁", "📱 ☇ 𝗔𝗽𝗽𝘀", "📡 ☇ 𝗣𝗮𝗻𝗲𝗹", "🛠 ☇ 𝗧𝗼𝗼𝗹𝘀", "🌸 ☇ 𝗢𝘄𝗻𝗲𝗿"].includes(text)) {
    return next();
  }
  
  // ========== HANDLE ADD GAME ==========
  if (userState[userId]?.step === "WAITING_GAME_TEXT" && userId === config.ownerId) {
    if (ctx.chat.type !== 'private') return next();
    
    const parts = text.split("|").map(x => x.trim());
    
    if (parts.length !== 5) {
        return safeReply(ctx, "<blockquote>❌ Format salah! Gunakan: nama game|game type|harga|deskripsi|link foto</blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "menu_owner" }]] }
        });
    }
    
    const [name, gameType, priceStr, description, photoLink] = parts;
    const price = parseInt(priceStr);
    
    if (isNaN(price) || price <= 0) {
        return safeReply(ctx, "<blockquote>❌ Harga harus angka positif!</blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "menu_owner" }]] }
        });
    }
    
    const validGameTypes = ["freefire", "mobilelegends", "roblox"];
    if (!validGameTypes.includes(gameType.toLowerCase())) {
        return safeReply(ctx, "<blockquote>❌ Game type tidak valid! Pilih: freefire, mobilelegends, roblox</blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "menu_owner" }]] }
        });
    }
    
    try {
        const gamesDB = readGamesDB();
        const newGame = {
            id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            gameType: gameType.toLowerCase(),
            price: price,
            description: description,
            photoLink: photoLink,
            accounts: [],
            createdAt: new Date().toISOString()
        };
        
        gamesDB.push(newGame);
        saveGamesDB(gamesDB);
        const idx = gamesDB.length - 1;
        
        await safeReply(ctx, `<blockquote><b>✅ Game berhasil ditambahkan!</b>\n<b>🎮 ${name}</b>\n<b>Tipe:</b> ${gameType}\n<b>Harga:</b> ${toRupiah(price)}\n<b>Deskripsi:</b> ${description}\n<b>Stock:</b> 0\n\n</blockquote>`, {
            parse_mode: "HTML",
            ...Markup.inlineKeyboard([
                [ Markup.button.callback("➕ Tambah Akun ke Game ini", `add_account_to_game_${idx}`) ],
                [ Markup.button.callback("🎮 List Games", "list_games") ],
                [ Markup.button.callback("🔙 Kembali ke Owner Menu", "menu_owner") ]
            ])
        });
        
    } catch (e) {
        console.error(e);
        safeReply(ctx, "❌ Gagal menyimpan data game ke database.");
    }
    
    delete userState[userId];
    return;
  }
  
  // ========== HANDLE ADD GAME ACCOUNT ==========
  if (userState[userId]?.step === "WAITING_GAME_ACCOUNT" && userId === config.ownerId) {
    if (ctx.chat.type !== 'private') return next();
    
    const st = userState[userId];
    const parts = text.split("|").map(x => x.trim());
    
    if (parts.length < 2) {
        return safeReply(ctx, "<blockquote>❌ Format salah! Minimal: email|password</blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "menu_owner" }]] }
        });
    }
    
    const [email, password, additionalInfo = ""] = parts;
    
    try {
        const gamesDB = readGamesDB();
        const game = gamesDB[st.gameIndex];
        
        if (!game) {
            return safeReply(ctx, "❌ Game tidak ditemukan / sudah dihapus.");
        }
        
        game.accounts = game.accounts || [];
        game.accounts.push({ 
            email: email, 
            password: password, 
            additionalInfo: additionalInfo,
            addedAt: new Date().toISOString()
        });
        
        saveGamesDB(gamesDB);
        const stockNow = game.accounts.length;
        
        await safeReply(ctx, `<blockquote><b>✅ Akun game berhasil ditambahkan!</b>\n<b>🎮 Game:</b> ${game.name}\n<b>📧 Email:</b> ${email}\n<b>🔑 Password:</b> ${password}\n<b>📝 Info:</b> ${additionalInfo || '-'}\n<b>📦 Stock sekarang:</b> ${stockNow}\n\n</blockquote>`, {
            parse_mode: "HTML",
            ...Markup.inlineKeyboard([
                [ Markup.button.callback("➕ Tambah lagi", `add_account_to_game_${st.gameIndex}`) ],
                [ Markup.button.callback("🎮 List Games", "list_games") ],
                [ Markup.button.callback("🔙 Kembali ke Owner Menu", "menu_owner") ]
            ])
        });
        
    } catch (e) {
        console.error(e);
        safeReply(ctx, "❌ Gagal menambahkan akun game ke database.");
    }
    
    delete userState[userId];
    return;
  }
  // ========== END HANDLE GAME ==========
  
  if (userState[userId]?.step === "WAITING_USERNAME_ADMIN_PANEL") {
    if (ctx.chat.type !== 'private') return next();

    if (!/^[a-zA-Z0-9]+$/.test(text)) {
        return ctx.reply("<blockquote>⚠️ <b>Username hanya boleh huruf & angka!</b></blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "shop_menu", style: "danger" }]] }
        });
    }

    const username = text;
    delete userState[userId].step;
    
    const harga = config.hargaAdminPanel;

    await handlePayment(ctx, harga, `Admin Panel (${username})`, {
        type: "admin_panel",
        username: username,
        price: harga
    });
    return;
  }

  if (userState[userId]?.step === "SMM_WAITING_LINK") {
    if (ctx.chat.type !== 'private') return next();

    const link = text;
    userState[userId].link = link;
    userState[userId].step = "SMM_WAITING_QTY";
    
    return ctx.reply("🔢 <b>𝗠𝗔𝗦𝗨𝗞𝗔𝗡 𝗝𝗨𝗠𝗟𝗔𝗛 :</b>\n\n└⌑ 𝖤𝗑𝖺𝗆𝗉𝗅𝖾 : 𝟣𝟢𝟢𝟢", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[Markup.button.callback('❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻', 'smm_menu')]] }
    });
  }

  if (userState[userId]?.step === "SMM_WAITING_QTY" && ctx.chat.type === 'private') {
    const qty = parseInt(text);

    if (isNaN(qty) || qty <= 0) {
        return ctx.reply("❌ <b>𝗛𝗮𝗿𝘂𝘀 𝗕𝗲𝗿𝘂𝗽𝗮 𝗔𝗻𝗴𝗸𝗮</b>\n\n└⌑ 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖬𝖺𝗌𝗎𝗄𝖺𝗇 𝖩𝗎𝗆𝗅𝖺𝗁 𝖸𝖺𝗇𝗀 𝖵𝖺𝗅𝗂𝖽 (𝖤𝗑𝖺𝗆𝗉𝗅𝖾: 𝟣𝟢𝟢𝟢).", {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "smm_menu", style: "danger" }]] }
        });
    }

    const state = userState[userId];
    
    const res = await callSmmApi('/services');
    let services = res.services || res.data || [];
    const service = services.find(s => s.id == state.serviceId);
    
    if (!service) {
        delete userState[userId];
        return ctx.reply("❌ 𝗟𝗮𝘆𝗮𝗻𝗮𝗻 𝗧𝗶𝗱𝗮𝗸 𝗗𝗶𝘁𝗲𝗺𝘂𝗸𝗮𝗻/𝗕𝗲𝗿𝘂𝗯𝗮𝗵.");
    }

    if (qty < service.min || qty > service.max) {
        return ctx.reply(`❌ <b>𝗝𝘂𝗺𝗹𝗮𝗵 𝗧𝗶𝗱𝗮𝗸 𝗦𝗲𝘀𝘂𝗮𝗶</b>\n├⌑𝖬𝗂𝗇 : ${service.min}\n└⌑ 𝖬𝖺𝗑 : ${service.max}`, { parse_mode: "HTML" });
    }

    const totalPrice = (parseFloat(service.price) / 1000) * qty;
    
    const dbSaldoPath = "./database/saldoOtp.json";
    const saldoData = JSON.parse(fs.readFileSync(dbSaldoPath, "utf8") || "{}");
    const userSaldo = saldoData[userId] || 0;

    if (userSaldo < totalPrice) {
        delete userState[userId];
        return ctx.reply(`<blockquote>❌ <b>𝗦𝗔𝗟𝗗𝗢 𝗧𝗜𝗗𝗔𝗞 𝗖𝗨𝗞𝗨𝗣!</b>\n\n╭⌑ 💰 𝖡𝗎𝗍𝗎𝗁 : ${toRupiah(totalPrice)}\n├⌑ 💳 𝖲𝖺𝗅𝖽𝗈 𝖪𝖺𝗆𝗎 : ${toRupiah(userSaldo)}\n\n╰⌑ 🍂 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖣𝖾𝗉𝗈𝗌𝗂𝗍 𝖳𝖾𝗅𝖾𝖻𝗂𝗁 𝖣𝖺𝗁𝗎𝗅𝗎.</blockquote>`, { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[Markup.button.callback('➕ 𝗜𝘀𝗶 𝗦𝗮𝗹𝗱𝗼', 'topup_nokos')]] }
        });
    }

    userState[userId].pendingOrder = {
        serviceId: state.serviceId,
        serviceName: service.name,
        target: state.link,
        quantity: qty,
        price: totalPrice
    };

    await ctx.reply(
        `🚀 <b>𝗞𝗢𝗡𝗙𝗜𝗥𝗠𝗔𝗦𝗜 𝗣𝗘𝗦𝗔𝗡𝗔𝗡</b>\n\n` +
        `├⌑ 📦 <b>𝖫𝖺𝗒𝖺𝗇𝖺𝗇 :</b> ${service.name}\n` +
        `├⌑ 🔗 <b>𝖳𝖺𝗋𝗀𝖾𝗍 :</b> ${state.link}\n` +
        `├⌑ 🔢 <b>𝖩𝗎𝗆𝗅𝖺𝗁 :</b> ${qty}\n` +
        `└⌑ 💰 <b>𝖳𝗈𝗍𝖺𝗅 𝖧𝖺𝗋𝗀𝖺 :</b> ${toRupiah(totalPrice)}\n\n` +
        `<i>📝 𝖭𝗈𝗍𝖾 : 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖯𝖺𝗌𝗍𝗂𝗄𝖺𝗇 𝖯𝖾𝗌𝖺𝗇𝖺𝗇 𝖡𝖾𝗇𝖺𝗋 𝖲𝖾𝖻𝖾𝗅𝗎𝗆 𝖫𝖺𝗇𝗃𝗎𝗍!</i>`,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ 𝗞𝗼𝗻𝗳𝗶𝗿𝗺𝗮𝘀𝗶 𝗢𝗿𝗱𝗲𝗿", callback_data: "smm_exec_order", style: "success" }],
                    [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻", callback_data: "smm_menu", style: "danger" }]
                ]
            }
        }
    );
    return;
  }

  if (userState[userId]?.step === "SMM_WAITING_STATUS_ID") {
      if (ctx.chat.type !== 'private') return next();

      const orderId = text;
      const res = await callSmmApi('/status', { id: orderId });
      
      if (res.status === true) {
          ctx.reply(`📊 <b>𝗦𝗧𝗔𝗧𝗨𝗦 𝗢𝗥𝗗𝗘𝗥 #${orderId}</b>\n├⌑ 𝖲𝗍𝖺𝗍𝗎𝗌 :<b>${res.data?.status || res.order_status}</b>\n├⌑ 𝖲𝗍𝖺𝗋𝗍 : ${res.data?.start_count || '-'}\n└⌑ 𝖲𝗂𝗌𝖺 : ${res.data?.remains || '-'}`, { parse_mode: "HTML" });
      } else {
          ctx.reply("❌ 𝗗𝗮𝘁𝗮 𝗧𝗶𝗱𝗮𝗸 𝗗𝗶𝘁𝗲𝗺𝘂𝗸𝗮𝗻/𝗘𝗿𝗿𝗼𝗿.", { parse_mode: "HTML" });
      }
      delete userState[userId];
      return;
  }
  
  if (userState[userId]?.step === "WAITING_TOPUP_RUMAHOTP") {
    if (ctx.chat.type !== 'private') return next();

    const amount = parseInt(text);
    
    if (isNaN(amount) || amount < 2000) {
       return safeReply(ctx, "❌ <b>Minimal deposit Rp 2.000 dan harus angka!</b>", {
           parse_mode: "HTML",
           reply_markup: { inline_keyboard: [[{ text: "❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻", callback_data: "shop_menu", style: "danger" }]] }
       });
    }
    
    delete userState[userId];

    const loading = await safeReply(ctx, "🔄 <b>𝗠𝗘𝗠𝗕𝗨𝗔𝗧 𝗤𝗥𝗜𝗦...</b>", { parse_mode: "HTML" });
    const apiKey = config.RUMAHOTP;
    const fee = config.UNTUNG_DEPOSIT || 500;
    const totalRequest = amount + fee;

        try {
       const res = await axios.get(`https://www.rumahotp.com/api/v2/deposit/create?amount=${totalRequest}&payment_id=qris`, {
          headers: { "x-apikey": apiKey }
       });
       
       await ctx.deleteMessage(loading.message_id).catch(()=>{});

       if (!res.data.success) {
          return safeReply(ctx, "❌ Gagal membuat QRIS. Coba lagi nanti.", {
              reply_markup: { inline_keyboard: [[{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "shop_menu", style: "primary" }]] }
          });
       }

       const d = res.data.data;
       const caption = `<b>💳 TAGIHAN DEPOSIT</b>\n\n🆔 ID: <code>${d.id}</code>\n💰 Total Bayar: <b>${toRupiah(d.total)}</b>\n(Termasuk biaya admin)\n\n📥 Masuk Saldo: ${toRupiah(amount)}\n\n⚠️ <b>Bayar sesuai nominal TOTAL (sampai digit terakhir)!</b>\nOtomatis cek status...`;
       
       const msgQris = await ctx.replyWithPhoto(d.qr_image, {
          caption: caption,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{text: "❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻", callback_data: `batal_depo_rumahotp_${d.id}`, style: "danger"}]] }
       });

       let checks = 0;
       const maxChecks = 120;
       const checkInterval = setInterval(async () => {
          checks++;
          if (checks > maxChecks) {
             clearInterval(checkInterval);
             return;
          }

          try {
             const checkRes = await axios.get(`https://www.rumahotp.com/api/v2/deposit/get_status?deposit_id=${d.id}`, { headers: { "x-apikey": apiKey } });
             
             if (checkRes.data && checkRes.data.success) {
                 const status = checkRes.data.data.status;

                 if (status === 'success' || status === 'paid') {
                     clearInterval(checkInterval);
                     
                     const dbPath = "./database/saldoOtp.json";
                     let saldoDB = {};
                     try { saldoDB = JSON.parse(fs.readFileSync(dbPath, "utf8")); } catch(e){}
                     
                     saldoDB[userId] = (saldoDB[userId] || 0) + amount;
                     fs.writeFileSync(dbPath, JSON.stringify(saldoDB, null, 2));

                     await ctx.deleteMessage(msgQris.message_id).catch(()=>{});
                     await ctx.reply(`✅ <b>DEPOSIT SUKSES!</b>\n\n💰 Diterima: ${toRupiah(amount)}\n💼 Total Saldo: ${toRupiah(saldoDB[userId])}`, { parse_mode: "HTML" });
                     
                     bot.telegram.sendMessage(config.ownerId, `🔔 User ${userId} Deposit ${amount}`).catch(()=>{});

                 } else if (status === 'cancelled' || status === 'failed') {
                     clearInterval(checkInterval);
                     await ctx.deleteMessage(msgQris.message_id).catch(()=>{});
                     await ctx.reply("❌ Deposit dibatalkan/gagal.");
                 }
             }
          } catch(e) { 
              console.log("Error cek deposit:", e.message);
          }
       }, 5000);

    } catch(e) {
       console.error(e);
       safeReply(ctx, "❌ Error API RumahOTP");
    }
    return;
  }
  
  if (userState[userId]?.step === "WAITING_USERNAME_PANEL_LEGAL") {
    if (ctx.chat.type !== 'private') return next();

    if (!/^[a-zA-Z0-9]+$/.test(text)) {
        return ctx.reply("<blockquote>⚠️ <b>Username hanya boleh huruf & angka!</b></blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "back_home", style: "danger" }]] }
        });
    }

    const username = text;
    delete userState[userId].step;

    const hargaGb = config.hargaPanelLegal.perGB;
    const hargaUnli = config.hargaPanelLegal.unlimited;

    let listRam = [];

    for (let gb = 1; gb <= 10; gb++) {
        const ramMB = gb * 1024;
        const price = gb * hargaGb;

        listRam.push({
            label: `${gb}GB - ${toRupiah(price)}`,
            ram: ramMB,
            price
        });
    }

    listRam.push({
        label: `UNLIMITED (${toRupiah(hargaUnli)})`,
        ram: 0,
        price: hargaUnli
    });

    const buttons = listRam.map(p => {
        return [{ text: p.label, callback_data: `pay_panellegal_${p.ram}_${p.price}_${username}` }];
    });

    buttons.push([{ text: "🔙 𝗕𝗮𝘁𝗮𝗹", callback_data: "back_home", style: "danger" }]);

    return ctx.reply(
        `<blockquote><b>📡 𝗣𝗶𝗹𝗶𝗵 𝗦𝗽𝗲𝘀𝗶𝗳𝗶𝗸𝗮𝘀𝗶 𝗨𝗻𝘁𝘂𝗸 𝗣𝗮𝗻𝗲𝗹 𝗟𝗲𝗴𝗮𝗹 ${username}</b></blockquote>`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons }
        }
    );
  }
  
  if (userState[userId]?.step === "WAITING_USERNAME_PANEL") {
    if (ctx.chat.type !== 'private') return next();

    if (!/^[a-zA-Z0-9]+$/.test(text)) {
        return ctx.reply("<blockquote>⚠️ <b>Username hanya boleh huruf & angka!</b></blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "back_home", style: "danger" }]] }
        });
    }

    const username = text;
    delete userState[userId].step;

    const hargaGb = config.hargaPanel.perGB;
    const hargaUnli = config.hargaPanel.unlimited;

    let listRam = [];

    for (let gb = 1; gb <= 10; gb++) {
        const ramMB = gb * 1024;
        const price = gb * hargaGb;

        listRam.push({
            label: `${gb}GB - ${toRupiah(price)}`,
            ram: ramMB,
            price
        });
    }

    listRam.push({
        label: `UNLIMITED (${toRupiah(hargaUnli)})`,
        ram: 0,
        price: hargaUnli
    });

    const buttons = listRam.map(p => {
        return [{ text: p.label, callback_data: `pay_panel_${p.ram}_${p.price}_${username}` }];
    });

    buttons.push([{ text: "🔙 𝗕𝗮𝘁𝗮𝗹", callback_data: "back_home", style: "danger" }]);

    return ctx.reply(
        `<blockquote><b>📡 𝗣𝗶𝗹𝗶𝗵 𝗦𝗽𝗲𝘀𝗶𝗳𝗶𝗸𝗮𝘀𝗶 𝗨𝗻𝘁𝘂𝗸 𝗣𝗮𝗻𝗲𝗹 ${username}</b></blockquote>`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons }
        }
    );
  }

  if (userState[userId]?.step === "WAITING_SCRIPT_DETAIL") {
    if (ctx.chat.type !== 'private') return next();

    const state = userState[userId];
    const parts = text.split("|").map(x => x.trim());
    
    if (parts.length !== 3) {
        return safeReply(ctx, "<blockquote>❌ Format detail salah! Gunakan: Nama | Harga (angka) | Deskripsi</blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "menu_owner" }]] }
        });
    }
    
    const [nama, hargaStr, deskripsi] = parts;
    const harga = parseInt(hargaStr);
    
    if (isNaN(harga) || harga <= 0) {
        return safeReply(ctx, "<blockquote>❌ Harga harus angka positif!</blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "menu_owner" }]] }
        });
    }
    
    try {
        const db = readDb();

db.scripts = db.scripts || [];  // 🔥 ini penting

const scriptData = {
  nama: nama,
  harga: harga,
  deskripsi: deskripsi,
  file_id: state.file_id,
  fileName: state.temp_fileName
};

db.scripts.push(scriptData);
saveDb(db);
        
        const addedBy = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
        
        
        safeReply(ctx, `<blockquote><b>✅ Sukses Menambah Script!</b>\n\n<b>📂 Nama:</b> <code>${nama}</code>\n<b>💰 Harga:</b> <code>${toRupiah(harga)}</code>\n<b>📄 File:</b> <code>${state.temp_fileName}</code>\n\n</blockquote>`, { 
        parse_mode: "HTML" 
        });
        
    } catch (e) {
        console.error(e);
        safeReply(ctx, "❌ Gagal menyimpan data script ke database.");
    }
    
    delete userState[userId];
    return;
  }

  if (userState[userId]?.step === "WAITING_APP_TEXT") {
    if (userId !== config.ownerId) return next();
    if (ctx.chat.type !== 'private') return next();
    
    const parts = text.split("|").map(x => x.trim());
    
    if (parts.length !== 3) {
        return safeReply(ctx, "<blockquote>❌ Format salah! Gunakan: Nama | Harga | Deskripsi</blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "menu_owner" }]] }
        });
    }
    
    const [nama, hargaStr, deskripsi] = parts;
    const harga = parseInt(hargaStr);
    
    if (isNaN(harga) || harga <= 0) {
        return safeReply(ctx, "<blockquote>❌ Harga harus angka positif!</blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "menu_owner" }]] }
        });
    }
    
    try {
        const db = readDb();
        const newApp = {
        nama,
        harga,
        deskripsi,
        accounts: [] 
        };
        
        db.apps.push(newApp);
        saveDb(db);
        const idx = db.apps.length - 1;
        
        const addedBy = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
        
        
        await safeReply(ctx, `<blockquote><b>✅ App Premium ditambahkan!</b>\n<b>📱 ${nama}</b>\n<b>Stock:</b> 0\n\n</blockquote>`, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [ Markup.button.callback("📄 List Account", `list_accounts_${idx}`) ],
            [ Markup.button.callback("🔙 Kembali ke Owner Menu", "menu_owner") ]
        ])
        });
        
    } catch (e) {
        console.error(e);
        safeReply(ctx, "❌ Gagal menyimpan data app ke database.");
    }
    
    delete userState[userId];
    return;
  }

  if (userState[userId]?.step === "WAITING_ADD_ACCOUNT") {
    if (userId !== config.ownerId) return next();
    if (ctx.chat.type !== 'private') return next();
    
    const st = userState[userId];
    const parts = text.split("|").map(x => x.trim());
    
    if (parts.length !== 4) {
        return safeReply(ctx, "<blockquote>❌ Format salah! Gunakan: username|password|link akses|deskripsi</blockquote>", { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "menu_owner" }]] }
        });
    }
    
    const [usernameA, passwordA, linkA, descA] = parts;
    
    try {
        const db = readDb();
        const app = db.apps[st.appIndex];
        
        if (!app) {
        return safeReply(ctx, "❌ App tidak ditemukan / sudah dihapus.");
        }
        
        app.accounts = app.accounts || [];
        app.accounts.push({ 
        user: usernameA, 
        pass: passwordA, 
        link: linkA, 
        desc: descA 
        });
        
        saveDb(db);
        const stockNow = app.accounts.length;
        
        const addedBy = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
        const accountData = {
        appName: app.nama,
        username: usernameA,
        password: passwordA,
        link: linkA,
        desc: descA,
        newStock: stockNow
        };
        
        
        safeReply(ctx, `<blockquote><b>✅ Akun ditambahkan!</b>\n<b>Stock sekarang:</b> ${stockNow}\n\n</blockquote>`, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [ Markup.button.callback("➕ Tambah lagi", `owner_add_account`) ],
            [ Markup.button.callback("📃 List App Premium", "list_apps") ],
            [ Markup.button.callback("🔙 Kembali ke Owner Menu", "menu_owner") ]
        ])
        });
        
    } catch (e) {
        console.error(e);
        safeReply(ctx, "❌ Gagal menambahkan akun ke database.");
    }
    
    delete userState[userId];
    return;
  }

  if (userState[ctx.from.id]?.step === "WAITING_BROADCAST" && ctx.from.id === config.ownerId) {
    if (ctx.chat.type !== 'private') return next();

    const users = loadUsers();
    let sent = 0;
    for (const uid of users) {
      try {
        await bot.telegram.forwardMessage(uid, ctx.chat.id, ctx.message.message_id);
        sent++;
      } catch (e) {}
    }
    delete userState[ctx.from.id];
    return safeReply(ctx, `<blockquote>📢 <b>Broadcast selesai!</b> <b>Terkirim:</b> ${sent}</blockquote>`, { parse_mode: "HTML" });
  }

  return next();
})

async function handlePayment(ctx, nominal, itemName, productData) {
  if (!isPrivateChat(ctx)) {
    await ctx.answerCbQuery?.();
    return safeReply(ctx, "❌ <b>Pembayaran hanya bisa dilakukan di Private Chat!</b>\n\n💬 Silakan chat saya di private: https://t.me/" + bot.botInfo.username, { parse_mode: "HTML" });
  }
  
  const userId = ctx.from.id;
  if (activeTransactions[userId]) return safeReply(ctx, "<blockquote>⚠️ <b>Ada transaksi pending.</b> Ketik /cancel.</blockquote>", { parse_mode: "HTML" });
  
  const activePaymentMethod = getActivePaymentMethod();
  
  if (activePaymentMethod === "manual") {
    if (!config.manualQrisPhoto) {
      return safeReply(ctx, "<blockquote>❌ <b>QRIS manual belum diatur oleh owner.</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
    }
    
    const fee = Math.floor(Math.random() * 100);
    const totalBayar = nominal + fee;
    
    await ctx.replyWithPhoto(config.manualQrisPhoto, {
      caption: `<blockquote><b>🧾 TAGIHAN MANUAL</b>\n\n<b>Item:</b> <code>${itemName}</code>\n<b>Total:</b> ${toRupiah(totalBayar)}\n\n<i>Silakan transfer sesuai nominal di atas</i>\n<i>Lalu kirim foto bukti transfer ke bot ini</i>\n<i>Bot akan otomatis mengirim ke owner</i></blockquote>`,
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Batalkan", "cancel_trx")]
      ])
    });
    
    userState[userId] = {
      step: "PAYMENT_MANUAL_PENDING",
      itemName: itemName,
      amount: totalBayar,
      productData: productData,
      nominal: nominal
    };
    
    return;
  }
  
  // Pakasir tidak perlu tambah fee random karena sudah pakai order_id unik
  // Atlantic & Orkut butuh fee random agar nominal unik untuk identifikasi mutasi
  const fee = activePaymentMethod === "pakasir" ? 0 : Math.floor(Math.random() + 382);
  const totalBayar = nominal + fee;
  const msgLoading = await safeReply(ctx, "<blockquote>🔄 <b>Membuat QRIS...</b></blockquote>", { parse_mode: "HTML" });
  
  let paymentConfig = {};
  if (activePaymentMethod === "atlantic") {
    paymentConfig = { 
      method: "atlantic", 
      apiAtlantic: config.payment?.apiAtlantic || config.apikeyAtlantic || config.ApikeyAtlantic || config.apiAtlantic 
    };
  } else if (activePaymentMethod === "pakasir") {
    paymentConfig = {
      method: "pakasir",
      apiPakasir: config.pakasir?.apiKey || "",
      projectPakasir: config.pakasir?.project || "",
    };
  } else {
    paymentConfig = Object.assign({ method: "orkut" }, config.payment || {});
  }
  
  const qrisData = await createdQris(totalBayar, paymentConfig);
  
  try {
    await ctx.deleteMessage(msgLoading.message_id);
  } catch (e) {}
  
  if (!qrisData) {
    return safeReply(ctx, "<blockquote>❌ <b>Gagal membuat QRIS.</b></blockquote>", { parse_mode: "HTML" });
  }
  
  console.log("[DEBUG] QRIS Data:", {
    hasImage: !!qrisData.imageqris,
    imageType: typeof qrisData.imageqris,
    isBuffer: qrisData.imageqris instanceof Buffer,
    isString: typeof qrisData.imageqris === 'string',
    hasQrString: !!qrisData.qr_string,
    fullData: qrisData
  });
  
  let photoToSend = null;
  let useLocalQR = false;
  
  if (qrisData.imageqris instanceof Buffer) {
    console.log("[DEBUG] QRIS adalah Buffer, size:", qrisData.imageqris.length);
    photoToSend = { source: qrisData.imageqris };
    
  } else if (qrisData.imageqris && typeof qrisData.imageqris === 'string') {
    if (qrisData.imageqris.startsWith('data:image')) {
      try {
        console.log("[DEBUG] QRIS adalah Base64");
        const base64Data = qrisData.imageqris.replace(/^data:image\/\w+;base64,/, '');
        photoToSend = { source: Buffer.from(base64Data, 'base64') };
      } catch (e) {
        console.error("[ERROR] Failed to parse base64 image:", e.message);
      }
      
    } else if (qrisData.imageqris.startsWith('http')) {
      console.log("[DEBUG] QRIS adalah URL:", qrisData.imageqris);
      
      try {
        const { downloadQrisImage } = require("./lib/payment");
        const qrBuffer = await downloadQrisImage(qrisData.imageqris);
        
        if (qrBuffer) {
          console.log("[DEBUG] QRIS downloaded successfully, size:", qrBuffer.length);
          photoToSend = { source: qrBuffer };
        } else {
          console.log("[DEBUG] Failed to download QRIS, will use qr_string");
          useLocalQR = true;
        }
      } catch (downloadErr) {
        console.error("[ERROR] Failed to download QRIS image:", downloadErr.message);
        useLocalQR = true;
      }
    } else {
      console.log("[DEBUG] QRIS adalah string biasa");
      useLocalQR = true;
    }
  }
  
  if (!photoToSend && (useLocalQR || !qrisData.imageqris)) {
    if (qrisData.qr_string && qrisData.qr_string.trim().length > 0) {
      console.log("[DEBUG] Generating local QR from qr_string");
      try {
        const qrBuffer = await generateLocalQr(qrisData.qr_string);
        if (qrBuffer) {
          photoToSend = { source: qrBuffer };
          console.log("[DEBUG] Local QR generated successfully");
        } else {
          console.log("[DEBUG] Failed to generate local QR");
        }
      } catch (qrErr) {
        console.error("[ERROR] Failed to generate local QR:", qrErr.message);
      }
    }
  }
  
  if (!photoToSend) {
    console.error("[ERROR] No valid QRIS data available");
    return safeReply(ctx, 
      `<b>❌ GAGAL MEMBUAT QRIS</b>\n\n` +
      `<b>Item:</b> ${itemName}\n` +
      `<b>Total:</b> ${toRupiah(totalBayar)}\n\n` +
      `<i>Silakan hubungi owner untuk pembayaran manual.</i>`,
      { parse_mode: "HTML" }
    );
  }
  
  try {
    console.log("[DEBUG] Sending QRIS to user");
    
    // Untuk Pakasir: jumlah = total_payment (sudah include fee Pakasir), ditampilkan ke user
    // Untuk Atlantic/Orkut: jumlah = amount yang dikirim ke gateway
    const totalTampil = qrisData.jumlah;
    const expiredInfo = qrisData.expired_at 
      ? `\n⏰ <i>Berlaku hingga: ${new Date(qrisData.expired_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</i>`
      : '';
    
    let finalQr = photoToSend;

// 🔥 FORCE pakai QR STRING biar pasti bisa discan
if (qrisData.qr_string) {
  const qrBuffer = await generateQrisPremium(qrisData.qr_string, totalTampil);
  finalQr = { source: qrBuffer };
}

const msgQris = await ctx.replyWithPhoto(finalQr, {
  caption: `
💳 *QRIS PAYMENT OTOMATIS (HanzPAY)*

🧾 ID Pembayaran: ${qrisData.idtransaksi || qrisData.id}
💰 Harga Produk: ${toRupiah(nominal)}
💵 Total Dibayar: ${toRupiah(totalTampil)}
⏰ Masa Aktif QR: ${qrisData.expired_at ? new Date(qrisData.expired_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"}) : "-"}

⚠️ Harap bayar sesuai nominal

💡 *Panduan Pembayaran:*
1. Buka aplikasi e-wallet / m-banking
2. Pilih menu QRIS / Scan QR
3. Scan kode QR di atas
4. Konfirmasi pembayaran

⚠️ *Catatan:*
• Simpan ID Pembayaran
• Jika sudah bayar tapi belum masuk, hubungi admin
• Transaksi otomatis batal jika melewati batas waktu

📦 *Detail Produk:*
• ${itemName}
• Total: ${toRupiah(nominal)}
`,
  parse_mode: "Markdown",
  ...Markup.inlineKeyboard([
    ...(qrisData.payUrl ? [[Markup.button.url("🌐 Buka di Browser", qrisData.payUrl)]] : []),
    [Markup.button.callback("❌ Batalkan", "cancel_trx")]
  ])
});
    
    activeTransactions[userId] = { 
      id: qrisData.idtransaksi || qrisData.id, 
      amount: qrisData.jumlah, 
      status: 'pending',
      messageId: msgQris.message_id,
      paymentMethod: activePaymentMethod,
      paymentConfig: paymentConfig
    };
    
    console.log(`[DEBUG] Transaction started for user ${userId}:`, activeTransactions[userId].id);
    
    let attempts = 0;
    const maxAttempts = 120;
    
    const interval = setInterval(async () => {
      attempts++;
      
      if (!activeTransactions[userId]) {
        console.log(`[DEBUG] Transaction ${userId} cancelled, stopping check`);
        clearInterval(interval);
        return;
      }
      
      if (attempts > maxAttempts) {
        console.log(`[DEBUG] Payment timeout for user ${userId} after ${attempts} attempts`);
        clearInterval(interval);
        
        if (activeTransactions[userId]) {
          try {
            if (activeTransactions[userId].messageId) {
              await ctx.deleteMessage(activeTransactions[userId].messageId).catch(() => {});
            }
          } catch (e) {}
          
          delete activeTransactions[userId];
          await safeReply(ctx, "<blockquote>❌ <b>Waktu pembayaran habis.</b> Silakan ulangi transaksi.</blockquote>", { 
            parse_mode: "HTML" 
          });
        }
        return;
      }
      
      try {
        console.log(`[DEBUG] Checking payment status for user ${userId}, attempt ${attempts}`);
        
        const isPaid = await cekStatus(
          qrisData.idtransaksi || qrisData.id, 
          qrisData.nominal || qrisData.jumlah,  // nominal = amount asli yg dikirim ke Pakasir; jumlah = total_payment (include fee Pakasir)
          paymentConfig
        );
        
        if (isPaid) {
          console.log(`[DEBUG] Payment confirmed for user ${userId}`);
          clearInterval(interval);
          
          try {
            if (activeTransactions[userId]?.messageId) {
              await ctx.deleteMessage(activeTransactions[userId].messageId).catch(() => {});
            }
          } catch (e) {}
          
          delete activeTransactions[userId];
          
          const userName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();
          const userTgUsername = ctx.from.username ? `@${ctx.from.username}` : userName;
          const testimoniResult = await sendTestimoniKeChannel(userName, userId, itemName, nominal, userTgUsername, buildReceiptDetails(productData), productData);
          
          try {
            await bot.telegram.sendMessage(
              config.ownerId,
              `<b>💰 PEMBAYARAN SUKSES</b>\n\n` +
              `<b>👤 User:</b> ${ctx.from.first_name} (${ctx.from.id})\n` +
              `<b>🛒 Item:</b> ${itemName}\n` +
              `<b>💵 Harga:</b> ${toRupiah(nominal)}\n` +
              `<b>📊 Status:</b> QRIS Payment (${activePaymentMethod.toUpperCase()})\n` +
              `<b>⏰ Waktu:</b> ${new Date().toLocaleString()}`,
              { parse_mode: "HTML" }
            );
          } catch (ownerErr) {
            console.error("[ERROR] Failed to notify owner:", ownerErr.message);
          }
          
          await sendProductToUser(ctx, productData, testimoniResult);
        } else {
          console.log(`[DEBUG] Payment not yet confirmed for user ${userId}`);
        }
        
      } catch (error) {
        console.error(`[ERROR] Error checking payment status for user ${userId}:`, error.message);
        
        if (attempts > 10) {
          clearInterval(interval);
          console.error(`[ERROR] Too many errors, stopping check for user ${userId}`);
          
          if (activeTransactions[userId]) {
            delete activeTransactions[userId];
            await safeReply(ctx, "<blockquote>⚠️ <b>Terjadi gangguan sistem pembayaran.</b> Silakan hubungi owner.</blockquote>", { 
              parse_mode: "HTML" 
            });
          }
        }
      }
    }, 5000);
    
  } catch (error) {
    console.error("[ERROR] Failed to send QRIS photo:", error.message);
    
    if (activeTransactions[userId]) {
      delete activeTransactions[userId];
    }
    
    let errorMessage = `<b>⚠️ GAGAL MENAMPILKAN QRIS</b>\n\n`;
    errorMessage += `<b>Item:</b> ${itemName}\n`;
    errorMessage += `<b>Total:</b> ${toRupiah(qrisData.jumlah)}\n`;
    errorMessage += `<b>ID Transaksi:</b> ${qrisData.idtransaksi || qrisData.id || '-'}\n`;
    
    if (qrisData.qr_string && qrisData.qr_string.length < 500) {
      errorMessage += `<b>QR String:</b>\n<code>${qrisData.qr_string}</code>\n\n`;
    }
    
    errorMessage += `<i>Silakan hubungi owner untuk pembayaran manual.</i>`;
    
    await safeReply(ctx, errorMessage, { parse_mode: "HTML" });
  }
}

bot.action(/delete_sc_(\d+)/, async (ctx) => {
  try {
    const idx = parseInt(ctx.match[1]);
    const db = readDb();
    const sc = db.scripts[idx];

    if (!sc) {
      await ctx.answerCbQuery("❌ Script tidak ditemukan.");
      return;
    }

    db.scripts.splice(idx, 1);
    saveDb(db);

    await ctx.answerCbQuery("✅ Script berhasil dihapus!");
    await ctx.editMessageText("✔️ Script berhasil dihapus.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]))
      .catch(()=>{ safeReply(ctx, "✔️ Script berhasil dihapus."); });

  } catch (e) {
    console.error("delete_sc error:", e);
  }
})

bot.action(/delete_app_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) {
    ctx.answerCbQuery("❌ App tidak ditemukan.");
    return showOwnerMenu(ctx);
  }
  db.apps.splice(idx, 1);
  saveDb(db);
  ctx.answerCbQuery(`✅ App ${app?.nama || 'Item'} berhasil dihapus.`);
  showOwnerMenu(ctx);
})

bot.action(/list_accounts_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  const accounts = app.accounts || [];
  let txt = `<b>📄 List Accounts - ${app.nama}</b>\n<b>Stock:</b> ${accounts.length}\n\n`;
  if (!accounts.length) txt += "<i>Belum ada akun.</i>\n";
  accounts.forEach((a, i) => {
    txt += `<b>${i+1}.</b> ${a.user} | ${a.pass} | ${a.link} | ${a.desc || '-'}\n`;
  });
  safeReply(ctx, txt, { parse_mode: "HTML" });
  ctx.answerCbQuery().catch(()=>{});
})

bot.action("owner_add_account", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const db = readDb();
  if (!db.apps || db.apps.length === 0) return safeReply(ctx, "<blockquote>❌ <b>Belum ada app yang terdaftar.</b> Tambahkan app terlebih dahulu.</blockquote>", { parse_mode: "HTML" });
  const buttons = db.apps.map((a, i) => [ Markup.button.callback(`${a.nama} (${(a.accounts||[]).length} stok)`, `owner_add_account_to_${i}`) ]);
  buttons.push([ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner") ]);
  safeReply(ctx, "<blockquote><b>Pilih aplikasi untuk menambah akun:</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/owner_add_account_to_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  if (!db.apps[idx]) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  userState[ctx.from.id] = { step: "WAITING_ADD_ACCOUNT", appIndex: idx };
  safeReply(ctx, "<blockquote><b>✏️ Kirim akun dengan format:</b>\n<code>username|password|link akses|deskripsi</code></blockquote>", { parse_mode: "HTML" });
  ctx.answerCbQuery().catch(()=>{});
})

bot.action("owner_del_account", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const db = readDb();
  if (!db.apps || db.apps.length === 0) return safeReply(ctx, "<blockquote>❌ <b>Belum ada app yang terdaftar.</b></blockquote>", { parse_mode: "HTML" });
  const buttons = db.apps.map((a, i) => [ Markup.button.callback(`${a.nama} (${(a.accounts||[]).length} stok)`, `owner_del_account_choose_${i}`) ]);
  buttons.push([ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner") ]);
  safeReply(ctx, "<blockquote><b>Pilih aplikasi untuk menghapus akun:</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/owner_del_account_choose_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  const accounts = app.accounts || [];
  if (!accounts.length) return safeReply(ctx, "<blockquote>❌ <b>Tidak ada akun pada aplikasi ini.</b></blockquote>", { parse_mode: "HTML" });
  const buttons = accounts.map((acc, i) => [ Markup.button.callback(`🗑 ${i+1}. ${acc.user} - ${acc.desc || '-'}`, `owner_delete_acc_${idx}_${i}`) ]);
  buttons.push([ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner") ]);
  safeReply(ctx, `<blockquote><b>Pilih akun yang ingin dihapus dari ${app.nama}:</b></blockquote>`, { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
  ctx.answerCbQuery().catch(()=>{});
})

bot.action(/owner_delete_acc_(\d+)_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const appIndex = parseInt(ctx.match[1]);
  const accIndex = parseInt(ctx.match[2]);
  const db = readDb();
  const app = db.apps[appIndex];
  if (!app) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  if (!app.accounts || !app.accounts[accIndex]) return ctx.answerCbQuery("❌ Akun tidak ditemukan.");
  const removed = app.accounts.splice(accIndex, 1);
  saveDb(db);
  ctx.answerCbQuery("✅ Akun dihapus.");
  safeReply(ctx, `<blockquote><b>✅ Akun ${removed[0].user} telah dihapus dari ${app.nama}</b></blockquote>`, { parse_mode: "HTML" });
})

async function sendProductToUser(ctx, productData, testimoniResult = null) {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const userNameFull = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();

    if (productData.type === "script") {
      const db = readDb();
      const item = db.scripts[productData.index];
      
      if (!item) {
        return safeReply(ctx, "<blockquote>❌ <b>Script tidak ditemukan!</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
      }
      
      if (!item.file_id) {
        return safeReply(ctx, "<blockquote>❌ <b>File script tidak tersedia!</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
      }
      
      await safeReply(ctx, "<blockquote>✅ <b>Pembayaran valid! Mengirim file...</b></blockquote>", { parse_mode: "HTML" });
      

      await ctx.replyWithDocument(item.file_id, { 
        caption: `<b>📦 ${item.nama}</b>\n\n` +
                 `<b>├⌑ 💰 𝖧𝖺𝗋𝗀𝖺 :</b> ${toRupiah(item.harga)}\n` +
                 `<b>├⌑ 📝 𝖣𝖾𝗌𝗄𝗋𝗂𝗉𝗌𝗂 :</b>\n${item.deskripsi || 'Tidak ada deskripsi'}\n` +
                 `<b>└⌑ 🍂 𝖳𝖾𝗋𝗂𝗆𝖺𝗄𝖺𝗌𝗂𝗁 𝖲𝗎𝖽𝖺𝗵 𝖮𝗋𝖽𝖾𝗿!</b>`, 
        filename: item.fileName || `${item.nama}.zip`,
        parse_mode: "HTML"
      });
      await updateTestimoniSelesai(testimoniResult, userNameFull, userId, `Script: ${item.nama}`, item.harga);


    } 

    else if (productData.type === "app") {
      const db = readDb();
      const app = db.apps[productData.idx];
      
      if (!app) {
        return safeReply(ctx, "<blockquote>❌ <b>Aplikasi tidak ditemukan!</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
      }
      
      app.accounts = app.accounts || [];
      
      if (app.accounts.length < productData.qty) {
        return safeReply(ctx, `<blockquote>❌ <b>Stok tidak mencukupi!</b>\nStok tersedia: ${app.accounts.length}\nYang dibeli: ${productData.qty}</blockquote>`, { parse_mode: "HTML" });
      }
      
      const taken = [];
      for (let i = 0; i < productData.qty; i++) {
        const acc = app.accounts.shift();
        if (acc) taken.push(acc);
      }
      
      saveDb(db);
      
      let msg = `<blockquote><b>✅ Transaksi Sukses</b>\n\n<b>» Produk :</b> ${app.nama}\n<b>» Jumlah Beli :</b> ${productData.qty}\n<b>» Total Harga :</b> ${toRupiah(productData.total)}\n<b>» Deskripsi Produk :</b> ${app.deskripsi || '-'}\n\n</blockquote>`;
      
      taken.forEach((a, i) => {
        msg += `<blockquote><b>— Akun ${i+1} —</b>\n<b>Username:</b> ${a.user}\n<b>Password:</b> ${a.pass}\n<b>Link Akses:</b> ${a.link}\n<b>Deskripsi:</b> ${a.desc || '-'}\n\n</blockquote>`;
      });
      

      await safeReply(ctx, msg, { parse_mode: "HTML" });
      await updateTestimoniSelesai(testimoniResult, userNameFull, userId, `App: ${app.nama} x${productData.qty}`, productData.total);
    } 

    // ========== HANDLE GAME PURCHASE ==========
    else if (productData.type === "game") {
      const gamesDB = readGamesDB();
      const game = gamesDB.find(g => g.id === productData.gameId);
      
      if (!game) {
        return safeReply(ctx, "<blockquote>❌ <b>Game tidak ditemukan!</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
      }
      
      game.accounts = game.accounts || [];
      
      if (game.accounts.length < productData.qty) {
        return safeReply(ctx, `<blockquote>❌ <b>Stok tidak mencukupi!</b>\nStok tersedia: ${game.accounts.length}\nYang dibeli: ${productData.qty}</blockquote>`, { parse_mode: "HTML" });
      }
      
      const taken = [];
      for (let i = 0; i < productData.qty; i++) {
        const acc = game.accounts.shift();
        if (acc) taken.push(acc);
      }
      
      saveGamesDB(gamesDB);
      
      let msg = `<blockquote><b>✅ Transaksi Akun Game Sukses</b>\n\n<b>» Game :</b> ${game.name}\n<b>» Tipe :</b> ${game.gameType.toUpperCase()}\n<b>» Jumlah Beli :</b> ${productData.qty}\n<b>» Total Harga :</b> ${toRupiah(productData.total)}\n<b>» Deskripsi :</b> ${game.description || '-'}\n\n</blockquote>`;
      
      taken.forEach((a, i) => {
        msg += `<blockquote><b>— Akun ${i+1} —</b>\n<b>Email:</b> ${a.email}\n<b>Password:</b> ${a.password}\n<b>Info Tambahan:</b> ${a.additionalInfo || '-'}\n\n</blockquote>`;
      });
      

      safeReply(ctx, msg, { parse_mode: "HTML" });
      await updateTestimoniSelesai(testimoniResult, userNameFull, userId, `Game: ${game.name} (${game.gameType}) x${productData.qty}`, productData.total);
    }
    // ========== END GAME PURCHASE ==========
    
    else if (productData.type === "panel_legal") {
      ctx.reply("<blockquote>⏳ <b>Sedang membuat akun panel legal...</b></blockquote>", { parse_mode: "HTML" });
      
      let disk, cpu;
      if (productData.ram === 0) {
        disk = 0;
        cpu = 0;
      } else {
        const gb = productData.ram / 1024;
        disk = gb * 2048;
        cpu = gb * 50;
      }
      
      const result = await createPanelLegalAccount(productData.username, productData.ram, disk, cpu);
      
      if (result.success) {
        const d = result.data;
        ctx.reply(
          `<blockquote><b>✅ PANEL LEGAL BERHASIL DIBUAT</b>\n\n<b>👤 User:</b> ${productData.username}\n<b>🆔 ID:</b> <code>${d.username}</code>\n<b>🔑 PW:</b> <code>${d.password}</code>\n<b>🌐 Login:</b> ${d.login}</blockquote>`,
          { parse_mode: "HTML" }
        );


        await updateTestimoniSelesai(testimoniResult, userNameFull, userId, `Panel Legal ${productData.ram === 0 ? "Unlimited" : productData.ram/1024 + "GB"}`, productData.price);
      } else {
        ctx.reply(`<blockquote>⚠️ <b>Gagal:</b> ${result.msg}</blockquote>`, { parse_mode: "HTML" });
      }
    }

    else if (productData.type === "panel") {
      ctx.reply("<blockquote>⏳ <b>Sedang membuat akun panel...</b></blockquote>", { parse_mode: "HTML" });
      
      let disk, cpu;
      if (productData.ram === 0) {
        disk = 0;
        cpu = 0;
      } else {
        const gb = productData.ram / 1024;
        disk = gb * 2048;
        cpu = gb * 50;
      }
      
      const result = await createPanelAccount(productData.username, productData.ram, disk, cpu);
      
      if (result.success) {
        const d = result.data;
        ctx.reply(
          `<blockquote><b>✅ PANEL BERHASIL DIBUAT</b>\n\n<b>👤 User:</b> ${productData.username}\n<b>🆔 ID:</b> <code>${d.username}</code>\n<b>🔑 PW:</b> <code>${d.password}</code>\n<b>🌐 Login:</b> ${d.login}</blockquote>`,
          { parse_mode: "HTML" }
        );


        await updateTestimoniSelesai(testimoniResult, userNameFull, userId, `Panel ${productData.ram === 0 ? "Unlimited" : productData.ram/1024 + "GB"}`, productData.price);
      } else {
        ctx.reply(`<blockquote>⚠️ <b>Gagal:</b> ${result.msg}</blockquote>`, { parse_mode: "HTML" });
      }
    } 

    else if (productData.type === "admin_panel") {
      await ctx.reply("<blockquote>⏳ <b>Sedang membuat akun Admin Panel...</b></blockquote>", { parse_mode: "HTML" });

      const result = await createAdminAccount(productData.username);
        const link = config.linkResellerPanel || "https://t.me/LinkBelumDiset";

      if (result.success) {
          const d = result.data;
          const msg = `<blockquote><b>🛠️ 𝗔𝗗𝗠𝗜𝗡 𝗣𝗔𝗡𝗘𝗟 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 𝗗𝗜𝗕𝗨𝗔𝗧</b>
━━━━━━━━━━━━━━━━━━━━━━━━━⨳
<b>👤 𝖴𝗌𝖾𝗋 :</b> ${productData.username}
<b>🆔 𝖴𝗌𝖾𝗋𝗇𝖺𝗆𝖾 :</b> <code>${d.username}</code>
<b>🔑 𝖯𝖺𝗌𝗌𝗐𝗈𝗋𝖽 :</b> <code>${d.password}</code>
<b>📧 𝖤𝗆𝖺𝗂𝗅 :</b> ${d.email}
<b>🌐 𝖫𝗈𝗀𝗂𝗇 :</b> ${d.login}
<b>🛡️ 𝖠𝖼𝖼𝖾𝗌𝗌 :</b> ROOT ADMIN (Full Control)
<b>🔗 𝖫𝗂𝗇𝗄 𝖦𝗋𝗎𝖻 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋 𝖯𝖺𝗇𝖾𝗅:</b>
${link}

━━━━━━━━━━━━━━━━━━━━━━━━━⨳
<i>📝 𝖭𝗈𝗍𝖾 : 𝖲𝗂𝗆𝗉𝖺𝗇 𝖣𝖺𝗍𝖺 𝖨𝗇𝗂 𝖣𝖺𝗇 𝖩𝖺𝗇𝗀𝖺𝗇
𝖣𝗂𝗌𝖾𝖻𝖺𝗋𝗄𝖺𝗇 𝖲𝖾𝖼𝖺𝗋𝖺 𝖦𝗋𝖺𝗍𝗂𝗌!</i></blockquote>`;

          await ctx.reply(msg, { parse_mode: "HTML" });

          await updateTestimoniSelesai(testimoniResult, userNameFull, userId, `Admin Panel (${d.username})`, productData.price);
      } else {
          await ctx.reply(`<blockquote>⚠️ <b>Gagal membuat Admin Panel:</b> ${result.msg}\nSilakan hubungi owner.</blockquote>`, { parse_mode: "HTML" });
      }
    }

else if (productData.type === "ubot_prem") {
      const link = config.linkUbot || "https://t.me/LinkBelumDiset";
      
      const msg = `<blockquote><b>🤖 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗕𝗨𝗬𝗘𝗥 𝗨𝗕𝗢𝗧 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 </b>
━━━━━━━━━━━━━━━━━━━━━━━⨳
<b>🚀 𝖳𝖾𝗋𝗂𝗆𝖺𝗄𝖺𝗌𝗂𝗁 𝖲𝗎𝖽𝖺𝗁 𝖬𝖾𝗆𝖻𝖾𝗅𝗂 Akses Ubot Premium!</b>
<b>🔗 𝖡𝖾𝗋𝗂𝗄𝗎𝗍 𝖫𝗂𝗇𝗄 𝖦𝗋𝗎𝖻 Akses Ubot :</b>
${link}

🍂 <i>𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖡𝖾𝗋𝗀𝖺𝖻𝗎𝗇𝗀 𝖦𝗋𝗎𝖻 All Buyer Ubot 𝖣𝗂𝖺𝗍𝖺𝗌 𝖣𝖺𝗇 𝖪𝗈𝗇𝖿𝗂𝗆𝖺𝗌𝗂 𝖪𝖾 𝖮𝗐𝗇𝖾𝗋.</i>
━━━━━━━━━━━━━━━━━━━━━━━⨳</blockquote>`;

      await ctx.reply(msg, { 
          parse_mode: "HTML",
          disable_web_page_preview: true 
      });


      await updateTestimoniSelesai(testimoniResult, userNameFull, userId, "Buy Ubot Premium", productData.price);
    }
    
    else if (productData.type === "reseller_panel_legal") {
      const link = config.linkResellerPanelLegal || "https://t.me/LinkBelumDiset";
      
      const msg = `<blockquote><b>🤝 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗡𝗘𝗪 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥 𝗣𝗔𝗡𝗘𝗟 𝗟𝗘𝗚𝗔𝗟</b>
━━━━━━━━━━━━━━━━━━━━━━━⨳
<b>🚀 𝖳𝖾𝗋𝗂𝗆𝖺𝗄𝖺𝗌𝗂𝗁 𝖲𝗎𝖽𝖺𝗁 𝖬𝖾𝗆𝖻𝖾𝗅𝗂 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋
𝖯𝖺𝗇𝖾𝗅 Legal 𝖪𝖺𝗆𝗂!</b>
<b>🔗 𝖡𝖾𝗋𝗂𝗄𝗎𝗍 𝖫𝗂𝗇𝗄 𝖦𝗋𝗎𝖻 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋 𝖯𝖺𝗇𝖾𝗅 Legal:</b>
${link}

🍂 <i>𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖡𝖾𝗋𝗀𝖺𝖻𝗎𝗇𝗀 𝖦𝗋𝗎𝖻 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋
𝖯𝖺𝗇𝖾𝗅 𝖣𝗂𝖺𝗍𝖺𝗌 𝖣𝖺𝗇 𝖪𝗈𝗇𝖿𝗂𝗆𝖺𝗌𝗂 𝖪𝖾 𝖮𝗐𝗇𝖾𝗋.</i>
━━━━━━━━━━━━━━━━━━━━━━━⨳</blockquote>`;

      await ctx.reply(msg, { 
          parse_mode: "HTML",
          disable_web_page_preview: true 
      });


      await updateTestimoniSelesai(testimoniResult, userNameFull, userId, "Join Reseller Panel Legal", productData.price);
    }
    
    else if (productData.type === "reseller_vps") {
      const link = config.linkResellerVps || "https://t.me/LinkBelumDiset";
      
      const msg = `<blockquote><b>🤝 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗡𝗘𝗪 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥 𝗩𝗣𝗦</b>
━━━━━━━━━━━━━━━━━━━━━━━⨳
<b>🚀 𝖳𝖾𝗋𝗂𝗆𝖺𝗄𝖺𝗌𝗂𝗁 𝖲𝗎𝖽𝖺𝗁 𝖬𝖾𝗆𝖻𝖾𝗅𝗂 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋
VPS 𝖪𝖺𝗆𝗂!</b>
<b>🔗 𝖡𝖾𝗋𝗂𝗄𝗎𝗍 𝖫𝗂𝗇𝗄 𝖦𝗋𝗎𝖻 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋 VPS:</b>
${link}

🍂 <i>𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖡𝖾𝗋𝗀𝖺𝖻𝗎𝗇𝗀 𝖦𝗋𝗎𝖻 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋
VPS 𝖣𝗂𝖺𝗍𝖺𝗌 𝖣𝖺𝗇 𝖪𝗈𝗇𝖿𝗂𝗆𝖺𝗌𝗂 𝖪𝖾 𝖮𝗐𝗇𝖾𝗋.</i>
━━━━━━━━━━━━━━━━━━━━━━━⨳</blockquote>`;

      await ctx.reply(msg, { 
          parse_mode: "HTML",
          disable_web_page_preview: true 
      });


      await updateTestimoniSelesai(testimoniResult, userNameFull, userId, "Join Reseller VPS", productData.price);
    }

    else if (productData.type === "reseller_panel") {
      const link = config.linkResellerPanel || "https://t.me/LinkBelumDiset";
      
      const msg = `<blockquote><b>🤝 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗡𝗘𝗪 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥 𝗣𝗔𝗡𝗘𝗟</b>
━━━━━━━━━━━━━━━━━━━━━━━⨳
<b>🚀 𝖳𝖾𝗋𝗂𝗆𝖺𝗄𝖺𝗌𝗂𝗁 𝖲𝗎𝖽𝖺𝗁 𝖬𝖾𝗆𝖻𝖾𝗅𝗂 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋
𝖯𝖺𝗇𝖾𝗅 𝖪𝖺𝗆𝗂!</b>
<b>🔗 𝖡𝖾𝗋𝗂𝗄𝗎𝗍 𝖫𝗂𝗇𝗄 𝖦𝗋𝗎𝖻 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋 𝖯𝖺𝗇𝖾𝗅 :</b>
${link}

🍂 <i>𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖡𝖾𝗋𝗀𝖺𝖻𝗎𝗇𝗀 𝖦𝗋𝗎𝖻 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋
𝖯𝖺𝗇𝖾𝗅 𝖣𝗂𝖺𝗍𝖺𝗌 𝖣𝖺𝗇 𝖪𝗈𝗇𝖿𝗂𝗆𝖺𝗌𝗂 𝖪𝖾 𝖮𝗐𝗇𝖾𝗋.</i>
━━━━━━━━━━━━━━━━━━━━━━━⨳</blockquote>`;

      await ctx.reply(msg, { 
          parse_mode: "HTML",
          disable_web_page_preview: true 
      });


      await updateTestimoniSelesai(testimoniResult, userNameFull, userId, "Join Reseller Panel", productData.price);
    }

    else if (productData.type === "vps") {


      const loadingMsg = await ctx.reply("<blockquote>⏳ <b>Sedang membuat VPS DigitalOcean...</b>\nProses membutuhkan waktu ±60 detik.</blockquote>", { 
        parse_mode: "HTML" 
      });
      
      try {
        productData.vpsData.username = username;
        
        const result = await createVPSDroplet(userId, productData.vpsData);
        
        try { await ctx.deleteMessage(loadingMsg.message_id); } catch (e) {}
        
        if (result.success) {
          const data = result.data;
          const paketInfo = {
            low: { garansi: 1, replace: 1 },
            medium: { garansi: 3, replace: 2 },
            high: { garansi: 7, replace: 3 }
          };
          
          const paket = productData.vpsData.paket;
          
          const detailVPS = `<blockquote>✅ <b>𝗩𝗣𝗦 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 𝗗𝗜𝗕𝗨𝗔𝗧!</b></blockquote>

<blockquote>🖥️ <b>𝗕𝗘𝗥𝗜𝗞𝗨𝗧 𝗗𝗘𝗧𝗔𝗜𝗟 𝗩𝗣𝗦</b>
━━━━━━━━━━━━━━━━━━━━━━━━━⨳
<b>🌐 𝖨𝖯 𝖠𝖣𝖣𝖱𝖤𝖲𝖲:</b> <code>${data.ip}</code>
<b>🆔 𝖴𝖲𝖤𝖱𝖭𝖠𝖬𝖤 :</b> <code>root</code>
<b>🔐 𝖯𝖠𝖲𝖲𝖶𝖮𝖱𝖣 :</b> <code>${data.password}</code>
<b>🔢 ID DROPLET:</b> <code>${data.dropletId}</code>
<b>🧩 𝖧𝖮𝖲𝖳𝖭𝖠𝖬𝖤 :</b> ${data.hostname}
<b>🌍 𝖱𝖤𝖦𝖨𝖮𝖭 :</b> ${data.region.toUpperCase()}
<b>💿 𝖮𝖲 :</b> ${data.os.toUpperCase()}</blockquote>

<blockquote>🛍️ <b>𝗗𝗘𝗧𝗔𝗜𝗟 𝗣𝗘𝗠𝗕𝗘𝗟𝗜𝗔𝗡</b>
━━━━━━━━━━━━━━━━━━━━━━━━━⨳
<b>📦 𝖯𝖠𝖪𝖤𝖳 :</b> ${paket.toUpperCase()}
<b>💾 𝖲𝖯𝖤𝖲𝖨𝖥𝖨𝖪𝖠𝖲𝖨 :</b> ${productData.vpsData.plan}
<b>💰 𝖧𝖠𝖱𝖦𝖠 :</b> ${toRupiah(productData.vpsData.harga)}
<b>🛡️ 𝖦𝖠𝖱𝖠𝖭𝖲𝖨 :</b> ${(paketInfo[paket]||paketInfo.low).garansi} ${((paketInfo[paket]||paketInfo.low).garansiUnit)==='jam'?'Jam':'Hari'}
<b>♻️ 𝖱𝖤𝖯𝖫𝖠𝖢𝖤 :</b> ${((paketInfo[paket]||paketInfo.low).replace) + "x"}
<b>📅 𝖳𝖠𝖭𝖦𝖦𝖠𝖫 :</b> ${data.created}
<b>👤 𝖯𝖤𝖬𝖡𝖤𝖫𝖨 :</b> ${username}
<b>🤝 𝖯𝖤𝖭𝖩𝖴𝖠𝖫 :</b> @${bot.botInfo.username}</blockquote>`;
          
          await ctx.reply(detailVPS, { parse_mode: "HTML" });
          
          await ctx.reply(
            `<blockquote>📌 <b>𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗦𝗜 𝗣𝗘𝗡𝗧𝗜𝗡𝗚</b>
━━━━━━━━━━━━━━━━━━━━━━━━⨳
• Gunakan IP <code>${data.ip}</code> untuk akses VPS
• Login dengan username <code>root</code> dan password di atas
• VPS sudah ready untuk digunakan
• Mau install Pterodactyl tapi gabisa? silahkan hubungi admin
• Jika ada masalah, silakan hubungi admin</blockquote>`,
            { parse_mode: "HTML" }
          );

          try {
             const dropletCountAfter = await getDropletCount();
             const sisaVPSTesti = dropletCountAfter !== null ? Math.max(0, 10 - dropletCountAfter) : "?";
             const testiText = `🖥️ <b>𝗩𝗣𝗦 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 𝗗𝗜𝗕𝗘𝗟𝗜!</b>\n\n` +
              `👤 <b>𝖯𝖾𝗆𝖻𝖾𝗅𝗂 :</b> ${username}\n` +
              `📦 <b>𝖯𝖺𝗄𝖾𝗍 :</b> ${paket.toUpperCase()}\n` +
              `💾 <b>𝖲𝗉𝖾𝗄 :</b> ${productData.vpsData.plan}\n` +
              `💰 <b>𝖧𝖺𝗋𝗀𝖺 :</b> ${toRupiah(productData.vpsData.harga)}\n` +
              `🕒 <b>𝖶𝖺𝗄𝗍𝗎 :</b> ${new Date().toLocaleString("id-ID")}\n\n` +
              `🎉 <b>𝖳𝗋𝖺𝗇𝗌𝖺𝗄𝗌𝗂 𝖲𝗎𝖼𝖼𝖾𝗌𝗌𝖿𝗎𝗅!</b>\n` +
              `🖥️ <b>VPS TERSISA :</b> ${sisaVPSTesti}`;
            
            if(config.testimoniChannel) {
                await bot.telegram.sendMessage(config.testimoniChannel, testiText, {
                  parse_mode: "HTML",
                  reply_markup: {
                    inline_keyboard: [[{ text: "🛒 𝗢𝗿𝗱𝗲𝗿 𝗩𝗣𝗦", url: `https://t.me/${bot.botInfo.username}?start=shop` }]]
                  }
                });
            }
          } catch (e) {}
          
          await updateTestimoniSelesai(testimoniResult, userNameFull, userId, `VPS ${paket.toUpperCase()} - ${productData.vpsData.plan}`, productData.vpsData.harga);
          
        } else {
          await ctx.reply(`<blockquote>❌ <b>Gagal membuat VPS:</b> ${result.msg}</blockquote>`, { parse_mode: "HTML" });
          await ctx.reply(
            `<blockquote>⚠️ <b>TRANSAKSI GAGAL</b>\n\nMaaf, terjadi kesalahan saat membuat VPS Anda.\n\nSilakan:\n1. Hubungi admin untuk bantuan\n2. Atau minta refund melalui admin</blockquote>`,
            { parse_mode: "HTML" }
          );
          
          try {
            await bot.telegram.sendMessage(config.ownerId, 
              `<b>🚨 ERROR BUAT VPS!</b>\nUser: ${username}\nError: ${result.msg}\nPaket: ${productData.vpsData.paket}`, {parse_mode: "HTML"}
            );
          } catch(e){}
        }
        
        if (userState[userId]?.vpsData) delete userState[userId].vpsData;
        
      } catch (error) {
        try { await ctx.deleteMessage(loadingMsg.message_id); } catch (e) {}
        await ctx.reply(`<blockquote>❌ <b>Error sistem VPS:</b> ${error.message}</blockquote>`, { parse_mode: "HTML" });
      }
    }

    // ========== CONTAINER VPS ==========
    else if (productData.type === "container_vps") {
      const qty = productData.qty || 1;
      const taken = takeStock(qty);
      if (!taken.success) {
        return safeReply(ctx, `<blockquote>❌ <b>${taken.msg}</b>\nHubungi owner untuk refund.</blockquote>`, { parse_mode: "HTML" });
      }
      const dbCv = readContainerVpsDB();
      const garansi = (typeof dbCv.settings?.garansi === 'number' ? dbCv.settings.garansi : dbCv.settings?.garansi?.[productData.paket]) || 7;
      const replace = dbCv.settings?.replace?.[productData.paket] || 1;

      const soldRec = markSold(userId, username, productData.paket, taken.items, productData.price);

      let msg = `<blockquote><b>✅ VPS NAT BERHASIL!</b></blockquote>\n\n`;
      msg += `<b>Paket:</b> ${String(productData.paket || "-").toUpperCase()}\n`;
      msg += `<b>Spek:</b> Spek lumayan · Full 1 bulan\n`;
      msg += `<b>Garansi:</b> ${garansi} hari\n`;
      if (soldRec && soldRec.code) {
        msg += `<b>Kode garansi:</b> <code>${soldRec.code}</code>\n`;
        msg += `<i>Simpan kode ini. Klaim lewat menu Ambil Garansi (1x pakai).</i>\n`;
      }
      msg += `\n`;

      taken.items.forEach((it, i) => {
        msg += `<blockquote><b>— Unit ${i + 1} —</b>\n`;
        msg += `<b>IP / Host:</b> <code>${it.host}</code>\n`;
        msg += `<b>Port:</b> <code>${it.port}</code>\n`;
        msg += `<b>User:</b> <code>${it.username || "root"}</code>\n`;
        msg += `<b>Password:</b> <code>${it.password}</code>\n`;
        msg += `<b>SSH:</b>\n<code>ssh ${it.username || "root"}@${it.host} -p ${it.port}</code>\n`;
        msg += `</blockquote>\n`;
      });
      msg += `\n<i>Simpan data ini. Jika gagal login dalam masa garansi, hubungi owner.</i>`;

      await safeReply(ctx, msg, { parse_mode: "HTML" });
      await updateTestimoniSelesai(
        testimoniResult,
        userNameFull,
        userId,
        `VPS Nat ${String(productData.paket || "").toUpperCase()}`,
        productData.price
      );

      // Broadcast info pembelian + info stok (channel)
      try {
        if (TESTIMONI_CHANNEL) {
          const db2 = readContainerVpsDB();
          const sisa2 = getStockCount();
          const used2 = (db2.sold || []).length;
          const total2 = sisa2 + used2;
          const buyCaption =
            `<blockquote><b>🛒 INFO PEMBELIAN VPS NAT</b>
━━━━━━━━━━━━━━━━━━━━━━
🏪 <b>Toko VPS Hanz</b>

👤 <b>Buyer:</b> ${userNameFull}
📦 <b>Produk:</b> VPS Nat
💰 <b>Harga:</b> ${toRupiah(productData.price)}
✅ <b>Status:</b> Berhasil

📥 <b>Sisa slot sekarang:</b> ${sisa2}
📊 <b>Terpakai:</b> ${used2}/${total2 || 0}
</blockquote>`;
          await bot.telegram.sendMessage(TESTIMONI_CHANNEL, buyCaption, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "🛒 Gass Order", url: "https://t.me/Tokovpshanzx61bot?start=order", style: "success" }]]
            }
          });
          const img2 = await generateContainerVpsStockImage(sisa2, 0, used2);
          const stockCaption =
            `<blockquote><b>📦 INFO STOK VPS NAT</b>
━━━━━━━━━━━━━━━━━━━━━━
📦 Total slot: ${total2}
📊 Terpakai: ${used2}/${total2 || 0}
🟢 Sisa slot: ${sisa2}

✨ Spek lumayan · Full 1 bulan · OS Ubuntu · Murah
</blockquote>`;
          await bot.telegram.sendPhoto(TESTIMONI_CHANNEL, { source: img2 }, {
            caption: stockCaption,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "🛒 Gass Order", url: "https://t.me/Tokovpshanzx61bot?start=order", style: "success" }]]
            }
          });
        }
      } catch (e) {
        console.error("[VPS NAT ORDER BROADCAST]", e.message);
      }
    }
    // ========== END CONTAINER VPS ==========

  } catch (error) {
    console.error("[ERROR] Error sending product:", error);
    safeReply(ctx, "<blockquote>❌ <b>Gagal mengirim produk.</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
  }
}

bot.on("photo", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const state = userState[userId];
    
    if (state?.step === "PAYMENT_MANUAL_PENDING") {
      const photos = ctx.message.photo || [];
      if (photos.length === 0) {
        await ctx.reply("❌ Foto tidak ditemukan. Silakan kirim ulang.");
        return;
      }
      
      const bestPhoto = photos[photos.length - 1];
      
      const paymentData = {
        userId: userId,
        userName: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim(),
        userUsername: ctx.from.username ? `@${ctx.from.username}` : '-',
        itemName: state.itemName,
        amount: state.amount,
        nominal: state.nominal,
        proofPhotoId: bestPhoto.file_id,
        timestamp: Date.now(),
        status: "pending",
        productData: state.productData
      };
      
      const payments = readManualPayments();
      const paymentIndex = payments.length;
      payments.push(paymentData);
      saveManualPayments(payments);
      
      delete userState[userId];
      
      try {
        await bot.telegram.sendPhoto(config.ownerId, paymentData.proofPhotoId, {
          caption: `<blockquote><b>🧾 BUKTI PEMBAYARAN MANUAL</b>\n\n<b>👤 User:</b> ${paymentData.userName}\n<b>🆔 ID:</b> ${paymentData.userId}\n<b>📛 Username:</b> ${paymentData.userUsername}\n\n<b>🛒 Item:</b> ${paymentData.itemName}\n<b>💰 Amount:</b> ${toRupiah(paymentData.amount)}\n<b>⏰ Time:</b> ${new Date(paymentData.timestamp).toLocaleString()}\n\n<i>Verifikasi pembayaran ini:</i></blockquote>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Terima & Kirim Produk", callback_data: `approve_payment_${paymentIndex}` },
                { text: "❌ Tolak", callback_data: `reject_payment_${paymentIndex}` }
              ]
            ]
          }
        });
        
        await ctx.reply("<blockquote>✅ <b>Bukti pembayaran telah dikirim ke owner!</b>\nSilakan tunggu verifikasi. Status akan diberitahu.</blockquote>", { parse_mode: "HTML" });
        
      } catch (ownerError) {
        console.error("[ERROR] Error sending to owner:", ownerError);
        await ctx.reply("<blockquote>❌ <b>Gagal mengirim bukti ke owner.</b> Silakan coba lagi atau hubungi owner langsung.</blockquote>", { parse_mode: "HTML" });
        userState[userId] = state;
      }
      
      return;
    }
    
  } catch (e) {
    console.error("[ERROR] Payment proof error:", e);
    try {
      await ctx.reply("<blockquote>❌ <b>Terjadi kesalahan saat memproses bukti pembayaran.</b> Silakan coba lagi.</blockquote>", { parse_mode: "HTML" });
    } catch (replyError) {
      console.error("[ERROR] Cannot send error message:", replyError);
    }
  }
});

bot.action(/approve_payment_(\d+)/, async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    await ctx.answerCbQuery("❌ Hanya owner yang boleh verifikasi!", { show_alert: true });
    return;
  }
  
  const paymentIndex = parseInt(ctx.match[1]);
  const payments = readManualPayments();
  const payment = payments[paymentIndex];
  
  if (!payment) {
    await ctx.answerCbQuery("❌ Pembayaran tidak ditemukan/terhapus!", { show_alert: true });
    return;
  }
  
  if (payment.status !== "pending") {
    await ctx.answerCbQuery("❌ Pembayaran ini sudah diproses sebelumnya!", { show_alert: true });
    return;
  }
  
  payment.status = "approved";
  payment.approvedBy = ctx.from.id;
  payment.approvedAt = Date.now();
  saveManualPayments(payments);
  
  try {
    await ctx.editMessageCaption(
      `<blockquote><b>✅ PEMBAYARAN DITERIMA</b>\n\n` +
      `<b>👤 User:</b> ${payment.userName}\n` +
      `<b>🛒 Item:</b> ${payment.itemName}\n` +
      `<b>💰 Amount:</b> ${toRupiah(payment.amount)}\n` +
      `<b>⏰ Approved:</b> ${new Date(payment.approvedAt).toLocaleString()}</blockquote>`,
      { parse_mode: "HTML" }
    );
  } catch (e) {
    console.error("[ERROR] Failed to edit message caption:", e.message);
  }
  
  try {
    const fakeCtx = {
      from: { 
        id: payment.userId, 
        first_name: payment.userName.split(' ')[0] || payment.userName,
        last_name: payment.userName.split(' ').slice(1).join(' ') || ''
      },
      reply: (text, extra) => bot.telegram.sendMessage(payment.userId, text, extra),
      replyWithDocument: (file_id, extra) => bot.telegram.sendDocument(payment.userId, file_id, extra),
      telegram: bot.telegram
    };
    
    if (payment.productData) {
      
      if (payment.productData.type === "topup_saldo") {
          const dbSaldoPath = "./database/saldoOtp.json";
          let saldoData = {};
          
          try {
            if (fs.existsSync(dbSaldoPath)) {
                saldoData = JSON.parse(fs.readFileSync(dbSaldoPath, "utf8"));
            }
          } catch(err) { saldoData = {}; }
          
          const saldoMasuk = payment.productData.amount || payment.amount;
          
          saldoData[payment.userId] = (saldoData[payment.userId] || 0) + saldoMasuk;
          fs.writeFileSync(dbSaldoPath, JSON.stringify(saldoData, null, 2));
          
          await bot.telegram.sendMessage(
            payment.userId, 
            `✅ <b>DEPOSIT SUKSES!</b>\n\n💰 Saldo Masuk: <b>${toRupiah(saldoMasuk)}</b>\n💼 Total Saldo: <b>${toRupiah(saldoData[payment.userId])}</b>`, 
            {parse_mode:"HTML"}
          );
          
          const testiDeposit = await sendTestimoniKeChannel(payment.userName, payment.userId, "Deposit Saldo", saldoMasuk, payment.userUsername || payment.userName, [{label:"Jenis", value:"Deposit Saldo"}, {label:"Jumlah", value:"Rp " + Number(saldoMasuk).toLocaleString("id-ID")}], {type:"topup_saldo"});
          await updateTestimoniSelesai(testiDeposit, payment.userName, payment.userId, "Deposit Saldo", saldoMasuk);
      } 
      
      else {
          const testiManual = await sendTestimoniKeChannel(payment.userName, payment.userId, payment.itemName, payment.amount, payment.userUsername || payment.userName, payment.productData ? buildReceiptDetails(payment.productData) : [], payment.productData);
          await sendProductToUser(fakeCtx, payment.productData, testiManual);
      }
      
      await bot.telegram.sendMessage(config.ownerId,
        `<blockquote><b>📦 TRANSAKSI SELESAI</b>\n\n` +
        `<b>👤 User:</b> ${payment.userName}\n` +
        `<b>🆔 ID:</b> ${payment.userId}\n` +
        `<b>🛒 Item:</b> ${payment.itemName}\n` +
        `<b>💰 Amount:</b> ${toRupiah(payment.amount)}\n` +
        `<b>✅ Status:</b> Sukses dikirim/ditambahkan</blockquote>`,
        { parse_mode: "HTML" }
      );
    }
    
    await ctx.answerCbQuery("✅ Pembayaran diterima & diproses!");
    
  } catch (error) {
    console.error("[ERROR] Error in payment approval:", error);
    await bot.telegram.sendMessage(config.ownerId, 
      `<blockquote><b>⚠️ ERROR PROSES TRANSAKSI</b>\n\n` +
      `<b>User:</b> ${payment.userName} (${payment.userId})\n` +
      `<b>Error:</b> ${error.message}\n\n` +
      `<i>Saldo/Produk mungkin belum masuk. Cek manual!</i></blockquote>`,
      { parse_mode: "HTML" }
    );
  }
})

bot.action(/reject_payment_(\d+)/, async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    await ctx.answerCbQuery("❌ Hanya owner yang boleh verifikasi!", { show_alert: true });
    return;
  }
  
  const paymentIndex = parseInt(ctx.match[1]);
  const payments = readManualPayments();
  const payment = payments[paymentIndex];
  
  if (!payment) {
    await ctx.answerCbQuery("❌ Pembayaran tidak ditemukan!", { show_alert: true });
    return;
  }
  
  if (payment.status !== "pending") {
    await ctx.answerCbQuery("❌ Pembayaran sudah diverifikasi!", { show_alert: true });
    return;
  }
  
  payment.status = "rejected";
  payment.rejectedBy = ctx.from.id;
  payment.rejectedAt = Date.now();
  saveManualPayments(payments);
  
  try {
    await ctx.editMessageCaption(`<blockquote><b>❌ PEMBAYARAN DITOLAK</b>\n\n<b>👤 User:</b> ${payment.userName}\n<b>🛒 Item:</b> ${payment.itemName}\n<b>💰 Amount:</b> ${toRupiah(payment.amount)}\n<b>⏰ Rejected:</b> ${new Date(payment.rejectedAt).toLocaleString()}</blockquote>`,
      { parse_mode: "HTML" });
  } catch (e) {
    console.error("[ERROR] Failed to edit message caption:", e);
  }
  
  try {
    await bot.telegram.sendMessage(payment.userId, 
      `<blockquote><b>❌ Pembayaran Anda ditolak!</b>\n\n<b>Alasan:</b> Bukti transfer tidak valid / nominal tidak sesuai.\n<i>Silakan hubungi owner untuk informasi lebih lanjut.</i></blockquote>`,
      { parse_mode: "HTML" }
    );
  } catch (e) {
    console.error("[ERROR] Failed to send rejection message to user:", e);
  }
  
  await ctx.answerCbQuery("❌ Pembayaran ditolak!");
})

bot.command(["withdraw", "wd"], async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;

  const args = ctx.message.text.split(" ");
  const nominal = parseInt(args[1]);

  if (!nominal || isNaN(nominal) || nominal < 1000) {
    return ctx.reply("<blockquote>💰 <b>Gunakan:</b> <code>/withdraw [nominal]</code>\nMinimal Rp 1.000</blockquote>", { parse_mode: "HTML" });
  }

  try {
    const waitMsg = await ctx.reply("⏳ <b>Memproses withdraw...</b>", { parse_mode: "HTML" });
    
    const atlConfig = {
      apiAtlantic: config.ApikeyAtlantic,
      wd_balance: config.wd_balance
    };

    const res = await atlanticTransfer(nominal, atlConfig);

    if (!res.status) throw new Error(res.message);

    const data = res.data;
    const caption = `<blockquote>✅ <b>PERMINTAAN WITHDRAW DIBUAT</b>\n\n` +
      `<b>Reff ID:</b> <code>${data.reff_id}</code>\n` +
      `<b>Transfer ID:</b> <code>${data.id}</code>\n` +
      `<b>Tujuan:</b> ${data.nomor_tujuan} (${data.nama})\n` +
      `<b>Nominal:</b> ${toRupiah(data.nominal)}\n` +
      `<b>Fee:</b> ${toRupiah(data.fee)}\n\n` +
      `<i>Menunggu konfirmasi transfer...</i></blockquote>`;

    await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, caption, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Cek Status WD", `check_wd_${data.id}`)]
      ])
    });

  } catch (err) {
    ctx.reply(`❌ <b>Error:</b> ${err.message}`, { parse_mode: "HTML" });
  }
})

bot.action(/check_wd_(.+)/, async (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("Bukan Owner!");
  const wdId = ctx.match[1];
  
  try {
    const res = await atlanticTransferStatus(wdId, config.ApikeyAtlantic);
    const status = res.data?.status || "processing";
    
    await ctx.answerCbQuery(`Status: ${status.toUpperCase()}`);
    
    if (status === "success") {
      await ctx.editMessageCaption(`<blockquote>✅ <b>WD BERHASIL!</b>\nID: <code>${wdId}</code>\nStatus: <b>SUCCESS</b></blockquote>`, { parse_mode: "HTML" });
    }
  } catch (e) {
    ctx.answerCbQuery("Gagal cek status.");
  }
})

bot.action("menu_wd_info", (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Hanya owner yang bisa melihat info WD!", { show_alert: true });
  }
  
  function sensorString(input, visibleCount = 3, maskChar = 'X') {
    if (!input || input.length <= visibleCount) return input || "Tidak tersedia";
    const visiblePart = input.slice(0, visibleCount);
    const maskedPart = maskChar.repeat(input.length - visibleCount);
    return visiblePart + maskedPart;
  }
  
  function sensorWithSpace(str, visibleCount = 3, maskChar = 'X') {
    if (!str) return "Tidak tersedia";
    let result = '';
    let count = 0;
    for (let char of str) {
      if (char === ' ') {
        result += char;
      } else if (count < visibleCount) { 
        result += char; 
        count++; 
      } else {
        result += maskChar;
      }
    }
    return result;
  }
  
  const wdInfo = config.wd_balance || {};
  
  const infoText = `<blockquote><b>💰 𝗜𝗡𝗙𝗢 𝗪𝗜𝗧𝗛𝗗𝗥𝗔𝗪</b>\n\n` +
    `<b>├⌑ 𝖡𝖺𝗇𝗄/𝖤-𝖶𝖺𝗅𝗅𝖾𝗍 :</b> ${wdInfo.bank_code || "Belum diatur"}\n` +
    `<b>├⌑ 𝖳𝗎𝗃𝗎𝖺𝗇 :</b> ${sensorString(wdInfo.destination_number)}\n` +
    `<b>└⌑ 𝖭𝖺𝗆𝖺 :</b> ${sensorWithSpace(wdInfo.destination_name)}\n\n` +
    `𝖪𝖾𝗍𝗂𝗄 <code>/withdraw [jumlah]</code> untuk menarik saldo.\n` +
    `<b>𝖢𝗈𝗇𝗍𝗈𝗁 :</b> <code>/withdraw 50000</code>\n` +
    `<b>𝖬𝗂𝗇𝗂𝗆𝖺𝗅 :</b> Rp 1.000</blockquote>`;
  
  ctx.editMessageText(infoText, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "menu_owner", style: "danger" }]
      ]
    }
  }).catch(() => {
    ctx.reply(infoText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "menu_owner", style: "danger" }]
        ]
      }
    });
  });
  
  ctx.answerCbQuery();
})

bot.command("cancel", (ctx) => cancelTransaction(ctx));
bot.action("cancel_trx", (ctx) => cancelTransaction(ctx));
async function cancelTransaction(ctx) {
  const userId = ctx.from.id;
  
  if (activeTransactions[userId]) {
    try {
      if (activeTransactions[userId].messageId) {
        await ctx.deleteMessage(activeTransactions[userId].messageId).catch(() => {});
      }
    } catch (e) {}
    
    delete activeTransactions[userId];
    
    if (userState[userId]) {
      delete userState[userId];
    }
    
    await safeReply(ctx, "<blockquote>✅ <b>Transaksi dibatalkan.</b></blockquote>", { parse_mode: "HTML" });
  } else {
    await safeReply(ctx, "<blockquote>⚠️ <b>Tidak ada transaksi aktif.</b></blockquote>", { parse_mode: "HTML" });
  }
  
  if (ctx.updateType === 'callback_query') {
    try {
      await ctx.answerCbQuery();
    } catch (e) {}
  }
}

bot.command("ytsearch", async (ctx) => {
  const query = ctx.message.text.split(" ").slice(1).join(" ");
  if (!query) return safeReply(ctx, "<blockquote>❌ <b>Gunakan:</b> <code>/ytsearch judul lagu / keyword</code></blockquote>", { parse_mode: "HTML" });

  try {
    await safeReply(ctx, "<blockquote>🔍 <b>Mencari video di YouTube...</b></blockquote>", { parse_mode: "HTML" });

    const api = `https://api-ralzz.vercel.app/search/youtube?apikey=ubot&q=${encodeURIComponent(query)}`;
    const res = await axios.get(api);

    if (!res.data || !res.data.result || res.data.result.length === 0) {
      return safeReply(ctx, "<blockquote>❌ <b>Tidak ada hasil ditemukan.</b></blockquote>", { parse_mode: "HTML" });
    }

    const results = res.data.result.slice(0, 10); 

    results.forEach((vid, i) => {
      const text =
`<b>🎬 ${vid.title}</b>
<b>👤 Channel:</b> ${vid.author?.name || "-"}
<b>⏱ Durasi:</b> ${vid.duration?.timestamp || "-"}
<b>👁 Views:</b> ${vid.views?.toLocaleString() || "-"}

<b>🔗</b> ${vid.url}`;

      safeReply(ctx, text, { parse_mode: "HTML" });
    });

  } catch (err) {
    console.error(err);
    safeReply(ctx, "<blockquote>❌ <b>Error mengambil data pencarian YouTube.</b></blockquote>", { parse_mode: "HTML" });
  }
})

bot.command("ssweb", async (ctx) => {
  const url = ctx.message.text.split(" ")[1];
  if (!url) return safeReply(ctx, "<blockquote>❌ <b>Gunakan:</b> <code>/ssweb url</code></blockquote>", { parse_mode: "HTML" });

  try {
    safeReply(ctx, "<blockquote>⏳ <b>Mengambil screenshot...</b></blockquote>", { parse_mode: "HTML" });

    const api = `https://api-ralzz.vercel.app/tools/ssweb?apikey=ubot&url=${encodeURIComponent(url)}`;
    const res = await axios.get(api);

    if (!res.data || !res.data.result) {
      return safeReply(ctx, "<blockquote>❌ <b>Gagal mengambil screenshot.</b></blockquote>", { parse_mode: "HTML" });
    }

    await ctx.replyWithPhoto(res.data.result, {
      caption: "<blockquote>✅ <b>Screenshot berhasil!</b></blockquote>",
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error(err);
    safeReply(ctx, "<blockquote>❌ <b>Error: tidak bisa mengambil screenshot.</b></blockquote>", { parse_mode: "HTML" });
  }
})

bot.command("makeqr", async(ctx) => {
  const txt = ctx.message.text.replace("/makeqr", "").trim();
  if (!txt) return safeReply(ctx, "<blockquote><b>Gunakan:</b> <code>/makeqr teks</code></blockquote>", { parse_mode: "HTML" });
  ctx.replyWithPhoto(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(txt)}`);
})

bot.command("tiktokmp4", async (ctx) => {
  const url = ctx.message.text.split(" ")[1];
  if (!url) return safeReply(ctx, "<blockquote>❌ <b>Gunakan:</b> <code>/tiktok url</code></blockquote>", { parse_mode: "HTML" });
  try {
    safeReply(ctx, "<blockquote>⏳ <b>Mengambil video TikTok...</b></blockquote>", { parse_mode: "HTML" });
    const res = await axios.get(`https://api-ralzz.vercel.app/download/tiktok?apikey=ubot&url=${encodeURIComponent(url)}`);
    if (!res.data.result.video_sd) return safeReply(ctx, "<blockquote>❌ <b>Gagal mengambil video!</b></blockquote>", { parse_mode: "HTML" });
    await ctx.replyWithVideo(res.data.video_sd, { caption: "<blockquote>✅ <b>TikTok Tanpa Watermark</b></blockquote>", parse_mode: "HTML" });
  } catch (e) { console.log(e); safeReply(ctx, "<blockquote>❌ <b>Error: tidak bisa download TikTok.</b></blockquote>", { parse_mode: "HTML" }); }
})

bot.command("ytmp3", async (ctx) => {
  const url = ctx.message.text.split(" ")[1];
  if (!url) return safeReply(ctx, "<blockquote><b>Gunakan:</b> <code>/ytmp3 url</code></blockquote>", { parse_mode: "HTML" });
  safeReply(ctx, "<blockquote>⏳ <b>Mengambil audio...</b></blockquote>", { parse_mode: "HTML" });
  try {
    const res = await axios.get(`https://api-ralzz.vercel.app/download/ytmp3v2?apikey=ubot&url=${encodeURIComponent(url)}`);
    await ctx.replyWithAudio(res.data.result, { caption: "<blockquote>🎵 <b>YouTube Audio Downloaded</b></blockquote>", parse_mode: "HTML" });
  } catch (e) { safeReply(ctx, "<blockquote>❌ <b>Gagal mengambil audio.</b></blockquote>", { parse_mode: "HTML" }); }
})

bot.command("shorten", async (ctx) => {
  const url = ctx.message.text.split(" ")[1];
  if (!url) return safeReply(ctx, "<blockquote><b>Gunakan:</b> <code>/shorten url</code></blockquote>", { parse_mode: "HTML" });
  try {
    const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    safeReply(ctx, `<blockquote><b>🔗 Shortened URL:</b>\n${res.data}</blockquote>`, { parse_mode: "HTML" });
  } catch (e) { safeReply(ctx, "<blockquote>❌ <b>Gagal memendekkan URL.</b></blockquote>", { parse_mode: "HTML" }); }
})

bot.command("checkerror", async (ctx) => {
    if (!ctx.message.reply_to_message?.document)
        return safeReply(ctx, "<blockquote>❌ <b>Reply file untuk dianalisa!</b></blockquote>", { parse_mode: "HTML" });

    const file = ctx.message.reply_to_message.document;
    const fileId = file.file_id;
    const fileName = file.file_name;

    const limit = updateUserLimit(ctx.from.id);
    if (limit < 0) return safeReply(ctx, "<blockquote>❌ <b>Limit habis!</b> Upgrade ke premium.</blockquote>", { parse_mode: "HTML" });

    try {
        safeReply(ctx, "<blockquote>📥 <b>Mengunduh & menganalisa file...</b></blockquote>", { parse_mode: "HTML" });

        const buff = await downloadFile(fileId);
        const content = getFileContent(buff);

        const analysis = await analyzeErrorWithGemini(content, fileName);

        safeReply(ctx, `<b>📄 Hasil Analisis:</b>\n\n${analysis}\n\n<b>Sisa limit:</b> ${getUserLimit(ctx.from.id)}`,
            { parse_mode: "HTML" }
        );
    } catch (err) {
        safeReply(ctx, "<blockquote>❌ <b>Error:</b></blockquote>" + err.message, { parse_mode: "HTML" });
    }
})

bot.command("fixerror", async (ctx) => {
    if (!ctx.message.reply_to_message?.document)
        return safeReply(ctx, "❌ <b>Reply file untuk diperbaiki!</b>", { parse_mode: "HTML" });

    const file = ctx.message.reply_to_message.document;
    const fileId = file.file_id;
    const fileName = file.file_name;

    const limit = updateUserLimit(ctx.from.id);
    if (limit < 0) return safeReply(ctx, "❌ <b>Limit habis!</b> Upgrade ke premium.", { parse_mode: "HTML" });

    try {
        safeReply(ctx, "🔧 <b>Memperbaiki error dengan Gemini...</b>", { parse_mode: "HTML" });

        const buff = await downloadFile(fileId);
        const content = getFileContent(buff);

        const fixed = await fixErrorWithGemini(content, fileName);

        ctx.replyWithDocument(
            { source: Buffer.from(fixed), filename: `fixed_${fileName}` },
            { caption: `✔ <b>Error berhasil diperbaiki!</b>\n<b>Sisa limit:</b> ${getUserLimit(ctx.from.id)}`, parse_mode: "HTML" }
        );
    } catch (err) {
        safeReply(ctx, "❌ <b>Error:</b> " + err.message, { parse_mode: "HTML" });
    }
})

bot.command("qc", async (ctx) => {
  try {
    const reply = ctx.message.reply_to_message;

    if (!reply) {
      return ctx.reply(
        "❌ <b>Contoh penggunaan:</b> <code>/qc (reply pesan)</code>",
        { parse_mode: "HTML" }
      );
    }

    const target = reply.forward_from || reply.from;
    const username = target.first_name || "User";

    let avatarUrl = "https://files.catbox.moe/nwvkbt.png";

    try {
      const photos = await ctx.telegram.getUserProfilePhotos(target.id, 0, 1);

      if (photos.total_count > 0) {
        const file = await ctx.telegram.getFileLink(photos.photos[0][0].file_id);
        avatarUrl = file.href;
      }
    } catch (err) {
      console.log("Avatar fetch error:", err);
    }

    const messageText = reply.text || reply.caption || "(pesan tidak berisi teks)";

    const payload = {
      type: "quote",
      format: "png",
      backgroundColor: "#000000",
      width: 512,
      height: 768,
      scale: 2,
      messages: [
        {
          entities: [],
          avatar: true,
          from: {
            id: target.id,
            name: username,
            photo: { url: avatarUrl },
          },
          text: messageText,
          replyMessage: {},
        },
      ],
    };

    const loading = await ctx.reply(
      `<blockquote>⏳ <b>Membuat sticker quote...</b></blockquote>`,
      { parse_mode: "HTML" }
    );

    const result = await axios.post(
      "https://bot.lyo.su/quote/generate",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    const buffer = Buffer.from(result.data.result.image, "base64");

    await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);

    await ctx.replyWithSticker({ source: buffer });
  } catch (err) {
    console.error("QC ERROR:", err);
    return ctx.reply(
      `<blockquote>❌ <b>Terjadi kesalahan saat membuat sticker.</b></blockquote>`,
      { parse_mode: "HTML" }
    );
  }
})

bot.command("brat", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");

  if (!text) {
    return ctx.reply("❌ <b>Contoh:</b> <code>/brat (kata-kata)</code>", {
      parse_mode: "HTML"
    });
  }

  const chatId = ctx.chat.id;
  const tempFilePath = "./brat_temp.webp";

  try {
    await ctx.reply("<blockquote>⏳ <b>Membuat sticker, tunggu sebentar...</b></blockquote>", { parse_mode: "HTML" });

    const imageUrl = `https://kepolu-brat.hf.space/brat?q=${encodeURIComponent(text)}`;

    const downloadFile = async (url, dest) => {
      const writer = fs.createWriteStream(dest);

      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    };

    await downloadFile(imageUrl, tempFilePath);

    await ctx.replyWithSticker({ source: tempFilePath });

    fs.unlinkSync(tempFilePath);

  } catch (err) {
    console.error(err);
    ctx.reply("<blockquote>❌ <b>Terjadi kesalahan saat membuat sticker. Coba lagi nanti.</b></blockquote>", { parse_mode: "HTML" });
  }
})

async function uploadToCatbox(buffer, filename) {
  try {
    const form = new FormData();
    form.append('fileToUpload', buffer, { filename: filename });
    form.append('reqtype', 'fileupload');
    
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: {
        ...form.getHeaders()
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}


bot.command("tourl", async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const replyMsg = ctx.message.reply_to_message;
    if (!replyMsg) {
      return ctx.reply(
        `<blockquote>❌ <b>Balas sebuah pesan yang berisi file/audio/video dengan perintah /tourl</b></blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    if (
      !replyMsg.document &&
      !replyMsg.photo &&
      !replyMsg.video &&
      !replyMsg.audio &&
      !replyMsg.voice
    ) {
      return ctx.reply(
        `<blockquote>❌ <b>Pesan yang kamu balas tidak mengandung file/audio/video yang bisa diupload.</b></blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    let fileId, filename;

    if (replyMsg.document) {
      fileId = replyMsg.document.file_id;
      filename = replyMsg.document.file_name;
    } else if (replyMsg.photo) {
      const photoArray = replyMsg.photo;
      fileId = photoArray[photoArray.length - 1].file_id;
      filename = "photo.jpg";
    } else if (replyMsg.video) {
      fileId = replyMsg.video.file_id;
      filename = replyMsg.video.file_name || "video.mp4";
    } else if (replyMsg.audio) {
      fileId = replyMsg.audio.file_id;
      filename = replyMsg.audio.file_name || "audio.mp3";
    } else if (replyMsg.voice) {
      fileId = replyMsg.voice.file_id;
      filename = "voice.ogg";
    }

    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;

    const res = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(res.data);

    const catboxUrl = await uploadToCatbox(buffer, filename);

    await ctx.reply(
      `<blockquote>✅ <b>File berhasil diupload ke Catbox:</b>\n<code>${catboxUrl}</code></blockquote>`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("tourl error:", err);
    
    const cleanError = err.message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    ctx.reply(
      `<blockquote>❌ <b>Gagal upload file:</b> ${cleanError}</blockquote>`,
      { parse_mode: "HTML" }
    );
  }
})

function calcTotalPrice(basePrice, qty) {
  if (qty <= 1) return basePrice;
  return basePrice * qty;
}

function renderPurchaseText(app, qty, total) {
  const stock = (app.accounts || []).length;
  return `<b>• Produk :</b> ${app.nama}
<b>• Sisa Stok :</b> ${stock}
<b>• Deskripsi :</b> ${app.deskripsi || '-'}

──────────────

<b>• Jumlah :</b> ${qty}
<b>• Harga Satuan :</b> ${toRupiah(app.harga)}
<b>• Total Harga :</b> ${toRupiah(total)}

<i>Updated: ${new Date().toLocaleTimeString()}</i>`;
}



// ============================================================
// ========== CONTAINER VPS HANDLERS ==========
// ============================================================

bot.action("menu_container_vps", async (ctx) => {
  if (!(await requirePrivateChat(ctx, "menu_container_vps"))) return;
  if (!(await requireJoinTesti(ctx))) return;
  await ctx.answerCbQuery().catch(() => {});
  await showRichLoading(ctx, "Memuat VPS Nat", "Mengambil stok realtime...");

  const db = readContainerVpsDB();
  const sisa = getStockCount();
  const terpakai = (db.sold || []).length;
  const totalSlot = sisa + terpakai;
  const harga =
    typeof db.settings?.harga === "number"
      ? db.settings.harga
      : db.settings?.harga?.nat ||
        db.settings?.harga?.low ||
        6000;

  const caption =
    `<blockquote expandable><b>📦 𝗜𝗡𝗙𝗢 𝗦𝗧𝗢𝗞 · 𝗩𝗣𝗦 𝗡𝗔𝗧</b>
${UI.line}
🏪 <b>${UI.brand}</b>

${UI.bullet} <b>Total slot</b>  · <code>${totalSlot}</code>
${UI.bullet} <b>Terpakai</b>    · <code>${terpakai}/${totalSlot || 0}</code>
${UI.bullet} <b>Sisa slot</b>   · <code>${sisa}</code>
${UI.line}
✨ Spek lumayan · 📅 Full 1 bulan
🐧 OS Ubuntu · 💸 Murah meriah

💰 <b>Harga</b> · <code>${toRupiah(harga)}</code>
</blockquote>
<i>${UI.spark} Stok realtime · order otomatis</i>`;

  const kb = {
    inline_keyboard: [
      [{ text: `🛒 𝗢𝗿𝗱𝗲𝗿 𝗩𝗣𝗦 𝗡𝗮𝘁 — ${toRupiah(harga)}`, callback_data: "cvps_syarat", style: "success" }],
      [{ text: "🔙 Kembali", callback_data: "shop_menu", style: "danger" }]
    ]
  };

  try {
    let img;
    try {
      let doSisa = 0;
      try {
        const c = await getDropletCount();
        if (c !== null) doSisa = Math.max(0, 10 - c);
      } catch (_) {}
      img = await generateDualStockImage(sisa, doSisa);
    } catch {
      img = await generateContainerVpsStockImage(sisa, 0, terpakai);
    }
    await editOrSendPhoto(ctx, img, caption, kb);
  } catch (e) {
    console.error("[VPS NAT MENU IMG]", e.message);
    await editOrSendText(ctx, caption, kb);
  }
});




bot.action(/cvps_paket_(low|standard|high)/, async (ctx) => {
  if (!(await requirePrivateChat(ctx, "cvps_paket"))) return;

  const paket = ctx.match[1];
  const db = readContainerVpsDB();
  const sisa = getStockCount();
  const terpakai = (db.sold || []).length;
  const totalSlot = sisa + terpakai;
  const harga =  (typeof db.settings?.harga === 'number' ? db.settings.harga : (db.settings?.harga?.nat || 6000)) ;
  const garansi = db.settings?.garansi?.[paket] || 1;
  const replace = db.settings?.replace?.[paket] || 1;

  if (sisa < 1) {
    await ctx.answerCbQuery("❌ Stok VPS Nat habis!", { show_alert: true });
    return;
  }

  const caption =
    `<blockquote><b>📦 ORDER CONTAINER VPS</b>
━━━━━━━━━━━━━━━━━━━━━━
🏪 <b>Toko VPS Hanz</b>

📦 <b>Total slot VPS :</b> ${totalSlot}
📊 <b>Terpakai :</b> ${terpakai}/${totalSlot || 0}
🟢 <b>Sisa slot :</b> ${sisa}

🏷️ <b>Paket:</b> ${paket.toUpperCase()}
🖥️ <b>Spek:</b> 1 GB RAM · 2 vCPU
🛡️ <b>Garansi:</b> ${garansi} hari
♻️ <b>Replace:</b> ${replace}x
💰 <b>Harga:</b> ${toRupiah(harga)}
</blockquote>`;

  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛒 Order Sekarang", callback_data: `cvps_buy_${paket}` }],
        [{ text: "🔙 Batal", callback_data: "menu_container_vps" }]
      ]
    }
  });
  ctx.answerCbQuery().catch(() => {});
});




bot.action("cvps_syarat", async (ctx) => {
  if (!(await requirePrivateChat(ctx, "cvps_syarat"))) return;
  await ctx.answerCbQuery().catch(() => {});

  const db = readContainerVpsDB();
  const sisa = getStockCount();
  if (sisa < 1) {
    return ctx.answerCbQuery("❌ Stok VPS Nat habis!", { show_alert: true }).catch(() => {});
  }

  const text =
    `<blockquote expandable><b>📜 𝗦𝗬𝗔𝗥𝗔𝗧 & 𝗞𝗘𝗧𝗘𝗡𝗧𝗨𝗔𝗡 · 𝗩𝗣𝗦 𝗡𝗔𝗧</b>
${UI.line}
🏪 <b>${UI.brand}</b>

${UI.bullet} <b>Produk</b>
• VPS NAT spek lumayan (±1GB / 2vCPU)
• OS Ubuntu · Full 1 bulan
• Shared / ephemeral (bukan dedicated)

${UI.bullet} <b>Pesanan</b>
• Diproses setelah pembayaran lunas
• Data akses (IP · Port · Password) dikirim otomatis
• Simpan data akses sendiri

${UI.bullet} <b>Penggunaan</b>
• User default: <code>root</code>
• Dilarang: aktivitas ilegal, DDoS, mining berat
• Pelanggaran → putus layanan tanpa refund

${UI.bullet} <b>Garansi 7 hari</b>
• Klaim hanya jika VPS benar-benar <b>mati</b>
• Password harus cocok · kode sekali pakai
• VPS masih hidup → klaim ditolak
• Diganti 1 unit dari stok

${UI.bullet} <b>Refund</b>
• Hanya jika akses gagal dikirim tanpa solusi
• Tidak ada refund karena “tidak cocok” / sudah dipakai

${UI.bullet} <b>Lainnya</b>
• Backup data tanggung jawab pembeli
• Uptime tidak dijamin 100%
• Order = setuju S&amp;K ini
${UI.line}
</blockquote>

<i>${UI.spark} Baca dulu sebelum order ya</i>`;

  const kb = {
    inline_keyboard: [
      [{ text: "✅ 𝗟𝗮𝗻𝗷𝘂𝘁 𝗢𝗿𝗱𝗲𝗿", callback_data: "cvps_order_qty", style: "success" }],
      [{ text: "🔙 Kembali", callback_data: "menu_container_vps", style: "danger" }]
    ]
  };

  await editOrSendText(ctx, text, kb);
});


/** Tampilkan pilih jumlah VPS Nat: [-] [N vps] [+] + Gass Order */
async function showCvpsQtyMenu(ctx, qty) {
  const db = readContainerVpsDB();
  const sisa = getStockCount();
  const hargaSatuan =
    typeof db.settings?.harga === "number"
      ? db.settings.harga
      : db.settings?.harga?.nat || db.settings?.harga?.low || 6000;

  qty = Math.max(1, parseInt(qty, 10) || 1);
  if (sisa > 0 && qty > sisa) qty = sisa;

  const total = hargaSatuan * qty;
  userState[ctx.from.id] = {
    ...(userState[ctx.from.id] || {}),
    cvpsQty: qty,
    cvpsHargaSatuan: hargaSatuan
  };

  const caption =
    `<blockquote expandable><b>📦 𝗢𝗥𝗗𝗘𝗥 · 𝗩𝗣𝗦 𝗡𝗔𝗧</b>
${UI.line}
🏪 <b>${UI.brand}</b>

${UI.bullet} <b>Sisa stok</b>     · <code>${sisa}</code>
${UI.bullet} <b>Harga / unit</b> · <code>${toRupiah(hargaSatuan)}</code>
${UI.bullet} <b>Jumlah</b>       · <code>${qty} VPS</code>
${UI.bullet} <b>Total bayar</b>  · <code>${toRupiah(total)}</code>
${UI.line}
✨ Spek lumayan · Full 1 bulan · Ubuntu
</blockquote>
<i>${UI.spark} Atur jumlah lalu tekan Gass Order</i>`;

  const kb = {
    inline_keyboard: [
      [
        { text: "➖", callback_data: "cvps_qty_minus", style: "danger" },
        { text: `${qty} VPS`, callback_data: "cvps_qty_noop", style: "primary" },
        { text: "➕", callback_data: "cvps_qty_plus", style: "success" }
      ],
      [{ text: "🛒 𝗚𝗮𝘀𝘀 𝗢𝗿𝗱𝗲𝗿", callback_data: "cvps_gass_order", style: "success" }],
      [{ text: "🔙 Kembali", callback_data: "menu_container_vps", style: "danger" }]
    ]
  };

  await editOrSendText(ctx, caption, kb);
}

bot.action("cvps_order_qty", async (ctx) => {
  if (!(await requirePrivateChat(ctx, "cvps_order_qty"))) return;
  await ctx.answerCbQuery().catch(() => {});
  const sisa = getStockCount();
  if (sisa < 1) {
    return ctx.answerCbQuery("❌ Stok VPS Nat habis!", { show_alert: true }).catch(() => {});
  }
  await showCvpsQtyMenu(ctx, 1);
});

bot.action("cvps_qty_noop", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
});

bot.action("cvps_qty_minus", async (ctx) => {
  if (!(await requirePrivateChat(ctx, "cvps_qty_minus"))) return;
  const st = userState[ctx.from.id] || {};
  let qty = Math.max(1, (st.cvpsQty || 1) - 1);
  await ctx.answerCbQuery().catch(() => {});
  await showCvpsQtyMenu(ctx, qty);
});

bot.action("cvps_qty_plus", async (ctx) => {
  if (!(await requirePrivateChat(ctx, "cvps_qty_plus"))) return;
  const sisa = getStockCount();
  const st = userState[ctx.from.id] || {};
  let qty = (st.cvpsQty || 1) + 1;
  if (qty > sisa) {
    await ctx.answerCbQuery(`❌ Stok tidak cukup, stok hanya ${sisa}`, { show_alert: true }).catch(() => {});
    qty = Math.max(1, sisa);
  } else {
    await ctx.answerCbQuery().catch(() => {});
  }
  await showCvpsQtyMenu(ctx, qty);
});

bot.action("cvps_gass_order", async (ctx) => {
  if (!(await requirePrivateChat(ctx, "cvps_gass_order"))) return;

  const db = readContainerVpsDB();
  const sisa = getStockCount();
  const st = userState[ctx.from.id] || {};
  let qty = Math.max(1, parseInt(st.cvpsQty, 10) || 1);
  const hargaSatuan =
    st.cvpsHargaSatuan ||
    (typeof db.settings?.harga === "number"
      ? db.settings.harga
      : db.settings?.harga?.nat || db.settings?.harga?.low || 6000);

  if (sisa < 1) {
    await ctx.answerCbQuery("❌ Stok VPS Nat habis!", { show_alert: true });
    return;
  }
  if (qty > sisa) {
    await ctx.answerCbQuery(`❌ Stok tidak cukup, stok hanya ${sisa}`, { show_alert: true });
    await showCvpsQtyMenu(ctx, sisa);
    return;
  }

  const total = hargaSatuan * qty;
  await ctx.answerCbQuery().catch(() => {});

  await handlePayment(ctx, total, `VPS Nat x${qty}`, {
    type: "container_vps",
    paket: "nat",
    name: "VPS Nat",
    qty,
    harga: total,
    hargaSatuan
  });
});

// kompatibel tombol lama
bot.action(/cvps_buy_(low|standard|high|nat)/, async (ctx) => {
  if (!(await requirePrivateChat(ctx, "cvps_buy"))) return;
  await ctx.answerCbQuery().catch(() => {});
  const sisa = getStockCount();
  if (sisa < 1) {
    await ctx.answerCbQuery("❌ Stok VPS Nat habis!", { show_alert: true });
    return;
  }
  await showCvpsQtyMenu(ctx, 1);
});



bot.action("owner_container_vps", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Owner only!", { show_alert: true });
  }
  const stock = getStockCount();
  const db = readContainerVpsDB();
  const soldCount = (db.sold || []).length;

  const text =
    `<blockquote><b>📦 STOCK VPS NAT</b></blockquote>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>Stok tersedia:</b> <code>${stock}</code>\n` +
    `<b>Terjual:</b> <code>${soldCount}</code>\n\n` +
    `<b>Format add stock:</b>\n` +
    `<code>/addstock host:port|password,host2|pass2</code>\n\n` +
    `<i>Bot akan cek TCP aktif sebelum masuk stok.</i>`;

  await editMenuMessage(ctx, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 List Stok", callback_data: "cvps_list_stock" }],
        [{ text: "➕ Hint Add Stock", callback_data: "cvps_hint_add" }],
        [{ text: "🔍 Cek Realtime Stok", callback_data: "cvps_check_all", style: "primary" }],
        [{ text: "🗓 Hapus Stok >15 Hari", callback_data: "cvps_purge_15", style: "danger" }],
        [{ text: "🧹 Hapus Stok >15 Hari", callback_data: "cvps_expire_15", style: "danger" }],
        [{ text: "💰 Set Harga Paket", callback_data: "cvps_set_harga" }],
        [{ text: "✏️ Edit Banner Semua Stok", callback_data: "cvps_edit_banner" }],
        [{ text: "🗑 Reset Stok Tersedia", callback_data: "cvps_reset_available" }],
        [{ text: "⚠️ Reset SEMUA (stok+riwayat)", callback_data: "cvps_reset_all" }],
        [{ text: "🔙 Kembali", callback_data: "menu_owner" }]
      ]
    }
  });
  ctx.answerCbQuery().catch(() => {});
});

bot.action("cvps_reset_available", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Owner only!", { show_alert: true });
  }
  const db = readContainerVpsDB();
  const before = (db.stock || []).filter((s) => s.status === "available").length;
  if (before === 0) {
    return ctx.answerCbQuery("Stok tersedia sudah kosong", { show_alert: true });
  }
  await editMenuMessage(ctx,
    `<blockquote><b>⚠️ KONFIRMASI RESET STOK</b>\n\nHapus <b>${before}</b> stok available?\nRiwayat terjual tidak dihapus.</blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Ya, hapus stok tersedia", callback_data: "cvps_reset_available_yes" },
          { text: "❌ Batal", callback_data: "owner_container_vps" }
        ]]
      }
    }
  );
  ctx.answerCbQuery().catch(() => {});
});

bot.action("cvps_reset_available_yes", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const db = readContainerVpsDB();
  const before = (db.stock || []).filter((s) => s.status === "available").length;
  db.stock = (db.stock || []).filter((s) => s.status !== "available");
  saveContainerVpsDB(db);
  await ctx.answerCbQuery(`✅ ${before} stok dihapus`, { show_alert: true });
  await editMenuMessage(ctx,
    `<blockquote>✅ <b>Stok tersedia di-reset</b>\nDihapus: <b>${before}</b>\nSisa available: <b>0</b></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Kembali Stock Menu", callback_data: "owner_container_vps" }]]
      }
    }
  );
});

bot.action("cvps_reset_all", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Owner only!", { show_alert: true });
  }
  const db = readContainerVpsDB();
  const avail = (db.stock || []).filter((s) => s.status === "available").length;
  const sold = (db.sold || []).length;
  await editMenuMessage(ctx,
    `<blockquote><b>⚠️ KONFIRMASI RESET SEMUA</b>\n\nStok available: <b>${avail}</b>\nRiwayat sold: <b>${sold}</b>\nHarga & setting tidak dihapus.</blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Ya, RESET SEMUA", callback_data: "cvps_reset_all_yes" },
          { text: "❌ Batal", callback_data: "owner_container_vps" }
        ]]
      }
    }
  );
  ctx.answerCbQuery().catch(() => {});
});

bot.action("cvps_reset_all_yes", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const db = readContainerVpsDB();
  const avail = (db.stock || []).filter((s) => s.status === "available").length;
  const sold = (db.sold || []).length;
  db.stock = [];
  db.sold = [];
  saveContainerVpsDB(db);
  await ctx.answerCbQuery("✅ Semua stok & riwayat dihapus", { show_alert: true });
  await editMenuMessage(ctx,
    `<blockquote>✅ <b>RESET SEMUA SELESAI</b>\nStok: <b>${avail}</b> · Riwayat: <b>${sold}</b>\nAvailable sekarang: <b>0</b></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Kembali Stock Menu", callback_data: "owner_container_vps" }]]
      }
    }
  );
});

bot.action("cvps_hint_add", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  await ctx.answerCbQuery();
  await safeReply(
    ctx,
    `<blockquote><b>➕ ADD STOCK VPS NAT</b>\n\n<code>/addstock host:port|password,host2:port|pass2</code>\n\nContoh:\n<code>/addstock 66.33.22.220:29798|pass123</code></blockquote>`,
    { parse_mode: "HTML" }
  );
});

bot.action("cvps_list_stock", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const list = getAvailableStock();
  if (!list.length) {
    await ctx.answerCbQuery("Stok kosong", { show_alert: true });
    return;
  }
  let msg = `<b>📋 STOK VPS NAT (${list.length})</b>\n\n`;
  list.slice(0, 30).forEach((s, i) => {
    msg += `<b>${i + 1}.</b> <code>${s.host}:${s.port}</code>\n   🔑 <code>${s.password}</code>\n\n`;
  });
  if (list.length > 30) msg += `\n<i>...dan ${list.length - 30} lainnya</i>`;
  await safeReply(ctx, msg, { parse_mode: "HTML" });
  ctx.answerCbQuery().catch(() => {});
});


bot.action("cvps_expire_15", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Owner only!", { show_alert: true });
  }
  await ctx.answerCbQuery().catch(() => {});
  const res = purgeExpiredStock(15);
  await safeReply(
    ctx,
    `<blockquote><b>🧹 HAPUS STOK >15 HARI</b>
Dihapus: <b>${res.removed}</b>
Sisa stok available: <b>${res.totalLeft}</b>
</blockquote>` +
      (res.items || []).slice(0, 15).map((i) => `• <code>${i.host}:${i.port}</code>`).join("\n"),
    { parse_mode: "HTML" }
  );
});


bot.action("cvps_purge_15", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  await ctx.answerCbQuery().catch(() => {});
  const r = purgeExpiredStock(15);
  await safeReply(
    ctx,
    `<blockquote><b>🗓 PURGE STOK >15 HARI</b>
Dihapus: <b>${r.removed}</b>
Sisa available: <b>${r.totalLeft}</b>
</blockquote>`,
    { parse_mode: "HTML" }
  );
});

bot.action("cvps_check_all", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  await ctx.answerCbQuery("⏳ Cek realtime TCP + login...").catch(() => {});
  const wait = await safeReply(ctx, "⏳ Mengecek status realtime semua stok (TCP + SSH login)...", { parse_mode: "HTML" });
  try {
    const report = await checkAllStockRealtime();
    let lines = (report.results || []).slice(0, 20).map((r) => {
      const icon = r.ok ? "✅" : r.tcp ? "⚠️" : "❌";
      return `${icon} <code>${r.host}:${r.port}</code> — ${r.info}`;
    });
    const msg =
      `<blockquote><b>🔍 CEK REALTIME STOK</b>
━━━━━━━━━━━━━━━━━━━━━━
📦 Total: <b>${report.total}</b>
✅ Login OK: <b>${report.ok}</b>
⚠️ Gagal login: <b>${report.loginFail}</b>
❌ TCP mati: <b>${report.tcpFail}</b>
</blockquote>
` + lines.join("\n");
    try {
      await ctx.telegram.editMessageText(ctx.chat.id, wait.message_id, null, msg, { parse_mode: "HTML" });
    } catch {
      await safeReply(ctx, msg, { parse_mode: "HTML" });
    }
  } catch (e) {
    await safeReply(ctx, `❌ Error cek: ${e.message}`);
  }
});




bot.action("cvps_edit_banner", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Owner only!", { show_alert: true });
  }
  await ctx.answerCbQuery("⏳ Edit banner...").catch(() => {});

  const db = readContainerVpsDB();
  const list = (db.stock || []).filter((s) => s.status === "available");
  if (!list.length) {
    return safeReply(ctx, "<blockquote>❌ Tidak ada stok available.</blockquote>", { parse_mode: "HTML" });
  }

  const wait = await safeReply(
    ctx,
    `⏳ Edit banner <b>${list.length}</b> VPS Nat...\nIni bisa beberapa menit.`,
    { parse_mode: "HTML" }
  );

  let ok = 0, fail = 0;
  const lines = [];
  for (const s of list) {
    try {
      let ed = await customizeVpsBanner(s.host, s.port, s.password, s.username || "root");
      if (!ed?.ok) ed = await customizeVpsBanner(s.host, s.port, s.password, "root");
      if (!ed?.ok) ed = await customizeVpsBanner(s.host, s.port, s.password, "hanz");
      if (ed?.ok) {
        ok++;
        s.bannerEdited = true;
        s.bannerEditedAt = new Date().toISOString();
        lines.push(`✅ ${s.host}:${s.port}`);
      } else {
        fail++;
        lines.push(`❌ ${s.host}:${s.port} — ${(ed?.error || "").slice(0, 60)}`);
      }
    } catch (e) {
      fail++;
      lines.push(`❌ ${s.host}:${s.port} — ${e.message}`);
    }
    // jeda antar unit biar TCP proxy Railway tidak reset
    await new Promise((r) => setTimeout(r, 2500));
  }
  saveContainerVpsDB(db);

  const msg =
    `<blockquote><b>✏️ EDIT BANNER SELESAI</b>\n` +
    `✅ Sukses: <b>${ok}</b>\n` +
    `❌ Gagal: <b>${fail}</b>\n` +
    `📦 Total: <b>${list.length}</b></blockquote>\n` +
    lines.slice(0, 25).join("\n") +
    (lines.length > 25 ? `\n...+${lines.length - 25} lagi` : "");

  try {
    await ctx.telegram.editMessageText(ctx.chat.id, wait.message_id, null, msg, { parse_mode: "HTML" });
  } catch {
    await safeReply(ctx, msg, { parse_mode: "HTML" });
  }
});


bot.action("cvps_set_harga", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  userState[ctx.from.id] = { step: "CVPS_SET_HARGA" };
  await safeReply(ctx, `<blockquote><b>💰 SET HARGA VPS NAT</b>\nKirim angka saja, contoh: <code>6000</code> atau <code>500</code>\nDefault: 6000</blockquote>`, { parse_mode: "HTML" });
  ctx.answerCbQuery().catch(() => {});
});


// Edit MOTD/banner semua stok available (hilangkan parham/railway)
bot.command(["editbanner", "editmotd"], async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;

  const arg = (ctx.message.text || "").split(/\s+/).slice(1).join(" ").trim();
  const db = readContainerVpsDB();
  let list = (db.stock || []).filter((s) => s.status === "available");

  // /editbanner host:port|pass  → satu unit manual
  if (arg && arg.includes("|")) {
    const [hp, pass] = arg.split("|").map((x) => x.trim());
    const [host, portRaw] = hp.split(":");
    const port = parseInt(portRaw || "22", 10);
    if (!host || !pass) {
      return safeReply(ctx, "❌ Format: <code>/editbanner host:port|password</code>", { parse_mode: "HTML" });
    }
    const wait = await safeReply(ctx, `⏳ Edit banner <code>${host}:${port}</code>...`, { parse_mode: "HTML" });
    let ed = await customizeVpsBanner(host, port, pass, "root");
    if (!ed?.ok) ed = await customizeVpsBanner(host, port, pass, "hanz");
    const msg = ed?.ok
      ? `✅ Banner diubah\n<code>${host}:${port}</code>`
      : `❌ Gagal: ${ed?.error || "unknown"}`;
    try {
      await ctx.telegram.editMessageText(ctx.chat.id, wait.message_id, null, msg, { parse_mode: "HTML" });
    } catch {
      await safeReply(ctx, msg, { parse_mode: "HTML" });
    }
    return;
  }

  if (!list.length) {
    return safeReply(
      ctx,
      `<blockquote>❌ Tidak ada stok available.\nAtau: <code>/editbanner host:port|password</code></blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  const wait = await safeReply(
    ctx,
    `⏳ Edit banner <b>${list.length}</b> VPS Nat...\nIni bisa beberapa menit.`,
    { parse_mode: "HTML" }
  );

  let ok = 0, fail = 0;
  const lines = [];
  for (const s of list) {
    try {
      let ed = await customizeVpsBanner(s.host, s.port, s.password, s.username || "root");
      if (!ed?.ok) ed = await customizeVpsBanner(s.host, s.port, s.password, "root");
      if (!ed?.ok) ed = await customizeVpsBanner(s.host, s.port, s.password, "hanz");
      if (ed?.ok) {
        ok++;
        s.bannerEdited = true;
        s.bannerEditedAt = new Date().toISOString();
        lines.push(`✅ ${s.host}:${s.port}`);
      } else {
        fail++;
        lines.push(`❌ ${s.host}:${s.port} — ${(ed?.error || "").slice(0, 60)}`);
      }
    } catch (e) {
      fail++;
      lines.push(`❌ ${s.host}:${s.port} — ${e.message}`);
    }
    // jeda antar unit biar TCP proxy Railway tidak reset
    await new Promise((r) => setTimeout(r, 2500));
  }
  saveContainerVpsDB(db);

  const msg =
    `<blockquote><b>✏️ EDIT BANNER SELESAI</b>\n` +
    `✅ Sukses: <b>${ok}</b>\n` +
    `❌ Gagal: <b>${fail}</b>\n` +
    `📦 Total: <b>${list.length}</b></blockquote>\n` +
    lines.slice(0, 25).join("\n") +
    (lines.length > 25 ? `\n...+${lines.length - 25} lagi` : "");

  try {
    await ctx.telegram.editMessageText(ctx.chat.id, wait.message_id, null, msg, { parse_mode: "HTML" });
  } catch {
    await safeReply(ctx, msg, { parse_mode: "HTML" });
  }
});


bot.command("resetstock", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const arg = (ctx.message.text || "").split(/\s+/).slice(1).join(" ").trim().toLowerCase();
  const db = readContainerVpsDB();
  if (arg === "all" || arg === "semua") {
    const avail = (db.stock || []).filter((s) => s.status === "available").length;
    const sold = (db.sold || []).length;
    db.stock = [];
    db.sold = [];
    saveContainerVpsDB(db);
    return safeReply(ctx, `<blockquote>✅ RESET SEMUA\nStok: ${avail} · Riwayat: ${sold}\nSisa: 0</blockquote>`, { parse_mode: "HTML" });
  }
  const before = (db.stock || []).filter((s) => s.status === "available").length;
  if (before === 0) return safeReply(ctx, "<blockquote>ℹ️ Stok available sudah kosong.</blockquote>", { parse_mode: "HTML" });
  db.stock = (db.stock || []).filter((s) => s.status !== "available");
  saveContainerVpsDB(db);
  return safeReply(ctx, `<blockquote>✅ Stok tersedia di-reset\nDihapus: <b>${before}</b>\nSisa: <b>0</b>\n\nHapus semua: <code>/resetstock all</code></blockquote>`, { parse_mode: "HTML" });
});

bot.command(["addstock", "addressnat", "addstocknat"], async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  // strip semua alias command
  const raw = ctx.message.text
    .replace(/^\/(addstock|addressnat|addstocknat)(@\w+)?\s*/i, "")
    .trim();
  if (!raw) {
    return safeReply(
      ctx,
      `<blockquote>❌ Format:\n<code>/addstock host:port|password</code>\n<code>/addressnat host:port|password,host2:port|pass2</code></blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  const wait = await safeReply(ctx, "⏳ Menambahkan stok VPS Nat...", { parse_mode: "HTML" });
  let result;
  try {
    result = await checkAndAddStock(raw);
  } catch (e) {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        wait.message_id,
        null,
        `❌ Error: ${e.message}`,
        { parse_mode: "HTML" }
      );
    } catch {
      await safeReply(ctx, `❌ Error: ${e.message}`);
    }
    return;
  }

  if (!result.success) {
    try {
      await ctx.telegram.editMessageText(ctx.chat.id, wait.message_id, null, `❌ ${result.msg}`, {
        parse_mode: "HTML"
      });
    } catch {
      await safeReply(ctx, `❌ ${result.msg}`, { parse_mode: "HTML" });
    }
    return;
  }

  const db = readContainerVpsDB();
  const used = (db.sold || []).length;
  const total = result.totalStock;
  const added = result.added;
  const sisa = total;
  const skipped = (result.results || []).filter((r) => r.status === "skip_duplicate").length;

  const detail = (result.results || [])
    .map((r) => {
      if (r.status === "added") {
        const live =
          r.alive === true ? "✅" : r.alive === false ? "⚠️ TCP" : "•";
        return `${live} <code>${r.host}:${r.port}</code>`;
      }
      if (r.status === "skip_duplicate") return `⏭️ <code>${r.host}:${r.port}</code> (duplikat)`;
      return `• ${r.host}:${r.port} (${r.status})`;
    })
    .join("\n");

  const captionOwner =
    `<blockquote><b>📦 ADD STOK VPS NAT</b>
━━━━━━━━━━━━━━━━━━━━━━
🏪 <b>Toko VPS Hanz</b>

📥 <b>Add slot :</b> ${added}
⏭️ <b>Duplikat :</b> ${skipped}
📦 <b>Total / sisa :</b> ${sisa}
📊 <b>Terpakai :</b> ${used}

${detail || "-"}
</blockquote>`;

  const captionPublic =
    `<blockquote><b>📦 INFO STOK VPS NAT</b>
━━━━━━━━━━━━━━━━━━━━━━
🏪 <b>Toko VPS Hanz</b>

📦 <b>Total slot :</b> ${total}
📊 <b>Terpakai :</b> ${used}/${total + used}
🟢 <b>Sisa slot :</b> ${sisa}

✨ Spek lumayan · Full 1 bulan
🐧 OS Ubuntu · 💸 Murah
</blockquote>`;

  const orderBtn = {
    inline_keyboard: [[{ text: "🛒 Gass Order", url: "https://t.me/Tokovpshanzx61bot?start=order" }]]
  };

  // edit pesan "wait" jadi hasil (bukan spam pesan baru)
  try {
    await ctx.telegram.editMessageText(ctx.chat.id, wait.message_id, null, captionOwner, {
      parse_mode: "HTML",
      reply_markup: orderBtn
    });
  } catch {
    await safeReply(ctx, captionOwner, { parse_mode: "HTML", reply_markup: orderBtn });
  }

  // channel: foto + caption (tanpa RAM/CPU)
  if (TESTIMONI_CHANNEL && added > 0) {
    try {
      const img = await generateContainerVpsStockImage(total, added, used);
      await bot.telegram.sendPhoto(TESTIMONI_CHANNEL, { source: img }, {
        caption: captionPublic,
        parse_mode: "HTML",
        reply_markup: orderBtn
      });
    } catch (e) {
      console.error("[CVPS STOCK CHANNEL]", e.message);
    }
  }
});

bot.action("owner_railway_create", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Owner only!", { show_alert: true });
  }
  userState[ctx.from.id] = { step: "RAILWAY_WAIT_TOKEN" };
  await editMenuMessage(
    ctx,
    `<blockquote><b>🚂 CREATE CONTAINER VPS — RAILWAY</b></blockquote>
━━━━━━━━━━━━━━━━━━━━━━
<b>1 token = 2 VPS</b> · 5 token = 10 VPS
Jeda <b>50 detik</b> antar project.
Template: <b>Ubuntu SSH + Claude</b>
User: <code>root</code> · password otomatis

Kirim token (1 per baris / koma):
<code>token1
token2</code>

<i>/batal untuk batalkan.</i>`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "❌ Batal", callback_data: "menu_owner" }]] }
    }
  );
  ctx.answerCbQuery().catch(() => {});
});

bot.on("text", async (ctx, next) => {
  const userId = ctx.from.id;
  const textMsg = (ctx.message.text || "").trim();
  const st = userState[userId];
  if (!st) return next();

  // ---- KLAIM GARANSI: langkah 1 = kode ----
  if (st.step === "GARANSI_INPUT") {
    const found = findGaransiRecord(textMsg);
    if (!found.ok) {
      delete userState[userId];
      return safeReply(ctx, `<blockquote>⛧ ${found.msg}</blockquote>`, { parse_mode: "HTML" });
    }
    const it = (found.items || [])[0] || {};
    userState[userId] = {
      step: "GARANSI_PASSWORD",
      garansiCode: String(textMsg).trim(),
      hostHint: it.host || "-",
      portHint: it.port || "-"
    };
    return safeReply(
      ctx,
      `<blockquote><b>𒁍 VERIFIKASI GARANSI</b>
━━━━━━━━━━━━━━━━━━━━━━
Kode valid.
VPS: <code>${it.host || "-"}:${it.port || "-"}</code>

Kirim <b>password</b> VPS tersebut (password saat beli).
Bot cek TCP (IP+port). Jika masih nyala → ditolak.
</blockquote>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "batal", callback_data: "back_home", style: "danger" }]]
        }
      }
    );
  }

  // ---- KLAIM GARANSI: langkah 2 = password + cek mati ----
  if (st.step === "GARANSI_PASSWORD") {
    const code = st.garansiCode;
    delete userState[userId];
    const wait = await safeReply(ctx, `<blockquote>⛧ Cek password + status VPS...</blockquote>`, { parse_mode: "HTML" });
    const r = await redeemGaransi(code, textMsg);
    if (!r.ok) {
      const extra = r.stillAlive
        ? `\nVPS masih hidup di <code>${r.host}:${r.port}</code>`
        : "";
      return safeReply(ctx, `<blockquote>⛧ ${r.msg}${extra}</blockquote>`, { parse_mode: "HTML" });
    }
    const v = r.vps;
    return safeReply(
      ctx,
      `<blockquote><b>𒁍 GARANSI DITERIMA</b>
━━━━━━━━━━━━━━━━━━━━━━
VPS lama mati: <code>${r.dead.host}:${r.dead.port}</code>

Host: <code>${v.host}</code>
Port: <code>${v.port}</code>
User: <code>${v.username || "root"}</code>
Pass: <code>${v.password}</code>

<code>ssh ${v.username || "root"}@${v.host} -p ${v.port}</code>

Kode hangus (tidak bisa dipakai lagi).
</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  // ---- SET HARGA VPS NAT ----
  if (st.step === "CVPS_SET_HARGA" && userId === config.ownerId) {
    if (textMsg.includes("|")) {
      const parts = textMsg.split("|").map((x) => parseInt(x.trim(), 10));
      if (parts.length !== 3 || parts.some((x) => isNaN(x) || x < 100)) {
        return safeReply(ctx, "Format: harga saja (contoh 6000) atau low|standard|high");
      }
      const db = readContainerVpsDB();
      db.settings = db.settings || {};
      db.settings.harga = { low: parts[0], standard: parts[1], high: parts[2], nat: parts[0] };
      saveContainerVpsDB(db);
      delete userState[userId];
      return safeReply(ctx, `Harga diupdate: LOW ${toRupiah(parts[0])} · STD ${toRupiah(parts[1])} · HIGH ${toRupiah(parts[2])}`);
    }
    const n = parseInt(textMsg.replace(/[^\d]/g, ""), 10);
    if (isNaN(n) || n < 100) {
      return safeReply(ctx, "Kirim angka harga, contoh: <code>6000</code>", { parse_mode: "HTML" });
    }
    const db = readContainerVpsDB();
    db.settings = db.settings || {};
    db.settings.harga = n;
    saveContainerVpsDB(db);
    delete userState[userId];
    return safeReply(ctx, `Harga VPS Nat: <b>${toRupiah(n)}</b>`, { parse_mode: "HTML" });
  }

  // ---- SET API DO ----
  if (st.step === "OWNER_SET_DO_API" && userId === config.ownerId) {
    const key = textMsg.replace(/^Bearer\s+/i, "").trim();
    if (key.length < 15) {
      return safeReply(ctx, "API key terlalu pendek. Kirim ulang.");
    }
    setDoApiKey(key);
    delete userState[userId];

    // Cek droplet realtime
    let count = null;
    let doSisa = "?";
    try {
      count = await getDropletCount();
      if (count !== null) doSisa = Math.max(0, getDoMaxSlots() - count);
    } catch (_) {}

    await safeReply(
      ctx,
      `<blockquote>✅ <b>API Key DigitalOcean disimpan</b>
<code>${key.slice(0, 6)}…${key.slice(-4)}</code>

🌊 Droplet aktif: <b>${count === null ? "gagal cek" : count}</b>
📦 Sisa slot (max ${getDoMaxSlots()}): <b>${doSisa}</b>
RAM/spek mengikuti pilihan user saat order.

Broadcast info stok ke channel?</blockquote>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📢 Broadcast Info Stok Sekarang", callback_data: "owner_broadcast_do", style: "success" }],
            [{ text: "🔙 Owner Menu", callback_data: "menu_owner", style: "primary" }]
          ]
        }
      }
    );
    return;
  }

  // ---- RAILWAY TOKEN ----
  if (st.step === "RAILWAY_WAIT_TOKEN" && userId === config.ownerId) {
    const tokens = textMsg
      .split(/[\n,;\s]+/)
      .map((t) => t.replace(/^Bearer\s+/i, "").trim())
      .filter((t) => t.length >= 20);
    if (!tokens.length) {
      return safeReply(ctx, "Token tidak valid. Kirim 1 atau lebih token Railway (min 20 karakter).");
    }
    userState[userId] = { step: "RAILWAY_WAIT_VARS", railwayTokens: tokens };
    const totalVps = tokens.length * 2;
    const estimasi = Math.ceil((totalVps * 55) / 60);
    return safeReply(
      ctx,
      `<blockquote><b>🚂 VARIABLE DEPLOY</b></blockquote>
Token: <b>${tokens.length}</b> · Target: <b>${tokens.length * 2}</b> VPS
(1 token = 2 VPS) · Estimasi ±${estimasi} menit

Kirim password dasar:
<code>HanzPw99</code>

User: <code>root</code> · Template Ubuntu SSH + Claude`,
      { parse_mode: "HTML" }
    );
  }

  // ---- RAILWAY VARS + DEPLOY ----
  if (st.step === "RAILWAY_WAIT_VARS" && userId === config.ownerId) {
    const parts = textMsg.split("|").map((x) => x.trim());
    const passwordBase = parts[0] || `Hanz${Math.random().toString(36).slice(2, 8)}`;
    const anthropicToken = ""; // tidak dipakai
    if (passwordBase.length < 4) {
      return safeReply(ctx, "Password dasar minimal 4 karakter.");
    }
    const tokens = st.railwayTokens || [];
    if (!tokens.length) {
      delete userState[userId];
      return safeReply(ctx, "Token hilang. Ulangi dari menu Railway.");
    }
    const totalVps = tokens.length * 2;
    const wait = await safeReply(
      ctx,
      `<blockquote><b>𒁍 DEPLOY ${totalVps} VPS NAT</b>
Jeda 50 detik antar project · deteksi TCP otomatis.
Proses berjalan...</blockquote>`,
      { parse_mode: "HTML" }
    );
    const progress = async (msg) => {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          wait.message_id,
          null,
          `<blockquote><b>𒁍 Progress Deploy</b>\n${msg}</blockquote>`,
          { parse_mode: "HTML", disable_web_page_preview: true }
        );
      } catch (_) {}
    };
    try {
      const result = await railwayCreateMultiTokens(tokens, {
        passwordBase,
        template: "claude",
        sshUsername: "root",
        onProgress: progress
      });
      delete userState[userId];

      let msg = result.displayText || "✅ Deploy selesai.";
      if (msg.length > 3900) msg = msg.slice(0, 3800) + "\n…";

      try {
        await ctx.telegram.editMessageText(ctx.chat.id, wait.message_id, null, msg, {
          parse_mode: "HTML",
          disable_web_page_preview: true
        });
      } catch {
        await safeReply(ctx, msg, { parse_mode: "HTML", disable_web_page_preview: true });
      }

      // /addstock semua (bisa disalin) — seperti biasa
      const addCmd = result.addstockCmd || "";
      if (addCmd) {
        await safeReply(
          ctx,
          `<b>📦 Copy untuk add stock:</b>\n<code>${addCmd}</code>`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📋 Salin /addstock", copy_text: { text: addCmd }, style: "success" }]
              ]
            }
          }
        );
      }
        } catch (err) {
      delete userState[userId];
      await safeReply(
        ctx,
        `<blockquote><b>Deploy gagal</b>
<code>${(err.message || String(err)).slice(0, 500)}</code>

Pastikan token valid (Account Tokens Railway) & kuota aktif.</blockquote>`,
        { parse_mode: "HTML" }
      );
    }
    return;
  }

  return next();
});

// ========== END CONTAINER VPS HANDLERS ==========


// ========== TEMP MAIL (ADMIN) ==========
const tempMailPollers = new Map();

function formatTempMailCaption(sess, extra = "") {
  const left = require("./lib/tempmail").remainingSec(sess);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return (
    `<blockquote><b>𒁍 TEMP MAIL</b>
━━━━━━━━━━━━━━━━━━━━━━
Email:
<code>${sess.email}</code>

Durasi: <b>${m}m ${s}s</b> · max 15 menit
${extra}
</blockquote>`
  );
}

async function stopTempMailPoll(userId) {
  const id = tempMailPollers.get(String(userId));
  if (id) {
    clearInterval(id);
    tempMailPollers.delete(String(userId));
  }
}

function tempMailKeyboard(email) {
  return {
    inline_keyboard: [
      [{ text: "📋 Salin Email", copy_text: { text: email }, style: "success" }],
      [
        { text: "↻ Refresh", callback_data: "tempmail_refresh", style: "primary" },
        { text: "𖤓 Ganti Email", callback_data: "tempmail_new", style: "primary" }
      ],
      [{ text: "✕ Tutup", callback_data: "tempmail_close", style: "danger" }]
    ]
  };
}

async function startTempMailPoll(ctx, userId, messageId) {
  await stopTempMailPoll(userId);
  const iv = setInterval(async () => {
    try {
      const sess = tempmail.getSession(userId);
      if (!sess) {
        await stopTempMailPoll(userId);
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            null,
            `<blockquote><b>𒁍 TEMP MAIL EXPIRED</b>
Sesi 15 menit habis.</blockquote>`,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [[{ text: "𖤓 Email Baru", callback_data: "owner_tempmail", style: "success" }]]
              }
            }
          );
        } catch (_) {}
        return;
      }
      const polled = await tempmail.pollInbox(userId);
      if (polled.newMails && polled.newMails.length) {
        let extra = "\n<b>Mail baru:</b>\n";
        for (const mail of polled.newMails) {
          extra += `⛧ ${mail.from || "-"}\n${mail.subject || "-"}\n`;
          if (mail.codes?.length) extra += `OTP: <code>${mail.codes.join(" · ")}</code>\n`;
        }
        // Update panel tempmail
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            null,
            formatTempMailCaption(sess, extra),
            { parse_mode: "HTML", reply_markup: tempMailKeyboard(sess.email) }
          );
        } catch (_) {}

        // Pesan BARU khusus OTP (email + kode + tombol salin)
        for (const mail of polled.newMails) {
          const codes = mail.codes || [];
          const otp = codes[0] || "";
          const body =
            `<blockquote><b>𖤓 OTP MASUK</b>
━━━━━━━━━━━━━━━━━━━━━━
📧 <b>Email</b>
<code>${sess.email}</code>

📨 <b>From</b> · ${mail.from || "-"}
📝 <b>Subject</b> · ${mail.subject || "-"}
` +
            (otp
              ? `\n🔑 <b>OTP</b>\n<code>${otp}</code>\n`
              : "\n<i>Tidak ada kode OTP terdeteksi. Cek body mail di refresh.</i>\n") +
            (codes.length > 1 ? `Kode lain: <code>${codes.slice(1).join(" · ")}</code>\n` : "") +
            `━━━━━━━━━━━━━━━━━━━━━━
</blockquote>`;

          const rows = [];
          if (otp) {
            rows.push([{ text: "📋 Salin OTP", copy_text: { text: String(otp) }, style: "success" }]);
          }
          for (const c of codes.slice(1, 4)) {
            rows.push([{ text: `📋 Salin ${c}`, copy_text: { text: String(c) }, style: "primary" }]);
          }
          rows.push([{ text: "📋 Salin Email", copy_text: { text: sess.email }, style: "primary" }]);
          rows.push([{ text: "↻ Buka Temp Mail", callback_data: "owner_tempmail", style: "primary" }]);

          try {
            await ctx.telegram.sendMessage(userId, body, {
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: rows }
            });
          } catch (e) {
            console.error("[TEMPMAIL OTP MSG]", e.message);
          }
        }
      }
    } catch (e) {
      console.error("[TEMPMAIL POLL]", e.message);
    }
  }, 8000);
  tempMailPollers.set(String(userId), iv);
}

async function openTempMail(ctx) {
  if (ctx.from.id !== config.ownerId) return safeReply(ctx, "Khusus admin.");
  // Pakai email yang masih aktif; jangan ganti otomatis
  const existing = tempmail.getSession(ctx.from.id);
  const sess = existing || (await tempmail.refreshOrCreate(ctx.from.id, false));
  const note = existing ? "\n<i>Email aktif (belum ganti).</i>\n" : "\n<i>Email baru dibuat.</i>\n";
  const cap = formatTempMailCaption(sess, note);
  let mid = null;
  try {
    if (ctx.callbackQuery?.message) {
      try {
        await ctx.editMessageText(cap, { parse_mode: "HTML", reply_markup: tempMailKeyboard(sess.email) });
        mid = ctx.callbackQuery.message.message_id;
      } catch {
        const msg = await ctx.reply(cap, { parse_mode: "HTML", reply_markup: tempMailKeyboard(sess.email) });
        mid = msg.message_id;
      }
    } else {
      const msg = await ctx.reply(cap, { parse_mode: "HTML", reply_markup: tempMailKeyboard(sess.email) });
      mid = msg.message_id;
    }
  } catch (e) {
    const msg = await safeReply(ctx, cap, { parse_mode: "HTML" });
    mid = msg?.message_id;
  }
  if (mid) await startTempMailPoll(ctx, ctx.from.id, mid);
}

bot.command("tempmail", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  await openTempMail(ctx);
});


bot.action("owner_set_do_api", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("Owner only", { show_alert: true });
  await ctx.answerCbQuery().catch(() => {});
  userState[ctx.from.id] = { step: "OWNER_SET_DO_API" };
  const cur = getDoApiKey();
  const masked = cur ? (cur.slice(0, 6) + "…" + cur.slice(-4)) : "(belum diset)";
  await safeReply(
    ctx,
    `<blockquote><b>🔑 SET API KEY DIGITALOCEAN</b>
API saat ini: <code>${masked}</code>

Kirim API key baru (dari DO → API → Tokens).
Ketik /batal untuk batal.</blockquote>`,
    { parse_mode: "HTML" }
  );
});

bot.action("owner_broadcast_do", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("Owner only", { show_alert: true });
  await ctx.answerCbQuery("Broadcast stok...").catch(() => {});
  const r = await broadcastDoStockSafe();
  await safeReply(
    ctx,
    r.ok
      ? `<blockquote>✅ <b>Info stok terkirim ke channel</b>
🌊 DO sisa: <b>${r.doSisa}</b>
📦 Nat sisa: <b>${r.natSisa}</b>
${r.fallback ? "(fallback teks)" : ""}</blockquote>`
      : `<blockquote>❌ Broadcast gagal: <code>${(r.error || "").slice(0, 150)}</code></blockquote>`,
    { parse_mode: "HTML" }
  );
});

bot.action("owner_tempmail", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("Owner only", { show_alert: true });
  await ctx.answerCbQuery().catch(() => {});
  await openTempMail(ctx);
});

bot.action("tempmail_new", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  await ctx.answerCbQuery("Email baru...").catch(() => {});
  await stopTempMailPoll(ctx.from.id);
  tempmail.clearSession(ctx.from.id);
  const sess = await tempmail.refreshOrCreate(ctx.from.id, true);
  try {
    await ctx.editMessageText(formatTempMailCaption(sess, "\nEmail diganti.\n"), {
      parse_mode: "HTML",
      reply_markup: tempMailKeyboard(sess.email)
    });
    await startTempMailPoll(ctx, ctx.from.id, ctx.callbackQuery.message.message_id);
  } catch {
    await openTempMail(ctx);
  }
});

bot.action("tempmail_refresh", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const sess = tempmail.getSession(ctx.from.id);
  if (!sess) {
    await ctx.answerCbQuery("Sesi habis", { show_alert: true });
    return openTempMail(ctx);
  }
  await ctx.answerCbQuery("Refresh...").catch(() => {});
  const polled = await tempmail.pollInbox(ctx.from.id);
  let extra = "\n";
  if (polled.messages?.length) {
    extra += "<b>Inbox:</b>\n";
    for (const m of polled.messages.slice(0, 5)) {
      extra += `⛧ ${m.from || "-"} · ${m.subject || "-"}\n`;
    }
  } else extra += "Inbox kosong.\n";
  for (const mail of polled.newMails || []) {
    if (mail.codes?.length) extra += `OTP: <code>${mail.codes.join(" · ")}</code>\n`;
  }
  try {
    await ctx.editMessageText(formatTempMailCaption(sess, extra), {
      parse_mode: "HTML",
      reply_markup: tempMailKeyboard(sess.email)
    });
  } catch (_) {}
});

bot.action("tempmail_close", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  await stopTempMailPoll(ctx.from.id);
  await ctx.answerCbQuery("Ditutup").catch(() => {});
  try { await ctx.deleteMessage(); } catch {
    await ctx.editMessageText("<blockquote>Temp mail ditutup.</blockquote>", { parse_mode: "HTML" }).catch(() => {});
  }
});
// ========== END TEMP MAIL ==========



// ========== GARANSI VPS NAT ==========
bot.action("garansi_menu", async (ctx) => {
  if (!(await requirePrivateChat(ctx, "garansi_menu"))) return;
  await ctx.answerCbQuery().catch(() => {});
  userState[ctx.from.id] = { step: "GARANSI_INPUT" };
  await safeReply(
    ctx,
    `<blockquote><b>𒁍 AMBIL GARANSI</b>
━━━━━━━━━━━━━━━━━━━━━━
Kirim kode garansi.
Lalu kirim password VPS yang mati.
Cek TCP (IP+port) — masih nyala = ditolak.
Valid 7 hari · sekali pakai
</blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "batal", callback_data: "back_home", style: "danger" }]]
      }
    }
  );
});

bot.command("garansi", async (ctx) => {
  if (!(await requirePrivateChat(ctx, "garansi"))) return;
  const code = (ctx.message.text || "").split(/\s+/).slice(1).join(" ").trim();
  if (!code) {
    userState[ctx.from.id] = { step: "GARANSI_INPUT" };
    return safeReply(
      ctx,
      `<blockquote><b>𒁍 AMBIL GARANSI</b>
Kirim kode garansi.
Bot minta password VPS, cek TCP (IP+port).
Hanya diterima jika VPS sudah mati.
</blockquote>`,
      { parse_mode: "HTML" }
    );
  }
  const found = findGaransiRecord(code);
  if (!found.ok) {
    return safeReply(ctx, `<blockquote>⛧ ${found.msg}</blockquote>`, { parse_mode: "HTML" });
  }
  const it = (found.items || [])[0] || {};
  userState[ctx.from.id] = {
    step: "GARANSI_PASSWORD",
    garansiCode: code,
    hostHint: it.host || "-",
    portHint: it.port || "-"
  };
  return safeReply(
    ctx,
    `<blockquote><b>𒁍 VERIFIKASI GARANSI</b>
Kode valid.
VPS: <code>${it.host || "-"}:${it.port || "-"}</code>

Kirim password VPS tersebut.
</blockquote>`,
    { parse_mode: "HTML" }
  );
});


bot.catch((err, ctx) => {
    console.error("Bot Error:", err);
    safeReply(ctx, "<blockquote>❌ <b>Terjadi kesalahan.</b></blockquote>", { parse_mode: "HTML" });
})


// ========== AUTO INFO STOK VPS NAT (setiap 5 menit) ==========
async function broadcastVpsNatStockInfo() {
  try {
    if (!TESTIMONI_CHANNEL) return;
    const db = readContainerVpsDB();
    const sisa = getStockCount();
    const terpakai = (db.sold || []).length;
    const totalSlot = sisa + terpakai;
    let doSisa = 0;
    try {
      const count = await getDropletCount();
      if (count !== null) doSisa = Math.max(0, 10 - count);
    } catch (_) {}

    let img;
    try {
      img = await generateDualStockImage(sisa, doSisa);
    } catch {
      img = await generateContainerVpsStockImage(sisa, 0, terpakai);
    }

    const caption = buildStockInfoCaption(doSisa, sisa);
    await bot.telegram.sendPhoto(
      TESTIMONI_CHANNEL,
      { source: img },
      {
        caption,
        parse_mode: "HTML",
        reply_markup: stockInfoOrderKeyboard()
      }
    );
  } catch (e) {
    console.error("[VPS AUTO STOCK]", e.message);
  }
}


// Auto hapus stok VPS Nat yang tidak terjual > 15 hari (cek tiap 6 jam)
async function autoExpireOldVpsNatStock() {
  try {
    const res = purgeExpiredStock(15);
    if (res.removed > 0) {
      console.log(`[VPS NAT] Auto-hapus ${res.removed} stok >15 hari. Sisa: ${res.totalLeft}`);
      if (config.ownerId) {
        await bot.telegram.sendMessage(
          config.ownerId,
          `<blockquote><b>🧹 Auto hapus stok VPS Nat</b>
Dihapus: <b>${res.removed}</b> unit (>15 hari tidak terjual)
Sisa: <b>${res.totalLeft}</b></blockquote>`,
          { parse_mode: "HTML" }
        ).catch(() => {});
      }
    }
  } catch (e) {
    console.error("[VPS NAT EXPIRE]", e.message);
  }
}
setInterval(autoExpireOldVpsNatStock, 6 * 60 * 60 * 1000);
setTimeout(autoExpireOldVpsNatStock, 120 * 1000);


setInterval(broadcastVpsNatStockInfo, 90 * 60 * 1000); // setiap 1.5 jam
setInterval(() => { autoHealRailway().catch((e) => console.error('[HEAL]', e.message)); }, 10 * 60 * 1000);
// Auto hapus stok available yang tidak laku > 15 hari (cek tiap 6 jam)
setInterval(() => {
  try {
    const r = purgeExpiredStock(15);
    if (r.removed > 0) console.log("[AUTO PURGE 15D]", r.removed, "item dihapus, sisa", r.totalLeft);
  } catch (e) { console.error("[AUTO PURGE]", e.message); }
}, 6 * 60 * 60 * 1000);
setTimeout(() => { try { purgeExpiredStock(15); } catch (_) {} }, 120 * 1000);
// delay pertama 60 detik setelah bot jalan
setTimeout(broadcastVpsNatStockInfo, 60 * 1000);


bot.launch().catch((err) => {
  console.error("❌ Gagal connect ke Telegram:", err.message);
});

Run(config , startBot);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
