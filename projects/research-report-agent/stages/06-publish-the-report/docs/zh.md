# 发布报告

> 可读报告和机器可读轨迹服务于不同读者。

**类型：** Build
**语言：** Python, TypeScript
**阶段：** 6 / 7（core）
**预计时间：** 约 2 小时

## 构建内容

Python 运行流水线，序列化 `report.json` 和 `trace.json`。`viewer/render.ts` 消费 JSON，生成独立的 `report.html`。查看器是真实 TypeScript，包含章节、句子、片段、文档和轨迹的接口。使用 Node 22.18 或更新版本的内置类型剥离；已验证的本地运行时为 Node 25.6.1。

```figure
pj-rra-publish
```

JSON 边界强制发布契约经得住序列化。直接将 Python 对象传入模板不会测试这个边界。TypeScript 类型注解记录契约，运行时验证拒绝格式错误文件，因为类型不验证 JSON。

## 保持证据契约完整

```json
{
  "schema_version": 1,
  "question": "How does a secrets proxy protect credentials?",
  "sections": [],
  "snippets": {},
  "documents": [],
  "trace": null
}
```

每条渲染引用必须解析到片段和文档。验证原始文档切片等于片段文本。Python 偏移量计 Unicode 码点；JavaScript 字符串切片计 UTF-16 单元。使用 `[...source.text].slice(start, end).join('')`，让前面的 emoji 不会移动证据范围。

按首次出现编号脚注。两句复用 `S4` 应生成两个引用链接和一个脚注。即使复用脚注，提示框 id 仍必须唯一。转义问题文本、章节标题、来源标题、片段和轨迹细节。来源链接只允许 HTTP 或 HTTPS；仅 HTML 转义不能消除 `javascript:` URL 的危险。

## 让产物好用

悬停或键盘聚焦引用可显示精确源句子。点击跳到编号脚注。原生 `<details>` 展开运行轨迹，无需客户端框架或 JavaScript。页面遵循明暗色偏好，适应手机视口。

报告仍可作为本地文件使用。交互采用 HTML 和 CSS，阅读无需网络服务或安装包。

## 追踪流水线

按顺序运行并计费：`index`、`plan`、`gather`、`write`、`verify`。每条记录包含名称、耗时毫秒和结构化细节。轨迹保留 `run_id`、`question`、`started_at`、`counts`、`budget` 和 `terminal_state`。

预算耗尽时追加 `budget_exceeded`，产生 `failed` 状态，并渲染已收集的证据。区分有用的失败产物和渲染器崩溃。运行无法收集支持主张时，空报告是有效的。

## 你的任务

完成流水线、Python 载荷序列化器和进程适配器，以及类型化渲染器。`run_pipeline` 返回 `(report, trace, html)`，提供输出目录时写出三个文件。

```bash
python3 scripts/project_test.py research-report-agent --stage 6 --path my-report-agent
python3 projects/research-report-agent/solution/run_report.py \
  "How does a secrets proxy protect API keys from prompt injection?" \
  --code my-report-agent --out out
node my-report-agent/viewer/render.ts out/report.json out/report.html
open out/report.html
```

## 预期结果

参考命令产生 `completed` 状态、4 个章节、10 个句子，删除数为 0。目录包含 `report.json`、`report.html` 和 `trace.json`。悬停或聚焦 `[1]` 查看精确引文，再打开运行轨迹检查五个步骤。耗时和运行 id 每次不同。

第 6 阶段有 7 个 Node 测试和 7 个 Python 集成测试，检查 Unicode 偏移量、转义、不安全 URL、重复引用、悬空证据及极小预算失败。

## 自测

渲染器有类型，为什么 JSON 仍需运行时验证？为什么 emoji 后 Python 与 JavaScript 偏移量不一致？报告没有章节时，工程师需要轨迹提供什么？

## 进一步探索

添加带分页脚注的打印样式，或在独立审查章节渲染被删除的主张。让无支持主张与已发布证据有明显区别。

## Orchard 案例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 5 阶段](../../05-verify-every-claim/docs/zh.md)。

发布一个版本化报告载荷，供 TypeScript 查看器和独立报告评判器使用。Orchard 前后对比流程写出 changes.json，列出删除主张、新增主张和变化的源范围。

```text
report.json -> viewer + judge
60 分钟句子 -> removed_claims
15 分钟句子 -> added_claims
```

## 构建并检查

发布时再次验证源切片。HTML 渲染前转义文本；源内容是数据，不是可执行标记。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，导入你的函数，不以参考方案替代。

```bash
python3 scripts/project_test.py research-report-agent --stage 6 --path learning-artifacts/research-report-agent
```

预测上面的中间状态，再运行本阶段。全新桩实现会失败；参考方案通过不能证明学习者工作区已完成。

## 下一步探查

审查者如何区分主张改变，和措辞未变但支持证据改变？
