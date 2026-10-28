"""Telegram-бот @vamosFalarBot: тест на уровень португальского.

Состояние теста хранится прямо в кнопках (номер вопроса + маска правильных
ответов), поэтому боту не нужна база данных и перезапуск ничего не ломает.
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
WA_PHONE = os.environ.get("WA_PHONE", "244943090008")
SITE_URL = os.environ.get("SITE_URL", "https://vamosfalar.net/")
QUESTIONS_FILE = Path(os.environ.get("QUESTIONS_FILE", Path(__file__).with_name("questions.json")))

LEVELS = ["A1", "A2", "B1", "B2"]
PASS_RATIO = 0.6  # доля правильных ответов, чтобы уровень считался пройденным

QUESTIONS = json.loads(QUESTIONS_FILE.read_text(encoding="utf-8"))["questions"]
assert QUESTIONS and len(QUESTIONS) <= 60, "нужно от 1 до 60 вопросов"
for _q in QUESTIONS:
    assert _q["level"] in LEVELS and 0 <= _q["answer"] < len(_q["options"]), _q


def shuffled(qi: int) -> list[int]:
    """Порядок вариантов для вопроса: всегда один и тот же, но правильный не всегда первый."""
    order = list(range(len(QUESTIONS[qi]["options"])))
    random.Random(qi).shuffle(order)
    return order


TEXTS = {
    "ru": {
        "hello": (
            "Olá, {name}! 👋\n\n"
            "Это короткий тест на знание португальского от школы <b>VamosFalar</b>.\n"
            "{n} вопросов, около 5 минут. Выбирайте вариант, который подходит в пропуск. "
            "Если не знаете ответ — нажмите «Не знаю», так результат будет точнее."
        ),
        "start": "Начать тест",
        "progress": "Вопрос {i} из {n}",
        "dont_know": "🤷 Не знаю",
        "score": "Правильных ответов: <b>{c} из {n}</b>",
        "level": "Ваш уровень: <b>{level}</b>",
        "again": "🔄 Пройти ещё раз",
        "wa": "💬 Записаться в WhatsApp",
        "site": "🌐 Сайт школы",
        "help": "Нажмите /test, чтобы пройти тест на уровень португальского.",
        "cmd_test": "Пройти тест",
        "wa_text": "Здравствуйте! Прошёл(а) тест в Telegram, мой уровень — {level}. Хочу записаться на курс.",
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
            "{n} questions, about 5 minutes. Choose the option that fills the gap. "
            "If you don't know, tap “I don't know” — the result will be more accurate."
        ),
        "start": "Start the test",
        "progress": "Question {i} of {n}",
        "dont_know": "🤷 I don't know",
        "score": "Correct answers: <b>{c} of {n}</b>",
        "level": "Your level: <b>{level}</b>",
        "again": "🔄 Try again",
        "wa": "💬 Enroll via WhatsApp",
        "site": "🌐 School website",
        "help": "Tap /test to take the Portuguese level test.",
        "cmd_test": "Take the test",
        "wa_text": "Hello! I took the Telegram test, my level is {level}. I'd like to enroll in a course.",
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


def question_view(qi: int, mask: int, lang: str) -> tuple[str, InlineKeyboardMarkup]:
    q = QUESTIONS[qi]
    t = TEXTS[lang]
    text = f"<i>{t['progress'].format(i=qi + 1, n=len(QUESTIONS))}</i>\n\n<b>{html.escape(q['text'])}</b>"
    rows = [
        [InlineKeyboardButton(text=q["options"][orig], callback_data=f"a:{qi}:{orig}:{mask}")]
        for orig in shuffled(qi)
    ]
    rows.append([InlineKeyboardButton(text=t["dont_know"], callback_data=f"a:{qi}:-1:{mask}")])
    return text, InlineKeyboardMarkup(inline_keyboard=rows)


def evaluate(mask: int) -> tuple[str, int]:
    """Уровень = последний из подряд пройденных уровней (A0, если не пройден даже A1)."""
    correct = [bool(mask >> i & 1) for i in range(len(QUESTIONS))]
    reached = "A0"
    for level in LEVELS:
        marks = [c for c, q in zip(correct, QUESTIONS) if q["level"] == level]
        if not marks:
            continue
        if sum(marks) / len(marks) < PASS_RATIO:
            break
        reached = level
    return reached, sum(correct)


def result_view(mask: int, lang: str) -> tuple[str, InlineKeyboardMarkup, str]:
    t = TEXTS[lang]
    level, correct = evaluate(mask)
    title, advice = t["results"][level]
    text = (
        f"{t['score'].format(c=correct, n=len(QUESTIONS))}\n"
        f"{t['level'].format(level=title)}\n\n{advice}"
    )
    wa_url = f"https://wa.me/{WA_PHONE}?text={quote(t['wa_text'].format(level=level))}"
    site_url = SITE_URL + ("" if lang == "ru" else "?lang=en")
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=t["wa"], url=wa_url)],
        [InlineKeyboardButton(text=t["site"], url=site_url)],
        [InlineKeyboardButton(text=t["again"], callback_data="go")],
    ])
    return text, kb, f"{level} ({correct}/{len(QUESTIONS)})"


dp = Dispatcher()


@dp.message(CommandStart())
async def on_start(message: Message) -> None:
    t = TEXTS[lang_of(message.from_user)]
    name = html.escape(message.from_user.first_name if message.from_user else "")
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=t["start"], callback_data="go")]])
    await message.answer(t["hello"].format(name=name, n=len(QUESTIONS)), reply_markup=kb)


@dp.message(Command("test"))
async def on_test(message: Message) -> None:
    text, kb = question_view(0, 0, lang_of(message.from_user))
    await message.answer(text, reply_markup=kb)


@dp.callback_query(F.data == "go")
async def on_go(call: CallbackQuery) -> None:
    text, kb = question_view(0, 0, lang_of(call.from_user))
    await call.message.answer(text, reply_markup=kb)
    await call.answer()


@dp.callback_query(F.data.startswith("a:"))
async def on_answer(call: CallbackQuery, bot: Bot) -> None:
    lang = lang_of(call.from_user)
    try:
        _, qi, choice, mask = call.data.split(":")
        qi, choice, mask = int(qi), int(choice), int(mask)
        q = QUESTIONS[qi]
    except (ValueError, IndexError):
        # Кнопка от старой версии вопросов — просто начинаем заново.
        await call.answer()
        await on_go(call)
        return

    if choice == q["answer"]:
        mask |= 1 << qi
    await call.answer()

    if qi + 1 < len(QUESTIONS):
        text, kb = question_view(qi + 1, mask, lang)
        await call.message.edit_text(text, reply_markup=kb)
        return

    text, kb, summary = result_view(mask, lang)
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
