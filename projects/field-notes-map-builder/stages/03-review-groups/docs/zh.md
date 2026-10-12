# 审核分组，不合并观测

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

让审核者拆分计算出的分组，不删除任何观测。

## 公开契约

```typescript
reviewGroups(groups:Groups,value?:unknown):{schemaVersion:1;groups;decisions}
```

审核格式为 `{schemaVersion:1,decisions:Record<groupId,"pending"|"keep-group"|"keep-separate">}`。缺失决策默认 pending；未知 group id 失败。keep-separate 将成员展开成单成员组。单独保留距离证据。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

审核 `{schemaVersion:1,decisions:{"a":"keep-separate"}}` 将 a,b,c 拆成三个单成员组。全部三条原始观测和两条计算距离边仍然可用。

```figure
pj-field-notes-map-builder-3
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py field-notes-map-builder --init my-field-notes-map-builder
python3 scripts/project_test.py field-notes-map-builder --stage 3 --path my-field-notes-map-builder --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

Pending 不是批准。分组决策只改变分组元数据，绝不改变坐标或笔记。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-field-notes-map-builder
node cli.ts sample.json output
```

GeoJSON FeatureCollection、独立 HTML 地图和经过审核的观测分组。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

允许明确的逐成员重新分配，并保留审计轨迹。

范围：距离采用球形地球和连通分量，适合检查，不适合测绘。地图是示意图，不使用网络瓦片。照片证据仅提供链接，不下载。GeoJSON 遵循 WGS84 经度/纬度顺序（RFC 7946）。
