const chalk = require("chalk");

const { exec } = require("child_process");

const fs = require("fs");

const path = require("path");

// Fungsi untuk menjalankan perintah

function runCommand(command, callback) {

  exec(command, (error, stdout, stderr) => {

    if (error) {

      console.log(chalk.red(`❌ Error: ${error.message}`));

      return;

    }

    if (stderr) {

      console.log(chalk.yellow(`⚠️ Warning: ${stderr}`));

    }

    console.log(chalk.green(`✅ Output: ${stdout}`));

    if (callback) callback();

  });

}

// Fungsi untuk memulai bot

function Run(config, startBot) {

  console.clear();

  console.log(chalk.cyan("╔════════════════════════════════════════════════╗"));

  console.log(chalk.cyan("║          🚀 BOT TELEGRAM MULTI-FITUR           ║"));

  console.log(chalk.cyan("║            SEDANG MEMULAI BOT...               ║"));

  console.log(chalk.cyan("╚════════════════════════════════════════════════╝"));

  

  console.log(chalk.yellow("\n📋 Informasi Konfigurasi:"));

  console.log(chalk.white(`   🤖 Nama Bot: ${config.botName || "Tidak diatur"}`));

  console.log(chalk.white(`   👤 Owner: ${config.ownerName || "Tidak diatur"}`));

  console.log(chalk.white(`   📅 Waktu: ${new Date().toLocaleString()}`));

  

  console.log(chalk.yellow("\n🔍 Memeriksa file konfigurasi..."));

  

  // Cek file config.js

  if (!fs.existsSync("./config.js")) {

    console.log(chalk.red("❌ File config.js tidak ditemukan!"));

    console.log(chalk.yellow("ℹ️ Buat file config.js terlebih dahulu."));

    process.exit(1);

  }

  

  // Cek file package.json

  if (!fs.existsSync("./package.json")) {

    console.log(chalk.yellow("⚠️ File package.json tidak ditemukan."));

    console.log(chalk.yellow("📦 Membuat package.json..."));

    

    const packageJson = {

      name: "telegram-bot",

      version: "1.0.0",

      description: "Bot Telegram Multi-Fitur",

      main: "index.js",

      scripts: {

        start: "node index.js",

        dev: "nodemon index.js"

      },

      dependencies: {

        "telegraf": "^4.16.3",

        "axios": "^1.6.0",

        "chalk": "^4.1.2",

        "archiver": "^6.0.1",

        "qrcode": "^1.5.3"

      }

    };

    

    fs.writeFileSync("./package.json", JSON.stringify(packageJson, null, 2));

    console.log(chalk.green("✅ package.json berhasil dibuat"));

  }

  

  // Cek node_modules

  if (!fs.existsSync("./node_modules")) {

    console.log(chalk.yellow("📦 Menginstal dependensi..."));

    runCommand("npm install", () => {

      console.log(chalk.green("✅ Dependensi berhasil diinstal"));

      startBot();

    });

  } else {

    startBot();

  }

}

// Fungsi untuk memulai bot

function startBot() {

  console.log(chalk.cyan("\n🚀 Memulai Bot Telegram..."));

  console.log(chalk.yellow("ℹ️ Pastikan token bot sudah benar di config.js"));

  

  // Cek token bot

  try {

    const config = require("./config");

    if (!config.botToken || config.botToken === "") {

      console.log(chalk.red("❌ Token bot tidak ditemukan!"));

      console.log(chalk.yellow("ℹ️ Tambahkan botToken di config.js"));

      process.exit(1);

    }

    

    console.log(chalk.green(`✅ Token bot ditemukan`));

    console.log(chalk.white(`   Bot Username: @${config.botToken.split(':')[0]}`));

    

    // Cek folder database

    const dbPath = "./database";

    if (!fs.existsSync(dbPath)) {

      console.log(chalk.yellow("📁 Membuat folder database..."));

      fs.mkdirSync(dbPath, { recursive: true });

    }

    

    // Cek file database

    const requiredFiles = [

      "database.json",

      "users.json", 

      "manual_payments.json",

      "data_vps.json",

      "saldoOtp.json",

      "smm_history.json"

    ];

    

    requiredFiles.forEach(file => {

      const filePath = path.join(dbPath, file);

      if (!fs.existsSync(filePath)) {

        console.log(chalk.yellow(`📄 Membuat file ${file}...`));

        

        if (file === "database.json") {

          fs.writeFileSync(filePath, JSON.stringify({

            isPanelOpen: true,

            scripts: [],

            apps: [],

            paymentMethod: 'orkut'

          }, null, 2));

        } else if (file === "users.json") {

          fs.writeFileSync(filePath, JSON.stringify([], null, 2));

        } else if (file === "manual_payments.json") {

          fs.writeFileSync(filePath, JSON.stringify([], null, 2));

        } else if (file === "data_vps.json") {

          fs.writeFileSync(filePath, JSON.stringify([], null, 2));

        } else if (file === "saldoOtp.json") {

          fs.writeFileSync(filePath, JSON.stringify({}, null, 2));

        } else if (file === "smm_history.json") {

          fs.writeFileSync(filePath, JSON.stringify({}, null, 2));

        }

      }

    });

    

    console.log(chalk.green("✅ Semua file database siap"));

    

    // Tampilkan informasi panel

    console.log(chalk.cyan("\n📊 Informasi Panel:"));

    console.log(chalk.white(`   🟢 Status Panel: ${config.panel?.domain ? "Terkonfigurasi" : "Tidak aktif"}`));

    console.log(chalk.white(`   📡 API DigitalOcean: ${config.ApiDO1 ? "✅" : "❌"}`));

    console.log(chalk.white(`   💰 API Payment: ${config.payment?.apiId ? "✅" : "❌"}`));

    

    console.log(chalk.cyan("\n🎯 Fitur yang tersedia:"));

    console.log(chalk.white("   ✅ Script Bot"));

    console.log(chalk.white("   ✅ Apps Premium")); 

    console.log(chalk.white("   ✅ Panel Pterodactyl"));

    console.log(chalk.white("   ✅ VPS DigitalOcean"));

    console.log(chalk.white("   ✅ Admin Panel"));

    console.log(chalk.white("   ✅ Reseller Panel"));

    console.log(chalk.white("   ✅ NoKos (OTP)"));

    console.log(chalk.white("   ✅ SMM Panel"));

    console.log(chalk.white("   ✅ Payment QRIS"));

    console.log(chalk.white("   ✅ Tools (YT, TikTok, dll)"));

    

    console.log(chalk.cyan("\n🔗 Informasi Kontak:"));

    console.log(chalk.white(`   👤 Owner: ${config.ownerName || "-"}`));

    console.log(chalk.white(`   📱 WhatsApp: ${config.ownerWa || "-"}`));

    console.log(chalk.white(`   ✈️ Telegram: ${config.ownerUser || "-"}`));

    console.log(chalk.white(`   📢 Channel: t.me/${config.channelName || "-"}`));

    console.log(chalk.white(`   💬 Grup: t.me/${config.grubName || "-"}`));

    

    console.log(chalk.cyan("\n═══════════════════════════════════════════════"));

    console.log(chalk.green("✨ BOT SIAP DIJALANKAN!"));

    console.log(chalk.cyan("═══════════════════════════════════════════════\n"));

    

  } catch (error) {

    console.log(chalk.red(`❌ Error membaca config.js: ${error.message}`));

    console.log(chalk.yellow("ℹ️ Pastikan config.js sudah diisi dengan benar"));

    process.exit(1);

  }

}

// Export fungsi

module.exports = { Run, startBot };