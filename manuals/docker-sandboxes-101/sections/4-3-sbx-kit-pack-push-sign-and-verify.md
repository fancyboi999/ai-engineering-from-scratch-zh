# `sbx kit pack`、`sbx kit push --sign` 与 `sbx kit verify`

> `sbx kit` 命令为 v1/v2 产物打包、签名、推送、验证并显示溯源；`kit add` 向运行中沙箱追加 mixin。

你写了安装 `tree` 并在工作区放入 `HELLO.md` 的 v2 mixin。同事想不用克隆仓库就获取它，安全团队想知道谁签名。只要 kit 是 v1/v2，`sbx kit` 命令就覆盖这两件事。

读完本节，你能验证、打包 v2 kit，说明 `push --sign` 为 manifest 附加什么，还能验证签名并向运行中沙箱添加 mixin。

## spec.yaml 与 files/ {#s-sbx-kit-pack-push-sign-and-verify-spec-yaml-and-files}

**Mixin（v2）：** 含 `spec.yaml` 的目录，其中 `schemaVersion` 为 `"2"`、`kind` 为 `mixin`，可选 `files/` 目录树 {{docs-sbx Use existing kits}}。录制套件写了一个：

```listing
title: 录制套件写出的 v2 mixin
source: capture/fixtures/kits/hello-mixin/spec.yaml
lang: yaml
---
schemaVersion: "2"
kind: mixin
name: hello-mixin
description: Installs tree and adds a greeting file to the workspace.
setup:
  install:
    - command: apt-get update && apt-get install -y tree
      user: "0"
      description: Install tree
permissions:
  network:
    allow:
      - example.com
```

`files/workspace/HELLO.md` 只有一行，`sbx kit inspect` 将它报告为 mode 420 的工作区文件（`capture/out/12-inspect.json`）。内置 agent 使用 v2 语法，规范正文位于 `docker/sbx-kits-contrib` 的 `SPEC-v2.md` {{docs-sbx Top-level fields}}。

## validate 与 pack {#s-sbx-kit-pack-push-sign-and-verify-validate-and-pack}

`sbx kit validate REFERENCE` 接受目录、ZIP 或 git 引用，`--json` 报告结论与 warning {{help-sbx sbx kit validate}}：

```listing
title: 先 validate，再 pack
source: capture/out/12-validate.json
lang: json
---
{
  "reference": "./fixtures/kits/hello-mixin",
  "kind": "directory",
  "valid": true,
  "warnings": []
}
```

```listing
title: pack 写出的 ZIP
source: capture/out/12-pack.txt
lang: text
---
$ sbx kit pack ./fixtures/kits/hello-mixin -o $CAPTURE/work/hello-mixin.zip
Packed artifact to $CAPTURE/work/hello-mixin.zip
[exit 0]

$ zip listing of work/hello-mixin.zip (size, name)
       0  files/
       0  files/workspace/
      22  files/workspace/HELLO.md
     297  spec.yaml
```

