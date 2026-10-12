# 实地笔记地图构建器

帮助社区制图小组探索包含坐标、笔记和可选照片的观测。校验位置，用明确距离规则为附近记录分组，审核时保留原始观测，并导出 GeoJSON、独立地图和观测表。

你将构建 GeoJSON FeatureCollection、独立 HTML 地图和经过审核的观测分组。

## 用你自己的输入运行工具

需要 Node 22.18 或更新版本。无需安装包、API key、网络账号或 provider。

```bash
cd projects/field-notes-map-builder/solution
node cli.ts sample.json output
```

`sample.json` 是原创项目数据。复制它、编辑值，再把新文件名传给同一命令。`node cli.ts --help` 说明各参数。报告为 output/report.html。JSON 文件保留界面使用的证据。

## 自己动手构建

```bash
python3 scripts/project_test.py field-notes-map-builder --init my-field-notes-map-builder
python3 scripts/project_test.py field-notes-map-builder --stage 1 --path my-field-notes-map-builder --strict
python3 scripts/project_test.py field-notes-map-builder --all --path my-field-notes-map-builder --strict --report completion.json
```

在你实现第一阶段之前，首次运行会失败。初始 starter 提供全部公开类型、函数签名、CLI 包装器和输入 fixture。后续阶段在同一文件里增加行为。

1. [导入坐标、时间戳和证据](stages/01-import-observations/docs/zh.md)
2. [计算距离并解释附近分组](stages/02-distance-groups/docs/zh.md)
3. [审核分组，不合并观测](stages/03-review-groups/docs/zh.md)
4. [导出 GeoJSON 和可移植地图报告](stages/04-export-geojson/docs/zh.md)

## 契约与集成

- `importObservations(value: unknown): Observation[]`
- `distanceMeters(a,b): number; groupNearby(items:Observation[],radiusMeters:number):Groups`
- `reviewGroups(groups:Groups,value?:unknown):{schemaVersion:1;groups;decisions}`
- `exportGeoJSON(items:Observation[],review):{type:string;features:any[]}; renderMap(items,groups,review):string`

阅读阶段文档，了解准确的输入和返回结构、中间值推演、失败行为和留出案例。从 `main.ts` 导入这些函数，可在另一 TypeScript 程序中复用工具。HTML 在本地运行；按文档说明，下载的审核文件可以传回 CLI，它从不向第三方服务提交数据。

## 验证与范围

```bash
python3 scripts/project_test.py field-notes-map-builder --all --solution --strict
```

距离采用球形地球和连通分量，适合检查，不适合测绘。地图是示意图，不使用网络瓦片。照片证据仅提供链接，不下载。GeoJSON 遵循 WGS84 经度/纬度顺序（RFC 7946）。

核心实现、fixture 和课程正文均为原创。本地参考检查不授予学习者证书。学习者完成记录是完整评分器生成的自报证据，不是外部认证。
