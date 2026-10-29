// ================= НАСТРОЙКИ =================
// Telegram, куда пишут для записи на курс (без @).
const CONTACT_USERNAME = "dlologi";
const SITE_URL = "https://vamosfalar.net/";
// Куда присылать результаты тестов (ваш Id из @userinfobot).
// Если в Cloudflare задана переменная ADMIN_CHAT_ID, берётся она.
const ADMIN_CHAT_ID = "383574295";
const PER_LEVEL = 15;    // сколько вопросов задаём на каждом уровне
const PASS_RATIO = 0.8;  // доля верных ответов, чтобы уровень подтвердился (0.8 = 12 из 15)
// Токен (BOT_TOKEN) задаётся в Cloudflare: Settings → Variables and Secrets, а не здесь.

/*
 * @vamosFalarBot — тест на уровень португальского по ступеням (Cloudflare Worker).
 *
 * Сначала 15 вопросов уровня A1. Если верно 80 % и больше — уровень A1
 * подтверждён, и бот предлагает пройти A2 (снова 15 вопросов), и так до B2.
 * Если меньше 80 % — тест заканчивается на последнем подтверждённом уровне.
 *
 * Весь ход теста хранится прямо в кнопках (уровень + seed + строка верно/неверно),
 * поэтому база данных не нужна.
 *
 * Адреса воркера:
 *   /setup — один раз открыть в браузере: подключает бота к этому воркеру;
 *   /check — проверка: присылает тестовое сообщение туда, куда идут результаты;
 *   /      — сюда Telegram присылает сообщения.
 */

