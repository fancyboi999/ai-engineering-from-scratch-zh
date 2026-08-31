/**
 * Read-aloud support built on the browser's built-in SpeechSynthesis API.
 *
 * Injects a speaker button into the site header (before the theme toggle) on
 * any page that has readable article content, plus a
 * floating control bar for pause/stop/speed while playback runs.
 *
 * Scope is the article prose: headings, paragraphs, lists, tables, the lesson
 * motto and meta tags, quiz text and figure captions. Code blocks and rendered
 * diagrams are skipped — narrating those needs its own parsing layer and lands
 * separately.
 *
 * No network calls and no dependencies: everything is native Web Speech API.
 */
(function () {
  if (typeof window === 'undefined') return;
  window.__AIFS_TTS_VERSION = '20260818b';
  var synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') return;

  var RATE_KEY = 'tts:rate';
  var VOICE_KEY = 'tts:voice';
  var MAX_CHUNK = 160;
  var PAGE_LANG = (document.documentElement.lang || 'zh-CN').replace('_', '-');

  // Regions that are chrome, not content — nothing inside is ever read.
  var HARD_SKIP = [
    'script',
    'style',
    'svg',
    'canvas',
    'noscript',
    'nav',
    'textarea',
    'input',
    'select',
    '.katex',
    '.lesson-sidebar',
    '.toc-sidebar',
    '.site-header',
    '.site-footer',
    '.tts-bar',
    '.copy-btn',
    '[aria-hidden="true"]',
    '[data-tts-skip]',
  ].join(',');

  // Interactive elements are skipped by default (copy buttons, tabs, controls)
  // except these, which carry real content.
  var ALLOW_SELECTOR = '.quiz-option,.quiz-explanation,[data-tts-read]';

  var INTERACTIVE_SKIP = 'button,code,[role="button"]';

  var BLOCK_SELECTOR = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'li', 'blockquote', 'dd', 'dt', 'figcaption', 'summary', 'td', 'th',
    // Lesson prose and panels build their text out of plain divs.
    '.motto',
    '.lesson-meta-tag',
    '.ai-panel-title',
    '.ai-panel-subtitle',
    '.quiz-question-num',
    '.quiz-question-text',
    '.quiz-option',
    '.quiz-explanation',
    '.quiz-score-number',
    '.quiz-score-label',
    '.quiz-deeper',
    // Claude 认证路线、测评与交互实验。
    '.cert-lede',
    '.cert-track-summary',
    '.cert-notice p',
    '.cert-question-prompt',
    '.cert-question-kicker',
    '.cert-option span',
    '.cert-review-explanation p',
    '.cert-results-head',
    '.cf-head',
    '.cf-status',
    '.cf-caption',
    // Interactive lesson figures: title + caption carry the explanation.
    '.lf-label',
    '.lf-cap',
  ].join(',');

  // A block that contains one of these is a wrapper: read only its own text
  // so a list item holding a code block still reads its sentence, and the
  // code inside it stays unread.
  var NESTED_PROBE = BLOCK_SELECTOR + ',pre';

  // Storage throws instead of returning null when a browser blocks it
  // (Safari with cookies off, sandboxed iframes), so every read goes through
  // these — lsGet() runs on the collection hot path and must never throw.
  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Storage disabled; the preference just won't persist.
    }
  }

  // 只有明确的课程续播链接可以把朗读带到下一页。保存目标 route key，避免
  // 普通页面误继承音频状态。
  var RESUME_KEY = 'tts:resume';

  function routeKey(url) {
    try {
      var parsed = new URL(url, location.href);
      if (parsed.origin !== location.origin) return '';
      var pathname = parsed.pathname.replace(/\/lesson\.html$/, '/lesson');
      var entries = Array.from(parsed.searchParams.entries()).sort(function (a, b) {
        return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
      });
      var normalized = new URLSearchParams();
      entries.forEach(function (entry) { normalized.append(entry[0], entry[1]); });
      var search = normalized.toString();
      return pathname + (search ? '?' + search : '');
    } catch (e) {
      return '';
    }
  }

  function setResumeTarget(url) {
    var target = routeKey(url);
    if (!target) return clearResumeTarget();
    try {
      sessionStorage.setItem(RESUME_KEY, JSON.stringify({ target: target, createdAt: Date.now() }));
    } catch (e) {}
  }

  function clearResumeTarget() {
    try { sessionStorage.removeItem(RESUME_KEY); } catch (e) {}
  }

  function takeResumeTarget() {
    var raw = null;
    try {
      raw = sessionStorage.getItem(RESUME_KEY);
      sessionStorage.removeItem(RESUME_KEY);
    } catch (e) {
      return false;
    }
    if (!raw) return false;
    try {
      var intent = JSON.parse(raw);
      return !!(intent && intent.target === routeKey(location.href) &&
        typeof intent.createdAt === 'number' && Date.now() - intent.createdAt < 60000);
    } catch (e) {
      return false;
    }
  }

  function setResume(on) {
    if (!on) clearResumeTarget();
  }

  function wantsResume() {
    return takeResumeTarget();
  }

  var reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var reducedMotionListener = null;

  function prefersReducedMotion() {
    return !!(reducedMotion && reducedMotion.matches);
  }

  function bindReducedMotionPreference() {
    if (!reducedMotion || reducedMotionListener) return;
    reducedMotionListener = function (event) {
      if (event.matches) commitDragInertiaForReducedMotion();
    };
    if (typeof reducedMotion.addEventListener === 'function') {
      reducedMotion.addEventListener('change', reducedMotionListener);
    } else if (typeof reducedMotion.addListener === 'function') {
      reducedMotion.addListener(reducedMotionListener);
    }
  }

  function disposeReducedMotionPreference() {
    if (!reducedMotion || !reducedMotionListener) return;
    if (typeof reducedMotion.removeEventListener === 'function') {
      reducedMotion.removeEventListener('change', reducedMotionListener);
    } else if (typeof reducedMotion.removeListener === 'function') {
      reducedMotion.removeListener(reducedMotionListener);
    }
    reducedMotionListener = null;
  }

  var state = {
    chunks: [],
    index: 0,
    playing: false,
    paused: false,
    // True between a lesson navigation and its content being ready to read.
    waiting: false,
    // Bar shown as a single puck, and the drag-vs-click guard.
    collapsed: false,
    dragged: false,
    highlighted: null,
    utterance: null,
    utteranceGeneration: 0,
    // Speech started after a navigation can be rejected until the next user
    // activation. Keep the queue and resume flag intact while waiting for it.
    awaitingGesture: false,
    // 强引用防止 Chromium 回收正在播放的 utterance；其余字段用于检测语音引擎静默掉音。
    spoken: [],
    stalls: 0,
    idleTicks: 0,
    forcedLocal: null,
    watchdog: null,
  };

  var els = {};
  var gestureRetry = null;
  var gestureControlTarget = null;

  /* ---------------------------------------------------------------- text */

  function contentRoot() {
    var candidates = [
      '.lesson-article',
      '#lessonContent',
      'main#main',
      'main',
      '.container',
    ];
    for (var i = 0; i < candidates.length; i++) {
      var el = document.querySelector(candidates[i]);
      if (el && el.textContent.trim().length > 40) return el;
    }
    return null;
  }

  function isSkipped(el) {
    if (!el.closest) return true;
    if (el.closest(HARD_SKIP)) return true;
    if (el.closest(ALLOW_SELECTOR)) return false;
    // Code blocks and rendered diagrams are not narrated by this reader.
    if (el.closest('pre')) return true;
    return !!el.closest(INTERACTIVE_SKIP);
  }

  function isVisible(el) {
    if (el.hidden) return false;
    // offsetParent is null for display:none (and for position:fixed, which
    // none of the readable blocks use).
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  function clean(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[`*_#~|]+/g, ' ')
      .replace(/\s+([,.;:!?，。；：！？])/g, '$1')
      .trim();
  }

  /** Split a long block into speakable pieces at sentence boundaries. */
  function split(text) {
    if (text.length <= MAX_CHUNK) return [text];
    var sentences = text.match(/[^.!?。！？]+[.!?。！？]*\s*/g) || [text];
    var out = [];
    var buf = '';
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i];
      while (s.length > MAX_CHUNK) {
        // A single monster sentence: break it on the last space in range.
        var cut = s.lastIndexOf(' ', MAX_CHUNK);
        if (cut <= 0) cut = MAX_CHUNK;
        if (buf) {
          out.push(buf.trim());
          buf = '';
        }
        out.push(s.slice(0, cut).trim());
        s = s.slice(cut);
      }
      if ((buf + s).length > MAX_CHUNK) {
        out.push(buf.trim());
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out.filter(Boolean);
  }

  /** Text belonging to this element but not to any nested readable block. */
  function ownText(el) {
    var out = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) {
        out += n.nodeValue;
      } else if (n.nodeType === 1 && !n.matches(BLOCK_SELECTOR) && !isSkipped(n)) {
        // Descend into plain wrappers so nested blocks stay un-duplicated.
        out += n.querySelector(BLOCK_SELECTOR) ? ownText(n) : n.textContent || '';
      }
    }
    return out;
  }

  /** Build the play queue: [{ text, el }] in document order. */
  function collect() {
    var root = contentRoot();
    if (!root) return [];
    var blocks = root.querySelectorAll(BLOCK_SELECTOR);
    var chunks = [];
    var seen = 0;
    for (var i = 0; i < blocks.length; i++) {
      var el = blocks[i];
      if (isSkipped(el) || !isVisible(el)) continue;
      var text;
      if (el.querySelector(NESTED_PROBE)) {
        // A wrapper (list item holding a code block, panel holding headings).
        // Read only its own text; the nested blocks come round on their own.
        text = clean(ownText(el));
      } else {
        text = clean(el.textContent || '');
        if (el.matches('.quiz-option')) {
          // Markup is <span>A</span><span>answer</span> with no whitespace
          // between them, so read the letter as its own beat.
          var letter = el.querySelector('.opt-letter');
          var label = letter ? clean(letter.textContent || '') : '';
          var rest = label ? clean(text.slice(label.length)) : text;
          text = '选项 ' + (label ? label + '。' : '') + rest;
        } else if (el.matches('.quiz-explanation')) {
          text = '解析。' + text;
        } else if (el.matches('.lf-label')) {
          text = '交互图：' + text + '。';
        }
      }
      if (text.length < 2) continue;
      var parts = split(text);
      for (var j = 0; j < parts.length; j++) {
        chunks.push({ text: parts[j], el: el });
      }
      seen++;
      if (seen > 4000) break;
    }
    return chunks;
  }

  /* --------------------------------------------------------------- voices */

  /**
   * Voice quality varies wildly per platform, and the browser default is often
   * the worst option available (Windows ships robotic SAPI5 voices as default).
   * Score every voice so "Auto" lands on the best neural/cloud voice present.
   */

  // 常见中文高质量语音，按名称宽松匹配；质量标识和页面语言仍然优先。
  var PREFERRED = [
    'microsoft xiaoxiao', 'microsoft yunyang', 'microsoft xiaoyi',
    'microsoft yunjian', 'microsoft xiaomo', 'google 普通话',
    'google mandarin', 'tingting', 'meijia', 'sin-ji',
  ];

  // macOS novelty voices — comedic, unusable for prose.
  var NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|bruce|princess|grandma|grandpa|rocko|shelley|sandy|eddy|flo|reed|grandpa|bells)\b/i;

  function score(v) {
    var name = (v.name || '').toLowerCase();
    var lang = (v.lang || '').toLowerCase();
    var s = 0;

    if (NOVELTY.test(v.name || '')) return -100;

    // Explicit quality markers in the voice name.
    if (/natural|neural/.test(name)) s += 60;
    if (/premium|enhanced/.test(name)) s += 50;
    if (/\bonline\b/.test(name)) s += 40;
    if (/^google/.test(name)) s += 35;
    // SAPI5 desktop voices are the robotic legacy set.
    if (/desktop/.test(name)) s -= 30;
    if (v.localService === false) s += 15;

    for (var i = 0; i < PREFERRED.length; i++) {
      if (name.indexOf(PREFERRED[i]) !== -1) {
        s += 100 - i; // earlier in the list wins ties
        break;
      }
    }

    // 中文页面优先同语言的语音；设备没有中文语音时再退回质量最高的可用项。
    var pagePrimary = PAGE_LANG.toLowerCase().split('-')[0];
    if (lang === PAGE_LANG.toLowerCase()) s += 600;
    else if (pagePrimary === 'zh' && /^(zh|cmn)([-_]|$)/.test(lang)) {
      s += /^(zh|cmn)[-_]cn/.test(lang) ? 560 : 500;
    } else if (lang.split(/[-_]/)[0] === pagePrimary) {
      s += 300;
    }
    if (v.default) s += 2;

    return s;
  }

  function voices() {
    var all = (synth.getVoices() || []).slice();
    var ranked = all.map(function (v, i) {
      return { v: v, s: score(v), i: i };
    });
    ranked.sort(function (a, b) {
      return b.s - a.s || a.i - b.i;
    });
    return ranked
      .filter(function (r) {
        return r.s > -100;
      })
      .map(function (r) {
        return r.v;
      });
  }

  function bestVoice() {
    var list = voices();
    return list.length ? list[0] : null;
  }

  function selectedVoice() {
    if (state.forcedLocal) return state.forcedLocal;
    var wanted = lsGet(VOICE_KEY);
    var all = synth.getVoices() || [];
    if (wanted) {
      for (var i = 0; i < all.length; i++) {
        if (all[i].voiceURI === wanted) return all[i];
      }
    }
    // No stored pick (or it vanished with an OS update): auto-pick the best.
    return bestVoice();
  }

  function fillVoices() {
    if (!els.voice) return;
    var list = voices();
    if (!list.length) return;
    var current = lsGet(VOICE_KEY) || '';
    var best = list[0];
    els.voice.innerHTML = '';
    var def = document.createElement('option');
    def.value = '';
    def.textContent = '自动 — ' + best.name;
    els.voice.appendChild(def);
    for (var i = 0; i < list.length; i++) {
      var o = document.createElement('option');
      o.value = list[i].voiceURI;
      o.textContent =
        (score(list[i]) >= 240 ? '★ ' : '') + list[i].name + ' (' + list[i].lang + ')';
      els.voice.appendChild(o);
    }
    els.voice.value = current;
    // A stored voice that no longer exists falls back to Auto.
    if (els.voice.value !== current) els.voice.value = '';
  }

  function rate() {
    var stored = parseFloat(lsGet(RATE_KEY));
    return stored >= 0.5 && stored <= 3 ? stored : 1;
  }

  /* ------------------------------------------------------------- playback */

  function highlight(el) {
    if (state.highlighted === el) return;
    if (state.highlighted) state.highlighted.classList.remove('tts-reading');
    state.highlighted = el || null;
    if (!el) return;
    el.classList.add('tts-reading');
    var box = el.getBoundingClientRect();
    if (box.top < 80 || box.bottom > window.innerHeight - 80) {
      // Auto-scrolling at every chunk boundary is the most motion-heavy part
      // of the feature, so honour the same preference the CSS does.
      el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  /**
   * The lesson page keeps building itself after the first paint (panels,
   * diagrams, figures). If the block we are on has been swapped out, rebuild
   * the queue against the live DOM and keep our place by text.
   */
  function resync() {
    var current = state.chunks[state.index];
    var fresh = collect();
    if (!fresh.length) return false;
    var at = -1;
    for (var i = 0; i < fresh.length; i++) {
      if (current && fresh[i].text === current.text) {
        at = i;
        break;
      }
    }
    state.chunks = fresh;
    state.index = at >= 0 ? at : Math.min(state.index, fresh.length - 1);
    return true;
  }

  function invalidateUtterance() {
    state.utterance = null;
    state.utteranceGeneration++;
  }

  function cancelUtterance() {
    // SpeechSynthesis can dispatch a canceled utterance's callbacks after a
    // replacement has started. Invalidate before calling cancel(), not after.
    invalidateUtterance();
    synth.cancel();
  }

  function isCurrentUtterance(utterance, generation) {
    return state.utterance === utterance && state.utteranceGeneration === generation;
  }

  function requiresUserGesture(error) {
    var code = error && (error.error || error.name || error.message || '');
    return /^(not-allowed|notallowederror)$/i.test(String(code));
  }

  function disarmGestureFallback(keepControlTarget) {
    if (gestureRetry) {
      document.removeEventListener('pointerdown', gestureRetry, true);
      document.removeEventListener('keydown', gestureRetry, true);
    }
    gestureRetry = null;
    if (!keepControlTarget) gestureControlTarget = null;
  }

  function armGestureFallback() {
    if (gestureRetry) return;
    var retry = function (event) {
      if (gestureRetry !== retry) return;
      // Keep a control click from immediately toggling the playback we just
      // resumed during its pointerdown capture phase.
      if (event && event.target && event.target.closest && event.target.closest('.tts-toggle,.tts-bar')) {
        gestureControlTarget = event.target;
      }
      disarmGestureFallback(true);
      if (!state.playing || state.paused || !state.awaitingGesture) return;
      state.awaitingGesture = false;
      setResume(true);
      startWatchdog();
      render();
      speakCurrent();
    };
    gestureRetry = retry;
    document.addEventListener('pointerdown', retry, true);
    document.addEventListener('keydown', retry, true);
  }

  function ignoreGestureControlClick(event) {
    if (!gestureControlTarget || !event || !event.target) return false;
    var target = gestureControlTarget;
    gestureControlTarget = null;
    return target === event.target ||
      (target.contains && target.contains(event.target)) ||
      (event.target.contains && event.target.contains(target));
  }

  function waitForUserGesture() {
    if (!state.playing || state.paused) return;
    state.awaitingGesture = true;
    stopWatchdog();
    armGestureFallback();
    render();
  }

  function speakCurrent() {
    if (state.index >= state.chunks.length) {
      stop();
      return;
    }
    var stale = state.chunks[state.index].el;
    if (stale && !document.contains(stale)) resync();
    var chunk = state.chunks[state.index];
    var u = new SpeechSynthesisUtterance(chunk.text);
    u.rate = rate();
    var v = selectedVoice();
    u.lang = v && v.lang ? v.lang : PAGE_LANG;
    if (v) u.voice = v;
    var generation = state.utteranceGeneration + 1;
    state.utteranceGeneration = generation;
    u.onend = function () {
      if (!isCurrentUtterance(u, generation) || !state.playing || state.paused) return;
      state.utterance = null;
      state.index++;
      state.stalls = 0;
      render();
      deferSpeak();
    };
    u.onerror = function (e) {
      if (!isCurrentUtterance(u, generation)) return;
      // "interrupted"/"canceled" are the normal result of stop()/next().
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
      if (!state.playing || state.paused) return;
      state.utterance = null;
      if (requiresUserGesture(e)) {
        waitForUserGesture();
        return;
      }
      state.index++;
      state.stalls = 0;
      if (state.index < state.chunks.length) deferSpeak();
      else stop();
    };
    state.utterance = u;
    state.spoken.push(u);
    if (state.spoken.length > 8) state.spoken.shift();
    highlight(chunk.el);
    try {
      synth.speak(u);
    } catch (e) {
      u.onerror(e);
    }
  }

  /* ------------------------------------------------------- read from here */

  /**
   * The readable block an arbitrary node sits in. When the node is inside
   * something unreadable (a code block), the node itself is returned so the
   * caller can start from whatever comes after it.
   */
  function blockOf(node) {
    var el = node && node.nodeType === 3 ? node.parentNode : node;
    var first = el;
    var root = contentRoot();
    while (el && el.nodeType === 1) {
      if (el.matches(BLOCK_SELECTOR) && !isSkipped(el)) return el;
      if (root && el === root) break;
      el = el.parentNode;
    }
    return first && first.nodeType === 1 ? first : null;
  }

  /** Queue position for a block: itself, or the next one that follows it. */
  function indexOfBlock(el) {
    if (!el) return 0;
    for (var i = 0; i < state.chunks.length; i++) {
      var c = state.chunks[i].el;
      if (c === el || (c && (c.contains(el) || el.contains(c)))) return i;
    }
    // Not queued (skipped block): fall through to the next one in the document.
    for (var j = 0; j < state.chunks.length; j++) {
      var pos = el.compareDocumentPosition(state.chunks[j].el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return j;
    }
    return 0;
  }

  /** The block the current text selection starts in, if any. */
  function selectedBlock() {
    var sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    if (!clean(sel.toString())) return null;
    var root = contentRoot();
    var node = sel.getRangeAt(0).startContainer;
    if (root && !root.contains(node.nodeType === 3 ? node.parentNode : node)) return null;
    return blockOf(node);
  }

  function readFromSelection() {
    var block = selectedBlock();
    if (!block) return false;
    hideSelectionButton();
    var sel = window.getSelection && window.getSelection();
    if (sel && sel.removeAllRanges) sel.removeAllRanges();
    startWatchdog();
    return start(false, block);
  }

  function start(silentIfEmpty, fromEl) {
    state.chunks = collect();
    if (!state.chunks.length) {
      if (!silentIfEmpty) flash('当前页面没有可朗读的内容');
      return false;
    }
    disarmGestureFallback();
    state.awaitingGesture = false;
    cancelUtterance();
    state.index = fromEl ? indexOfBlock(fromEl) : 0;
    state.playing = true;
    state.paused = false;
    state.waiting = false;
    state.stalls = 0;
    setResume(true);
    startWatchdog();
    render();
    speakCurrent();
    return true;
  }

  function pause() {
    if (!state.playing || state.paused) return;
    state.paused = true;
    state.awaitingGesture = false;
    disarmGestureFallback();
    setResume(false);
    synth.pause();
    render();
  }

  function resume() {
    if (!state.playing || !state.paused) return;
    state.paused = false;
    setResume(true);
    if (!state.utterance) {
      startWatchdog();
      speakCurrent();
    } else {
      synth.resume();
    }
    render();
  }

  function stop() {
    state.playing = false;
    state.paused = false;
    state.awaitingGesture = false;
    disarmGestureFallback();
    state.chunks = [];
    state.index = 0;
    state.waiting = false;
    setResume(false);
    stopWatchdog();
    cancelUtterance();
    highlight(null);
    hideSelectionButton();
    render();
  }

  /**
   * Carry playback across a lesson navigation. Lesson bodies are fetched after
   * load, so poll until there is something to read before starting.
   */
  function autoResume() {
    if (!wantsResume()) return;
    state.waiting = true;
    render();

    var tries = 0;
    var lastSize = -1;
    var timer = setInterval(function () {
      if (!state.waiting) {
        clearInterval(timer);
        return;
      }
      tries++;
      // Wait for the article to stop growing, otherwise we would queue up
      // paragraphs that the page is about to replace — and the highlight
      // would land on detached nodes.
      var root = contentRoot();
      var size = root ? root.textContent.trim().length : 0;
      if (!size || size !== lastSize) {
        lastSize = size;
        if (tries <= 60) return;
      }
      if (start(true)) {
        state.waiting = false;
        clearInterval(timer);
        return;
      }
      if (tries > 60) {
        // ~15s: the page has nothing to read, so drop the hand-off.
        state.waiting = false;
        setResume(false);
        clearInterval(timer);
        render();
      }
    }, 250);
  }

  function isLessonContinuationLink(link) {
    if (!link || !link.matches('.lesson-nav-btn,.continue-link')) return false;
    try {
      var url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return false;
      if (/^\/lessons\/[^/]+\/[^/]+\/?$/.test(url.pathname)) return true;
      return /\/lesson(?:\.html)?$/.test(url.pathname) && !!url.searchParams.get('path');
    } catch (e) {
      return false;
    }
  }

  function bindNavigationResume() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a[href]');
      if (!link) return;
      state.navigationTarget = '';
      clearResumeTarget();
      if (!isPlaying() || !isLessonContinuationLink(link)) return;
      if (silentMode) {
        var silentUrl = new URL(link.href, location.href);
        silentUrl.searchParams.set('ttsTest', 'silent');
        link.href = silentUrl.toString();
      }
      state.navigationTarget = routeKey(link.href);
      setResumeTarget(link.href);
    }, true);
  }

  function jump(delta) {
    if (!state.playing) return;
    var next = state.index + delta;
    if (next < 0) next = 0;
    if (next >= state.chunks.length) {
      stop();
      return;
    }
    state.awaitingGesture = false;
    disarmGestureFallback();
    cancelUtterance();
    state.index = next;
    state.paused = false;
    render();
    speakCurrent();
  }

  // 在新任务中接续下一段，避免在 onend 回调里同步 speak 导致部分 Chromium 卡住。
  function deferSpeak() {
    var expectedGeneration = state.utteranceGeneration;
    setTimeout(function () {
      if (!state.playing || state.paused || state.awaitingGesture) return;
      if (state.utteranceGeneration !== expectedGeneration) return;
      speakCurrent();
    }, 0);
  }

  // 网络语音可能不触发 onend/onerror 就静默停播。连续两次观测到引擎既不 speaking 也不 pending 才判定掉音。
  function startWatchdog() {
    stopWatchdog();
    state.idleTicks = 0;
    state.watchdog = setInterval(function () {
      if (!state.playing || state.paused || state.waiting || state.awaitingGesture) return;
      if (synth.speaking || synth.pending) {
        state.idleTicks = 0;
        return;
      }
      if (++state.idleTicks < 2) return;
      state.idleTicks = 0;
      recoverFromStall();
    }, 400);
  }

  function stopWatchdog() {
    if (state.watchdog) clearInterval(state.watchdog);
    state.watchdog = null;
  }

  function localVoice() {
    var all = voices();
    for (var i = 0; i < all.length; i++) {
      if (all[i].localService) return all[i];
    }
    return null;
  }

  function recoverFromStall() {
    state.stalls++;
    if (state.stalls >= 4) {
      flash('语音引擎已停止响应');
      stop();
      return;
    }

    var local = state.stalls >= 2 && !state.forcedLocal ? localVoice() : null;
    if (local) {
      state.forcedLocal = local;
      flash('已切换到 ' + local.name + '：之前的语音不断掉音');
    } else if (state.stalls >= 3) {
      state.index++;
      if (state.index >= state.chunks.length) {
        stop();
        return;
      }
      render();
    }
    cancelUtterance();
    deferSpeak();
  }

  /* ------------------------------------------------------------------ ui */

  function flash(msg) {
    if (!els.bar) return;
    els.bar.hidden = false;
    els.bar.classList.add('is-visible');
    els.status.textContent = msg;
    setTimeout(function () {
      if (!state.playing) {
        els.bar.classList.remove('is-visible');
        els.bar.hidden = true;
      }
    }, 2200);
  }

  function updateBarReserve(active) {
    if (!document.body) return;
    document.body.classList.toggle('tts-active', active);
    var rootStyle = document.documentElement && document.documentElement.style;
    if (!rootStyle) return;
    if (!active) {
      rootStyle.removeProperty('--tts-bar-height');
      return;
    }
    requestFrame(function () {
      if (els.bar && !els.bar.hidden) {
        rootStyle.setProperty(
          '--tts-bar-height',
          Math.ceil(els.bar.getBoundingClientRect().height) + 'px'
        );
      }
    });
  }

  function render() {
    var active = state.playing || state.waiting;
    if (els.toggle) {
      els.toggle.classList.toggle('is-active', active && !state.paused);
      els.toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
      els.toggle.setAttribute(
        'aria-label',
        active ? (state.paused ? '继续朗读' : '停止朗读') : '朗读当前页面'
      );
      els.toggle.title = els.toggle.getAttribute('aria-label');
    }
    if (!els.bar) return;
    updateBarReserve(active);
    var wasHidden = els.bar.hidden;
    els.bar.hidden = !active;
    els.bar.classList.toggle('is-visible', active);
    if (active && wasHidden && els.bar.classList.contains('is-placed')) schedulePlacementBoundsRefresh();
    // Collapsed, the puck's speaker icon is the only playback feedback left.
    els.bar.classList.toggle('is-reading', active && !state.paused && !state.awaitingGesture);
    if (!active) return;
    els.playPause.textContent = state.paused || state.awaitingGesture ? '▶' : '⏸';
    els.playPause.setAttribute('aria-label', state.paused || state.awaitingGesture ? '继续朗读' : '暂停朗读');
    if (state.waiting) {
      els.status.textContent = '正在加载页面…';
      return;
    }
    if (state.awaitingGesture) {
      els.status.textContent = '请点击页面继续朗读';
      return;
    }
    els.status.textContent =
      (state.paused ? '已暂停' : '朗读中') +
      ' · ' +
      Math.min(state.index + 1, state.chunks.length) +
      '/' +
      state.chunks.length;
  }

  function icon() {
    return (
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polygon points="4 9 8 9 13 5 13 19 8 15 4 15"></polygon>' +
      '<path class="tts-wave-1" d="M16.5 8.5a5 5 0 0 1 0 7"></path>' +
      '<path class="tts-wave-2" d="M19.5 5.5a9 9 0 0 1 0 13"></path>' +
      '</svg>'
    );
  }

  function buildButton() {
    var themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle || !themeToggle.parentNode) return null;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle tts-toggle';
    btn.id = 'ttsToggle';
    btn.innerHTML = icon();
    btn.setAttribute('aria-label', '朗读当前页面');
    btn.title = '朗读当前页面';
    btn.setAttribute('aria-pressed', 'false');
    themeToggle.parentNode.insertBefore(btn, themeToggle);
    btn.addEventListener('click', function (e) {
      if (ignoreGestureControlClick(e)) return;
      // The speaker is the on/off switch — pause lives in the control bar.
      if (state.playing || state.waiting) stop();
      else if (!readFromSelection()) start();
    });
    return btn;
  }

  /* ------------------------------------------------- collapse and dragging */

  var COLLAPSED_KEY = 'tts:collapsed';
  var POS_KEY = 'tts:pos';
  var DRAG_SLOP = 4;
  var dragInertiaFrame = 0;
  var placementBoundsFrame = 0;
  var placementTransitionFrame = 0;
  var placementBounds = null;
  var placedPosition = null;
  var playerResizeObserver = null;
  var requestFrame = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : function (callback) { return setTimeout(callback, 16); };
  var cancelFrame = typeof window.cancelAnimationFrame === 'function'
    ? window.cancelAnimationFrame.bind(window)
    : function (id) { clearTimeout(id); };

  function stopDragInertia() {
    if (dragInertiaFrame) cancelFrame(dragInertiaFrame);
    dragInertiaFrame = 0;
    if (els.bar) {
      els.bar.classList.remove('is-gliding');
      els.bar.style.removeProperty('transition');
    }
  }

  function commitDragInertiaForReducedMotion() {
    if (!els.bar || (!dragInertiaFrame && !els.bar.classList.contains('is-gliding'))) return;
    stopDragInertia();
    if (!els.bar.classList.contains('is-placed') || !placedPosition) return;
    els.bar.style.transition = 'none';
    place(placedPosition.x, placedPosition.y, true, placementBounds || refreshPlacementBounds());
    restorePlacementTransition();
  }

  /** Collapsed, the bar is just the speaker puck — click it to expand. */
  function setCollapsed(on, quiet) {
    state.collapsed = !!on;
    if (!quiet) lsSet(COLLAPSED_KEY, on ? '1' : '0');
    if (!els.bar) return;
    els.bar.classList.toggle('is-collapsed', state.collapsed);
    if (els.collapse) {
      els.collapse.innerHTML = state.collapsed ? icon() : '▾';
      els.collapse.setAttribute('aria-expanded', state.collapsed ? 'false' : 'true');
      var label = state.collapsed ? '展开朗读控制' : '收起朗读控制';
      els.collapse.setAttribute('aria-label', label);
      els.collapse.title = label + '（可拖动）';
    }
    schedulePlacementBoundsRefresh();
  }

  function savedPosition() {
    try {
      var raw = lsGet(POS_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (typeof p.x !== 'number' || typeof p.y !== 'number') return null;
      return p;
    } catch (e) {
      return null;
    }
  }

  /** Pin the bar at viewport coordinates, replacing the default anchoring. */
  function enterPlacedMode() {
    if (!els.bar || els.bar.classList.contains('is-placed')) return;
    els.bar.classList.add('is-placed');
    els.bar.style.left = '0px';
    els.bar.style.top = '0px';
  }

  function place(x, y, persist, limits) {
    if (!els.bar) return;
    limits = limits || placementBounds || refreshPlacementBounds();
    var cx = Math.min(Math.max(limits.minX, x), limits.maxX);
    var cy = Math.min(Math.max(limits.minY, y), limits.maxY);
    placedPosition = { x: cx, y: cy };
    enterPlacedMode();
    els.bar.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
    if (els.resetPosition) els.resetPosition.hidden = false;
    if (persist) lsSet(POS_KEY, JSON.stringify({ x: cx, y: cy }));
    return placedPosition;
  }

  function resetPosition() {
    stopDragInertia();
    lsSet(POS_KEY, '');
    placedPosition = null;
    if (!els.bar) return;
    els.bar.classList.remove('is-placed', 'is-gliding');
    els.bar.style.removeProperty('left');
    els.bar.style.removeProperty('top');
    els.bar.style.removeProperty('transform');
    els.bar.style.removeProperty('transition');
    if (els.resetPosition) els.resetPosition.hidden = true;
    updateBarReserve(isActive());
  }

  function refreshPlacementBounds(rect) {
    var measured = rect || (els.bar ? els.bar.getBoundingClientRect() : null);
    var width = measured && measured.width ? measured.width : placementBounds ? placementBounds.width : 0;
    var height = measured && measured.height ? measured.height : placementBounds ? placementBounds.height : 0;
    placementBounds = {
      minX: 8,
      minY: 8,
      maxX: Math.max(8, document.documentElement.clientWidth - width - 8),
      maxY: Math.max(8, window.innerHeight - height - 8),
      width: width,
      height: height,
    };
    return placementBounds;
  }

  function schedulePlacementBoundsRefresh() {
    if (placementBoundsFrame) return;
    placementBoundsFrame = requestFrame(function () {
      placementBoundsFrame = 0;
      if (!els.bar) return;
      if (els.bar.classList.contains('is-placed')) clampToViewport();
      else refreshPlacementBounds();
    });
  }

  function restorePlacementTransition() {
    if (placementTransitionFrame) cancelFrame(placementTransitionFrame);
    placementTransitionFrame = requestFrame(function () {
      placementTransitionFrame = 0;
      if (!els.bar || els.bar.classList.contains('is-dragging') || els.bar.classList.contains('is-gliding')) return;
      els.bar.style.removeProperty('transition');
    });
  }

  function resistEdge(value, min, max) {
    if (value < min) {
      var before = min - value;
      return min - (before * 0.3) / (1 + before / 96);
    }
    if (value > max) {
      var after = value - max;
      return max + (after * 0.3) / (1 + after / 96);
    }
    return value;
  }

  function placeDuringDrag(x, y, limits) {
    if (!els.bar) return;
    var resistedX = resistEdge(x, limits.minX, limits.maxX);
    var resistedY = resistEdge(y, limits.minY, limits.maxY);
    enterPlacedMode();
    els.bar.style.transform = 'translate3d(' + resistedX + 'px,' + resistedY + 'px,0)';
    placedPosition = { x: resistedX, y: resistedY };
    return placedPosition;
  }

  function clampToViewport() {
    if (!els.bar || !els.bar.classList.contains('is-placed')) return;
    stopDragInertia();
    var rect = els.bar.getBoundingClientRect();
    var limits = refreshPlacementBounds(rect);
    var current = placedPosition || { x: rect.left, y: rect.top };
    place(current.x, current.y, false, limits);
  }

  /**
   * Drag the bar anywhere over the article. Buttons and selects keep their own
   * behaviour unless the pointer actually moves, so a collapsed puck can be
   * both clicked and dragged.
   */
  function bindDrag(bar) {
    var active = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var originX = 0;
    var originY = 0;
    var lastX = 0;
    var lastY = 0;
    var lastTime = 0;
    var velocityX = 0;
    var velocityY = 0;
    var currentX = 0;
    var currentY = 0;
    var dragLimits = null;

    function beginInertia(initialVelocityX, initialVelocityY, initialX, initialY, limits) {
      if (prefersReducedMotion()) {
        bar.style.transition = 'none';
        place(initialX, initialY, true, limits);
        restorePlacementTransition();
        return;
      }

      var x = initialX;
      var y = initialY;
      var vx = initialVelocityX;
      var vy = initialVelocityY;
      var previous = performance.now();
      bar.classList.add('is-gliding');
      bar.style.transition = 'none';

      function settle() {
        dragInertiaFrame = 0;
        bar.classList.remove('is-gliding');
        place(x, y, true, limits);
        restorePlacementTransition();
      }

      function glide(now) {
        var elapsed = Math.min(32, Math.max(1, now - previous));
        previous = now;

        x += vx * elapsed;
        y += vy * elapsed;

        if (x < limits.minX || x > limits.maxX) {
          x = Math.min(Math.max(limits.minX, x), limits.maxX);
          vx *= -0.24;
        }
        if (y < limits.minY || y > limits.maxY) {
          y = Math.min(Math.max(limits.minY, y), limits.maxY);
          vy *= -0.24;
        }

        var damping = Math.pow(0.9, elapsed / (1000 / 60));
        vx *= damping;
        vy *= damping;
        place(x, y, false, limits);

        if (Math.abs(vx) + Math.abs(vy) < 0.018) {
          settle();
          return;
        }
        dragInertiaFrame = requestFrame(glide);
      }

      dragInertiaFrame = requestFrame(glide);
    }

    bar.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      // Leave real controls alone while the bar is open; the puck is all
      // button, so it has to be draggable too.
      if (!state.collapsed && e.target.closest('select,input,option')) return;
      var rect = bar.getBoundingClientRect();
      dragLimits = refreshPlacementBounds(rect);
      active = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      originX = rect.left;
      originY = rect.top;
      currentX = originX;
      currentY = originY;
      placedPosition = { x: originX, y: originY };
      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = e.timeStamp || performance.now();
      velocityX = 0;
      velocityY = 0;
    });

    bar.addEventListener('pointermove', function (e) {
      if (!active) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!moved && Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return;
      if (!moved) {
        moved = true;
        bar.classList.add('is-dragging');
        if (bar.setPointerCapture) bar.setPointerCapture(e.pointerId);
      }
      e.preventDefault();
      place(originX + dx, originY + dy, false);
    });

    var end = function (e) {
      if (!active) return;
      active = false;
      if (!moved) return;
      bar.classList.remove('is-dragging');
      if (bar.releasePointerCapture && e.pointerId != null) {
        try {
          bar.releasePointerCapture(e.pointerId);
        } catch (err) {
          // Capture may already be gone.
        }
      }
      var rect = bar.getBoundingClientRect();
      place(rect.left, rect.top, true);
      // Swallow the click a completed drag is about to produce. A cancelled
      // gesture emits no click, so arming the guard there would eat the next
      // real one instead.
      state.dragged = e.type === 'pointerup';
    };

    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
    window.addEventListener('resize', schedulePlacementBoundsRefresh);
    window.addEventListener('orientationchange', schedulePlacementBoundsRefresh);
    if (typeof ResizeObserver === 'function') {
      playerResizeObserver = new ResizeObserver(schedulePlacementBoundsRefresh);
      playerResizeObserver.observe(bar);
    }
  }

  function buildBar() {
    var bar = document.createElement('div');
    bar.className = 'tts-bar';
    bar.id = 'ttsBar';
    bar.hidden = true;
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', '朗读控制');
    bar.innerHTML =
      '<button type="button" class="tts-btn" data-tts="prev" aria-label="上一段">⏪</button>' +
      '<button type="button" class="tts-btn tts-btn-main" data-tts="playpause" aria-label="暂停朗读">⏸</button>' +
      '<button type="button" class="tts-btn" data-tts="next" aria-label="下一段">⏩</button>' +
      '<span class="tts-status" id="ttsStatus" aria-live="polite">朗读中</span>' +
      '<label class="tts-field"><span>速度</span>' +
      '<select class="tts-select" id="ttsRate" aria-label="朗读速度">' +
      '<option value="0.75">0.75 倍</option><option value="1">1 倍</option>' +
      '<option value="1.25">1.25 倍</option><option value="1.5">1.5 倍</option>' +
      '<option value="1.75">1.75 倍</option><option value="2">2 倍</option></select></label>' +
      '<label class="tts-field tts-field-voice"><span>语音</span>' +
      '<select class="tts-select" id="ttsVoice" aria-label="选择语音"></select></label>' +
      '<button type="button" class="tts-btn tts-btn-stop" data-tts="stop" aria-label="停止朗读">停止</button>' +
      '<button type="button" class="tts-btn tts-btn-collapse" data-tts="collapse" ' +
      'aria-label="收起朗读控制" aria-expanded="true" title="收起朗读控制（可拖动）">▾</button>';
    document.body.appendChild(bar);

    els.bar = bar;
    els.status = bar.querySelector('#ttsStatus');
    els.playPause = bar.querySelector('[data-tts="playpause"]');
    els.rate = bar.querySelector('#ttsRate');
    els.voice = bar.querySelector('#ttsVoice');

    els.collapse = bar.querySelector('[data-tts="collapse"]');

    bar.addEventListener('click', function (e) {
      if (ignoreGestureControlClick(e)) return;
      // A click that ended a drag should not also press the button under it.
      if (state.dragged) {
        state.dragged = false;
        return;
      }
      var target = e.target.closest('[data-tts]');
      if (!target) return;
      var action = target.getAttribute('data-tts');
      if (action === 'collapse') setCollapsed(!state.collapsed);
      else if (action === 'playpause') state.paused ? resume() : pause();
      else if (action === 'stop') stop();
      else if (action === 'next') jump(1);
      else if (action === 'prev') jump(-1);
    });

    els.rate.value = String(rate());
    els.rate.addEventListener('change', function () {
      lsSet(RATE_KEY, els.rate.value);
      if (state.playing) {
        // Rate only applies to a new utterance, so restart the current chunk.
        state.paused = false;
        state.awaitingGesture = false;
        disarmGestureFallback();
        cancelUtterance();
        speakCurrent();
      }
    });

    els.voice.addEventListener('change', function () {
      lsSet(VOICE_KEY, els.voice.value);
      // 用户手动选择时，覆盖掉音后的自动本地语音回退。
      state.forcedLocal = null;
      if (state.playing) {
        state.paused = false;
        state.awaitingGesture = false;
        disarmGestureFallback();
        cancelUtterance();
        speakCurrent();
      }
    });

    bindDrag(bar);
    setCollapsed(lsGet(COLLAPSED_KEY) === '1', true);
    var pos = savedPosition();
    if (pos) place(pos.x, pos.y, false);

    fillVoices();
    if (typeof synth.onvoiceschanged !== 'undefined') {
      synth.addEventListener('voiceschanged', fillVoices);
    }
    return bar;
  }

  /**
   * A "Read from here" chip that follows a text selection inside the article.
   */
  function buildSelectionButton() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tts-from-here';
    btn.id = 'ttsFromHere';
    btn.hidden = true;
    btn.innerHTML = '<span aria-hidden="true">▶</span> 从这里开始朗读';
    btn.title = '从这里开始朗读（Alt+R）';
    // mousedown would clear the selection before the click lands.
    btn.addEventListener('mousedown', function (e) {
      e.preventDefault();
    });
    btn.addEventListener('click', readFromSelection);
    document.body.appendChild(btn);
    els.fromHere = btn;
    return btn;
  }

  function hideSelectionButton() {
    if (els.fromHere) els.fromHere.hidden = true;
  }

  function showSelectionButton() {
    if (!els.fromHere) return;
    // Only offered while read-aloud is running — with the bar closed, the
    // speaker button is the way in.
    if (!state.playing && !state.waiting) {
      hideSelectionButton();
      return;
    }
    var sel = window.getSelection && window.getSelection();
    if (!selectedBlock()) {
      hideSelectionButton();
      return;
    }
    var rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) {
      hideSelectionButton();
      return;
    }
    els.fromHere.hidden = false;
    var top = rect.top + window.pageYOffset - els.fromHere.offsetHeight - 8;
    // Flip below the selection when there is no room above it.
    if (rect.top < 60) top = rect.bottom + window.pageYOffset + 8;
    var left = rect.left + window.pageXOffset + rect.width / 2 - els.fromHere.offsetWidth / 2;
    var max = document.documentElement.clientWidth - els.fromHere.offsetWidth - 8;
    els.fromHere.style.top = Math.max(8, top) + 'px';
    els.fromHere.style.left = Math.min(Math.max(8, left), Math.max(8, max)) + 'px';
  }

  function bindSelection() {
    buildSelectionButton();
    var pending = null;
    var refresh = function () {
      clearTimeout(pending);
      pending = setTimeout(showSelectionButton, 10);
    };
    document.addEventListener('mouseup', refresh);
    document.addEventListener('keyup', function (e) {
      if (e.shiftKey || e.key === 'Shift' || /^Arrow/.test(e.key)) refresh();
    });
    document.addEventListener('selectionchange', function () {
      var sel = window.getSelection && window.getSelection();
      if (!sel || sel.isCollapsed) hideSelectionButton();
    });
    window.addEventListener('scroll', hideSelectionButton, { passive: true });
    window.addEventListener('resize', hideSelectionButton);
  }

  function init() {
    if (document.getElementById('ttsToggle')) return;
    var btn = buildButton();
    if (!btn) return;
    els.toggle = btn;
    buildBar();
    bindReducedMotionPreference();
    bindSelection();
    bindNavigationResume();
    render();

    // Leftover utterances would keep talking over the next page; the resume
    // flag (not the audio) is what carries playback across the navigation.
    window.addEventListener('pagehide', function () {
      if (!state.navigationTarget) clearResumeTarget();
      cancelUtterance();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (state.playing || state.waiting)) stop();
      // The chip sits at the end of the tab order, so keyboard users get a
      // shortcut instead: Alt+R reads from wherever the selection starts.
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'r' || e.key === 'R')) {
        if (selectedBlock() && readFromSelection()) e.preventDefault();
      }
    });
    document.addEventListener('click', function (e) {
      var trigger = e.target && e.target.closest ? e.target.closest('[data-tts-start]') : null;
      if (!trigger) return;
      var section = trigger.closest('[data-tts-section]');
      if (section) start(false, section);
    });

    autoResume();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
