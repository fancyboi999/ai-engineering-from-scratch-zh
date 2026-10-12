window.AIFSProjectFigures.register("pj-diagram-reading-companion-1", {
  title: "加载 SVG 并校验声明的节点和边",
  steps: [
    {
      label: "读取证据",
      detail:
        "核验每个自编解释指向真实 SVG 元素。",
    },
    {
      label: "计算",
      detail:
        "loadDiagram(svg: string, value: unknown): {svg:string;graph:Graph}",
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
        key: "declared",
        label: "声明的 ID",
        type: "text",
        value: "collect,check,share",
      },
      { key: "svg", label: "SVG ID", type: "text", value: "collect,check" },
    ],
    calculate(v) {
      const a = v.declared.split(",").map((x) => x.trim()),
        b = v.svg.split(",").map((x) => x.trim()),
        missing = a.filter((x) => !b.includes(x));
      return {
        summary: missing.length
          ? "拒绝缺失 SVG 元素。"
          : "每个声明节点均可解析。",
        columns: ["缺失 ID"],
        rows: missing.map((x) => [x]),
        metrics: [{ label: "已解析", value: a.length - missing.length }],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-diagram-reading-companion-2", {
  title: "计算分支、环和候选阅读顺序",
  steps: [
    {
      label: "读取证据",
      detail:
        "保留可见分支和环，不将图展平成误导列表。",
    },
    { label: "计算", detail: "analyzeGraph(graph: Graph): Analysis" },
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
        key: "branch",
        label: "包含澄清分支",
        type: "checkbox",
        value: true,
      },
      {
        key: "cycle",
        label: "澄清返回检查步骤",
        type: "checkbox",
        value: false,
      },
    ],
    calculate(v) {
      return {
        summary:
          v.cycle && v.branch
            ? "回边暴露澄清环。"
            : "候选遍历没有回边，完成。",
        metrics: [
          {
            label: "边数",
            value: 2 + (v.branch ? 1 : 0) + (v.branch && v.cycle ? 1 : 0),
          },
          { label: "分支数", value: v.branch ? 1 : 0 },
          { label: "回边环数", value: v.branch && v.cycle ? 1 : 0 },
        ],
        columns: ["顺序"],
        rows: (v.branch
          ? ["collect", "check", "share", "clarify"]
          : ["collect", "check", "share"]
        ).map((x) => [x]),
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-diagram-reading-companion-3", {
  title: "审阅解释和阅读顺序",
  steps: [
    {
      label: "读取证据",
      detail:
        "应用作者审阅，不丢失原图关系。",
    },
    {
      label: "计算",
      detail:
        "reviewGraph(graph: Graph, value?: unknown): {schemaVersion:1;graph:Graph;order:string[];reviewed:boolean}",
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
        key: "order",
        label: "已审阅顺序",
        type: "text",
        value: "collect,check,clarify,share",
      },
    ],
    calculate(v) {
      const ids = v.order.split(",").map((x) => x.trim()),
        known = ["collect", "check", "share", "clarify"],
        ok =
          ids.length === 4 &&
          new Set(ids).size === 4 &&
          ids.every((x) => known.includes(x));
      return {
        summary: ok
          ? "有效排列：接受审阅。"
          : "拒绝缺失、重复或未知节点。",
        columns: ["步骤", "节点"],
        rows: ids.map((x, i) => [i + 1, x]),
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-diagram-reading-companion-4", {
  title: "导出可导航讲解和图数据",
  steps: [
    {
      label: "读取证据",
      detail:
        "将可聚焦节点按钮连接到自编图像，导出可复用审阅。",
    },
    {
      label: "计算",
      detail:
        "renderWalkthrough(svg:string, review:ReturnType<typeof reviewGraph>):string",
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
        key: "index",
        label: "聚焦步骤",
        type: "range",
        value: 2,
        min: 1,
        max: 4,
        step: 1,
      },
    ],
    calculate(v) {
      const order = ["collect", "check", "share", "clarify"];
      return {
        summary: "键盘导航选择一个已声明 SVG ID。",
        metrics: [
          { label: "选中节点", value: order[v.index - 1] },
          { label: "可到上一步", value: v.index > 1 ? "yes" : "no" },
          { label: "可到下一步", value: v.index < 4 ? "yes" : "no" },
        ],
      };
    },
  },
});
