# Miles 的起源

> Miles 于 2025 年 10 月从 slime 复制而来，后来发展出自己的功能，因此应阅读 Miles 自己的发行说明。

了解 Miles 的源头后，它的设计会更容易理解。Miles 最初是 Zhipu GLM 团队开发的 RL 框架 slime 的一个副本。如今，它仍与 slime 共享大部分设计。

读完本节后，你可以解释 Miles 和 slime 的关系，以及升级时需要注意什么。

## slime 的起步 {#s-where-miles-came-from-slime-first}

slime 于 2025 年 6 月启动。它将 Megatron trainer 与 SGLang rollout engine 连接起来，并在中间加入 data buffer，以支持自定义数据生成。从 GLM-4.5 开始，GLM 团队使用 slime 对 GLM 模型进行强化学习训练。

## 两者分道扬镳 {#s-where-miles-came-from-the-split}

| 日期 | 事件 |
|---|---|
| 2025-10-05 | slime 和 Miles 最后一个共同提交 |
| 2025-10-09 | Miles 仓库从 slime 历史副本开始 |
| 2025-11-19 | RadixArk 团队首次公开发布 Miles 介绍 |
| 2026-08-18 | Miles v0.1.0 |
| 2026-09-26 | Miles v0.1.1 |
| 2026-10-09 | Miles v0.1.2 和 slime v0.4.0 同日发布 |

RadixArk 是一家基于 SGLang 构建产品并持续投入该项目的公司。它的首篇文章称，Miles 将专注于新硬件、大型 mixture-of-experts 强化学习和生产稳定性。文章还表示，大多数新增功能会回馈给 slime。

## 两者目前的差异 {#s-where-miles-came-from-how-far-they-have-grown-apart}

截至 2026-10-20，Miles 拥有约 2,500 个 slime 尚未合并的提交，slime 也有约 1,200 个 Miles 尚未合并的提交。截至该日期，Miles 独有的功能包括：

- 在 Megatron 和 FSDP 之外增加第三种 trainer backend：torchtitan。
- 支持通过 RDMA 传输权重，并为所有传输方式提供共用的更新驱动器。
- 提供 session server，在 agent 轮次之间传递 token。
- 增加 MXFP8、NVFP4 和 INT4 训练配置。
- 支持 multi-LoRA 训练。
- 提供实验性的 Kubernetes backend 和用于测试的故障注入器。

slime 也在独立发展。v0.3.0 增加了 agent 模块。v0.4.0 只保留同步和 fully async 模式，并新增自己的 rollout 数据存储。

## 这对你有什么影响 {#s-where-miles-came-from-what-this-means-for-you}

- **阅读 Miles 的发行说明，不要参考 slime 的说明。**两者同名 flag 的行为可能不同。
- **使用镜像中的 SGLang。**Miles 使用带 RL 接口的修改版 SGLang。原版 SGLang 发行版不包含所有这些接口。
- **固定镜像版本。**Miles 每个发行周期都会合并数百个 pull request。`latest` tag 会变化，因此应按[第 6.4 节](#s-pick-an-image)的说明记录每次运行的 digest。

```takeaways
- Miles 于 2025 年 10 月从 slime 复制而来，目前两者在许多功能上已经不同。
- 使用 Miles 镜像内的 SGLang 构建版本，不要换成原版发行版。
- 升级前先阅读 Miles 发行说明并固定镜像 digest。
```

来源：Miles 和 slime 仓库及发行说明；Miles 发布公告，2025-11-19；Miles v0.1 公告，2026-08-18；slime README。
