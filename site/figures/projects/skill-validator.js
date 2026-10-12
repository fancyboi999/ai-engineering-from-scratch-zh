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
      text("name", "元数据名称", "orchard-release"),
      text("directory", "目录名称", "orchard-release"),
      text("description", "描述", "Check deployment evidence"),
      text("body", "指令", "Read the restore log before approving."),
      text("resource", "资源路径", "references/restore.md"),
      check("activate", "激活指令", true),
      number("budget", "字符预算", 120, 0, 300),
    ],
    calculate(v) {
      const grammar =
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.name) && v.name.length <= 64,
        identity = v.name === v.directory;
      const safe =
        !!v.resource &&
        !v.resource.startsWith("/") &&
        !v.resource.includes("\\") &&
        v.resource.split("/").every((p) => p && p !== "." && p !== "..");
      const discovery = v.name + ": " + v.description,
        context = discovery + (v.activate && v.body ? "\n\n" + v.body : "");
      const count = [...context].length;
      return {
        summary: !grammar
          ? "名称无效"
          : !identity
            ? "目录身份冲突"
            : !safe
              ? "资源路径被拒绝"
              : count > v.budget
                ? "超出限制：完整上下文无法容纳"
                : "完整上下文通过模型检查",
        metrics: [
          metric("名称有效", grammar),
          metric("目录匹配", identity),
          metric("字符数", count),
          metric("token 数", "未测量"),
        ],
        bars: [
          bar("上下文字符数", count, v.budget),
          bar("允许字符数", v.budget),
        ],
        columns: ["边界", "值"],
        rows: [
          ["带引号的元数据", "name: " + JSON.stringify(v.name)],
          ["发现信息", discovery],
          ["上下文", context],
          [
            "资源",
            safe
              ? "词法上为相对路径；仍须检查文件系统"
              : "已拒绝",
          ],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-skill-validator-1",
    Object.assign(
      {
        title: "解析明确的 frontmatter 子集",
        steps: [
          {
            label: "头部边界",
            detail:
              "安装器输出带引号的元数据。接受普通单行标量和兼容 JSON 的双引号标量，包括转义引号和 Unicode。拒绝标签、别名和多行 YAML，不悄悄重新解释它们。",
          },
          {
            label: "拆分键",
            detail:
              'description: "Check \\"replicas\\" first"\n解析后的 description: Check "replicas" first\ndescription: | -> 不支持的语法',
          },
          {
            label: "重复键检查",
            detail:
              "在头部行的第一个冒号处分割。验证元数据前解码带引号的值；重复键视为冲突。",
          },
        ],
        caption:
          "兼容标准的子集为什么需要明确的不支持语法错误？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-validator-2",
    Object.assign(
      {
        title: "验证名称和描述",
        steps: [
          {
            label: "读取字段",
            detail:
              "元数据标识一个包。含大写字母的 Orchard-release 不符合可移植的小写语法；orchard-release 若放在名称不同的目录中，则无法通过身份验证。",
          },
          {
            label: "名称语法",
            detail:
              "directory=orchard-release\nname=orchard-release -> 有效\nname=orchard--release -> 名称无效",
          },
          {
            label: "目录身份",
            detail:
              "按契约统计名称字节数和描述的 Unicode 标量值数。解析后保留人读描述。",
          },
        ],
        caption:
          "为什么改变目录名称时也需要改变元数据？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-validator-3",
    Object.assign(
      {
        title: "约束资源路径范围",
        steps: [
          {
            label: "相对路径输入",
            detail:
              "资源查找以 skill 目录为基准。解析 references/restore.md，验证规范路径仍在该目录内；读取任何内容前先拒绝父目录穿越。",
          },
          {
            label: "路径分量检查",
            detail:
              "资源 references/restore.md -> 范围内文件\n资源 ../private.md -> 无效路径分量\n指向根目录外的符号链接 -> 越界",
          },
          {
            label: "规范化路径",
            detail:
              "拼接前验证路径分量，再规范化路径。此教学加载器不防范恶意路径替换竞态。",
          },
        ],
        caption:
          "为什么对原始路径文本使用 starts_with 不足以检查范围？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-validator-4",
    Object.assign(
      {
        title: "在字符预算内加载上下文",
        steps: [
          {
            label: "发现元数据",
            detail:
              "发现阶段只加载元数据；激活时追加指令。若完整上下文能容纳，CLI 随后可以追加一个明确的参考资源。统计字符，不是字节或模型 token，绝不把指令截断一半。",
          },
          {
            label: "选择是否激活",
            detail:
              "元数据长度=80；正文=120；分隔符=2\n激活需要 202 个字符\n预算 200 -> Limit",
          },
          {
            label: "统计字符",
            detail:
              "先组装完整上下文，再比较字符数与预算。包含分隔符和请求的资源文本。",
          },
        ],
        caption:
          "如何提供基于分词器的预算，而不与此字符限制混淆？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
