---
id: personal-organizer-agents
title: 个人整理 Agent
code: PO
subtitle: 五个本地整理项目。涵盖各项目的构建目标、运行方式、输入输出、评审文件与检查。
hue: 152
sources: projects/bookmark-path-organizer, projects/calendar-focus-planner, projects/download-folder-sort-desk, projects/field-notes-map-builder, projects/catalog-record-linker
source_hash: a22861c966f32981
---

## Node 项目对比
type: comparison
span: 2
from: projects/bookmark-path-organizer/README.md, projects/bookmark-path-organizer/solution/cli.ts, projects/calendar-focus-planner/README.md, projects/calendar-focus-planner/solution/cli.ts, projects/field-notes-map-builder/README.md, projects/field-notes-map-builder/solution/cli.ts

| 比较项 | Bookmark Path Organizer | Calendar Focus Planner | Field Notes Map Builder |
|---|---|---|---|
| 构建目标 | 阅读路径页 | 专注计划与 ICS 提案 | GeoJSON 与示意地图 |
| 输入 | `bookmarks` 树、`topics` | `sample.ics`、`tasks.json`、日期 | `observations`、`radiusMeters` |
| 输出 | `bookmarks.json`, `progress.json`, `report.html` | `focus.ics`, `plan.json`, `plan.html` | `observations.geojson`, `groups.json`, `report.html` |
| 评审文件 | 第三个参数 `progress.json` | 无 | 第三个参数 `group-review.json` |
| 不执行的操作 | 抓取链接 | 修改账号日历 | 下载照片或瓦片 |

## Python 项目对比
type: comparison
from: projects/download-folder-sort-desk/README.md, projects/download-folder-sort-desk/solution/cli.py, projects/catalog-record-linker/README.md, projects/catalog-record-linker/solution/cli.py

| 比较项 | Download Folder Sort Desk | Catalog Record Linker |
|---|---|---|
| 构建目标 | 归档计划与重复文件组 | 映射表与合并目录 |
| 输入 | `folder`, `occupied` | `left_csv`, `right_csv`, `threshold` |
| 输出 | `moves.json`, `duplicates.json`, `review.html` | `crosswalk.csv`, `merged-catalog.json`, `review.html` |
| 评审文件 | `--decisions decisions.json` | `--decisions decisions.json` |
| 不执行的操作 | 移动文件 | 仅凭相似度合并 |

## 运行参考实现
type: command-table
span: 2
from: projects/bookmark-path-organizer/README.md, projects/calendar-focus-planner/README.md, projects/calendar-focus-planner/solution/cli.ts, projects/download-folder-sort-desk/README.md, projects/catalog-record-linker/README.md, projects/field-notes-map-builder/README.md

| 命令 | 作用 |
|---|---|
| `node cli.ts sample.json output` | 书签整理或田野笔记地图 |
| `node cli.ts <input.json> <dir> <review.json>` | 使用下载的评审文件再次运行 |
| `node cli.ts sample.ics tasks.json 2026-10-14 output 10` | 生成带 10 分钟缓冲的日历计划 |
| `python3 cli.py samples/input.json --output demo-output` | 下载文件整理或目录关联 |
| `python3 cli.py <input.json> --output <dir> --decisions decisions.json` | 应用你的批准决定 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 评测参考实现 |

## 日历规划步骤
type: flow
from: projects/calendar-focus-planner/solution/main.ts, projects/calendar-focus-planner/solution/cli.ts, projects/calendar-focus-planner/README.md

1. **CLI**：将时间窗口设为指定日期的 UTC 09:00 至 17:00。
2. **parseCalendar**：要求 `UID`、`DTSTART`、`DTEND`。跳过已取消与透明事件。
3. **availableSlots**：在事件前后加缓冲、合并重叠，再列出空隙。
4. **schedule**：先按优先级，再按 ID 排序任务。
5. **schedule**：将每个任务放入最早且足够长的空隙。
6. **schedule**：无空隙可容纳的任务列为未安排，并给出原因。
7. **exportCalendar**：将提案写入 `focus.ics`，供人工导入。

## 下载文件整理台
type: architecture
from: projects/download-folder-sort-desk/solution/main.py, projects/download-folder-sort-desk/solution/cli.py, projects/download-folder-sort-desk/API.md

```arch
node | in | 1,1 | input.json | folder, occupied | client
node | inv | 2,1 | inventory() | path, size, sha256 | process
node | cat | 3,1 | categorize() | 分数、证据 | process
node | plan | 3,2 | plan_moves() | destination, duplicate_groups | process
node | rev | 2,2 | review_plan() | fingerprint, approved | process
node | out | 1,2 | moves.json | 供文件管理器使用 | store
edge | in | inv | folder
edge | inv | cat | 记录
edge | cat | plan | 类别
edge | plan | rev | 计划
edge | rev | out | 获批移动
```

## 评分规则
type: concepts
from: projects/bookmark-path-organizer/solution/main.ts, projects/download-folder-sort-desk/API.md, projects/catalog-record-linker/API.md, projects/field-notes-map-builder/solution/main.ts, projects/field-notes-map-builder/README.md

