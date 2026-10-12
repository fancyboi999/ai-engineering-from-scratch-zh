# 导出关联源文档的失败与修正建议

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

生成可移植的测试证据，要求修正经过审核，而不是悄悄修改教程。

## 公开契约

```typescript
exportResults(steps,receipts):{junit,html,corrections}; acceptedCorrections(receipts,value):{id,line,proposal}[]
```

JUnit 为每份回执生成一个 testcase，带 failure/skipped 元素。HTML 展示源行号和真实请求/响应证据。修正草稿 `{id,line,issue,proposal:"",approved:false}` 可在浏览器中编辑。带版本的修正仅在 id,line,issue 与当前失败回执一致、approved 为布尔值且已批准的 proposal 非空时重新导入。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

报告导出 3 个 testcase，其中 1 个失败、1 个跳过。写出把 bookName 改成 title 的修正建议，审核它，下载 corrections.json 并重新导入。在作者应用补丁之前，源教程保持不变。

```figure
pj-api-tutorial-runner-4
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py api-tutorial-runner --init my-api-tutorial-runner
python3 scripts/project_test.py api-tutorial-runner --stage 4 --path my-api-tutorial-runner --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

报告 CLI 成功写入报告后，即使示例失败也以零退出；请检查 results.json/JUnit。任何修正都不会自动修改教程。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-api-tutorial-runner
node cli.ts sample.json output
```

可重放请求清单、JUnit 结果和带注解的教程 HTML。打开 `output/report.html`，检查配套机器可读文件。下载 corrections.json 后运行 `node cli.ts sample.json reviewed-output --corrections corrections.json`。accepted-corrections.json 只包含绑定当前失败且经过审核的建议。

## 扩展

将 accepted-corrections.json 接入仅供审核的文档补丁生成器。

范围：默认 fixture 是一个真实的临时回环 HTTP 服务器，提供编写好的 JSON 路由。这是教程检查器，不是生产负载测试器。外部测试端点需要 --allow-network 标志。响应为 JSON；重定向、流式协议、凭据和完整 OpenAPI 校验不在本子集范围内。
