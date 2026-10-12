(function () {
  "use strict";
  const field = (key, label, value) => ({ key, label, type: "text", value });
  const range = (key, label, value, max) => ({
    key,
    label,
    type: "range",
    value,
    min: 0,
    max,
    step: 1,
  });
  function config(title, detail, lab) {
    return {
      title,
      steps: [
        { label: "读取输入", detail },
        {
          label: "计算结果",
          detail:
            "修改一个控件，检查重新计算的中间状态。",
        },
      ],
      caption: detail,
      lab,
    };
  }
  window.AIFSProjectFigures.register(
    "pj-harness-bench-1",
    config(
      "校验基准测试用例",
      "运行策略前先解析可编辑的用例 JSON。",
      {
        controls: [
          field(
            "cases",
            "用例 JSON",
            '[{"ID":"expiry","Prompt":"Link lifetime?","Expected":"15 minutes"},{"ID":"restore","Prompt":"Final state?","Expected":"ready"}]',
          ),
          range("limit", "用例数上限", 3, 6),
        ],
        calculate(v) {
          const cases = JSON.parse(v.cases);
          if (!Array.isArray(cases)) throw new Error("应提供用例数组");
          const seen = new Set();
          const rows = cases.map((c) => {
            let status = "accepted";
            if (
              !c ||
              typeof c !== "object" ||
              Object.keys(c).some(
                (k) => !["ID", "Prompt", "Expected", "Evidence"].includes(k),
              )
            )
              status = "unknown field or invalid record";
            else if (
              ["ID", "Prompt", "Expected"].some(
                (k) => typeof c[k] !== "string" || !c[k].trim(),
              )
            )
              status = "missing field";
            else if (
              c.Evidence !== undefined &&
              (!Array.isArray(c.Evidence) ||
                c.Evidence.some((s) => typeof s !== "string"))
            )
              status = "invalid evidence";
            else if (seen.has(c.ID)) status = "duplicate ID";
            seen.add(c?.ID);
            return [c?.ID || "（缺失）", status];
          });
          const invalid = rows.filter((r) => r[1] !== "accepted").length;
          const over = cases.length > v.limit;
          return {
            summary: over
              ? "已拒绝：超出用例预算"
              : invalid
                ? "已拒绝：请修正无效记录"
                : "已接受带类型的用例集",
            metrics: [
              { label: "用例数", value: cases.length },
              { label: "无效记录数", value: invalid },
            ],
            bars: [
              {
                label: "用例数／上限",
                value: cases.length,
                max: Math.max(1, v.limit, cases.length),
              },
            ],
            columns: ["用例", "校验"],
            rows: rows.map(([id, status]) => [id, ({ accepted: "已接受", "unknown field or invalid record": "未知字段或无效记录", "missing field": "缺少字段", "invalid evidence": "无效证据", "duplicate ID": "重复 ID" })[status]]),
          };
        },
      },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-harness-bench-2",
    config(
      "检查精确匹配的规范化",
      "大小写和空白可以变化；数值与标点仍有意义。",
      {
        controls: [
          field("actual", "模型答案", " 15   MINUTES "),
          field("expected", "预期答案", "15 minutes"),
        ],
        calculate(v) {
          const normalize = (s) =>
            s.trim().split(/\s+/u).join(" ").toLowerCase();
          const actual = normalize(v.actual),
            expected = normalize(v.expected);
          const correct = expected !== "" && actual === expected;
          return {
            summary: correct
              ? "满足精确答案契约"
              : "未满足答案契约",
            metrics: [{ label: "得分", value: correct ? 1 : 0 }],
            bars: [{ label: "正确数", value: correct ? 1 : 0, max: 1 }],
            columns: ["字段", "规范化值"],
            rows: [
              ["实际值", actual],
              ["预期值", expected],
            ],
          };
        },
      },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-harness-bench-3",
    config(
      "运行有预算限制的策略",
      "预设的三用例模型演示实际调用计数。本图表不发起网络调用。",
      {
        controls: [
          {
            key: "policy",
            label: "策略",
            type: "select",
            value: "retry-errors",
            options: ["baseline", "retry-errors", "evidence"].map((value) => ({
              value,
              label: ({ baseline: "基线", "retry-errors": "错误重试", evidence: "使用证据" })[value],
            })),
          },
          range("budget", "调用预算", 4, 6),
          field("stale", "没有到期证据时的答案", "60 minutes"),
        ],
        calculate(v) {
          let calls = 0,
            attempted = 0,
            correct = 0,
            errors = 0,
            state = "completed";
          const cases = [
            { id: "expiry", expected: "15 minutes" },
            { id: "restore", expected: "ready" },
            { id: "price", expected: "unknown" },
          ];
          const rows = [];
          for (const c of cases) {
            if (calls >= v.budget) {
              state = "budget-exhausted";
              break;
            }
            attempted++;
            let failed = false,
              answer = "";
            const attempts = v.policy === "retry-errors" ? 2 : 1;
            for (let attempt = 1; attempt <= attempts; attempt++) {
              if (calls >= v.budget) {
                state = "budget-exhausted";
                break;
              }
              calls++;
              failed =
                c.id === "restore" && attempt === 1 && v.policy !== "evidence";
              answer = c.expected;
              if (c.id === "expiry" && v.policy !== "evidence")
                answer = v.stale;
              rows.push([c.id, attempt, failed ? "provider 错误" : answer]);
              if (!failed) break;
            }
            if (failed) errors++;
            else if (answer.trim().toLowerCase() === c.expected) correct++;
          }
          return {
            summary: `${state === "completed" ? "已完成（completed）" : "预算耗尽（budget-exhausted）"}：正确 ${correct}/3，使用 ${calls} 次调用`,
            metrics: [
              { label: "已尝试用例数", value: attempted },
              { label: "最终错误数", value: errors },
            ],
            bars: [
              { label: "正确数／全部用例", value: correct, max: 3 },
              {
                label: "调用数／预算",
                value: calls,
                max: Math.max(1, v.budget),
              },
            ],
            columns: ["用例", "尝试次数", "观察到的响应"],
            rows,
          };
        },
      },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-harness-bench-4",
    config(
      "检查比较凭据",
      "总数相同还不够：排名前需比较完整数据集与模型配置。",
      {
        controls: [
          field("datasetA", "数据集凭据 A", "orchard-v1-ordered"),
          field("datasetB", "数据集凭据 B", "orchard-v1-ordered"),
          field(
            "modelA",
            "模型配置 A",
            '{"model":"local","max_tokens":128}',
          ),
          field(
            "modelB",
            "模型配置 B",
            '{"max_tokens":128,"model":"local"}',
          ),
          range("correctA", "A 的正确数（共 3 项）", 1, 3),
          range("correctB", "B 的正确数（共 3 项）", 2, 3),
        ],
        calculate(v) {
          const canonical = (s) => {
            const value = JSON.parse(s);
            if (!value || Array.isArray(value) || typeof value !== "object")
              throw new Error("模型配置必须为对象");
            return JSON.stringify(
              Object.keys(value)
                .sort()
                .map((key) => [key, value[key]]),
            );
          };
          const datasetSame = v.datasetA !== "" && v.datasetA === v.datasetB;
          const modelSame = canonical(v.modelA) === canonical(v.modelB);
          const comparable = datasetSame && modelSame;
          const rows = [
            ["A", v.correctA, 3],
            ["B", v.correctB, 3],
          ];
          if (comparable)
            rows.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
          return {
            summary: comparable
              ? `相同的固定四次调用预算下可以比较。领先者：${rows[0][0]}`
              : "拒绝比较：凭据不匹配",
            metrics: [
              { label: "数据集匹配", value: datasetSame },
              { label: "模型匹配", value: modelSame },
            ],
            bars: [
              { label: "A 正确数", value: v.correctA, max: 3 },
              { label: "B 正确数", value: v.correctB, max: 3 },
            ],
            columns: ["运行", "正确数", "总数"],
            rows,
          };
        },
      },
    ),
  );
})();
