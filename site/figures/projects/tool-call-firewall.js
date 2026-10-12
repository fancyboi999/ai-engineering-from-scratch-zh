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
    options: options.map((x) => ({ value: x, label: ({ reader: "读取者（reader）", editor: "编辑者（editor）", unknown: "未知（unknown）", read: "读取（read）", write: "写入（write）", shell: "shell 命令" })[x] })),
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
      select("role", "可信角色", "editor", ["reader", "editor", "unknown"]),
      select("tool", "请求的工具", "write", ["read", "write", "shell"]),
      text("path", "相对路径", "notes.md"),
      text("approvedText", "已批准内容", "Release after restore"),
      text("content", "候选内容", "Release after restore"),
      check("approved", "存在批准回执", true),
      check("used", "回执已使用", false),
      number("entries", "审计条目数", 1, 0, 10),
      number("cap", "审计容量", 4, 1, 10),
    ],
    calculate(v) {
      const safe =
        !!v.path &&
        !v.path.startsWith(".") &&
        !v.path.startsWith("/") &&
        !v.path.includes("\\") &&
        v.path.split("/").every((p) => p && p !== "." && p !== "..");
      const policy =
        !["reader", "editor"].includes(v.role) || !safe
          ? "Deny"
          : v.tool === "read"
            ? "Allow"
            : v.role === "editor" && v.tool === "write"
              ? "ApprovalRequired"
              : "Deny";
      const authorized =
        policy === "Allow" ||
        (policy === "ApprovalRequired" &&
          v.approved &&
          !v.used &&
          v.approvedText === v.content);
      const result =
        v.entries >= v.cap
          ? "审计容量已满"
          : policy === "Deny"
            ? "策略拒绝"
            : !authorized
              ? "批准缺失、内容改变或回执已消耗"
              : "可进入规范路径范围检查与分派";
      return {
        summary: result,
        metrics: [
          metric("策略", ({ Deny: "拒绝（Deny）", Allow: "允许（Allow）", ApprovalRequired: "需要批准（ApprovalRequired）" })[policy]),
          metric("载荷匹配", v.approvedText === v.content),
          metric("可授权", authorized),
          metric(
            "写入后",
            authorized && v.tool === "write" ? "used=true" : "未消耗",
          ),
        ],
        bars: [
          bar("审计条目数", v.entries, v.cap),
          bar("审计容量", v.cap),
        ],
        columns: ["边界", "结果"],
        rows: [
          ["身份", ({ reader: "读取者（reader）", editor: "编辑者（editor）", unknown: "未知（unknown）" })[v.role] || v.role],
          ["词法路径", safe],
          ["批准重放", v.used ? "已拒绝" : "未消耗"],
          ["实际文件系统", "由原生分派检查"],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-tool-call-firewall-1",
    Object.assign(
      {
        title: "验证无歧义的调用封装",
        steps: [
          {
            label: "字节预算",
            detail:
              "调用应用提供身份；模型只提供候选操作。紧凑的 Rust 封装携带稳定请求 ID、角色、工具和相对路径参数，不含歧义分隔符或控制字符。",
          },
          {
            label: "封装字段",
            detail:
              "r1|reader|read|notes.md -> 类型化请求\nr1|reader|read|notes.md|extra -> 拒绝",
          },
          {
            label: "控制字符检查",
            detail:
              "策略评估前验证整个大小受限的封装。在 CLI 中，trusted-role 是操作者参数，不是从模型文本接受的字段。",
          },
        ],
        caption:
          "如果模型能将 reader 替换成 editor，会破坏什么？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tool-call-firewall-2",
    Object.assign(
      {
        title: "评估角色与路径策略",
        steps: [
          {
            label: "已知角色",
            detail:
              "策略拒绝未知角色、不支持的工具和不安全路径分量。reader 可读取范围内笔记；editor 写入需要批准。词法检查允许后，分派时仍要检查实际文件系统范围。",
          },
          {
            label: "路径分量",
            detail:
              "reader + read notes.md -> Allow\nreader + write notes.md -> Deny\neditor + write notes.md -> ApprovalRequired",
          },
          {
            label: "工具权限",
            detail:
              "将 Deny 设为默认分支。实际访问文件前检查规范路径；不要把策略判定当作操作系统隔离。",
          },
        ],
        caption:
          "为什么符号链接的相对名称不含父目录分量，也可能越界？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tool-call-firewall-3",
    Object.assign(
      {
        title: "仅消耗一次绑定请求的批准",
        steps: [
          {
            label: "决定检查",
            detail:
              "真实文件分派器将批准绑定到类型化请求及写入内容。写入前消耗回执。载荷改变或重放都会失败，不能再次写入。",
          },
          {
            label: "匹配身份",
            detail:
              '已批准内容="approved after restore"\n内容改变 -> Conflict，文件不变\n内容相同 -> 写入，used=true\n重放 -> Conflict',
          },
          {
            label: "检查未使用状态",
            detail:
              "消耗批准前验证载荷大小和实际路径范围。单次使用回执与分派应处于同一可信应用边界。",
          },
        ],
        caption:
          "允许跨进程重启复用批准之前，需要怎样的持久回执存储？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tool-call-firewall-4",
    Object.assign(
      {
        title: "记录有容量限制的审计证据",
        steps: [
          {
            label: "唯一调用",
            detail:
              "紧凑审计记录结果，不复制文件内容。可执行程序返回请求 ID、相对路径参数、决定、输出，以及批准是否被消耗、重放是否被拒绝。整合时将请求身份与应用结果一并记录。",
          },
          {
            label: "容量检查",
            detail:
              "请求 r1 -> 一条策略记录\n文件写入成功 -> approval_consumed=true\n第二次分派 -> replay_denied=true",
          },
          {
            label: "省略参数",
            detail:
              "追加前拒绝重复审计 ID 和已满日志。此有容量限制的内存审计不是持久、防篡改日志。",
          },
        ],
        caption:
          "你会对哪些非机密字段做哈希，以关联持久批准回执和执行结果？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
