---
id: hash-bucket-assignment
title: 读懂 prompt 路由器的实验分组代码
card: production-mlops
kind: code-reading
level: 2
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [coding, debugging]
tags: [ab-testing, assignment, hashing, prompt-versions]
minutes: 8
lessons: [phases/11-llm-engineering/13-production-app]
manuals: []
practice: []
cheatsheet: [production-llm-app, progressive-delivery]
related: [production-mlops/split-ratio-mismatch, production-mlops/evals-or-ab-test]
updated: 2026-11-03
---

生产应用里的这个函数为每个请求选择 prompt 版本。说明它做了什么，为什么把用户 id 和实验名放在一起哈希，以及实验配置里的数字 10 对一个用户一周的体验意味着什么。

```python
AB_EXPERIMENTS = {
    "general_chat_v2_test": {
        "template": "general_chat",
        "control": "v1",
        "variant": "v2",
        "traffic_pct": 10,
    },
}


def select_prompt(template_name, user_id, variables):
    versions = PROMPT_TEMPLATES.get(template_name)
    if not versions:
        raise ValueError(f"Unknown template: {template_name}")
    version = "v1"
    for exp_name, exp in AB_EXPERIMENTS.items():
        if exp["template"] == template_name:
            bucket = int(hashlib.md5(f"{user_id}:{exp_name}".encode()).hexdigest(), 16) % 100
            if bucket < exp["traffic_pct"]:
                version = exp["variant"]
            else:
                version = exp["control"]
            break
    template = versions.get(version, versions["v1"])
    return template, template.template.format(**variables)
```

## Short answer

代码对用户 id 加实验名做哈希，结果对 100 取模，桶号小于流量百分比的用户分到变体组。哈希是确定性的，所以在实验期间，同一个用户的每个请求都落在同一组。哈希里带上实验名，两个实验的分桶就相互独立，在上一个测试里看到变体的那批用户，到下一个测试就不是同一批人。流量百分比为 10 时，大约十分之一的用户整周每个请求都看到变体，其余用户永远看不到。

## Full answer

### 逐行看

1. 默认版本是 `v1`，所以没有实验的模板总能解析出版本。
2. 循环找到这个模板对应的实验，遇到第一个匹配就停。一个模板同一时间只有一个实验。
3. 桶号是 `user_id:exp_name` 的哈希，按整数读取后对 100 取模，得到 0 到 99 的值。
4. 桶号小于 `traffic_pct` 的分到变体组，其余的分到对照组。
5. 用请求变量渲染模板。

### 为什么哈希是确定性的

课程说得很明确：对用户 id 做哈希，不要随机抽。每个请求随机抽一次，同一个用户就会在两个 prompt 之间来回切换，看到两种行为，按用户统计的指标也会混入两组的数据。每个用户固定在一组，曝光数也就成了用户数，这正是实验分析需要的。

### 为什么键里要有实验名

没有它，一个用户在每个实验里的桶号都一样，每次都是同样那十分之一的用户进变体组。实验之间会相关，一个实验的影响会带进下一个。实验名起到盐的作用，让每个实验有自己的分组。

### 要注意什么

- 对 100 取模，步长是百分之一。更小的比例需要更大的模数。
- 演示用 1000 个合成用户 id 跑一遍选择器，打印对照组和变体组的占比。这是一个低成本的样本比例检查，应该放进测试。
- `break` 意味着同一模板上的第二个实验永远不会运行。配置的结构能让人看出这一点，但没有任何东西会提醒你。

## Follow-ups

- **Level 2:** 为什么一个用户在多次请求中一直留在同一组？ Expected: 同一个用户 id 和实验名的哈希每次得到同一个桶号。
- **Level 2:** 同一个模板配置了两个实验。会怎样？ Expected: 循环取第一个匹配后就 break，第二个实验永远不会分到任何人。
- **Level 3:** 为什么不只对用户 id 做哈希？ Expected: 同一批用户会进入每个实验的变体组，实验之间相关，残留效应会混进结果。
- **Level 3:** 演示怎样检查分组，你还会加什么？ Expected: 它用 1000 个合成 id 跑选择器并打印两组占比。在真实曝光日志上加同样的检查，作为样本比例检查。

## Wrong answers

- "每次随机抽一个数，小于百分比就进变体组，更简单，效果一样。" 那是按请求分组，同一个用户会在两组间切换，两个 prompt 都会看到。
- "这个哈希函数不够强，所以分组有问题。" 这里的哈希不是安全控制。它只需要确定、分布均匀。
- "百分比是请求的占比。" 是用户的占比，因为桶号按用户计算，而且固定不变。

## Taught in

[生产应用课程](../../../phases/11-llm-engineering/13-production-app/)构建了基于哈希分组实验的 prompt 路由器，并在演示中检查分组比例。
