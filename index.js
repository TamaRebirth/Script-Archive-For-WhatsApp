const { Telegraf } = require("telegraf");
const puppeteer = require("puppeteer");
const { BOT_TOKEN, CHANNEL_ID, TARGET_URL } = require("./config");

const bot = new Telegraf(BOT_TOKEN);

async function fetchStock() {
  console.log("🧠 Membuka browser...");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();

  try {
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
    console.log("📄 Halaman dimuat.");

    const stock = await page.evaluate(() => {
      const data = {};
      const sections = document.querySelectorAll(".et_pb_tab");
      const tabNames = ["Seeds", "Eggs", "Gear", "Summer Shop", "Cosmetics"];
      
      sections.forEach((section, i) => {
        const tabName = tabNames[i] || `Tab ${i + 1}`;
        const items = Array.from(section.querySelectorAll("ul li")).map(li => li.innerText.trim()).filter(Boolean);
        data[tabName] = items;
      });

      const weatherDiv = Array.from(document.querySelectorAll("div")).find(el => el.textContent.includes("WEATHER"));
      const weatherText = weatherDiv?.nextElementSibling?.innerText?.trim() || "Tidak diketahui";
      data["Weather"] = [weatherText];

      return data;
    });

    await browser.close();
    console.log("✅ Stock berhasil diambil.");
    return stock;
  } catch (e) {
    await browser.close();
    console.error("❌ Gagal ambil stock:", e.message);
    throw e;
  }
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
    Cosmetics: "💄",
    Weather: "🌤️"
  };

  for (const [kategori, items] of Object.entries(stock)) {
    const emoji = emojis[kategori] || "🔸";
    msg += `
${emoji} *${kategori} Stock*
`;
    if (!items || items.length === 0) {
      msg += "Tidak ada item tersedia";
    } else {
      for (const item of items) {
        msg += `• ${item}
`;
      }
    }
  }

  return msg;
}

async function sendUpdate() {
  console.log("🚀 Memulai update stock...");

  try {
    const stock = await fetchStock();
    const message = formatStock(stock);

    console.log("📦 Pesan siap dikirim", message);
    await bot.telegram.sendMessage(CHANNEL_ID, message, { parse_mode: "Markdown" });
    console.log("✅ Pesan berhasil dikirim ke channel.");
  } catch (e) {
    console.error("❌ Gagal mengirim pesan:", e.message);
  }
}

bot.launch().then(() => {
  console.log("🤖 Bot aktif, mengirim update awal...");
  sendUpdate();
  setInterval(sendUpdate, 5 * 60 * 1000);
}).catch(err => {
  console.error("❌ Gagal launch bot:", err.message);
});
