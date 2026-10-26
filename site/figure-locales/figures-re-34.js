(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-re-34.js"] = {
  "lifting-stages-percent-change": {
    "text": {},
    "patterns": [],
    "preserve": [
      {
        "text": "4 SSA",
        "reason": "SSA阶段技术缩写"
      },
      {
        "text": "line 2  if (before == 0) return 0;",
        "reason": "源码行号与原始代码"
      },
      {
        "text": "line 3  return (after - before) * 100 / before;",
        "reason": "源码行号与原始代码"
      },
      {
        "text": "0x0  testl  %edi, %edi",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "0x4  subl   %edi, %esi",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "0x6  imull  $0x64, %esi, %eax",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "0x9  cltd",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "0xa  idivl  %edi",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "0xc  retq",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "0xd  xorl   %eax, %eax",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "0xf  retq",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "flags = test(edi, edi)",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "if je(flags) goto 0xd else goto 0x4",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "flags = cmp(esi, edi)",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "esi = esi - edi",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "eax = esi * 100",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "edx = signfill(eax)",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "dividend = edx:eax",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "eax = dividend / edi",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "edx = dividend % edi",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "return rax",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "eax = 0",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "flags_1 = test(edi_0, edi_0)",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "if je(flags_1) goto 0xd else goto 0x4",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "flags_2 = cmp(esi_0, edi_0)",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "edx_1 = signfill(eax_1)",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "return eax_2",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "return eax_3",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "int percent_change(int param_1, int param_2)",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "return 0;",
        "reason": "原始反汇编、IR或C代码"
      },
      {
        "text": "return (param_2 - param_1) * 100 / param_1;",
        "reason": "原始反汇编、IR或C代码"
      }
    ]
  }
};
