---
id: chat-template-garbage
title: notebook 里一切正常，上线后的服务却停不下来
card: tokenization-decoding
kind: debug
level: 2
roles: [applied-ai-engineer, inference-engineer, forward-deployed-ai-engineer]
rounds: [debugging, screen]
tags: [chat-template, special-tokens, end-of-sequence, tokenizer, deployment]
minutes: 8
lessons: [phases/10-llms-from-scratch/02-building-a-tokenizer, phases/19-capstone-projects/30-bpe-tokenizer-from-scratch, phases/05-nlp-foundations-to-advanced/19-subword-tokenization]
manuals: []
practice: []
cheatsheet: [tokenization]
related: [tokenization-decoding/pre-tokenization-regex]
updated: 2026-11-03
---

一个微调过的对话模型在训练 notebook 里回答得很好。部署后的服务用的是同一份权重，返回的却是絮絮叨叨的文本，一直写到 token 上限。你先查哪里？预计会发现什么？

## Short answer

先查模型实际收到的扁平 token 序列，而不是消息列表。对话模型是在一种精确的排布上训练的，里面有角色标记、特殊 token 和换行；少一个换行、用错一个标记或多一个空格，都会让输入落到训练分布之外，模型就不再预测轮次结束 token。把同一个请求在两条路径上的 token ID 打印出来做 diff，再检查特殊 token 是否以保留 ID 到达，而不是以拼出它们的字节到达。

## Full answer

### 模型从来看不到 JSON

服务手里是一个角色与内容配对的列表。模型看到的是聊天模板拼出的一条扁平序列：模板插入文本开始 token、每个角色的头部标记、每条消息后的轮次结束 token，中间还有固定的换行。每个模型家族的排布都不一样。模板和词表一样，是模型的一部分。

### 三种出错方式

1. **模板不对。** 服务用了通用排布或旧版本模板。每条消息都套在模型没见过的框里，它学到的轮次结束标记缺失或位置不对，于是永远不会预测停止 token。
2. **特殊 token 被拼成了普通文本。** 特殊 token 必须在合并循环之前精确匹配，并映射到固定 ID。如果服务把 prompt 拼成纯文本，再在允许标志关闭的情况下编码，标记字符串就变成了普通字节和片段。模型看到的是长得像标记、却不是标记的文本。
3. **停止 token 不匹配。** 服务在通用的序列结束 ID 上停止，模型输出的却是自己的轮次结束 ID。生成越过真正的结尾继续往下走。

### 一步定位的检查

```text
ids_notebook = tokenizer(chat_template(messages))
ids_service  = ids the service sent to the engine
diff the two lists; the first difference is the bug
```

然后把每个 ID 解码回字符串，找那种被解成好几段、而不是单个保留 ID 的标记。如果两份列表一致，输入就没问题，接下来查停止 token：对比服务配置里的停止 ID 和模板放在每条消息后面的轮次结束 ID。

### 修复

用模型自带的模板函数，让特殊 token 走保留 ID 的路径，把停止 token 配成模板用来结束一轮的那个 ID。把分词器文件、模板和权重一起冻结版本。

## Follow-ups

- **Level 2:** 轮次结束 token 在推理时起什么作用？ Expected: 它是模型表示回答已经完成的信号；服务端必须在这个 ID 上停止，否则生成会一直跑到上限。
- **Level 3:** 用户在聊天框里输入了某个特殊 token 的字面字符串，应该怎样处理？ Expected: 允许标志关闭时，它会变成普通字节，这是处理用户文本的安全默认；标志打开时，用户就可能注入控制标记。
- **Level 3:** 怎样测试一个模板实现？ Expected: 对固定的消息列表构建序列，再与模型自带模板代码的输出逐个 ID 比对。
- **Level 4:** 模板是对的，notebook 和服务的 ID 还是不一样。还可能是什么？ Expected: 分词器文件版本不同、归一化步骤不同，或者在开头添加特殊 token 的设置不同；给分词器文件算哈希，再比对这些标志。

## Wrong answers

- "服务端的采样温度太高。" 温度改变的是选中哪个 token，不决定停止 token 会不会被预测；ID 在采样之前就已经不同了。
- "微调过拟合了。" 同一份权重在 notebook 里表现正常；差别在输入的排布。
- "在客户端把输出截掉。" 这只是掩盖症状，模型仍在为不该生成的文本浪费算力。

## Taught in

[分词器构建课程](../../../phases/10-llms-from-scratch/02-building-a-tokenizer/)展示了模板和特殊 token 的处理路径，[BPE 综合项目](../../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/)解释了允许标志，[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)列出了漂移和空白相关的坑。
