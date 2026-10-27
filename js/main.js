(function () {
  'use strict';

  var WA_PHONE = '244943090008';
  var STORAGE_KEY = 'vf-lang';
  var dict = window.I18N || {};

  /* ---------- i18n ---------- */

  // Russian lives in the markup: capture it once so we can switch back.
  var textNodes = document.querySelectorAll('[data-i18n]');
  var attrNodes = document.querySelectorAll('[data-i18n-attr]');
  textNodes.forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    if (!(key in dict.ru)) dict.ru[key] = el.innerHTML;
  });
  attrNodes.forEach(function (el) {
    el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
      var parts = pair.split(':');
      if (!(parts[1] in dict.ru)) dict.ru[parts[1]] = el.getAttribute(parts[0]);
    });
  });

  function t(lang, key) {
    var table = dict[lang] || {};
    return key in table ? table[key] : dict.ru[key];
  }

  var currentLang = 'ru';

  function setLang(lang) {
    if (!dict[lang]) lang = 'ru';
    currentLang = lang;
    document.documentElement.lang = lang;

    textNodes.forEach(function (el) {
      el.innerHTML = t(lang, el.getAttribute('data-i18n'));
    });
    attrNodes.forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var parts = pair.split(':');
        el.setAttribute(parts[0], t(lang, parts[1]));
      });
    });
    document.title = t(lang, 'meta.title');

    document.querySelectorAll('.js-wa').forEach(function (el) {
      var msg = t(lang, el.getAttribute('data-wa'));
      el.href = 'https://wa.me/' + WA_PHONE + (msg ? '?text=' + encodeURIComponent(msg) : '');
    });

    document.querySelectorAll('.lang__btn').forEach(function (btn) {
      var active = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    document.querySelectorAll('.person').forEach(updateMoreLabel);

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  function initialLang() {
    var fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl && dict[fromUrl]) return fromUrl;
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && dict[saved]) return saved;
    } catch (e) {}
    var nav = (navigator.language || 'ru').toLowerCase();
    // Russian, Ukrainian, Belarusian, Kazakh speakers get RU, everyone else EN
    return /^(ru|uk|be|kk)/.test(nav) ? 'ru' : 'en';
  }

  document.querySelectorAll('.lang__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(btn.getAttribute('data-lang'));
      var url = new URL(location.href);
      url.searchParams.set('lang', currentLang);
      history.replaceState(null, '', url);
    });
  });

  /* ---------- team "read more" ---------- */

  function updateMoreLabel(person) {
    var btn = person.querySelector('.person__more');
    if (!btn) return;
    var open = person.classList.contains('is-open');
    btn.textContent = t(currentLang, open ? 'team.less' : 'team.more') || (open ? 'Свернуть' : 'Читать полностью');
    btn.setAttribute('aria-expanded', String(open));
  }
  dict.ru['team.less'] = dict.ru['team.less'] || 'Свернуть';

  document.querySelectorAll('.person').forEach(function (person) {
    var btn = person.querySelector('.person__more');
    btn.addEventListener('click', function () {
      person.classList.toggle('is-open');
      updateMoreLabel(person);
    });
  });

  /* ---------- mobile menu ---------- */

  var burger = document.querySelector('.burger');
  var header = document.querySelector('.header');
  burger.addEventListener('click', function () {
    var open = header.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.mobile-menu a').forEach(function (a) {
    a.addEventListener('click', function () {
      header.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- header shadow on scroll ---------- */

  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  document.getElementById('year').textContent = new Date().getFullYear();

  setLang(initialLang());
})();
