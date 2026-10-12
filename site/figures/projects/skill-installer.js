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
    options: options.map((x) => ({ value: x, label: ({ codex: "Codex", claude: "Claude", cursor: "Cursor" })[x] })),
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
        throw Error("请使用逗号分隔的有限数值");
      return n;
    });

  const buildLab = (stage) => ({
    controls: [
      text("name", "技能名称", "orchard-release"),
      text("description", "描述", "Review deployment evidence"),
      text("file", "资源路径", "references/checklist.md"),
      select("agent", "目标 agent", "codex", ["codex", "claude", "cursor"]),
      text("installed", "已安装文件文本", "Check replicas"),
      text("current", "当前本地文件文本", "Check replicas"),
      text("incoming", "新升级文本", "Check replicas and restore"),
      check("digestMatches", "与可信来源摘要匹配", true),
    ],
    calculate(v) {
      const valid =
        /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(v.name) &&
        !v.name.includes("--") &&
        !!v.description.trim() &&
        [...v.description].length <= 1024;
      const safe =
        !!v.file &&
        !v.file.startsWith("/") &&
        !v.file.includes("\\") &&
        !v.file.split("/").some((x) => !x || x === "." || x === "..") &&
        !/^[A-Za-z]:/.test(v.file);
      const conflict = v.installed !== v.current;
      const destination =
        {
          codex: ".agents/skills",
          claude: ".claude/skills",
          cursor: ".cursor/skills",
        }[v.agent] +
        "/" +
        v.name;
      return {
        summary:
          !valid || !safe
            ? "技能包已拒绝"
            : !v.digestMatches
              ? "完整性不匹配"
              : conflict
                ? "升级受阻：保留本地编辑"
                : stage === 2
                  ? "带引号的元数据与校验器兼容"
                  : "技能包可暂存于 " + destination,
        metrics: [
          metric("元数据有效", valid),
          metric("路径在词法上未越界", safe),
          metric("本地编辑冲突", conflict),
        ],
        bars: [
          bar("当前字符数", [...v.current].length),
          bar("升级字符数", [...v.incoming].length),
        ],
        columns: ["字段", "值"],
        rows: [
          ["目标路径", destination],
          ["YAML 名称", "name: " + JSON.stringify(v.name)],
          ["YAML 描述", "description: " + JSON.stringify(v.description)],
          [
            "升级差异",
            v.current === v.incoming
              ? "unchanged"
              : v.current + " -> " + v.incoming,
          ],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-skill-installer-1",
    Object.assign(
      {
        title: "校验可移植技能包",
        steps: [
          {
            label: "输入契约",
            detail:
              "可移植技能包包含元数据和使用相对路径的 UTF-8 文件。将 SKILL.md 作为入口文档，拒绝任何可能越出选定安装根目录的资源名称。原始 Orchard 技能包包含恢复检查清单。",
          },
          {
            label: "校验可移植技能包",
            detail:
              "name=orchard-release\n文件：SKILL.md, references/checklist.md\n../settings.json -> 拒绝",
          },
          {
            label: "观察结果",
            detail:
              "创建目录前校验每个文件路径。.installed.json 留给安装器凭据使用。",
          },
        ],
        caption:
          "即使当前机器使用正斜杠路径，为什么也必须拒绝 Windows 反斜杠？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-installer-2",
    Object.assign(
      {
        title: "转换元数据并计算内容哈希",
        steps: [
          {
            label: "输入契约",
            detail:
              "将 name 和 description 序列化为兼容 JSON 的双引号 YAML 标量。Rust 校验器接受相同子集，包括转义。转换会重写元数据，因此来源摘要与转换后摘要不同。",
          },
          {
            label: "转换元数据并计算内容哈希",
            detail:
              '来源技能包摘要 -> 预期来源标识\n转换后的 SKILL.md：name: "orchard-release"\n转换后摘要 -> 已安装内容标识',
          },
          {
            label: "观察结果",
            detail:
              "哈希前先排序文件条目。摘要用于将内容与可信预期比对；从不可信字节计算摘要并不能证明发布者身份。",
          },
        ],
        caption:
          "含引号的描述应如何通过安装器与校验器之间的往返转换？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-installer-3",
    Object.assign(
      {
        title: "在根目录内原子安装",
        steps: [
          {
            label: "输入契约",
            detail:
              "安装到调用方拥有的临时根目录。安装器先将所有文件写入私有同级目录，技能包完整后才重命名到 agent 发现路径。",
          },
          {
            label: "在根目录内原子安装",
            detail:
              "root/.agents/skills/orchard-release/\nSKILL.md + references/checklist.md + .installed.json",
          },
          {
            label: "观察结果",
            detail:
              "暂存前检查父目录是否为符号链接。agent 目录映射与可移植技能内容分开管理。",
          },
        ],
        caption:
          "重命名前写入失败，读取者应看到什么？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-installer-4",
    Object.assign(
      {
        title: "升级时保护本地编辑",
        steps: [
          {
            label: "输入契约",
            detail:
              "升级必须保留本地编辑。将当前文件与上次安装摘要比较，拒绝已修改或不受管理的文件。演示修改检查清单后重试安装，编辑内容仍被保留。",
          },
          {
            label: "升级时保护本地编辑",
            detail:
              "已安装清单哈希=A\n本地编辑 -> 当前哈希=B\n升级 -> 检测到安装内容已修改；本地文本保留",
          },
          {
            label: "观察结果",
            detail:
              "移动目标目录前读取现有凭据并核验文件列表。最终重命名失败时恢复已移走的备份。",
          },
        ],
        caption:
          "替换本地编辑过的清单前，可审查的合并需要展示什么？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
