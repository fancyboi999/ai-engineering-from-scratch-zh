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
      text("command", "拟执行的操作", "search Restore\trelease.md"),
      text(
        "content",
        "release.md 文本",
        "Orchard release. Restore evidence verified.",
      ),
      number("used", "已用操作次数", 1, 0, 10),
      number("limit", "操作次数上限", 3, 1, 10),
      number("byteLimit", "文件字节预算", 64, 1, 200),
    ],
    calculate(v) {
      const match = v.command.match(
        /^(help|pwd|quit|list|read|search)(?: (.*))?$/,
      );
      let reason = "accepted",
        result = "";
      const bytes = new TextEncoder().encode(v.content).length;
      const args = match?.[2] || "";
      let file = args,
        pattern = "";
      if (match?.[1] === "search") {
        const p = args.split("\t");
        pattern = p[0];
        file = p[1] || "";
        if (p.length !== 2 || !pattern || !file)
          reason = "search needs pattern<TAB>path";
      }
      if (!match) reason = "unsupported grammar";
      else if (v.used >= v.limit) reason = "budget exhausted";
      else if (file.startsWith("/") || file.split("/").includes(".."))
        reason = "path rejected";
      else if (["read", "search"].includes(match[1]) && bytes > v.byteLimit)
        reason = "file budget exceeded";
      if (reason === "accepted")
        result =
          match[1] === "search"
            ? v.content.includes(pattern)
              ? "1:" + v.content
              : "no match"
            : match[1] === "read"
              ? v.content
              : match[1] === "quit"
                ? "session closed"
                : match[1];
      const reasonLabel = { accepted: "已接受", "search needs pattern<TAB>path": "search 需要 pattern<TAB>path", "unsupported grammar": "不支持的语法", "budget exhausted": "预算已耗尽", "path rejected": "路径已拒绝", "file budget exceeded": "超出文件预算" }[reason];
      const resultLabel = reason === "accepted" && match[1] === "quit"
        ? "会话已关闭"
        : reason === "accepted" && match[1] === "search" && !v.content.includes(pattern)
          ? "未匹配"
          : result;
      return {
        summary: reasonLabel + (resultLabel ? ": " + resultLabel : ""),
        metrics: [
          metric("输入字节数", new TextEncoder().encode(v.command).length),
          metric("文件字节数", bytes),
          metric("下一序号", Math.min(v.used + 1, v.limit)),
          metric("路径模型", "这里只做词法检查；运行时还会规范化路径"),
        ],
        bars: [
          bar("已用操作次数", v.used, v.limit),
          bar("操作次数上限", v.limit),
          bar("文件字节数", bytes, v.byteLimit),
        ],
        columns: ["边界", "值"],
        rows: [
          ["语法", match?.[1] || "已拒绝"],
          ["路径", file],
          ["结果", resultLabel || reasonLabel],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-rust-agent-shell-1",
    Object.assign(
      {
        title: "解析刻意精简的操作语言",
        steps: [
          {
            label: "校验输入",
            detail:
              "Rust 进程接受一套刻意精简的工具语言。Python 适配器接受包含调用方 ID 和工具参数的 JSONL，只转换已知命令。任何参数都不会变成操作系统 shell 命令。",
          },
          {
            label: "落实边界检查",
            detail:
              '{"id":"evidence","tool":"search","arguments":{"pattern":"Restore","path":"release.md"}}\n传输命令：search Restore<TAB>release.md',
          },
          {
            label: "检查输出",
            detail:
              "拒绝适配器参数中的控制字符，防止路径注入第二条命令。区分解析拒绝与执行失败。",
          },
        ],
        caption:
          "为什么必须在 stdin 序列化前拒绝调用方路径中的换行字符？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rust-agent-shell-2",
    Object.assign(
      {
        title: "将文件工具限制在指定根目录内",
        steps: [
          {
            label: "校验输入",
            detail:
              "读取 release.md 前，先在工作区根目录下解析路径。路径字面上可能看似无害，但符号链接会指向工作区外的文件。这提供的是应用级范围限制，不是进程沙箱。",
          },
          {
            label: "落实边界检查",
            detail:
              "工作区：workspace=/work/orchard\nrelease.md -> /work/orchard/release.md -> 允许\nlink.md -> /outside/credentials -> 拒绝",
          },
          {
            label: "检查输出",
            detail:
              "规范化根目录与目标路径，再比较路径组件。除初始元数据长度外，也限制实际读取字节数。",
          },
        ],
        caption:
          "如果另一个进程在路径规范化后替换该路径，还会留下哪种竞态？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rust-agent-shell-3",
    Object.assign(
      {
        title: "跟踪预算与终止状态",
        steps: [
          {
            label: "校验输入",
            detail:
              "会话维护请求预算与终止状态。无效请求也消耗一次尝试。通过可执行文件参数和适配器 --limit 暴露预算，让调用方能推断工作上限。",
          },
          {
            label: "落实边界检查",
            detail:
              "limit=2\n请求 1：list -> 步骤 1\n请求 2：语法被拒绝 -> 步骤 2\n请求 3 -> 终止状态 budget_exhausted",
          },
          {
            label: "检查输出",
            detail:
              "每收到一个请求，在派发前递增一次计数。会话关闭后不得再读取文件。",
          },
        ],
        caption:
          "若输出在请求 ID 收到事件前就结束，客户端该如何处理？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rust-agent-shell-4",
    Object.assign(
      {
        title: "通过真实 stdin 流式传递受限 JSON 事件",
        steps: [
          {
            label: "校验输入",
            detail:
              "客户端逐条读取 JSON 事件，并与适配器添加的请求 ID 匹配。逐行刷新输出，让 UI 无需等待进程退出就能显示观察结果。",
          },
          {
            label: "落实边界检查",
            detail:
              "请求 evidence -> {request_id:evidence, seq:2, kind:ok}\n输出：2:Restore evidence: rehearsal completed at 09:20 UTC.",
          },
          {
            label: "检查输出",
            detail:
              "构造命令字符串前，用 BufRead 分块读取来限制内存分配。对工具输出做 JSON 转义，不拼接原始文件文本。",
          },
        ],
        caption: "文件中含有引号、制表符或换行时会发生什么？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
