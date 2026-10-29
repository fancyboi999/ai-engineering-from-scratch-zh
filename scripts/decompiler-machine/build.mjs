import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../agent-machine/kit/iso-kit.mjs";
import * as ink from "../agent-machine/kit/ink.mjs";
import * as Gm from "./geometry.mjs";
import * as M from "./model.mjs";
import { CONCEPT, INFO, PART_ORDER, READY_HINT, SCENARIOS } from "./content.mjs";
import { FIXTURE } from "./fixture.mjs";
import * as Ck from "./clock.mjs";
import * as Pt from "./parts.mjs";
import navigation from "../../lib/site-navigation.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = process.argv[2] || join(ROOT, "site", "inside-a-decompiler.html");
const ORIGIN = "https://aieng-zh.cn";
const SLUG = "inside-a-decompiler";

const exportsOf = (source) => [...source.matchAll(/^export (?:const|function|let) ([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
function module(file, name, replace = []) {
  let source = readFileSync(join(HERE, file), "utf8");
  for (const [from, to] of replace) source = source.replace(from, to);
  return `const ${name} = (() => {\n${source.replace(/^export /gm, "")}\nreturn { ${exportsOf(source).join(", ")} };\n})();`;
}

const RIG = Gm.build();
const round = (value) => Math.round(value * 1000) / 1000;

const SOURCES = {
  "ledger-O2": "ledger.c · percent_change · clang -O2 · ledger-x86_64-O2.o",
  "ledger-O0": "ledger.c · percent_change · clang -O0 · ledger-x86_64-O0.o",
  trap: "sweep-trap.s · lookup · hand-written · sweep-trap.o",
};

const items = Gm.items.map((item) => ({ id: item.id, asm: item.asm, key: round(item.key) }));
const body = Gm.items.map((item) => `<g data-i="${item.id}" data-asm="${item.asm}">${item.svg}</g>`).join("");
const LABEL =
  "一台以等距视角绘制的反汇编机器，安装在工作台上。传送架沿着一条直轨经过九个工位：带魔数指示器的文件头卡、带符号索引的节柜、带移动光标的反汇编指令台、带回收箱的控制流板、带 IR 堆栈的提升压机、类型恢复针板、带双夹爪的结构整理夹具、伪代码打印机，以及分为四类的证据账本。";
const FILTER = ink.wobbleFilter("dm-hand", 1.8);
const svg = k.figureSvg({ width: Gm.W, height: Gm.H, label: LABEL, body: `${FILTER}<g data-layer filter="url(#dm-hand)">${body}</g><g data-pills></g><g data-sfx></g>`, className: "dm-svg" }).replace("<svg ", "<svg data-dm-svg ");

const BREAK_NOTES = [
  "Broke the symbols: the name and the end of the function are unknown.",
  "Broke the decoder: linear sweep at -O0 decodes the padding.",
  "Broke both: no symbols, so the sweep runs to the end of .text.",
  "Data in code: the sweep decodes four data bytes and misses 0x14.",
  "Data in code with descent: the jump skips the data, then the lifter stops.",
];

function selfCheck() {
  const rows = [];
  const check = (what, shown, model) => rows.push({ what, ok: String(shown) === String(model), shown, model });
  for (const program of M.PROGRAMS)
    for (const symbols of [true, false])
      for (const sweep of M.SWEEPS)
        for (const opt of program === "trap" ? ["O2"] : M.OPTS) {
          const config = { program, symbols, sweep, opt };
          const tag = `${M.keyOf(config)} ${symbols ? "named" : "stripped"} ${sweep}`;
          const sim = M.simulate(config);
          const fx = FIXTURE[M.keyOf(config)];
          const header = sim.events.find((ev) => ev.type === "header");
          check(`${tag}: card magic`, "7f 45 4c 46", header.magic);
          check(`${tag}: card E_SHNUM`, fx.header.shnum, (header.trace.match(/(\d+) section headers/) || [])[1]);
          check(`${tag}: drawers`, fx.sections.length, Pt.drawersSvg(fx.sections).match(/data-name=/g).length);
          const { run } = M.decodeOf(config);
          const decode = sim.events.find((ev) => ev.type === "decode");
          check(`${tag}: tiles`, run.insns.length, decode.insns.length);
          const graph = Pt.graphSvg(run).match(/(\d+) 个块 · (\d+) 条边/);
          const cfg = sim.events.find((ev) => ev.type === "cfg");
          check(`${tag}: board blocks`, graph[1], cfg.live);
          check(`${tag}: board edges`, graph[2], run.edges.filter((edge) => run.blocks.some((b) => b.live && b.s === edge.f) && run.blocks.some((b) => b.live && b.s === edge.t)).length);
          const slots = Pt.slotList(fx.lift).length;
          check(`${tag}: slots`, slots, fx.lift.error ? 0 : fx.lift.params.length + fx.lift.locals.length + 1);
          const trays = M.tallyOf(sim.events[sim.events.length - 1].ledger);
          check(`${tag}: trays`, Object.values(trays).reduce((a, b) => a + b, 0), sim.ledger.length);
          for (const ev of sim.events) {
            const real = Ck.realOf(config, ev.type);
            if (["ledger", "exit"].includes(ev.type)) check(`${tag}: ${ev.type} has no real time`, real, null);
            else check(`${tag}: ${ev.type} real time`, real && real.seconds > 0, true);
          }
        }
  const bad = rows.filter((row) => !row.ok);
  bad.forEach((row) => console.error("self-check mismatch:", row.what, "shown", row.shown, "model", row.model));
  return { checked: rows.length, bad: bad.length };
}
const SELF = selfCheck();
console.log(`self-check: ${SELF.checked} machine numbers read from the model, ${SELF.bad} disagree`);
if (SELF.bad) process.exit(1);

const DATA = {
  LABELS: Gm.LABELS,
  EXPLODE: Gm.EXPLODE,
  ASSEMBLIES: Gm.ASSEMBLIES,
  SOURCES,
  BREAK_NOTES,
  items,
};

const script = [
  module("../agent-machine/kit/iso-kit.mjs", "K"),
  module("../agent-machine/kit/ink.mjs", "Ink", [['import { iso, segment, slabOf, solidSvg } from "./iso-kit.mjs";', "const { iso, segment, slabOf, solidSvg } = K;"]]),
  module("parts.mjs", "Pt", [['import * as k from "../agent-machine/kit/iso-kit.mjs";', "const k = K;"], ['import * as ink from "../agent-machine/kit/ink.mjs";', "const ink = Ink;"]]),
  module("content.mjs", "C"),
  module("fixture.mjs", "F"),
  module("model.mjs", "M", [['import { FIXTURE } from "./fixture.mjs";', "const { FIXTURE } = F;"]]),
  module("timing.mjs", "Tm"),
  module("clock.mjs", "Ck", [['import { TIMING } from "./timing.mjs";', "const { TIMING } = Tm;"], ['import { keyOf } from "./model.mjs";', "const { keyOf } = M;"]]),
  `const D = ${JSON.stringify(DATA)};`,
  readFileSync(join(HERE, "live.js"), "utf8"),
].join("\n");
const wrapped = `(() => {\n${script}\n})();`;

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TITLE = "反编译器内部机制";
const HOOK = "反编译器把字节转换成人能读懂的代码。拆解机器，看看哪些部分是事实，哪些只是推断。";
const SUB = "剥离符号，切换解码器，查看证据账本。";
const DESCRIPTION = "一台逐步反编译小函数的交互机器，展示文件头、节、反汇编、控制流、IR 提升、类型、结构化与伪代码，并用证据账本区分直接观察与推断。";

const parts = PART_ORDER.map((asm, i) => `<button type="button" class="dm-part" data-dm-part="${asm}" aria-pressed="false"><span class="dm-part-n">${String(i + 1).padStart(2, "0")}</span><strong>${escape(CONCEPT[asm])}</strong><span class="dm-part-s">${escape(INFO[asm].name)}</span></button>`).join("");
const flags = (text) => escape(text).replace(/(-O\d)/g, '<span class="dm-nobr">$1</span>');
const scenarios = SCENARIOS.map((item) => `<button type="button" class="dm-scenario" data-dm-scenario='${escape(JSON.stringify(item.config))}'><strong>${flags(item.label)}</strong><span>${flags(item.note)}</span></button>`).join("");

const plate = k.plateHtml({
  fig: "FIG_DEC · 交互模拟",
  title: "反汇编工作台",
  hint: "点击部件 · 空格运行 · → 单步",
  readout: "就绪",
  body: `<div class="dm-stage" data-dm-stage tabindex="0" role="group" aria-label="反编译机器。按空格或回车运行、暂停。按右方向键前进一步。按 E 展开机器，按 B 禁用一个阶段，按 R 修复。点击部件查看说明。">${svg}<span class="dm-badge" data-dm-badge hidden></span><div class="dm-cut" data-dm-cut hidden><p class="dm-cut-t" data-dm-cut-title>内部结构</p><div class="dm-cut-row"><code data-dm-cut-cause></code><span class="dm-cut-arrow" aria-hidden="true">→</span><code data-dm-cut-result></code></div></div></div>`,
});

const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${TITLE} - 从零开始学 AI 工程</title>
  <link rel="icon" href="/favicon.ico?v=20260831a" sizes="32x32">
  <link rel="icon" href="/favicon.svg?v=20260831a" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="description" content="${escape(DESCRIPTION)}">
  <link rel="canonical" href="${ORIGIN}/${SLUG}.html">
  <meta property="og:title" content="${TITLE} · 从零开始学 AI 工程">
  <meta property="og:description" content="${escape(HOOK)}">
  <meta property="og:image" content="${ORIGIN}/og/page/${SLUG}.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${TITLE} - 从零开始学 AI 工程">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ORIGIN}/og/page/${SLUG}.png">
  <meta name="twitter:image:alt" content="${TITLE} - 从零开始学 AI 工程">
  <meta property="og:url" content="${ORIGIN}/${SLUG}.html">
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
      var asked = /[?&]theme=(light|dark)\\b/.exec(location.search);
      root.setAttribute('data-theme', asked ? asked[1] : stored || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
      var poster = /[?&]poster(?:=([a-z0-9]))?\\b/.exec(location.search); if (poster) root.setAttribute('data-poster', poster[1] || '1');
    })();
  </script>
  <style>${k.ISO_CSS}${ink.INK_CSS}${readFileSync(join(HERE, "page.css"), "utf8")}</style>
</head>
<body>
  <a href="#main" class="skip-link">跳到正文</a>
  ${navigation.renderHeader({ active: SLUG, themeOwner: "page", narration: "off" })}

  <main id="main" class="dm">
    <div class="dm-screen">
    <section class="dm-hero">
      <p class="dm-eyebrow">FIG_DEC · 交互模拟</p>
      <div class="dm-hero-row">
        <h1>${TITLE}</h1>
        <p class="dm-hook">${escape(HOOK)} <span class="dm-sub">${escape(SUB)}</span></p>
      </div>
    </section>

    <section class="dm-app" aria-label="反编译机器">
      <div class="dm-toolbar">
        <div class="dm-group" role="group" aria-labelledby="dm-g-run">
          <span class="dm-group-k" id="dm-g-run">运行控制</span>
          <button type="button" class="dm-btn dm-btn--primary" data-dm-run aria-pressed="false">运行</button>
          <button type="button" class="dm-btn" data-dm-step>单步</button>
          <button type="button" class="dm-btn dm-btn--break" data-dm-break>禁用阶段</button>
          <button type="button" class="dm-btn" data-dm-repair>修复</button>
          <button type="button" class="dm-btn" data-dm-explode aria-pressed="false">展开</button>
          <button type="button" class="dm-btn" data-dm-reset>重置</button>
          <div class="dm-speed" role="group" aria-label="动画速度">
            <button type="button" data-dm-speed="0.5" aria-pressed="false">½×</button>
            <button type="button" data-dm-speed="1" aria-pressed="true">1×</button>
            <button type="button" data-dm-speed="2" aria-pressed="false">2×</button>
            <button type="button" data-dm-speed="4" aria-pressed="false">4×</button>
          </div>
        </div>
        <div class="dm-group" role="group" aria-labelledby="dm-g-setup">
          <span class="dm-group-k" id="dm-g-setup">运行配置</span>
          <label class="dm-select"><span>程序</span>
            <select id="dm-program">
              <option value="ledger">percent_change</option>
              <option value="trap">代码中包含数据</option>
            </select>
          </label>
          <label class="dm-switch"><input type="checkbox" id="dm-symbols" checked><span>符号表</span></label>
          <label class="dm-select"><span>解码方式</span>
            <select id="dm-sweep">
              <option value="descent">递归下降</option>
              <option value="linear">线性扫描</option>
            </select>
          </label>
          <label class="dm-select"><span>编译优化</span>
            <select id="dm-opt">
              <option value="O2">-O2</option>
              <option value="O0">-O0</option>
            </select>
          </label>
        </div>
        <div class="dm-group" role="group" aria-labelledby="dm-g-look">
          <span class="dm-group-k" id="dm-g-look">外观</span>
          <label class="dm-range">手绘抖动 <input type="range" id="dm-wobble" min="0" max="6" step="0.1" value="1.8"></label>
          <span class="dm-swatches" role="group" aria-label="机身颜色">${[["mint", "薄荷绿"], ["cobalt", "钴蓝"], ["mustard", "芥末黄"], ["tomato", "番茄红"], ["blush", "粉色"]].map(([name, label]) => `<button type="button" class="dm-sw" data-dm-pal="${name}" aria-label="${label}" title="${label}" aria-pressed="${name === "mint"}"></button>`).join("")}</span>
          <label class="dm-switch"><input type="checkbox" id="dm-labels" checked><span>显示标注</span></label>
        </div>
        <p class="dm-sr" data-dm-live aria-live="polite"></p>
      </div>

      <div class="dm-center">
        <div class="dm-work">
          <nav class="dm-steps" aria-label="步骤">
            <div class="dm-mode" role="group" aria-label="运行模式"><button type="button" data-dm-mode="manual" aria-pressed="true">手动</button><button type="button" data-dm-mode="auto" aria-pressed="false">自动</button></div>
            <ol class="dm-steplist" data-dm-steplist></ol>
            <a href="#" class="dm-restart" data-dm-restart>从头开始</a>
          </nav>
          <div class="dm-figure-col">
            <p class="dm-hint" data-dm-hint aria-live="polite">${escape(READY_HINT)}</p>
            <div class="dm-figure iso iso-ink">${plate}</div>
          </div>
        </div>
        <p class="dm-flash" data-dm-flash aria-live="polite"></p>
        <div class="dm-readouts" aria-label="实时状态">
          <div class="dm-readout dm-readout--wide"><span>阶段</span><strong data-dm-stage-name>就绪</strong></div>
          <div class="dm-readout"><span>指令</span><strong data-dm-decoded>0</strong></div>
          <div class="dm-readout"><span>基本块</span><strong data-dm-blocks>0</strong></div>
          <div class="dm-readout"><span>名称与类型</span><strong data-dm-names>尚未恢复</strong></div>
          <div class="dm-readout"><span>未知项</span><strong data-dm-unknowns>0</strong></div>
          <div class="dm-readout"><span>证据</span><strong data-dm-evidence>观察 0 项</strong></div>
          <div class="dm-readout"><span>步骤</span><strong data-dm-steps>0</strong></div>
        </div>
        <p class="dm-idea"><strong>核心思路</strong>反汇编器读取的始终是字节。每个后续工位都会增加一项判断；账本会把字节直接显示的事实与机器推断的内容分开。</p>
      </div>

      <aside class="dm-right" aria-label="运行详情">
        <div class="dm-tabs" role="tablist" aria-label="详细信息">
          <button type="button" role="tab" id="dm-tab-run" aria-controls="dm-panel-run" aria-selected="true" data-dm-tab="run">运行</button>
          <button type="button" role="tab" id="dm-tab-try" aria-controls="dm-panel-try" aria-selected="false" tabindex="-1" data-dm-tab="try">场景</button>
          <button type="button" role="tab" id="dm-tab-ledger" aria-controls="dm-panel-ledger" aria-selected="false" tabindex="-1" data-dm-tab="ledger">账本</button>
          <button type="button" role="tab" id="dm-tab-inspect" aria-controls="dm-panel-inspect" aria-selected="false" tabindex="-1" data-dm-tab="inspect">部件</button>
          <button type="button" role="tab" id="dm-tab-trace" aria-controls="dm-panel-trace" aria-selected="false" tabindex="-1" data-dm-tab="trace">轨迹</button>
        </div>
        <div class="dm-panel" id="dm-panel-run" role="tabpanel" aria-labelledby="dm-tab-run" data-dm-panel="run">
          <p class="dm-label">输入</p>
          <p class="dm-source" data-dm-source></p>
          <p class="dm-bytes" data-dm-bytes></p>
          <p class="dm-label">指令</p>
          <ol class="dm-listing" data-dm-listing></ol>
          <p class="dm-label">输出 <span class="dm-status" data-dm-status data-status="idle">等待运行</span></p>
          <pre class="dm-output" data-dm-output>暂无伪代码。</pre>
          <p class="dm-honest">这是交互模拟。页面不会在浏览器中运行反汇编器。页面中的字节、指令、基本块、IR 行和伪代码，都来自课程工具对测试目标文件的实际采集。动画经过放慢，方便观察。速度标记会把每个阶段与课程 Python 代码在一台机器（${escape(Ck.SOURCE.machine)}）上的运行时间进行比较；带有 ≈ 的标记与相邻步骤共享一次计时调用。解码芯片上的 16 字节窗口是页面用来分组字节的常见 x86 取指宽度，并非来自测试目标文件。构建时进行了自检：机器读取了 ${SELF.checked} 个模型数值，其中 ${SELF.bad} 个有差异。</p>
          <div class="dm-share">
            <button type="button" class="dm-btn" data-dm-share>复制当前配置链接</button>
          </div>
          <a class="dm-btn dm-poster" href="anatomy/${SLUG}-poster.png" download>下载海报</a>
        </div>
        <div class="dm-panel" id="dm-panel-try" role="tabpanel" aria-labelledby="dm-tab-try" data-dm-panel="try" hidden>
          <p class="dm-muted">试着让它出错。每个场景都会切换设置，并重新反汇编同一组字节。</p>
          <div class="dm-scenarios">${scenarios}</div>
        </div>
        <div class="dm-panel" id="dm-panel-ledger" role="tabpanel" aria-labelledby="dm-tab-ledger" data-dm-panel="ledger" hidden>
          <p class="dm-muted">每个工位都会登记发现。观察：直接从字节读取。推导：根据观察到的事实计算。推断：尚未由观察证实的判断。未知：机器无法弥补的缺口。</p>
          <ol class="dm-ledger" data-dm-ledger></ol>
        </div>
        <div class="dm-panel" id="dm-panel-inspect" role="tabpanel" aria-labelledby="dm-tab-inspect" data-dm-panel="inspect" hidden>
          <div class="dm-parts">${parts}</div>
          <div class="dm-inspect" data-dm-inspect aria-live="polite"><p class="dm-muted">点击机器部件或从列表中选择一项，查看它在反汇编流程中的作用。</p></div>
        </div>
        <div class="dm-panel" id="dm-panel-trace" role="tabpanel" aria-labelledby="dm-tab-trace" data-dm-panel="trace" hidden>
          <p class="dm-muted">每行记录运行中的一个步骤。</p>
          <ol class="dm-trace" data-dm-trace></ol>
        </div>
      </aside>
    </section>
    </div>

    <section class="dm-why container">
      <h2>机器展示了什么</h2>
      <div class="dm-why-grid">
        <p><strong>每个阶段都依赖前一阶段。</strong>文件头指出节的位置，节提供字节，解码器生成指令，控制流图呈现代码结构。一个工位出错，错误就会沿着传送架影响后续阶段。</p>
        <p><strong>字节本身不会标出哪些是代码。</strong>递归下降会跟随跳转，线性扫描会解码每个字节。在“代码中包含数据”的程序里，扫描会把四个数据字节当作指令，并漏掉地址 0x14 的真实指令。</p>
        <p><strong>符号只提供名称，不提供含义。</strong>剥离符号不会改变函数逻辑，但函数名、长度和结尾会变成未知。参数名称原本就没有写进文件。</p>
        <p><strong>伪代码是一种判断。</strong>账本会区分字节展示的内容和机器推断的内容。第 36 课通过运行候选实现并重建二进制文件来证明等价。</p>
      </div>
      <div class="dm-cta">
        <p>从零实现每个工位。</p>
        <a class="dm-btn dm-btn--primary" href="/lesson?path=phases%2F13-tools-and-protocols%2F32-program-anatomy-elf-from-scratch">从 ELF 读取器开始</a>
        <a class="dm-btn" href="manual-reverse-engineering-101.html">阅读逆向工程入门手册</a>
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
        <a href="https://github.com/fancyboi999/ai-engineering-from-scratch-zh/issues/new/choose" target="_blank" rel="noopener">反馈问题</a>
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
