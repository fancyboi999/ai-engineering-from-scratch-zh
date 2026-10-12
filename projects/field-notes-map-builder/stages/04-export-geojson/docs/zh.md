# 导出 GeoJSON 和可移植地图报告

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

生成地图交换产物和可审核的离线地图。

## 公开契约

```typescript
exportGeoJSON(items:Observation[],review):{type:string;features:any[]}; renderMap(items,groups,review):string
```

GeoJSON FeatureCollection 为每条原始观测包含一个 Point feature。坐标为 [longitude,latitude]；属性保留 note,timestamp,photo 和审核后的 group id。HTML 使用等距圆柱投影示意图，经度围绕第一个点展开，并包含原始证据表、距离和分组审核下载。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

Feature a 使用几何 `{type:"Point",coordinates:[77.59,12.97]}` 和 note/timestamp 属性。两个附近记录的分组仍导出两个 Point feature，绝不编造平均位置。

```figure
pj-field-notes-map-builder-4
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py field-notes-map-builder --init my-field-notes-map-builder
python3 scripts/project_test.py field-notes-map-builder --stage 4 --path my-field-notes-map-builder --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

不要将组成员压成一个代表坐标。示意图不是导航地图，也不是距离比例尺。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-field-notes-map-builder
node cli.ts sample.json output
```

GeoJSON FeatureCollection、独立 HTML 地图和经过审核的观测分组。打开 `output/report.html`，检查配套机器可读文件。重新运行 `node cli.ts sample.json reviewed-output group-review.json` 应用下载的审核。将 observations.geojson 解析为 GeoJSON，验证 feature 数等于原始观测数。

## 扩展

把 observations.geojson 导入其他制图程序并检查属性。

范围：距离采用球形地球和连通分量，适合检查，不适合测绘。地图是示意图，不使用网络瓦片。照片证据仅提供链接，不下载。GeoJSON 遵循 WGS84 经度/纬度顺序（RFC 7946）。
