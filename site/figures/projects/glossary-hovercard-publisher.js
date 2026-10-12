window.AIFSProjectFigures.register("pj-glossary-hovercard-publisher-1", {
  title: "校验术语、别名和原创定义",
  steps: [
    {
      label: "读取证据",
      detail: "构建已审阅、短语标识无歧义的术语表。",
    },
    { label: "计算", detail: "validateGlossary(value: unknown): Term[]" },
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
        key: "term",
        label: "规范术语",
        type: "text",
        value: "map scale",
      },
      {
        key: "alias",
        label: "拟议别名",
        type: "text",
        value: "MAP SCALE",
      },
    ],
    calculate(v) {
      const same = v.term.toLowerCase() === v.alias.toLowerCase();
      return {
        summary: same
          ? "拒绝重复短语。"
          : "两个短语映射到同一术语标识。",
        metrics: [{ label: "不同短语数", value: same ? 1 : 2 }],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-glossary-hovercard-publisher-2", {
  title: "在有效文本节点中匹配短语",
  steps: [
    {
      label: "读取证据",
      detail: "在每个词边界定位最长有效短语。",
    },
    {
      label: "计算",
      detail: "matchTerms(text: string, terms: Term[]): Match[]",
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
        key: "text",
        label: "待扫描文本",
        type: "text",
        value: "Map scale then map",
      },
    ],
    calculate(v) {
      const hits = [...v.text.matchAll(/\b(map scale|map)\b/gi)].map((x) => [
        x[0],
        x.index,
        x.index + x[0].length,
      ]);
      return {
        summary: "匹配器先处理最长短语。",
        columns: ["短语", "起点", "终点"],
        rows: hits,
        metrics: [{ label: "匹配数", value: hits.length }],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-glossary-hovercard-publisher-3", {
  title: "在上下文中渲染无障碍定义",
  steps: [
    {
      label: "读取证据",
      detail:
        "插入可用键盘操作的定义，不改代码或链接。",
    },
    {
      label: "计算",
      detail:
        "annotateLesson(html: string, terms: Term[]): {html: string; coverage: Coverage[]}",
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
        key: "paragraph",
        label: "段落出现次数",
        type: "range",
        value: 3,
        min: 0,
        max: 10,
        step: 1,
      },
      {
        key: "code",
        label: "代码出现次数",
        type: "range",
        value: 2,
        min: 0,
        max: 10,
        step: 1,
      },
    ],
    calculate(v) {
      return {
        summary: "代码不是可标注祖先节点。",
        metrics: [
          { label: "已标注", value: v.paragraph },
          { label: "已保留", value: v.code },
        ],
        bars: [
          { label: "可标注文本", value: v.paragraph, max: 10 },
          { label: "代码", value: v.code, max: 10 },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-glossary-hovercard-publisher-4", {
  title: "导出课程和可复用术语包",
  steps: [
    {
      label: "读取证据",
      detail:
        "交付独立课程及生成它的精确术语表。",
    },
    {
      label: "计算",
      detail:
        "publishGlossary(lesson: string, terms: Term[]): {html: string; glossary: Term[]; coverage: Coverage[]}",
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
      { key: "counts", label: "术语计数", type: "text", value: "2,0,1,4,0" },
    ],
    calculate(v) {
      const n = v.counts
        .split(",")
        .map(Number)
        .filter((x) => Number.isInteger(x) && x >= 0);
      return {
        summary: "零计数是可见覆盖证据。",
        metrics: [
          { label: "术语数", value: n.length },
          { label: "已使用", value: n.filter((x) => x > 0).length },
          { label: "标注总数", value: n.reduce((a, b) => a + b, 0) },
        ],
      };
    },
  },
});
