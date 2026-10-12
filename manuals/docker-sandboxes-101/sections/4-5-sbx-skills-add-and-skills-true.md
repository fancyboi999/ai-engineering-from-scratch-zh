# `sbx skills add` 与 `skills: true`

> 共享 skills 存储默认只读服务所有受支持 agent 的沙箱；`docker-agent` 用 `skills: true` 读取自身 skill 目录，不读该存储。

笔记本 `~/.claude/skills` 下有 `pdf` skill。沙箱内 agent 有自己的家目录，无法看到它。填充共享 skills 存储后，每个受支持 agent 的沙箱都能读取。

读完本节，你能填充存储、选择各沙箱的挂载方式，并为 `docker-agent` 开启同样 skills。

## 存储 {#s-sbx-skills-add-and-skills-true-the-store}

**Skill：** 含 `SKILL.md` 的目录，agent 将元数据读入系统 prompt，任务匹配时加载正文 {{docs-agent How Skills Work}}。

**共享 skills 存储：** `sbx` 链接到每个受支持 agent 沙箱的宿主目录。录制宿主上它为空：

```listing
title: 添加 skill 前的存储
source: capture/out/15-skills-ls.json
lang: json
---
{
  "store": "$HOME/Library/Application Support/com.docker.sandboxes/sandboxes/agent-skills",
  "skills": []
}
```

Linux 路径为 `~/.local/state/sandboxes/sandboxes/agent-skills`，Windows 为 `%LOCALAPPDATA%\DockerSandboxes\sandboxes\state\agent-skills` {{docs-sbx Import skills from the host}}。“Running `sbx reset` clears the shared store” {{docs-sbx Shared store behavior}}，reset 会清空存储。

## add、import、ls、rm 与 update {#s-sbx-skills-add-and-skills-true-add-import-ls-rm-and-update}

`sbx skills add <repository>` 从 Git URL 或 GitHub `owner/repository` 安装；“The repository must contain one or more valid SKILL.md files” {{help-sbx sbx skills add}}，仓库必须含有效 SKILL.md。`--skill NAME` 按名称选择，可重复或逗号分隔；`sbx skills add anthropics/skills --skill pdf` 安装一个。此步骤需要 GitHub，所以未录制 `add`。`sbx skills update` 只刷新 `add` 安装的 skills；`sbx skills rm` 移除前询问 {{help-sbx sbx skills update}}。

`sbx skills import` 复制宿主已安装 skills，按顺序检查六个目录；重名时第一份优先 {{help-sbx sbx skills import}}：

| 宿主来源 | agent | 沙箱挂载目标 |
|---|---|---|
| `~/.agents/skills` | Codex 与 Devin | `/home/agent/.agents/skills` |
| `~/.claude/skills` | Claude Code | `/home/agent/.claude/skills` |
| `~/.config/opencode/skills` | OpenCode | 文档表未列出 |
| `~/.copilot/skills` | Copilot | `/home/agent/.copilot/skills` |
| `~/.cursor/skills` | Cursor | `/home/agent/.cursor/skills` |
| `~/.factory/skills` | Droid | `/home/agent/.factory/skills` |

顺序来自帮助，挂载目标来自文档 {{docs-sbx Import skills from the host}}。“Imported skills are available to Claude, Codex, Copilot, Cursor, Droid, and OpenCode” {{help-sbx sbx skills import}}，这些 agent 可用导入 skills。`import` 于 v0.37.0 新增，`add`、`update` 和 `rm` 于 v0.42.0 新增 {{rel-sbx v0.42.0}}。

## 沙箱如何看到存储 {#s-sbx-skills-add-and-skills-true-how-a-sandbox-sees-the-store}

默认“the store's entries are linked into the agent's skills directory read-only, which stays writable so kits can install skills beside them” {{help-sbx sbx skills}}，条目只读链接到 agent 的 skills 目录，目录本身仍可写，让 kit 可并列安装。“Linking happens at container start” {{help-sbx sbx skills}}，链接在容器启动时建立，所以现有 skill 编辑实时可见；“adding a store entry reaches a running sandbox only on its next start” {{help-sbx sbx skills}}，新增条目下次启动才可见。移除立即使链接失效。

