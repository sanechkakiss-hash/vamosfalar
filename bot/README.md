# @vamosFalarBot — тест на уровень португальского

Бот задаёт вопросы с вариантами ответа (A1 → B2), определяет уровень и советует курс
со ссылкой на WhatsApp школы. Результаты каждого теста может присылать вам в Telegram.

## Вопросы
Все вопросы — в `questions.json`. У каждого:
- `level` — `A1`, `A2`, `B1` или `B2`;
- `text` — сам вопрос (пропуск — `___`);
- `options` — варианты ответа;
- `answer` — номер правильного варианта, **считая с нуля** (первый — `0`).

Варианты бот перемешивает сам, кнопку «Не знаю» добавляет сам.
Уровень засчитывается, если на его вопросы дано ≥ 60 % правильных ответов и все уровни ниже тоже пройдены.
Тексты рекомендаций — в `bot.py`, словарь `TEXTS` → `results`.

## Запуск
1. Возьмите токен бота у [@BotFather](https://t.me/BotFather) (`/mybots` → vamosFalarBot → API Token).
2. Узнайте свой chat id у [@userinfobot](https://t.me/userinfobot) — туда будут приходить результаты.
3. Запустите на любом сервере/VPS:

```bash
cd bot
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
BOT_TOKEN=123:ABC ADMIN_CHAT_ID=111111 .venv/bin/python bot.py
```

или через Docker:

```bash
docker build -t vamosfalar-bot bot
docker run -d --restart=always --name vamosfalar-bot -e BOT_TOKEN=123:ABC -e ADMIN_CHAT_ID=111111 vamosfalar-bot
```

Бот работает через long polling — нужен только исходящий интернет, домен и HTTPS не нужны.
GitHub Pages ботов не запускает, поэтому нужен отдельный хостинг (VPS, Railway, Render, Fly.io и т.п.).
