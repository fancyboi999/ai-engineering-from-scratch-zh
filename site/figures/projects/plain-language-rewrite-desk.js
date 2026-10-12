window.AIFSProjectFigures.register("pj-plain-language-rewrite-desk-1", {
  title: "切分正文并记录受保护术语与事实",
  steps: [
    {
      label: "读取证据",
      detail:
        "分离段落，记录后续修订必须保留的事实。",
    },
    {
      label: "计算",
      detail: "segmentProse(text:string,protectedTerms?:string[]):Paragraph[]",
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
        label: "受保护数值事实",
        type: "text",
        value: "A map uses 15% and 2 cm.",
      },
    ],
    calculate(v) {
      const n =
        v.text.match(
          /[-+]?\d+(?:[.,]\d+)*(?:%|\s*(?:km|cm|mm|ms|kg|m|s)\b)?/g,
        ) || [];
      return {
        summary: "将重复数值表达保留为独立证据。",
        columns: ["数值表达"],
        rows: n.map((x) => [x]),
        metrics: [{ label: "已记录事实", value: n.length }],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-plain-language-rewrite-desk-2", {
  title: "生成更简明的候选段落",
  steps: [
    {
      label: "读取证据",
      detail:
        "展示提案来源，不把确定性编辑说成模型推理。",
    },
    {
      label: "计算",
      detail:
        "proposeParagraphs(paragraphs:Paragraph[],recorded?:Record<string,string>):{id,candidate,method}[]",
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
        label: "原始句子",
        type: "text",
        value: "In order to utilize a map prior to walking.",
      },
    ],
    calculate(v) {
      const out = v.text
        .replace(/\bin order to\b/gi, "to")
        .replace(/\butilize\b/gi, "use")
        .replace(/\bprior to\b/gi, "before");
      return {
        summary: "可见短语替换，不是模型能力声明。",
        columns: ["原始值", "候选"],
        rows: [[v.text, out]],
        metrics: [
          { label: "移除字符数", value: v.text.length - out.length },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-plain-language-rewrite-desk-3", {
  title: "比较遗漏、数字和可读性指标",
  steps: [
    {
      label: "读取证据",
      detail:
        "比较可观察编辑变化，展示对已记录事实的违反。",
    },
    {
      label: "计算",
      detail:
        "measures(text:string):{words,sentences,averageWords,longWords}; compareParagraphs(paragraphs,proposals,definitions?):Comparison[]",
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
      { key: "original", label: "原始百分比", type: "number", value: 15 },
      {
        key: "candidate",
        label: "候选百分比",
        type: "number",
        value: 10,
      },
    ],
    calculate(v) {
      return {
        summary:
          v.original === v.candidate
            ? "保留数值字面量。"
            : "阻止接受：数值事实已改变。",
        metrics: [
          { label: "原始值", value: v.original + "%" },
          { label: "候选", value: v.candidate + "%" },
          { label: "差异", value: v.candidate - v.original },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-plain-language-rewrite-desk-4", {
  title: "导出已接受修订和变更记录",
  steps: [
    {
      label: "读取证据",
      detail:
        "只应用明确接受并核查事实的提案，保留其余全部原文。",
    },
    {
      label: "计算",
      detail:
        "exportRevisions(comparisons,value?):{markdown,changeRecord,decisions,unresolved}; renderDesk(comparisons,state):string",
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
        key: "decision",
        label: "作者决定",
        type: "select",
        value: "pending",
        options: [
          { value: "pending", label: "待处理" },
          { value: "accept", label: "接受" },
          { value: "reject", label: "拒绝" },
        ],
      },
      {
        key: "issue",
        label: "未解决事实问题",
        type: "checkbox",
        value: false,
      },
    ],
    calculate(v) {
      return {
        summary:
          v.decision === "accept" && v.issue
            ? "拒绝审阅文件。"
            : "导出 " +
              (v.decision === "accept" ? "candidate" : "original") +
              " 段落。",
        metrics: [
          {
            label: "未解决审阅",
            value: v.decision === "pending" ? 1 : 0,
          },
        ],
      };
    },
  },
});
