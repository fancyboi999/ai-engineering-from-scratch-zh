# 分类故障而非全部重试

> 区分可修复的故障和有问题的请求。

**类型：** Build
**语言：** Go
**阶段：** 第 2 阶段，共 4 阶段
**前置要求：** 阶段 1 和 HTTP 状态码分类。
**预计时间：** 约 2 小时

## 构建内容

实现有三结果的 `ClassifyStatus(status)`。2xx 成功；429 和 5xx 允许回退；其他有效码终止。100 到 599 外的整数无效。

401 通常意味着需修复配置凭据。把同请求发送给多个 provider 会掩盖错误，所以此项目停止。503 表明 provider 当前无法服务，另一个配置 provider 可能有用。

## 示例推演

跟随状态 `[503, 200]`：首个为 `retry`，第二为 `success`。跟随 `[401, 200]`：401 为 `terminal`，不会联系第二 provider。307 也为 terminal，因为请求层拒绝重定向。

路由策略每 provider 最多一次。不为 `Retry-After` 睡眠，不重试同端点，不承诺超时生成未计费。

```figure
pj-llm-gateway-with-fallbacks-2
```

## 实现契约

```go
func ClassifyStatus(status int) (string, error)
```

先验证数值范围，再检查成功，再检查两个重试条件。不要用 `status >= 400` 作重试规则：会包含格式错误请求和认证失败。

## 运行你的实现

从仓库根目录初始化一次；评分器保留已有工作区文件：

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 2 --path /tmp/llm-gateway-with-fallbacks-work --strict
```

实现在该工作区的 `stage2.go` 中。提供的适配器调用学员函数，不导入参考方案。阶段测试含独立于 Orchard 演示的案例。

## 检查与扩展

预测 204、301、408、429、500、600 的结果。此策略里 408 终止。将来扩展若要重试它，先写新契约和副作用假设，再改实现。

[Go 标准库参考](https://pkg.go.dev/context)。可运行核心只用 Go 标准库。外部模型调用可选，普通评分不运行。
