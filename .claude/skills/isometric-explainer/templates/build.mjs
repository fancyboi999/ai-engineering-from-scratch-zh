import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || join(HERE, "out.html");

const W = 720;
const H = 440;
const AZIMUTH = 60;
const PLATE = { x: -72, y: -38, w: 144, d: 68, r: 4 };
const STOPS = { intake: -48, cache: -16, origin: 16, exit: 48 };
const CONCEPT = { intake: "请求", cache: "缓存", origin: "源站", exit: "响应" };
const EXPLODE = { base: [0, 0, 0], rail: [0, 0, 0], intake: [-16, -8, 10], cache: [-2, -14, 20], origin: [12, -16, 28], exit: [16, 14, 6], carriage: [0, 0, 18] };

const P = k.fitProjection([...k.boxCorners(PLATE, -5, 0), [16, -30, 36], [-16, -34, 30], [28, -46, 64], [-18, -50, 50], [-74, -46, 26]], W, H, { pad: 20, azimuth: AZIMUTH });
const depth = (p) => k.depthOf(p, P);
const S = (paths, style) => k.solidSvg(paths, { tone: "mid", ...style });
const box = (x0, y0, z0, x1, y1, z1, style = {}, r = 0.6) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, r ? 3 : 1), style);
const text = (x, y, z, words, size) => k.faceTextSvg(k.topMatrix([x, y], z, P, "x"), words, { size, tone: "hi", anchor: "middle" });

const items = [];
function put(id, asm, ref, svg, bias = 0) {
  items.push({ id, asm, key: depth(ref) + bias, svg });
}

function plate(asm, cx) {
  const words = CONCEPT[asm];
  const size = 3.4;
  const w = words.length * size * 0.62 + size * 1.8;
  const svg = box(cx - w / 2, 6, 0, cx + w / 2, 11, 0.8, {}, 0.4) + text(cx, 8.5 + size * 0.36, 0.8, words, size);
  put(`tag-${asm}`, asm, [cx, 8.5, 0.4], svg, 1.5);
}

put("base", "base", [0, 0, -100], `<path class="iso-halo" d="${k.haloOf(PLATE, -5, 5, P)}"/>` + S(k.slabOf(PLATE, -5, 5, P, 6, 1)), -1000);
put("rail", "rail", [0, 0, -50], box(-62, -2.5, 0, 62, 2.5, 1.5, { tone: "lo" }, 0) + Object.values(STOPS).map((x) => k.lineSvg(k.lineOnTop([x, -2.5], [x, 2.5], 1.5, P), { tone: "faint" })).join(""), -500);

put("intake", "intake", [-48, -21, 8], box(-58, -28, 0, -38, -14, 16) + box(-51, -14, 6, -45, -2.5, 7, { tone: "lo" }, 0));
plate("intake", -48);

put("cache", "cache", [-16, -21, 5], box(-26, -30, 0, -6, -12, 10) + box(-18, -36, 0, -14, -32, 27, {}, 0.4));
put("cache-arm", "cache", [-16, -16, 25], box(-18, -36, 25, -14, 0, 28, { tone: "hi" }, 0.4), 4);
put("probe", "cache", [-16, 0, 20], box(-19, -3, 18, -13, 3, 25, { tone: "hi" }), 6);
for (let i = 0; i < 3; i++) {
  put(`bin${i}`, "cache", [-16, -27 + i * 4, 13], `<g data-live="bin${i}" style="display:none">${box(-21, -27 + i * 4, 10, -11, -26.2 + i * 4, 17, { tone: "hi" }, 0)}</g>`, 3 + 0.1 * i);
}
plate("cache", -16);
const dial = [-32, 19];
const dialSvg = S(k.cylinder(dial[0], dial[1], 6, 0, 2, P, 40)) + k.lineSvg(k.ring(dial[0], dial[1], 4.6, 2, P, 40), { tone: "lo" });
const ticks = [0, 1, 2, 3].map((n) => tickOf(n / 3)).join("");
put("gauge", "cache", [dial[0], dial[1], 1], dialSvg + k.lineSvg(ticks, { tone: "mid" }) + `<path class="iso-line" data-tone="hi" data-live="needle" d=""/>` + S(k.cylinder(dial[0], dial[1], 0.8, 2, 0.4, P, 12), { tone: "hi" }));
function tickOf(share) {
  const a = -0.75 * Math.PI + share * 1.5 * Math.PI;
  return k.lineOnTop([dial[0] + Math.sin(a) * 4.6, dial[1] - Math.cos(a) * 4.6], [dial[0] + Math.sin(a) * 6, dial[1] - Math.cos(a) * 6], 2, P);
}

