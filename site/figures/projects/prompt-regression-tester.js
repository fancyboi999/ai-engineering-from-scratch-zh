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
        throw Error("请使用逗号分隔的有限数");
      return n;
    });

  const buildLab = (stage) => ({
    controls: [
      text("baseline", "基线响应", '{"source":"source: notes.md"}'),
      text("candidate", "候选响应", "Ready. source: notes.md"),
      text("required", "必需子串", "source:"),
      number("minimum", "最低通过比例", 1, 0, 1, 0.1),
      number("budget", "允许回归数", 0, 0, 2),
    ],
    calculate(v) {
      const score = (s) => {
        let valid = true;
        try {
          JSON.parse(s);
        } catch {
          valid = false;
        }
        return [valid, s.includes(v.required)];
      };
      const a = score(v.baseline),
        b = score(v.candidate);
      const regressions = a.filter((x, i) => x && !b[i]).length;
      const passes = b.filter(Boolean).length;
      const ship = passes / 2 >= v.minimum && regressions <= v.budget;
      return {
        summary:
          stage === 4
            ? (ship ? "发布" : "阻止") +
              "：配对检查决定是否发布。"
            : "分别比较 JSON 语法与来源标注。",
        metrics: [
          metric("候选通过检查数", passes + "/2"),
          metric("回归数", regressions),
          metric("决定", ship ? "发布" : "阻止"),
        ],
        bars: [
          bar("基线通过检查数", a.filter(Boolean).length, 2),
          bar("候选通过检查数", passes, 2),
        ],
        columns: ["约定", "基线", "候选", "变化"],
        rows: ["JSON 语法", "来源定位信息"].map((s, i) => [
          s,
          a[i],
          b[i],
          a[i] === b[i] ? "不变" : b[i] ? "改善" : "回归",
        ]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-prompt-regression-tester-1",
    Object.assign(
      {
        title: "评分前校验用例",
        steps: [
          {
            label: "用例",
            detail:
              "Orchard 必须返回 JSON 并保留来源定位信息。将 `format-json` 与 `source-link` 保持为不同用例 ID：它们是向调用方作出的两项独立约定。比较运行前，录制包对整个用例列表做哈希，包括 prompt 和检查项。",
          },
          {
            label: "校验",
            detail:
              '用例 ID：[format-json, source-link]\n检查项：json; contains("source:")\n重复 format-json -> 回放前拒绝',
          },
          {
            label: "冻结",
            detail:
              "校验时构建 ID 集合。查找录制响应前，先校验每种检查类型。",
          },
        ],
        caption:
          "只修改 prompt 措辞。为什么原来的用例哈希必须不再匹配？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-prompt-regression-tester-2",
    Object.assign(
      {
        title: "不用模型，给录制输出评分",
        steps: [
          {
            label: "回放",
            detail:
              "有效 JSON 响应也可能漏掉来源。给每条断言评分并保留各自结果，让维护者看清哪项约定未兑现。",
          },
          {
            label: "断言",
            detail:
              '响应：{"answer":"ready"}\njson -> true\ncontains("source:") -> false\n用例通过 -> false',
          },
          {
            label: "证据",
            detail:
              "先求值检查列表，再应用 all()。缺失响应不能变成空列表并被判为通过。",
          },
        ],
        caption:
          "在 excludes 检查前将响应转为小写，会改变 API_KEY 的契约吗？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-prompt-regression-tester-3",
    Object.assign(
      {
        title: "跨修订比较同一组用例",
        steps: [
          {
            label: "基线",
            detail:
              "候选版本修复了来源标注，却用友好文字替代机器可读的 JSON。计算平均值前先按用例 ID 配对：一项改善不能修复另一项破坏的接口。",
          },
          {
            label: "候选",
            detail:
              "format-json：pass -> fail = regressed（回归）\nsource-link：fail -> pass = improved（改善）\n总体通过率：不变",
          },
          {
            label: "配对",
            detail:
              "在响应旁保留 model、settings 与用例哈希。除非显式允许该实验，否则 CLI 会拒绝 model/settings 变化的比较。",
          },
        ],
        caption:
          "你会如何向 JSON 消费方的负责人解释通过率不变？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-prompt-regression-tester-4",
    Object.assign(
      {
        title: "用明确容忍度把关发布",
        steps: [
          {
            label: "阈值",
            detail:
              "发布门禁是可执行的政策。三个用例中有一个回归时，即使其他响应改善，候选版本仍被阻止。将 JSON 和 Markdown 差异保存为 CI 产物。",
          },
          {
            label: "证据",
            detail:
              "用例数=3；候选通过数=2；回归数=1\n最低通过比例=1；回归预算=0\n决定：decision=block（阻止）；CLI 退出码=1",
          },
          {
            label: "决定",
            detail:
              "比较数值前检查阈值为有限数，且测试套件非空。退出状态必须与报告的决定一致。",
          },
        ],
        caption:
          "发生真实支持事件后，你会新增哪条断言，又如何保留它的录制来源？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
