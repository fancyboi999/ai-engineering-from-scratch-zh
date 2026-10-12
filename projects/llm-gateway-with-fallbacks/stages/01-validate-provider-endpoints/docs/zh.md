# 验证 provider 端点

> 把 provider 列表视为可信配置。

**类型：** Build
**语言：** Go
**阶段：** 第 1 阶段，共 4 阶段
**前置要求：** Go 结构体、切片、错误和基本 HTTP 请求。阅读[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)，了解严格 JSON 契约。
**预计时间：** 约 2 小时

## 构建内容

连接前实现 `Endpoints(values)`。允许 HTTPS，以及精确为 `localhost`、`127.0.0.1` 或 `::1` 的本地 HTTP。拒绝 userinfo、片段、查询、换行、缺主机和其他协议。移除完全相同的重复项，保留 provider 顺序。

CLI 配置含 provider 名、URL、可选模型覆盖与凭据环境变量名。从不接受凭据值。拒绝查询字符串让 bearer 密钥不进入端点 URL 和轨迹；此小网关不支持查询式 API 版本。

## 示例推演

输入顺序为主端点 `https://primary.example/v1/chat/completions`、重复主端点、`http://127.0.0.1:11434/v1/chat/completions`。验证列表保留此顺序的两项。因此主失败能到达本地回退。

保持 HTTP，将最终主机改为 `local-model.example`。拒绝整个列表。主机名中的“local”不能证明回环连接。含 `user:password@host` 的 URL 在发请求前拒绝。

```figure
pj-llm-gateway-with-fallbacks-1
```

## 实现契约

```go
func Endpoints(values []string) ([]string, error)
```

用 `net/url` 解析，检查 `Hostname`，维护独立已见集合。不排序端点：顺序就是回退策略。服务器从操作者接受配置，绝不从入站 JSON 请求字段接受。

## 运行你的实现

从仓库根目录初始化一次；评分器保留已有工作区文件：

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 1 --path /tmp/llm-gateway-with-fallbacks-work --strict
```

实现在该工作区的 `stage1.go` 中。提供的适配器调用学员函数，不导入参考方案。阶段测试含独立于 Orchard 演示的案例。

## 检查与扩展

用控件添加重复项或更改 URL 协议。为何 `https://a.example?api_key=...` 必须失败？端点验证不证明配置的 HTTPS 服务可信；选择由操作者负责。

[Go 标准库参考](https://pkg.go.dev/context)。可运行核心只用 Go 标准库。外部模型调用可选，普通评分不运行。
