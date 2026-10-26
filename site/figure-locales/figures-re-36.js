(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-re-36.js"] = {
  "re-36-prove-equal": {
    "text": {
      "none": "无"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "return 100 * (after - before) / before;",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "return (int)(((long)after - before) * 100 / before);",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "return (after - before) / before * 100;",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "grade · grade_switch.c",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "switch (score / 10) { case 10: case 9: return 4; case 8: return 3; ... }",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "grade · grade_thresholds.c",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "if (score >= 90) return 4; if (score >= 80) return 3; ...",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "grade · grade_case10_wrong.c",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "switch (score / 10) { case 10: return 3; case 9: return 4; ... }",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "MAX",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "MIN",
        "reason": "真实 C/汇编代码、函数/文件名或边界常量，必须字面一致。"
      },
      {
        "text": "0x0 testl %edi,%edi · 0x2 je +9 · 0x4 subl %edi,%esi · 0x6 imull $100,%esi,%eax · 0x9 cltd · 0xa idivl %edi · 0xc retq · 0xd xorl %eax,%eax · 0xf retq",
        "reason": "反编译演示的真实汇编反汇编记录，原样保留指令与地址。"
      },
      {
        "text": "0x0 testl %edi,%edi · 0x2 je +19 · 0x4 movslq %esi,%rax · 0x7 movslq %edi,%rcx · 0xa subq %rcx,%rax · 0xd imulq $100,%rax,%rax · 0x11 cqto · 0x13 idivq %rcx · 0x16 retq · 0x17 xorl %eax,%eax · 0x19 retq",
        "reason": "反编译演示的真实汇编反汇编记录，原样保留指令与地址。"
      },
      {
        "text": "0x0 testl %edi,%edi · 0x2 je +11 · 0x4 subl %edi,%esi · 0x6 movl %esi,%eax · 0x8 cltd · 0x9 idivl %edi · 0xb imull $100,%eax,%eax · 0xe retq · 0xf xorl %eax,%eax · 0x11 retq",
        "reason": "反编译演示的真实汇编反汇编记录，原样保留指令与地址。"
      },
      {
        "text": "0x0 movslq %edi,%rax · 0x3 imulq $0x66666667,%rax,%rax · 0xa movq %rax,%rcx · 0xd sarq $34,%rcx · 0x11 shrq $63,%rax · 0x15 addl %eax,%ecx · 0x17 addl $-6,%ecx · 0x1a xorl %eax,%eax · 0x1c cmpl $4,%ecx · 0x1f ja +12 · 0x21 movl %ecx,%eax · 0x23 leaq table(%rip),%rcx · 0x2a movl (%rcx,%rax,4),%eax · 0x2d retq",
        "reason": "反编译演示的真实汇编反汇编记录，原样保留指令与地址。"
      },
      {
        "text": "0x0 movl $4,%eax · 0x5 cmpl $89,%edi · 0x8 jg +28 · 0xa movl $3,%eax · 0xf cmpl $79,%edi · 0x12 jg +18 · 0x14 movl $2,%eax · 0x19 cmpl $69,%edi · 0x1c jg +8 · 0x1e xorl %eax,%eax · 0x20 cmpl $60,%edi · 0x23 setge %al · 0x26 retq",
        "reason": "反编译演示的真实汇编反汇编记录，原样保留指令与地址。"
      }
    ]
  }
};
