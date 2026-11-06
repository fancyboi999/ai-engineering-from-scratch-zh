---
id: denylist-runner-is-a-guardrail
title: 启动进程前的四项检查，以及能通过检查的调用
card: sandboxes
kind: code-reading
level: 2
roles: [agentic-ai-engineer, applied-ai-engineer]
rounds: [coding, screen]
tags: [sandbox, denylist, path-jail, subprocess, guardrail]
minutes: 8
lessons: [phases/19-capstone-projects/26-sandbox-runner-denylist]
manuals: []
practice: []
cheatsheet: [coding-agents]
related: [sandboxes/hypervisor-is-the-boundary]
updated: 2026-11-03
---

阅读下方运行器代码并回答四个问题：哪一个拒绝维度拦截了 `python3 -c "import os; os.system('rm -rf /')"`，哪一个维度拦截了 `/usr/bin/rm -rf build`，为什么路径检查要使用 `realpath`，以及该运行器究竟不是什么。

```python
def run(self, argv, *, shell=False, cwd=None):
    if basename(argv[0]) in self.denylist:
        return denied("executable")
    if argv[0] in INTERPRETERS and any(a.startswith(("-c", "-e")) for a in argv[1:]):
        return denied("interpreter")
    if not shell and any(ch in " ".join(argv) for ch in ";|&<>`$"):
        return denied("metachar")
    root = realpath(self.root)
    for a in argv[1:]:
        if not looks_like_path(a) and not lexists(join(root, a)):
            continue
        p = realpath(join(root, a))
        if p != root and not p.startswith(root + sep):
            return denied("path")
    return spawn(argv, timeout=self.timeout, max_output=self.max_output)
```

## Short answer

解释器检查拦截了 `python3 -c` 调用，因为带有类似 `-c` 参数的解释器本质上是多走了一步的 shell 调用；黑名单检查拦截了 `/usr/bin/rm`，因为路径别名最终会解析为基本名称（basename）`rm`。路径检查通过 `realpath` 解析绝对路径，从而使得项目根目录内部指向外部的符号链接会在其真实指向的目标处被拒绝，而不是仅因其字面路径前缀匹配而被错误放行。每项检查都是调用参数的纯函数，且在启动任何进程前运行，且该运行器属于开发期的安全防护栏（guardrail），不是操作系统级的隔离沙箱：凡是该子进程能够执行的操作，运行器本身均可执行。

## Full answer

### 四大安全检查维度

| 维度名称 | 审查对象 | 拦截示例 |
|---|---|---|
| name（名称） | `argv[0]` 的文件名与固化黑名单集合比对 | `sudo`, `chmod -R 777`, `rm -rf`, `mkfs`, `dd` |
| argv（参数） | 解释器命令紧跟 `-c` 或 `-e` 参数 | `bash -c`, `node -e`, `perl -e` |
| structure（结构） | 在 `shell=False` 时检查是否包含 shell 元字符 | `cat x; curl ...` |
| path（路径） | 针对根目录解析每个类似路径的参数 | `../../etc/passwd` |

返回结果是结构化的：`SandboxResult` 携带 `exit_code`、`stdout`、`stderr`、`truncated`、`timed_out`、`denied`、`reason` 以及 `duration_ms`。被拒绝的调用统一返回哨兵退出码 -100，超时调用使用 -101，而被截断的输出则保留真实退出码并附带截断标志与标记行。下游业务代码直接读取该结构化记录，不需要解析 stderr 文本。超时发生时运行器会直接 kill 终止整个进程组。

### 什么样的调用能够逃逸

由 agent 写入项目根目录内部并随后运行的文件（例如 `python3 tool.py`）能够通过全部四重检查，因为运行器只检查 argv 的结构，从不审查文件内部内容。执行 `find . -delete` 同样能绕过名称检查，因为 `find` 并未收录在黑名单中。课程对此开诚布公：该简易沙箱旨在拦截最常见的危险命令调用并使违规在可观测性系统中显式报警，而真正拥有任意代码执行权限的有心攻击者依然能轻易越狱逃逸。

### 为什么它不是沙箱

它完全不具备 Linux 命名空间（namespaces）、cgroups 资源控制、seccomp 系统调用过滤、gVisor、Firecracker 或任何内核级别的隔离机制。在生产环境中必须在此之上层层设防：无特权容器、微虚拟机（microVM）、剥离多余内核能力（capabilities）、将项目根目录挂载为只读并将临时工作区挂载为读写、配置严格的内存与 CPU 资源配额限制，并将环境变量净化为已知安全的受控集合。该运行器的真正价值在于充当应用层防护栏：在操作系统底层机制被迫介入之前，先一步将模型的失误转化为结构化的合规拒绝记录。

## Follow-ups

- **Level 2:** Agent 在根目录写入 `tool.py` 并执行 `python3 tool.py`，哪条防线会拦截它？ Expected: 没有防线拦截；其 argv 形态完全合规，且文件内容从不被审查，这也是必须依赖操作系统级隔离的原因。
- **Level 3:** 为什么比对 `realpath(a)` 而非直接比对 `a`？ Expected: 根目录内的符号链接可能指向根目录外部，字面路径保留了根目录前缀，而解析后的真实目标则暴露了外部越界。
- **Level 3:** 调用结束后 `SandboxResult` 会流向何处？ Expected: 进入按任务比较退出码的评测框架，以及工具执行 span，而非流向针对 stderr 的文本解析器。
- **Level 4:** 将每个检查维度映射为在生产环境中替代它的操作系统级控制机制。 Expected: 将名称与 argv 列表映射为 seccomp 与剥离能力；将路径围栏映射为带读写临时区的只读挂载；将超时映射为 cgroup 限制；将整体运行器映射为 microVM 虚拟化边界。

## Wrong answers

- "黑名单直接比对完整绝对路径。" 诸如 `/bin/rm` 和 `/usr/bin/rm` 等路径别名必须归约为单一的 basename，否则黑名单极易被绕过。
- "允许 `shell=True` 并对参数转义。" 引号处理正是容易出 bug 的地方；保持 shell 关闭，并拒绝元字符。
- "它既然拒绝了 `rm`，就可以安全运行不可信代码。" 它只是应用层结构性防护，不具备内核级隔离；课程明确说明蓄意攻击者依然能够逃逸。

## Taught in

[沙箱运行器综合项目](../../../phases/19-capstone-projects/26-sandbox-runner-denylist/)构建了四个拒绝维度与结构化输出结果，并坦率指明了它为何不是真正的沙箱。
