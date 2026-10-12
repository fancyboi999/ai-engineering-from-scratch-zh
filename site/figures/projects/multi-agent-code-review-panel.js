(function () {
  "use strict";
  const controls = [
    {
      key: "votes",
      label: "不同支持者数",
      type: "range",
      value: 2,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "quorum",
      label: "所需法定票数",
      type: "range",
      value: 2,
      min: 1,
      max: 5,
      step: 1,
    },
    {
      key: "budget",
      label: "审查者预算",
      type: "range",
      value: 3,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "predicted",
      label: "去重后的预测数",
      type: "range",
      value: 3,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      key: "expected",
      label: "预期发现数",
      type: "range",
      value: 2,
      min: 1,
      max: 10,
      step: 1,
    },
    {
      key: "hits",
      label: "真阳性",
      type: "range",
      value: 2,
      min: 0,
      max: 10,
      step: 1,
    },
  ];
  const calculate = function (v, stepIndex) {
    if (v.hits > Math.min(v.predicted, v.expected))
      return {
        summary: "拒绝不可能的真实标签交集",
        metrics: [],
        bars: [],
      };
    const support = Math.min(v.votes, v.budget),
      precision = v.predicted ? v.hits / v.predicted : 0,
      recall = v.hits / v.expected;
    return {
      summary:
        support >= v.quorum
          ? "已达成共识；正确性仍需真实标签验证"
          : "需要审查：独立支持不足",
      metrics: [
        { label: "纳入的支持者数", value: support },
        { label: "精确率", value: precision.toFixed(3) },
        { label: "召回率", value: recall.toFixed(3) },
      ],
      bars: [
        { label: "真阳性", value: v.hits, max: 10 },
        { label: "假阳性", value: v.predicted - v.hits, max: 10 },
        { label: "漏检发现数", value: v.expected - v.hits, max: 10 },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-multi-agent-code-review-panel-1",
    Object.assign(
      {
        title: "校验审查者证据",
        steps: [
          { label: "输入契约", detail: "validateFinding" },
          {
            label: "校验审查者证据",
            detail:
              "要求文件存在于给定快照中、行号为从 1 开始的正数、引文逐字匹配且非空、规则 ID 稳定，严重等级为 1 到 3。所有审查者共用证据校验。它防止伪造位置进入聚合边界，但一致意见和引文仍不能证明发现正确。",
          },
          {
            label: "观察结果",
            detail:
              "有来源支持的引文进入评审小组。即使发现看起来合理，引用不存在的行也会被拒绝。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-multi-agent-code-review-panel-2",
    Object.assign(
      {
        title: "聚合独立支持",
        steps: [
          { label: "输入契约", detail: "aggregate" },
          {
            label: "聚合独立支持",
            detail:
              "按文件、行号和规则分组有效发现。每组中每位审查者只计一票，拒绝重复审查者身份，并保留所有严重等级投票。达到法定票数形成共识；单票发现仍以 needs-review 展示。达成共识后分歧标记仍保留，供用户检查相互冲突的严重等级判断。",
          },
          {
            label: "观察结果",
            detail:
              "一位审查者重复发现仍只计一票；两位审查者给出不同严重等级时，同时展示共识和分歧。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-multi-agent-code-review-panel-3",
    Object.assign(
      {
        title: "预留成本并执行截止时间",
        steps: [
          { label: "输入契约", detail: "runPanel" },
          {
            label: "预留成本并执行截止时间",
            detail:
              "启动每位审查者前先预留成本。剩余预算不足的任务跳过，并记录决策。每位审查者与截止计时竞争，超时后触发中止信号。失败保留在追踪记录中，已完成审查仍可聚合。适配器必须响应 AbortSignal 才能停止外部工作；运行器无法强制远程服务取消。",
          },
          {
            label: "观察结果",
            detail:
              "演示启动两位审查者，因预算跳过第三位，并保留严重等级分歧。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-multi-agent-code-review-panel-4",
    Object.assign(
      {
        title: "测量评审小组的精确率与召回率",
        steps: [
          { label: "输入契约", detail: "evaluate" },
          {
            label: "测量评审小组的精确率与召回率",
            detail:
              "将去重后的发现 ID 与预期集合比较。精确率衡量预测发现中有多少符合预期；召回率衡量预期集合中有多少被找到。两个集合都去重，避免重复审查者虚增指标。没有预测时精确率为零，而非误导性的满分。调整法定票数前，先测试留出输入。",
          },
          {
            label: "观察结果",
            detail:
              "假阳性降低精确率，漏掉预期发现降低召回率；法定票数的取舍需要实际测量。",
          },
        ],
        caption: "前进一步，在下一项操作生效前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
