window.AIFSProjectFigures.register("pj-vocabulary-autocomplete-pad-1", {
  title: "对语料分词并统计词历史",
  steps: [
    {
      label: "读取证据",
      detail:
        "统计词和一词／两词历史，不跨越句子边界。",
    },
    {
      label: "计算",
      detail: "tokenize(text: string): string[]; train(corpus: unknown): Model",
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
        label: "语料句子",
        type: "text",
        value: "garden club shares seeds garden club shares tools",
      },
    ],
    calculate(v) {
      const t = v.text.toLowerCase().match(/[a-z]+/g) || [],
        c = {};
      t.forEach((x) => (c[x] = (c[x] || 0) + 1));
      return {
        summary: "重复 token 增加 unigram 证据。",
        columns: ["token", "计数"],
        rows: Object.entries(c),
        metrics: [
          { label: "token 数", value: t.length },
          { label: "词汇量", value: Object.keys(c).length },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-vocabulary-autocomplete-pad-2", {
  title: "排序前缀和下一词候选",
  steps: [
    {
      label: "读取证据",
      detail:
        "按最长观察历史排序候选，展示底层计数。",
    },
    {
      label: "计算",
      detail:
        "suggest(model: Model, prefix: string, history?: string[], limit?: number): Suggestion[]",
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
        key: "history",
        label: "匹配历史长度",
        type: "range",
        value: 2,
        min: 0,
        max: 2,
        step: 1,
      },
      {
        key: "count",
        label: "观察计数",
        type: "range",
        value: 3,
        min: 1,
        max: 20,
        step: 1,
      },
    ],
    calculate(v) {
      return {
        summary: "先按历史长度，再按计数排序。",
        metrics: [
          { label: "显示分数", value: v.history * 1000000 + v.count },
          { label: "上下文阶数", value: v.history },
        ],
        columns: ["证据", "值"],
        rows: [
          ["条件计数", v.count],
          ["历史 token", v.history],
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-vocabulary-autocomplete-pad-3", {
  title: "在写作板接受建议",
  steps: [
    {
      label: "读取证据",
      detail:
        "插入建议前区分未完成 token 与已完成单词。",
    },
    {
      label: "计算",
      detail:
        "completeText(model: Model, text: string, limit?: number): {prefix:string;history:string[];suggestions:Suggestion[]}; acceptSuggestion(text:string,prefix:string,word:string):string",
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
        label: "当前文本",
        type: "text",
        value: "Garden club sh",
      },
    ],
    calculate(v) {
      const tail = v.text.split(/[.!?\n]/).at(-1),
        t = tail.toLowerCase().match(/[a-z]+/g) || [],
        prefix = /[a-z]$/i.test(tail) ? t.pop() || "" : "";
      return {
        summary: "尾部空白标记已完成 token。",
        columns: ["字段", "值"],
        rows: [
          ["前缀", prefix],
          ["历史", JSON.stringify(t.slice(-2))],
          [
            "接受 shares",
            v.text.slice(0, v.text.length - prefix.length) + "shares ",
          ],
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-vocabulary-autocomplete-pad-4", {
  title: "导出学习到的模型和编辑器函数",
  steps: [
    {
      label: "读取证据",
      detail:
        "校验可移植模型，交付调用相同建议函数的写作板。",
    },
    {
      label: "计算",
      detail:
        "importModel(value: unknown): Model; renderPad(model: Model, initial?: string): string",
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
        key: "total",
        label: "unigram 计数",
        type: "range",
        value: 5,
        min: 1,
        max: 20,
        step: 1,
      },
      {
        key: "conditional",
        label: "条件计数",
        type: "range",
        value: 3,
        min: 1,
        max: 20,
        step: 1,
      },
    ],
    calculate(v) {
      return {
        summary:
          v.conditional <= v.total
            ? "可以导入计数。"
            : "拒绝：条件计数超过总数。",
        metrics: [
          {
            label: "剩余上下文数",
            value: Math.max(0, v.total - v.conditional),
          },
        ],
      };
    },
  },
});
