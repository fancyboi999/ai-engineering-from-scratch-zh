# 从编写好的教程提取显式请求

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

识别可执行教程示例，而不是从任意代码块猜测意图。

## 公开契约

```typescript
extractRequests(markdown:string):RequestStep[]
```

只解析起始行恰为 ```request 的围栏，将其解析为 JSON。每个请求具有 id,method,path,status，以及可选的 body,assert,capture。方法为 GET/POST/PUT/PATCH/DELETE；path 以一个斜杠开头；预期状态为 100..599。Assert 将点分响应路径映射到预期 JSON 值。Capture 将变量名映射到 `{path,type:string|number|boolean}`。返回的 line 是从 1 开始的起始围栏行号。ID 必须唯一；最多 20 步。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

在教程第 5 行开始的 request 围栏，在清单中保留 line:5。周围正文或普通 json 围栏不会作为请求运行。

```figure
pj-api-tutorial-runner-1
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py api-tutorial-runner --init my-api-tutorial-runner
python3 scripts/project_test.py api-tutorial-runner --stage 1 --path my-api-tutorial-runner --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

忽略普通 JSON 围栏。拒绝格式错误或未闭合的显式块、不支持的方法，以及能逃离所选 origin 的路径。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-api-tutorial-runner
node cli.ts sample.json output
```

可重放请求清单、JUnit 结果和带注解的教程 HTML。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

为多文件教程在 line 旁增加源文件名。

范围：默认 fixture 是一个真实的临时回环 HTTP 服务器，提供编写好的 JSON 路由。这是教程检查器，不是生产负载测试器。外部测试端点需要 --allow-network 标志。响应为 JSON；重定向、流式协议、凭据和完整 OpenAPI 校验不在本子集范围内。
