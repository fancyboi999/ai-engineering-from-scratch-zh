# Docker Sandboxes 与 Docker Agent 入门的原始来源副本

上游于2026-10-08获取（文档、GitHub文件、API均在当日，11:11Z再读commit SHA），供manuals/docker-sandboxes-101逐字审计引文。以下是上游取证记录，不是中文镜像本机抓取。原始规范、help、日志与checksum保持原样；本README译为中文，所以历史SHA256SUMS.txt中的README校验值不适用于译文。

文件组织方式：

- docs-*.md保存docs.docker.com在页面URL后加.md提供的原始Markdown。每页以`<!-- page: <url> fetched 2026-10-08 -->`开始，随后是原正文（各页自身# Title），不编辑页面文本。
- GitHub文件从raw.githubusercontent.com固定SHA获取，不从浮动分支。单文件schema、SPEC、CHANGELOG、README逐字节复制。docker-agent和kit-spec全部下载文件按git树字节数检查，0不匹配；其他README未检查大小。
- 运行结束再次读取七仓库main SHA，均未移动。
- 逐页面文件、树列表、原始API响应在目录外的上游session scratchpad aiefs-docker-sources-work-20261008，不属于交付。manifest/保留URL/文件列表及页面状态：252页全OK，0失败，0 HTML fallback。
- SHA256SUMS.txt保存该次取证各文件校验和。

## 获取时的 commit SHA 与版本

| 项目 | 值 |
|---|---|
| docker/docs main | `2c8a358489b56cd24069cc9e3a3d9a7b376dcfe7`（2026-10-08T07:18:51Z）；文档索引last-modified为2026-10-08T07:22:35Z，确切站点构建commit未知 |
| docker/docker-agent main | `7a69c316f03c635d8d1951bc4677c59b47beedc7`（2026-10-08T09:35:36Z）；最新release v1.149.0（2026-10-07） |
| docker/sandbox-kit-spec main | `4be7f4dff4d647f10c51dcdb392ce3fa18dc3e96`（2026-10-07T17:26:27Z）；最新v3.0.0-m.8（预发布，2026-10-02，tag commit `129be2ff45e8f9463450eb3cf04ddcb52c2b76e5`）；八tag均m.1至m.8，无稳定v3.0.0 |
| docker/sbx-releases main | `2329d12106fee653c0890152947fdd827e00cfd0`（2026-10-05T14:36:51Z）；最新稳定v0.47.0（2026-10-05），最新rc v0.48.0-rc4（2026-10-08） |
| docker/mcp-gateway main | `a34df45d4ec0e941a9853ad768c4f6cd818966b3` (2026-09-16T18:47:05Z) |
| docker/model-runner main | `ed3e67a8205b8d068b9c65b30d3708132a231bba` (2026-10-08T09:10:52Z) |
| docker/compose-for-agents main | `bfd4fe952591495af757a1a737c7eacc78c75c15` (2026-09-02T19:09:37Z) |
| 帮助所用sbx程序 | v0.47.0 0411f50ee4700fe7bd37e6e7e3aced563e850ca9 |
| 帮助所用docker-agent程序 | v1.149.0, Commit: Homebrew |
| Docker Desktop发布说明 | 最新条目4.94.0 |

## 文件

