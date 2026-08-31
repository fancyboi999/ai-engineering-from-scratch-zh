# 课程模板

创建新课程时使用这个模板。复制目录结构，再填入内容。

## 目录结构

```
NN-lesson-name/
├── code/
│   ├── main.py            (主实现)
│   ├── main.ts            (TypeScript 版本，如适用)
│   ├── main.rs            (Rust 版本，如适用)
│   └── main.jl            (Julia 版本，如适用)
├── notebook/
│   └── lesson.ipynb       (用于实验的 Jupyter notebook)
├── docs/
│   └── zh.md              (中文课程文档)
└── outputs/
    ├── prompt-*.md         (本节课产出的提示词)
    └── skill-*.md          (本节课产出的技能)
```

## 文档格式（docs/zh.md）

```markdown
# [课程标题]

> [一句话主旨——最值得记住的核心观点]

**类型：** Build | Learn
**语言：** Python, TypeScript, Rust, Julia（只列实际使用的语言）
**前置要求：** [所需的前置课程]
**预计时间：** ~[预计时长] 分钟

## 问题背景

[用 2–3 段说明缺少这项能力时做不到什么、为什么值得学，并给出具体失败场景。]

## 核心概念

[先用图、表和直觉建立心智模型，暂不写代码。]

## 动手构建

[从最小实现开始逐步增加复杂度；每个代码块都应能独立运行。]

### 第 1 步：[名称]

[说明]

    [code block]

### 第 2 步：[名称]

[说明]

    [code block]

[继续补充步骤]

## 实际使用

[展示生产框架如何解决同一问题，并与手写版本比较。]

## 拿去用

[说明本课产出的可复用提示词、技能、agent、MCP server 或工具，并保存到 outputs/。]

## 练习

1. [简单——巩固核心概念]
2. [中等——应用到不同问题]
3. [困难——扩展实现或结合前置课程]

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| [术语] | [常见误解] | [准确定义] |

## 延伸阅读

- [资料 1](url) — [推荐理由]
- [资料 2](url) — [推荐理由]
```

## 代码文件规范

- 代码必须无报错地运行
- 不写注释——代码应当自解释
- 用最契合该主题的语言
- 如果有依赖，附上 `requirements.txt` 或等价物
- 由简入繁，逐步搭建复杂度
- 每个函数和类都应有明确的用途

## 产出文件格式

### 提示词

```markdown
---
name: prompt-name
description: What this prompt does
phase: [phase number]
lesson: [lesson number]
---

[Prompt content]
```

### 技能

```markdown
---
name: skill-name
description: What this skill teaches
version: 1.0.0
phase: [phase number]
lesson: [lesson number]
tags: [relevant, tags]
---

[Skill content]
```
