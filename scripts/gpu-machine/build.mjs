import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../agent-machine/kit/iso-kit.mjs";
import * as ink from "../agent-machine/kit/ink.mjs";
import navigation from "../../lib/site-navigation.js";
import * as Gm from "./geometry.mjs";
import * as M from "./model.mjs";
import { ABSTRACT, SPECS } from "./hardware.mjs";
import { NAMES, PART_ORDER, SCENARIOS } from "./content.mjs";
import { W, H } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = process.argv[2] || join(ROOT, "site", "inside-an-llm-serving-gpu.html");
const ORIGIN = "https://aieng-zh.cn";
const SLUG = "inside-an-llm-serving-gpu";

const exportsOf = (source) => [...source.matchAll(/^export (?:const|function|let) ([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
function module(file, name, replace = []) {
  let source = readFileSync(join(HERE, file), "utf8");
  for (const [from, to] of replace) source = source.replace(from, to);
  return `const ${name} = (() => {\n${source.replace(/^export /gm, "")}\nreturn { ${exportsOf(source).join(", ")} };\n})();`;
}

const RIGS = Gm.build();
const round = (value) => Math.round(value * 1000) / 1000;
const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const PILL = 10.5;
const pillWidth = (text) => text.length * PILL * 0.62 + PILL * 1.6;
function placeLabels(rig) {
  const entries = rig.LABELS.map((label) => ({ label, a: k.iso(label.at, rig.P), w: pillWidth(label.text) }));
  const xs = entries.map((e) => e.a[0]);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const out = new Map();
  for (const side of ["left", "right"]) {
    const list = entries.filter((e) => (side === "left" ? e.a[0] < mid : e.a[0] >= mid)).sort((p, q) => p.a[1] - q.a[1]);
    let floor = side === "left" ? 150 : 14;
    const limit = side === "left" ? H - 14 : 280;
    list.forEach((e, i) => {
      const y = Math.min(limit - (list.length - 1 - i) * 24, Math.max(floor, e.a[1] - 40));
      floor = y + 24;
      const x = side === "left" ? 6 + e.w / 2 : W - 6 - e.w / 2;
      out.set(e.label.id, { x, y });
    });
  }
  return rig.LABELS.map((label) => {
    const [ax, ay] = k.iso(label.at, rig.P);
    const { x, y } = label.to ? { x: label.to[0], y: label.to[1] } : out.get(label.id);
    return { id: label.id, text: label.text, stations: label.stations, asm: label.asm, at: label.at, dx: Math.round(x - ax), dy: Math.round(y - ay) };
  });
}

const rigData = {};
let layers = "";
for (const [name, rig] of Object.entries(RIGS)) {
  const items = rig.items.map((item) => ({ id: item.id, asm: item.asm, key: round(item.key) }));
  rigData[name] = { items, EXPLODE: rig.EXPLODE, ASSEMBLIES: rig.ASSEMBLIES, LABELS: placeLabels(rig), WAYPOINTS: rig.WAYPOINTS, FLOWS: rig.FLOWS, LAUNCH: rig.LAUNCH, HOT: rig.HOT, P: rig.P, V: rig.V, CHIPS: rig.CHIPS, SM_COUNT: rig.SM_COUNT };
  const sorted = rig.items.slice().sort((a, b) => a.key - b.key);
  layers += `<g data-rig="${name}"${name === "l4" ? "" : ' style="display:none"'}><g data-layer filter="url(#gm-hand)">${sorted.map((item) => `<g data-i="${item.id}" data-asm="${item.asm}">${item.svg}</g>`).join("")}</g></g>`;
}

const LABEL = "用于语言模型推理的 NVIDIA GPU 等距图解，依据公开的硬件结构绘制。L4 视图展示主板、网络端口、主机 CPU、PCIe Gen4 x16 转接板，以及由 58 个 SM 的 AD104 芯片、48 MB L2 缓存、六个 GDDR6 封装、基板、焊球和半透明被动散热片构成的 L4 显卡。GB10 视图展示一块主板、网络端口、含 20 个 Arm 核心的 CPU 小芯片、通过 NVLink-C2C 连接的 GPU 小芯片、八个 LPDDR5X 封装和半透明散热器。内存封装上的彩色格子表示模型权重、KV 缓存池和当前请求。";
const FILTER = ink.wobbleFilter("gm-hand", 1.6);
const GAUGE = `<g class="gauge" data-gauge transform="translate(6 4)"><rect class="gauge-bg" x="0" y="0" width="140" height="132" rx="3"/><text class="gauge-title" x="70" y="17" text-anchor="middle">内存读取</text><path class="gauge-arc" d="M20 92A50 50 0 0 1 120 92"/><path class="gauge-fill" data-gauge-fill d=""/><line class="gauge-needle" data-gauge-needle x1="70" y1="92" x2="26" y2="92"/><circle class="gauge-hub" cx="70" cy="92" r="4"/><text class="gauge-value" data-gauge-value x="70" y="115" text-anchor="middle">空闲</text><text class="gauge-peak" data-gauge-peak x="70" y="127" text-anchor="middle">峰值 300 GB/s</text></g>`;
const cutWeights = Array.from({ length: 13 }, (_, i) => `<rect class="cut-cell" data-cw data-c="w" x="${8 + i * 12.4}" y="34" width="10.6" height="10" rx="1"/>`).join("");
const cutKv = Array.from({ length: 26 }, (_, i) => `<rect class="cut-cell" data-ck data-c="free" x="${8 + (i % 13) * 12.4}" y="${70 + Math.floor(i / 13) * 12}" width="10.6" height="10" rx="1"/>`).join("");
const CUT = `<path class="cut-lead" data-clead d=""/><g class="cut" data-cut transform="translate(762 300)"><rect class="cut-bg" x="0" y="0" width="232" height="122" rx="3"/><text class="cut-title" x="8" y="14">切面 · 内存内部</text><text class="cut-cap" x="8" y="30">权重</text>${cutWeights}<text class="cut-cap" x="8" y="66">KV 缓存池</text>${cutKv}<rect class="cut-sm" data-csm x="186" y="30" width="38" height="56" rx="2"/><text class="cut-smtext" x="205" y="62" text-anchor="middle">SM</text><path class="cut-arrow" d="M170 39H184M205 86V100H172M172 100L178 96M172 100L178 104M184 39L179 35M184 39L179 43"/><text class="cut-tok" data-ctok x="8" y="114"></text></g><text class="sound" data-sound></text>`;
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: `${FILTER}${layers}${CUT}${GAUGE}<g data-pills></g>`, className: "gm-svg" }).replace("<svg ", "<svg data-gm-svg ");

const PALETTES = { green: ["#6fbf7c", "#4a9a5a", "#163a22"], blue: ["#6f9fd8", "#4a78b8", "#142a4a"], black: ["#6a6e76", "#45484f", "#141518"], red: ["#e07a6a", "#c0503f", "#4a1a12"], purple: ["#a98bd6", "#8461b8", "#2e1a48"] };
const STATIONS = ["ingress", "tokenizer", "scheduler", "detok", "link", "sms", "weights", "pool"];
const specRows = (gpu) => {
  const s = SPECS[gpu];
  const rows = gpu === "l4"
    ? [["芯片", s.architecture], ["SM", s.sms, `${s.gpcs.value} 个 GPC、${s.tpcs.value} 个 TPC`], ["Tensor Core", s.tensorCores, `每个 SM 含 4 个，${s.tensorGen.value}`], ["L2 缓存", s.l2MB, "MB"], ["显存", s.memory], ["总线", s.busBits, "位，32 位控制器"], ["带宽", s.bandwidthGBs, "GB/s 峰值"], ["主机接口", s.interconnect], ["功耗", s.tdpW, "W，被动散热"], ["时钟频率", s.clocksMHz, "MHz"]]
    : [["芯片", s.architecture], ["CPU", s.cpu], ["GPU", s.cudaCores, `个 CUDA core、${s.tensorGen.value} Tensor Core；SM 数量未公开`], ["GPU L2 缓存", s.l2MB, "MB"], ["CPU 缓存", s.cpuL3MB, `MB L3，另有 ${s.slcMB.value} MB 系统级缓存`], ["内存", s.memory], ["总线", s.busBits, `位，${s.channels.value} 个通道`], ["带宽", s.bandwidthGBs, "GB/s 峰值"], ["芯片互联", s.interconnect, `GPU 带宽 ${s.c2cGBs.value} GB/s`], ["功耗", s.tdpW, "W，整颗芯片"]];
  const DOCS = { l4Page: "NVIDIA L4 产品页", l4Brief: "NVIDIA L4 产品简介 PB-11316-001", ada: "NVIDIA Ada GPU 架构白皮书", sparkPage: "NVIDIA DGX Spark 产品页", sparkGuide: "NVIDIA DGX Spark 用户指南", gb10HotChips: "Hot Chips 2025 上的 NVIDIA GB10 演讲" };
  return rows.map(([label, entry, unit]) => `<dt>${escape(label)}</dt><dd>${escape(String(entry.value).toLocaleString("en-US"))}${unit ? ` ${escape(unit)}` : ""}<small>${escape(DOCS[entry.source])}, ${escape(entry.where)}</small></dd>`).join("");
};

const DATA = {
  rigs: rigData,
  STATIONS,
  PALETTES,
  dense: { l4: true, gb10: false },
  specs: { l4: { name: "NVIDIA L4" }, gb10: { name: "NVIDIA GB10" } },
  machine: { l4: { model: M.MACHINE.l4.model }, gb10: { model: M.MACHINE.gb10.model } },
};

const script = [
  module("../agent-machine/kit/iso-kit.mjs", "K"),
  module("../agent-machine/kit/ink.mjs", "Ink", [['import { iso, segment, slabOf, solidSvg } from "./iso-kit.mjs";', "const { iso, segment, slabOf, solidSvg } = K;"]]),
  module("content.mjs", "C"),
  module("hardware.mjs", "Hw"),
  module("data.mjs", "Dt"),
  module("model.mjs", "M", [['import { ENV, LOGS, RUNS, SOURCES } from "./data.mjs";', "const { ENV, LOGS, RUNS, SOURCES } = Dt;"], ['import { SPECS } from "./hardware.mjs";', "const { SPECS } = Hw;"]]),
  `const D = ${JSON.stringify(DATA)};`,
  readFileSync(join(HERE, "live.js"), "utf8"),
].join("\n");
const wrapped = `(() => {\n${script}\n})();`;

const TITLE = "大模型推理 GPU 内部机制";
const HOOK = "每个 token 的每一步解码都要读取权重。观察字节如何离开显存，理解内存带宽为何决定速度。";
const SUB = "L4 或 GB10。BF16 或 FP8。填满缓存池，看看散热失效的影响。";
const DESCRIPTION = "交互式等距图解，展示 NVIDIA L4 与 GB10 使用 SGLang 推理语言模型时，请求经过 CPU、PCIe 或 NVLink-C2C 的路径、芯片内的 KV 缓存池、SM 上的 prefill，以及每一步解码读取权重的过程。缓存池容量和速度数据来自 SGLang 101 手册中的实测。";

const parts = PART_ORDER.map((part, i) => `<button type="button" class="gm-part" data-gm-part="${part}" aria-pressed="false"><span class="gm-part-n">${String(i + 1).padStart(2, "0")}</span><strong>${escape(typeof NAMES[part] === "string" ? NAMES[part] : NAMES[part].l4.replace("PCIE GEN4 X16", "LINK"))}</strong></button>`).join("");
const scenarios = SCENARIOS.map((item) => `<button type="button" class="gm-scenario" data-gm-scenario='${escape(JSON.stringify(item.config))}'><strong>${escape(item.label)}</strong><span>${escape(item.note)}</span></button>`).join("");
const option = (value, text, on = false) => `<option value="${value}"${on ? " selected" : ""}>${escape(text)}</option>`;

const STEP = `<div class="gm-step" aria-label="单步解码示意">
          <div class="gm-step-bar"><i data-step-read></i><i data-step-rest></i><b data-step-cursor></b></div>
          <p data-step-text></p>
        </div>`;
const plate = k.plateHtml({
  fig: "FIG_GPU · 交互模拟",
  title: "大模型推理 GPU",
  hint: "点击部件 · 空格运行 · → 单步",
  readout: "就绪",
  body: `<div class="gm-stage" data-gm-stage tabindex="0" role="group" aria-label="GPU 推理机器。按空格或回车运行、暂停。按右方向键前进一步。按 E 展开机器，按 B 禁用一个部件，按 R 修复。点击部件查看说明。">${svg}</div>`,
});

const legend = [["w", "模型权重"], ["r", "本步读取"], ["kv", "缓存池：其他请求"], ["me", "缓存池：当前请求"], ["pre", "缓存池：复用的前缀"], ["free", "缓存池：空闲"]].map(([c, text]) => `<li><i class="gm-key" data-c="${c}"></i>${escape(text)}</li>`).join("");
const abstract = (gpu) => ABSTRACT[gpu].map((line) => `<li>${escape(line)}</li>`).join("");

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
  <link href="https://fonts.googleapis.com/css2?family=VT323&family=Caveat:wght@600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
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
  <style>${k.ISO_CSS}${ink.INK_CSS}${readFileSync(join(HERE, "materials.css"), "utf8")}${readFileSync(join(HERE, "page.css"), "utf8")}</style>
</head>
<body>
  <a href="#main" class="skip-link">跳到正文</a>
  ${navigation.renderHeader({ active: SLUG, themeOwner: "page", narration: "off" })}

  <main id="main" class="gm">
    <div class="gm-screen">
    <section class="gm-hero">
      <p class="gm-eyebrow">FIG_GPU · 交互模拟</p>
      <div class="gm-hero-row">
        <h1>${TITLE}</h1>
        <p class="gm-hook">${escape(HOOK)} <span class="gm-sub">${escape(SUB)}</span></p>
      </div>
    </section>

    <section class="gm-app" aria-label="推理 GPU">
      <div class="gm-toolbar" role="group" aria-label="机器控制">
        <div class="gm-buttons">
          <button type="button" class="gm-btn gm-btn--primary" data-gm-run aria-pressed="false">运行</button>
          <button type="button" class="gm-btn" data-gm-step>单步</button>
          <button type="button" class="gm-btn gm-btn--break" data-gm-break>禁用部件</button>
          <button type="button" class="gm-btn" data-gm-repair>修复</button>
          <button type="button" class="gm-btn" data-gm-explode aria-pressed="false">展开</button>
          <button type="button" class="gm-btn" data-gm-reset>重置</button>
          <div class="gm-speed" role="group" aria-label="动画速度">
            <span>速度</span>
            <button type="button" data-gm-speed="0.5" aria-pressed="false">½×</button>
            <button type="button" data-gm-speed="1" aria-pressed="true">1×</button>
            <button type="button" data-gm-speed="2" aria-pressed="false">2×</button>
            <button type="button" data-gm-speed="4" aria-pressed="false">4×</button>
          </div>
        </div>
        <div class="gm-switches">
          <label class="gm-select"><span>GPU</span><select id="gm-gpu">${option("l4", "NVIDIA L4", true)}${option("gb10", "NVIDIA GB10")}</select></label>
          <label class="gm-select"><span>权重格式</span><select id="gm-dtype">${option("bf16", "BF16", true)}${option("fp8", "FP8")}</select></label>
          <label class="gm-select"><span>内存比例</span><select id="gm-frac" data-gpu="l4">${option("0.85", "0.85（工具包默认值）", true)}${option("0.74", "0.74（较小）")}</select></label>
          <label class="gm-select"><span>工作负载</span><select id="gm-workload">${option("unique", "不同提示词", true)}${option("shared", "共享系统提示词")}</select></label>
          <label class="gm-select gm-range" data-gm-users-wrap><span>用户数</span><input type="range" id="gm-users" min="0" max="${M.USERS.length - 1}" step="1" value="${M.USERS.indexOf(M.DEFAULTS.users)}" aria-label="并发用户数"><output data-gm-users-out>${M.DEFAULTS.users}</output></label>
          <label class="gm-select" data-gm-shared-wrap hidden><span>共享 token 数</span><select id="gm-shared">${M.SHARED.map((s) => option(s, s.toLocaleString("zh-CN"), s === M.DEFAULTS.shared)).join("")}</select></label>
          <label class="gm-switch"><input type="checkbox" id="gm-graphs" checked><span>CUDA graphs</span></label>
          <label class="gm-switch"><input type="checkbox" id="gm-radix" checked><span>Radix 缓存</span></label>
          <label class="gm-switch"><input type="checkbox" id="gm-clock"><span>显卡过热</span></label>
        </div>
        <p class="gm-sr" data-gm-live aria-live="polite"></p>
      </div>

      <aside class="gm-left" aria-label="运行步骤与场景">
        <div class="gm-mode" role="group" aria-label="播放模式"><button type="button" data-gm-mode="manual" aria-pressed="true">手动</button><button type="button" data-gm-mode="auto" aria-pressed="false">自动</button></div>
        <ol class="gm-steps">${M.STEPS.map((step, i) => `<li><button type="button" class="gm-stepbtn" data-gm-stepbtn="${i}" data-status="${i ? "later" : "next"}"${i ? " disabled" : ""}><span class="gm-num">${i + 1}</span><span class="gm-stepname">${escape(step.name)}</span></button></li>`).join("")}</ol>
        <a href="#" class="gm-restart" data-gm-restart>从头开始</a>
        <h2 class="gm-gap">试着让它出错</h2>
        <p class="gm-muted">每个场景都会切换设置，并重新运行一个请求。所有数字都来自实测。</p>
        <div class="gm-scenarios">${scenarios}</div>
        <div class="gm-look gm-look--side" role="group" aria-label="图表样式">
          <label>手绘抖动 <input type="range" id="gm-wobble" min="0" max="5" step="0.1" value="1.6"></label>
          <span class="gm-swatches" role="group" aria-label="电路板阻焊层颜色">电路板 ${Object.keys(PALETTES).map((name) => `<button type="button" class="gm-sw" data-gm-pal="${name}" aria-label="${({green:"绿色",blue:"蓝色",red:"红色",black:"黑色",purple:"紫色"}[name] || name)}" aria-pressed="${name === "green"}"></button>`).join("")}</span>
          <label class="gm-switch"><input type="checkbox" id="gm-labels" checked><span>显示标注</span></label>
        </div>
      </aside>

      <div class="gm-center">
        <p class="gm-hintbar"><span data-gm-hint>1. 请求通过网线进入。</span><span class="gm-badge" data-gm-badge title="动画速度与实测时间的对比">就绪</span></p>
        <div class="gm-figure iso iso-ink">${plate}</div>
        <p class="gm-flash" data-gm-flash aria-live="polite"></p>
        <p class="gm-idea"><strong>核心思路</strong>解码速度取决于内存带宽，而非计算量；KV 缓存池决定能同时服务多少用户。</p>
        ${STEP}
        <p class="gm-now"><span>当前阶段</span><strong data-gm-stage-name>就绪</strong></p>
      </div>

      <aside class="gm-right" aria-label="运行详情">
        <div class="gm-readouts gm-readouts--side" aria-label="实时读数">
          <div class="gm-readout"><span>KV 缓存池</span><strong data-gm-pool>0</strong></div>
          <div class="gm-readout"><span>请求数</span><strong data-gm-running>0</strong></div>
          <div class="gm-readout"><span>每步 token 数</span><strong data-gm-tps>0</strong></div>
          <div class="gm-readout"><span>权重读取量</span><strong data-gm-share>0</strong></div>
          <div class="gm-readout"><span>每 token 耗时</span><strong data-gm-tpot>0</strong></div>
          <div class="gm-readout"><span>首 token</span><strong data-gm-ttft>0</strong></div>
          <div class="gm-readout"><span>输出 token</span><strong data-gm-toks>0</strong></div>
          <div class="gm-readout"><span>时钟频率</span><strong data-gm-clock>0</strong></div>
        </div>
        <div class="gm-tabs" role="tablist" aria-label="详细信息">
          <button type="button" role="tab" id="gm-tab-run" aria-controls="gm-panel-run" aria-selected="true" data-gm-tab="run">运行</button>
          <button type="button" role="tab" id="gm-tab-memory" aria-controls="gm-panel-memory" aria-selected="false" tabindex="-1" data-gm-tab="memory">内存</button>
          <button type="button" role="tab" id="gm-tab-inspect" aria-controls="gm-panel-inspect" aria-selected="false" tabindex="-1" data-gm-tab="inspect">部件</button>
          <button type="button" role="tab" id="gm-tab-trace" aria-controls="gm-panel-trace" aria-selected="false" tabindex="-1" data-gm-tab="trace">轨迹</button>
          <button type="button" role="tab" id="gm-tab-specs" aria-controls="gm-panel-specs" aria-selected="false" tabindex="-1" data-gm-tab="specs">规格</button>
        </div>
        <div class="gm-panel" id="gm-panel-run" role="tabpanel" aria-labelledby="gm-tab-run" data-gm-panel="run">
          <p class="gm-label">设备</p>
          <p class="gm-work" data-gm-model></p>
          <p class="gm-label">工作负载</p>
          <p class="gm-work" data-gm-work></p>
          <p class="gm-label">结果 <span class="gm-status" data-gm-status data-status="served">已响应</span></p>
          <p class="gm-truth" data-gm-outcome></p>
          <p class="gm-muted" data-gm-measured></p>
          <p class="gm-honest">这是交互模拟。页面不会在浏览器中运行模型。缓存池大小、权重大小、分块大小、单步时间、首 token 时间和吞吐量，均取自 SGLang 101 在 NVIDIA L4 与 NVIDIA GB10 上采用三个随机种子运行所得数据的中位数。接纳请求数和权重读取占比，是根据这些数据和公开带宽计算得出。页面会标出未实测的设置。动画速度便于阅读，未按真实时间缩放。</p>
          <div class="gm-share">
            <button type="button" class="gm-btn" data-gm-copy>复制当前配置链接</button>
          </div>
          <a class="gm-btn gm-poster" href="anatomy/${SLUG}-poster.png" download>下载海报</a>
        </div>
        <div class="gm-panel" id="gm-panel-memory" role="tabpanel" aria-labelledby="gm-tab-memory" data-gm-panel="memory" hidden>
          <ul class="gm-legend">${legend}</ul>
          <ul class="gm-memory" data-gm-memory></ul>
          <p class="gm-muted" data-gm-memory-note></p>
        </div>
        <div class="gm-panel" id="gm-panel-inspect" role="tabpanel" aria-labelledby="gm-tab-inspect" data-gm-panel="inspect" hidden>
          <div class="gm-parts">${parts}</div>
          <div class="gm-inspect" data-gm-inspect aria-live="polite"><p class="gm-muted">点击机器部件或从列表中选择一项，查看它如何处理一个请求。</p></div>
        </div>
        <div class="gm-panel" id="gm-panel-trace" role="tabpanel" aria-labelledby="gm-tab-trace" data-gm-panel="trace" hidden>
          <p class="gm-muted">每行记录请求处理中的一个步骤。</p>
          <ol class="gm-trace" data-gm-trace></ol>
        </div>
        <div class="gm-panel" id="gm-panel-specs" role="tabpanel" aria-labelledby="gm-tab-specs" data-gm-panel="specs" hidden>
          <p class="gm-label">NVIDIA L4</p>
          <dl class="gm-specs">${specRows("l4")}</dl>
          <ul class="gm-abstract">${abstract("l4")}</ul>
          <p class="gm-label">NVIDIA GB10</p>
          <dl class="gm-specs">${specRows("gb10")}</dl>
          <ul class="gm-abstract">${abstract("gb10")}</ul>
          <p class="gm-source-line">硬件资料：NVIDIA L4 产品页和产品简介、NVIDIA Ada GPU 架构白皮书、NVIDIA DGX Spark 产品页和用户指南，以及 Hot Chips 2025 上有关 GB10 的演讲。</p>
        </div>
      </aside>
    </section>
    </div>

    <section class="gm-why container">
      <h2>机器展示了什么</h2>
      <div class="gm-why-grid">
        <p><strong>Decode 就是读取内存。</strong>L4 上以 BF16 运行 Qwen3-8B 时，每步解码读取 16.41 GB 权重。按 300 GB/s 峰值带宽计算，至少需要 54.7 ms；单用户实测一步耗时 60.16 ms。此时 SM 在等待数据。</p>
        <p><strong>读取字节更少，单步速度更快。</strong>L4 上的 FP8 权重为 8.81 GB。单用户每步降至 39.66 ms，释放的内存让 KV 缓存池从 24,094 扩大到 142,369 个 token。64 个用户时，输出速度从 250.85 提升到 735.91 tok/s。</p>
        <p><strong>缓存池决定哪些请求能运行。</strong>只有池中有空间时，调度器才会接纳请求。64 个用户同时请求时，BF16 缓存池只能容纳 37 个，其余请求需要等待。内存比例为 0.74 时，四个 2,048-token 前缀无法同时放入，首 token 中位时间为 12.6 秒；共享前缀为 1,024 个 token 时则为 0.47 秒。</p>
        <p><strong>启动间隔很短。</strong>未启用 CUDA graphs 时，每次 kernel 启动都要由主机发起。L4 单用户每步约 60 ms，启动间隔只增加 0.47 ms。相比读取权重的时间，启动路径影响很小。</p>
      </div>
      <div class="gm-cta">
        <p>在你自己的 GPU 上测量。</p>
        <a class="gm-btn gm-btn--primary" href="manual-sglang-101.html">阅读 SGLang 101 手册</a>
        <a class="gm-btn" href="/lesson?path=${encodeURIComponent("phases/17-infrastructure-and-production/09-production-quantization")}">生产环境中的量化</a>
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
const count = Object.values(RIGS).map((rig) => `${rig.name} ${rig.items.length} items`).join(", ");
console.log(M.selfCheck());
console.log("wrote", OUT, (html.length / 1024).toFixed(0) + " KB", count);
