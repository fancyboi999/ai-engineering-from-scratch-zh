# 导出并回放中断回答的轨迹

> 交付浏览器组件和可回放的已接受事件产物。

**类型：** Build
**语言：** TypeScript, Go
**阶段：** 4 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

将已接受事件和终态序列化为 version-1 轨迹。回放对每个事件运行 apply 来重建回答，检查完成状态与事件账本是否一致。可复用的 mount 组件提供恢复、取消、引用和轨迹下载。

## 示例推演

第一次中断后立即下载。回放得到文本 Caf 和状态 interrupted。恢复后下载，回放得到完整的 Unicode 回答及一个引用。没有 complete 事件却声称 completed 的轨迹必须失败。

```figure
pj-streaming-answer-recovery-4
```

## 实现契约

`trace(state):string`；`replay(text):Answer`；`mount(host:HTMLElement,url:string):()=>void`。返回的清理函数中止工作并清空 host。build-browser.ts 将原生 TypeScript 去除类型，生成可导入的浏览器模块；不需要框架运行时。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py streaming-answer-recovery --init /tmp/streaming-answer-recovery-work
python3 scripts/project_test.py streaming-answer-recovery --stage 4 --path /tmp/streaming-answer-recovery-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

需要复现解码器故障时，另行保存传输层字节轨迹。这里导出的轨迹记录已接受的应用事件和状态，不记录丢弃的部分字节。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
