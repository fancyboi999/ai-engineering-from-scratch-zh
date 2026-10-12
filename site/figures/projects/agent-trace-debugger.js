(function () {
  "use strict";
  const controls = [
    {
      key: "a",
      label: "子跨度 A 结束时间（起点 10）",
      type: "range",
      value: 60,
      min: 10,
      max: 100,
      step: 1,
    },
    {
      key: "start",
      label: "子跨度 B 起点",
      type: "range",
      value: 40,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "end",
      label: "子跨度 B 终点",
      type: "range",
      value: 90,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "tokens",
      label: "失败跨度的 token 数",
      type: "range",
      value: 300,
      min: 0,
      max: 1000,
      step: 1,
    },
  ];
  const calculate = function (v, stepIndex) {
    if (v.end < v.start)
      return {
        summary: "拒绝持续时间为负的子跨度",
        metrics: [],
        bars: [],
      };
    const overlap = Math.max(0, Math.min(v.a, v.end) - Math.max(10, v.start));
    const sum = v.a - 10 + v.end - v.start,
      union = sum - overlap;
    return {
      summary:
        "从父跨度的 100 ms 中减去子区间的并集。重叠部分只计一次。",
      metrics: [
        { label: "直接相加的子跨度时间（ms）", value: sum },
        { label: "重叠时间（ms）", value: overlap },
        { label: "失败跨度中的 token 数", value: v.tokens },
      ],
      bars: [
        { label: "子跨度并集时间（ms）", value: union, max: 100 },
        { label: "父跨度独占时间（ms）", value: 100 - union, max: 100 },
      ],
      columns: ["跨度", "起点", "终点"],
      rows: [
        ["父跨度", 0, 100],
        ["A", 10, v.a],
        ["B", v.start, v.end],
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-agent-trace-debugger-1",
    Object.assign(
      {
        title: "读取 JSONL 追踪记录",
        steps: [
          { label: "输入契约", detail: "parseTrace" },
          {
            label: "读取 JSONL 追踪记录",
            detail:
              "每个非空行解析一个 JSON 对象。要求 ID 稳定、名称齐全、起止时间有限、token 数非负，并明确标注 ok 或 error 状态。遇到格式错误的行就停止处理并报告行号。静默丢弃异常跨度会扭曲耗时和成本结论。时间用相对毫秒表示，不是墙钟时间戳。",
          },
          {
            label: "观察结果",
            detail:
              "有效 JSONL 转为带类型的跨度；负持续时间在分析前就被拒绝。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-agent-trace-debugger-2",
    Object.assign(
      {
        title: "校验父子关系",
        steps: [
          { label: "输入契约", detail: "validateTree" },
          {
            label: "校验父子关系",
            detail:
              "子跨度必须引用已存在的父跨度，且完全位于父区间内。检查每条祖先链是否成环，并拒绝重复 ID。允许多个根，因为追踪记录可能包含重叠的独立运行。先校验再聚合，避免损坏的图生成看似可信的图表。",
          },
          {
            label: "观察结果",
            detail:
              "即使子跨度看起来合理，只要结束时间晚于父跨度，图校验也会拒绝它。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-agent-trace-debugger-3",
    Object.assign(
      {
        title: "区分工作时间与等待时间",
        steps: [
          { label: "输入契约", detail: "unionDuration, analyze" },
          {
            label: "区分工作时间与等待时间",
            detail:
              "总持续时间等于终点减起点。独占时间减去直接子区间的并集，而非它们的总和，因为并行子跨度会重叠。根区间的并集给出多次运行的墙钟耗时。token 数归属于各自跨度，只累加一次。最慢结果指向独占时间最长的跨度，避免选中主要在等待子跨度的根。",
          },
          {
            label: "观察结果",
            detail:
              "重叠子跨度只计一次，模型调用成为工作耗时最多的跨度。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-agent-trace-debugger-4",
    Object.assign(
      {
        title: "渲染可检查的时间线",
        steps: [
          { label: "输入契约", detail: "render" },
          {
            label: "渲染可检查的时间线",
            detail:
              "生成独立 HTML 时间线，每个跨度一行，按比例绘制条形并用颜色标出错误。将跨度名称插入标记前先转义。包含独占时间、总时间、墙钟时间、token 数和错误数。空追踪记录也能生成可读产物。输出是本地静态报告，不加载第三方脚本。",
          },
          {
            label: "观察结果",
            detail:
              "打开 trace.html，查看标红的失败模型跨度，并比较独占时间与总持续时间。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
