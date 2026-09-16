# h4m1dr Agents

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hrstorage9762/agents/tree/main/examples/discord-9router-bot)

**نسخه‌ی پروژه: `v0.2`**

این مخزن fork شخصی [Cloudflare Agents](https://github.com/cloudflare/agents) است که برای اجرای یک بات Discord روی Cloudflare Workers و اتصال آن به API سازگار با OpenAI در 9Router آماده‌سازی شده است.

## بات Discord و 9Router

مسیر اصلی این fork در پوشه‌ی [`examples/discord-9router-bot`](examples/discord-9router-bot) قرار دارد. بات از Chat SDK، Agents SDK و Durable Object استفاده می‌کند و پاسخ‌ها را از مدل انتخاب‌شده در 9Router دریافت می‌کند.

```text
Discord -> Cloudflare Worker -> Durable Object -> 9Router -> Discord
```

قابلیت‌های نسخه‌ی فعلی:

- پاسخ به منشن بات و پیام مستقیم در Discord
- اتصال به هر endpoint سازگار با OpenAI API
- مقدار پیش‌فرض برای `https://9r.ykno.ir/v1`
- انتخاب مدل فعال از طریق secret یا تنظیمات پایدار Worker
- خواندن فهرست مدل‌های موجود در Router
- allowlist برای محدودکردن مدل‌های قابل استفاده
- ذخیره‌ی تنظیمات مدل در SQLite Durable Object
- احراز هویت endpointهای مدیریتی با توکن جداگانه
- اجرای مستقیم روی Cloudflare Workers بدون سرور دائمی

## آنچه در v0.2 اجرا شده

فاز اول معماری چندعاملی در این نسخه انجام شده است:

- ساخت پوشه‌های `src/tools`، `src/departments` و `src/router`
- تعریف interfaceهای type-safe برای schema ابزار، ابزار اجرایی و دپارتمان
- ایجاد Tool Registry خالی برای اضافه‌کردن ابزارهای آینده
- ایجاد دپارتمان پیش‌فرض `General` با system prompt مستقل
- ایجاد router پایه که فعلاً همه‌ی پیام‌ها را به `General` می‌فرستد
- اتصال system prompt دپارتمان به درخواست مدل
- ارسال conditional ابزارها به AI SDK فقط وقتی دپارتمان ابزار داشته باشد
- فعال‌سازی `toolChoice: "auto"` برای دپارتمان‌های دارای ابزار
- تشخیص ایمن `toolCalls` و ارسال پیام موقت تا زمان اجرای فاز ۵
- ساخت ابزار Piston برای اجرای کد، GitHub برای خواندن فایل و Tavily برای جست‌وجو
- استفاده از `fetch` بومی Workers و برگرداندن خطاهای ابزار به‌صورت متن
- تزریق امن `Env` به registry برای دسترسی به کلیدهای GitHub و Tavily
- ساخت دپارتمان‌های `Researcher`، `DevOps` و `Admin` با ابزارهای اختصاصی
- routing صریح با `/research`، `/devops` و `/admin` همراه با حذف prefix از prompt
- fallback خودکار پیام‌های بدون prefix به دپارتمان Admin
- اجرای خودکار tool-calling با حداکثر ۵ مرحله برای جلوگیری از loop بی‌نهایت
- برگرداندن خطای اجرای ابزار به مدل به‌صورت متن و ارسال پاسخ نهایی به Discord
- ذخیره‌ی transcript پیام‌ها، tool callها و tool resultها در SQLite Durable Object
- استفاده‌ی دوباره از conversation memory در پیام‌های بعدی همان thread

در این مرحله routing بر اساس prefix انجام می‌شود؛ routing هوشمند مبتنی بر مدل و
deferred Discord interaction سفارشی برای پاسخ‌های بسیار طولانی هنوز در فازهای
بعدی قرار دارد. آداپتر رسمی Discord/Chat SDK lifecycle webhook و `waitUntil`
را مدیریت می‌کند تا پردازش پس‌زمینه بعد از پاسخ اولیه ادامه پیدا کند.

## Deploy سریع

با زدن دکمه‌ی ابتدای README، Cloudflare صفحه‌ی ساخت Worker را باز می‌کند و پروژه‌ی بات را از همین fork می‌سازد. بعد از ساخت Worker، secretهای زیر را در Cloudflare تنظیم کنید:

```bash
wrangler secret put DISCORD_BOT_TOKEN
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_APPLICATION_ID
wrangler secret put NINE_ROUTER_API_KEY
wrangler secret put NINE_ROUTER_ADMIN_TOKEN
wrangler secret put NINE_ROUTER_BASE_URL
wrangler secret put NINE_ROUTER_MODEL
wrangler secret put NINE_ROUTER_ALLOWED_MODELS
wrangler secret put GITHUB_PAT
wrangler secret put TAVILY_API_KEY
```

مقدارهای اصلی:

```text
NINE_ROUTER_BASE_URL=https://9r.ykno.ir/v1
NINE_ROUTER_MODEL=GPT
NINE_ROUTER_ALLOWED_MODELS=GPT
```

کلیدها و توکن‌های واقعی نباید داخل Git، README یا فایل‌های `.env` commit شوند. برای توسعه‌ی محلی از `.dev.vars` استفاده کنید.

## تنظیم Discord

در [Discord Developer Portal](https://discord.com/developers/applications):

1. یک Application و Bot بسازید.
2. `DISCORD_BOT_TOKEN`، `DISCORD_PUBLIC_KEY` و `DISCORD_APPLICATION_ID` را بردارید.
3. آدرس Interactions Endpoint را روی این مسیر بگذارید:

```text
https://YOUR_WORKER_DOMAIN/api/webhooks/discord
```

4. بات را با scopeهای `bot` و `applications.commands` به سرور دعوت کنید.
5. بات را mention کنید یا مستقیماً برایش پیام بفرستید.

برای دریافت پیام‌های عادی در کانال‌ها، تنظیمات لازم Discord مانند Message Content Intent را در Developer Portal فعال کنید. مسیر HTTP Interaction برای درخواست‌های Discord مناسب است؛ Worker به سرور دائمی یا VPS نیاز ندارد.

## مدیریت مدل‌ها

پس از deploy، فهرست مدل‌ها را با توکن مدیریتی ببینید:

```bash
curl \
  -H "Authorization: Bearer $NINE_ROUTER_ADMIN_TOKEN" \
  https://YOUR_WORKER_DOMAIN/api/models
```

برای انتخاب مدل و حذف مدل‌های غیرمجاز:

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/api/models/config \
  -H "Authorization: Bearer $NINE_ROUTER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"GPT","allowedModels":["GPT","Qwen-3.7"]}'
```

مدل فعال باید حتماً داخل `allowedModels` باشد. تنظیمات در Durable Object ذخیره می‌شوند و با restart شدن Worker از بین نمی‌روند.

## توسعه‌ی محلی

```bash
cd examples/discord-9router-bot
pnpm install
cp .env.example .dev.vars
pnpm run dev
```

Discord به HTTPS عمومی نیاز دارد. برای تست محلی می‌توانید از Cloudflare Quick Tunnel استفاده کنید و URL عمومی آن را در Discord Developer Portal بگذارید.

برای deploy دستی:

```bash
cd examples/discord-9router-bot
pnpm run deploy
```

## وضعیت پلن رایگان Cloudflare

### نتیجه‌ی بررسی

این پروژه از نظر معماری برای شروع روی پلن رایگان مناسب است: Worker سرور دائمی ندارد، از سرویس خارجی 9Router برای inference استفاده می‌کند، و فایل یا دیتابیس جداگانه‌ای خارج از Durable Object لازم ندارد.

با این حال رایگان‌بودن Cloudflare به معنی رایگان‌بودن 9Router یا Discord API نیست. مصرف مدل‌ها، محدودیت‌های Router، و quotaهای Discord جداگانه حساب می‌شوند.

مواردی که باید در داشبورد حساب خود بررسی کنید:

- فعال‌بودن Durable Objects و SQLite برای حساب Cloudflare
- سقف درخواست‌های روزانه‌ی Workers و Durable Objects در پلن فعلی
- محدودیت زمان اجرای درخواست و حجم پاسخ Discord
- فعال‌بودن دامنه یا `workers.dev` برای webhook HTTPS
- quota و هزینه‌ی مدل‌های انتخاب‌شده در 9Router

### جمع‌بندی عملی

- برای تست شخصی و تعداد پیام کم: بله، این Worker می‌تواند روی پلن رایگان اجرا شود، مشروط به فعال‌بودن Durable Objects در حساب شما.
- برای استفاده‌ی سنگین، چند سرور Discord یا پاسخ‌های طولانی: quotaها را باید جداگانه پایش کرد و ممکن است پلن Paid یا تنظیمات بیشتر لازم شود.
- هزینه‌ی اصلی این پروژه در Cloudflare فقط یکی از عوامل نیست؛ API مدل در 9Router معمولاً عامل تعیین‌کننده‌ی هزینه است.

## ساختار پروژه

| مسیر                                                                                           | کاربرد                                  |
| ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| [`examples/discord-9router-bot`](examples/discord-9router-bot)                                 | Worker اصلی بات Discord و 9Router       |
| [`examples/discord-9router-bot/src/index.ts`](examples/discord-9router-bot/src/index.ts)       | webhook، Durable Object و مدیریت مدل    |
| [`examples/discord-9router-bot/wrangler.jsonc`](examples/discord-9router-bot/wrangler.jsonc)   | تنظیمات deploy و migration SQLite       |
| [`examples/discord-9router-bot/.env.example`](examples/discord-9router-bot/.env.example)       | نمونه‌ی متغیرهای محلی بدون secret واقعی |
| [`packages/agents`](packages/agents)                                                           | هسته‌ی Agents SDK مورد استفاده‌ی Worker |
| [`packages/think`](packages/think)                                                             | لایه‌ی Think و messenger state          |
| [`examples/discord-9router-bot/src/types.ts`](examples/discord-9router-bot/src/types.ts)       | قراردادهای type-safe فاز چندعاملی       |
| [`examples/discord-9router-bot/src/tools`](examples/discord-9router-bot/src/tools)             | registry ابزارها                        |
| [`examples/discord-9router-bot/src/departments`](examples/discord-9router-bot/src/departments) | دپارتمان‌ها و personaها                 |
| [`examples/discord-9router-bot/src/router`](examples/discord-9router-bot/src/router)           | مسیریاب پایه‌ی پیام‌ها                  |

## امنیت

- توکن 9Router که قبلاً در گفتگو منتشر شده باید revoke و rotate شود.
- `NINE_ROUTER_API_KEY` و `NINE_ROUTER_ADMIN_TOKEN` فقط به‌صورت secret تنظیم شوند.
- `GITHUB_PAT` و `TAVILY_API_KEY` فقط در صورت نیاز به ابزارهای مربوطه تنظیم شوند.
- endpointهای `/api/models` و `/api/models/config` بدون توکن مدیریتی پاسخ نمی‌دهند.
- توکن مدیریتی را در URL قرار ندهید؛ فقط از header `Authorization` استفاده کنید.

## منبع اصلی

این پروژه بر پایه‌ی [cloudflare/agents](https://github.com/cloudflare/agents) ساخته شده، اما تنظیمات و مسیر اجرایی بات Discord، اتصال 9Router و مستندات این fork برای استفاده‌ی شخصی h4m1dr سفارشی شده‌اند.
