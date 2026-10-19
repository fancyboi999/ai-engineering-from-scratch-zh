# manual.json

手册清单保存身份、版本、配色、来源排序和篇章顺序。构建器按 JSON Schema draft 2020-12 校验，拒绝 schema 未定义字段。

## 目录布局

```text
manuals/<id>/
  manual.json                 元数据、版本、配色、篇章顺序
  README.md                   ready 前必需
  front.md                    “如何阅读本手册”
  sections/<n>-<m>-<slug>.md  每节一文件
  sections/r-<n>-<slug>.md    参考节
  figures/<figure-id>.svg     各版本共用静态图
  figures/src/<figure-id>.js  可选绘图脚本
  capture/                    记录工具，输出在 capture/out/
  research/                   事实简报与研究笔记
  research/sources/           原始来源归档与许可
```

id 用小写和连字符，例如 a2a-101，必须等于目录名。

## 字段

| 字段 | 必需 | 规则 |
|---|---|---|
| id | 是 | 匹配 ^[a-z0-9]+(?:-[a-z0-9]+)*$ |
| title、subtitle、summary | 是 | 名称、一句话范围、一段摘要 |
| audience | 是 | 读者与已有知识 |
| edition | 是 | YYYY.MM |
| status | 是 | draft 构建但不列出，ready 列出并在发布中附 PDF |
| pin | 是 | subject、version、https source、至少七字符 commit、YYYY-MM-DD 的 date 和 verified |
| outcomes | 是 | 至少三个读完能做的事 |
| palette | 是 | 至少三组 hue、meaning |
| sources | 是 | 按权威排序，每项 name、path、usedFor |
| quoteSources | 否 | 引用键到归档文件，不能核对时为 null |
| capture | 否 | 从手册目录运行的 run、check argv 数组，可选 timeoutSeconds，默认 300 |
| front | 否 | 前言文件，例如 front.md |
| plate | 否 | 封面图的 figure、title、caption |
| parts | 是 | 有序篇章的 number、title、thesis、可选 summary、accent、sections |
| reference | 否 | title、thesis、summary、accent、sections |
| related | 否 | 深入课程的仓库路径 |

章节 ID 按顺序为 <part>.<n>，例如 3.2。参考 ID 为 R.<n>。每项形如 `{ "id": "3.2", "file": "sections/3-2-part.md" }`。

引用键匹配 ^[a-z][a-z0-9-]*$，例如 spec、proto、docs、sdk、spec-main。

## 色相

十种色相：grey、blue、teal、violet、green、amber、plum、olive、indigo、rose。

| 色相 | 固定含义 |
|---|---|
| rose | 失败：错误、崩溃、中止、工作丢失 |
| grey | 主题外：宿主、操作者、范围外 |
| amber | 生命周期：任务、阶段、状态机 |
| teal | 持久状态：存储、已提交记录 |

其他六种每本手册定义一次，所有图中保持一致。

## 起始文件

替换全部值，保留字段名和结构。此示例中的英文可见值在中文手册中对应翻译，路径、URL、键、枚举和版本保持机器契约。

```json
{
  "id": "example-101",
  "title": "Example 101",
  "subtitle": "The Example protocol, from its purpose to each request and response",
  "summary": "How a client asks an Example server for work. Each request and response in this manual comes from a recorded run.",
  "audience": "You know HTTP and JSON. You have not read the Example specification.",
  "edition": "2026.10",
  "status": "draft",
  "pin": {
    "subject": "Example protocol",
    "version": "1.0.0",
    "source": "https://example.org/example-spec",
    "commit": "0000000",
    "date": "2026-01-01",
    "verified": "2026-01-02"
  },
  "outcomes": [
    "Read a discovery document and say what the server offers.",
    "Predict the state of a job at any point of a run.",
    "Name the errors a client must handle."
  ],
  "palette": [
    { "hue": "violet", "meaning": "the client and what it sends" },
    { "hue": "blue", "meaning": "the server and what it sends back" },
    { "hue": "amber", "meaning": "jobs, job states, and transitions" },
    { "hue": "teal", "meaning": "stored records" },
    { "hue": "rose", "meaning": "errors and failure" },
    { "hue": "grey", "meaning": "the operator, the host, and anything outside the protocol" }
  ],
  "sources": [
    { "name": "Schema", "path": "schema/example.proto at v1.0.0", "usedFor": "every object, field, and method; cited as proto" },
    { "name": "Specification", "path": "docs/spec.md at v1.0.0", "usedFor": "every rule, quoted exactly; cited as spec §N" },
    { "name": "Reference SDK", "path": "example-sdk v1.0.0", "usedFor": "behavior where the spec is silent; cited as sdk" },
    { "name": "Capture kit", "path": "manuals/example-101/capture/", "usedFor": "every request and response shown; cited by file" }
  ],
  "quoteSources": {
    "spec": "research/sources/spec.md",
    "proto": "research/sources/example.proto",
    "sdk": null
  },
  "capture": {
    "run": ["python3", "capture/run.py"],
    "check": ["python3", "capture/run.py", "--check"]
  },
  "front": "front.md",
  "parts": [
    {
      "number": 1,
      "title": "The Protocol on One Page",
      "thesis": "Example defines a data model and a set of operations, and leaves the server internals open.",
      "accent": "violet",
      "sections": [
        { "id": "1.1", "file": "sections/1-1-what-example-standardizes.md" },
        { "id": "1.2", "file": "sections/1-2-one-job-request-by-request.md" }
      ]
    }
  ],
  "reference": {
    "title": "Reference",
    "thesis": "Lookup tables for every name in the manual.",
    "accent": "grey",
    "sections": [
      { "id": "R.1", "file": "sections/r-1-sources.md" }
    ]
  },
  "related": []
}
```

仓库 schema 在 manuals/manual.schema.json，完整示例在 manuals/a2a-101/manual.json。
