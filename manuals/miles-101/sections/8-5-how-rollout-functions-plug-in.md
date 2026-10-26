# rollout function 如何接入 Miles

> generate、reward、filter 和 loss function 都可以通过 import path 接入 Miles，因此新增配置无需 fork。

每种 RL 配置都会改变某些内容：答案如何生成、如何评分，以及 trainer 保留哪些组。如果每次改动都需要 fork，每个团队都要维护自己的 Miles 副本。Miles 通过一组接收 Python import path 的 flag 避免了这种情况。

读完本节后，你可以解释自定义函数如何接入训练步骤，并为改动选择最小的 hook。

## 如何通过路径调用函数 {#s-how-rollout-functions-plug-in-how-a-path-becomes-a-function}

每个 flag 都会接收类似 `my_package.my_module.my_function` 的路径。Miles 导入模块并获取相应函数。Miles 也会先检查一个小型 registry，但只有 Miles 自己的测试会填充它。

因此，你的函数应保存在 Miles 源码目录以外的文件中。将该文件挂载进容器，或将它安装为 package，然后传入路径。

## 训练步骤调用的 hooks {#s-how-rollout-functions-plug-in-the-hooks-in-the-order-a-step-uses-them}

| Hook | Flag | 函数的作用 |
|---|---|---|
| Rollout | `--rollout-function-path` | 替换整个训练步骤的 rollout |
| Generate | `--custom-generate-function-path` | 在默认 rollout 中为单个样本生成答案 |
| Reward | `--custom-rm-path` | 为单个样本评分 |
| Group filter | `--dynamic-sampling-filter-path` | 按组保留或丢弃同一 prompt 的答案 |
| Buffer filter | `--buffer-filter-path` | 选择离开 buffer 的组 |
| Sample filter | `--rollout-sample-filter-path` | 决定哪些样本参与 loss 计算 |
| Data buffer | `--custom-async-data-buffer-path` | 替换 fully async 模式下已完成组的 buffer |
| Loss | `--custom-loss-function-path`，并设置 `--loss-type custom_loss` | 计算 loss |

## 使用最小的 hook {#s-how-rollout-functions-plug-in-use-the-smallest-hook}

表格中越靠下的 hook，替换的 Miles 功能越少。选择能覆盖改动的最小 hook：

- 新评分规则只需使用 reward hook。
- 多轮或调用工具的 agent 需要 generate hook。[第 3.3 节](#s-train-an-agent)展示了内置实现。
- DAPO 风格的 filter 只需使用 group filter。Miles 内置了一个会丢弃所有答案 reward 相同的组的 filter。
- 只有步骤结构本身改变时，才替换整个 rollout。

使用更小的 hook 可以继续使用 Miles 的其他功能：batching、指标和差距检查。只有 generate function 支持时，partial rollout 才能继续使用。如[第 4.2 节](#s-handle-long-responses)所示，内置多轮和 agent generate function 不支持它。

## 没有合适的 hook 时再 fork {#s-how-rollout-functions-plug-in-fork-only-when-no-hook-fits}

有些团队会 fork Miles 或 slime，以添加尚不存在的 hook。Miles issue tracker 中有类似做法：贡献者先在 fork 中添加回归测试，再创建 issue。如果你要 fork，应保持改动精简并提交回上游，避免 fork 与主线逐渐偏离。

```takeaways
- 将自定义函数保存在自己的文件中，并传入它的 import path。
- 选择足以覆盖改动的最小 hook。
- 只在需要添加 hook 时 fork，并将 hook 贡献回上游。
```

来源：Miles main 08752a12 中的 function registry、rollout、reward、filter、data buffer 和 loss 参数；Miles issues 4238 和 3714 及其贡献者 fork。
