# 计算距离并解释附近分组

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

用可复现的距离规则为附近记录分组，并保留成对证据。

## 公开契约

```typescript
distanceMeters(a,b): number; groupNearby(items:Observation[],radiusMeters:number):Groups
```

以半径 6371008.8 m 计算 haversine 距离。分组半径必须是有限的 0..1000000。为距离 <= radius 的每一对记录加边。连通分量构成传递分组，包括单条记录；第一个成员成为 group id。返回 `{radiusMeters,groups:[{id,members}],edges:[{from,to,meters}]}`。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

赤道上经度 0、0.001、0.002 的相邻记录两两相距约 111 m。半径 120 m 产生边 a-b 和 b-c，以及一个传递分组 a,b,c。

```figure
pj-field-notes-map-builder-2
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py field-notes-map-builder --init my-field-notes-map-builder
python3 scripts/project_test.py field-notes-map-builder --stage 2 --path my-field-notes-map-builder --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

即使 A-C 超过阈值，A-B 和 B-C 仍可属于同组。处理日期变更线差异和重合点。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-field-notes-map-builder
node cli.ts sample.json output
```

GeoJSON FeatureCollection、独立 HTML 地图和经过审核的观测分组。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

针对明确的精度要求比较球面距离和椭球距离。

范围：距离采用球形地球和连通分量，适合检查，不适合测绘。地图是示意图，不使用网络瓦片。照片证据仅提供链接，不下载。GeoJSON 遵循 WGS84 经度/纬度顺序（RFC 7946）。
