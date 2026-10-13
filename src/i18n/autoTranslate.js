// autoTranslate.js — перевод всего сайта на выбранный язык.
// Тексты сайта написаны по-русски. Для английского и узбекского есть словари
// (dict/en.json, dict/uz.json: русская фраза -> перевод). Переводчик проходит
// по странице и подменяет русский текст и подписи (placeholder, title…),
// а MutationObserver переводит всё, что появляется позже: новые экраны,
// окна, уведомления, сообщения сервера. При возврате на русский всё
// восстанавливается как было.

const CYR = /[А-Яа-яЁё]/;
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "CODE", "PRE"]);
const SKIP_SELECTOR = '[translate="no"],textarea,script,style,[contenteditable="true"]';

const loaders = {
  en: () => import("./dict/en.json"),
  uz: () => import("./dict/uz.json")
};

let lang = "ru";
let dict = null;
let patterns = [];
let cache = new Map();
const textOrig = new WeakMap(); // Text -> { orig, shown }
const attrOrig = new WeakMap(); // Element -> { [attr]: { orig, shown } }
let observer = null;
let loadToken = 0;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Фразы с подстановками ("{n} погиб этой ночью") превращаем в шаблоны.
// Слишком общие шаблоны (короткий постоянный текст) пропускаем — они
// цепляли бы чужие фразы и ники игроков.
function buildPatterns(d) {
  const list = [];
  for (const [ru, tr] of Object.entries(d)) {
    if (!ru.includes("{n}")) continue;
    const literal = ru.replace(/\{n\}/g, "").trim();
    if (literal.length < 6) continue;
    const re = new RegExp("^" + escapeRe(ru).replace(/\\\{n\\\}/g, "(.+?)") + "$", "s");
    list.push({ re, tr, weight: literal.length });
  }
  return list.sort((a, b) => b.weight - a.weight);
}

function translateCore(s) {
  const exact = dict[s];
  if (exact) return exact;
  for (const p of patterns) {
    const m = s.match(p.re);
    if (!m) continue;
    let i = 0;
    return p.tr.replace(/\{n\}/g, () => {
      const g = (m[++i] || "").trim();
      return dict[g] || g;
    });
  }
  return null;
}

/** Перевод строки (с сохранением пробелов по краям) или null */
export function translateText(text) {
  if (lang === "ru" || !dict || !text || !CYR.test(text)) return null;
  const core = text.trim().replace(/\s+/g, " ");
  let tr = cache.get(core);
  if (tr === undefined) {
    tr = translateCore(core);
    cache.set(core, tr);
  }
  if (tr == null) return null;
  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  return lead + tr + trail;
}

function skipped(el) {
  return !!(el && el.closest && el.closest(SKIP_SELECTOR));
}

function processText(node) {
  const rec = textOrig.get(node);
  const ours = rec && node.nodeValue === rec.shown;
  const orig = ours ? rec.orig : node.nodeValue;
  if (lang === "ru" || !dict || skipped(node.parentElement)) {
    if (ours) node.nodeValue = rec.orig;
    textOrig.delete(node);
    return;
  }
  const tr = translateText(orig);
  if (tr == null) {
    textOrig.delete(node);
    return;
  }
  if (node.nodeValue !== tr) node.nodeValue = tr;
  textOrig.set(node, { orig, shown: tr });
}

function processAttrs(el) {
  if (!el.getAttribute) return;
  let recs = attrOrig.get(el);
  for (const a of ATTRS) {
    const val = el.getAttribute(a);
    if (val == null) continue;
    const rec = recs && recs[a];
    const ours = rec && val === rec.shown;
    const orig = ours ? rec.orig : val;
    if (lang === "ru" || !dict) {
      if (ours) el.setAttribute(a, rec.orig);
      if (recs) delete recs[a];
      continue;
    }
    const tr = translateText(orig);
    if (tr == null) {
      if (recs) delete recs[a];
      continue;
    }
    if (val !== tr) el.setAttribute(a, tr);
    if (!recs) attrOrig.set(el, (recs = {}));
    recs[a] = { orig, shown: tr };
  }
}

function processTree(root) {
  if (!root) return;
  if (root.nodeType === 3) return processText(root);
  if (root.nodeType !== 1) return;
  if (SKIP_TAGS.has(root.tagName) || skipped(root)) return;
  processAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.nodeType === 1 && (SKIP_TAGS.has(n.tagName) || n.getAttribute("translate") === "no")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
  });
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.nodeType === 3) processText(n);
    else processAttrs(n);
  }
}

function processAll() {
  processTree(document.body);
  const title = document.querySelector("title");
  if (title) processTree(title);
}

function ensureObserver() {
  if (observer || typeof MutationObserver === "undefined") return;
  observer = new MutationObserver((muts) => {
    if (lang === "ru") return;
    for (const m of muts) {
      if (m.type === "childList") m.addedNodes.forEach(processTree);
      else if (m.type === "characterData") processText(m.target);
      else if (m.type === "attributes") processAttrs(m.target);
    }
  });
  const opts = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS };
  observer.observe(document.body, opts);
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
}

/** Переключить язык всего сайта: "ru" | "en" | "uz" */
export async function setPageLanguage(code) {
  const token = ++loadToken;
  document.documentElement.lang = code;
  if (code === "ru" || !loaders[code]) {
    lang = "ru";
    dict = null;
    cache = new Map();
    // восстанавливаем русский текст: проходим с lang = ru
    restoreAll();
    return;
  }
  try {
    const mod = await loaders[code]();
    if (token !== loadToken) return;
    dict = mod.default || mod;
    patterns = buildPatterns(dict);
    cache = new Map();
    lang = code;
    ensureObserver();
    processAll();
  } catch (err) {
    console.warn("Не удалось загрузить перевод:", err);
  }
}

function restoreAll() {
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.nodeType === 3) {
      const rec = textOrig.get(n);
      if (rec && n.nodeValue === rec.shown) n.nodeValue = rec.orig;
      textOrig.delete(n);
    } else {
      const recs = attrOrig.get(n);
      if (!recs) continue;
      for (const [a, rec] of Object.entries(recs)) {
        if (n.getAttribute(a) === rec.shown) n.setAttribute(a, rec.orig);
      }
      attrOrig.delete(n);
    }
  }
}

export const getPageLanguage = () => lang;