put("origin", "origin", [16, -21, 10], box(6, -32, 0, 26, -12, 6) + box(12, -30, 6, 20, -24, 34, { tone: "mid" }, 0.4));
put("origin-arm", "origin", [16, -12, 30], box(13, -24, 28, 19, 4, 32, { tone: "hi" }, 0.4) + `<path class="iso-line" data-tone="mid" data-live="rod" style="stroke-width:1.4" d=""/>`, 4);
put("head", "origin", [16, 0, 22], box(13.5, -3, 19, 18.5, 3, 25, { tone: "hi" }), 6);
plate("origin", 16);

put("exit", "exit", [48, 20, 1], box(40, 13, 0, 56, 27, 1.5, { tone: "lo" }) + box(40, 26, 1.5, 56, 27, 4, {}, 0));
for (let i = 0; i < 3; i++) {
  put(`tray${i}`, "exit", [48, 19, 2 + i], `<g data-live="tray${i}" style="display:none">${box(43, 15, 1.5 + i * 0.8, 53, 23, 2.1 + i * 0.8, { tone: "hi" }, 0.2)}</g>`, 3 + 0.1 * i);
}
plate("exit", 48);

put("carriage", "carriage", [0, 0, 6], S(k.cylinder(0, 0, 6, 1.5, 3, P, 40)) + box(-4, -0.4, 4.5, 4, 0.4, 15, { tone: "hi" }, 0), 0);

