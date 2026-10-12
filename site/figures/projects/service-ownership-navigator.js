window.AIFSProjectFigures.register("pj-service-ownership-navigator-1", {
  title: "加载服务元数据和归属规则",
  steps: [
    {
      label: "读取证据",
      detail:
        "组合服务元数据与仓库规则，同时保留源位置。",
    },
    {
      label: "计算",
      detail:
        "parseOwnershipRules(text:string,source?:string):Rule[]; loadCatalog(value:unknown):Catalog",
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
        key: "line",
        label: "归属规则",
        type: "text",
        value: "/services/images/ @team/media @team/oncall",
      },
    ],
    calculate(v) {
      const p = v.line.trim().split(/\s+/);
      return {
        summary: "规则与目录归属分开保留。",
        columns: ["模式", "负责人"],
        rows: [[p[0], p.slice(1).join(", ")]],
        metrics: [{ label: "负责人数", value: Math.max(0, p.length - 1) }],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-service-ownership-navigator-2", {
  title: "解析路径和冲突归属证据",
  steps: [
    {
      label: "读取证据",
      detail:
        "按确定性规则优先级解析具体文件，展示分歧。",
    },
    {
      label: "计算",
      detail:
        "matchesRule(pattern:string,path:string):boolean; resolveOwnership(catalog:Catalog,path:string):Ownership",
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
        key: "specific",
        label: "存在特定缓存规则",
        type: "checkbox",
        value: true,
      },
    ],
    calculate(v) {
      return {
        summary:
          "最后匹配规则优先；先前分歧仍作为证据。",
        columns: ["规则", "负责人", "生效"],
        rows: [
          ["/services/", "@platform", "no"],
          ["/services/images/", "@media", v.specific ? "no" : "yes"],
          ...(v.specific
            ? [["/services/images/cache/**", "@cache", "yes"]]
            : []),
        ],
        metrics: [{ label: "匹配规则数", value: v.specific ? 3 : 2 }],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-service-ownership-navigator-3", {
  title: "检查本地运行手册引用",
  steps: [
    {
      label: "读取证据",
      detail:
        "检查交接是否指向给定运行手册及可解析本地引用。",
    },
    {
      label: "计算",
      detail:
        "checkRunbook(catalog:Catalog,service:Service):{path,exists,headings,links,issues}",
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
        key: "linked",
        label: "声明的本地链接数",
        type: "range",
        value: 4,
        min: 0,
        max: 10,
        step: 1,
      },
      {
        key: "available",
        label: "可用链接文件数",
        type: "range",
        value: 3,
        min: 0,
        max: 10,
        step: 1,
      },
    ],
    calculate(v) {
      return {
        summary: "只有给定本地文件算作已检查证据。",
        metrics: [
          { label: "已解析", value: Math.min(v.linked, v.available) },
          { label: "缺失", value: Math.max(0, v.linked - v.available) },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-service-ownership-navigator-4", {
  title: "导出可搜索目录和有引用的交接包",
  steps: [
    {
      label: "读取证据",
      detail:
        "导出本地交接，每条归属答案均关联证据。",
    },
    {
      label: "计算",
      detail:
        "handoffPacket(catalog:Catalog,path:string):{schemaVersion:1,ownership,runbook,dependencies}; renderDirectory(catalog,packet):string",
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
        key: "path",
        label: "请求文件",
        type: "text",
        value: "services/images/cache/store.ts",
      },
    ],
    calculate(v) {
      const found =
        v.path === "services/images" || v.path.startsWith("services/images/");
      return {
        summary: found
          ? "包含图像服务目录证据。"
          : "没有图像服务根匹配。",
        columns: ["查询字段", "值"],
        rows: [
          ["路径", v.path],
          ["服务", found ? "images" : "unresolved"],
          ["证据来源", found ? "catalog.json" : "none"],
        ],
      };
    },
  },
});
