"""Telegram-бот @vamosFalarBot: адаптивный тест на уровень португальского.

15 вопросов. Первый — уровня A1; верный ответ — следующий вопрос на уровень
сложнее, неверный — на уровень проще. Итоговый уровень — самый высокий, на
котором человек ответил на 2+ вопроса и правильно хотя бы на 60 % из них.

Весь ход теста хранится прямо в кнопках (seed + строка верно/неверно), поэтому
боту не нужна база данных и перезапуск ничего не ломает.
"""

import asyncio
import html
import json
import logging
import os
import random
from pathlib import Path
from urllib.parse import quote

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BotCommand,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    User,
)

BOT_TOKEN = os.environ["BOT_TOKEN"]
# Куда присылать результаты (id чата/группы). Пусто — не присылать.
ADMIN_CHAT_ID = os.environ.get("ADMIN_CHAT_ID", "").strip()
# Telegram, куда пишут для записи на курс (без @).
CONTACT_USERNAME = os.environ.get("CONTACT_USERNAME", "dlologi").lstrip("@")
SITE_URL = os.environ.get("SITE_URL", "https://vamosfalar.net/")
QUESTIONS_FILE = Path(os.environ.get("QUESTIONS_FILE", Path(__file__).with_name("questions.json")))

LEVELS = ["A1", "A2", "B1", "B2"]
TOTAL = 15         # сколько вопросов задаём
PASS_RATIO = 0.6   # доля верных ответов, чтобы уровень засчитался
MIN_ASKED = 2      # минимум вопросов на уровне, чтобы его засчитать


def load_questions() -> dict[str, list[dict]]:
    """questions.json: {"A1": [{"question", "options": {"A": ...}, "correct": "A", "off"?}], ...}.

    Одинаковые варианты склеиваются в одну кнопку; "off": true — вопрос не задаётся.
    """
    raw = json.loads(QUESTIONS_FILE.read_text(encoding="utf-8"))
    pool: dict[str, list[dict]] = {}
    for level in LEVELS:
        pool[level] = []
        for q in raw.get(level, []):
            if q.get("off"):
                continue
            right = q["options"][q["correct"]]
            options = list(dict.fromkeys(q["options"].values()))
            pool[level].append({"text": q["question"], "options": options, "answer": options.index(right)})
        assert len(pool[level]) >= TOTAL, f"на уровне {level} нужно хотя бы {TOTAL} вопросов"
    return pool


POOL = load_questions()


def replay(seed: int, bits: str) -> tuple[list[str], dict]:
    """По seed и ответам ('1' верно, '0' нет) восстанавливает уровни заданных вопросов и следующий вопрос."""
    rng_order = {lvl: random.Random(f"{seed}:{lvl}").sample(range(len(POOL[lvl])), len(POOL[lvl])) for lvl in LEVELS}
    used = dict.fromkeys(LEVELS, 0)
    levels: list[str] = []
    li = 0
    for b in bits:
        levels.append(LEVELS[li])
        used[LEVELS[li]] += 1
        li = min(li + 1, len(LEVELS) - 1) if b == "1" else max(li - 1, 0)
    level = LEVELS[li]
    nxt = dict(POOL[level][rng_order[level][used[level]]], level=level)
    return levels, nxt


