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
      check("untrusted", "不可信代码", true),
      check("secrets", "存有机密的宿主", true),
      check("network", "要求禁止网络", true),
      check("kernel", "要求独立内核", false),
      number("budget", "模型成本预算", 3, 1, 5),
      check("observedReadOnly", "探测：根目录写入被拒绝", true),
      check("observedNoRoute", "探测：没有默认路由", false),
    ],
    calculate(v) {
      const profileLabel = { process: "进程", filesystem: "文件系统", container: "容器", microvm: "microVM" };
      const p = [
        ["process", false, false, false, 1],
        ["filesystem", true, false, false, 2],
        ["container", true, true, false, 3],
        ["microvm", true, true, true, 5],
      ];
      const rows = p.map((x) => [
        ...x,
        (!(v.untrusted || v.secrets) || x[1]) &&
          (!v.network || x[2]) &&
          (!v.kernel || x[3]),
      ]);
      const chosen = rows.find((x) => x[5] && x[4] <= v.budget);
      return {
        summary:
          stage === 4
            ? "观察到的探测结果：" +
              (v.observedReadOnly && v.observedNoRoute
                ? "两项检查通过；抗逃逸能力未证实"
                : "未同时观察到所要求的两项控制")
            : chosen
              ? "成本最低的充分模型：" + profileLabel[chosen[0]]
              : "预算内没有充分模型",
        metrics: [
          metric("选择结果", profileLabel[chosen?.[0]] || "无"),
          metric(
            "操作系统强制执行",
            stage === 4 ? "仅为探测输入" : "未证实",
          ),
          metric("内核要求", v.kernel),
        ],
        bars: rows.map((x) => bar(profileLabel[x[0]] + " 成本", x[4], 5)),
        columns: [
          "配置档",
          "文件系统",
          "禁止网络",
          "独立内核",
          "成本",
          "满足要求",
        ],
        rows: rows.map(([id, ...values]) => [profileLabel[id], ...values]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-sandbox-ladder-1",
    Object.assign(
      {
        title: "解析能力请求",
        steps: [
          {
            label: "解析键",
            detail:
              "选择运行时前，先将威胁防护要求写成布尔值。这里 network=true 表示要求禁止网络，host_kernel=true 表示要求独立内核。这两个名称都不授予访问权限。",
          },
          {
            label: "拒绝重复项",
            detail:
              "untrusted=true,secrets=true,network=true,host_kernel=false\n要求：文件系统边界 + 禁止网络",
          },
          {
            label: "精确布尔值",
            detail:
              "拒绝重复键以及非精确 true/false 的值。不要猜测 network=yes 的含义。",
          },
        ],
        caption:
          "增加哪项要求会让共享内核的容器不再满足条件？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-sandbox-ladder-2",
    Object.assign(
      {
        title: "定义控制配置模型",
        steps: [
          {
            label: "文件系统控制",
            detail:
              "配置档描述建模的能力，成本仅作示例。在此模型中，进程边界没有文件系统或网络隔离；容器配置模拟两种隔离，但与宿主共享内核。",
          },
          {
            label: "网络控制",
            detail:
              "process: filesystem=false, network=false, kernel=false\ncontainer: filesystem=true, network=true, kernel=false",
          },
          {
            label: "内核控制",
            detail:
              "分别测试各项要求。缺少任何必需能力时，低成本也没有意义。",
          },
        ],
        caption:
          "为什么模型不能证明正在运行的容器具备这些设置？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-sandbox-ladder-3",
    Object.assign(
      {
        title: "选择成本最低的充分配置",
        steps: [
          {
            label: "筛选控制能力",
            detail:
              "最便宜的充分配置也可能超出预算。要求内核分离时，预算为 4 不能悄悄降级为成本为 3 的容器。",
          },
          {
            label: "应用预算",
            detail:
              "要求内核分离；候选成本为 1,2,3,5\n预算 4 -> 没有充分配置\n预算 5 -> microvm-fixture",
          },
          {
            label: "稳定选择最小值",
            detail:
              "先按能力筛选，再按成本和稳定名称顺序选择。剩余集合为空时返回限制错误。",
          },
        ],
        caption:
          "两个充分配置的模型成本相同时，选择规则应如何处理？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-sandbox-ladder-4",
    Object.assign(
      {
        title: "报告残余假设",
        steps: [
          {
            label: "重新检查要求",
            detail:
              "可选 Docker 适配器生成可检查的参数列表，只运行调用者选定且本地已存在的镜像。无害探测检查根目录写入被拒绝和默认路由缺失。这里不包含 microVM 实现。",
          },
          {
            label: "明确模型名称",
            detail:
              "--docker-image alpine:local -> 命令预览\n--execute -> docker_probe 及观察到的 stdout\n共享宿主内核仍是残余风险",
          },
          {
            label: "列出残余风险",
            detail:
              "区分 policy_simulation 与 docker_probe 的结果。成功探测只能证明对应检查，不能证明能防止容器逃逸。",
          },
        ],
        caption:
          "如果 root_write 变为允许，你会先检查哪个运行时设置？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
