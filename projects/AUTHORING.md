# 项目编写契约

每个项目通过四到八个递进阶段，教会学习者构建一个有用的产物。每阶段增加一种独立行为，解释具体示例，并测试学习者的实现。参考解和演示用标准库离线运行。政策模拟器必须标明自己是模拟器，不能声称提供操作系统隔离。

## 规划中的项目

尚未实现的构想放在 `projects/roadmap.json` 的 `planned` 下。每项必须有唯一的 `id`、`title`、`level`、`languages`、`source`、`tagline`、`summary`、具体的 `output`、四个拟定的 `milestones`，以及 `prerequisiteProjects` ID。用 `distinctFrom` 和 `firstDemo` 解释独立的教学重点。入门计划可以没有前置项目。规划项目的前置链接必须能解析，且不能形成环。

[ROADMAP.md](ROADMAP.md) 中的可读简介要与元数据一致。使用 `status: "planned"`，不要放空参考实现或宣称可以完成认证。真实项目满足就绪契约后，构建目录中的规划卡片由其 ready 清单替代。

## 文件与元数据

`projects/<id>/project.json` 是目录元数据的权威源。`id` 与目录名一致，使用小写单词和连字符。必填字段包括 `title`、`tagline`、`summary`、`level`（1 到 5）、`hours`、`languages`、`status`（`draft` 或 `ready`）、`source`（`core` 或 `community`）及非空 `stages` 数组。阶段 ID 不重复。只有 README、参考解、各阶段文档、测试和初始文件齐全，才接受 `ready`。草稿不能显示为就绪项目。

```json
{
  "id": "example-project",
  "title": "示例项目",
  "tagline": "一个具体、有用的产物。",
  "summary": "说明要构建什么，以及怎样验证。",
  "level": 2,
  "hours": 8,
  "languages": ["Python", "TypeScript"],
  "status": "draft",
  "source": "community",
  "author": {"name": "你的姓名", "github": "your-handle"},
  "demo": {"command": ["python3", "demo.py"], "cwd": "solution"},
  "stages": [
    {
      "id": "01-first-stage",
      "title": "第一阶段",
      "summary": "一种明确的新能力。",
      "hours": 2,
      "difficulty": "starter",
      "concepts": ["输入校验"],
      "language": "python",
      "timeout": 60
    }
  ]
}
```

每阶段位于 `stages/<stage-id>/`，包含 `docs/zh.md`、`starter/` 和 `tests/`。累计参考实现放在 `solution/`。初始文件路径相对于学习者工作区。初始化会复制所有普通文件，包括 `.rs`、`.ts`、`.go`、fixture 和模块文件。除非显式指定 `--force`，否则保留已有文件。不要在后续初始目录中重复逐步演进的源文件：脚手架应累加，不覆盖学习者的工作。

## 评分运行器

各阶段声明 `language`：`python`、`typescript`、`rust` 或 `go`。混合阶段使用 `language: "rust+python"` 及 `runners: [{"language":"rust"},{"language":"python"}]`。评分器为各运行器设置绝对路径 `PROJECT_WORKSPACE`、`PROJECT_ROOT` 和 `PROJECT_STAGE`，并将工作区放在 `PYTHONPATH` 最前面。

- Python 用 `unittest` 发现 `tests/test_*.py`。正常导入学习者的包。
- TypeScript 用 Node 22.18 及以上、`--experimental-strip-types` 和 `node --test` 运行 `tests/*.test.ts` 或 `tests/*.test.mjs`。用 `pathToFileURL(path.join(process.env.PROJECT_WORKSPACE, 'main.ts'))` 导入学习者文件。只使用可擦除的 TypeScript 语法。
- Rust 用 `rustc --edition 2021 --test` 分别编译每个 `tests/*.rs`，然后运行二进制。用 `include!(concat!(env!("PROJECT_WORKSPACE"), "/main.rs"));` 导入学习者代码，通常放在模块内。不需要 Cargo 依赖。
- Go 将工作区和阶段的 `tests/*.go` 复制到临时目录，运行 `go test -json ./...`。模块工作区应有 `go.mod`；没有时运行器使用 `GO111MODULE=off`。测试相对于 `tests/` 的路径在临时工作区内保持不变。

显式单运行器使用 argv 数组：`"runner": ["node", "--experimental-strip-types", "--test", "{tests}/stage.test.ts"]`。多运行器使用 `"runners": [{"language":"python","argv":["python3","-m","unittest","discover","-s","{tests}"]}]`。支持 `{workspace}`、`{project}`、`{stage}`、`{tests}` 替换。命令不经 shell 执行。自定义运行器必须输出所选语言的标准测试汇总；退出码为零但没有测试仍算失败。

可选的 `requires: ["rustc"]` 列出必需的可执行程序。运行器继承阶段的 `requires` 和 `timeout`（秒，正数，最多 600）。缺少工具产生 `skip`；普通评分可以继续并返回零，但 `--strict` 会令任何跳过都导致命令失败。测试自身的跳过始终阻止生成完成证据。超时和失败测试使命令失败。报告记录工具检测、测试数量、跳过数量及各运行器状态。

## 命令与完成证据

```bash
python3 scripts/project_test.py example-project --init /tmp/example-work
python3 scripts/project_test.py example-project --stage 2 --path /tmp/example-work
python3 scripts/project_test.py example-project --all --solution --strict
python3 scripts/project_test.py --all --solution --strict
python3 scripts/project_test.py example-project --all --path /tmp/example-work --strict --report /tmp/example-result.json
```

