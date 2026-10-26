# sbxenv.yaml 与 `sbx env plan`

> 环境文件声明 agent、kit、工作区、密钥、端口、MCP 服务器与宿主命令；`sbx env plan` 在 `create` 或 `run` 应用前打印所有变化。

新贡献者克隆仓库，需要你的沙箱：shell workload、`hello-mixin`、一个发布端口、问候变量及准备工作区的宿主命令。你可以发一串 flags，也可以用一个入库环境文件传递同样内容；运行前贡献者先看到计划。

读完本节，你能写 `sbxenv.yaml`，逐个解读计划符号，并说明哪些编辑需等下次 create。

## 文件 {#s-sbxenv-yaml-and-sbx-env-plan-the-file}

**环境文件：** 声明一个沙箱及周边宿主资源的 `sbxenv.yaml`，由五个 `sbx env` 命令读取 {{help-sbx sbx env}}。录制套件写了以下文件：

```listing
title: 录制套件写出的环境文件
source: capture/fixtures/env/sbxenv.yaml
lang: yaml
---
schemaVersion: "1"
name: m101-env
agent: shell
workspace: .
args:
  greeting:
    default: hello
    description: Greeting word
kits:
  - source: ../kits/hello-mixin
env:
  GREETING: ${{ env.args.greeting }}
lifecycle:
  initialize:
    - command: echo init
ports:
  - sandbox: 8080
    host: 18083
```

| 键 | 声明内容 |
|---|---|
| `schemaVersion`、`name`、`agent` | 文件版本 `"1"`、沙箱名称、内置 agent 或 kit |
| `args` | 带 `default` 或 `required: true` 的输入，通过 `${{ env.args.NAME }}` 读取 |
| `kits` | mixin，形式为引用或 `source` 加 `args` |
| `workspace`、`additionalWorkspaces` | 待挂载宿主目录，克隆模式可用对象形式 |
| `env` | 沙箱变量 |
| `secrets`、`bindings`、`registries` | 带 `value`、`ref` 或 `command` 的凭据及其访问域名 |
| `mcp.servers` | 向网关注册的 MCP 服务器 |
| `ports` | 发布端口：`sandbox`、`host`、`protocol`、`hostIP` |
| `lifecycle` | `initialize`、`postCreate`、`preRemove` 下的宿主命令 |
| `sandboxOptions` | `template`、`memory`、`cpus`、`skills`、`writableEnvFiles` 等 |

键来自文件参考 {{docs-sbx Top-level fields}} 及命令帮助。三个占位符会展开：`${{ env.args.NAME }}`、`${{ env.projectDir }}` 和 `${{ env.fileDir }}`；其他位置的 `$` 是字面文本 {{help-sbx sbx env create}}。相对 kit 路径或工作区相对于声明文件目录解析，因此 `workspace: .` 挂载文件自身目录 {{help-sbx sbx env}}。没有 `workspace` 则不挂载任何内容 {{rel-sbx v0.42.0}}。

## 计划 {#s-sbxenv-yaml-and-sbx-env-plan-the-plan}

`sbx env plan` 读取文件，打印应用后将设置的内容。{{help-sbx sbx env plan}}，不应用、不批准、不记录。

```listing
title: m101-env 的首个计划
source: capture/out/14-env-plan.txt
lang: text
note: LOAD ENVIRONMENT 块已截去。
---
── ENVIRONMENT PLAN
   m101-env

   kits:
+    - source: $CAPTURE/fixtures/kits/hello-mixin

   workspace:  (present, not recorded as applied, needs your approval)
     path: $CAPTURE/fixtures/env

   env:
+    GREETING: hello

+  sandbox:
+    name: m101-env
+    agent: shell

   ports:
+    - sandbox: 8080
+      protocol: tcp4
+      host: 18083

   lifecycle:
     initialize:
+      - command: echo init
+        workdir: $CAPTURE/fixtures/env
+        envFiles:
+          - $CAPTURE/fixtures/env/sbxenv.yaml

   Plan: + 5 to add, ~ 0 to change, - 0 to destroy.

   this plan runs commands on this machine, outside the sandbox, with your own privileges
   ✓ not approved yet; applying asks once
```

计划形状与文件一致，边栏携带结论。有五种符号 {{help-sbx sbx env}}：`+` 添加，`~` 改变，`-` 销毁；`>` 标记再次运行的命令，`!` 标记环境曾应用但已不再声明的资源。