- **书签主题分数**：关键词出现在标题中加 3 分，在笔记中加 1 分。
- **重复书签**：移除片段标识后的 URL 相同。查询字符串仍影响判定。
- **文件分类**：已知扩展名加 3 分。workshop 和 handout 各给文档类加 1 分。
- **文件冲突**：目标被占用时，在扩展名前加 `-2`、`-3`，不区分大小写。
- **目录配对分数**：标题 Jaccard 乘 0.8，加创作者 Jaccard 乘 0.2。
- **邻近观测**：`distanceMeters()` 使用半径为 6371008.8 m 的球形地球。
- **地图分组**：距离在半径内的点对合并为一个连通分量。

## 默认值与限制
type: defaults
from: projects/calendar-focus-planner/solution/cli.ts, projects/calendar-focus-planner/solution/main.ts, projects/catalog-record-linker/API.md, projects/bookmark-path-organizer/solution/main.ts, projects/field-notes-map-builder/solution/main.ts, projects/download-folder-sort-desk/solution/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| 日历缓冲分钟数 | 10 | 允许范围为 0 至 120 |
| 日历输出目录 | `focus-output` | 第四个 CLI 参数 |
| 任务数上限 | 100 | 分钟数 5 至 480，优先级 1 至 5 |
| `threshold` | 0.25 | 有限数，范围 0 至 1 |
| 文件夹嵌套 | 32 | 更深的书签树会失败 |
| 半径 | 0..1000000 | 米 |
| `approved` | `False` | 每项计划移动初始都未批准 |
| `schema_version` | 1 | 位于 `moves.json` 与 `merged-catalog.json` |

## 错误消息与修正
type: troubleshooting
from: projects/calendar-focus-planner/solution/main.ts, projects/calendar-focus-planner/README.md, projects/download-folder-sort-desk/solution/main.py, projects/download-folder-sort-desk/solution/cli.py, projects/bookmark-path-organizer/solution/main.ts, projects/catalog-record-linker/solution/main.py, projects/field-notes-map-builder/solution/main.ts

| 现象 | 原因 | 修正 |
|---|---|---|
| `Expand recurrence and timezone values to UTC before importing` | ICS 包含 `RRULE` 或 `TZID` | 先在导出器中展开事件 |
| `Event needs UID, DTSTART and DTEND` | 隐式结束或使用 `DURATION` | 写明 `DTEND` |
| `stale approval: source content or destination plan changed` | 评审后文件或计划变化 | 使用新的 `decisions.json` |
| `output must be outside the input folder` | 输出位于被扫描目录内 | 选择其他输出路径 |
| `Progress order must contain every current id exactly once` | 下载后书签变化 | 不带第三个参数运行 |
| `one-to-one match violated` | 同一记录获批两次 | 每条记录只允许在一对中获批 |

## 编写评审文件
type: task-table
from: projects/field-notes-map-builder/solution/main.ts, projects/bookmark-path-organizer/solution/main.ts, projects/download-folder-sort-desk/README.md, projects/catalog-record-linker/API.md

| 任务 | 代码 |
|---|---|
| 拆分地图分组 | `"decisions": {"<id>": "keep-separate"}` |
| 保留地图分组 | `"decisions": {"<id>": "keep-group"}` |
| 保存阅读顺序 | `"order": [...], "completed": [...]` |
| 批准文件移动 | `"approved": ["<path>"]` |
| 接受目录配对 | `"match": true, "values": {}` |
| 设置 Node 评审版本 | `"schemaVersion": 1` |

## 示例解析
type: qa
from: projects/calendar-focus-planner/solution/sample.ics, projects/calendar-focus-planner/solution/tasks.json, projects/calendar-focus-planner/solution/main.ts, projects/bookmark-path-organizer/solution/sample.json, projects/download-folder-sort-desk/README.md, projects/download-folder-sort-desk/solution/samples/input.json, projects/catalog-record-linker/README.md

- **样例为何从 09:20 忙到 11:10？** 两个事件重叠，10 分钟缓冲又扩大了时间范围。
- **哪个任务放不下？** `deep` 需要 120 分钟，没有空隙足够长。
- **为何 `map-1` 和 `map-2` 分为一组？** 两个 URL 归一化后指向同一文档。
- **`handout.txt` 放到哪里？** `documents/handout.txt` 已占用，因此加 `-2`。
- **`left:map-1` 和 `right:r-7` 会合并吗？** 只有接受配对后才会合并，不会丢弃记录。

## 提示
type: tips
from: projects/calendar-focus-planner/README.md, projects/download-folder-sort-desk/README.md, projects/catalog-record-linker/README.md, projects/field-notes-map-builder/README.md, projects/bookmark-path-organizer/README.md

- 全天事件的 `DTEND;VALUE=DATE` 不包含结束日。10 月 14 日在 `20261015` 结束。
- 文件管理器必须在移动前重新核验文件身份。计划不是事务。
- `ready` 表示已接受的合并没有未解决冲突，不表示每对记录都已阅读。
- GeoJSON 使用先经度、后纬度的顺序。
- 书签导入器读取 JSON 文件夹树，不读取浏览器 HTML。
- 集成工具前，至少用一份自己的新输入测试。