// ================= ВОПРОСЫ =================
// По 30+ вопросов на уровень. correct — буква правильного варианта.
// Чтобы выключить вопрос, добавьте ему "off":true.
const QUESTIONS = {
  "A1": [
    {"id":1,"question":"_____ te chamas?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"A"},
    {"id":2,"question":"Ela _____ portuguesa.","options":{"A":"é","B":"está","C":"tem","D":"há"},"correct":"A"},
    {"id":3,"question":"Eu _____ 25 anos.","options":{"A":"sou","B":"estou","C":"tenho","D":"faço"},"correct":"C"},
    {"id":4,"question":"_____ é o teu nome?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":5,"question":"Nós _____ em Lisboa.","options":{"A":"moro","B":"moras","C":"mora","D":"moramos"},"correct":"D"},
    {"id":6,"question":"Ele _____ um carro novo.","options":{"A":"é","B":"está","C":"tem","D":"há"},"correct":"C"},
    {"id":7,"question":"_____ é a sua nacionalidade?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":8,"question":"Elas _____ estudantes.","options":{"A":"é","B":"são","C":"está","D":"têm"},"correct":"B"},
    {"id":9,"question":"Eu _____ café todas as manhãs.","options":{"A":"bebo","B":"bebes","C":"bebe","D":"bebemos"},"correct":"A"},
    {"id":10,"question":"_____ livros são novos.","options":{"A":"Este","B":"Esta","C":"Estes","D":"Estas"},"correct":"C"},
    {"id":11,"question":"A Maria _____ uma casa em Cascais.","options":{"A":"é","B":"está","C":"tem","D":"há"},"correct":"C"},
    {"id":12,"question":"Tu _____ bem português?","options":{"A":"falo","B":"falas","C":"fala","D":"falamos"},"correct":"B"},
    {"id":13,"question":"_____ é ele? É o meu irmão.","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"C"},
    {"id":14,"question":"Nós _____ ao cinema no sábado.","options":{"A":"vamos","B":"vão","C":"vou","D":"vais"},"correct":"A"},
    {"id":15,"question":"_____ é a capital de Portugal?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":16,"question":"Vocês _____ fome?","options":{"A":"são","B":"estão","C":"têm","D":"há"},"correct":"C"},
    {"id":17,"question":"Tu _____ do Brasil?","options":{"A":"sou","B":"és","C":"é","D":"somos"},"correct":"B"},
    {"id":18,"question":"_____ está o livro? Está na mesa.","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"D"},
    {"id":19,"question":"Eles _____ dois filhos.","options":{"A":"é","B":"são","C":"têm","D":"há"},"correct":"C"},
    {"id":20,"question":"_____ é o teu aniversário?","options":{"A":"Como","B":"Quando","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":21,"question":"Eu _____ estudante.","options":{"A":"sou","B":"estou","C":"tenho","D":"há"},"correct":"A"},
    {"id":22,"question":"A casa _____ grande e bonita.","options":{"A":"é","B":"está","C":"tem","D":"há"},"correct":"A"},
    {"id":23,"question":"_____ é a tua profissão?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":24,"question":"Nós _____ dois gatos.","options":{"A":"temos","B":"tenho","C":"tem","D":"têm"},"correct":"A"},
    {"id":25,"question":"Ele _____ em casa agora.","options":{"A":"é","B":"está","C":"tem","D":"há"},"correct":"B"},
    {"id":26,"question":"_____ é o teu número de telefone?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":27,"question":"Eu _____ água.","options":{"A":"bebo","B":"bebes","C":"bebe","D":"bebemos"},"correct":"A"},
    {"id":28,"question":"_____ dias da semana são: segunda, terça...","options":{"A":"Os","B":"As","C":"Um","D":"Uma"},"correct":"A"},
    {"id":29,"question":"Ela _____ uma caneta.","options":{"A":"é","B":"está","C":"tem","D":"há"},"correct":"C"},
    {"id":30,"question":"_____ é a tua cor preferida?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"B"}
  ],
  "A2": [
    {"id":1,"question":"Ontem eu _____ ao cinema com a Maria.","options":{"A":"vou","B":"fui","C":"ia","D":"irei"},"correct":"B"},
    {"id":2,"question":"Quando era criança, _____ todos os dias à praia.","options":{"A":"fui","B":"ia","C":"irei","D":"vou"},"correct":"B"},
    {"id":3,"question":"Ela _____ uma carta para o amigo.","options":{"A":"escreveu","B":"escrevia","C":"escreve","D":"escreverá"},"correct":"A"},
    {"id":4,"question":"Nós _____ ao mercado na semana passada.","options":{"A":"fomos","B":"íamos","C":"vamos","D":"iremos"},"correct":"A"},
    {"id":5,"question":"_____ é que tu moras?","options":{"A":"Como","B":"Qual","C":"Onde","D":"Quem"},"correct":"C"},
    {"id":6,"question":"Ele _____ o carro na semana passada.","options":{"A":"comprou","B":"comprava","C":"compra","D":"comprará"},"correct":"A"},
    {"id":7,"question":"Antigamente eu _____ no Porto, mas agora moro em Lisboa.","options":{"A":"moro","B":"morava","C":"morarei","D":"more"},"correct":"B"},
    {"id":8,"question":"_____ é que ela se chama?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"A"},
    {"id":9,"question":"Eles _____ ao Brasil no ano passado.","options":{"A":"vão","B":"iam","C":"foram","D":"irão"},"correct":"C"},
    {"id":10,"question":"A mãe _____ o jantar quando chegámos.","options":{"A":"preparou","B":"preparava","C":"prepara","D":"preparará"},"correct":"B"},
    {"id":11,"question":"_____ é que tu fazes no fim de semana?","options":{"A":"Como","B":"O que","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":12,"question":"Eu _____ um livro ontem à noite.","options":{"A":"leio","B":"li","C":"lia","D":"lerei"},"correct":"B"},
    {"id":13,"question":"Nós _____ à escola todos os dias.","options":{"A":"fomos","B":"íamos","C":"vamos","D":"iremos"},"correct":"C"},
    {"id":14,"question":"_____ é que ele chegou?","options":{"A":"Como","B":"Quando","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":15,"question":"Ela _____ o cabelo todas as semanas.","options":{"A":"cortou","B":"cortava","C":"corta","D":"cortará"},"correct":"C"},
    {"id":16,"question":"Eu _____ o jornal quando o telefone tocou.","options":{"A":"lia","B":"li","C":"leio","D":"lerei"},"correct":"A"},
    {"id":17,"question":"_____ é que vocês vão de férias?","options":{"A":"Como","B":"Quando","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":18,"question":"Eles _____ uma festa no sábado passado.","options":{"A":"fazem","B":"fizeram","C":"faziam","D":"farão"},"correct":"B"},
    {"id":19,"question":"A Rita _____ muito bem quando era jovem.","options":{"A":"cantou","B":"cantava","C":"canta","D":"cantará"},"correct":"B"},
    {"id":20,"question":"_____ é que tu preferes, chá ou café?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"B"},
    {"id":21,"question":"Eu _____ em casa quando começou a chover.","options":{"A":"estive","B":"estava","C":"estou","D":"estarei"},"correct":"B"},
    {"id":22,"question":"Nós _____ a verdade.","options":{"A":"dissemos","B":"dizíamos","C":"dizemos","D":"diremos"},"correct":"A"},
    {"id":23,"question":"_____ é que ele é? É o professor.","options":{"A":"Como","B":"Quem","C":"Onde","D":"Quando"},"correct":"B"},
    {"id":24,"question":"Ela _____ o vestido na loja.","options":{"A":"experimentou","B":"experimentava","C":"experimenta","D":"experimentará"},"correct":"A"},
    {"id":25,"question":"Ontem eu _____ de casa às 8 horas.","options":{"A":"saí","B":"saía","C":"saio","D":"sairei"},"correct":"A"},
    {"id":26,"question":"_____ é que vocês se conheceram?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"A"},
    {"id":27,"question":"Eles _____ a verdade quando foram interrogados.","options":{"A":"disseram","B":"diziam","C":"dizem","D":"dirão"},"correct":"A"},
    {"id":28,"question":"A Ana _____ o bolo quando chegámos.","options":{"A":"fez","B":"fazia","C":"faz","D":"fará"},"correct":"B"},
    {"id":29,"question":"_____ é que tu vais para o trabalho?","options":{"A":"Como","B":"Qual","C":"Quem","D":"Onde"},"correct":"A"},
    {"id":30,"question":"Eu _____ um sonho estranho ontem.","options":{"A":"tive","B":"tinha","C":"tenho","D":"terei"},"correct":"A"}
  ],
  "B1": [
    {"id":1,"question":"Os meus pais querem que eu _____ medicina.","options":{"A":"estudo","B":"estudar","C":"estude","D":"estudarei"},"correct":"C"},
    {"id":2,"question":"Quando era pequeno, _____ todos os dias a este parque.","options":{"A":"fui","B":"ia","C":"irei","D":"vou"},"correct":"B"},
    {"id":3,"question":"Se eu _____ tempo, iria à tua festa.","options":{"A":"tenho","B":"tinha","C":"tivesse","D":"terei"},"correct":"C"},
    {"id":4,"question":"É importante que tu _____ as regras.","options":{"A":"respeitas","B":"respeitar","C":"respeites","D":"respeitarás"},"correct":"C"},
    {"id":5,"question":"Embora _____ muito, não conseguiu chegar a tempo.","options":{"A":"correu","B":"corria","C":"corresse","D":"correrá"},"correct":"C"},
    {"id":6,"question":"Ele prometeu que _____ a tempo, mas chegou tarde.","options":{"A":"chega","B":"chegue","C":"chegará","D":"chegaria"},"correct":"D"},
    {"id":7,"question":"Acho que ele _____ razão.","options":{"A":"tem","B":"tenha","C":"tivesse","D":"teria"},"correct":"A"},
    {"id":8,"question":"Não sei se ele _____ vir.","options":{"A":"vai","B":"vá","C":"fosse","D":"iria"},"correct":"A"},
    {"id":9,"question":"Quero que tu _____ comigo.","options":{"A":"vens","B":"venhas","C":"vinhas","D":"viesses"},"correct":"B"},
    {"id":10,"question":"Se tivesse dinheiro, _____ uma casa nova.","options":{"A":"compro","B":"comprava","C":"compraria","D":"comprei"},"correct":"C"},
    {"id":11,"question":"É possível que eles _____ atrasados.","options":{"A":"estão","B":"estejam","C":"estivessem","D":"estarão"},"correct":"B"},
    {"id":12,"question":"Embora _____ frio, fomos à praia.","options":{"A":"fazia","B":"fizesse","C":"faz","D":"fará"},"correct":"B"},
    {"id":13,"question":"Ela pediu-me que _____ a porta.","options":{"A":"fecho","B":"feche","C":"fechava","D":"fechasse"},"correct":"D"},
    {"id":14,"question":"Caso _____ cedo, avisa-me.","options":{"A":"chegas","B":"chegues","C":"chegavas","D":"chegasses"},"correct":"B"},
    {"id":15,"question":"Duvido que ele _____ a verdade.","options":{"A":"diz","B":"diga","C":"dizia","D":"diria"},"correct":"B"},
    {"id":16,"question":"Se eu _____ mais novo, viajaria pelo mundo.","options":{"A":"sou","B":"era","C":"fosse","D":"serei"},"correct":"C"},
    {"id":17,"question":"Espero que tu _____ bem.","options":{"A":"estás","B":"estejas","C":"estavas","D":"estarás"},"correct":"B"},
    {"id":18,"question":"Quando _____ tempo, vou visitar-te.","options":{"A":"tenho","B":"tenha","C":"tivesse","D":"terei"},"correct":"A"},
    {"id":19,"question":"É melhor que nós _____ agora.","options":{"A":"saímos","B":"saiamos","C":"saíamos","D":"sairemos"},"correct":"B"},
    {"id":20,"question":"Não acredito que ele _____ capaz de fazer isso.","options":{"A":"é","B":"seja","C":"era","D":"será"},"correct":"B"},
    {"id":21,"question":"Se _____ estudado mais, teria passado no exame.","options":{"A":"tenho","B":"tinha","C":"tivesse","D":"terei"},"correct":"C"},
    {"id":22,"question":"Embora _____ cansado, continuou a trabalhar.","options":{"A":"estava","B":"estivesse","C":"está","D":"estará"},"correct":"B"},
    {"id":23,"question":"Peço-te que _____ com atenção.","options":{"A":"ouves","B":"ouças","C":"ouvias","D":"ouvirás"},"correct":"B"},
    {"id":24,"question":"Talvez ele _____ chegar mais tarde.","options":{"A":"vai","B":"vá","C":"ia","D":"iria"},"correct":"B"},
    {"id":25,"question":"Se _____ possível, gostaria de falar contigo.","options":{"A":"é","B":"seja","C":"fosse","D":"será"},"correct":"C"},
    {"id":26,"question":"É natural que ela _____ nervosa.","options":{"A":"está","B":"esteja","C":"estava","D":"estará"},"correct":"B"},
    {"id":27,"question":"Caso _____ necessário, telefona-me.","options":{"A":"é","B":"seja","C":"era","D":"será"},"correct":"B"},
    {"id":28,"question":"Espero que eles _____ chegado bem.","options":{"A":"têm","B":"tenham","C":"tinham","D":"terão"},"correct":"B"},
    {"id":29,"question":"Se eu _____ o teu lugar, aceitaria a oferta.","options":{"A":"sou","B":"era","C":"fosse","D":"serei"},"correct":"C"},
    {"id":30,"question":"É provável que nós _____ de mudar de planos.","options":{"A":"temos","B":"tenhamos","C":"tínhamos","D":"teremos"},"correct":"B"}
  ],
  "B2": [
    {"id":1,"question":"Logo que o relatório _____ pronto, avisar-te-ei.","options":{"A":"está","B":"esteja","C":"estiver","D":"estava"},"correct":"C"},
    {"id":2,"question":"Existe no planeta um elevado número de insetos que _____ pela sua grande diversidade.","options":{"A":"caracterizados","B":"caracterizam","C":"caracterizando","D":"caracterizar"},"correct":"B"},
    {"id":3,"question":"Se _____ mais atenção, não terias cometido esse erro.","options":{"A":"prestaste","B":"tinhas prestado","C":"tivesses prestado","D":"terás prestado"},"correct":"C"},
    {"id":4,"question":"Assim que ele _____, diz-me.","options":{"A":"chegar","B":"chega","C":"chegasse","D":"chegou"},"correct":"A"},
    {"id":5,"question":"Por muito que _____, não vou mudar de opinião.","options":{"A":"insistas","B":"insistes","C":"insistias","D":"insistirás"},"correct":"A"},
    {"id":6,"question":"Caso _____ necessidade, podes contar comigo.","options":{"A":"há","B":"haja","C":"houver","D":"haverá"},"correct":"B"},
    {"id":7,"question":"Não é que ele _____ incapaz, é que não quer.","options":{"A":"é","B":"seja","C":"era","D":"será"},"correct":"B"},
    {"id":8,"question":"Enquanto não _____ o trabalho, não podes sair.","options":{"A":"terminas","B":"terminares","C":"terminasses","D":"terminarás"},"correct":"B"},
    {"id":9,"question":"Ainda que _____ tudo, não ficaria satisfeito.","options":{"A":"tem","B":"tenha","C":"tinha","D":"terá"},"correct":"B"},
    {"id":10,"question":"Assim que _____ a carta, responde.","options":{"A":"recebes","B":"receberes","C":"recebesses","D":"receberás"},"correct":"B"},
    {"id":11,"question":"Por mais que _____, ele não desiste.","options":{"A":"tenta","B":"tente","C":"tentava","D":"tentará"},"correct":"B"},
    {"id":12,"question":"Caso _____ atrasado, avisa-me.","options":{"A":"estás","B":"estiveres","C":"estarás","D":"estejas"},"correct":"D"},
    {"id":13,"question":"Logo que _____ o sol, vamos à praia.","options":{"A":"nasce","B":"nascer","C":"nascesse","D":"nascerá"},"correct":"B"},
    {"id":14,"question":"Não obstante _____ dificuldades, conseguiu vencer.","options":{"A":"as","B":"às","C":"pelas","D":"nas"},"correct":"A"},
    {"id":15,"question":"Se _____ tempo, teria ido ao teatro.","options":{"A":"tenho","B":"tinha","C":"tivesse","D":"terei"},"correct":"C"},
    {"id":16,"question":"A menos que _____ de ideias, vamos avançar.","options":{"A":"mudas","B":"mudes","C":"mudasses","D":"mudarás"},"correct":"B"},
    {"id":17,"question":"Assim que _____ o resultado, comunico-te.","options":{"A":"souber","B":"sei","C":"soubesse","D":"saberei"},"correct":"A"},
    {"id":18,"question":"Por muito que _____ esforço, não conseguirá.","options":{"A":"faz","B":"faça","C":"fazia","D":"fará"},"correct":"B"},
    {"id":19,"question":"Caso os clientes _____ interesse, podemos marcar uma reunião.","options":{"A":"tenham","B":"têm","C":"tiverem","D":"terão"},"correct":"A"},
    {"id":20,"question":"Enquanto _____ jovem, aproveita para viajar.","options":{"A":"és","B":"sejas","C":"fores","D":"serás"},"correct":"C"},
    {"id":21,"question":"Ainda que _____ razão, deves ouvir os outros.","options":{"A":"tens","B":"tenhas","C":"tinhas","D":"terás"},"correct":"B"},
    {"id":22,"question":"Se _____ possível, gostaria de fazer uma pergunta.","options":{"A":"é","B":"seja","C":"fosse","D":"será"},"correct":"C"},
    {"id":23,"question":"Por mais que _____, não o convencerás.","options":{"A":"tentas","B":"tentes","C":"tentavas","D":"tentarás"},"correct":"B"},
    {"id":24,"question":"Caso _____ problemas, a empresa devolve o dinheiro.","options":{"A":"surgem","B":"surgirem","C":"surjam","D":"surgirão"},"correct":"C"},
    {"id":25,"question":"Assim que _____ o livro, empresta-mo.","options":{"A":"lês","B":"leres","C":"leias","D":"lerás"},"correct":"B"},
    {"id":26,"question":"Não é que _____ preguiçoso, é que está cansado.","options":{"A":"é","B":"seja","C":"era","D":"será"},"correct":"B"},
    {"id":27,"question":"Logo que _____ o comboio, avisa-me.","options":{"A":"chega","B":"chegue","C":"chegará","D":"chegar"},"correct":"D"},
    {"id":28,"question":"Enquanto não _____ a verdade, não ficarei tranquilo.","options":{"A":"sei","B":"saiba","C":"souber","D":"saberei"},"correct":"C"},
    {"id":29,"question":"A menos que _____ impedimento, estarei presente.","options":{"A":"há","B":"haja","C":"houvesse","D":"haverá"},"correct":"B"},
    {"id":30,"question":"Por muito que _____ estudado, ele não teria passado no exame.","options":{"A":"tivesse","B":"tinha","C":"tenha","D":"teria"},"correct":"A"}
  ]
};

const LEVELS = ["A1", "A2", "B1", "B2"];

const TEXTS = {
  ru: {
    hello:
      "Olá, {name}! 👋\n\n" +
      "Это тест на знание португальского от школы <b>VamosFalar</b>.\n\n" +
      "Начнём с уровня <b>A1</b>: {n} вопросов, около 3 минут. Ответите верно на {pass} и больше — " +
      "уровень подтверждён, и можно перейти к следующему (A2, B1, B2).\n\n" +
      "Выбирайте вариант, который подходит в пропуск. Если не знаете ответ — нажмите «Не знаю», " +
      "так результат будет точнее.",
    start: "Начать тест A1",
    progress: "Уровень {level} · вопрос {i} из {n}",
    dont_know: "🤷 Не знаю",
    score: "Верных ответов: <b>{c}/{n}</b>",
    passed: "✅ Уровень <b>{level}</b> подтверждён!",
    offer: "Хотите проверить уровень <b>{next}</b>? Это ещё {n} вопросов.",
    failed: "Уровень <b>{level}</b> пока не подтверждён — нужно {pass} верных ответов из {n}.",
    final: "Ваш уровень португальского: <b>{level}</b>",
    take: "➡️ Пройти уровень {level}",
    retry: "🔄 Пройти {level} ещё раз",
    restart: "🔄 Начать сначала",
    enroll: "✍️ Записаться в Telegram",
    site: "🌐 Сайт школы",
    help: "Нажмите /test, чтобы пройти тест на уровень португальского.",
    cmd_test: "Пройти тест",
    enroll_text: "Здравствуйте! Прошёл(а) тест в боте, мой уровень — {level}. Хочу записаться на курс.",
    results: {
      A0: ["A0 — начинающий",
        "Вам отлично подойдёт <b>разговорный курс A1</b> для начинающих: научитесь говорить, " +
        "читать и писать на базовом португальском."],
      A1: ["A1 — элементарный",
        "Базу вы уже знаете. Рекомендуем <b>курс A2</b> для продолжающих: подтянете грамматику " +
        "и словарный запас до среднего уровня."],
      A2: ["A2 — предпороговый",
        "Хороший уровень! Рекомендуем <b>разговорный клуб</b> и <b>индивидуальные занятия</b>, " +
        "чтобы уверенно выйти на B1."],
      B1: ["B1 — средний",
        "Отличный результат! Для вас — <b>разговорный клуб</b> с носителями и " +
        "<b>индивидуальные занятия</b> под ваши цели."],
      B2: ["B2 — продвинутый",
        "Parabéns! 🎉 Вы свободно владеете языком. Поддерживайте форму в " +
        "<b>разговорном клубе</b> или на <b>индивидуальных занятиях</b>."],
    },
  },
  en: {
    hello:
      "Olá, {name}! 👋\n\n" +
      "This is a Portuguese level test by <b>VamosFalar</b> school.\n\n" +
      "We start with level <b>A1</b>: {n} questions, about 3 minutes. Get {pass} or more right — " +
      "the level is confirmed and you can move on to the next one (A2, B1, B2).\n\n" +
      "Choose the option that fills the gap. If you don't know, tap “I don't know” — " +
      "the result will be more accurate.",
    start: "Start the A1 test",
    progress: "Level {level} · question {i} of {n}",
    dont_know: "🤷 I don't know",
    score: "Correct answers: <b>{c}/{n}</b>",
    passed: "✅ Level <b>{level}</b> confirmed!",
    offer: "Want to check level <b>{next}</b>? It's {n} more questions.",
    failed: "Level <b>{level}</b> is not confirmed yet — you need {pass} correct answers out of {n}.",
    final: "Your Portuguese level: <b>{level}</b>",
    take: "➡️ Take level {level}",
    retry: "🔄 Retake {level}",
    restart: "🔄 Start over",
    enroll: "✍️ Enroll via Telegram",
    site: "🌐 School website",
    help: "Tap /test to take the Portuguese level test.",
    cmd_test: "Take the test",
    enroll_text: "Hello! I took the test in your bot, my level is {level}. I'd like to enroll in a course.",
    results: {
      A0: ["A0 — beginner",
        "The <b>A1 conversation course</b> for beginners is a great fit: you'll learn to speak, " +
        "read and write basic Portuguese."],
      A1: ["A1 — elementary",
        "You know the basics. We recommend the <b>A2 course</b> to bring your grammar and " +
        "vocabulary up to intermediate level."],
      A2: ["A2 — pre-intermediate",
        "Good level! We recommend the <b>conversation club</b> and <b>private lessons</b> " +
        "to reach B1 with confidence."],
      B1: ["B1 — intermediate",
        "Great result! The <b>conversation club</b> with native speakers and " +
        "<b>private lessons</b> tailored to your goals are for you."],
      B2: ["B2 — advanced",
        "Parabéns! 🎉 You speak fluently. Keep in shape at the <b>conversation club</b> " +
        "or in <b>private lessons</b>."],
    },
  },
};

// ================= ВОПРОСЫ → ПУЛ =================
// Одинаковые варианты склеиваются в одну кнопку; "off": true — вопрос не задаётся.
const POOL = {};
for (const level of LEVELS) {
  POOL[level] = (QUESTIONS[level] || []).filter((q) => !q.off).map((q) => {
    const options = [...new Set(Object.values(q.options))];
    return { text: q.question, options, answer: options.indexOf(q.options[q.correct]) };
  });
  if (POOL[level].length < PER_LEVEL) throw new Error(`на уровне ${level} нужно хотя бы ${PER_LEVEL} вопросов`);
}

// Детерминированный генератор: один и тот же seed — один и тот же порядок.
function rng(key) {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, key) {
  const r = rng(key);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PASS_COUNT = Math.ceil(PER_LEVEL * PASS_RATIO - 1e-9);

// k-й вопрос уровня для этого прохождения: свой порядок на каждый seed, без повторов.
function questionAt(level, seed, k) {
  const order = shuffle([...POOL[level].keys()], `${seed}:${level}`);
  return POOL[level][order[k]];
}

// ================= СООБЩЕНИЯ =================
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function langOf(user) {
  return /^(ru|uk|be|kk)/.test((user && user.language_code) || "") ? "ru" : "en";
}

function questionView(level, seed, bits, lang) {
  const t = TEXTS[lang];
  const q = questionAt(level, seed, bits.length);
  const progress = fmt(t.progress, { level, i: bits.length + 1, n: PER_LEVEL });
  const tag = `a:${level}:${seed}:${bits || "-"}`;
  const rows = shuffle([...q.options.keys()], `${seed}:${level}:${bits}`)
    .map((i) => [{ text: q.options[i], callback_data: `${tag}:${i}` }]);
  rows.push([{ text: t.dont_know, callback_data: `${tag}:x` }]);
  return {
    text: `<i>${progress}</i>\n\n<b>${esc(q.text)}</b>`,
    reply_markup: { inline_keyboard: rows },
  };
}

function enrollButtons(t, lang, level) {
  const enrollUrl = `https://t.me/${CONTACT_USERNAME}?text=${encodeURIComponent(fmt(t.enroll_text, { level }))}`;
  return [
    [{ text: t.enroll, url: enrollUrl }],
    [{ text: t.site, url: SITE_URL + (lang === "ru" ? "" : "?lang=en") }],
  ];
}

// Итог уровня: подтверждён — предлагаем следующий; нет — показываем последний подтверждённый.
function levelResultView(level, bits, lang) {
  const t = TEXTS[lang];
  const correct = [...bits].filter((b) => b === "1").length;
  const passed = correct >= PASS_COUNT;
  const li = LEVELS.indexOf(level);
  const confirmed = passed ? level : li > 0 ? LEVELS[li - 1] : "A0";
  const next = passed ? LEVELS[li + 1] : null;
  const score = fmt(t.score, { c: correct, n: PER_LEVEL });
  const [title, advice] = t.results[confirmed];

  let text, rows;
  if (passed && next) {
    text = `${fmt(t.passed, { level })}\n${score}\n\n${fmt(t.offer, { next, n: PER_LEVEL })}`;
    rows = [[{ text: fmt(t.take, { level: next }), callback_data: `L:${next}` }], ...enrollButtons(t, lang, confirmed)];
  } else {
    const head = passed ? fmt(t.passed, { level }) : fmt(t.failed, { level, pass: PASS_COUNT, n: PER_LEVEL });
    text = `${head}\n${score}\n\n${fmt(t.final, { level: title })}\n\n${advice}`;
    rows = [...enrollButtons(t, lang, confirmed)];
    if (!passed) rows.push([{ text: fmt(t.retry, { level }), callback_data: `L:${level}` }]);
    if (passed || level !== "A1") rows.push([{ text: t.restart, callback_data: "L:A1" }]);
  }
  const summary = `${level} ${passed ? "подтверждён" : "не подтверждён"} (${correct}/${PER_LEVEL}) → уровень ${confirmed}`;
  return { text, reply_markup: { inline_keyboard: rows }, summary };
}

// ================= TELEGRAM =================
async function tg(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) console.log(method, JSON.stringify(data));
  return data;
}

const newSeed = () => Math.floor(Math.random() * 10000);

async function sendLevelStart(env, chatId, user, level) {
  const view = questionView(level, newSeed(), "", langOf(user));
  await tg(env, "sendMessage", { chat_id: chatId, parse_mode: "HTML", ...view });
}

async function onMessage(env, msg) {
  const t = TEXTS[langOf(msg.from)];
  const text = msg.text || "";
  if (text.startsWith("/start")) {
    await tg(env, "sendMessage", {
      chat_id: msg.chat.id,
      parse_mode: "HTML",
      text: fmt(t.hello, { name: esc((msg.from && msg.from.first_name) || ""), n: PER_LEVEL, pass: PASS_COUNT }),
      reply_markup: { inline_keyboard: [[{ text: t.start, callback_data: "L:A1" }]] },
    });
  } else if (text.startsWith("/test")) {
    await sendLevelStart(env, msg.chat.id, msg.from, "A1");
  } else {
    await tg(env, "sendMessage", { chat_id: msg.chat.id, text: t.help });
  }
}

async function onCallback(env, call) {
  const lang = langOf(call.from);
  const chatId = call.message.chat.id;
  const messageId = call.message.message_id;
  await tg(env, "answerCallbackQuery", { callback_query_id: call.id });

  // «Начать тест», «Пройти уровень …», «Ещё раз»: L:<уровень>
  const parts = (call.data || "").split(":");
  if (parts[0] === "L") {
    await sendLevelStart(env, chatId, call.from, LEVELS.includes(parts[1]) ? parts[1] : "A1");
    return;
  }

  // Ответ: a:<уровень>:<seed>:<ответы>:<вариант>
  let level, seed, bits, q;
  if (parts[0] === "a" && parts.length === 5 && LEVELS.includes(parts[1])) {
    level = parts[1];
    seed = Number(parts[2]);
    bits = parts[3] === "-" ? "" : parts[3];
    if (Number.isInteger(seed) && /^[01]*$/.test(bits) && bits.length < PER_LEVEL) q = questionAt(level, seed, bits.length);
  }
  if (!q) {
    // Кнопка от старой версии бота — начинаем заново.
    await sendLevelStart(env, chatId, call.from, "A1");
    return;
  }

  bits += parts[4] !== "x" && Number(parts[4]) === q.answer ? "1" : "0";
  const view = bits.length < PER_LEVEL ? questionView(level, seed, bits, lang) : levelResultView(level, bits, lang);
  const { summary, ...msg } = view;
  await tg(env, "editMessageText", { chat_id: chatId, message_id: messageId, parse_mode: "HTML", ...msg });

  if (summary && adminChat(env)) {
    const u = call.from;
    let who = esc([u.first_name, u.last_name].filter(Boolean).join(" "));
    if (u.username) who += ` (@${u.username})`;
    await tg(env, "sendMessage", {
      chat_id: adminChat(env),
      parse_mode: "HTML",
      text: `📝 Тест: <a href="tg://user?id=${u.id}">${who}</a>\n<b>${summary}</b>`,
    });
  }
}

const adminChat = (env) => String(env.ADMIN_CHAT_ID || ADMIN_CHAT_ID).trim();

async function check(env) {
  const chat = adminChat(env);
  if (!chat) return "ADMIN_CHAT_ID не задан — результаты никуда не отправляются.";
  const res = await tg(env, "sendMessage", { chat_id: chat, text: "✅ Проверка: сюда будут приходить результаты тестов." });
  if (res.ok) return `Готово! Тестовое сообщение отправлено в чат ${chat} — проверьте Telegram.`;
  if (res.error_code === 403 || /chat not found/i.test(res.description || "")) {
    return `Telegram не даёт написать в чат ${chat} (${res.description}). ` +
      "Откройте бота с того аккаунта, чей это Id, нажмите Start и откройте /check ещё раз. " +
      "Если не помогло — проверьте, что Id правильный (@userinfobot).";
  }
  return `Ошибка Telegram для чата ${chat}: ${res.description}`;
}

// Секрет для проверки, что запрос пришёл именно от Telegram (выводится из токена).
async function webhookSecret(env) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.BOT_TOKEN));
  return [...new Uint8Array(hash)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function setup(env, url) {
  const hook = await tg(env, "setWebhook", {
    url: `${url.origin}/`,
    secret_token: await webhookSecret(env),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  await tg(env, "setMyCommands", {
    commands: [{ command: "test", description: TEXTS.ru.cmd_test }],
    language_code: "ru",
  });
  await tg(env, "setMyCommands", { commands: [{ command: "test", description: TEXTS.en.cmd_test }] });
  const me = await tg(env, "getMe", {});
  if (!hook.ok) return `Ошибка: ${hook.description}. Проверьте BOT_TOKEN в Settings → Variables and Secrets.`;
  return `Готово! Бот @${me.result.username} подключён. Откройте https://t.me/${me.result.username} и нажмите Start.`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!env.BOT_TOKEN) {
      return new Response("Не задан BOT_TOKEN: добавьте его в Settings → Variables and Secrets.", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    if (request.method === "GET" && url.pathname === "/check") {
      return new Response(await check(env), { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    if (request.method === "GET" && url.pathname === "/setup") {
      return new Response(await setup(env, url), { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    if (request.method !== "POST") return new Response("VamosFalar bot is running.");
    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== (await webhookSecret(env))) {
      return new Response("forbidden", { status: 403 });
    }
    const update = await request.json();
    try {
      if (update.message) await onMessage(env, update.message);
      else if (update.callback_query) await onCallback(env, update.callback_query);
    } catch (e) {
      console.log("error", e && e.stack);
    }
    return new Response("ok"); // всегда 200, иначе Telegram будет повторять запрос
  },
};
