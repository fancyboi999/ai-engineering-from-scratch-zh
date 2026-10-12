(function () {
  "use strict";
  const number = (key, label, value, min = 0, max = 100, step = 1) => ({
    key,
    label,
    type: "range",
    value,
    min,
    max,
    step,
  });
  const text = (key, label, value) => ({ key, label, type: "text", value });
  const check = (key, label, value) => ({
    key,
    label,
    type: "checkbox",
    value,
  });
  const select = (key, label, value, options) => ({
    key,
    label,
    type: "select",
    value,
    options: options.map((x) => ({ value: x, label: x })),
  });
  const metric = (label, value) => ({ label, value });
  const bar = (label, value, max) => ({ label, value, max });
  const words = (s) =>
    s
      .normalize("NFC")
      .toLowerCase()
      .match(/[\p{L}\p{N}_]+/gu) || [];
  const unique = (xs) => [...new Set(xs)];
  const finiteList = (s) =>
    s.split(",").map((x) => {
      const n = Number(x.trim());
      if (!Number.isFinite(n))
        throw Error("请输入逗号分隔的有限数值");
      return n;
    });

  const buildLab = (stage) => ({
    controls: [
      text("text", "待估算文本", "Explain Orchard guest tokens"),
      number("ratio", "每个估算 token 的字符数", 4, 1, 8),
      number("input", "记录的输入 token 数", 100, 0, 500),
      number("cached", "缓存输入 token 数", 40, 0, 500),
      number("output", "记录的输出 token 数", 20, 0, 200),
      number("inputRate", "输入费率（nano-dollars/token）", 2, 0, 20),
      number("cachedRate", "缓存费率（nano-dollars/token）", 1, 0, 20),
      number("outputRate", "输出费率（nano-dollars/token）", 5, 0, 20),
      number("reservation", "预留金额（nano-dollars）", 600, 0, 2000),
    ],
    calculate(v) {
      if (v.cached > v.input)
        throw Error("缓存 token 数不能超过输入 token 数");
      const uncached = (v.input - v.cached) * v.inputRate,
        cache = v.cached * v.cachedRate,
        output = v.output * v.outputRate,
        total = uncached + cache + output;
      return {
        summary:
          stage === 1
            ? "近似估算：" +
              Math.ceil([...v.text].length / v.ratio) +
              " token，并非 provider 的计数"
            : total > v.reservation
              ? "记录的用量超过预留金额"
              : "结算记录的用量并释放未用预留金额",
        metrics: [
          metric("估算 token 数", Math.ceil([...v.text].length / v.ratio)),
          metric("实际金额（nano-dollars）", total),
          metric("未用预留金额", Math.max(0, v.reservation - total)),
          metric("超支", Math.max(0, total - v.reservation)),
        ],
        bars: [
          bar("未缓存输入费用", uncached),
          bar("缓存输入费用", cache),
          bar("输出费用", output),
        ],
        columns: ["组成部分", "token 数", "费率", "费用"],
        rows: [
          ["输入", v.input - v.cached, v.inputRate, uncached],
          ["缓存", v.cached, v.cachedRate, cache],
          ["输出", v.output, v.outputRate, output],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-token-counter-and-cost-meter-1",
    Object.assign(
      {
        title: "按明确记录的界限估算文本",
        steps: [
          {
            label: "统计标量值",
            detail:
              "先给出可见的近似估算。按每 token 四个字符，21 个 Unicode 标量值估算为六个 token。这是预检规划的基线；provider 的实际计数会因语言、标点和分词器而不同。",
          },
          {
            label: "读取比例",
            detail: "characters=21; ratio=4\nceil(21/4)=6 个估算 token",
          },
          {
            label: "向上取整除法",
            detail:
              "用商加余数检查，避免加上 ratio-1 导致溢出。绝不将此结果标为 provider 分词器计数。",
          },
        ],
        caption:
          "为什么两种语言中相同字符数可能对应不同的 token 数？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-token-counter-and-cost-meter-2",
    Object.assign(
      {
        title: "验证记录的用量",
        steps: [
          {
            label: "解析计数器",
            detail:
              "JSON 适配器读取已记录的输入/输出用量和缓存输入详情。Rust 验证对应的 input,output,cached 三元组。缓存 token 是输入 token 的子集，不是额外的输入费用。",
          },
          {
            label: "检查无符号值",
            detail:
              "input_tokens=100; output_tokens=20; cached_tokens=40\nwire=100,20,40\n未缓存输入=60",
          },
          {
            label: "缓存子集",
            detail:
              "拒绝布尔值、负值和大于输入数的缓存计数。provider 响应的规范化放在算术核心之外。",
          },
        ],
        caption:
          "provider 响应缺少必需的输入用量时应该怎样处理？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-token-counter-and-cost-meter-3",
    Object.assign(
      {
        title: "用带检查的整数计算费用",
        steps: [
          {
            label: "未缓存费用",
            detail:
              "使用给定的整数费率表，单位为 nano-dollars/token。input=2、output=5、cached=1 时，记录的请求费用为 260 nano-dollars。这些 fixture 费率不是 provider 的当前价格。",
          },
          {
            label: "缓存费用",
            detail:
              "60 个未缓存 token * 2 = 120\n40 个缓存 token * 1 = 40\n20 个输出 token * 5 = 100\ntotal=260 nano_dollars",
          },
          {
            label: "输出费用",
            detail:
              "使用带检查的 u64 乘法和加法。不要经浮点美元值对各组成部分分别取整。",
          },
        ],
        caption:
          "如果算术静默回绕，溢出会怎样影响预算准入？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-token-counter-and-cost-meter-4",
    Object.assign(
      {
        title: "按账本准入任务",
        steps: [
          {
            label: "读取账本",
            detail:
              "对照记录的用量回放预留操作。第一个 Orchard 请求预留 600，结算 260，释放 340。只剩 430 时，后续需要 1,500 的请求被阻止。保存的 JSON 保留请求 ID 和全部结算字段。",
          },
          {
            label: "带检查的加法",
            detail:
              "limit=1000\n请求 1 reserved=600 actual=260 unused=340\n请求 2 actual=310 -> spent=570\nremaining=430；更大的预留请求 -> 被阻止",
          },
          {
            label: "比较限额",
            detail:
              "即使用量超过估算，结算也必须记录实际用量。明确标记超支，不要用费用上限掩盖它。",
          },
        ],
        caption:
          "agent-budget-planner 可以复用哪些字段，而不混淆报价与实际用量？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