`--stage N` 检查 1 到 N 阶段；`--only` 只检查选中的阶段。不带项目 ID 的 `--all` 检查全部已发布的就绪项目。JSON 报告包含 `schemaVersion: 1`、`generatedAt`、`projects` 和汇总的 `certificateEligible`。每项目包含 `id`、`title`、`mode`、`manifestHash`、`selectedStages`、`stages`、`allStagesPassed` 和 `certificateEligible`。每阶段包含 `id`、`number`、`language`、`status`（`pass`、`fail` 或 `skip`）、`tests`、`skippedTests`、`durationMs`、`reason` 和 `runners`。

只有每个声明阶段都运行并通过至少一个测试，且没有跳过的测试，学习者才符合完成条件。参考解运行、缺少运行时、只选部分阶段及失败阶段均不能获得证书。这是本地自报证据，不是加密身份校验或反作弊系统。

## 文档、图表与演示

每课解释要构建什么、为什么重要、完整示例、精确函数契约、测试命令、失败情况和扩展方向。在 `figure` 围栏中嵌入已注册的机制图。原创 SVG provider 放在 `site/figures/projects/<id>.js`，调用 `window.AIFSProjectFigures.register('pj-<id>-1', {title, steps: [{label, detail}], caption})`。每图解释当前阶段的特定机制及状态转换。给学习者可编辑输入和计算出的中间值；一排只切换高亮标签的方框不够。

注册时添加 `lab` 来展示计算机制：

```javascript
lab: {
  controls: [
    {key: 'events', label: '已完成事件', type: 'range', value: 3, min: 0, max: 10, step: 1}
  ],
  calculate(values, stepIndex) {
    return {
      summary: values.events + ' 条回执可供检查。',
      metrics: [{label: '回执', value: values.events}],
      bars: [{label: '已完成事件', value: values.events, max: 10}]
    };
  }
}
```

控件支持 `range`、`number`、`text`、`select` 和 `checkbox`。选择项有 `value` 与 `label`。计算也可返回 `columns` 和 `rows` 作为证据表。共享运行时校验有限数值、转义显示文本、保留焦点并提供重置。领域计算必须与所教契约一致。已有自定义 SVG provider 可调用 `window.AIFSProjectFigures.mountLab(host, lab)`，不用替换其动画。

可选阶段字段 `figure` 指定已注册机制。构建器也从文档提取图表，输出 `figures` 和 `figureScripts`。就绪构建遇到未知图表 ID 会失败。演示元数据用 argv `command` 及项目相对 `cwd`，通常是 `solution`。可选 `path`、`poster` 或 `video` 指向项目内部文件。演示必须终止并展示真实输出。路径遍历和 symlink 越界会被拒绝。

## 发布检查

每阶段至少写五个有意义的测试，覆盖普通输入、边界、畸形输入和失败或对抗情形。保留与演示 fixture 分开的留出案例。测试可观察契约，不复制参考算法。所有宣称支持的语言都必须运行真实实现代码。协议引用当前官方规范和文档，课程正文和代码使用原创内容。

必须有一条文档化命令，接收学习者自己的输入并组合所教函数。只有硬编码演示不足以构成可复用工具。说明输出 schema、集成命令及任何实时 adapter 的范围。核验至少一个导出产物能被预期的下一步消费，包括 HTML 界面下载的批准或进度文件。

阶段测试只能依赖已经讲过的行为，或明确提供的脚手架。初始代码中的函数签名应精确，解释每项隐含前提，用一个完整输入展示所有中间值。初学者不该靠猜返回结构来定位失败。

运行 `--all --solution --strict`，初始化全新工作区，并确认其第一阶段明确失败。评审前运行 `node --test site/test_projects_data.js site/test_project_certificates.js` 和 `node site/build-projects.js --strict`。在 Chromium 桌面及移动宽度、两种主题下检查服务页面，确认控件改变计算输出，录制内容与当前命令相符。HTML 输出录制应展示真实生成界面及证据交互。不要提交生成的 `site/projects-data.js`。社区提交保留作者署名，并经 pull request 评审。

## 可选框架对照

阶段可以添加可选 SDK 对照，不让离线核心依赖框架：

```json
{
  "runners": [
    {"language": "python"},
    {
      "language": "python",
      "optional": true,
      "requires": ["python:google.adk"],
      "argv": ["{python}", "-m", "unittest", "discover", "-s", "{stage}/tests-framework", "-p", "test_framework.py"]
    }
  ]
}
```

`{python}` 使用当前评分器解释器。依赖声明接受可执行程序名、`python:module.name` 和 `node:package-name`。Python 和 Node 探测只解析包位置，不导入依赖。缺包产生带安装提示的 `skip`；导入名和分发包名可能不同，作者须另行记录固定且受支持的依赖版本。

用 `--optional` 包含这些运行器。`--optional --strict` 在缺依赖时失败。默认完成证据只涵盖必需的离线核心，不声称已掌握框架。选中可选运行器后，它们的失败或跳过也会阻止完成。可选教师测试放在阶段的 `tests-framework/`，与核心 `tests/` 分离，从 `PROJECT_WORKSPACE` 导入学习者实现。
