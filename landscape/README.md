# AI 工程工具全景

面向 AI 工程师的开放工具图谱，收录开源与闭源工具，按各自承担的工程职责分组，并关联课程中的对应学习阶段。页面地址：[aieng-zh.cn/landscape](https://aieng-zh.cn/landscape)。

收录完全免费。每个工具对应 [`entries/`](entries/) 目录下的一个独立 JSON 文件。

## 提交你的工具

以下三种方式任选其一，最终都会合并到同一目录。

### 1. 使用网页表单（约 2 分钟）

1. 打开 [提交工具表单](https://aieng-zh.cn/landscape#add)。
2. 填写 6 项表单信息（X 账号选填），表单会实时校验格式。
3. 点击 **在 GitHub 发起 Pull Request**，GitHub 会自动打开预填好的新建文件页面。
4. 点击 **Commit changes**，然后点击 **Create pull request**（GitHub 会自动创建 fork）。

无需克隆仓库，也不用手写 JSON。

### 2. 手动添加文件

创建 `landscape/entries/<your-tool>.json`：

```json
{
  "name": "Acme Evals",
  "url": "https://acme.dev",
  "category": "evaluation",
  "description": "针对模型输出运行评测套件并报告回归问题。",
  "open_source": true,
  "repo": "https://github.com/acme/evals",
  "logo_url": "https://acme.dev/logo.svg"
}
```

然后运行本地校验：

```bash
node site/build-landscape.js --check
```

### 3. 通过 Issue 提交

平时不常用 GitHub？可以 [填写工具提交 Issue](https://github.com/fancyboi999/ai-engineering-from-scratch-zh/issues/new?template=landscape_tool.yml)，由维护者代为录入。

## 字段说明

| 字段 | 是否必填 | 规则 |
|---|---|---|
| `name` | 是 | 工具名称，不超过 60 个字符。 |
| `url` | 是 | 工具官网，仅限公网 `https://` 地址。 |
| `category` | 是 | 来自 [`categories.json`](categories.json) 的一个分类 ID。 |
| `also` | 否 | 最多 3 个附加分类 ID，用于兼顾多项职责的工具，由维护者设置。 |
| `description` | 是 | 一句话客观说明工具做什么，不超过 200 个字符，以句号（`。` 或 `.`）结尾，不含排名与宣传语。 |
| `open_source` | 是 | `true` 或 `false`。 |
| `repo` | 开源工具必填 | 位于 GitHub、GitLab 或 Codeberg 的公开源码仓库地址。 |
| `x` | 否 | 工具的 X 账号名，不带 `@`。 |
| `logo_url` | 二选一 | SVG 或 PNG 格式 Logo 的公网链接，合并后由工作流自动拉取入库。 |
| `logo` | 二选一 | `<your-tool>.svg` 或 `<your-tool>.png`，需在同一 PR 中将文件放到 `site/logos/landscape/`。 |

文件名即工具 ID，只允许小写字母、数字和连字符（`-`）。

## Logo 规范

- 仅支持 SVG 或 PNG，文件大小不超过 100 KB，优先推荐 SVG。
- PNG 宽高均不少于 48 像素，建议 128 像素及以上以保持清晰。
- 方形图标展示效果最佳，所有 Logo 均显示在白色底框上。
- SVG 不允许包含脚本、嵌入图片或外部资源链接，校验器会自动拒绝。
- Logo 商标归原权利人所有，仅在拥有合法分享权限时提交。

## 分类结构

全部分类归属 6 个大组：模型与算力、开发者工具、数据与检索、Agent 基础设施、语音与多媒体、Agent 产品。完整分类与 ID 见 [`categories.json`](categories.json)。通用对话助手、大模型厂商 Agent 和编程助手分属不同分类，因为厂商的聊天应用、任务型 agent 产品和编程 agent 面向的是不同场景。

同一分类内的工具统一按名称字母顺序公平排列。

如需提议新分类，请先开 Issue 讨论；一个新分类至少需要 3 个无法归入现有分类的工具。

## 收录规则

1. **开源工具**：需拥有公开仓库且 Star 数达到 2,500 及以上。
2. **闭源工具**：需在自有域名下提供上线产品与公开文档，不接受 `vercel.app` 等预览或共享托管域名。
3. **每个工具只收录一条**，归入最贴切的主分类。
4. **由工具团队成员提交**，也可由维护者主动补充。
5. **免费收录**，全部工具按名称字母顺序公平展示，不设付费置顶位。
6. **外链附带 `rel="nofollow"`**，收录不作为外链推广渠道。
7. **清理停更项目**：连续 12 个月无发布或提交的工具会被移出图谱。
8. **每个 PR 仅提交一个工具**：批量提交或自动化灌水会被直接关闭。

合规条目通常在 7 天内由维护者合并。

## 构建方式

`site/build-landscape.js` 读取 `categories.json` 和 `entries/` 中的全部条目，按照 `site/landscape-rules.js` 中的共享规则校验，并输出页面所需的 `site/landscape-data.js` 与打包 Logo 文件。网页表单复用同一套规则文件，保证前端提示与 CI 检查一致。

| 命令 | 作用 |
|---|---|
| `node site/build-landscape.js --check` | 离线校验全部条目与本地 Logo 文件。 |
| `node site/build-landscape.js --check --remote` | 额外下载待落盘的 `logo_url` 并校验文件有效性。 |
| `node site/build-landscape.js --fetch-logos` | 将待落盘的 `logo_url` 保存至 `site/logos/landscape/`。 |
| `node site/build-landscape.js --stars <entry files>` | 检查开源工具仓库的 Star 数，低于 2,500 时失败；CI 仅对 PR 新增或改动的条目执行。 |
| `node site/build-landscape.js` | 生成 `site/landscape-data.js` 与 `site/landscape-logos-*.bin`。 |
| `node --test site/test_landscape.js` | 运行工具全景单元测试。 |

`site/landscape-data.js` 与 `site/landscape-logos-*.bin` 为构建产物，不要提交到 Git。

## 数据来源

首批 Agent 产品与 Agent 基础设施条目源自上游 [rohitg00/ai-engineering-from-scratch](https://github.com/rohitg00/ai-engineering-from-scratch)（初始种子来自 Assistant Benchmark 的 [The AI Agent Market Map](https://assistantbenchmark.com/articles/the-ai-agent-market-map)）。种子 PNG 图标取自对应产品官网图标或项目组织的 GitHub 头像。