`sbx run` 或 `sbx create` 的 `--skills off|readonly|readwrite` 按沙箱选模式；`readwrite` 将存储挂载覆盖目录，沙箱写入被共享。默认 `readonly`，或取 `skills.defaultMode`；录制宿主为默认值（`capture/out/02-settings.txt`）。三选项 flag 在 v0.43.0 替代 `--no-share-skills` {{rel-sbx v0.43.0}}。未录制沙箱内部该目录列表，所以不展示链接形态。

v3 kit 通过 `agent-skills@1` 自行声明路径，因为“A runtime cannot know where an arbitrary agent reads skills” {{kitcap agent-skills@1}}，运行时不知道任意 agent 从哪读 skills。运行时“MUST default an omitted `mode` to `readonly`” {{kitcap agent-skills@1}}，省略 mode 必须默认 readonly。有效访问权限取宿主设置与 kit `mode` 中较窄者。提升为 `readwrite` 是扩权，需批准，见[能力一节](#s-com-docker-sandbox-capabilities)。

## docker-agent 与 skills: true {#s-sbx-skills-add-and-skills-true-docker-agent-and-skills-true}

`docker-agent` 不读共享存储，扫描自己的目录，其中 `~/.claude/skills/` 与 `~/.agents/skills/` 也是 import 来源。“Docker Agent scans standard directories for `SKILL.md` files” {{docs-agent How Skills Work}}，扫描标准目录；“Skill metadata (name, description) is injected into the agent's system prompt” {{docs-agent How Skills Work}}，名称和描述注入系统 prompt：

| 路径 | 搜索范围 |
|---|---|
| `~/.codex/skills/` | 递归 |
| `~/.claude/skills/` | 仅直接子目录 |
| `~/.agents/skills/` | 递归 |
| `.claude/skills/` | 仅当前目录 |
| `.github/skills/` | 从 git 根到当前目录的每层目录 |
| `.agents/skills/` | 从 git 根到当前目录的每层目录 |

agent 文件 `skills: true` 加载所有发现的 skill，列表限制范围，`false` 关闭 {{docs-agent Filtering Skills}}。列表项为 `local` 或 `http://`、`https://` URL 时是来源，其他字符串是 skill 名称。“A name that doesn't match any discovered skill is logged as a warning at startup but is otherwise ignored” {{docs-agent Filtering Skills}}，未匹配名称启动时 warning，之后忽略。agent 需 `filesystem` 工具集读 skill 文件，见[工具集一节](#s-toolsets-and-mcps)。skill frontmatter 的 `context: fork` “tells the agent to run the skill in an isolated sub-agent instead” {{docs-agent Running a Skill as a Sub-Agent}}，要求在隔离子 agent 中运行。

## docker-agent 沙箱内 {#s-sbx-skills-add-and-skills-true-in-a-docker-agent-sandbox}

`docker-agent run --sandbox` 的 VM 看不到上述宿主路径。Docker Agent 启动沙箱前构建 kit，“bind-mounted read-only into the VM at the same path” {{docs-agent Auto-Kit}}，同路径只读绑定进 VM。宿主发现的每个 `SKILL.md` “is copied under `<kit>/skills/<skill-name>/`” {{docs-agent What gets staged}}，复制到此处；每个文本文件经过密钥遮蔽，`--no-kit` 关闭暂存。[完整运行一节](#s-docker-agent-run-sandbox-end-to-end) 展示暂存摘要。

```takeaways
- 用 `sbx skills add` 或 `sbx skills import` 一次填充存储；需要新条目的沙箱应重新创建。
- 保留默认 `readonly`，只为需要编辑共享 skills 的沙箱选 `readwrite`。
- agent 文件同时设置 `skills: true` 与 `filesystem` 工具集。
- 宿主 `docker-agent` 运行所需 skills 放在自己的目录，它不读共享存储。
- 使用 `--sandbox`，不要加 `--no-kit`，让 agent 文件的 skills 进入 VM。
```

Sources: help-sbx sbx skills, sbx skills add, sbx skills import, sbx skills update (research/sources/help-sbx.md); docs-sbx Share agent skills, skills.defaultMode (research/sources/docs-sandboxes.md); docs-agent Skills, Sandbox Mode Auto-Kit (research/sources/docs-docker-agent.md); kitcap agent-skills@1 (research/sources/kit-capabilities.md); rel-sbx v0.37.0, v0.42.0, v0.43.0 (research/sources/sbx-releases.md); capture/out/02-settings.txt, 15-skills-ls.json, 15-skills-ls.txt
