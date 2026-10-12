# --clone 与 /run/sandbox/source

> 绑定模式把你的文件交给 agent；`:ro` 和无挂载模式给得更少；`--clone` 提供私有克隆，通过 git remote 取回提交。

你让 agent 在仓库工作一整夜。早晨 `git diff` 干净，`.git/hooks/pre-commit` 却多了文件，diff 永远不会显示它。三种工作区模式决定 agent 能写多少目录树。使用 `--clone` 时，它不能写宿主目录树的任何部分。

读完本节，你能为仓库选择工作区模式，从克隆模式沙箱取回 agent 的提交。

## 三种工作区模式 {#s-clone-and-run-sandbox-source-three-workspace-modes}

**直接挂载：** 工作区以相同绝对路径可读写地挂载进 VM {{help-sbx sbx create claude}}。`m101-demo` 内的 `pwd` 为 `$CAPTURE/fixtures/repo`，与宿主相同；`git log` 列出宿主提交 `c7dfd56 second` 和 `086df68 first`（capture/out/04-workspace.txt）。挂载是 virtiofs，见 [microVM 边界](#s-sbx-diagnose-and-the-microvm-boundary)；旧插件的文件同步已移除（[冲突 C5](#s-ref-sources-and-the-conflicts-register)）。额外路径跟在第一个后，`:ro` 设为只读：“a read-only argument may name a single file, which holds that one path out of reach inside a workspace the sandbox can otherwise write” {{help-sbx sbx create claude}}，可单独保护可写工作区中的一个文件。

**无挂载：** `sbx create` 不带路径，VM 没有宿主绑定挂载。agent 在模板工作目录操作，Docker 模板为 `/home/agent/workspace` {{docs-sbx Workspace isolation}}。`m101-policy` 以此方式创建，输出 `workspace none · no workspace bind mount`（capture/out/09-create.txt）。但 `sbx run` 不带路径会挂载当前目录，[sbx run、create、stop 与 rm](#s-sbx-run-create-stop-and-rm) 已提醒这一点。

直接模式需要审查。文档列出 agent 可修改的 Git hooks、CI 配置、`package.json` 脚本与 `.claude/settings.json`，警告 hooks “don't appear in `git diff` output” {{docs-sbx Workspace isolation}}，不会出现在 diff。一位 Docker Captain 在 2026-05-26 描述此隐蔽通道，这正是克隆模式存在的原因 {{blog 2026-05-26 B16}}。

## 克隆模式 {#s-clone-and-run-sandbox-source-clone-mode}

**--clone：** 创建时的 flag，使 agent “Run the agent on a private in-container clone of the host Git repository (mounted read-only)” {{help-sbx sbx create}}，在容器内私有克隆上运行，宿主 Git 仓库只读挂载。它在 v0.31.0 替代 `--branch`，后者现在报 `--branch is no longer supported; use --clone instead` {{rel-sbx v0.31.0}}（[冲突 C6](#s-ref-sources-and-the-conflicts-register)）。重新连接已有克隆模式沙箱时此 flag 无作用 {{help-sbx sbx run}}。录制用它创建 `m101-clone`：

```listing
title: 创建克隆模式沙箱
source: capture/out/08-clone-create.txt
lang: text
note: 镜像拉取及 sbx ls 第二行已截去。
---
$ sbx create --clone shell $CAPTURE/fixtures/repo-clone --name m101-clone
✓ Git repository detected: $CAPTURE/fixtures/repo-clone
…
  Git daemon: git://127.0.0.1:<port>/repo-clone
  Remote: sandbox-m101-clone
✓ Created sandbox m101-clone
  mount  $CAPTURE/fixtures/repo-clone → /run/sandbox/source (ro, source)
…
SANDBOX      AGENT   STATUS    PORTS                        WORKSPACE
m101-clone   shell   running   127.0.0.1:<port>->9418/tcp4   $CAPTURE/fixtures/repo-clone
```

内部有三个事实（capture/out/08-clone-inside.txt）：克隆位于相同路径 `$CAPTURE/fixtures/repo-clone`，在 ext4 卷 `/dev/vde` 上，`origin` 为 `/run/sandbox/source`。源挂载为 `host on /run/sandbox/source type virtiofs (ro,nosuid,nodev,relatime)`，`touch /run/sandbox/source/x` 报 `Read-only file system`。内部提交 `81e11df from sandbox` 也不能推到 `origin`，`git push` 报 `remote unpack failed: unable to create temporary object directory`（capture/out/08-clone-commit.txt）。文档说明克隆模式“protects your host repository from modification” {{docs-sbx Clone mode}}，保护宿主仓库免于修改，但仍可读取，所以仓库下未跟踪的 `.env` 也在内部可读。

## 取回提交 {#s-clone-and-run-sandbox-source-getting-commits-back}

VM 的 git-daemon 监听9418，sbx 将它发布到回环端口；CLI 随后向宿主仓库 `.git/config` 写入 remote：

```listing
title: 宿主沙箱 remote：fetch 前后
source: capture/out/08-clone-host.txt
lang: text
note: core.* 配置行、ls-remote 输出与 fetch warning 已截去。
---
$ git -C $CAPTURE/fixtures/repo-clone remote -v
sandbox-m101-clone	git://127.0.0.1:<port>/repo-clone (fetch)
sandbox-m101-clone	git://127.0.0.1:<port>/repo-clone (push)
…
file:.git/config	remote.sandbox-m101-clone.fetch=+refs/heads/*:refs/remotes/sandbox-m101-clone/*
file:.git/config	remote.sandbox-m101-clone.fetch=+refs/heads/*:refs/sandboxes/m101-clone/*
…
$ git -C $CAPTURE/fixtures/repo-clone fetch sandbox-m101-clone
…
   c7dfd56..81e11df  main       -> sandbox-m101-clone/main
   c7dfd56..81e11df  main       -> refs/sandboxes/m101-clone/main
…
81e11df from sandbox
c7dfd56 second
086df68 first
```

两条 fetch refspec 意味着一次 fetch 更新两个位置：`refs/remotes/sandbox-m101-clone/main` 和 `refs/sandboxes/m101-clone/main`。`sbx rm` 移除 remote 与守护进程，输出恢复命令 `git branch <local-name> refs/sandboxes/m101-clone/<branch>`。录制中 `refs/sandboxes/m101-clone/main` 在移除后仍存在（capture/out/08-clone-rm.txt）。`sbx stop` 停止守护进程，重启会分配新端口并重写 remote URL {{docs-sbx Use Git with sandboxes}}。fetch 输出中的 `/root/.config/git/attributes` warning 来自 VM 内守护进程用户，不改变结果。`sbx kit add` “via a named workspace volume” {{help-sbx sbx kit add}}，通过命名工作区卷保留克隆，即上面的 ext4 设备；`sbx rm` “cleans up any Git worktrees” {{help-sbx sbx rm}}，清理 Git worktree。

[图](#fig-3-2) 跟踪一个提交从克隆到宿主 refs 的路径。

```figure
id: fig-3-2
kind: flow
title: 一个提交从克隆回到宿主
claim: 宿主仓库只读进入 VM 的 /run/sandbox/source；agent 提交到私有克隆，git-daemon 将它作为宿主 remote 提供。
caption: 从宿主仓库横向读到克隆，再向下回到宿主 refs。青绿色实线是写入两个 refs 的 fetch，玫红虚线是只读挂载拒绝的 push。来源为 capture/out/08-clone-inside.txt、08-clone-commit.txt 和 08-clone-host.txt。
```

```takeaways
- 不信任 agent 修改 `.git/hooks` 与构建脚本时，使用 `--clone`。
- 在 `sbx create` 时决定模式；不能给已有沙箱追加 `--clone`。
- `sbx rm` 前 fetch `sandbox-<name>`，或从 `refs/sandboxes/<name>/*` 恢复分支。
- `.env` 不要放进克隆仓库；只读挂载仍会暴露它。
```

Sources: help-sbx sbx create, sbx create claude, sbx run, sbx rm, sbx kit add (research/sources/help-sbx.md); docs-sbx Isolation layers, Architecture, Use Git with sandboxes, Usage (research/sources/docs-sandboxes.md); rel-sbx v0.31.0 (research/sources/sbx-releases.md); research/conflicts-register.md rows C5, C6; blog B16 (2026-05-26) from research/plan.md; capture/out/04-workspace.txt, 08-clone-create.txt, 08-clone-inside.txt, 08-clone-commit.txt, 08-clone-host.txt, 08-clone-rm.txt, 09-create.txt
