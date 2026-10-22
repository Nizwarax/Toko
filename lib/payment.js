const axios = require("axios");
const qs = require("qs");

const APIGATEWAY_ORKUT = "https://api-ralzz.vercel.app/orderkuota";
const ATL_BASE = "https://atlantich2h.com";
const PAKASIR_BASE = "https://app.pakasir.com";

const toRupiah = (angka) => {
  return Number(angka).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).replace("IDR", "Rp").trim();
};

function generateReffId() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TRX-${Date.now()}-${rand}`;
}

async function downloadQrisImage(url) {
  try {
    if (!url || !url.startsWith('http')) return null;
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://atlantich2h.com/'
      }
    });
    return Buffer.from(response.data);
  } catch (error) {
    return null;
  }
}

async function jembud(id, config) {
  try {
    console.log(`[DEBUG] Triggering Instant Check for ID: ${id}`);
    await axios.post(
      `${ATL_BASE}/deposit/instant`,
      qs.stringify({
        api_key: config.apiAtlantic,
        id: String(id),
        action: 'true'
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000
      }
    );
  } catch (e) {
    console.log(`[DEBUG] Instant Check Trigger Fail (Normal if already success)`);
  }
}

async function createdQris(harga, config) {
  const amount = Number(harga);

  // ================= ATLANTIC =================
  if (config.method === "atlantic") {
    try {
      const reffId = generateReffId();
      const body = {
        api_key: config.apiAtlantic,
        reff_id: reffId,
        nominal: amount,
        type: "ewallet",
        metode: "QRIS",
      };

      const res = await axios.post(
        `${ATL_BASE}/deposit/create`,
        qs.stringify(body),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000
        }
      );

      if (!res.data?.data) return null;

      const d = res.data.data;

      return {
        idtransaksi: d.id,
        jumlah: amount,
        imageqris: d.qr_image || "",
        qr_string: d.qr_string || "",
        nominal: amount,
      };

    } catch (e) {
      console.error("[ATLANTIC CREATE ERROR]", e.response?.data || e.message);
      return null;
    }
  }

  // ================= PAKASIR =================
  if (config.method === "pakasir") {
    try {
      const orderId = generateReffId();
      const body = {
        project: config.projectPakasir,
        order_id: orderId,
        amount: amount,
        api_key: config.apiPakasir,
      };

      console.log(`[DEBUG] Pakasir Create QRIS | order_id: ${orderId} | amount: ${amount}`);

      const res = await axios.post(
        `${PAKASIR_BASE}/api/transactioncreate/qris`,
        body,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000
        }
      );

      if (!res.data?.payment) {
        console.error("[PAKASIR CREATE ERROR] Response:", res.data);
        return null;
      }

      const p = res.data.payment;

      return {
        idtransaksi: p.order_id,       // pakai order_id untuk cek status
        jumlah: p.total_payment || amount,
        imageqris: "",                  // Pakasir tidak return image QR, di-generate dari qr_string
        qr_string: p.payment_number || "",
        nominal: amount,
        expired_at: p.expired_at || null,
        payUrl: `${PAKASIR_BASE}/pay/${config.projectPakasir}/${p.total_payment || amount}?order_id=${p.order_id}&qris_only=1`,
      };

    } catch (e) {
      console.error("[PAKASIR CREATE ERROR]", e.response?.data || e.message);
      return null;
    }
  }

  // ================= ORKUT =================
  try {
    const url = `${APIGATEWAY_ORKUT}/createpayment?apikey=${config.apikey}&amount=${amount}&username=${config.username}&token=${config.token}`;
    const { data } = await axios.get(url);

    if (!data?.result) return null;

    return {
      idtransaksi: data.result.idtransaksi,
      jumlah: data.result.jumlah,
      imageqris: data.result.imageqris?.url || "",
      qr_string: data.result.qr_string || "",
      nominal: amount,
    };
  } catch (e) {
    console.error("[ORKUT CREATE ERROR]", e.message);
    return null;
  }
}

// ================= CEK STATUS =================
async function cekStatus(id, amount, config) {

  // ================= ATLANTIC =================
  if (config.method === "atlantic") {
    try {
      const res = await axios.post(
        `${ATL_BASE}/deposit/status`,
        qs.stringify({
          api_key: config.apiAtlantic,
          id: String(id),
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000
        }
      );

      const status = res.data?.data?.status?.toLowerCase();
      console.log(`[DEBUG] Status Atlantic ID ${id}: ${status}`);

      if (status === "success") {
        return true;
      }

      if (status === "processing") {
        await jembud(id, config);
        return false;
      }

      return false;

    } catch (e) {
      console.error("[ATLANTIC STATUS ERROR]", e.message);
      return false;
    }
  }

  // ================= PAKASIR =================
  if (config.method === "pakasir") {
    try {
      // id = order_id yang disimpan saat create transaksi
      const url = `${PAKASIR_BASE}/api/transactiondetail?project=${config.projectPakasir}&amount=${amount}&order_id=${id}&api_key=${config.apiPakasir}`;

      console.log(`[DEBUG] Pakasir Cek Status | order_id: ${id} | amount: ${amount}`);

      const res = await axios.get(url, { timeout: 10000 });

      const status = res.data?.transaction?.status?.toLowerCase();
      console.log(`[DEBUG] Status Pakasir order_id ${id}: ${status}`);

      if (status === "completed") {
        return true;
      }

      return false;

    } catch (e) {
      console.error("[PAKASIR STATUS ERROR]", e.response?.data || e.message);
      return false;
    }
  }

  // ================= ORKUT =================
  try {
    const url = `${APIGATEWAY_ORKUT}/mutasiqr?apikey=${config.apikey}&username=${config.username}&token=${config.token}`;
    const { data } = await axios.get(url);

    const list = data?.result;
    if (!Array.isArray(list)) return false;

    return list.some(i => {
      const kredit = parseInt(i.kredit.toString().replace(/[^0-9]/g, ""));
      return kredit === parseInt(amount);
    });

  } catch (e) {
    return false;
  }
}

module.exports = {
  createdQris,
  cekStatus,
  toRupiah,
  downloadQrisImage
};