TEXTS = {
    "ru": {
        "hello": (
            "Olá, {name}! 👋\n\n"
            "Это короткий тест на знание португальского от школы <b>VamosFalar</b>.\n"
            "{n} вопросов, около 3 минут. Тест подстраивается под вас: ответили верно — следующий "
            "вопрос сложнее, ошиблись — проще. "
            "Выбирайте вариант, который подходит в пропуск. "
            "Если не знаете ответ — нажмите «Не знаю», так результат будет точнее."
        ),
        "start": "Начать тест",
        "progress": "Вопрос {i} из {n} · уровень {level}",
        "dont_know": "🤷 Не знаю",
        "score": "Верных ответов: <b>{c}/{n}</b>",
        "level": "Ваш уровень португальского: <b>{level}</b>",
        "again": "🔄 Пройти ещё раз",
        "enroll": "✍️ Записаться в Telegram",
        "site": "🌐 Сайт школы",
        "help": "Нажмите /test, чтобы пройти тест на уровень португальского.",
        "cmd_test": "Пройти тест",
        "enroll_text": "Здравствуйте! Прошёл(а) тест в боте, мой уровень — {level}. Хочу записаться на курс.",
        "results": {
            "A0": ("A0 — начинающий",
                   "Вам отлично подойдёт <b>разговорный курс A1</b> для начинающих: научитесь говорить, "
                   "читать и писать на базовом португальском."),
            "A1": ("A1 — элементарный",
                   "Базу вы уже знаете. Рекомендуем <b>курс A2</b> для продолжающих: подтянете грамматику "
                   "и словарный запас до среднего уровня."),
            "A2": ("A2 — предпороговый",
                   "Хороший уровень! Рекомендуем <b>разговорный клуб</b> и <b>индивидуальные занятия</b>, "
                   "чтобы уверенно выйти на B1."),
            "B1": ("B1 — средний",
                   "Отличный результат! Для вас — <b>разговорный клуб</b> с носителями и "
                   "<b>индивидуальные занятия</b> под ваши цели."),
            "B2": ("B2 и выше — продвинутый",
                   "Parabéns! 🎉 Вы свободно владеете языком. Поддерживайте форму в "
                   "<b>разговорном клубе</b> или на <b>индивидуальных занятиях</b>."),
        },
    },
    "en": {
        "hello": (
            "Olá, {name}! 👋\n\n"
            "This is a short Portuguese level test by <b>VamosFalar</b> school.\n"
            "{n} questions, about 3 minutes. The test adapts to you: a right answer makes the next "
            "question harder, a wrong one — easier. "
            "Choose the option that fills the gap. "
            "If you don't know, tap “I don't know” — the result will be more accurate."
        ),
        "start": "Start the test",
        "progress": "Question {i} of {n} · level {level}",
        "dont_know": "🤷 I don't know",
        "score": "Correct answers: <b>{c}/{n}</b>",
        "level": "Your Portuguese level: <b>{level}</b>",
        "again": "🔄 Try again",
        "enroll": "✍️ Enroll via Telegram",
        "site": "🌐 School website",
        "help": "Tap /test to take the Portuguese level test.",
        "cmd_test": "Take the test",
        "enroll_text": "Hello! I took the test in your bot, my level is {level}. I'd like to enroll in a course.",
        "results": {
            "A0": ("A0 — beginner",
                   "The <b>A1 conversation course</b> for beginners is a great fit: you'll learn to speak, "
                   "read and write basic Portuguese."),
            "A1": ("A1 — elementary",
                   "You know the basics. We recommend the <b>A2 course</b> to bring your grammar and "
                   "vocabulary up to intermediate level."),
            "A2": ("A2 — pre-intermediate",
                   "Good level! We recommend the <b>conversation club</b> and <b>private lessons</b> "
                   "to reach B1 with confidence."),
            "B1": ("B1 — intermediate",
                   "Great result! The <b>conversation club</b> with native speakers and "
                   "<b>private lessons</b> tailored to your goals are for you."),
            "B2": ("B2+ — advanced",
                   "Parabéns! 🎉 You speak fluently. Keep in shape at the <b>conversation club</b> "
                   "or in <b>private lessons</b>."),
        },
    },
}


def lang_of(user: User | None) -> str:
    code = (user.language_code or "") if user else ""
    return "ru" if code[:2] in ("ru", "uk", "be", "kk") else "en"


def question_view(seed: int, bits: str, lang: str) -> tuple[str, InlineKeyboardMarkup]:
    _, q = replay(seed, bits)
    t = TEXTS[lang]
    progress = t["progress"].format(i=len(bits) + 1, n=TOTAL, level=q["level"])
    text = f"<i>{progress}</i>\n\n<b>{html.escape(q['text'])}</b>"
    order = list(range(len(q["options"])))
    random.Random(f"{seed}:{bits}").shuffle(order)
    rows = [
        [InlineKeyboardButton(text=q["options"][i], callback_data=f"a:{seed}:{bits or '-'}:{i}")]
        for i in order
    ]
    rows.append([InlineKeyboardButton(text=t["dont_know"], callback_data=f"a:{seed}:{bits or '-'}:x")])
    return text, InlineKeyboardMarkup(inline_keyboard=rows)


