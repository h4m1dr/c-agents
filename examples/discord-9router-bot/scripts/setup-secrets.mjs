import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const secrets = [
  ["DISCORD_BOT_TOKEN", "توکن Bot دیسکورد"],
  ["DISCORD_PUBLIC_KEY", "Public Key اپلیکیشن دیسکورد"],
  ["DISCORD_APPLICATION_ID", "Application ID دیسکورد"],
  ["NINE_ROUTER_API_KEY", "کلید API سرویس 9Router"],
  ["NINE_ROUTER_ADMIN_TOKEN", "یک رمز دلخواه و خصوصی برای مدیریت مدل‌ها"],
  ["GITHUB_PAT", "توکن GitHub (برای ابزارهای GitHub؛ اختیاری اما پیشنهادی)"],
  ["TAVILY_API_KEY", "کلید Tavily (برای جست‌وجوی وب؛ اختیاری)"],
];

const rl = createInterface({ input, output });

try {
  console.log("\nتنظیم Secretهای Cloudflare برای discord-9router-bot\n");
  console.log(
    "برای هر مورد، Wrangler یک prompt امن باز می‌کند و مقدار واردشده را در Cloudflare ذخیره می‌کند."
  );
  const proceed = await rl.question("ادامه می‌دهی؟ [y/N] ");
  if (proceed.trim().toLowerCase() !== "y") {
    console.log("لغو شد.");
    process.exitCode = 0;
  } else {
    for (const [name, description] of secrets) {
      console.log(`\n${name} — ${description}`);
      const result = spawnSync("pnpm", ["exec", "wrangler", "secret", "put", name], {
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      if (result.status !== 0) {
        throw new Error(`ذخیره‌سازی ${name} ناموفق بود.`);
      }
    }
    console.log("\nهمه Secretها تنظیم شدند. حالا می‌توانی deploy کنی:");
    console.log("pnpm run deploy");
  }
} finally {
  rl.close();
}
