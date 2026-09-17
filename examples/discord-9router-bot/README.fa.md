# راهنمای فارسی ربات چنددپارتمانی دیسکورد

این پروژه یک ربات دیسکورد است که روی **Cloudflare Workers** اجرا می‌شود و برای هر پیام، بر اساس پیشوند، یکی از دپارتمان‌های زیر را انتخاب می‌کند:

- `/research` برای جست‌وجو و تحقیق
- `/devops` برای کدنویسی، اجرای کد و کار با GitHub
- `/admin` برای استفاده از همه ابزارها
- پیام بدون پیشوند به‌صورت پیش‌فرض به `Admin` می‌رود

مدل از طریق endpoint سازگار با OpenAI در 9Router فراخوانی می‌شود و حافظه‌ی گفتگو در Durable Object SQLite ذخیره می‌شود.

## پیش‌نیازها

1. حساب GitHub
2. حساب Cloudflare
3. نصب Node.js نسخه 20 یا جدیدتر
4. نصب pnpm نسخه 11 یا اجرای آن با Corepack
5. یک Discord Application و Bot
6. کلید API مربوط به 9Router

برای فعال‌سازی اختیاری ابزارها نیز این موارد لازم هستند:

- `TAVILY_API_KEY` برای جست‌وجوی وب
- `GITHUB_PAT` برای خواندن یا تغییر فایل‌های GitHub

## نصب سریع در Codespaces

از ریشه‌ی repository اجرا کن:

```bash
corepack enable
pnpm install
cd examples/discord-9router-bot
```

## روش ساده‌ی تنظیم Secretها

به‌جای وارد کردن دستی هفت دستور، این دستور را اجرا کن:

```bash
pnpm run setup:secrets
```

اسکریپت برای هر Secret، خود Wrangler را اجرا می‌کند و مقدار را از تو می‌گیرد. مقدار Secret در کد یا Git commit ذخیره نمی‌شود.

Secretهای اصلی:

| نام | کاربرد | اجباری؟ |
|---|---|---|
| `DISCORD_BOT_TOKEN` | توکن Bot دیسکورد | بله |
| `DISCORD_PUBLIC_KEY` | کلید تأیید امضای Discord | بله |
| `DISCORD_APPLICATION_ID` | شناسه Application دیسکورد | بله |
| `NINE_ROUTER_API_KEY` | کلید API مدل | بله |
| `NINE_ROUTER_ADMIN_TOKEN` | رمز endpoint مدیریت مدل | بله |
| `GITHUB_PAT` | دسترسی GitHub | برای قابلیت GitHub |
| `TAVILY_API_KEY` | جست‌وجوی وب | برای Research |

اگر فعلاً GitHub یا جست‌وجوی وب را لازم نداری، هنگام اجرای اسکریپت می‌توانی برای آن‌ها مقدار آزمایشی وارد نکنی؛ ابزار مربوطه در زمان اجرا خطا را به مدل برمی‌گرداند، ولی ربات بالا می‌آید.

## Deploy

بعد از تنظیم Secretها:

```bash
pnpm run deploy
```

یا برای اجرای هر دو مرحله پشت‌سرهم:

```bash
pnpm run deploy:guided
```

این دستور ابتدا build می‌کند و سپس Worker و Durable Object را deploy می‌کند.

## تنظیم Discord

بعد از deploy، دامنه‌ی Worker را از خروجی Wrangler بردار و در Discord Developer Portal در بخش **Interactions Endpoint URL** قرار بده:

```text
https://YOUR_WORKER_DOMAIN/api/webhooks/discord
```

Bot را با scopeهای زیر به سرور دعوت کن:

```text
bot
applications.commands
```

اگر می‌خواهی ربات پیام‌های معمولی کانال را ببیند، **Message Content Intent** را نیز فعال کن. ربات در این پروژه از mention و Direct Message پشتیبانی می‌کند.

## تست ربات

```text
/research آخرین اخبار Cloudflare Workers را خلاصه کن
/devops ساختار repository را بررسی کن
/admin یک پاسخ کوتاه برای سلام بنویس
```

مهم: prefix قبل از ارسال پیام به مدل حذف می‌شود؛ بنابراین مدل فقط متن اصلی درخواست را دریافت می‌کند.

## تنظیم مدل

تنظیمات پیش‌فرض غیرمحرمانه در `wrangler.jsonc` قرار دارند:

```text
NINE_ROUTER_BASE_URL=https://9r.ykno.ir/v1
NINE_ROUTER_MODEL=GPT
NINE_ROUTER_ALLOWED_MODELS=GPT
```

برای دیدن مدل‌ها:

```bash
curl \\
  -H "Authorization: Bearer YOUR_NINE_ROUTER_ADMIN_TOKEN" \\
  https://YOUR_WORKER_DOMAIN/api/models
```

## اجرای محلی

```bash
cp .env.example .dev.vars
pnpm run dev
```

برای دریافت webhook دیسکورد در حالت local به یک HTTPS عمومی مثل Cloudflare Quick Tunnel نیاز داری.

## رایگان بودن

برای استفاده‌ی شخصی و کم‌حجم، بخش Worker و Durable Object ممکن است در محدوده‌ی رایگان Cloudflare باقی بماند؛ اما «رایگان بودن کامل» تضمین نمی‌شود. مصرف 9Router، Tavily، محدودیت‌های Cloudflare و سرویس عمومی Piston جداگانه محاسبه می‌شوند.

این پروژه برای استفاده‌ی روزانه‌ی شخصی کم‌حجم طراحی مناسبی دارد، ولی قبل از استفاده‌ی سنگین quota حساب Cloudflare و quota سرویس‌های خارجی را بررسی کن. برای جلوگیری از هزینه‌ی ناخواسته، billing alert حساب Cloudflare را فعال کن.

## امنیت

- Secretها را داخل `wrangler.jsonc` یا Git commit نکن.
- توکن Discord، کلید 9Router و `GITHUB_PAT` را در اختیار دیگران نگذار.
- `NINE_ROUTER_ADMIN_TOKEN` را طولانی و تصادفی انتخاب کن.
- اگر توکنی لو رفت، فوراً آن را rotate کن.
- ابزار اجرای کد از Piston عمومی استفاده می‌کند؛ اطلاعات محرمانه را به آن ارسال نکن.

## خطاهای رایج

### `workspace:*` یا dependency پیدا نمی‌شود

دستورها را از ریشه‌ی repository اجرا کن:

```bash
pnpm install
cd examples/discord-9router-bot
```

### ربات پیام نمی‌دهد

این موارد را بررسی کن:

1. Interactions Endpoint URL دقیقاً درست باشد.
2. `DISCORD_PUBLIC_KEY` مربوط به همان Application باشد.
3. Worker deploy شده باشد.
4. لاگ‌ها را ببین:

```bash
wrangler tail discord-9router-bot
```

### ابزار جست‌وجو یا GitHub کار نمی‌کند

به‌ترتیب `TAVILY_API_KEY` و `GITHUB_PAT` را دوباره با Wrangler تنظیم کن. این دو ابزار بدون Secret مربوطه قابل استفاده نیستند.