const exportsOf = (source) => [...source.matchAll(/^export (?:const|function|let) ([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
function inline(file, name) {
  const source = readFileSync(join(HERE, file), "utf8");
  return `const ${name} = (() => {\n${source.replace(/^export /gm, "")}\nreturn { ${exportsOf(source).join(", ")} };\n})();`;
}

const V = [depth([1, 0, 0]), depth([0, 1, 0]), depth([0, 0, 1])];
const DATA = { P, V, STOPS, EXPLODE, DIAL: [dial[0], dial[1], 2.4], ROD: [16, 0, 28, 25], items: items.map(({ id, asm, key }) => ({ id, asm, key })) };
const LABEL = "轨道车架载着请求卡片，经过带探针的缓存箱、源站压机与响应托盘。表盘记录缓存命中次数。";
const body = items.map((item) => `<g data-i="${item.id}" data-asm="${item.asm}">${item.svg}</g>`).join("");
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: `<g data-layer>${body}</g>` }).replace("<svg ", "<svg data-ie-svg ");
const script = [inline("../kit/iso-kit.mjs", "K"), inline("model.mjs", "M"), `const D = ${JSON.stringify(DATA)};`, readFileSync(join(HERE, "live.js"), "utf8")].join("\n");

const CSS = `
.iso{--anatomy-lit:#6b8eff;--anatomy-lit-top:#1d2650;--anatomy-lit-shade:#182045}
.iso[data-theme="light"]{--anatomy-lit:#3553ff;--anatomy-lit-top:#f1f3ff;--anatomy-lit-shade:#e0e5ff}
*{box-sizing:border-box}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.5 ui-sans-serif,system-ui,sans-serif}
.ie{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto auto;height:100svh;min-height:560px;padding:12px 16px;gap:10px}
.ie h1{margin:0;font:600 1.4rem/1.2 var(--anatomy-mono);color:var(--anatomy-strong)}
.ie-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-family:var(--anatomy-mono)}
.ie-btn{min-height:44px;padding:8px 14px;border:1px solid var(--anatomy-mid);background:var(--anatomy-card);color:var(--anatomy-strong);font:inherit;cursor:pointer}
.ie-btn[aria-pressed="true"]{background:var(--anatomy-strong);color:var(--anatomy-page)}
.ie-stage{min-height:0;display:flex;outline:none}
.ie-stage:focus-visible{outline:1px solid var(--anatomy-muted)}
.ie-stage .iso-svg{width:100%;height:100%}
.ie-readouts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:var(--anatomy-faint);border:1px solid var(--anatomy-faint)}
.ie-readouts div{display:grid;gap:2px;padding:8px 10px;background:var(--anatomy-page)}
.ie-readouts span{font:0.7rem var(--anatomy-mono);text-transform:uppercase;color:var(--anatomy-muted)}
.ie-readouts strong{font:500 0.86rem var(--anatomy-mono);color:var(--anatomy-strong);font-variant-numeric:tabular-nums}
.ie-honest{margin:0;color:var(--anatomy-muted);font-size:0.82rem}
[data-hot] .iso-edge{stroke:var(--anatomy-lit)}
[data-hot] .iso-top{fill:var(--anatomy-lit-top)}
[data-hot] .iso-shade{fill:var(--anatomy-lit-shade)}
[data-hot] .iso-face-text{fill:var(--anatomy-lit)}
[data-off]{opacity:.35}
@media (max-width:640px){.ie{height:auto}.ie-stage .iso-svg{height:auto}.ie-readouts{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>缓存内部机制</title>
<style>${k.ISO_CSS}${CSS}</style>
</head>
<body class="iso">
<script>
  var asked = /[?&]theme=(light|dark)/.exec(location.search);
  document.body.setAttribute("data-theme", asked ? asked[1] : matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
</script>
<main class="ie">
  <h1>缓存内部机制</h1>
  <div class="ie-bar" role="group" aria-label="机器控制">
    <button type="button" class="ie-btn" data-ie-run aria-pressed="false">运行</button>
    <button type="button" class="ie-btn" data-ie-step>单步</button>
    <button type="button" class="ie-btn" data-ie-break>禁用</button>
    <button type="button" class="ie-btn" data-ie-repair>修复</button>
    <button type="button" class="ie-btn" data-ie-explode aria-pressed="false">展开</button>
    <button type="button" class="ie-btn" data-ie-reset>重置</button>
    <label><input type="checkbox" id="ie-cache" checked> 缓存</label>
    <button type="button" class="ie-btn" data-ie-theme>主题</button>
  </div>
  <div class="ie-stage" data-ie-stage tabindex="0" role="group" aria-label="缓存机器。空格运行或暂停，右箭头单步，E 展开，B 禁用缓存，R 修复。">${svg}</div>
  <div class="ie-readouts" aria-label="实时读数">
    <div><span>阶段</span><strong data-ie-stage-name>就绪</strong></div>
    <div><span>单步</span><strong data-ie-steps>0</strong></div>
    <div><span>缓存命中</span><strong data-ie-hits>0</strong></div>
    <div><span>源站读取</span><strong data-ie-fetches>0</strong></div>
    <div><span>模拟时间</span><strong data-ie-clock>0 ms</strong></div>
  </div>
  <p class="ie-honest">这是模拟。时间是模型设定的固定成本，并非实测。 <span data-ie-live aria-live="polite"></span></p>
</main>
<script>(() => {
${script.replace(/<\/(script)/gi, "<\\/$1")}
})();</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log("wrote", OUT, (html.length / 1024).toFixed(0) + " KB", items.length + " items");
