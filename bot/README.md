# @vamosFalarBot — адаптивный тест на уровень португальского

Бот задаёт 15 вопросов. Первый — уровня A1; ответ верный — следующий вопрос на уровень
сложнее, неверный (или «Не знаю») — на уровень проще. Итоговый уровень — самый высокий,
на котором человек ответил хотя бы на 2 вопроса и правильно минимум на 60 % из них.
В конце бот советует курс и даёт кнопку записи в Telegram (@dlologi, меняется переменной `CONTACT_USERNAME`), а вам присылает результат.

## Вопросы
Все вопросы — в `questions.json`, по 30 на уровни `A1`, `A2`, `B1`, `B2`
(формат как в исходной таблице: `question`, `options` A–D, `correct` — буква правильного варианта).
Вопросы каждому выпадают в случайном порядке и не повторяются, варианты перемешиваются.
Чтобы временно выключить вопрос, добавьте ему `"off": true`.
Тексты рекомендаций — в `bot.py`, словарь `TEXTS` → `results`; число вопросов — `TOTAL`.

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
