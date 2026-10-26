# 为 GPU 选择镜像

> 镜像决定 GPU 能运行哪些 kernel，因此要根据 GPU 代际选择，并固定镜像 digest。

Miles 在容器镜像中运行。镜像包含 Miles、修改过的 SGLang、trainer 库和预构建的 GPU kernel。kernel 决定镜像与 GPU 的兼容性。

读完本节后，你可以为 GPU 选择合适的 Miles 镜像，并准确记录训练使用的镜像。

## 从官方镜像开始 {#s-pick-an-image-start-from-the-official-image}

Miles 团队发布的 `radixark/miles` 镜像为每个版本提供一个 tag，并额外提供 `latest`。每个镜像都基于 CUDA 13 构建，同时支持 `linux/amd64` 和 `linux/arm64`。

v0.1.2 镜像基于 SGLang v0.5.21，并叠加了 Miles 补丁。因此镜像中的 SGLang 不是原版发行版。应直接从镜像读取版本，不要参考 SGLang 项目本身的版本。

## 检查 GPU kernel 兼容性 {#s-pick-an-image-check-the-kernels-against-your-gpu}

镜像包含 FlashAttention 2 和 FlashAttention 3。FlashAttention 3 只面向 Hopper 构建。在其他 GPU 上，依赖 FlashAttention 3 的设置会在启动时失败，参见[第 4.6 节](#s-know-the-true-on-policy-limits)。

Miles 文档列出了 A100 至 GB300 的 NVIDIA GPU，以及 MI300X 至 MI355X 的 AMD GPU。GB10 不在支持列表中。不过 arm64 镜像仍能在我们的 GB10 上运行，使用 FSDP trainer 和默认的 FlashInfer attention。

## 记录每次运行所用的镜像 {#s-pick-an-image-record-what-each-run-used}

`latest` 会不断变化。相隔一周的两次运行可能使用同一个 tag 下的不同代码。每次运行前记录三项信息：镜像 digest、Miles commit 和 SGLang 版本。[第 1.1 节](#s-run-grpo-on-one-gpu-pull-the-image-and-record-what-you-pulled)列出了对应命令和我们的运行结果。

我们的 `latest` 镜像包含 2026-10-15 的 Miles 代码和 SGLang 0.5.22 开发构建，比 v0.1.2 更新。

要重复一次运行，应按 digest 拉取镜像，而不是按 tag：

```bash
docker pull radixark/miles@sha256:c64fa344e3a86715f03c0a1b6a422c474e0035355591a2f6da87bf52a74c52da
```

```takeaways
- 根据 GPU 代际选择镜像，并确认它支持哪些 attention kernel。
- 每次运行都记录镜像 digest、Miles commit 和 SGLang 版本。
- 重复运行时按 digest 拉取镜像。
```

来源：capture/gpu/out-gb10/image-identity.txt；capture/gpu/out-gb10/engine-settings.txt；Miles Dockerfile、构建脚本和 v0.1.2 发行说明；Miles README 硬件列表。
