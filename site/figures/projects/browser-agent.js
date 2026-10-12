(function () {
  "use strict";
  const controls = [
    {
      key: "name",
      label: "姓名已填写（0/1）",
      type: "range",
      value: 0,
      min: 0,
      max: 1,
      step: 1,
    },
    {
      key: "email",
      label: "邮箱已填写（0/1）",
      type: "range",
      value: 0,
      min: 0,
      max: 1,
      step: 1,
    },
    {
      key: "budget",
      label: "观察次数预算",
      type: "range",
      value: 4,
      min: 1,
      max: 8,
      step: 1,
    },
    {
      key: "green",
      label: "每万像素中的绿色像素数",
      type: "range",
      value: 100,
      min: 0,
      max: 10000,
      step: 1,
    },
    { key: "origin", label: "来源域已改变", type: "checkbox", value: false },
    {
      key: "dangerous",
      label: "提交按钮标记为危险",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    const fills = 2 - v.name - v.email,
      observations = fills + 2;
    const safe = !v.origin && !v.dangerous;
    const state = !safe
      ? "blocked"
      : v.budget < observations
        ? "budget-exhausted"
        : v.green > 5
          ? "complete"
          : "visual-mismatch";
    return {
      summary:
        ({ blocked: "已阻止", "budget-exhausted": "预算耗尽", complete: "已完成", "visual-mismatch": "视觉不匹配" }[state]) +
        "；完成需要字段值、允许的来源域、DOM 成功标志和 fixture 像素信号。",
      metrics: [
        { label: "所需观察次数", value: observations },
        { label: "绿色像素比例", value: v.green / 10000 },
      ],
      bars: [
        { label: "填写操作", value: fills, max: 4 },
        { label: "提交与验证", value: 2, max: 4 },
        { label: "可用观察次数", value: v.budget, max: 8 },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-browser-agent-1",
    Object.assign(
      {
        title: "将 DOM 状态转成受约束的操作",
        steps: [
          { label: "输入契约", detail: "parseObservation, choose" },
          {
            label: "将 DOM 状态转成受约束的操作",
            detail:
              "从小表单读取标签、值、禁用状态和稳定 ID。验证 ID 唯一性和字段类型。每次只选一个操作：填写姓名、填写邮箱，再点击唯一标识的 Save request 按钮。页面文字绝不当作指令执行。字段缺失、标签歧义、危险按钮或意外来源域都会明确返回 blocked。",
          },
          {
            label: "观察结果",
            detail:
              "操作联合类型只包含 fill 和 click；注入的页面文字没有执行路径。",
          },
        ],
        caption: "继续前进，在下一次产生副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-browser-agent-2",
    Object.assign(
      {
        title: "完成、停滞或预算耗尽时停止",
        steps: [
          { label: "输入契约", detail: "runAgent, FixtureDriver" },
          {
            label: "完成、停滞或预算耗尽时停止",
            detail:
              "每次操作后都观察。状态重复、策略阻止操作或步骤预算耗尽时停止。完成既需要 DOM 成功标志，也需要独立的截图检查。执行前记录每个选中操作的轨迹。fixture 后端明确是模拟器，只提供确定性观察来测试循环，不代表浏览器覆盖。",
          },
          {
            label: "观察结果",
            detail:
              "成功运行会记录 name、email、submit 和 done。驱动无响应时以 stalled 停止，而不是一直点击。",
          },
        ],
        caption: "继续前进，在下一次产生副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-browser-agent-3",
    Object.assign(
      {
        title: "用 Python 验证截图像素",
        steps: [
          { label: "输入契约", detail: "inspectPNG" },
          {
            label: "用 Python 验证截图像素",
            detail:
              "读取 PNG 签名、块长度和 CRC，再解压大小受限的图像载荷。还原 PNG 行滤波并统计表示成功的绿色像素。将视觉信号与 DOM 标志结合；单独任何一个都不够。这只是针对所编写 fixture 的像素状态检测器，不是 OCR 或通用视觉。损坏、超大、隔行或不支持的颜色格式都会明确失败。",
          },
          {
            label: "观察结果",
            detail:
              "绿色 4x4 fixture 得分为 1.0，红色 fixture 为零；真实浏览器截图通常只有较小的正值成功像素比例。",
          },
        ],
        caption: "继续前进，在下一次产生副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-browser-agent-4",
    Object.assign(
      {
        title: "驱动真实 fixture 并为运行评分",
        steps: [
          { label: "输入契约", detail: "GstackDriver, scoreRuns" },
          {
            label: "驱动真实 fixture 并为运行评分",
            detail:
              "通过回环地址提供 fixture.html，用 gstack browse 打开。GstackDriver 读取 DOM 观察、按标签填写、点击观察到的按钮，并截取真实截图。命令使用参数数组，不经过 shell。加 --live 运行同一受限策略，与 fixture 后端的轨迹比较。模拟运行与真实浏览器运行的完成得分分开记录。",
          },
          {
            label: "观察结果",
            detail:
              "启动 `python3 -m http.server 8877 --bind 127.0.0.1 --directory projects/browser-agent/solution`，用 `$BROWSE_BIN goto http://127.0.0.1:8877/fixture.html` 打开页面，再运行 `node projects/browser-agent/solution/main.ts --live`。运行会保存 browser-result.png，并报告实际 Chromium 模式。",
          },
        ],
        caption: "继续前进，在下一次产生副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