| 文件 | 来源（URL或命令） | Commit、tag或版本 | 行数 | 获取日期 | 许可 |
|---|---|---|---|---|---|
| `docs-sandboxes.md` | 79页，https://docs.docker.com/ai/sandboxes/ 下全部页，列表来自https://docs.docker.com/sitemap.xml，逐页以 `<page URL without trailing slash>.md` 获取；manifest/pages-sandboxes.txt | 2026-10-08站点，索引last-modified2026-10-08T07:22:35Z；源仓库docker/docs main `2c8a358489b56cd24069cc9e3a3d9a7b376dcfe7` | 15279 | 2026-10-08 | Apache-2.0 (docker/docs) |
| `docs-docker-agent.md` | 108页，https://docs.docker.com/ai/docker-agent/ 全部页（manifest/pages-docker-agent.txt） | 同上 | 21284 | 2026-10-08 | Apache-2.0 (docker/docs) |
| `docs-model-runner.md` | 8页，https://docs.docker.com/ai/model-runner/ 全部页（manifest/pages-model-runner.txt） | 同上 | 2414 | 2026-10-08 | Apache-2.0 (docker/docs) |
| `docs-mcp.md` | 10页，https://docs.docker.com/ai/mcp-catalog-and-toolkit/（Toolkit/Gateway/Catalog，manifest/pages-mcp-catalog-and-toolkit.txt）；沙箱侧/ai/sandboxes/mcp-gateway在docs-sandboxes.md | 同上 | 2302 | 2026-10-08 | Apache-2.0 (docker/docs) |
| `docs-compose-models.md` | 3页：https://docs.docker.com/ai/compose/models-and-compose/、https://docs.docker.com/reference/compose-file/models/、https://docs.docker.com/compose/how-tos/provider-services/（manifest/pages-compose-models.txt） | 同上 | 547 | 2026-10-08 | Apache-2.0 (docker/docs) |
| `docs-desktop-release-notes.md` | https://docs.docker.com/desktop/release-notes.md（/index.md返回404）；全文，最新4.94.0 | 同上 | 5994 | 2026-10-08 | Apache-2.0 (docker/docs) |
| `docs-sandboxes-api.md` | 额外、非录制清单：https://docs.docker.com/ai/sandboxes-api/ 下44页（manifest/pages-sandboxes-api.txt） | 同上 | 5036 | 2026-10-08 | Apache-2.0 (docker/docs) |
| `agent-schema.json` | https://raw.githubusercontent.com/docker/docker-agent/7a69c316f03c635d8d1951bc4677c59b47beedc7/agent-schema.json，树中确认路径，原文 | docker/docker-agent main = 7a69c316f03c635d8d1951bc4677c59b47beedc7（2026-10-08T09:35:36Z） | 3664 | 2026-10-08 | Apache-2.0 |
| `docker-agent-CHANGELOG.md` | docker/docker-agent根CHANGELOG.md原文；最新v1.149.0（2026-10-07），无v1.146.0 | docker/docker-agent main = 7a69c316f03c635d8d1951bc4677c59b47beedc7 | 6867 | 2026-10-08 | Apache-2.0 |
| `docker-agent-releases.md` | https://api.github.com/repos/docker/docker-agent/releases?per_page=40，40release，从v1.149.0到v1.110.0（2026-07-15），tag/日期/正文，无v1.146.0 | 2026-10-08读取API | 2395 | 2026-10-08 | Apache-2.0（Apache项目的发布说明） |
| `docker-agent-README.md` | docker/docker-agent根README.md原文 | docker/docker-agent main = 7a69c316f03c635d8d1951bc4677c59b47beedc7 | 100 | 2026-10-08 | Apache-2.0 |
| `docs-docker-agent-repo.md` | docker-agent README加docs/下126Markdown与3非Markdown（docs/data/nav.yml、docs/configuration/sandbox/kit/docker-agent.yaml、docs/configuration/sandbox/kit/docker-agent.dockerfile），130个`<!-- file: ... -->`区段，manifest/files-docker-agent-repo.txt。未保存图像/gif/mp4/svg及主题layouts/css/js/hugo.yaml/lint配置 | docker/docker-agent main = 7a69c316f03c635d8d1951bc4677c59b47beedc7 | 26932 | 2026-10-08 | Apache-2.0 |
| `SPEC-v3.md` | kit-spec的docs/spec/SPEC-v3.md，树中找到，根无此文件；main原文 | docker/sandbox-kit-spec main = 4be7f4dff4d647f10c51dcdb392ce3fa18dc3e96（2026-10-07T17:26:27Z），最新tag v3.0.0-m.8（2026-10-02，commit129be2ff45e8f9463450eb3cf04ddcb52c2b76e5）；main领先tag | 1145 | 2026-10-08 | Apache-2.0 |
| `SPEC-v3-at-v3.0.0-m.8.md` | 额外：最新tag的docs/spec/SPEC-v3.md原文；与main差29行，main加agent-interactive-sessions@1，tag没有 | tag v3.0.0-m.8 = 129be2ff45e8f9463450eb3cf04ddcb52c2b76e5 | 1138 | 2026-10-08 | Apache-2.0 |
| `kit-capabilities.md` | 20能力页：kit-spec docs/spec/capabilities/com.docker.sandbox/*.md，带page标记；agent-context@1、agent-interactive-sessions@1、agent-sessions@1、agent-skill@1、agent-skills@1、credential@1、git-identity@1、host-mount@1、kit-registry@1、lifecycle@1、long-running@1、network-policy@1/@2、port@1、privileged@1、resources@1、sbx@1、ssh-agent@1、usb-device@1、volume@1 | docker/sandbox-kit-spec main = 4be7f4dff4d647f10c51dcdb392ce3fa18dc3e96 | 1976 | 2026-10-08 | Apache-2.0 |
| `kit-spec-extras.md` | 额外：kit-spec README.md、docs/kit-intro.md、docs/spec/conformance.md、docs/agent-context-placement.md、RELEASES.md、GOVERNANCE.md、NOTICE、MAINTAINERS，带file标记 | docker/sandbox-kit-spec main = 4be7f4dff4d647f10c51dcdb392ce3fa18dc3e96 | 1412 | 2026-10-08 | Apache-2.0 |
| `kit.schema.json` | 额外：kit-spec schema/kit.schema.json原文；不保存schema/capabilities/的逐能力schema | docker/sandbox-kit-spec main = 4be7f4dff4d647f10c51dcdb392ce3fa18dc3e96 | 827 | 2026-10-08 | Apache-2.0 |
| `sbx-releases.md` | https://api.github.com/repos/docker/sbx-releases/releases?per_page=100，1至3页（100+100+5）共205项，按发布时间倒序；32稳定tag（2026-03-31 v0.21.0至2026-10-05 v0.47.0）、54rc、11nightly、108dev（dev-<sha>）；最新稳定v0.47.0、rc v0.48.0-rc4（2026-10-08） | 2026-10-08读取API；main = 2329d12106fee653c0890152947fdd827e00cfd0 | 6343 | 2026-10-08 | Docker Inc.专有；发布说明按原文引用 |
| `mcp-gateway-README.md` | docker/mcp-gateway README.md原文 | docker/mcp-gateway main = a34df45d4ec0e941a9853ad768c4f6cd818966b3 | 343 | 2026-10-08 | MIT |
| `model-runner-README.md` | docker/model-runner README.md原文 | docker/model-runner main = ed3e67a8205b8d068b9c65b30d3708132a231bba | 501 | 2026-10-08 | Apache-2.0 |
| `compose-for-agents-README.md` | docker/compose-for-agents README.md原文 | docker/compose-for-agents main = bfd4fe952591495af757a1a737c7eacc78c75c15 | 72 | 2026-10-08 | Apache-2.0 OR MIT，用户选择双许可 |
| `help-sbx.md` | 复制自$HOME/.cache/aiefs-manuals-wip/docker-research/cli/sbx.md；完整sbx --help程序输出，2026-10-08录 | sbx v0.47.0 0411f50ee4700fe7bd37e6e7e3aced563e850ca9 (Homebrew cask) | 4989 | 2026-10-08 | 专有sbx程序输出 |
| `help-sbx-cloud.md` | 复制自.../docker-research/cli/sbx-cloud.md；sbx --cloud --help | sbx v0.47.0 | 55 | 2026-10-08 | 专有sbx程序输出 |
| `help-docker-agent.md` | 复制自.../docker-research/cli/docker-agent.md；完整docker-agent --help | docker-agent v1.149.0, Commit: Homebrew | 1734 | 2026-10-08 | Apache-2.0程序输出 |
| `help-legacy-docker-sandbox.md` | 复制自.../docker-research/cli/sandbox.md；旧CLI插件docker sandbox --help | 插件Client Version v0.12.0 f13b3c1a96a8be40b06473bb3db0c26dbfe1878c（cli/versions.txt） | 394 | 2026-10-08 | Docker CLI插件输出，许可未检查（程序，非仓库） |
| `help-legacy-docker-agent.md` | 复制自.../docker-research/cli/agent.md；旧插件docker agent --help | 插件v1.32.4，Commit bd55840ec12b55874dd9fccf88912f9b6bb3e3f3（cli/versions.txt） | 468 | 2026-10-08 | docker-agent插件输出，源码Apache-2.0 |
| `probes/` | 复制自.../docker-research/cli/probes/：sbx-*.txt只读探测、docker-agent-*.txt；命令与时间戳开头，退出码结尾，2026-10-08 06:57Z至06:58Z录；有宿主用户名路径，无密钥 | sbx v0.47.0; docker-agent v1.149.0 | 206 | 2026-10-08 | sbx-*专有输出，docker-agent-* Apache-2.0输出 |
| `LICENSES.md` | 据上述仓库LICENSE/NOTICE/README编写 | 见文件 | 283 | 2026-10-08 | 不适用 |
| `README.md` | 本文件 | 不适用 | 本文件 | 2026-10-08 | 不适用 |
| `manifest/` | URL列表、仓库文件列表、逐页获取状态 | 不适用 | 692 | 2026-10-08 | 不适用 |
| `SHA256SUMS.txt` | 各文件shasum -a 256 | 不适用 | 生成值 | 2026-10-08 | 不适用 |

## 许可核查（来自仓库LICENSE，详情与全文在LICENSES.md）

- docker/docs（全部docs-*.md来源）Apache-2.0；LICENSE附录为"Copyright 2016 Docker, Inc."，README为"Copyright 2013-2026 Docker, Inc., released under the Apache 2.0 license"。
- docker/docker-agent Apache-2.0；LICENSE保留未填写"Copyright [yyyy] [name of copyright owner]"，无NOTICE。
- kit-spec Apache-2.0；LICENSE与NOTICE均"Copyright 2026 Docker, Inc."。
- model-runner Apache-2.0，"Copyright 2025 Docker, Inc."。
- compose-for-agents双许可，由用户选；LICENSE.MIT为"Copyright (c) 2025 Docker Inc."。
- mcp-gateway是MIT而非Apache-2.0（"Copyright (c) 2025 Docker"），不同于原任务简报假设。
- sbx-releases专有，LICENSE为"Copyright © 2026 Docker Inc. All rights reserved."，README说"Proprietary — Docker Inc."。程序与help同样；仅作短引文引用发布说明与帮助。

## 与审计有关的发现

- Kit v3是m.1至m.8预发布；main SPEC与m.8不同，main有agent-interactive-sessions@1、tag无。手册需明确引用哪份。
- 旧插件sandbox v0.12.0、agent v1.32.4远落后当前sbx0.47.0、agent1.149.0；help-legacy仅对照，不是当前行为。
- CHANGELOG与release API都无v1.146.0，v1.145.0后为v1.147.0。
- sbx-releases混稳定/rc/nightly/dev；docs-sandboxes.md的发布页仅近期稳定。

## 未获取项

所有请求项已获取，无curl被代理拒绝，也无需添加主机重试。以下有意不保存（录制清单外）或不存在：

- https://docs.docker.com/ai/ 裸URL未请求，研究记HTTP404。
- /ai/gordon九页与/ai/skills两页未保存；单独/ai/compose在docs-compose-models.md。
- /ai/外的/reference/cli/sbx约115生成参考页、/reference/cli/docker/mcp/*、/reference/cli/docker/model/*、/offload、/agentic-platform、/compose/bridge/use-model-runner/；改用help-sbx/help-docker-agent覆盖CLI。
- kit-spec：schema/capabilities/*逐能力JSON、examples/、skills/、tck/、Go源码。
- docker-agent：Go源码、docs/图像/gif/mp4/svg/主题；根AGENTS.md、SECURITY.md、golang_developer.yaml当时获取但不交付。
- docs.docker.com的.md fallback无需；没有创建docs-html/，全页无需HTML回退。

## 2026-10-08裁剪记录

- schema和CHANGELOG改为固定v1.149.0 tag（bf4169cdd31229d52385410c52c3dcc59b497858）；main分别差22、55行。
- sbx-releases仅保留稳定，移除rc/nightly/dev。
- 移除docs-docker-agent-repo.md与docker-agent-releases.md，分别重复文档与CHANGELOG。
- Kit引文用固定SPEC-v3-at-v3.0.0-m.8.md；main SPEC-v3.md仅未发布变更引用。
- sbx帮助与发布是Docker专有文本；docs.docker.com/reference/cli/sbx以Apache-2.0发布相同帮助。

## 2026-10-08 Desktop更新后新增

- help-desktop-4.94.md：录制宿主Desktop4.94插件列表（agent1.144.0、model客户端1.2.6/服务器1.2.8、mcp0.44.1、sandbox0.13.0 shim）与docker sandbox移除通知；程序输出，2026-10-08录制。
