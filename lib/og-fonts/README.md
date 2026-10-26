# 中文社交卡片字体

运行时用 Node 标准库解压 bitmap atlas 并输出 PNG，不加载系统字体、不启动浏览器、不访问字体服务。

## 来源与许可

- `display.json`：VT323；`mono.json`：JetBrains Mono；`serif.json`：Source Serif 4。来自冻结上游 `56c886c8821fc488b6f9608895c983d18f0d1ea3` 的 atlas，许可与版权在 `OFL.txt`。
- `cjk.json`：从 Noto Sans CJK SC Regular **2.004** 的官方开源字体栅格化。字体内嵌版权为 © 2014–2021 Adobe，SIL Open Font License 1.1，见 `Noto-OFL.txt`。此 atlas 没有采用系统专有字体。
- 固定源文件：<https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf>
- 源字体 SHA-256：`2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b`。脚本不接受其他文件，也不自动下载。
- 许可源：<https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/LICENSE>；字体内嵌 name 表 ID 0、5、13、14 可核验版权、版本与许可。

## 构建与补齐字集

字集以 `charset.txt` 和 `cjk.json` 的当前内容为准。三个拉丁 atlas 保留上游字体。字集来自当前课程与元数据，不是全 Unicode 字库。 未覆盖的汉字会抛出带字符的错误，不会静默删除、替换成问号或使用系统字体方框。

先将固定字体下载到临时目录，或者使用已校验的离线副本：

```bash
curl -L --fail -o /tmp/NotoSansCJKsc-Regular.otf https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf
```

精确重建当前字集（输出可放在 `/tmp`，不修改仓库）：

```bash
node scripts/build-og-fonts.js --font /tmp/NotoSansCJKsc-Regular.otf --chars lib/og-fonts/charset.txt --out /tmp/og-font-rebuild
cmp lib/og-fonts/cjk.json /tmp/og-font-rebuild/cjk.json
```

加入中文项目、手册或新 SEO 数据后，在整合工作区补齐并提交 atlas 与字集：

```bash
node scripts/build-og-fonts.js --font /tmp/NotoSansCJKsc-Regular.otf --root /path/to/integrated-repo
node scripts/test_og.js --artifacts /tmp/og-artifacts
node scripts/check_og_cards.js --require-manifests
```

`--root` 默认仓库根；脚本收集 `phases/`、`certifications/`、`projects/`、`manuals/` 的 `zh.md`，以及已有 `site/data.js`、`site/og-cards.json`、`site/lesson-seo.json`、`site/certification-seo.json`、`site/projects-data.json`、`site/manuals-data.json` 中的字符。如有额外元数据，先生成到这些 manifests，或用 `--chars` 提供按 Unicode 码点排序、去重的补充字集。`--out` 默认 `lib/og-fonts`，不会写其他源码。

构建前解析字体 Unicode cmap，确认字符有真实 glyph，再通过 localhost HTTP 载入指定字体。无法映射的源符号会打印 warning；已有 renderer 明确转换规则的数学符号可回退，其余符号会使覆盖检查失败。组合附加符先按 NFC 归一化，剩余组合标记省略，与拉丁字母降级规则配合；这不替代中文 glyph。若固定字体本身缺少所需汉字，应选用可核验许可的补充字体，不能让检查通过却渲染方框。

设置 `CHROME_PATH` 可选择 Chromium 路径。默认 macOS Google Chrome 可执行文件。仅构建需要 Chromium，使用 `/tmp` 的独立 profile，并在结束后删除。相同字体、字集和 Chromium 栅格环境可重复生成；跨 Chromium/平台版本的抗锯齿差异可能改变 atlas，缓存版本会随之更新。

## 大小与内存

当前字体目录约 **2.26 MB**，其中 CJK JSON 约 **1.98 MB**；单张 96px CJK atlas 解压 bitmap **18,159,015 字节**，三个拉丁 atlas 的 bitmap 合计 **1,264,247 字节**。不同显示字号共用 CJK bitmap，不为每个字号重复解压。96px 源 glyph 缩放到标题、标签与摘要，避免只用小尺寸拉丁字体冒充中文。

运行时内存还包括 Node、堆、zlib 临时分配和 bitmap，不能以压缩 JSON 大小估算进程 RSS。API 最多缓存 64 张压缩 PNG。字集补齐会增加包大小和内存，应记录新 bitmap/JSON 大小并重新验证部署包限制。此方案以子集和明确缺字失败换取小 bundle，而不是为完整 CJK 的每个字号生成大 atlas。

## 整合接口

- `lib/og-cards.js`：`cardPath(type,id,spec,lang='zh')`、`cardUrl`、`cardTags`、`stampCards`、`lessonCard`、`trackCard`、`socialCards`。图像固定 `1200×630`；URL 版本包含 renderer、所有 atlas 和 spec 的哈希。核心课卡片页地址仍为 `/lessons/<phase>/<lesson>/`。
- `site/og-cards.js`：`buildOgCards({stats,projects,manuals,terms,phases})` 返回 `{cards}`，只做纯数据生成与 glyph/layout 检查。主构建器负责写 `site/og-cards.json`。`stats` 提供 `lessons/phases/skills/prompts/terms/tracks`。
- `validateOgCards(ogManifest,lessonSeo.lessons,certificationSeo.tracks)` 可在整合构建尾部检查全部卡片。
- `api/og.js` 从 `site/og-cards.json`、`site/lesson-seo.json` 的 `lessons` 对象和 `site/certification-seo.json` 的 `tracks` 对象读取数据。lesson entry 含 `path/title/description/context`；track entry 含 `id/title/description/lessons`。
- 整合配置需将 `/og/:type/:id*.png` 路由到 `/api/og?type=:type&id=:id`，并打包 `lib/og-fonts/**` 与三个 JSON manifest。API 仅支持 GET/HEAD，默认中文；缺版本或旧版本 307 到当前 URL，当前版本一年 immutable；未知卡片、非法 ID 或非中文请求 404，其他方法 405。
- `lib/lesson-document.js` 提供共享中文课程元数据解析，供 Hub、卡片和接口使用。
- 页面 `<head>` 由主构建器插入 `cardTags(cardUrl(...),spec)`；`stampCards` 可更新已有中文域 `/og/` 静态卡片标签，不会替换任意旧 `og-image.png`。
