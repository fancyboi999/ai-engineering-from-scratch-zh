(function () {
  "use strict";
  const controls = [
    {
      key: "raw",
      label: "模型原始响应",
      type: "text",
      value: '{"answer":"retry","confidence":1.5}',
    },
    {
      key: "maximum",
      label: "置信度上限",
      type: "range",
      value: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
    {
      key: "attempts",
      label: "尝试次数预算",
      type: "range",
      value: 2,
      min: 1,
      max: 5,
      step: 1,
    },
    {
      key: "keyword",
      label: "未使用的可选 schema 含不支持的 $ref",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    let obj;
    try {
      obj = JSON.parse(v.raw);
    } catch (e) {
      return {
        summary: "解析失败：" + e.message,
        metrics: [
          {
            label: "UTF-8 字节数",
            value: new TextEncoder().encode(v.raw).length,
          },
        ],
        bars: [],
      };
    }
    if (v.keyword)
      return {
        summary:
          "配置错误：即使可选值缺失，也拒绝 $ref",
        metrics: [],
        bars: [],
      };
    const issues = [];
    if (!obj || Array.isArray(obj) || typeof obj !== "object")
      issues.push("$/ 应为对象");
    else {
      if (typeof obj.answer !== "string" || !obj.answer.length)
        issues.push("$/answer 必须是非空字符串");
      if (
        typeof obj.confidence !== "number" ||
        obj.confidence < 0 ||
        obj.confidence > v.maximum
      )
        issues.push("$/confidence 超出允许范围");
      for (const key of Object.keys(obj))
        if (!["answer", "confidence"].includes(key))
          issues.push("$/" + key + " 未知属性");
    }
    return {
      summary: issues.length
        ? "已拒绝；将这些问题反馈给预算内的下一次尝试"
        : "已接受结构化输出",
      metrics: [
        { label: "问题数", value: issues.length },
        {
          label: "本次响应后的剩余重试调用数",
          value: issues.length ? v.attempts - 1 : 0,
        },
      ],
      bars: [
        {
          label: "置信度",
          value:
            typeof obj?.confidence === "number"
              ? Math.max(0, obj.confidence)
              : 0,
          max: 2,
        },
      ],
      columns: ["问题路径与原因"],
      rows: issues.map((x) => [x]),
    };
  };
  window.AIFSProjectFigures.register(
    "pj-json-schema-output-guard-1",
    Object.assign(
      {
        title: "解析不可信输入边界",
        steps: [
          { label: "输入契约", detail: "parseJSON" },
          {
            label: "解析不可信输入边界",
            detail:
              "模型响应是一段字节串。将整个字符串解析为 JSON，拒绝 Markdown 包装和尾随文本，并在解析前限制 UTF-8 字节数。除对象外也接受 JSON 原始值：原始值是否有用由 schema 决定，而不是解析器。不要删掉文本直到它碰巧能解析，这会掩盖真实的输出契约。",
          },
          {
            label: "观察结果",
            detail:
              "有效 JSON 会返回解析值；尾随指令或过大的响应会抛出错误。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-json-schema-output-guard-2",
    Object.assign(
      {
        title: "递归遍历 schema",
        steps: [
          { label: "输入契约", detail: "validate" },
          {
            label: "递归遍历 schema",
            detail:
              "实现对象、数组和原始值校验。必需属性按自有属性语义检查，继承属性不能满足契约。将 integer 视为 number 的细化，拒绝非有限数，并为每个失败保留路径。递归下降深度限制为 32，避免 schema 和值无限消耗调用栈。",
          },
          {
            label: "观察结果",
            detail:
              "嵌套类型错误会生成如 `$/a/0` 的路径，调用方可以据此要求定点修正。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-json-schema-output-guard-3",
    Object.assign(
      {
        title: "拒绝有歧义或不支持的契约",
        steps: [
          { label: "输入契约", detail: "validate, guard" },
          {
            label: "拒绝有歧义或不支持的契约",
            detail:
              "添加数值边界、枚举成员校验、Unicode 字符串最小长度、数组边界和封闭对象。转义属性路径中的斜杠与波浪号。超出这个教学子集的关键字属于配置错误，不能静默通过。本实现不声称完全符合 JSON Schema：引用、格式和组合器还需要额外实现。",
          },
          {
            label: "观察结果",
            detail:
              "守卫对无效输出返回结构化问题；不支持的 schema 特性则抛出配置错误。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-json-schema-output-guard-4",
    Object.assign(
      {
        title: "在有限预算内修复",
        steps: [
          { label: "输入契约", detail: "repair" },
          {
            label: "在有限预算内修复",
            detail:
              "只将结构化校验反馈传入生成回调。解释输出前先计入调用次数。一旦接受就立即停止；最后一次尝试仍被拒绝时，明确返回耗尽状态。provider 错误直接传播，不能伪装成 schema 错误。追踪记录保留每次尝试，第三次响应成功也不能掩盖前两次契约违规。",
          },
          {
            label: "观察结果",
            detail:
              "演示先拒绝 confidence 1.5，将超出上限的问题反馈给下一次尝试，再接受 confidence 0.9。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
