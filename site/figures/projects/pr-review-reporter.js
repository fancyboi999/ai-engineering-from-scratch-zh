(function () {
  "use strict";
  const controls = [
    {
      key: "start",
      label: "新文件差异块起始行",
      type: "range",
      value: 10,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      key: "context",
      label: "新增行之前的上下文行数",
      type: "range",
      value: 2,
      min: 0,
      max: 8,
      step: 1,
    },
    {
      key: "removed",
      label: "新增行之前的删除行数",
      type: "range",
      value: 3,
      min: 0,
      max: 8,
      step: 1,
    },
    {
      key: "line",
      label: "新增源码行",
      type: "text",
      value: "eval(input);",
    },
    {
      key: "quote",
      label: "审阅者引用",
      type: "text",
      value: "eval(input)",
    },
    {
      key: "comment",
      label: "该行是注释",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    const source = (v.comment ? "// " : "") + v.line,
      anchored = !!v.quote.trim() && source.includes(v.quote),
      detected =
        !/^\s*(?:\/\/|\*|#)/.test(source) && /\beval\s*\(/.test(source);
    return {
      summary: !anchored
        ? "拒绝虚构引用"
        : detected
          ? "有原文锚点的词法候选项，供人工审阅"
          : "此行没有动态 eval 候选项",
      metrics: [
        { label: "新文件新增行号", value: v.start + v.context },
        { label: "影响新文件行号的删除行数", value: 0 },
        { label: "引用有原文支持", value: anchored },
      ],
      bars: [
        { label: "已消耗旧文件行数", value: v.context + v.removed, max: 16 },
        {
          label: "新增行前已消耗的新文件行数",
          value: v.context,
          max: 16,
        },
      ],
      columns: ["字段", "值"],
      rows: [
        ["位置", "src/run.ts:" + (v.start + v.context)],
        ["源码", source],
        ["引用", v.quote],
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-pr-review-reporter-1",
    Object.assign(
      {
        title: "还原新文件行号",
        steps: [
          { label: "输入契约", detail: "parseDiff" },
          {
            label: "还原新文件行号",
            detail:
              "将差异块头部解析为旧文件与新文件的行计数器。上下文行推进两者，删除行只推进旧计数器，新增行推进新计数器并产出可审阅的位置。拒绝截断的差异块与向父目录穿越的路径。解析器只处理文本统一差异；二进制补丁和合并差异不在契约内。通过 execFileSync 与 stdin 将 Python 接入 TypeScript，绝不用字符串插值构造 shell 命令。",
          },
          {
            label: "观察结果",
            detail:
              "即使旧文件一侧删除多行，替换内容仍对应新文件中的行号。",
          },
        ],
        caption: "进入下一步，在下一次副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-pr-review-reporter-2",
    Object.assign(
      {
        title: "生成范围明确的审阅候选项",
        steps: [
          { label: "输入契约", detail: "inspect" },
          {
            label: "生成范围明确的审阅候选项",
            detail:
              "为动态 eval、shell exec、禁用 TLS 校验和空 catch 处理器构建明确的静态检测器。只检查新增行。这些模式产生的是审阅候选项，不是存在可利用行为的证据。保持规则 ID 稳定，便于后续模型审阅者报告同一问题时去重。",
          },
          {
            label: "观察结果",
            detail:
              "固定测试输入产生一个高严重级别的 eval 候选项，附带确切引用和新文件第 2 行的位置。",
          },
        ],
        caption: "进入下一步，在下一次副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-pr-review-reporter-3",
    Object.assign(
      {
        title: "验证并合并发现",
        steps: [
          { label: "输入契约", detail: "verify, merge" },
          {
            label: "验证并合并发现",
            detail:
              "每个候选项必须指向已有新增行，引用必须是非空的确切源码子串。拒绝虚构文件、删除行位置、空引用和无效严重级别。按文件、行号和规则合并发现；审阅者意见不一致时保留较高严重级别。引用门禁证明的是位置有依据，不是安全结论属实；后者仍需审阅。",
          },
          {
            label: "观察结果",
            detail:
              "缺少支持的候选项保留在拒绝集合中；重复且有依据的候选项合并为一个发现。",
          },
        ],
        caption: "进入下一步，在下一次副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-pr-review-reporter-4",
    Object.assign(
      {
        title: "发布经过转义的本地报告",
        steps: [
          { label: "输入契约", detail: "escapeHTML, render" },
          {
            label: "发布经过转义的本地报告",
            detail:
              "渲染包含源码位置、引用证据、严重级别和说明的独立报告。像处理正文一样仔细转义源码：差异中也可能包含可执行 HTML。外部发布不属于工具职责。CLI 在本地写入 review.html，并打印供自动化使用的机器可读摘要。",
          },
          {
            label: "观察结果",
            detail:
              "打开 review.html 检查有原文锚点的发现。即使源码引用含有 HTML，也以文本显示。",
          },
        ],
        caption: "进入下一步，在下一次副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
