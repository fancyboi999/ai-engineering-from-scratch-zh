# 调度延迟重复尝试

> 只有延迟先于胜出响应到期，才发起第二次安全读取。

**类型：** Build
**语言：** Go
**阶段：** 第 2 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

启动主请求与延迟计时器。计时器前有效主结果阻止对冲。否则最多发起一次次请求。在父 context 下设置两秒上限，只执行 GET。

## 示例推演

本地主端点睡眠 80ms，次端点 5ms。10ms 对冲延迟可约在 15ms 返回，却创建第二个服务请求。精确观测时间取决于本地调度器。

```figure
pj-hedged-request-lab-2
```

## 实现契约

`Hedged(parent context.Context,client *http.Client,endpoints []string,delay time.Duration)(Receipt,error)`。接受一或两个端点，延迟为 0 到 1 秒。Receipt 含发起尝试数、胜出索引、值、胜出延迟。本阶段的响应验证由脚手架提供。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py hedged-request-lab --init /tmp/hedged-request-lab-work
python3 scripts/project_test.py hedged-request-lab --stage 2 --path /tmp/hedged-request-lab-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

将延迟设为高于主延迟。第二端点不应收到请求，launched 须保持一。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
