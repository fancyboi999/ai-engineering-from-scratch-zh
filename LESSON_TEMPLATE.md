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
│   └── en.md              (课程文档)
└── outputs/
    ├── prompt-*.md         (本节课产出的提示词)
    └── skill-*.md          (本节课产出的技能)
```

## 文档格式（docs/zh.md）

```markdown
# [Lesson Title]

> [One-line motto — the core idea that sticks]

**Type:** Build | Learn
**Languages:** Python, TypeScript, Rust, Julia (list what's used)
**Prerequisites:** [List prior lessons needed]
**Time:** ~[estimated time] minutes

## The Problem

[2-3 paragraphs. What can't you do without this? Why should you care?
Make it concrete — show a scenario where not knowing this hurts.]

## The Concept

[Explain with diagrams and intuition. No code yet.
Use ASCII diagrams, tables, or link to visuals in the web app.
Build mental models before implementation.]

## Build It

[Step-by-step implementation from scratch.
Start with the simplest version, then add complexity.
Every code block should be runnable on its own.]

### Step 1: [Name]

[Explanation]

    [code block]

### Step 2: [Name]

[Explanation]

    [code block]

[...continue...]

## Use It

[Now show how frameworks/libraries do the same thing.
Compare your from-scratch version to the library version.
This proves the concept and introduces practical tools.]

## Ship It

[What reusable artifact does this lesson produce?
Could be a prompt, a skill, an agent, an MCP server, or a tool.
Include it here and save it in the outputs/ folder.]

## Exercises

1. [Easy — reinforce the core concept]
2. [Medium — apply it to a different problem]
3. [Hard — extend or combine with prior lessons]

## Key Terms

| Term | What people say | What it actually means |
|------|----------------|----------------------|
| [term] | [common misconception] | [actual definition] |

## Further Reading

- [Resource 1](url) — [why it's worth reading]
- [Resource 2](url) — [why it's worth reading]
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
