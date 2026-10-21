---
id: sandbox-policy
title: 沙箱策略阶梯
code: SB
subtitle: 选择成本最低的隔离配置，在运行器中拒绝无效调用，并设置 sbx 网络、秘密与安全策略。
hue: 352
sources: phases/19-capstone-projects/26-sandbox-runner-denylist, projects/sandbox-ladder, manuals/docker-sandboxes-101
source_hash: 7fd12aa0f39caea2
---

## 隔离配置阶梯
type: comparison
span: 2
from: projects/sandbox-ladder/solution/stage2.rs, projects/sandbox-ladder/solution/stage4.rs

| 维度 | process-fixture | filesystem-fixture | container-fixture | microvm-fixture |
|---|---|---|---|---|
| 成本 | 1 | 2 | 3 | 5 |
| 文件系统控制 | 无 | 有 | 有 | 有 |
| 网络阻断 | 无 | 无 | 有 | 有 |
| 独立内核 | 无 | 无 | 无 | 有 |
| 残余风险 | `shared-host-kernel`、`network-not-denied` | `shared-host-kernel`、`network-not-denied` | `shared-host-kernel` | 无 |

## 运行
type: command-table
span: 2
from: projects/sandbox-ladder/README.md, projects/sandbox-ladder/solution/cli.py, phases/19-capstone-projects/26-sandbox-runner-denylist/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 projects/sandbox-ladder/solution/cli.py untrusted=true,secrets=true,network=true,host_kernel=false --budget 3` | 策略模拟，输出 JSON |
| `... --docker-image <image>` | 添加 `docker run` 预览 |
| `... --docker-image <image> --execute` | 在本地镜像上运行两个探针 |
| `python3 scripts/project_test.py sandbox-ladder --stage 1 --path learning-artifacts/sandbox-ladder` | 评测自己版本的阶段 1 |
| `python3 scripts/project_test.py sandbox-ladder --all --solution --strict` | 评测参考实现 |
| `python3 code/main.py` | 课程演示，批量检查放行与拒绝 |
| `python3 -m pytest code/tests/ -v` | 课程测试 |

## 规划器步骤
type: flow
from: projects/sandbox-ladder/solution/stage1.rs, projects/sandbox-ladder/solution/stage2.rs, projects/sandbox-ladder/solution/stage3.rs, projects/sandbox-ladder/solution/stage4.rs, projects/sandbox-ladder/solution/cli.py, projects/sandbox-ladder/README.md

1. **needs**：解析 `key=true` 和 `key=false` 键值对，重复或未知键会失败。
2. **satisfies**：不可信代码或秘密需要文件系统控制，`network=true` 需要阻断网络。
3. **satisfies**：`host_kernel=true` 需要独立内核。
4. **select**：保留成本不超过预算的配置，再选择成本最低者。
5. **plan**：打印配置及其留下的每项残余风险。
6. **cli.py**：封装为 `schema_version: 1` 的 JSON，`runtime_verified` 为 false。

## 样例的规划器输出
type: annotated-code
lang: text
from: projects/sandbox-ladder/solution/stage4.rs, projects/sandbox-ladder/solution/cli.py

```text
profile=container-fixture mode=policy-simulation os_isolation=false
residual=shared-host-kernel  # 没有独立内核
verify=runtime-configuration-and-escape-tests  # 始终打印
# 来自 cli.py 的 JSON 封装键
"mode": "policy_simulation", "runtime_verified": false
```

## Docker 探针命令
type: annotated-code
lang: bash
from: projects/sandbox-ladder/solution/cli.py, projects/sandbox-ladder/README.md

```bash
docker run --rm --pull=never \  # 仅使用本地镜像
  --network none --read-only \  # 无路由，根目录只读
  --cap-drop ALL --security-opt no-new-privileges \
  --pids-limit 32 --memory 64m --cpus 0.5 \
  --user 65534:65534 <image> sh -c '<probes>'  # root_write、default_route
```

## 课程运行器检查
type: architecture
from: phases/19-capstone-projects/26-sandbox-runner-denylist/code/main.py, phases/19-capstone-projects/26-sandbox-runner-denylist/docs/zh.md

```arch
node | call | 1,1 | Sandbox.run() | argv、shell=False | client
node | deny | 2,1 | _check_executable_denylist | 文件基本名在拒绝列表中 | process
node | interp | 3,1 | _check_argv_interpreter | -c、-e、--eval | process
node | meta | 4,1 | _check_shell_metachars | shell 关闭时的元字符 | process
node | jail | 4,2 | _check_path_jail | realpath 位于根目录内 | process
node | proc | 3,2 | subprocess.run | 环境允许列表、超时 | process
node | res | 2,2 | SandboxResult | denied、timed_out、truncated | store
edge | call | deny |
edge | deny | interp |
edge | interp | meta |
edge | meta | jail |
edge | jail | proc | 全部通过
edge | proc | res | 捕获
```

## 课程默认值
type: defaults
from: phases/19-capstone-projects/26-sandbox-runner-denylist/code/main.py, projects/sandbox-ladder/solution/cli.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_output_bytes` | `64 * 1024` | 之后添加截断标记 |
| `timeout_seconds` | 30.0 | 演示使用 2.0 |
| `DENIED_EXIT_CODE` | -100 | 任意拒绝 |
| `TIMED_OUT_EXIT_CODE` | -101 | 实际耗时超时 |
| `env_allowlist` | `("PATH", "HOME", "LANG", "LC_ALL", "TERM")` | 丢弃其他所有变量 |
| `shell` | `False` | 关闭时拒绝元字符 |
| `--budget` | 3 | 规划器成本上限 |

