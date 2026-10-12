(function () {
  "use strict";
  const controls = [
    {
      key: "x",
      label: "截图 x 坐标",
      type: "range",
      value: 200,
      min: 0,
      max: 640,
      step: 1,
    },
    {
      key: "y",
      label: "截图 y 坐标",
      type: "range",
      value: 100,
      min: 0,
      max: 400,
      step: 1,
    },
    {
      key: "scale",
      label: "显示缩放比例",
      type: "range",
      value: 2,
      min: 1,
      max: 4,
      step: 0.5,
    },
    {
      key: "captured",
      label: "已捕获的版本代数",
      type: "range",
      value: 2,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "current",
      label: "要求的版本代数",
      type: "range",
      value: 2,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "calls",
      label: "已消耗的调用次数",
      type: "range",
      value: 4,
      min: 0,
      max: 8,
      step: 1,
    },
  ];
  const calculate = function (v, stepIndex) {
    const valid = v.x < 640 && v.y < 400,
      stale = v.captured !== v.current;
    return {
      summary: !valid
        ? "拒绝帧范围外的坐标点"
        : stale
          ? "拒绝过期观察"
          : v.calls >= 8
            ? "拒绝操作预算已耗尽的请求"
            : "允许使用换算后的逻辑坐标点击",
      metrics: [
        { label: "逻辑 x 坐标", value: Math.floor(v.x / v.scale) },
        { label: "逻辑 y 坐标", value: Math.floor(v.y / v.scale) },
        { label: "版本代数一致", value: !stale },
      ],
      bars: [
        { label: "已消耗调用", value: v.calls, max: 8 },
        { label: "剩余调用", value: 8 - v.calls, max: 8 },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-desktop-control-1",
    Object.assign(
      {
        title: "校验帧与坐标空间",
        steps: [
          {
            label: "校验输入",
            detail: "Frame.validate, Frame.logical_point",
          },
          {
            label: "落实边界检查",
            detail:
              "截图尺寸使用物理像素，而原生桌面点击可能使用逻辑坐标。先校验尺寸为正且在范围内、缩放比例为有限数，再拒绝帧外坐标点，最后用向下取整的除法换算。帧的版本代数标明操作依据的是哪次观察。",
          },
          {
            label: "检查输出",
            detail:
              "在两倍缩放的显示器上，像素点 200,100 对应逻辑点 100,50；恰好落在右边界的点会被拒绝。",
          },
        ],
        caption: "在产生副作用之前拒绝无效输入。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-desktop-control-2",
    Object.assign(
      {
        title: "渲染并操作固定测试场景",
        steps: [
          { label: "校验输入", detail: "Backend, FixtureBackend" },
          {
            label: "落实边界检查",
            detail:
              "用同一个 Backend trait 封装 capture、click 和 type_text。固定测试场景根据状态绘制真实的 PPM 图像：文本框、提交区域，以及完成后的绿色场景。点击文本框会改变焦点，输入文字需要焦点，只有已有文本时点击提交才会完成。这样无需控制用户桌面，就能复现状态转移错误。",
          },
          {
            label: "检查输出",
            detail:
              "最终 PPM 是真实渲染的产物。测试场景完成只能证明后端逻辑，不能证明原生操作系统控制能力。",
          },
        ],
        caption: "在产生副作用之前拒绝无效输入。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-desktop-control-3",
    Object.assign(
      {
        title: "拒绝过期观察与预算耗尽后的操作",
        steps: [
          {
            label: "校验输入",
            detail:
              "Controller.capture, Controller.click, Controller.type_text",
          },
          {
            label: "落实边界检查",
            detail:
              "在后端外包一层 Controller。每次后端调用前预留操作预算，点击前必须有捕获的帧，状态变更后使该帧失效。版本代数过期必须在点击前报错。记录成功操作的轨迹；即使后端返回错误，也要计入尝试过的后端调用。",
          },
          {
            label: "检查输出",
            detail:
              "第二次点击不能复用第一次点击前的截图。调用方必须先捕获变化后的场景。",
          },
        ],
        caption: "在产生副作用之前拒绝无效输入。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-desktop-control-4",
    Object.assign(
      {
        title: "构建显式启用的原生边界",
        steps: [
          {
            label: "校验输入",
            detail: "click_argv, text_argv, png_dimensions, MacBackend",
          },
          {
            label: "落实边界检查",
            detail:
              "不经过 shell，直接构造 macOS screencapture 和 AppleScript 参数数组。将待输入文字作为参数传递，绝不作为可执行脚本内容。从原生截图头部读取 PNG 尺寸，保留实际图像载荷。默认演示仍使用固定测试场景。原生捕获需要显式 --native-capture 标志、操作系统权限；显示器有缩放时，还需调用方提供 DESKTOP_SCALE。原生点击和输入是库方法，不是演示自动执行的操作。",
          },
          {
            label: "检查输出",
            detail:
              "测试验证原生参数构造和图像元数据解析。固定场景测试套件明确没有验证原生 macOS 执行；只对可丢弃的测试应用使用它。",
          },
        ],
        caption: "在产生副作用之前拒绝无效输入。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
