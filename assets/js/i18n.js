// 国际化引擎（轻量封装 i18next）
// - 语言包自行 fetch（locales/zh.json、locales/en.json），不依赖 http-backend
// - 首访用 navigator.language 检测，并用 localStorage 记忆用户选择
// - 切换语言：静态 [data-i18n] 原地替换；并派发 lang:change 供 site.js 重渲染动态内容
// - i18next 不可用时（如离线）优雅降级：保留页面原有中文
(function () {
  const LV = ['zh', 'en'];

  function stored() { try { return localStorage.getItem('deskbud_lang'); } catch (e) { return null; } }
  function detect() {
    const s = stored();
    if (s && LV.includes(s)) return s;
    const nav = (navigator.language || 'zh').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }
  function setLang(l) {
    try { localStorage.setItem('deskbud_lang', l); } catch (e) {}
    window.__lang = l;
    document.documentElement.lang = (l === 'zh') ? 'zh-CN' : 'en';
  }

  // 数据字段取值：支持 {zh,en} 对象或直接字符串（动态内容如作品标题用）
  window.pick = function (v, lang) {
    lang = lang || window.__lang || 'zh';
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      if (v[lang] != null) return v[lang];
      if (v.zh != null) return v.zh;
      if (v.en != null) return v.en;
    }
    return '';
  };

  // 翻译函数占位（i18next ready 前用，缺 key 时回退到 HTML 原文字）
  let _t = function (k, fb) { return fb != null ? fb : k; };
  window.I18N = { t: _t, lang: 'zh' };

  async function loadRes() {
    const [zh, en] = await Promise.all([
      fetch('locales/zh.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({})),
      fetch('locales/en.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({}))
    ]);
    return { zh: { translation: zh }, en: { translation: en } };
  }

  function applyStatic() {
    const t = window.I18N.t;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const attrSpec = el.getAttribute('data-i18n-attr');
      if (attrSpec) {
        attrSpec.split(',').forEach(pair => {
          const idx = pair.indexOf(':');
          if (idx < 0) return;
          const a = pair.slice(0, idx).trim();
          const k = pair.slice(idx + 1).trim();
          const v = t(k, k);
          if (v !== k) el.setAttribute(a, v);
        });
      } else {
        const v = t(key, key);
        if (v !== key) {
          if (el.hasAttribute('data-i18n-html') || /[<>]/.test(v)) el.innerHTML = v;
          else el.textContent = v;
        }
      }
    });
  }

  function wireSwitch() {
    const btn = document.getElementById('langSwitch');
    if (!btn) return;
    const paint = () => { btn.textContent = (window.__lang === 'zh') ? 'EN' : '中'; };
    paint();
    btn.addEventListener('click', () => {
      const next = (window.__lang === 'zh') ? 'en' : 'zh';
      if (typeof i18next !== 'undefined') {
        i18next.changeLanguage(next).then(() => {
          setLang(next);
          applyStatic();
          window.I18N.lang = next;
          window.dispatchEvent(new Event('lang:change'));
          paint();
        });
      } else {
        setLang(next);
        applyStatic();
        window.dispatchEvent(new Event('lang:change'));
        paint();
      }
    });
  }

  async function init() {
    const lang = detect();
    setLang(lang);
    if (typeof i18next === 'undefined') { applyStatic(); wireSwitch(); return; }
    try {
      const res = await loadRes();
      i18next.init({ lng: lang, fallbackLng: 'zh', debug: false, resources: res }, function () {
        window.I18N.t = i18next.t.bind(i18next);
        window.I18N.lang = i18next.language;
        window.__lang = i18next.language;
        applyStatic();
        wireSwitch();
        window.dispatchEvent(new Event('lang:ready'));
        window.dispatchEvent(new Event('lang:change'));
      });
    } catch (e) {
      applyStatic();
      wireSwitch();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