已批准且未变化的行不显示。{{docs-sbx Review an environment plan}}，字面密钥值以 SHA-256 digest 展示。文件没写 `tcp4`：自 v0.42.0 发布端口默认用它 {{rel-sbx v0.42.0}}。[图](#fig-4-4) 跟踪文件经计划到状态记录。

```figure
id: fig-4-4
kind: flow
title: 环境文件成为计划、批准与状态记录
claim: sbx env plan 将文件转为带边栏标记的行，create 的批准记录它们，后续计划仅打印变化行。
caption: 从上向下读。计划行来自 capture/out/14-env-plan.txt；右分支为改变问候参数的 14-env-plan-arg.txt。批准后的左分支依据 sbx env 帮助，因为套件从未应用计划。
```

## 宿主命令与批准 {#s-sbxenv-yaml-and-sbx-env-plan-host-commands-and-approval}

`lifecycle` 块在沙箱外的宿主运行，使用你的权限。`initialize` 每次 `create`、`run` 执行，`postCreate` 在沙箱存在后执行，`preRemove` 在确认 `sbx env rm` 后执行 {{help-sbx sbx env}}。命令通过你的 shell 从项目目录运行，可逐命令指定 `workdir` 和 `timeout`。包含任意此类命令的环境{{help-sbx sbx env}}，每次调用都询问，不论本次是否运行它们，因为批准命令也信任其脚本。`--skip-host-commands` 全部跳过，`--auto-approve` 一次回答是；`sbx settings set env.rememberHostCommands true` 则只在命令改变时再询问。

## 状态记录与第二次计划 {#s-sbxenv-yaml-and-sbx-env-plan-the-state-record-and-the-second-plan}

{{help-sbx sbx env}}，批准按环境记录在 sbx 状态目录而非文件旁，{{help-sbx sbx env}}，后续只问变化项。具体路径未录制，因为只运行 `plan`，从未 `create`。第二次录制改了一个输入：

```listing
title: 同一文件改变一个参数
source: capture/out/14-env-plan-arg.txt
lang: text
note: 仅展示变化行与总数。
---
$ sbx env plan --env-arg greeting=servus ./fixtures/env
…
+    GREETING: servus
…
   Plan: + 5 to add, ~ 0 to change, - 0 to destroy.
```

每行仍是 `+`，因为从未应用。一次 `create` 后，同样编辑只会输出 `~ GREETING: hello -> servus`，其形式如帮助中的 kit 参数变化 {{help-sbx sbx env}}。工作区、kit、端口、密钥、绑定与 `sandboxOptions` 变更等下次 create；新 `env` 值传到下次会话 {{docs-sbx Update an environment}}。

多个 `PATH` 按顺序深合并，{{help-sbx sbx env create}}，后文件覆盖前文件；`ports` 等列表连接而非覆盖。不传 `PATH` 时，家目录 `.sbxenv.yaml` 作为基础层合入 {{help-sbx sbx env create}}。项目中隐藏的 `.sbxenv.yaml` 不再读取。

## rm、只读文件与 --cloud {#s-sbxenv-yaml-and-sbx-env-plan-rm-the-read-only-file-and-cloud}

`sbx env rm` 移除沙箱及其作用域配置的密钥。绑定属于用户全局，所以保留；{{help-sbx sbx env rm}}，加此参数可一并移除声明绑定。文件自身在沙箱内只读绑定，防止 agent 决定下次计划询问什么。`sandboxOptions.writableEnvFiles: true` 解除限制 {{help-sbx sbx env}}。

带 `--cloud` 时，{{help-sbx sbx env}}，这些宿主目录无法挂载；宿主端口绑定、MCP 定义与动态密钥来源在任何宿主命令前就被拒绝。[云端一节](#s-sbx-cloud-run-move-and-ttl) 展示剩余能力。

```takeaways
- `sbxenv.yaml` 在沙箱内默认只读；只有 agent 必须编辑时才设 `writableEnvFiles`。
- `create` 或 `run` 前执行 `sbx env plan`，读每个 `+`、`~`、`-`、`>` 和 `!`。
- 文件声明宿主命令时，每次调用都会提示。
- kit、端口、密钥或 `sandboxOptions` 改变后重建环境。
```

Sources: help-sbx sbx env, sbx env create, sbx env plan, sbx env rm (research/sources/help-sbx.md); docs-sbx Sandbox environment files (research/sources/docs-sandboxes.md); rel-sbx v0.42.0 (research/sources/sbx-releases.md); capture/fixtures/env/sbxenv.yaml; capture/out/14-env-plan.txt, 14-env-plan-arg.txt
