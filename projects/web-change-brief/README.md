# 网页变更简报

将嘈杂 HTML 快照变为精确可读文本变更的小报告。

构建独立变更报告、changes.json 和可复用 baseline.json 快照。输入：同 URL 的两份保存 HTML 快照，或保存的 JSON 基线加一个显式真实 HTTP(S) URL。

## 开始前

Go 1.22 或更新。必需核心用标准库、离线运行。Go 标准库无需框架即可提供 HTTP 限制、context 取消、原子文件替换、安全 HTML 模板。

- 能编写 Go 函数、切片、映射和错误返回。
- 理解 HTTP 响应状态、Content-Type 和正文。
- 理解文本快照与渲染网页暴露的信息不同。

## 动手构建

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 1 --path my-web-change-brief
python3 scripts/project_test.py web-change-brief --all --solution --strict
```

首命令创建有意未完成工作区。后续阶段扩展同一源文件；测试含新留出输入。参考通过验证示例，不授予学员证书。

## 实际使用

```bash
cd projects/web-change-brief/solution
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

本地打开生成的 index.html。把 HTML 和 JSON 复制进工作流，或从 main 导入具名函数。附带演示对原创 fixture 运行同一实现：

```bash
python3 demo.py
```

## 阶段

1. [比较页面前提取文本](stages/01-extract-readable-blocks/docs/zh.md)
2. [比较精确文本并保留重复项](stages/02-compare-snapshots/docs/zh.md)
3. [抓取单页而不丢基线](stages/03-fetch-and-save/docs/zh.md)
4. [导出可供人工检查的简报](stages/04-export-change-evidence/docs/zh.md)

## 结果能证明什么

提取器是刻意受限的可读块扫描器，不是 HTML5 DOM 或浏览器。不执行 JavaScript、不评估 CSS 可见性、不抓链接资源。忽略块顺序，保留重复文本计数。过滤短语可能隐藏有用变化，所以两快照使用相同显式过滤策略。

真实模式：go run . --fetch https://YOUR_HOST/YOUR_PAGE --baseline ./web-change-output/baseline.json --out ./next-report。只抓选定页面，有 HTTP 超时、2 MB 正文限制、同主机重定向。HTTPS 抓取拒绝跳转到 HTTP。除非报告成功后显式传 --accept，否则已有基线不变。不安装后台监控或通知。

provider 测试用受控响应或回环 HTTP。验证请求响应契约，不验证模型质量或真实服务可用性。项目未配置账号连接、外发消息、周期任务或云部署。

## 改成自己的版本

用工作流的小型导出替换原创 fixture，运行前写预期结果。保留第二套示例用于评估。有用前后演示应展示输入、可检查中间证据和可移植输出；不能以热度结论替代测量结果。

## 主要参考

[官方 API 文档](https://pkg.go.dev/net/http)。全部项目代码、课程正文、fixture 均为原创。
