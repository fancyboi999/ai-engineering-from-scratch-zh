export const CONCEPT = {
  header: "文件头",
  sections: "节与符号",
  disasm: "反汇编",
  cfg: "CFG",
  lift: "提升为 IR",
  types: "类型恢复",
  structure: "结构化",
  pseudocode: "伪代码",
  ledger: "证据账本",
  carriage: "分析流程",
};

export const PART_ORDER = ["header", "sections", "disasm", "cfg", "lift", "types", "structure", "pseudocode", "ledger", "carriage"];

const lesson = (path, title) => ({ href: `/lesson?path=${encodeURIComponent(path)}`, title });
const RE = "phases/13-tools-and-protocols/";

export const INFO = {
  header: {
    name: "ELF 文件卡",
    is: "文件开头的字节和 ELF 文件头。",
    does: "卡片展示文件前 64 个字节的含义。黄色区域是魔数 7f 45 4c 46。下面依次是 ELF64、小端（LSB）、面向 x86-64 的可重定位目标文件（REL）和节头数量。三个测试目标文件只有节头数量不同。",
    why: "后续每个工位都会依赖这些字段。字节序或机器编号错了，后面的指令也会跟着错。",
    without: "机器找不到节表，也就无从解码代码。",
    code: "magic = data[:4]; assert magic == b'\\x7fELF'; e_type, e_machine = struct.unpack_from('<HH', data, 16)",
    lesson: lesson(RE + "32-program-anatomy-elf-from-scratch", "程序结构：从零实现 ELF 读取器"),
  },
  sections: {
    name: "节柜与符号索引",
    is: "节头表和符号表。",
    does: "每个抽屉对应目标文件中的一个真实节头，顺序与文件一致，名称也来自文件。黄色抽屉是存放代码的 .text，打开后可见内容。上方的索引盒是 .symtab。符号记录函数名、起始位置和长度。关闭符号后，横杆会锁住索引盒。",
    why: "有符号时，解码器知道函数从哪里开始、在哪里结束。没有符号时，它只能确定节的起点。",
    without: "符号表锁住后，函数名和结尾都无法确定。机器会临时将函数命名为 fn_0，并把这两处缺失记入账本。",
    code: "for s in sections: if s.name == '.text': code = data[s.offset:s.offset + s.size]. symbol = symtab['percent_change'] gives value and size.",
    lesson: lesson(RE + "40-linking-loading-and-stripped-binaries", "链接、加载与剥离符号的二进制文件"),
  },
  disasm: {
    name: "解码芯片与指令台",
    is: "反汇编器，把字节转换成指令。",
    does: "字节条送入解码芯片。芯片上的 16 条通道表示函数中的一个 16 字节窗口：黄色和白色标出当前解码指令的字节，灰色表示已解码但执行路径没有到达的字节，深色表示没有任何指令覆盖的字节。解码后的指令会成为芯片后方台面上的方块。递归下降沿着跳转继续解码；线性扫描则按地址解码每个字节。高方块表示某条路径会执行的指令，低方块表示路径不会到达的指令。",
    why: "代码和数据可能共处一个节。只有跳转关系能说明哪些字节是代码。",
    without: "线性扫描会把数据和填充字节也当成指令。在“代码中包含数据”的程序里，它先把四个数据字节解码，随后漏掉地址 0x14 的真实指令。插销标出了跳转落点。",
    code: "descent: worklist = [entry]; decode until ret or jmp; push every branch target. sweep: pos = start; while pos < end: insn = decode(pos); pos += insn.length",
    lesson: lesson(RE + "33-disassembly-and-control-flow", "反汇编与控制流"),
  },
  cfg: {
    name: "控制流板与回收箱",
    is: "基本块和控制流图。",
    does: "每个方块表示一个基本块：从顶部进入，从底部离开。板上的连线表示边，并显示真实的块数和边数。从入口无法到达的块会落入回收箱。",
    why: "后续步骤处理的是图，而非指令列表。图的形状揭示了条件分支和循环。",
    without: "如果不检查可达性，填充内容和数据会留在函数里，提升器也会尝试解释它们。",
    code: "leaders = {entry} | jump targets | addresses after a jump or ret. blocks = split at leaders. drop blocks not reachable from entry.",
    lesson: lesson(RE + "33-disassembly-and-control-flow", "反汇编与控制流"),
  },
  lift: {
    name: "IR 压机与语句堆栈",
    is: "提升器把每条指令转换成简化 IR 中的语句。",
    does: "压机每运行一次，就为一条语句压出一块 IR 板。标志位变成变量，cltd 和 idiv 合并为一次除法，栈帧指令不产生语句。在“代码中包含数据”的程序里，提升器不认识操作码 0f b6，螺栓会让压机停下。",
    why: "机器指令带有副作用。IR 把每个影响写成普通赋值，方便后续步骤推理。",
    without: "没有 IR，就无法恢复类型、代码结构或伪代码。账本会记录提升器无法读取的内容。",
    code: "testl %edi, %edi -> flags = test(edi, edi). je 0xd -> if je(flags) goto 0xd else goto 0x4. retq -> return rax.",
    lesson: lesson(RE + "34-lifting-to-pseudocode", "提升为伪代码"),
  },
  types: {
    name: "寄存器与栈槽",
    is: "数据流分析和类型恢复。",
    does: "前排是寄存器槽：RDI 和 RSI 对应两个参数，RAX 对应返回值。后排是栈槽，名称来自相对于 rbp 的偏移。使用 -O0 时，提升器会在 rbp-0x4、rbp-0x8 和 rbp-0xc 处找到 local_4、local_8 和 local_c；使用 -O2 时则没有这些槽。恢复出类型后，黄色 token 会落入对应槽位。",
    why: "机器码记录的是位宽，不是类型。32 位值可恢复为 int。源代码名称已经丢失，因此参数只能叫 param_1 和 param_2。",
    without: "没有数据流分析，读取到的寄存器仍只是原始寄存器，输出也无法指出哪些值是输入。",
    code: "params = [r for r in ('rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9') if read_before_write(r)]. type = 'int' if width == 32 else 'long'.",
    lesson: lesson(RE + "41-recovering-data-and-types", "恢复数据与类型"),
  },
  structure: {
    name: "结构整理夹具",
    is: "结构化步骤把控制流图还原为 if 和循环。",
    does: "夹爪合拢，固定条件块。使用 -O2 时只合上一侧：形成提前返回的 if。使用 -O0 时两侧都会合拢：形成在 return 前汇合的 if/else。",
    why: "包含 goto 的图难以阅读。分支的后支配节点就是汇合点，它决定 if 的结构。",
    without: "伪代码会变成由 goto 连接的基本块列表。",
    code: "join = ipdom[branch]. if join is the exit: emit the early return. else: emit if (cond) { a } else { b } and continue at join.",
    lesson: lesson(RE + "34-lifting-to-pseudocode", "提升为伪代码"),
  },
  pseudocode: {
    name: "伪代码打印机",
    is: "输出结果：类似 C 的伪代码。",
    does: "打印机会按行送出伪代码。打印行的长度与真实代码行对应。",
    why: "人和 agent 读伪代码通常比读汇编快。但伪代码只是对字节含义的推断，不是事实本身。",
    without: "读者只能查看 IR。它更精确，但不易快速阅读。",
    code: "int percent_change(int param_1, int param_2) { if (param_1 == 0) { return 0; } return (param_2 - param_1) * 100 / param_1; }",
    lesson: lesson(RE + "36-rebuild-and-prove-equal", "重建并证明等价"),
  },
  ledger: {
    name: "证据账本",
    is: "记录观察、推导、推断和未知项。",
    does: "每个工位会把卡片放入四个托盘。观察：直接从字节读取。推导：根据已观察事实计算。推断：尚无观察证实的判断。未知：机器仍无法弥补的缺口。",
    why: "伪代码看起来像事实。账本会区分哪些结论来自字节，哪些只是推测。agent 应引用账本，而不是把伪代码当证据。",
    without: "正确解码和错误解码看起来一样。读者无法知道函数名是占位符，也无法知道类型只是根据位宽猜出来的。",
    code: "record = {claim, confidence: 'observed' | 'derived' | 'inferred', stage}; unknowns are records too. Never drop a limitation.",
    lesson: lesson(RE + "35-evidence-confidence-and-unknowns", "证据、置信度与未知项"),
  },
  carriage: {
    name: "分析传送架",
    is: "当前分析结果。每完成一个阶段，就增加一块板。",
    does: "传送架沿轨道把结果送往下一个工位。每个压头都会把一块板压到堆栈上。",
    why: "每个阶段都使用前一阶段的输出。某个工位出错后，错误会随传送架传到后续阶段。",
    without: "各阶段无法衔接。",
    code: "state = read_header(data); state = read_sections(state); state = decode(state); ...",
    lesson: lesson(RE + "34-lifting-to-pseudocode", "提升为伪代码"),
  },
};

