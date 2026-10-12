window.AIFSProjectFigures.register("pj-api-tutorial-runner-1", {
  title: "从自编教程提取明确请求",
  steps: [
    {
      label: "读取证据",
      detail:
        "识别可执行教程示例，不从任意代码块猜测意图。",
    },
    {
      label: "计算",
      detail: "extractRequests(markdown:string):RequestStep[]",
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
        key: "before",
        label: "请求围栏前的行数",
        type: "range",
        value: 4,
        min: 0,
        max: 20,
        step: 1,
      },
      {
        key: "steps",
        label: "明确请求块数量",
        type: "range",
        value: 3,
        min: 1,
        max: 20,
        step: 1,
      },
    ],
    calculate(v) {
      return {
        summary: "源位置指出要修复的精确示例。",
        metrics: [
          { label: "起始围栏行", value: v.before + 1 },
          { label: "请求数", value: v.steps },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-api-tutorial-runner-2", {
  title: "跨步骤解析类型化变量",
  steps: [
    {
      label: "读取证据",
      detail:
        "明确依赖，保留捕获的基本类型。",
    },
    {
      label: "计算",
      detail:
        "resolveValue(value:unknown,variables:Record<string,string|number|boolean>):unknown; captureVariables(body,declarations,previous?):Record<string,string|number|boolean>",
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
        key: "id",
        label: "捕获的数值借用 ID",
        type: "number",
        value: 41,
      },
    ],
    calculate(v) {
      return {
        summary:
          "精确替换保留数字；URL 替换编码文本。",
        columns: ["边界", "值"],
        rows: [
          ["JSON 请求体", JSON.stringify({ loan: v.id })],
          ["请求路径", "/loans/" + encodeURIComponent(String(v.id))],
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-api-tutorial-runner-3", {
  title: "对测试服务运行有界请求",
  steps: [
    {
      label: "读取证据",
      detail:
        "用有界本地或明确启用的请求演练真实 HTTP 传输。",
    },
    {
      label: "计算",
      detail:
        "runTutorial(steps:RequestStep[],baseURL:string,options?):Promise<Receipt[]>",
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
        key: "bytes",
        label: "响应字节数",
        type: "range",
        value: 80000,
        min: 0,
        max: 131072,
        step: 1024,
      },
      {
        key: "limit",
        label: "字节上限",
        type: "range",
        value: 65536,
        min: 1024,
        max: 131072,
        step: 1024,
      },
    ],
    calculate(v) {
      return {
        summary:
          v.bytes > v.limit
            ? "中止响应，跳过剩余请求。"
            : "响应符合配置上限。",
        metrics: [
          { label: "超出预算", value: Math.max(0, v.bytes - v.limit) },
        ],
        bars: [
          { label: "响应", value: v.bytes, max: 131072 },
          { label: "上限", value: v.limit, max: 131072 },
        ],
      };
    },
  },
});

window.AIFSProjectFigures.register("pj-api-tutorial-runner-4", {
  title: "导出关联来源的失败与修正提案",
  steps: [
    {
      label: "读取证据",
      detail:
        "生成可移植测试证据，要求经过审阅的修正，不悄悄编辑教程。",
    },
    {
      label: "计算",
      detail:
        "exportResults(steps,receipts):{junit,html,corrections}; acceptedCorrections(receipts,value):{id,line,proposal}[]",
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
        key: "failure",
        label: "首个失败步骤",
        type: "range",
        value: 2,
        min: 1,
        max: 3,
        step: 1,
      },
    ],
    calculate(v) {
      return {
        summary: "首个失败后停止，保留源证据。",
        metrics: [
          { label: "通过", value: v.failure - 1 },
          { label: "失败", value: 1 },
          { label: "跳过", value: 3 - v.failure },
        ],
        columns: ["步骤", "状态"],
        rows: [1, 2, 3].map((n) => [
          n,
          n < v.failure ? "pass" : n === v.failure ? "fail" : "skip",
        ]),
      };
    },
  },
});
