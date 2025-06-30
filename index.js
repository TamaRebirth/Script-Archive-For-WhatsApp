console.log("🟢 Bot file dimulai...");

const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");
const { BOT_TOKEN, CHANNEL_ID, SOURCE_URL } = require("./config");

const bot = new Telegraf(BOT_TOKEN);

async function fetchHtml() {
  try {
    const res = await axios.get(SOURCE_URL);
    console.log("✅ HTML berhasil diambil, panjang:", res.data.length);
    return res.data;
  } catch (e) {
    console.error("❌ Gagal mengambil HTML:", e.message);
    throw e;
  }
}

function parseStock(html) {
  const $ = cheerio.load(html);
  const stock = {};
  const tabs = ["Seeds", "Eggs", "Gear", "Summer Shop", "Cosmetics"];

  tabs.forEach(tab => {
    const section = $(`div:contains("${tab}")`).next("ul");
    const items = [];
    section.find("li").each((i, li) => {
      const item = $(li).text().trim();
      if (item) items.push(item);
    });
    stock[tab] = items;
  });

  const weather = $("div:contains('WEATHER')").next().text().trim() || "Tidak diketahui";
  stock["Weather"] = [weather];

  console.log("✅ Parsing selesai, data:", stock);
  return stock;
}

function formatStock(stock) {
  const now = new Date();
  const tgl = now.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const jam = now.toLocaleTimeString("id-ID");

  let msg = `🌱 *GROW A GARDEN STOCK UPDATE*

📅 *Tanggal:* ${tgl}
⏰ *Waktu:* ${jam}
`;

  const emojis = {
    SeedsShop: "🌱",
    EggsShop: "🥚",
    GearShop: "🛠️",
    SummerShop: "🎁",
    CosmeticsShop: "💄",
    Weather: "🌤️"
  };

  for (const [kategori, items] of Object.entries(stock)) {
    const emoji = emojis[kategori] || "🔸";
    msg += `
${emoji} *${kategori} Stock*
`;
    if (!items || items.length === 0) {
      msg += "Tidak ada item tersedia"
    } else {
      items.forEach(item => {
        msg += `• ${item}
`;
      });
    }
  }

  return msg;
}

async function sendUpdate() {
  console.log("🔍 Memulai pengambilan stock...");

  try {
    const html = await fetchHtml();
    const stock = parseStock(html);
    const message = formatStock(stock);

    console.log("📦 Pesan siap dikirim", message);
    await bot.telegram.sendMessage(CHANNEL_ID, message, { parse_mode: "Markdown" });
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Pesan berhasil dikirim ke ${CHANNEL_ID}`);
  } catch (e) {
    console.error("❌ Gagal kirim update:", e.message);
  }
}

bot.launch().then(() => {
  console.log("🚀 Grow A Garden Bot aktif.");
  sendUpdate();
  setInterval(sendUpdate, 5 * 60 * 1000);
});
