(function () {
  "use strict";
  const hex = (n) => (n < 0 ? "-0x" + (-n).toString(16) : "0x" + n.toString(16));
  const REG64 = ["rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi", "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15"];
  const REG32 = ["eax", "ecx", "edx", "ebx", "esp", "ebp", "esi", "edi", "r8d", "r9d", "r10d", "r11d", "r12d", "r13d", "r14d", "r15d"];

  function dominatorFacts(nodes, edges, entry) {
    const succ = new Map(nodes.map((n) => [n, []]));
    const pred = new Map(nodes.map((n) => [n, []]));
    edges.forEach(([a, b]) => {
      succ.get(a).push(b);
      pred.get(b).push(a);
    });
    const seen = new Set();
    const post = [];
    const visit = (n) => {
      seen.add(n);
      succ.get(n).forEach((s) => {
        if (!seen.has(s)) visit(s);
      });
      post.push(n);
    };
    visit(entry);
    const order = post.slice().reverse();
    const number = new Map(order.map((n, i) => [n, i]));
    const idom = new Map([[entry, entry]]);
    const intersect = (a, b) => {
      while (a !== b) {
        while (number.get(a) > number.get(b)) a = idom.get(a);
        while (number.get(b) > number.get(a)) b = idom.get(b);
      }
      return a;
    };
    let changed = true;
    let rounds = 0;
    while (changed) {
      changed = false;
      rounds += 1;
      order.slice(1).forEach((n) => {
        const done = pred.get(n).filter((p) => idom.has(p));
        if (!done.length) return;
        let c = done[0];
        done.slice(1).forEach((o) => {
          c = intersect(o, c);
        });
        if (idom.get(n) !== c) {
          idom.set(n, c);
          changed = true;
        }
      });
    }
    const dominates = (d, n) => {
      for (;;) {
        if (n === d) return true;
        const p = idom.get(n);
        if (p === undefined || p === n) return false;
        n = p;
      }
    };
    const df = new Map(order.map((n) => [n, new Set()]));
    order.forEach((n) => {
      const ps = pred.get(n).filter((p) => idom.has(p));
      const root = idom.get(n) === n;
      if (ps.length < 2 && !(root && ps.length)) return;
      ps.forEach((p) => {
        let r = p;
        while (root || r !== idom.get(n)) {
          df.get(r).add(n);
          if (idom.get(r) === r) break;
          r = idom.get(r);
        }
      });
    });
    const back = edges.filter(([a, b]) => idom.has(a) && dominates(b, a));
    return { order, idom, df, back, pred, rounds };
  }

  const elfLab = {
    controls: [
      { key: "base", label: "符号值 S（.rodata 节符号）", type: "range", value: 0, min: 0, max: 64, step: 4 },
      { key: "addend", label: "加数 A", type: "range", value: -4, min: -16, max: 16, step: 1 },
      { key: "field", label: ".text 中的字段偏移 P", type: "range", value: 95, min: 80, max: 120, step: 1 },
      { key: "size", label: "指令末端减 P（字段后的字节数）", type: "range", value: 4, min: 4, max: 8, step: 1 },
      { key: "pcrel", label: "PC 相对记录（R_X86_64_PC32）", type: "checkbox", value: true },
    ],
    calculate(v) {
      const end = v.field + v.size;
      const stored = v.pcrel ? v.base + v.addend - v.field : v.base + v.addend;
      const target = v.pcrel ? stored + end : stored;
      return {
        summary: v.pcrel
          ? "链接编辑器存入 S + A - P。处理器将字段加到指令末端，操作数到达 .rodata+" + hex(target) + "."
          : "绝对记录存入 S + A。操作数为 .rodata+" + hex(target) + "，无需按指令末端修正。",
        formula: v.pcrel ? "target = S + A + (end - P) = " + v.base + " + (" + v.addend + ") + " + v.size + " = " + target : "target = S + A = " + target,
        metrics: [
          { label: "链接后的字段值", value: stored },
          { label: "指令末端", value: hex(end) },
          { label: ".rodata 中的目标偏移", value: hex(target) },
        ],
        columns: ["量", "value"],
        rows: [
          ["P（字段偏移）", hex(v.field)],
          ["指令末端", hex(end)],
          ["S + A", v.base + v.addend],
          ["解析后的目标", ".rodata+" + hex(target)],
        ],
      };
    },
  };

  const decoderLab = {
    controls: [
      { key: "bytes", label: "指令字节（十六进制）", type: "text", value: "48 69 c0 67 66 66 66" },
    ],
    calculate(v) {
      const parts = String(v.bytes).trim().split(/\s+/).filter(Boolean);
      const bytes = parts.map((p) => parseInt(p, 16));
      if (!bytes.length || bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) {
        return { summary: "输入以空格分隔的两位十六进制字节。", metrics: [], rows: [] };
      }
      let i = 0;
      const rows = [];
      const prefixes = [];
      while (i < bytes.length && [0x66, 0x67, 0xf2, 0xf3, 0x2e, 0x3e, 0x26, 0x36, 0x64, 0x65, 0xf0].includes(bytes[i])) {
        prefixes.push(bytes[i]);
        rows.push(["prefix", hex(bytes[i]), bytes[i] === 0x66 ? "操作数宽 16 位" : "传统前缀"]);
        i += 1;
      }
      let rex = 0;
      if (i < bytes.length && bytes[i] >= 0x40 && bytes[i] <= 0x4f) {
        rex = bytes[i];
        rows.push(["REX", hex(rex), "W=" + ((rex >> 3) & 1) + " R=" + ((rex >> 2) & 1) + " X=" + ((rex >> 1) & 1) + " B=" + (rex & 1)]);
        i += 1;
      }
      if (i >= bytes.length) return { summary: "字节在操作码之前结束。解码器抛出注明地址的错误。", rows };
      const two = bytes[i] === 0x0f;
      const opcode = two ? [bytes[i], bytes[i + 1]] : [bytes[i]];
      i += opcode.length;
      rows.push(["opcode", opcode.filter((b) => b !== undefined).map((b) => b.toString(16).padStart(2, "0")).join(" "), two ? "双字节映射" : "单字节映射"]);
      const width = rex & 8 ? 64 : prefixes.includes(0x66) ? 16 : 32;
      const names = width === 64 ? REG64 : REG32;
      const usesModrm = !(opcode[0] >= 0x50 && opcode[0] <= 0x5f) && ![0xc3, 0x90, 0x99, 0xe8, 0xe9, 0xeb].includes(opcode[0]) && !(opcode[0] >= 0x70 && opcode[0] <= 0x7f);
      let length = i;
      if (usesModrm && i < bytes.length) {
        const m = bytes[i];
        const mod = m >> 6;
        const reg = ((m >> 3) & 7) | (rex & 4 ? 8 : 0);
        let rm = (m & 7) | (rex & 1 ? 8 : 0);
        rows.push(["ModRM", hex(m), "mod=" + mod + " reg=" + reg + " (" + names[reg] + ") rm=" + rm]);
        length += 1;
        if (mod !== 3 && (m & 7) === 4) {
          const sib = bytes[length];
          if (sib === undefined) return { summary: "ModRM 要求后接 SIB 字节，但字节缺失。", rows };
          const scale = 1 << (sib >> 6);
          const index = ((sib >> 3) & 7) | (rex & 2 ? 8 : 0);
          const base = (sib & 7) | (rex & 1 ? 8 : 0);
          rows.push(["SIB", hex(sib), "scale=" + scale + " index=" + (index === 4 ? "none" : REG64[index]) + " base=" + REG64[base]]);
          length += 1;
          rm = base;
        }
        const disp = mod === 1 ? 1 : mod === 2 || (mod === 0 && (m & 7) === 5) ? 4 : 0;
        if (disp) {
          rows.push(["displacement", disp + " 字节，偏移为 " + length, mod === 0 && (m & 7) === 5 ? "RIP-relative" : "signed"]);
          length += disp;
        }
        if (mod === 3) rows.push(["r/m 操作数", names[rm], "寄存器形式"]);
      }
      const immediate = Math.max(0, bytes.length - length);
      if (immediate) rows.push(["immediate", immediate + " 字节，偏移为 " + length, "little-endian"]);
      return {
        summary: "操作数宽度 " + width + " 位。REX.W " + (rex & 8 ? "选择" : "不选择") + " 64 位寄存器。",
        metrics: [
          { label: "操作数宽度", value: width },
          { label: "立即数之前的字段长度", value: length },
          { label: "总长度", value: bytes.length },
        ],
        bars: [{ label: "长度（上限 15）", value: Math.min(bytes.length, 15), max: 15 }],
        columns: ["field", "bytes", "含义"],
        rows,
      };
    },
  };

  const graphLab = {
    controls: [
      { key: "back", label: "回边 4 -> 2（循环）", type: "checkbox", value: false },
      { key: "entryLoop", label: "回边 4 -> 1（回到入口的循环）", type: "checkbox", value: false },
      { key: "skip", label: "边 1 -> 4（跳过两臂）", type: "checkbox", value: false },
    ],
    calculate(v) {
      const edges = [[1, 2], [1, 3], [2, 4], [3, 4], [4, 5]];
      if (v.back) edges.push([4, 2]);
      if (v.entryLoop) edges.push([4, 1]);
      if (v.skip) edges.push([1, 4]);
      const facts = dominatorFacts([1, 2, 3, 4, 5], edges, 1);
      const rows = facts.order.map((n) => [n, facts.idom.get(n), [...facts.df.get(n)].sort().join(", ") || "none", facts.pred.get(n).join(", ") || "none"]);
      return {
        summary: facts.back.length ? "回边：" + facts.back.map((e) => e.join(" -> ")).join(", ") + "。目标支配源，因此各边闭合一个自然循环。" : "没有边返回支配节点，因此图中没有循环。",
        metrics: [
          { label: "边数", value: edges.length },
          { label: "回边数", value: facts.back.length },
          { label: "收敛轮数", value: facts.rounds },
        ],
        columns: ["block", "直接支配节点", "支配边界", "前驱"],
        rows,
      };
    },
  };

  const ssaLab = {
    controls: [
      { key: "left", label: "在块 2（then 臂）赋值 x", type: "checkbox", value: true },
      { key: "right", label: "在块 3（else 臂）赋值 x", type: "checkbox", value: false },
      { key: "loop", label: "回边 4 -> 1，并在块 4 赋值 x", type: "checkbox", value: false },
    ],
    calculate(v) {
      const edges = [[1, 2], [1, 3], [2, 4], [3, 4], [4, 5]];
      if (v.loop) edges.push([4, 1]);
      const facts = dominatorFacts([1, 2, 3, 4, 5], edges, 1);
      const defs = [];
      if (v.left) defs.push(2);
      if (v.right) defs.push(3);
      if (v.loop) defs.push(4);
      const phis = new Set();
      const work = defs.slice();
      while (work.length) {
        const n = work.pop();
        facts.df.get(n).forEach((j) => {
          if (phis.has(j)) return;
          phis.add(j);
          if (!defs.includes(j)) work.push(j);
        });
      }
      const rows = [...phis].sort().map((j) => {
        const sources = facts.pred.get(j).map((p) => "来自 " + p);
        if (j === 1) sources.unshift("入口值 x_0");
        return [j, "x = phi(" + sources.join(", ") + ")", sources.length];
      });
      return {
        summary: defs.length ? "定义所在块：" + defs.join(", ") + "，通过迭代支配边界到达汇合点。" : "x 从未赋值，所有使用都读取入口值 x_0，无需 phi。",
        metrics: [
          { label: "定义点数", value: defs.length },
          { label: "phi 语句数", value: phis.size },
        ],
        columns: ["block", "phi", "来源"],
        rows,
      };
    },
  };

  const magicLab = {
    controls: [
      { key: "divisor", label: "除数 d", type: "range", value: 10, min: 2, max: 100, step: 1 },
      { key: "shift", label: "总移位量 s", type: "range", value: 34, min: 32, max: 40, step: 1 },
      { key: "x", label: "输入 x", type: "number", value: -7, min: -2147483648, max: 2147483647, step: 1 },
    ],
    calculate(v) {
      const s = BigInt(v.shift);
      const d = BigInt(v.divisor);
      const power = 1n << s;
      const m = (power + d - 1n) / d;
      const error = m * d - power;
      const bound = power >> 31n;
      const x = BigInt(v.x);
      const product = x * m;
      const floor = product >= 0n ? product >> s : -((-product + power - 1n) >> s);
      const sign = product < 0n ? 1n : 0n;
      const idiom = floor + sign;
      const c = x / d;
      const fits = m < 1n << 31n;
      const ok = error <= bound && fits;
      return {
        summary: ok ? "m = " + hex(Number(m)) + " 满足误差界，因此移位加法序列等于 x / " + v.divisor + "，对每个 int x 均成立。" : fits ? "误差 m*d - 2^s 超过 2^s / 2^31。部分 int 输入的商会出错，禁止折叠。" : "m 无法放入有符号 32 位立即数，编译器不能用 imul 生成此形式。",
        formula: "m = ceil(2^" + v.shift + " / " + v.divisor + ") = " + m + "\nerror = m*d - 2^s = " + error + " (bound " + bound + ")",
        metrics: [
          { label: "乘数 m", value: hex(Number(m)) },
          { label: "惯用法结果", value: Number(idiom) },
          { label: "C 除法", value: Number(c) },
        ],
        bars: [{ label: "误差与上界", value: Number(error > bound * 4n ? bound * 4n : error), max: Number(bound * 4n || 1n) }],
        columns: ["step", "value"],
        rows: [
          ["(long)x * m", product.toString()],
          ["product >> s（向下取整）", floor.toString()],
          ["乘积符号位", sign.toString()],
          ["商", idiom.toString()],
          ["允许折叠", ok ? "是" : "否"],
        ],
      };
    },
  };

  const signatureLab = {
    controls: [
      { key: "rdi", label: "首次写入前读取 %rdi", type: "checkbox", value: true },
      { key: "rsi", label: "首次写入前读取 %rsi", type: "checkbox", value: true },
      { key: "rdx", label: "首次写入前读取 %rdx", type: "checkbox", value: false },
      {
        key: "shape",
        label: "%rdi 的使用方式",
        type: "select",
        value: "offsets",
        options: [
          { value: "scalar", label: "仅算术" },
          { value: "scaled", label: "作为 (rdi, index, 4) 的基址" },
          { value: "offsets", label: "作为 0(rdi) 与 4(rdi) 的基址" },
        ],
      },
      {
        key: "sign",
        label: "使用 %esi 的指令",
        type: "select",
        value: "signed",
        options: [
          { value: "none", label: "仅 add 和 mov" },
          { value: "signed", label: "cltd 和 idivl" },
          { value: "compare", label: "cmp 后接 ja（范围检查）" },
          { value: "unsigned", label: "shrl" },
        ],
      },
    ],
    calculate(v) {
      const order = ["rdi", "rsi", "rdx"];
      const highest = order.reduce((acc, r, i) => (v[r] ? i : acc), -1);
      const params = [];
      for (let i = 0; i <= highest; i += 1) {
        let type = "int";
        let evidence = v[order[i]] ? "写入前读取" : "未使用，但读取了后面的参数寄存器";
        if (i === 0 && v.rdi && v.shape === "scaled") {
          type = "int *";
          evidence = "缩放元素访问";
        } else if (i === 0 && v.rdi && v.shape === "offsets") {
          type = "struct f_param_1 *";
          evidence = "常量偏移 0x0、0x4";
        } else if (i === 1) {
          const labels = { none: "none", signed: "signed", compare: "unsigned-compare", unsigned: "unsigned" };
          evidence = "符号性：" + labels[v.sign];
          if (v.sign === "unsigned") type = "unsigned int";
        }
        params.push([("param_" + (i + 1)), "%" + order[i], type, evidence]);
      }
      const decl = "int f(" + (params.length ? params.map((p) => (p[2].endsWith("*") ? p[2] + p[0] : p[2] + " " + p[0])).join(", ") : "void") + ")";
      return {
        summary: decl,
        metrics: [
          { label: "参数数量", value: params.length },
          { label: "最高参数寄存器", value: highest < 0 ? "none" : "%" + order[highest] },
        ],
        columns: ["name", "寄存器", "type", "证据"],
        rows: params,
      };
    },
  };

  const structureLab = {
    controls: [
      {
        key: "join",
        label: "分支块的直接后支配节点",
        type: "select",
        value: "fall",
        options: [
          { value: "fall", label: "顺序后继块" },
          { value: "taken", label: "跳转后继块" },
          { value: "other", label: "两臂之后的第三块" },
          { value: "exit", label: "虚拟出口（两臂均返回）" },
        ],
      },
      { key: "taken", label: "跳转臂的块数", type: "range", value: 1, min: 1, max: 6, step: 1 },
      { key: "fall", label: "顺序臂的块数", type: "range", value: 2, min: 1, max: 6, step: 1 },
      { key: "headerExit", label: "循环头包含退出分支", type: "checkbox", value: false },
    ],
    calculate(v) {
      let lines;
      if (v.join === "fall") lines = ["if (cond) {", "  /* 跳转臂：" + v.taken + " 个块 */", "}", "/* 汇合 */"];
      else if (v.join === "taken") lines = ["if (!cond) {", "  /* 顺序臂：" + v.fall + " 个块 */", "}", "/* 汇合 */"];
      else if (v.join === "exit") {
        const smallFirst = v.fall < v.taken;
        lines = ["if (" + (smallFirst ? "!cond" : "cond") + ") {", "  /* " + (smallFirst ? v.fall : v.taken) + " 个块，以返回结束 */", "}", "/* " + (smallFirst ? v.taken : v.fall) + " 个块，以返回结束 */"];
      } else lines = ["if (cond) {", "  /* " + v.taken + " 个块 */", "} else {", "  /* " + v.fall + " 个块 */", "}", "/* 汇合 */"];
      const loop = v.headerExit ? ["while (cond) {", "  /* 循环体 */", "}"] : ["do {", "  /* 循环体 */", "} while (cond);"];
      return {
        summary: "分支变为 " + (v.join === "other" ? "if-else" : v.join === "exit" ? "提前返回的 if" : "单个 if") + "。循环变为 " + (v.headerExit ? "while" : "do-while") + ".",
        formula: lines.concat([""], loop).join("\n"),
        metrics: [
          { label: "生成行数", value: lines.length + loop.length },
          { label: "goto 语句数", value: 0 },
        ],
      };
    },
  };

  const verifyLab = {
    controls: [
      { key: "scalars", label: "int 参数数", type: "range", value: 1, min: 0, max: 3, step: 1 },
      { key: "pointer", label: "一个指针参数", type: "checkbox", value: false },
      { key: "constants", label: "基础值之外的不同比较常量数", type: "range", value: 1, min: 0, max: 4, step: 1 },
      { key: "mismatch", label: "原版与候选结果不同的单元数", type: "range", value: 0, min: 0, max: 5, step: 1 },
      { key: "bytes", label: "未屏蔽字节的差异数", type: "range", value: 0, min: 0, max: 8, step: 1 },
      { key: "clang", label: "PATH 中存在 clang", type: "checkbox", value: true },
    ],
    calculate(v) {
      const base = v.pointer ? 6 : 10;
      const perScalar = base + 2 * v.constants;
      const cells = Math.min(400, (v.pointer ? 5 : 1) * Math.pow(perScalar, v.scalars));
      const behaviour = !v.clang ? "unknown" : v.mismatch ? "fail" : "pass";
      const bytes = !v.clang ? "unknown" : v.bytes ? "differs" : "pass";
      const status = behaviour === "fail" ? "fail" : behaviour === "unknown" || bytes === "unknown" ? "unknown" : bytes === "pass" ? "pass" : "behaviour-only";
      return {
        summary: "汇总状态：" + status + "。fail 优先于 unknown，unknown 优先于 pass。",
        metrics: [
          { label: "网格单元数", value: v.clang ? cells : 0 },
          { label: "行为验证", value: behaviour },
          { label: "字节验证", value: bytes },
        ],
        bars: [{ label: "单元数（上限 400）", value: v.clang ? cells : 0, max: 400 }],
        columns: ["验证分支", "状态", "原因"],
        rows: [
          ["behaviour", behaviour, v.clang ? v.mismatch + " 个单元不匹配" : "PATH 中没有 clang"],
          ["bytes", bytes, v.clang ? (v.bytes ? v.bytes + " 个未屏蔽字节不同" : "掩码字节相同") : "没有重编译目标文件"],
        ],
      };
    },
  };

  const figures = [
    ["读取 ELF 可重定位目标文件", "ElfObject, relocation_target", "校验文件头，读取节、符号和 RELA 记录，将 PC 相对字段解析为实际到达的偏移。", "-O1 的 band 在 0x5f 有一条加数为 -4 的 R_X86_64_PC32 记录；lea 在 0x63 结束，因此表位于 .rodata+0x0。", elfLab],
    ["解码 x86-64 子集", "decode, linear_sweep", "依次读取前缀、REX、操作码、ModRM、SIB、位移和立即数，并记录各字段位置。", "48 69 c0 67 66 66 66 是 imulq $0x66666667, %rax, %rax：REX.W、操作码 69、ModRM c0，以及偏移 3 的 4 字节立即数。", decoderLab],
    ["恢复控制流", "recursive_descent, ControlFlowGraph", "递归下降跟随目标，跳转表加入表边，迭代算法计算直接支配节点与支配边界。", "回边指向支配源节点的块。回到入口的边使入口位于自身支配边界中。", graphLab],
    ["提升到 IR 并构建 SSA", "lift_instruction, insert_phis, rename", "各指令变成 IR 语句，标志位表示为变量。phi 放在各定义点的迭代支配边界。", "-O1 的 fold 在循环头 0x80 获得四个 phi：esi、rdx、eax、flags。", ssaLab],
    ["化简并折叠惯用法", "magic_divisor, optimize", "标志转为比较，消除复制与无用定义，误差界成立时将乘法、移位与符号修正序列折叠为除法。", "0x66666667 配合移位 34 等于除以 10：误差 6 小于上界 8。", magicLab],
    ["恢复签名与类型", "collect_params, infer_types, recover_signature", "写前读取的参数寄存器决定参数数。内存访问形状决定指针和结构体类型，指令选择决定符号性。", "record 读取 0(%rdi) 和 4(%rdi)，因此 param_1 是指向字段位于 0x0 和 0x4 的结构体的指针。", signatureLab],
    ["结构化控制流图并生成 C", "Structurer, decompile", "直接后支配节点是条件分支汇合处。先处理循环，再处理二路和多路分支。", "-O0 的 band 变成包含六个 case 和一个 default 的 switch，没有 goto。", structureLab],
    ["验证输出", "mask_relocations, input_grid, verify", "重编译，比较掩码字节与引用常量，为双方运行网格，证据不足时汇总为失败。", "-O1 所有函数通过网格；fold 相差两字节，因此汇总为 behaviour-only。", verifyLab],
  ];

  const config = ([title, contract, mechanism, observe, lab]) => ({
    title,
    steps: [
      { label: "输入契约", detail: contract },
      { label: title, detail: mechanism },
      { label: "观察结果", detail: observe },
    ],
    caption: "修改输入并读取计算值，再运行阶段测试。",
    lab,
  });
  window.AIFSProjectFigures.register("pj-mini-decompiler-1", config(figures[0]));
  window.AIFSProjectFigures.register("pj-mini-decompiler-2", config(figures[1]));
  window.AIFSProjectFigures.register("pj-mini-decompiler-3", config(figures[2]));
  window.AIFSProjectFigures.register("pj-mini-decompiler-4", config(figures[3]));
  window.AIFSProjectFigures.register("pj-mini-decompiler-5", config(figures[4]));
  window.AIFSProjectFigures.register("pj-mini-decompiler-6", config(figures[5]));
  window.AIFSProjectFigures.register("pj-mini-decompiler-7", config(figures[6]));
  window.AIFSProjectFigures.register("pj-mini-decompiler-8", config(figures[7]));
})();
