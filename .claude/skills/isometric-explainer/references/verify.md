# 验证循环

每次构建后检查像素与行为，修复全部发现后再运行。

## 检查内容

1. **模型测试。**node --test 通过，包含配置遍历。
2. **构建为源。**重建后对比，发布页没有差异。
3. **屏幕。**桌面 1440×900、手机 390×844，均检查明暗主题，设备缩放 2。用 seek(n) 停在中间事件，使运动部件离开初始位置。
4. **无横向滚动。**每种尺寸 document.documentElement.scrollWidth-innerWidth 为 0。
5. **4 倍近景。**设备缩放 4，逐工位裁剪，检查部件间缝隙、铭牌文字越界、线端过短。
6. **线端。**未标 data-free 的开放端点都落在已绘制实体上。
7. **场景遍历。**加载每种配置，seek 到每个事件并结束，收集 console.error 和 pageerror，必须为 0。
8. **接触表。**每事件一帧排列为网格。读者应能不依赖图注跟随流程。
9. **展开姿态。**展开后等 1.5 秒，检查部件不超出舞台。

## 真实运行发现的缺陷

以下问题由本循环发现，单看代码未发现：

- 工位顶部卡片深度键小于工位，始终被遮住。修正：正深度偏置。
- 车架停靠时遮住工位正面铭牌。修正：移到无运动部件经过的位置。
- 展开部件超出舞台顶部。修正：fitProjection 包含展开最高点。

## 脚本

示例使用 Playwright。在临时目录安装后运行 node verify.mjs out.html shots。已有受控浏览器工具时可用等价方法，保留同样的验收条件。

```js
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const [page, out] = process.argv.slice(2);
const url = pathToFileURL(page).href;
const browser = await chromium.launch();
const errors = [];
const watch = (tab, tag) => {
  tab.on("console", (m) => m.type() === "error" && errors.push(`${tag}: ${m.text()}`));
  tab.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
};

for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const tab = await ctx.newPage();
    watch(tab, `${name}/${theme}`);
    await tab.goto(`${url}?still&theme=${theme}`);
    await tab.evaluate(() => window.__machine.seek(5));
    await tab.screenshot({ path: `${out}/${name}-${theme}.png` });
    const scroll = await tab.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (scroll > 0) errors.push(`${name}/${theme}: ${scroll}px sideways scroll`);
    await ctx.close();
  }
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 });
const tab = await ctx.newPage();
watch(tab, "sweep");
await tab.goto(`${url}?still`);
for (const config of [{ cache: true }, { cache: false }]) {
  const n = await tab.evaluate((c) => (window.__machine.load(c), window.__machine.state.sim.events.length), config);
  for (let i = 0; i < n; i++) {
    await tab.evaluate((i) => window.__machine.seek(i), i);
    await (await tab.$("svg[viewBox]")).screenshot({ path: `${out}/sweep-${JSON.stringify(config).replace(/\W/g, "")}-${String(i).padStart(2, "0")}.png` });
  }
  await tab.evaluate(() => window.__machine.finish());
}

const loose = await tab.evaluate(() => {
  const out = [];
  for (const line of document.querySelectorAll(".iso-line:not(.iso-edge):not(.iso-crease):not(.iso-bevel)")) {
    if (line.closest('[style*="display: none"], [style*="display:none"]')) continue;
    const free = line.getAttribute("data-free");
    if (free === "") continue;
    const m = line.getScreenCTM();
    for (const sub of (line.getAttribute("d") || "").split("M").filter(Boolean)) {
      if (/Z\s*$/.test(sub)) continue;
      const n = sub.match(/-?[\d.]+/g).map(Number);
      for (const [end, x, y] of [["start", n[0], n[1]], ["end", n.at(-2), n.at(-1)]]) {
        if (free === end) continue;
        const p = new DOMPoint(x, y).matrixTransform(m);
        const hits = document.elementsFromPoint(p.x, p.y).filter((el) => el !== line && el.closest("[data-i]"));
        if (!hits.length) out.push(`${line.closest("[data-i]").dataset.i} ${end}`);
      }
    }
  }
  return out;
});
errors.push(...loose.map((id) => `loose line end: ${id}`));

await tab.evaluate(() => window.__machine.toggleExplode());
await tab.waitForTimeout(1500);
await (await tab.$("svg[viewBox]")).screenshot({ path: `${out}/exploded.png` });
await browser.close();
console.log(errors.length ? errors.join("\n") : "0 errors");
```

线端检查能发现悬在空白纸面上的端点，但不能发现实体前方空中结束的杆。这类问题需要查看 4 倍近景。

## 接触表

用四列 CSS 网格显示遍历帧，写入小型 HTML，以 fullPage:true 截图，用一张图展示全部运行。

## 近景

设备缩放 4，用 page.screenshot({clip}) 裁剪。clip 取 SVG 包围框，例如以工位为中心取图宽 30%。每次构建逐工位查看一次。
