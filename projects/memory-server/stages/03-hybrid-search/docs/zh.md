# 在真实 Rust 进程中为向量评分

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

用标准 Rust 工具链编译 score.rs，通过 stdin 发送查询和文档向量。计算余弦相似度，零范数向量返回零。组合 60% 的词法查询覆盖率与 40% 的余弦分数，用 id 打破平局。跨进程边界前检查维度和有限值。将 Rust 二进制编译到私有临时目录，正常进程退出时删除。绝不信任已存在于可预测共享临时路径的可执行文件。

本阶段的边界是 `cosineScores, MemoryStore.search`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

查询向量 [1,1] 和文档 [1,0] 的余弦为 1/sqrt(2)，约 0.707。词法覆盖率为 0.5 时，混合分数为 0.6*0.5+0.4*0.707，约 0.583。

```figure
pj-memory-server-3
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `cosineScores, MemoryStore.search`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

向 Rust 发送逗号分隔行前，验证向量有限且等长。零范数的分数为 0，并检查真实子进程的结果数量。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py memory-server --stage 3 --path learning-artifacts/memory-server --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 探查失败边界

改变实验中的查询，检查两部分贡献。没有字面重叠却有高哈希余弦时，可能是碰撞，不是语义支持。




## 参考资料

[MCP 工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
[Rust 标准库](https://doc.rust-lang.org/std/)
[Node HTTP API](https://nodejs.org/api/http.html)
