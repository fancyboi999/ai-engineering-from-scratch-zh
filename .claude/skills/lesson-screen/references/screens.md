# 屏幕

一屏对应 screens 目录中的一个 HTML 文件。每个步骤写新文件，浏览器显示最新文件。

## 片段与完整页面

默认写 HTML 片段，只含正文，不含 `<html>`、`<head>` 或样式表。服务器将它放入课程框架，补充字体、明暗主题 token、本文列出的样式类、图表运行时和点击助手。

以 `<!doctype html>` 或 `<html>` 开头的是完整页面。服务器原样发送，只补充点击助手。自制图表使用完整页面，由 `CLI publish` 放入屏幕。片段不足以表达概念时才写完整页面。

## 每一屏的规则

- 顶部短行写明课程与步骤。
- 一屏只讲一个概念，过长的步骤拆成两屏。
- 文字简短。终端负责讲解，屏幕负责图示。
- 学习者作答前，屏幕不放正确答案、答案索引或解析。
- 颜色只使用课程 token，例如 `var(--blueprint)`。框架为两种主题都提供定义。
- 所有数字来自课程正文或真实运行。
- 脚本只从页面自身、aieng-zh.cn 或 cdn.jsdelivr.net 加载。字体可从 Google Fonts 加载；其他资源受服务器的 CSP 限制。

## 样式类

| 类名 | 用途 |
|---|---|
| `ls-eyebrow` | 顶部短行：阶段、课程和步骤，使用等宽字体 |
| `ls-lead` | 以较大字号写出课程或步骤的问题 |
| `ls-rail` | 导师步骤的有序列表，用 `is-done` 和 `is-now` 标记状态 |
| `ls-card` | 带边框的卡片，可先放 `ls-card-label` 标签 |
| `ls-grid` | 双栏，低于 720 px 时改为单栏 |
| `ls-compare` | 并列两张卡片：从零实现与库调用 |
| `ls-big` | 核心思想：以粗体标签开头的一句话 |
| `ls-chips` | 一行读数，每个子元素为 `ls-chip`，数值放在 `<b>` 中 |
| `ls-trace` | 代码执行过程：`ls-code` 代码块、`ls-vars` 变量表，可附 `ls-out` 输出块 |
| `ls-line` | `ls-code` 中的一行代码，当前行标为 `is-now`，已执行行标为 `is-done` |
| `ls-question` | 带 `data-question` 的问题，包含 `ls-prompt` 和一行 `ls-choices` |
| `ls-choice` | 带 `data-choice` 的选项按钮，点击发送 `choice` 事件 |
| `ls-note` | 来源、缩放或模拟说明的短行 |
| `ls-wait` | 等待屏幕 |
| `ls-building` | 制作阶段有序列表，用 `is-done` 和 `is-now` 标记状态，示例见 `references/build.md` |
| `lesson-figure` | 已注册课程图表，名称写在 `data-figure` 中 |
| `mermaid` | 含 Mermaid 源码的 `pre`，由框架绘制 |

带 `data-part` 的元素被点击时发送 `part` 事件，可用 `data-label` 指定标签。

## 问题背景

```html
<p class="ls-eyebrow">第 07 阶段 · 第 12 课 · 问题背景</p>
<p class="ls-lead">为什么聊天越长，每生成一个 token 就越慢、越占内存？</p>
<ol class="ls-rail">
  <li class="is-now">问题背景</li>
  <li>核心概念</li>
  <li>动手构建</li>
  <li>实际使用</li>
  <li>看图理解</li>
  <li>测验</li>
</ol>
<p class="ls-big"><b>核心思想：</b> 模型保留此前每个 token 的键和值，因此内存随序列长度增长。</p>
```

## 用已注册图表讲解核心概念

从课程复制围栏首行。加上 `data-lesson`，使图表加载失败时能链接到课程页。

```html
<p class="ls-eyebrow">第 07 阶段 · 第 12 课 · 核心概念</p>
<h2>KV cache 有多大？</h2>
<div class="lesson-figure" data-figure="kv-cache-sizer" data-lesson="phases/07-transformers-deep-dive/12-kv-cache-flash-attention"></div>
<p class="ls-note">图表来自课程页。拖动序列长度，观察缓存大小。</p>
```

围栏含配置时，将配置保留在属性中，用单引号包围属性值：

```html
<div class="lesson-figure" data-figure='iso-machine {"machine":"kv-cache"}'></div>
```

## 动手构建：代码执行过程

先运行课程代码。将真实数值复制到变量表，真实输出复制到 `ls-out`。

```html
<p class="ls-eyebrow">第 07 阶段 · 第 12 课 · 动手构建 2/4</p>
<div class="ls-trace">
  <pre class="ls-code"><code><span class="ls-line is-done">def kv_bytes(layers, heads, head_dim, seq, batch, bytes_per):</span>
<span class="ls-line is-now">    per_token = 2 * layers * heads * head_dim * bytes_per</span>
<span class="ls-line">    return per_token * seq * batch</span></code></pre>
  <table class="ls-vars">
    <tr><th>layers</th><td>32</td></tr>
    <tr><th>heads</th><td>8</td></tr>
    <tr><th>head_dim</th><td>128</td></tr>
    <tr><th>bytes_per</th><td>2</td></tr>
    <tr><th>per_token</th><td>131072</td></tr>
  </table>
  <pre class="ls-out">per token: 131072 bytes</pre>
</div>
<p class="ls-note">数值来自本课 code/main.py 的一次运行。</p>
```

## 实际使用：并列比较从零实现与库调用

```html
<p class="ls-eyebrow">第 07 阶段 · 第 12 课 · 实际使用</p>
<div class="ls-compare">
  <div class="ls-card"><p class="ls-card-label">从零实现</p><pre><code>cache = append(cache, k, v)</code></pre></div>
  <div class="ls-card"><p class="ls-card-label">库调用</p><pre><code>out = model(ids, past_key_values=cache, use_cache=True)</code></pre></div>
</div>
<div class="ls-chips">
  <span class="ls-chip">logits 相同 <b>是</b></span>
  <span class="ls-chip">缓存张量 <b>64</b></span>
</div>
```

## 预测题或测验

只写选项。学习者作答后，导师在终端给出判断。后续屏幕可以显示判断与解析。

```html
<p class="ls-eyebrow">第 07 阶段 · 第 12 课 · 预测</p>
<div class="ls-question" data-question="kv-double-seq">
  <p class="ls-prompt">序列长度翻倍，KV cache 的大小如何变化？</p>
  <div class="ls-choices">
    <button type="button" class="ls-choice" data-choice="A">A. 保持不变</button>
    <button type="button" class="ls-choice" data-choice="B">B. 翻倍</button>
    <button type="button" class="ls-choice" data-choice="C">C. 变成四倍</button>
    <button type="button" class="ls-choice" data-choice="D">D. 减半</button>
  </div>
</div>
```

点击标记选项，并发送 `{"type":"choice","question":"kv-double-seq","choice":"B","text":"B. 翻倍"}`。学习者仍须在终端作答；两者不同时，以终端回答为准。

## 课程中的流程图

课程含 Mermaid 围栏时，可展示同一段图：

```html
<p class="ls-eyebrow">第 14 阶段 · 第 01 课 · 核心概念</p>
<pre class="mermaid">
flowchart LR
  Observe[观察] --> Think[思考] --> Act[行动] --> Observe
</pre>
```

## 等待屏幕

```html
<div class="ls-wait"><p>这一步请回到终端。</p></div>
```

## 主题

框架跟随学习者在顶部选择的主题，也支持系统设置。每张新屏幕都检查明暗主题。
