window.AIFSProjectFigures.register("pj-bookmark-path-organizer-1", {
  title: "导入书签及其原始层级",
  steps: [
    {
      label: "读取证据",
      detail:
        "展平文件夹树，保留原 URL 和每个祖先文件夹。",
    },
    { label: "计算", detail: "importBookmarks(input: unknown): Bookmark[]" },
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
        key: "folder",
        label: "祖先路径",
        type: "text",
        value: "Maps/Basics",
      },
      {
        key: "title",
        label: "书签标题",
        type: "text",
        value: "Coordinates",
      },
    ],
    calculate(v) {
      const p = v.folder.split("/").filter(Boolean);
      return {
        summary: "展平时保留每个祖先。",
        metrics: [{ label: "深度", value: p.length }],
        columns: ["字段", "值"],
        rows: [
          ["title", v.title],
          ["folders", JSON.stringify(p)],
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-bookmark-path-organizer-2", {
  title: "规范化链接并解释重复组",
  steps: [
    {
      label: "读取证据",
      detail: "精确解释两个保存链接为什么指向同一文档。",
    },
    {
      label: "计算",
      detail:
        "normalizeURL(value: string): string; groupDuplicates(items: Bookmark[]): Group[]",
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
        key: "url",
        label: "保存的 URL",
        type: "text",
        value: "https://EXAMPLE.invalid:443/maps#intro",
      },
    ],
    calculate(v) {
      try {
        const u = new URL(v.url);
        if (
          !["http:", "https:"].includes(u.protocol) ||
          u.username ||
          u.password
        )
          throw Error();
        u.hash = "";
        return {
          summary:
            "除 URL 解析器规范化外，只丢弃片段。",
          columns: ["原始值", "分组键"],
          rows: [[v.url, u.href]],
        };
      } catch {
        return { summary: "拒绝此 URL。" };
      }
    },
  },
});

window.AIFSProjectFigures.register("pj-bookmark-path-organizer-3", {
  title: "排序主题并组装阅读路径",
  steps: [
    {
      label: "读取证据",
      detail: "用可见关键词证据为阅读集合排序。",
    },
    {
      label: "计算",
      detail:
        "readingPath(groups: Group[], topics: Record<string,string[]>): Reading[]",
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
      { key: "title", label: "标题", type: "text", value: "Map basics" },
      {
        key: "notes",
        label: "笔记",
        type: "text",
        value: "Read this map first",
      },
    ],
    calculate(v) {
      const has = (s) =>
        (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).includes("map");
      const a = has(v.title) ? 3 : 0,
        b = has(v.notes) ? 1 : 0;
      return {
        summary: "主题关键词：map",
        metrics: [{ label: "分数", value: a + b }],
        bars: [
          { label: "标题", value: a, max: 4 },
          { label: "笔记", value: b, max: 4 },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-bookmark-path-organizer-4", {
  title: "导出可编辑集合和进度文件",
  steps: [
    {
      label: "读取证据",
      detail:
        "在浏览器审阅和下一命令间传递阅读顺序与完成状态。",
    },
    {
      label: "计算",
      detail:
        "applyProgress(items: Reading[], value?: unknown): {items: Reading[]; progress: Progress}; renderCollection(items: Reading[], progress: Progress): string",
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
        key: "completed",
        label: "已完成 ID（逗号分隔）",
        type: "text",
        value: "a,b",
      },
    ],
    calculate(v) {
      const ids = v.completed
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        ok =
          new Set(ids).size === ids.length &&
          ids.every((x) => ["a", "b", "c"].includes(x));
      return {
        summary: ok ? "进度已接受。" : "拒绝未知或重复 ID。",
        metrics: [
          { label: "已完成", value: ok ? ids.length : 0 },
          { label: "剩余", value: ok ? 3 - ids.length : 3 },
        ],
      };
    },
  },
});