## sbx 网络策略任务
type: task-table
span: 2
from: manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md, manuals/docker-sandboxes-101/sections/7-2-org-policies-profiles-and-the-audit-log.md

| 任务 | 代码 |
|---|---|
| 一次性设置全局预设 | `sbx policy init balanced` |
| 列出规则及 id | `sbx policy ls --wide --json` |
| 为一个沙箱允许一个主机 | `sbx policy allow network --sandbox <name> example.com` |
| 创建时拒绝一个主机 | 在 `create` 或 `run` 上使用 `--deny-network <host>` |
| 预测一次判定 | `sbx policy check network --sandbox <name> <host:port> --json` |
| 查看代理判定 | 使用带 `--json` 的 `sbx policy log` |
| 移除放行规则 | `sbx policy rm network --sandbox <name> --id <uuid> --force` |
| 查找组织规则 | `sbx policy ls --source org` |

## sbx 如何判定
type: concepts
from: manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/7-2-org-policies-profiles-and-the-audit-log.md, manuals/docker-sandboxes-101/sections/3-1-sbx-diagnose-and-the-microvm-boundary.md

- **拒绝优先**：对同一主机名或 CIDR，拒绝覆盖放行。
- **deny_kind**：`implicit` 表示没有规则匹配，`explicit` 会指出规则。
- **check network**：只检查主机和端口，默认端口 443，拒绝时以 1 退出。
- **forward-bypass**：不检查流量、也不注入凭证的隧道。
- **秘密**：agent 只能看到 `proxy-managed` 或 `sbx-cs-<rand>`，看不到真实值。
- **SSH agent**：默认开启转发，密钥留在宿主机。
- **治理**：只有组织放行规则能授予权限，本地拒绝规则仍生效。
- **边界**：由 hypervisor 提供，不靠虚拟机内部权限分离。

## 未匹配调用的安全模式
type: comparison
from: manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md

| 维度 | `strict` | `balanced` | `restricted` | `autonomous` |
|---|---|---|---|---|
| `safe` 标签 | 询问 | 放行 | 放行 | 放行 |
| `destructive` 标签 | 询问 | 询问 | 拒绝 | 放行 |
| `unknown` 标签 | 询问 | 询问 | 拒绝 | 放行 |

## 拒绝与修正
type: troubleshooting
from: phases/19-capstone-projects/26-sandbox-runner-denylist/code/main.py, projects/sandbox-ladder/solution/cli.py, projects/sandbox-ladder/solution/stage3.rs, projects/sandbox-ladder/solution/main.rs, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `is on the denylist` | argv[0] 的文件基本名在 `DEFAULT_DENYLIST` 中 | 改用其他工具，或修改 `denylist` |
| `use a script file instead of -c/-e` | 解释器使用内联代码参数 | 将代码写入脚本文件 |
| `set shell=True to opt in` | shell 关闭时 argv 包含元字符 | 将命令拆分为 argv |
| `resolves outside project root` | `../`、绝对路径或指向外部的符号链接 | 路径保持在 `project_root` 内 |
| 规划器返回 `Limit` 错误 | 预算内没有满足条件的配置 | 提高 `--budget`，独立内核需要 5 |
| `Docker probe cannot establish independent guest kernel` | `--docker-image` 同时设置 `host_kernel=true` | 只使用策略模拟 |
| `conflicts with existing allow rule` | 同一作用域中对已放行项设置拒绝 | 先执行 `sbx policy rm network` |
| `403 Forbidden`，响应体 90 字节 | 没有规则匹配，需要批准 | 添加放行规则，这不是网络故障 |

## 问答
type: qa
from: projects/sandbox-ladder/solution/main.rs, projects/sandbox-ladder/solution/stage2.rs, projects/sandbox-ladder/README.md, projects/sandbox-ladder/solution/cli.py, phases/19-capstone-projects/26-sandbox-runner-denylist/docs/zh.md, manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md

- **`network=true` 会授予网络访问吗？** 不会，它表示必须阻断网络。
- **预算为 4，要求全部四项呢？** 返回 `Limit`。只有成本 5 的 `microvm-fixture` 有独立内核。
- **Docker 探针能证明 microVM 隔离吗？** 不能，它只测试根目录写入和默认路由。
- **课程沙箱是操作系统边界吗？** 不是，它没有使用 namespaces、cgroups 或 seccomp。
- **agent 权限是隔离边界吗？** 不是，权限在客户端执行。隔离请用沙箱。

## 提示
type: tips
from: phases/19-capstone-projects/26-sandbox-runner-denylist/docs/zh.md, manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md

- 无人值守 agent 使用 `--safety restricted`。
- 将破坏性命令放入 `deny`，任何模式或钩子放行都无法覆盖。
- 用 `sbx secret set` 保存密钥，绝不用 `-e KEY`。
- 不希望某个 agent 执行签名时，关闭 `ssh.agentForwardingEnabled`。
- 放行主机会允许任意正文。使用 kit HTTP 规则缩小 API 范围。
- 生产环境加上容器或 microVM，移除 capabilities，以只读方式挂载根目录。
