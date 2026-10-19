import { readFileSync, writeFileSync } from "node:fs";
import navigation from "../../lib/site-navigation.js";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as Gm from "./geometry.mjs";
import { CONCEPT, INFO, PART_ORDER, SCENARIOS, TOUR } from "./content.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const STUDIO = process.argv.includes("--studio");
const outIndex = process.argv.indexOf("--out");
const explicitOut = outIndex < 0 ? null : process.argv[outIndex + 1];
if (outIndex >= 0 && (!explicitOut || explicitOut.startsWith("--"))) {
  throw new Error("usage: node build.mjs --out <output.html>");
}
const studioOut = STUDIO ? process.argv[process.argv.indexOf("--studio") + 1] : null;
if (STUDIO && (!studioOut || studioOut.startsWith("--"))) {
  throw new Error("usage: node build.mjs --studio <output.html>");
}
const OUT = explicitOut || studioOut || join(ROOT, "site", "inside-an-ai-agent.html");
const ORIGIN = "https://aieng-zh.cn";

const exportsOf = (source) => [...source.matchAll(/^export (?:const|function|let) ([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
function module(file, name) {
  const source = readFileSync(join(HERE, file), "utf8");
  const names = exportsOf(source);
  return `const ${name} = (() => {\n${source.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };\n})();`;
}

const RIG = Gm.build();
const round = (value) => Math.round(value * 1000) / 1000;
const track = [];
for (let s = 0; s <= Math.ceil(Gm.LOOP); s++) track.push(Gm.trackPoint(s).map((v) => Math.round(v * 100) / 100));

const items = Gm.items.map((item) => ({ id: item.id, asm: item.asm, key: round(item.key) }));
const body = Gm.items.map((item) => `<g data-i="${item.id}" data-asm="${item.asm}">${item.svg}</g>`).join("");
const LABEL =
  "工作台上的等距卡片处理机器。请求卡片随车架沿轨道绕行，经过请求料斗、记忆滚筒、带拾取头的文件柜、模型外壳、工具区、校验器、出口与轨迹打印机。中央运行时控制器记录步骤、轮次与模拟时间。";
const svg = k.figureSvg({ width: Gm.W, height: Gm.H, label: LABEL, body: `<g data-layer>${body}</g>`, className: "am-svg" }).replace("<svg ", "<svg data-am-svg ");

const DATA = {
  P: Gm.P,
  V: Gm.V.map(round),
  LOOP: round(Gm.LOOP),
  track,
  STOPS: Object.fromEntries(Object.entries(Gm.STOPS).map(([name, s]) => [name, round(s)])),
  RIG: JSON.parse(JSON.stringify(RIG, (key, value) => (typeof value === "number" ? round(value) : value))),
  slots: Array.from({ length: Gm.RACK.slots }, (_, i) => Gm.slotOf(i)),
  TRAY: Gm.TRAY,
  TRACK: Gm.TRACK,
  RACK: Gm.RACK,
  GRIP_HOME: RIG.gripHome,
  GANTRY_Z: RIG.gantryZ,
  EXPLODE: Gm.EXPLODE,
  ASSEMBLIES: Gm.ASSEMBLIES,
  items,
  INFO,
  CONCEPT,
  W: Gm.W,
  H: Gm.H,
  CSS: k.ISO_CSS + readFileSync(join(HERE, "page.css"), "utf8").split("\n").filter((line) => line.startsWith(".am-svg [data-hot]")).join(""),
  TOUR,
};
DATA.STOPS.verifier = round(Gm.STOPS.verifier);

const script = [
  module("kit/iso-kit.mjs", "K"),
  module("model.mjs", "M"),
  `const D = ${JSON.stringify(DATA)};`,
  readFileSync(join(HERE, "live.js"), "utf8"),
  ...(STUDIO ? [readFileSync(join(HERE, "export.js"), "utf8")] : []),
].join("\n");
const wrapped = `(() => {\n${script}\n})();`;

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TITLE = "AI agent 内部机制";
const HOOK = "AI agent 如何工作？禁用机器部件，观察每个部件的作用。";
const SUB = "运行一个请求，移除一个部件，观察故障。";
const DESCRIPTION = "通过交互机器，观察 AI agent 如何将请求变成有证据、使用工具并经过校验的答案。关闭检索、工具或校验器，观察同一个请求如何出错。";

const kitCss = k.ISO_CSS;
const STUDIO_PANEL = `          <p class="am-label am-label--gap">下载</p>
          <div class="am-export">
            <button type="button" class="am-btn" data-am-export="gif">本次运行的 GIF</button>
            <button type="button" class="am-btn" data-am-export="video">本次运行的视频</button>
            <button type="button" class="am-btn" data-am-export="tour">导览视频</button>
            <button type="button" class="am-btn" data-am-export="png">当前帧 PNG</button>
            <a class="am-btn" href="anatomy/inside-an-ai-agent-poster.png" download>海报</a>
          </div>
          <p class="am-export-status" data-am-export-status aria-live="polite">导出由浏览器根据同一模拟生成。视频和 GIF 使用上方的开关配置。</p>
          <button type="button" class="am-btn" data-am-export-cancel hidden>取消导出</button>`;
const css = readFileSync(join(HERE, "page.css"), "utf8");

const parts = PART_ORDER.map((asm, i) => `<button type="button" class="am-part" data-am-part="${asm}" aria-pressed="false"><span class="am-part-n">${String(i + 1).padStart(2, "0")}</span><strong>${escape(CONCEPT[asm])}</strong><span class="am-part-s">${escape(INFO[asm].name)}</span></button>`).join("");
const scenarios = SCENARIOS.map((item) => `<button type="button" class="am-scenario" data-am-scenario='${escape(JSON.stringify(item.config))}'><strong>${escape(item.label)}</strong><span>${escape(item.note)}</span></button>`).join("");

const plate = k.plateHtml({
  fig: "FIG_AGT · 交互模拟",
  title: "请求工作台",
  hint: "点击部件 · 空格运行 · → 单步",
  readout: "就绪",
  body: `<div class="am-stage" data-am-stage tabindex="0" role="group" aria-label="agent 机器。空格或回车运行、暂停。右箭头单步。E 展开部件。B 禁用一个依赖。R 修复。点击部件查看说明。">${svg}</div>`,
});

const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
  <meta charset="UTF-8">${STUDIO ? `\n  <base href="${pathToFileURL(join(ROOT, "site")).href}/">\n  <meta name="robots" content="noindex">` : ""}
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${TITLE} - 从零开始学 AI 工程</title>
  <link rel="icon" href="/favicon.ico?v=20260831a" sizes="32x32">
  <link rel="icon" href="/favicon.svg?v=20260831a" type="image/svg+xml">
  <meta name="description" content="${escape(DESCRIPTION)}">
  <link rel="canonical" href="${ORIGIN}/inside-an-ai-agent.html">
  <meta property="og:title" content="${TITLE} · 从零开始学 AI 工程">
  <meta property="og:description" content="${escape(HOOK)}">
  <meta property="og:image" content="${ORIGIN}/og/page/inside-an-ai-agent.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${TITLE} - 从零开始学 AI 工程">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ORIGIN}/og/page/inside-an-ai-agent.png">
  <meta name="twitter:image:alt" content="${TITLE} - 从零开始学 AI 工程">
  <meta property="og:url" content="${ORIGIN}/inside-an-ai-agent.html">
  <meta property="og:type" content="website">
  <meta name="twitter:title" content="${TITLE} · 从零开始学 AI 工程">
  <meta name="twitter:description" content="${escape(HOOK)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css?v=20261015a">
  <script>
    (function () {
      var root = document.documentElement;
      var stored = '';
      try { stored = localStorage.getItem('theme') || ''; } catch (_) {}
      root.setAttribute('data-theme', stored || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
      var poster = /[?&]poster(?:=([a-z0-9]))?\\b/.exec(location.search); if (poster) root.setAttribute('data-poster', poster[1] || '1');
    })();
  </script>
  <style>${kitCss}${css}</style>
</head>
<body data-am-depth="intro">
  <a href="#main" class="skip-link">跳到正文</a>
  <header class="site-header">
    <div class="header-inner">
      <a href="index.html" class="logo"><span class="logo-icon" aria-hidden="true"></span> AI / FROM SCRATCH</a>
      <nav class="header-nav">${navigation.renderNavigation()}</nav>
      <button class="theme-toggle" id="themeToggle" aria-label="切换主题" type="button"><span class="theme-icon" id="themeIcon">N</span></button>
    </div>
  </header>

  <main id="main" class="am">
    <div class="am-screen">
    <section class="am-hero">
      <p class="am-eyebrow">FIG_AGT · 交互模拟</p>
      <div class="am-hero-row">
        <h1>${TITLE}</h1>
        <p class="am-hook">${escape(HOOK)} <span class="am-sub">${escape(SUB)}</span></p>
      </div>
    </section>

    <section class="am-app" aria-label="机器">
      <div class="am-toolbar" role="group" aria-label="机器控制">
        <div class="am-buttons">
          <button type="button" class="am-btn am-btn--primary" data-am-run aria-pressed="false">运行</button>
          <button type="button" class="am-btn" data-am-step>单步</button>
          <button type="button" class="am-btn am-btn--break" data-am-break>禁用部件</button>
          <button type="button" class="am-btn" data-am-repair>修复</button>
          <button type="button" class="am-btn" data-am-explode aria-pressed="false">展开</button>
          <button type="button" class="am-btn" data-am-reset>重置</button>
        </div>
        <div class="am-switches">
          <label class="am-switch"><input type="checkbox" id="am-retrieval" checked><span>检索</span></label>
          <label class="am-switch"><input type="checkbox" id="am-tools" checked><span>工具访问</span></label>
          <label class="am-switch"><input type="checkbox" id="am-verify" checked><span>校验</span></label>
          <label class="am-select"><span>工具故障</span>
            <select id="am-fault">
              <option value="none">无</option>
              <option value="timeout-once">超时一次</option>
              <option value="timeout-always">始终超时</option>
              <option value="malformed">调用格式错误</option>
            </select>
          </label>
          <div class="am-speed" role="group" aria-label="动画速度">
            <span>速度</span>
            <button type="button" data-am-speed="0.5" aria-pressed="false">½×</button>
            <button type="button" data-am-speed="1" aria-pressed="true">1×</button>
            <button type="button" data-am-speed="2" aria-pressed="false">2×</button>
            <button type="button" data-am-speed="4" aria-pressed="false">4×</button>
          </div>
        </div>
        <p class="am-sr" data-am-live aria-live="polite"></p>
      </div>

      <aside class="am-left" aria-label="场景">
        <h2>试着让它出错</h2>
        <p class="am-muted">每个场景设置对应开关，重放同一个请求。</p>
        <div class="am-scenarios">${scenarios}</div>
        <div class="am-tourbox">
          <button type="button" class="am-btn am-btn--primary" data-am-tour-start>开始 60 秒导览</button>
          <div class="am-tour" data-am-tour hidden>
            <p class="am-label" data-am-tour-n></p>
            <h3 data-am-tour-title></h3>
            <p data-am-tour-text></p>
            <div class="am-tour-nav"><button type="button" class="am-btn" data-am-tour-prev>上一步</button><button type="button" class="am-btn am-btn--primary" data-am-tour-next>下一步</button></div>
          </div>
        </div>
      </aside>

      <div class="am-center">
        <div class="am-figure iso">${plate}</div>
        <p class="am-flash" data-am-flash aria-live="polite"></p>
        <div class="am-readouts" aria-label="实时读数">
          <div class="am-readout am-readout--wide"><span>阶段</span><strong data-am-stage-name>就绪</strong></div>
          <div class="am-readout"><span>证据</span><strong data-am-evidence>无</strong></div>
          <div class="am-readout"><span>工具调用</span><strong data-am-calls>0 次调用</strong></div>
          <div class="am-readout"><span>校验</span><strong data-am-verdict>尚未运行</strong></div>
          <div class="am-readout"><span>步骤</span><strong data-am-steps>0</strong></div>
          <div class="am-readout"><span>模拟时间</span><strong data-am-clock>0.00 s</strong></div>
        </div>
      </div>

      <aside class="am-right" aria-label="运行详情">
        <div class="am-tabs" role="tablist" aria-label="详情">
          <button type="button" role="tab" id="am-tab-run" aria-controls="am-panel-run" aria-selected="true" data-am-tab="run">运行</button>
          <button type="button" role="tab" id="am-tab-inspect" aria-controls="am-panel-inspect" aria-selected="false" tabindex="-1" data-am-tab="inspect">部件说明</button>
          <button type="button" role="tab" id="am-tab-trace" aria-controls="am-panel-trace" aria-selected="false" tabindex="-1" data-am-tab="trace">执行轨迹</button>
        </div>
        <div class="am-panel" id="am-panel-run" role="tabpanel" aria-labelledby="am-tab-run" data-am-panel="run">
          <p class="am-label">请求</p>
          <p class="am-request">比较四月和五月的云账单。支出增加了多少？</p>
          <p class="am-label">当前上下文</p>
          <ul class="am-context" data-am-context><li>空</li></ul>
          <p class="am-label">输出 <span class="am-status" data-am-status data-status="idle">等待中</span></p>
          <p class="am-output" data-am-output>尚无答案。</p>
          <p class="am-truth" data-am-truth></p>
          <p class="am-honest">这是模拟。模型步骤由固定脚本读取车架卡片并选择下一步，浏览器中没有运行真实模型。账单、算术和检查都实际执行。时间是模拟设定的固定成本，并非实测。</p>
          <div class="am-share">
            <button type="button" class="am-btn" data-am-share>复制当前配置链接</button>
          </div>
${STUDIO ? STUDIO_PANEL : `          <a class="am-btn am-poster" href="anatomy/inside-an-ai-agent-poster.png" download>下载海报</a>`}
        </div>
        <div class="am-panel" id="am-panel-inspect" role="tabpanel" aria-labelledby="am-tab-inspect" data-am-panel="inspect" hidden>
          <div class="am-depth" role="group" aria-label="说明深度">
            <button type="button" data-am-depth="intro" aria-pressed="true">入门</button>
            <button type="button" data-am-depth="deep" aria-pressed="false">工程实现</button>
          </div>
          <div class="am-parts">${parts}</div>
          <div class="am-inspect" data-am-inspect aria-live="polite"><p class="am-muted">点击机器部件，或从列表选择，查看它在真实 agent 中对应什么。</p></div>
        </div>
        <div class="am-panel" id="am-panel-trace" role="tabpanel" aria-labelledby="am-tab-trace" data-am-panel="trace" hidden>
          <p class="am-muted">台面上的打印机将同样的内容写到纸带上。</p>
          <ol class="am-trace" data-am-trace></ol>
        </div>
      </aside>
    </section>
    </div>

    <section class="am-why container">
      <h2>机器解释了什么</h2>
      <div class="am-why-grid">
        <p><strong>模型只提出下一步。</strong> 它读取收到的卡片并打印纸条。打开文件柜、转动计算器的是运行时，是否执行也由运行时决定。</p>
        <p><strong>知识来自三个地方。</strong> 密封滚筒是训练知识，记忆滚筒是系统保存的用户信息，文件柜存放私有文档。只有车架上的卡片能送到模型面前。</p>
        <p><strong>工具调用是不可信输入。</strong> schema 检查拒绝格式错误的参数，权限锁拒绝本次运行禁止使用的工具，计时器防止慢工具拖住运行。</p>
        <p><strong>检查位于模型之外。</strong> 校验器根据证据重新计算。关闭它后，错误答案也能像正确答案一样离开机器。</p>
      </div>
      <div class="am-cta">
        <p>从零学习构建每个部件。</p>
        <a class="am-btn am-btn--primary" href="/lesson.html?path=phases%2F14-agent-engineering%2F01-the-agent-loop">从 agent 循环开始</a>
        <a class="am-btn" href="catalog.html">浏览完整课程</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <p>© 2026 · 开源 · 永久免费</p>
      <div class="footer-links">
        <a href="https://github.com/fancyboi999/ai-engineering-from-scratch-zh" target="_blank" rel="noopener">GitHub</a>
        <a href="about.html">关于</a>
        <a href="catalog.html">课程表</a>
        <a href="glossary.html">术语表</a>
        <a href="https://github.com/fancyboi999/ai-engineering-from-scratch-zh/issues/new/choose" target="_blank" rel="noopener">报告问题</a>
        <a href="sponsors.html">支持本站</a>
      </div>
    </div>
  </footer>
  <script>
    (function () {
      var root = document.documentElement;
      var icon = document.getElementById('themeIcon');
      var sync = function () { if (icon) icon.textContent = root.getAttribute('data-theme') === 'light' ? 'N' : 'D'; };
      sync();
      document.getElementById('themeToggle').addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (_) {}
        sync();
      });
    })();
  </script>
  <script src="header.js?v=${navigation.HEADER_ASSET_VERSION}" defer></script>
  <script>${wrapped.replace(/<\/(script)/gi, "<\\/$1")}</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log("wrote", OUT, (html.length / 1024).toFixed(0) + " KB", Gm.items.length + " items");
