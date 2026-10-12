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
    options: options.map((x) => ({ value: x, label: ({ candidate: "候选（candidate）", approved: "已批准（approved）", retired: "已退役（retired）" })[x] })),
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
      text(
        "rule",
        "区分大小写的纠正",
        "Read API_KEY; never rename it to api_key.",
      ),
      text(
        "sessions",
        "来源会话（逗号分隔）",
        "review-a,review-a,review-b",
      ),
      text("scope", "规则范围", "orchard"),
      text("activeScope", "当前范围", "orchard"),
      select("state", "规则状态", "candidate", [
        "candidate",
        "approved",
        "retired",
      ]),
      number("minimum", "所需独立会话数", 2, 1, 5),
    ],
    calculate(v) {
      const normalized = v.rule.trim().replace(/\s+/g, " "),
        sessions = unique(
          v.sessions
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        ),
        enough = sessions.length >= v.minimum;
      const scope = v.scope.trim().toLowerCase(),
        match =
          scope === "global" || scope === v.activeScope.trim().toLowerCase(),
        inject = v.state === "approved" && match;
      return {
        summary:
          stage === 1
            ? "已存规则保留大小写：" + normalized
            : inject
              ? "注入已批准且范围匹配的规则及证据"
              : v.state === "retired"
                ? "已退役规则不纳入"
                : !match
                  ? "范围不匹配"
                  : enough
                    ? "会话数足够；仍需明确批准"
                    : "独立会话数不足",
        metrics: [
          metric("独立会话数", sessions.length),
          metric(
            "重复投递次数",
            v.sessions.split(",").filter((x) => x.trim()).length -
              sessions.length,
          ),
          metric("范围匹配", match),
          metric("注入规则", inject),
        ],
        bars: [
          bar("独立支持数", sessions.length, v.minimum),
          bar("所需支持数", v.minimum),
        ],
        columns: ["会话", "证据定位符"],
        rows: sessions.map((s, i) => [
          s,
          "session:" + s + "#correction-" + (i + 1),
        ]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-workflow-hooks-1",
    Object.assign(
      {
        title: "捕获纠正并保留来源",
        steps: [
          {
            label: "输入契约",
            detail:
              "纠正是来自特定会话和来源定位符的证据。保留规则中 API_KEY 的精确大小写；大小写折叠会把有用指令变成矛盾指令。",
          },
          {
            label: "捕获纠正并保留来源",
            detail:
              "规则原文：Read API_KEY; never rename it to api_key.\n范围：Orchard -> orchard\n来源定位符：local:orchard/config.py:12",
          },
          {
            label: "观察结果",
            detail:
              "规范化范围以便匹配，但对规则只合并空白。明显具有凭据特征的数据进入持久存储前应被拒绝。",
          },
        ],
        caption:
          "摄取前调用者必须清理来源摘录中的哪些部分？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-workflow-hooks-2",
    Object.assign(
      {
        title: "统计独立会话",
        steps: [
          {
            label: "输入契约",
            detail:
              "重复投递不是独立证据。同一会话内两条不同纠正仍只算一个支持会话。将摘录和定位符与候选规则一并保留，使来源 ID 后续仍可解析。",
          },
          {
            label: "统计独立会话",
            detail:
              "会话 A 的事件 a1,a2 -> sessions=[A]\n会话 B 的事件 b1 -> sessions=[A,B]\n批准前规则保持 candidate 状态",
          },
          {
            label: "观察结果",
            detail:
              "使用完整且已验证的内容对事件 ID 去重。冲突复用 ID 必须失败，而不能悄悄替换来源。",
          },
        ],
        caption:
          "为什么 API_KEY 与 api_key 规则应保留为不同候选项？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-workflow-hooks-3",
    Object.assign(
      {
        title: "批准并选择范围匹配的规则",
        steps: [
          {
            label: "输入契约",
            detail:
              "批准针对精确的候选摘要。第二个来源可能改变摘要，要求重新审核。规则退役后不再进入输出上下文，但证据仍可检查。",
          },
          {
            label: "批准并选择范围匹配的规则",
            detail:
              "candidate -> 检查 approval_digest\n批准精确摘要 -> approved\nemit orchard -> 原始规则 + 证据\n退役 -> 下次输出不含此规则",
          },
          {
            label: "观察结果",
            detail:
              "同时按状态和范围过滤。全局或频繁重复的候选规则也不能绕过明确批准。",
          },
        ],
        caption:
          "新证据到达后，用户仍提供昨天的摘要，CLI 应如何处理？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-workflow-hooks-4",
    Object.assign(
      {
        title: "跨会话持久保存规则",
        steps: [
          {
            label: "输入契约",
            detail:
              "CLI 捕获 JSONL 纠正，保存带版本的存储，在另一个进程中重新加载，并输出中立的 JSON hook 载荷。它保留证据、支持退役，且重启后仍精确保留 API_KEY。",
          },
          {
            label: "跨会话持久保存规则",
            detail:
              "捕获 -> store.json\n批准 -> 存储状态 approved\n输出 -> additional_context 及证据定位符\n存储格式错误 -> 报错，而不是空结果成功",
          },
          {
            label: "观察结果",
            detail:
              "写入唯一的同级临时文件，再重命名。此存储约定为单写入者；使用并发写入者前需加锁。",
          },
        ],
        caption:
          "你的 agent 集成会如何将 additional_context 映射到其文档规定的 hook 传输格式？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
