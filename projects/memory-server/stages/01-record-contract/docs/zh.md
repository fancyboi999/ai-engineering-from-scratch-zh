# 将文本、命名空间和来源放在一起

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

每条记忆都需要有界 id、命名空间、文本和来源定位信息。绝不返回脱离来源的字符串。小型特征哈希嵌入将归一化词项映射到固定向量；它是确定性词法投影，不是预训练语义模型。哈希碰撞在预期之内，也说明了为什么检索仍需词法证据。

本阶段的边界是 `validateMemory, embed`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

记忆 {id:cache-policy,namespace:docs,text:...,source:policies/cache.md:12} 将内容和证据放在一起。namespace:private 中的同一 id 是另一条记录。

```figure
pj-memory-server-1
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `validateMemory, embed`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

哈希或写入前验证 JSON 边界。特征哈希将词项映射到 32 个桶，无关单词可能碰撞；保留词法覆盖率来揭示此限制。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py memory-server --stage 1 --path learning-artifacts/memory-server --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 探查失败边界

构造两个含相同文本的命名空间。docs 中的查询绝不能返回 private 记录。




## 参考资料

[MCP 工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
[Rust 标准库](https://doc.rust-lang.org/std/)
[Node HTTP API](https://nodejs.org/api/http.html)