def evaluate(seed: int, bits: str) -> tuple[str, dict[str, list[int]]]:
    """Возвращает уровень (A0…B2) и статистику {уровень: [верно, задано]}."""
    levels, _ = replay(seed, bits)
    stats = {lvl: [0, 0] for lvl in LEVELS}
    for lvl, b in zip(levels, bits):
        stats[lvl][1] += 1
        stats[lvl][0] += b == "1"
    reached = "A0"
    for lvl in LEVELS:
        ok, asked = stats[lvl]
        if asked >= MIN_ASKED and ok / asked >= PASS_RATIO:
            reached = lvl
    return reached, stats


def result_view(seed: int, bits: str, lang: str) -> tuple[str, InlineKeyboardMarkup, str]:
    t = TEXTS[lang]
    level, stats = evaluate(seed, bits)
    title, advice = t["results"][level]
    text = (
        f"{t['score'].format(c=bits.count('1'), n=TOTAL)}\n"
        f"{t['level'].format(level=title)}\n\n{advice}"
    )
    enroll_url = f"https://t.me/{CONTACT_USERNAME}?text={quote(t['enroll_text'].format(level=level))}"
    site_url = SITE_URL + ("" if lang == "ru" else "?lang=en")
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=t["enroll"], url=enroll_url)],
        [InlineKeyboardButton(text=t["site"], url=site_url)],
        [InlineKeyboardButton(text=t["again"], callback_data="go")],
    ])
    detail = ", ".join(f"{lvl} {ok}/{asked}" for lvl, (ok, asked) in stats.items() if asked)
    return text, kb, f"{level} ({bits.count('1')}/{TOTAL}; {detail})"


dp = Dispatcher()


@dp.message(CommandStart())
async def on_start(message: Message) -> None:
    t = TEXTS[lang_of(message.from_user)]
    name = html.escape(message.from_user.first_name if message.from_user else "")
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=t["start"], callback_data="go")]])
    await message.answer(t["hello"].format(name=name, n=TOTAL), reply_markup=kb)


async def send_first_question(message: Message, user: User | None) -> None:
    text, kb = question_view(random.randrange(10_000), "", lang_of(user))
    await message.answer(text, reply_markup=kb)


@dp.message(Command("test"))
async def on_test(message: Message) -> None:
    await send_first_question(message, message.from_user)


@dp.callback_query(F.data == "go")
async def on_go(call: CallbackQuery) -> None:
    await send_first_question(call.message, call.from_user)
    await call.answer()


@dp.callback_query(F.data.startswith("a:"))
async def on_answer(call: CallbackQuery, bot: Bot) -> None:
    lang = lang_of(call.from_user)
    try:
        _, seed, bits, choice = call.data.split(":")
        seed, bits = int(seed), bits.strip("-")
        assert set(bits) <= {"0", "1"} and len(bits) < TOTAL
        _, q = replay(seed, bits)
    except (ValueError, IndexError, AssertionError):
        # Кнопка от старой версии бота или вопросов — просто начинаем заново.
        await on_go(call)
        return

    bits += "1" if choice != "x" and int(choice) == q["answer"] else "0"
    await call.answer()

    if len(bits) < TOTAL:
        text, kb = question_view(seed, bits, lang)
        await call.message.edit_text(text, reply_markup=kb)
        return

    text, kb, summary = result_view(seed, bits, lang)
    await call.message.edit_text(text, reply_markup=kb)
    if ADMIN_CHAT_ID:
        await notify_admin(bot, call.from_user, summary)


async def notify_admin(bot: Bot, user: User, summary: str) -> None:
    who = html.escape(user.full_name)
    if user.username:
        who += f" (@{user.username})"
    try:
        await bot.send_message(
            ADMIN_CHAT_ID,
            f'📝 Тест пройден: <a href="tg://user?id={user.id}">{who}</a>\nУровень: <b>{summary}</b>',
        )
    except Exception:
        logging.exception("не удалось отправить результат в ADMIN_CHAT_ID")


@dp.message()
async def on_other(message: Message) -> None:
    await message.answer(TEXTS[lang_of(message.from_user)]["help"])


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode="HTML"))
    for lang in ("ru", "en"):
        await bot.set_my_commands(
            [BotCommand(command="test", description=TEXTS[lang]["cmd_test"])],
            language_code=lang if lang == "ru" else None,
        )
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
