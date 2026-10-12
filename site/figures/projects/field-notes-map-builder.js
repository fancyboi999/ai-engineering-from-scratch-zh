window.AIFSProjectFigures.register("pj-field-notes-map-builder-1", {
  title: "导入坐标、时间戳和证据",
  steps: [
    {
      label: "读取证据",
      detail:
        "将每个位置及原证据保留为独立观察记录。",
    },
    {
      label: "计算",
      detail: "importObservations(value: unknown): Observation[]",
    },
    {
      label: "检查结果",
      detail: "改变输入，解释由此产生的决定。",
    },
  ],
  caption:
    "原创计算教学机制。真实导出产物由 TypeScript 实现生成。",
  lab: {
    controls: [
      { key: "lon", label: "经度", type: "number", value: 77.59 },
      { key: "lat", label: "纬度", type: "number", value: 12.97 },
    ],
    calculate(v) {
      const ok = Math.abs(v.lon) <= 180 && Math.abs(v.lat) <= 90;
      return {
        summary: ok
          ? "有效 WGS84 坐标。"
          : "拒绝越界位置。",
        columns: ["GeoJSON 坐标数组"],
        rows: [[JSON.stringify([v.lon, v.lat])]],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-field-notes-map-builder-2", {
  title: "计算距离并解释邻近组",
  steps: [
    {
      label: "读取证据",
      detail:
        "用可复现距离规则和保留的成对证据给邻近记录分组。",
    },
    {
      label: "计算",
      detail:
        "distanceMeters(a,b): number; groupNearby(items:Observation[],radiusMeters:number):Groups",
    },
    {
      label: "检查结果",
      detail: "改变输入，解释由此产生的决定。",
    },
  ],
  caption:
    "原创计算教学机制。真实导出产物由 TypeScript 实现生成。",
  lab: {
    controls: [
      {
        key: "delta",
        label: "赤道上的经度差（度）",
        type: "range",
        value: 0.001,
        min: 0,
        max: 0.01,
        step: 0.0001,
      },
      {
        key: "radius",
        label: "分组半径（米）",
        type: "range",
        value: 120,
        min: 0,
        max: 1200,
        step: 10,
      },
    ],
    calculate(v) {
      const d = ((6371008.8 * Math.PI) / 180) * v.delta;
      return {
        summary:
          d <= v.radius
            ? "添加邻近边。"
            : "保持这些点不连接。",
        metrics: [
          { label: "距离", value: d.toFixed(2) + " m" },
          { label: "半径", value: v.radius + " m" },
        ],
        bars: [
          { label: "距离", value: d, max: 1200 },
          { label: "阈值", value: v.radius, max: 1200 },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-field-notes-map-builder-3", {
  title: "审阅组，不合并观察记录",
  steps: [
    {
      label: "读取证据",
      detail:
        "允许审阅者拆分计算组，不删除任何观察记录。",
    },
    {
      label: "计算",
      detail:
        "reviewGroups(groups:Groups,value?:unknown):{schemaVersion:1;groups;decisions}",
    },
    {
      label: "检查结果",
      detail: "改变输入，解释由此产生的决定。",
    },
  ],
  caption:
    "原创计算教学机制。真实导出产物由 TypeScript 实现生成。",
  lab: {
    controls: [
      {
        key: "members",
        label: "连通分量成员数",
        type: "range",
        value: 3,
        min: 1,
        max: 10,
        step: 1,
      },
      { key: "split", label: "保持分离", type: "checkbox", value: true },
    ],
    calculate(v) {
      return {
        summary: "审阅改变分组，不删除证据。",
        metrics: [
          { label: "导出组数", value: v.split ? v.members : 1 },
          { label: "原始观察记录数", value: v.members },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-field-notes-map-builder-4", {
  title: "导出 GeoJSON 和可移植地图报告",
  steps: [
    {
      label: "读取证据",
      detail:
        "生成地图交换产物和可审阅离线地图。",
    },
    {
      label: "计算",
      detail:
        "exportGeoJSON(items:Observation[],review):{type:string;features:any[]}; renderMap(items,groups,review):string",
    },
    {
      label: "检查结果",
      detail: "改变输入，解释由此产生的决定。",
    },
  ],
  caption:
    "原创计算教学机制。真实导出产物由 TypeScript 实现生成。",
  lab: {
    controls: [
      { key: "lon", label: "经度", type: "number", value: -179.999 },
      {
        key: "origin",
        label: "首条观察记录经度",
        type: "number",
        value: 179.999,
      },
    ],
    calculate(v) {
      const x = v.origin + ((v.lon - v.origin + 540) % 360) - 180;
      return {
        summary:
          "示意图围绕首点展开；保留原 GeoJSON 坐标。",
        metrics: [
          { label: "显示经度", value: x.toFixed(3) },
          { label: "导出经度", value: v.lon },
        ],
      };
    },
  },
});
