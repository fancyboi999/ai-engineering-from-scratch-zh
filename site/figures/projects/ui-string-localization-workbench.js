window.AIFSProjectFigures.register("pj-ui-string-localization-workbench-1", {
  title: "读取消息键、占位符和上下文",
  steps: [
    {
      label: "读取证据",
      detail:
        "翻译前记录稳定键和精确插值契约。",
    },
    {
      label: "计算",
      detail:
        "placeholders(text:string):string[]; readCatalog(value:unknown):Message[]",
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
        label: "消息模板",
        type: "text",
        value: "{count} of {count} tools",
      },
    ],
    calculate(v) {
      const p = v.text.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) || [];
      return {
        summary: "重复次数是契约的一部分。",
        columns: ["占位符"],
        rows: p.sort().map((x) => [x]),
        metrics: [{ label: "出现次数", value: p.length }],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-ui-string-localization-workbench-2", {
  title: "生成有界翻译提案",
  steps: [
    {
      label: "读取证据",
      detail:
        "限制已记录翻译提案，审阅前报告契约问题。",
    },
    {
      label: "计算",
      detail:
        "proposeTranslations(messages:Message[],recorded:unknown,locale:string):Proposal[]",
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
        key: "source",
        label: "源模板",
        type: "text",
        value: "{count} tools",
      },
      {
        key: "proposal",
        label: "拟议翻译",
        type: "text",
        value: "Herramientas",
      },
    ],
    calculate(v) {
      const p = (s) => (s.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) || []).sort(),
        a = p(v.source),
        b = p(v.proposal);
      return {
        summary:
          JSON.stringify(a) === JSON.stringify(b)
            ? "占位符契约已保留。"
            : "阻止批准：占位符多重集合已改变。",
        columns: ["来源", "提案"],
        rows: [[JSON.stringify(a), JSON.stringify(b)]],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-ui-string-localization-workbench-3", {
  title: "用给定插值值预览字符串",
  steps: [
    {
      label: "读取证据",
      detail:
        "将插值渲染为文本，让审阅者看到真实布局内容。",
    },
    {
      label: "计算",
      detail:
        "previewMessage(template:string,values:Record<string,string|number>):string",
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
      { key: "name", label: "成员姓名", type: "text", value: "Lina" },
      {
        key: "count",
        label: "选中工具数",
        type: "range",
        value: 3,
        min: 0,
        max: 20,
        step: 1,
      },
    ],
    calculate(v) {
      return {
        summary: "变量在预览中作为文本渲染。",
        columns: ["消息", "预览"],
        rows: [
          ["问候", "Hola, " + v.name],
          ["计数", v.count + " herramientas"],
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-ui-string-localization-workbench-4", {
  title: "导出已批准 locale 和未解决问题",
  steps: [
    {
      label: "读取证据",
      detail:
        "只导出明确批准的翻译及其上下文检查。",
    },
    {
      label: "计算",
      detail:
        "reviewTranslations(messages,proposals,value?):{catalog,unresolved,review}; renderWorkbench(messages,proposals,state,locale,values?):string",
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
        key: "approve",
        label: "批准翻译",
        type: "checkbox",
        value: true,
      },
      {
        key: "ack",
        label: "确认歧义上下文",
        type: "checkbox",
        value: false,
      },
    ],
    calculate(v) {
      const accepted = v.approve && v.ack;
      return {
        summary: accepted ? "导出此键。" : "此键保持未解决。",
        metrics: [
          { label: "已批准键数", value: accepted ? 1 : 0 },
          { label: "未解决键数", value: accepted ? 0 : 1 },
        ],
      };
    },
  },
});