export const SCENARIOS = [
  { label: "正常运行", note: "-O2、包含符号、递归下降。", config: {} },
  { label: "未优化构建", note: "-O0：存在栈槽和 if/else。", config: { opt: "O0" } },
  { label: "剥离符号", note: "函数名和结尾变为未知。", config: { symbols: false } },
  { label: "-O0 线性扫描", note: "填充字节被当成代码解码。", config: { opt: "O0", sweep: "linear" } },
  { label: "线性扫描且无符号", note: "扫描会一直进行到 .text 末尾。", config: { symbols: false, sweep: "linear" } },
  { label: "代码中含数据：线性扫描", note: "数据被解码，真实指令被漏掉。", config: { program: "trap", sweep: "linear" } },
  { label: "代码中含数据：递归下降", note: "跳转会越过数据。", config: { program: "trap" } },
];

export const STEPS = {
  header: { label: "读取文件头", hint: "机器读取文件开头的字节，确认这是一个程序文件。", sound: "tap tap" },
  sections: { label: "打开节抽屉", hint: "它打开存放代码的抽屉。", sound: "skreek" },
  decode: { label: "解码字节", hint: "它读取字节，并将其转换为简短指令。", sound: "tik tik" },
  cfg: { label: "连接基本块", hint: "它把指令分成基本块，并画出块之间的路径。", sound: "plok" },
  prune: { label: "移除不可达块", hint: "没有路径到达的块会掉进回收箱。", sound: "thud" },
  lift: { label: "提升为简单步骤", hint: "它把每条指令转换为易读的步骤。", sound: "shff" },
  refuse: { label: "停止并标记未知", hint: "它停止了，因为无法解释这些字节。", sound: "bzzt" },
  types: { label: "恢复类型", hint: "它检查每个槽位，推断其中数值的类型。", sound: "tink" },
  structure: { label: "还原条件分支", hint: "它找出代码分成两条路径的位置。", sound: "clack" },
  emit: { label: "输出代码", hint: "它输出人能阅读的代码。", sound: "brrr" },
  ledger: { label: "整理证据", hint: "它把直接观察和推断分别放入托盘。", sound: "flap" },
  exit: { label: "完成", hint: "绿色指示灯表示运行成功；红色表示机器停止。", sound: "ding" },
};

export const READY_HINT = "点击第 1 步。机器会逐步读取一个小程序。";