`pack` 要求“The directory must contain a valid spec.yaml and an optional files/ directory” {{help-sbx sbx kit pack}}，有效 spec.yaml 及可选 files/。同一 ZIP 验证结果为 `kind: "zip"`（`capture/out/12-validate-zip.json`）。v3 目录在两条命令中都失败，见[描述文件一节](#s-syntax-docker-sandbox-kit-3-and-kit-yaml)。[图](#fig-4-3) 展示完整路径，未执行步骤用虚线框。

```figure
id: fig-4-3
kind: flow
title: 从 spec.yaml 到签名产物，再进入沙箱
claim: v2 kit 在宿主验证并打包，签名推送时带两个 referrer，从 registry 验证后由 create 或 kit add 消费。
caption: 逐行读。实线框来自 capture/out/12-validate.txt、12-pack.txt、12-run-kit.txt、12-kit-add.txt 和 12-kit-add-files.txt。虚线框依据未运行的 sbx kit sign、push、verify 与 provenance 帮助文本。
```

## sign、push --sign 与 pull {#s-sbx-kit-pack-push-sign-and-verify-sign-push-sign-and-pull}

录制套件未执行这三个命令，因为没有 registry 与签名身份；来源是帮助文本。`sbx kit sign` 默认无密钥，使用 CI provider 的 OIDC token 或浏览器登录。“A token is never read from SIGSTORE_ID_TOKEN, so it cannot be chosen by anything that can set an environment variable” {{help-sbx sbx kit sign}}，不读此环境变量，避免能设置环境变量的程序选择 token。`--key` 用未加密 PEM 私钥签名。“For a local directory, a detached signature bundle is written to kit.sig.bundle next to spec.yaml” {{help-sbx sbx kit sign}}，本地目录的分离签名包写在 spec.yaml 旁的 kit.sig.bundle。

`sbx kit push DIRECTORY REFERENCE` 按 `schemaVersion` 选择产物：`"1"` 为 ZIP，`"2"` 为 tar+gzip 层，spec 在 config blob {{help-sbx sbx kit push}}。“With --sign, the pushed manifest is signed and the Sigstore bundle is attached to the kit as an OCI referrer” {{help-sbx sbx kit push}}，带 --sign 时签名 manifest 并以 OCI referrer 附加 Sigstore 包。不论签名与否，“Every push also attaches a SLSA provenance attestation as an OCI referrer” {{help-sbx sbx kit push}}，每次还附加 SLSA 溯源证明；“The provenance is unsigned unless --sign is given” {{help-sbx sbx kit push}}，否则溯源不签名。`--tlog-upload=false` 不将私有 kit 写入 Rekor 日志。`pull` 要求“The registry must support HTTPS” {{help-sbx sbx kit pull}}，registry 支持 HTTPS。

发布后的 v3 镜像可用同一命令按引用签名，但“V3 kits shared as source directories or Git references can't be signed” {{docs-sbx Sign and verify kits}}，源目录或 Git 引用形式不能签名。

## verify、provenance 与准入设置 {#s-sbx-kit-pack-push-sign-and-verify-verify-provenance-and-the-settings-that-admit-a-kit}

`sbx kit verify` 用 `--key PUB` 验证密钥签名，或用 `--certificate-identity` 与 `--certificate-oidc-issuer` 验证无密钥签名。`--insecure-ignore-tlog` 接受私有无密钥签名，但“It has no effect on key-based verification” {{help-sbx sbx kit verify}}，不影响密钥验证。`sbx kit provenance REFERENCE` 打印证明；“only attestations that verify and whose subject matches the kit's own digest are reported as VERIFIED” {{help-sbx sbx kit provenance}}，只有验证成功且 subject 匹配 kit digest 的证明才标为 VERIFIED。

六项设置决定沙箱接受什么，录制宿主全部为默认值：

```listing
title: 默认 kit 设置
source: capture/out/02-settings.txt
lang: text
note: description 列已截去。
---
kit.allowExtractedAgents             true                               bool     default             Admit the pinned kit references that replace fo…
kit.allowLocalKits                   true                               bool     default             Allow installing kits from local directories or…
kit.allowedSources                   ["docker.io/"]                     json     default             JSON array of allowed kit source prefixes (e.g.…
kit.ignoreTransparencyLog            false                              bool     default             Verify keyless kit signatures without requiring…
kit.requireSignature                 false                              bool     default             Require a valid signature from a trusted signer…
kit.trustedSigners                   [{"identityRegexp":"^.*@docker\…   json     default             JSON array of trusted signer policies (key-base…
```

“When `kit.requireSignature` is `true`, `sbx` rejects unsigned kits, signatures that don't match `kit.trustedSigners`, and ZIP kits” {{docs-sbx Require signed kits}}，开启签名要求后拒绝未签名、不匹配信任身份以及 ZIP kit。`kit.trustedSigners` 的“The default policy trusts Docker employee identities ending in `@docker.com`, attested by Google's issuer” {{docs-sbx kit.trustedSigners}}，默认信任由 Google issuer 证明的 Docker 员工身份。[设置表](#s-ref-settings-keys-environment-variables-and-paths) 列出各键环境变量。

## kit add 与 builder {#s-sbx-kit-pack-push-sign-and-verify-kit-add-and-the-builder}

`sbx kit add SANDBOX REFERENCE` 重建容器并追加 mixin，“preserving kit-owned volumes (e.g. agent session state) across the swap” {{help-sbx sbx kit add}}，替换时保留 kit 卷，如会话状态。录制展示接受和拒绝情况：

```listing
title: kit add 接受 env-mixin，拒绝 hello-mixin
source: capture/out/12-kit-add.txt
lang: text
---
$ sbx kit add m101-demo ./fixtures/kits/env-mixin
Recreating sandbox "m101-demo" to apply augmented kit list...
  Swap container m101-demo-swap-<id> started (id=<sha256>).
Kit "env-mixin" added to sandbox "m101-demo"
[exit 0]

$ sbx exec m101-demo sh -c 'env | grep M101_FROM_KIT'
M101_FROM_KIT=yes
[exit 0]
```

```listing
title: 含文件的 mixin 被拒绝
source: capture/out/12-kit-add-files.txt
lang: text
---
$ sbx kit add m101-demo ./fixtures/kits/hello-mixin
error: kit "hello-mixin" declares files, which the kit-add recreate flow does not yet apply; recreate the sandbox from scratch via `sbx rm` + `sbx create --kit` to use this kit
[exit 1]
```

没有 recreate-aware 标签的旧沙箱会被拒绝 {{help-sbx sbx kit add}}；`long-running@1` 也不能如此添加 {{rel-sbx v0.47.0}}。`sbx create shell --kit ./fixtures/kits/hello-mixin` 完整应用同一 mixin：一条安装命令、一个工作区文件和一条允许规则（`capture/out/12-run-kit.txt`、`12-policy-kit.txt`）。

v3 源构建“run inside a shared builder sandbox named sbx-kit-builder, created on first use” {{help-sbx sbx kit builder}}，按帮助应在首次使用时创建的共享 builder 沙箱运行。`sbx kit builder status` 报告状态，`history` 转发给 `docker buildx history`：

```listing
title: 构建前的 builder
source: capture/out/13-kit-builder-status.txt
lang: text
---
$ sbx kit builder status
Builder:      not created (the first source-form kit build creates it)
Builder kit:  docker.io/docker/sbx-kit-builder:1
Kit registry: 127.0.0.1:5411 — reachable
[exit 0]
```

```takeaways
- `pack` 或 `push` 前运行 `sbx kit validate`，使用与 create 相同的 `--kit-arg`。
- 用 `--sign` 推送，按预期密钥或身份、issuer 验证。
- 先设 `kit.trustedSigners` 再设 `kit.requireSignature`，否则只有 Docker 自身身份能通过。
- 变量、命令与允许规则可用 `sbx kit add`；声明文件的 mixin 需要重建。
```

Sources: help-sbx sbx kit add, builder, pack, provenance, pull, push, sign, validate, verify (research/sources/help-sbx.md); docs-sbx Kits v2, Build and distribute kits, kit settings (research/sources/docs-sandboxes.md); rel-sbx v0.47.0 (research/sources/sbx-releases.md); research/conflicts-register.md row C13; capture/fixtures/kits/hello-mixin/spec.yaml, capture/fixtures/kits/env-mixin/spec.yaml; capture/out/02-settings.txt, 12-inspect.json, 12-validate.json, 12-validate-zip.json, 12-pack.txt, 12-run-kit.txt, 12-policy-kit.txt, 12-kit-add.txt, 12-kit-add-files.txt, 13-kit-builder-status.txt
