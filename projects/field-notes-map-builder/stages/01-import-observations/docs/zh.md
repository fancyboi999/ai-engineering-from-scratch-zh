# 导入坐标、时间戳和证据

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

将每个位置及其原始证据保留为独立观测。

## 公开契约

```typescript
importObservations(value: unknown): Observation[]
```

要求唯一 id、有限的 longitude [-180,180]、latitude [-90,90]、有效且明确的 ISO UTC 时间戳和非空 note。可选 photo 是 HTTP(S) 证据链接。返回记录副本 `{id,longitude,latitude,timestamp,note,photo?}`。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

经度 77.59、纬度 12.97 的长椅仍是一条观测，带时间戳和笔记。纬度字符串 "12.97" 会被拒绝，避免 CSV 的意外类型悄悄改变几何数据。

```figure
pj-field-notes-map-builder-1
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py field-notes-map-builder --init my-field-notes-map-builder
python3 scripts/project_test.py field-notes-map-builder --stage 1 --path my-field-notes-map-builder --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

拒绝数字字符串、不可能的日期、重复身份和不安全照片协议。交换数据中坐标先经度后纬度。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-field-notes-map-builder
node cli.ts sample.json output
```

GeoJSON FeatureCollection、独立 HTML 地图和经过审核的观测分组。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

添加带列映射的显式 CSV 适配器。

范围：距离采用球形地球和连通分量，适合检查，不适合测绘。地图是示意图，不使用网络瓦片。照片证据仅提供链接，不下载。GeoJSON 遵循 WGS84 经度/纬度顺序（RFC 7946）。
