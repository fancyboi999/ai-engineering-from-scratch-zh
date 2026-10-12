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
      text(
        "file",
        "工作区文件文本",
        "def total(price, quantity): return price + quantity",
      ),
      text("old", "确切的旧表达式", "price + quantity"),
      text("replacement", "拟替换内容", "price * quantity"),
      text("failure", "观察到的测试输出", "AssertionError: 10 != 21"),
      text("marker", "提案失败标记", "AssertionError"),
      number("used", "已用操作次数", 1, 0, 6),
      number("budget", "操作预算", 4, 1, 6),
      number("price", "测试单价", 7, 0, 20),
      number("quantity", "测试数量", 3, 0, 10),
    ],
    calculate(v) {
      const count = v.old ? v.file.split(v.old).length - 1 : 0,
        observed = v.failure.includes(v.marker) && !!v.marker,
        allowed = count === 1 && observed && v.used < v.budget;
      const before = v.price + v.quantity,
        expected = v.price * v.quantity;
      const multiply = v.replacement === "price * quantity";
      return {
        summary:
          v.used >= v.budget
            ? "预算已耗尽"
            : !observed
              ? "规划器弃权：未找到标记"
              : count !== 1
                ? "补丁前置条件不满足：" + count + " 处匹配"
                : allowed
                  ? "应用确切提案，然后重新运行真实测试"
                  : "已拒绝",
        metrics: [
          metric("确切匹配数", count),
          metric("观察到的失败是否匹配", observed),
          metric("预期测试值", expected),
          metric(
            "提案预测值",
            multiply ? expected : "未解释执行",
          ),
        ],
        bars: [
          bar("错误加法输出", before),
          bar("预期乘积", expected),
        ],
        columns: ["观察", "状态"],
        rows: [
          [
            "修改前测试",
            before === expected ? "固定用例碰巧通过" : "失败",
          ],
          ["补丁", allowed ? "符合条件" : "已阻止"],
          ["修改后测试", "必须执行；预测不是证据"],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-tiny-coding-agent-1",
    Object.assign(
      {
        title: "将文件工具限制在工作区内",
        steps: [
          {
            label: "相对路径",
            detail:
              "Orchard 购物篮修复在可信 Python 工作区的可丢弃副本中运行。打开任何请求文件前，先在该根目录下解析路径。路径可能看似位于本地，但符号链接会将它重定向到工作区外。",
          },
          {
            label: "解析",
            detail:
              "basket.py -> 范围内的已有文件\n../basket.py -> 拒绝\n指向外部文件的符号链接 -> 拒绝",
          },
          {
            label: "范围限制",
            detail:
              "比较解析后的路径组件，而不是字符串前缀。工作区由调用方选择；模型响应不得选择新的根目录。",
          },
        ],
        caption:
          "为什么复制可信仓库并不会让其测试变成沙箱代码？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tiny-coding-agent-2",
    Object.assign(
      {
        title: "按前置条件应用精确补丁",
        steps: [
          {
            label: "前置条件",
            detail:
              "补丁明确声明要替换的内容。错误的购物篮函数没有将单价与数量相乘，而是返回 price + quantity。只有该表达式恰好出现一次时才替换。",
          },
          {
            label: "替换",
            detail:
              "旧内容：price + quantity\n新内容：price * quantity\n出现次数=1 -> 写入；出现次数=0 或 2 -> 拒绝",
          },
          {
            label: "原子写入",
            detail:
              "打开临时输出文件前统计确切匹配次数。替换原文件时保留文件权限。",
          },
        ],
        caption:
          "规划器提出补丁后，另一位编辑者修复了文件，此时应该怎样处理？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tiny-coding-agent-3",
    Object.assign(
      {
        title: "通过唯一允许的命令运行真实测试",
        steps: [
          {
            label: "参数数组",
            detail:
              "声称修复前先运行实际 unittest 套件。在原始购物篮示例中，total(7,3) 返回 10 而非 21；total(7,0) 返回 7 而非 0。应用补丁后，两项失败都应消失。",
          },
          {
            label: "超时",
            detail:
              "修改前：2 条断言失败\n修改后：实际执行 2 项测试，OK\n零测试或存在跳过的测试 -> 不算成功",
          },
          {
            label: "证据",
            detail:
              "从 stderr 读取最终 unittest 摘要，要求实际执行测试数大于零。在 POSIX 上，测试到期时停止整个进程组。",
          },
        ],
        caption:
          '为什么打印出来的 "Ran 999 tests" 行不能算作测试证据？',
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tiny-coding-agent-4",
    Object.assign(
      {
        title: "按证据或预算停止编码循环",
        steps: [
          {
            label: "操作",
            detail:
              "规划器现在接收每次观察。它先测试，只有出现对应失败标记时才选择给定的精确修复，然后再次测试。这个透明的规则规划器不声称通过模型创造代码。",
          },
          {
            label: "观察",
            detail:
              "测试 -> AssertionError\n提案标记匹配 -> 应用补丁\n测试 -> OK -> completed（已完成）",
          },
          {
            label: "停止",
            detail:
              "每次工具返回结果后再次调用规划器。将请求操作与每次观察一起保留，在弃权或步数耗尽时停止。",
          },
        ],
        caption:
          "如何接入模型，同时保留相同的补丁前置条件与完成规则？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
