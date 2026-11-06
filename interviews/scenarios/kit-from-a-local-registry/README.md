---
id: kit-from-a-local-registry
title: 源自本地私有镜像仓库 Kit 的三次被拒
card: scenarios
kind: incident
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, design-review]
tags: [sandbox, kits, oci, buildx, allowlist]
minutes: 20
lessons: []
manuals: [docker-sandboxes-101#s-syntax-docker-sandbox-kit-3-and-kit-yaml, docker-sandboxes-101#s-sbx-kit-pack-push-sign-and-verify, docker-sandboxes-101#s-ref-sources-and-the-conflicts-register]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
system:
  version: sbx v0.47.0
  model: none; shell commands inside the sandbox
  hardware: one Mac with the microVM runtime
source:
  - manuals/docker-sandboxes-101/capture/out/28-kit-inspect.txt
  - manuals/docker-sandboxes-101/capture/out/28-kit-inspect-source.txt
  - manuals/docker-sandboxes-101/capture/out/28-buildx.txt
  - manuals/docker-sandboxes-101/capture/out/28-buildx-docker-driver.txt
  - manuals/docker-sandboxes-101/capture/out/13-kit-v3-validate.txt
  - manuals/docker-sandboxes-101/capture/out/12-validate.txt
  - manuals/docker-sandboxes-101/sections/4-1-syntax-docker-sandbox-kit-3-and-kit-yaml.md
  - manuals/docker-sandboxes-101/sections/4-3-sbx-kit-pack-push-sign-and-verify.md
  - manuals/docker-sandboxes-101/sections/r-7-sources-and-the-conflicts-register.md
---

## Situation

一个平台团队编写了他们的第一个 v3 版本的沙箱套件（Kit，即一个仅包含单一放行域名的 shell 工作负载），并将其推送到团队的私有镜像仓库中（抓取记录中使用位于 `localhost:15000` 的本地仓库作为对等替代）。随后连续执行了三条命令均报错失败。在推送后的引用上执行 `sbx kit inspect`，提示该 kit 无法安装，因为其源不在白名单中。在源码目录上执行 `sbx kit inspect`，工具尝试构建却因导出器错误终止。在相同目录上执行 `sbx kit validate`，提示该 kit 是 v3 源码 kit，而当前加载路径下没有 kit 构建器。一名工程师据此断定 v3 kit 在当前软件版本中根本无法工作，提议将其重写为 v2 版本的 mixin。

你手头掌握了这三次失败日志、使用两种不同构建驱动推送的构建日志，以及来自同一代码树的 v2 mixin 的验证输出。

## Evidence

- [被拒绝的 inspect 命令建议的两处配置项及其进程退出码](evidence/the-refused-inspect.txt)
- [针对 v3 源码目录执行 sbx kit inspect 的报错输出](evidence/inspect-of-the-source-directory.txt)
- [使用 docker-container 构建器开始构建时的日志](evidence/the-driver-that-worked.txt)
- [docker-container 构建过程中执行的导出与推送步骤](evidence/what-the-container-driver-exported.txt)
- [使用宿主机守护进程默认构建驱动执行相同构建的导出日志](evidence/what-the-default-driver-exported.txt)
- [针对 v3 源码 kit 执行 sbx kit validate 的报错日志](evidence/validate-on-the-v3-directory.txt)
- [针对 v2 mixin 执行 sbx kit validate 的成功输出](evidence/validate-on-the-v2-mixin.txt)

## Questions

1. 三次失败，一个悲观结论。在阅读构建日志前，按产生报错的具体组件将三次失败归类。
2. 哪些 sbx kit 命令支持 v3 kit，哪些不支持？
3. 两次构建采用了不同的驱动程序。它们各自导出了什么，哪一个产物才是真正的 kit？
4. 白名单拦截机制保护了什么，建议的两处配置项中你应当采用哪一个？
5. 在三处根因修复后，该 kit 应当如何被沙箱加载，手册承认其未曾抓取什么？

## Walkthrough

1. **区分工具的技术迭代代际。** `sbx kit validate` 在 v2 mixin 上输出 `VALID` 顺利通过，却在 v3 目录上报错提示其为缺乏构建器的 v3 源码 kit。手册关于冲突 C13 的裁定明确指出：`validate`、`pack`、`push` 和 `pull` 纯属面向 v1 和 v2 的历史老工具。v3 kit 本质上是标准的 OCI 镜像，完全由 Docker 官方工具链构建与推送。因此 validate 报错根本不是系统缺陷：该命令本就未设计用于校验 v3 kit。
2. **分析构建驱动的导出差异。** 成功运行的构建采用的是 `docker-container` 构建器。其导出步骤依次写入了层文件、manifest、配置、证明清单以及 manifest list 清单列表，随后推送了 manifest。另一构建采用的是宿主机守护进程的默认 `docker` 驱动；其导出仅写入了一个普通镜像并直接推送，既没有 manifest list 也没有 attestation。手册事后检索仓库发现：默认驱动推送的是没有任何注解标签的 Docker schema 2 镜像，而缺少描述符注解的镜像对任何沙箱系统而言都只是一枚普通镜像而非 kit。第二次推送看似成功，实则产出了一个任何沙箱都无法识别的废品。
3. **结合上下文理解源码 inspect 失败。** 在目录上执行 `sbx kit inspect` 尝试通过宿主机守护进程构建 kit，而 OCI 导出器在默认 `docker` 驱动上不受支持。修复方案与步骤 2 一致：改用 `docker-container` 构建器，或采用报错信息中提示的 containerd 镜像存储。
4. **理解准入控制规则。** 对推送引用的拒绝源自 `kit.allowedSources` 配置，正如冲突 C40 记录的那样，该配置自 v0.34.0 起默认仅允许 `docker.io/`。错误提示给出了两个修改选项。应当添加具体的仓库前缀 `localhost:15000/m101/`，而非配置通配符 `*`：报错文本自身已强调不推荐放行任意远程源。有效构建中的描述符行指明了前端版本 `3.0.0-m.8`，该锁定的前端版本号同样应当写入工单。
5. **通过引用方式加载运行。** v3 工作负载由 `sbx run` 或 `sbx create` 直接通过镜像引用（替代原 agent 名称）调用，且单个沙箱禁止混用 v3 kit 与 v1/v2 kit。手册坦诚注明其抓取记录中并未包含 sbx 实际运行 v3 kit 的链路，因为捕获套件从未修改过 `sbx settings`。在汇报时应如实说明这一事实。

## Resolution

三次失败对应三处独立诱因，与“新版本损坏”毫无关系。`sbx kit` 系列工件管理命令属于 v1 和 v2 历史工具，对 v3 目录执行 `validate` 属于用错了工具。默认 `docker` 构建驱动无法导出 OCI 镜像，导致推送的镜像缺乏 kit 标识注解，而源码 inspect 同样受阻于该驱动；改用 `docker-container` 构建器即可顺利导出带有描述符注解的清单列表。守护进程默认仅信任 `kit.allowedSources` 中列出的源（默认仅有 `docker.io/`），需将团队的私有仓库前缀追加到配置中。在更换构建器并添加白名单后，该 kit 能够直接通过引用正常运行。降级重写为 v2 mixin 的提议被撤回，团队记录下其自身的实际测试运行将成为首个有效测量数据（因为手册中缺乏该抓取记录）。

## Wrong turns

- "将 kit.allowedSources 设为 * 以便所有仓库都能用。" 报错信息明确提示了该选项并强调不推荐。白名单是阻断恶意外部 kit 入侵沙箱环境的核心门禁。
- "使用默认驱动推送成功了，说明仓库中的镜像完好。" 它推送的是缺少描述符注解的普通镜像。沙箱消费者只能将其识别为普通镜像而非 kit。
- "将 kit 重写为 v2 mixin，因为 validate 检查能通过。" v2 工具通过仅仅是因为它是 v2 规范。v3 kit 需要的是 Buildx 现代构建链，而非倒退回旧格式。
- "创建 kit 构建器沙箱并重新运行 validate。" 抓取记录表明源码构建是运行在宿主机守护进程中的，且其后构建器状态显示未创建。validate 代码路径至今依然仅面向 v1/v2 工件。

## Generalize

当一项新技术同时出现三种不同的报错时，在对其下结论前先辨别每个报错背后的所属子系统。格式校验器、构建导出器与准入白名单是三个完全独立的系统，各自拥有针对性的解法。推送返回成功并不等于产物具备下游消费者所需的元数据结构。始终将镜像 manifest 重新拉取核对。

## Taught in

[描述符页面](../../../manuals/docker-sandboxes-101/sections/4-1-syntax-docker-sandbox-kit-3-and-kit-yaml.md)记录了这两次构建与白名单拦截，[kit 命令页面](../../../manuals/docker-sandboxes-101/sections/4-3-sbx-kit-pack-push-sign-and-verify.md)介绍了 v2 工具链与 kit 配置项，而[冲突寄存器](../../../manuals/docker-sandboxes-101/sections/r-7-sources-and-the-conflicts-register.md)对冲突 C13 与 C40 给出了权威裁定。
