# 导出脱敏的助手上下文包

> 在 TypeScript 时间线中消费 Go 数据包。

**类型：** Build
**语言：** Go, TypeScript
**阶段：** 4 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

导出 version-1 数据包，包含 rows、observedAt 和明确的脱敏说明。删除原始事件消息、工作负载 spec/status、标签及无关注解。TypeScript 检查数据包，渲染带 Warning 筛选和可下载 JSON 包的 HTML 时间线。

## 示例推演

fixture 消息包含假凭据，不得出现在 Go JSON 或生成的 HTML 中。时间线仍显示 Warning/Failed、计数 4、pod-old 和修订版本 7，便于检查保留的证据。

```figure
pj-kubernetes-event-storyboard-4
```

## 实现契约

Go `Export(Bundle)(Pack,error)` 组合分组和关联。TypeScript `parsePack(text)` 验证版本、行、正计数和有序发生时间；`timeline(pack)` 返回经过转义的独立 HTML。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py kubernetes-event-storyboard --init /tmp/kubernetes-event-storyboard-work
python3 scripts/project_test.py kubernetes-event-storyboard --stage 4 --path /tmp/kubernetes-event-storyboard-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

下载筛选后页面的上下文，再解析一次。筛选改变可见性，但下载仍保留完整脱敏包。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
