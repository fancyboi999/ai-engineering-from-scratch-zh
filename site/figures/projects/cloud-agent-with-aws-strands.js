(function () {
  "use strict";
  const controls = [
    {
      key: "reads",
      label: "请求的重复读取次数",
      type: "range",
      value: 3,
      min: 1,
      max: 10,
      step: 1,
    },
    {
      key: "steps",
      label: "步数预算",
      type: "range",
      value: 5,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      key: "bytes",
      label: "序列化结果字符数",
      type: "range",
      value: 60,
      min: 1,
      max: 500,
      step: 1,
    },
    {
      key: "budget",
      label: "上下文字符预算",
      type: "range",
      value: 180,
      min: 0,
      max: 2000,
      step: 1,
    },
    {
      key: "failures",
      label: "成功前的超时次数",
      type: "range",
      value: 1,
      min: 0,
      max: 4,
      step: 1,
    },
    {
      key: "retries",
      label: "允许重试次数",
      type: "range",
      value: 2,
      min: 0,
      max: 3,
      step: 1,
    },
    {
      key: "scope",
      label: "资源超出授权范围",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    const retained = Math.min(v.reads, v.steps, Math.floor(v.budget / v.bytes)),
      success = v.failures <= v.retries;
    const calls =
      v.scope || v.steps === 0 ? 0 : Math.min(v.failures + 1, v.retries + 1);
    return {
      summary: v.scope
        ? "调用 provider 前拒绝计划"
        : !success
          ? "超时重试次数已耗尽"
          : retained < v.reads
            ? "仅保留部分结果：预算已耗尽"
            : "使用请求内缓存完成",
      metrics: [
        { label: "provider 调用次数", value: calls },
        { label: "缓存命中次数", value: success ? Math.max(0, retained - 1) : 0 },
      ],
      bars: [
        {
          label: "保留的结果数",
          value: success && !v.scope ? retained : 0,
          max: v.reads,
        },
        {
          label: "保留的字符数",
          value: success && !v.scope ? retained * v.bytes : 0,
          max: v.budget || 1,
        },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-cloud-agent-with-aws-strands-1",
    Object.assign(
      {
        title: "校验限定范围的云检查计划",
        steps: [
          {
            label: "输入",
            detail:
              "模型提出意图，确定性校验器授予权限。",
          },
          {
            label: "转换",
            detail:
              "模型提出意图，确定性校验器授予权限。只接受明确命名的读取操作和调用方授权范围内的资源 ID。拒绝未知键和过大的计划，防止模型额外生成的指令悄悄变成可执行参数。",
          },
          {
            label: "验证",
            detail:
              "删除操作或越界资源会在任何 provider 调用前被拒绝。",
          },
        ],
        caption:
          "删除操作或越界资源会在任何 provider 调用前被拒绝。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-cloud-agent-with-aws-strands-2",
    Object.assign(
      {
        title: "在步数与响应预算内执行读取",
        steps: [
          {
            label: "输入",
            detail:
              "开始操作前扣除步数，保留序列化输出前扣除输出预算。",
          },
          {
            label: "转换",
            detail:
              "开始操作前扣除步数，保留序列化输出前扣除输出预算。输出限制无法撤销调用成本，但能防止大结果挤占后续上下文。保留部分结果和明确的终止状态，让预算导致的停止仍可诊断。",
          },
          {
            label: "验证",
            detail:
              "步数预算为零时不调用 provider，并返回 budget_exhausted。",
          },
        ],
        caption:
          "步数预算为零时不调用 provider，并返回 budget_exhausted。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-cloud-agent-with-aws-strands-3",
    Object.assign(
      {
        title: "重试暂时失败的读取并复用已完成请求",
        steps: [
          {
            label: "输入",
            detail:
              "只重试暂时性超时，按规范化操作标识缓存成功的读取。",
          },
          {
            label: "转换",
            detail:
              "只重试暂时性超时，按规范化操作标识缓存成功的读取。权限错误不是暂时故障，必须立即向外传播。缓存仅限本次请求：真实云状态会变化，长期缓存需要明确的 TTL 或版本，不能悄悄复用旧数据。",
          },
          {
            label: "验证",
            detail:
              "暂时性超时会重试；权限错误在一次调用后直接传播。",
          },
        ],
        caption:
          "暂时性超时会重试；权限错误在一次调用后直接传播。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-cloud-agent-with-aws-strands-4",
    Object.assign(
      {
        title: "用本地模型驱动真实 Strands 循环",
        steps: [
          {
            label: "输入",
            detail:
              "真实 Strands Agent 消费注入的 Model 子类产生的流式事件。",
          },
          {
            label: "转换",
            detail:
              "真实 Strands Agent 消费注入的 Model 子类产生的流式事件。这样无需凭据或云调用就能运行框架循环。模型仍只提出计划；用前面的校验器解析结果并检查授权范围。单独的 Bedrock 构造器需显式调用，离线演示和测试不会使用它。",
          },
          {
            label: "验证",
            detail:
              "框架通过一次模型调用生成一个录制的 JSON 计划，再由独立校验器检查。",
          },
        ],
        caption:
          "框架通过一次模型调用生成一个录制的 JSON 计划，再由独立校验器检查。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
