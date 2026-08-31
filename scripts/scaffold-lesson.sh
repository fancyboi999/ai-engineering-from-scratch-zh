#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  cat <<'USAGE' >&2
Usage: scripts/scaffold-lesson.sh <phase-dir> <lesson-slug> [title]

Examples:
  scripts/scaffold-lesson.sh 05-nlp-foundations-to-advanced 03-tokenizers
  scripts/scaffold-lesson.sh 05-nlp-foundations-to-advanced 03-tokenizers "Tokenizers from Scratch"

Creates phases/<phase-dir>/<lesson-slug>/ with code/, notebook/, docs/, outputs/
and a docs/zh.md skeleton prefilled from LESSON_TEMPLATE.md.
USAGE
  exit 2
fi

PHASE="$1"
LESSON="$2"
TITLE="${3:-}"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "error: run this from inside the ai-engineering-from-scratch git repo" >&2
  exit 1
fi

PHASE_DIR="$REPO_ROOT/phases/$PHASE"
LESSON_DIR="$PHASE_DIR/$LESSON"

if [[ ! -d "$PHASE_DIR" ]]; then
  echo "error: phase dir not found: phases/$PHASE" >&2
  echo "       run: ls phases/ to see valid phases" >&2
  exit 1
fi

if [[ -e "$LESSON_DIR" ]]; then
  echo "error: lesson already exists: phases/$PHASE/$LESSON" >&2
  exit 1
fi

if [[ ! "$LESSON" =~ ^[0-9]{2}-[a-z0-9-]+$ ]]; then
  echo "error: lesson slug must match NN-kebab-case (e.g. 03-tokenizers)" >&2
  exit 1
fi

mkdir -p "$LESSON_DIR/code" "$LESSON_DIR/notebook" "$LESSON_DIR/docs" "$LESSON_DIR/outputs"

PRETTY_TITLE="$TITLE"
if [[ -z "$PRETTY_TITLE" ]]; then
  PRETTY_TITLE="$(echo "${LESSON#[0-9][0-9]-}" | tr '-' ' ' | awk '{for (i=1; i<=NF; i++) $i=toupper(substr($i,1,1)) substr($i,2);}1')"
fi

PHASE_NUM="${PHASE%%-*}"
LESSON_NUM="${LESSON%%-*}"

cat >"$LESSON_DIR/docs/zh.md" <<EOF
# $PRETTY_TITLE

> [一句话主旨——最值得记住的核心观点。]

**类型：** Build
**语言：** Python
**前置要求：** [前置课程]
**预计时间：** ~75 分钟

## 问题背景

[用 2–3 段说明缺少这项能力时做不到什么，并给出具体场景。]

## 核心概念

[先用图、表和直觉建立心智模型，暂不写代码。]

## 动手构建

### 第 1 步：[名称]

[说明]

\`\`\`python
# 在这里写代码
\`\`\`

### 第 2 步：[名称]

[说明]

\`\`\`python
# 在这里写代码
\`\`\`

## 实际使用

[展示生产框架如何解决同一问题，并与手写版本比较。]

## 拿去用

[说明本课产出的可复用产物，并保存到 outputs/。]

## 练习

1. [简单——巩固核心概念]
2. [中等——应用到不同问题]
3. [困难——扩展实现或结合前置课程]

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
|      |                |                      |

## 延伸阅读

- [资料](url) — [推荐理由]
EOF

cat >"$LESSON_DIR/code/main.py" <<'EOF'
def main():
    raise NotImplementedError("implement the lesson")


if __name__ == "__main__":
    main()
EOF

touch "$LESSON_DIR/notebook/.gitkeep"
touch "$LESSON_DIR/outputs/.gitkeep"

echo "created phases/$PHASE/$LESSON/"
echo ""
echo "next:"
echo "  1. edit phases/$PHASE/$LESSON/docs/zh.md"
echo "  2. write phases/$PHASE/$LESSON/code/main.py"
echo "  3. add a markdown-link row to ROADMAP.md under Phase $PHASE_NUM:"
echo "     | $LESSON_NUM | [$PRETTY_TITLE](phases/$PHASE/$LESSON) | ✅ | ~75 min |"
echo "  4. atomic commit: git add phases/$PHASE/$LESSON ROADMAP.md && git commit -m \"feat(phase-$PHASE_NUM/$LESSON_NUM): $PRETTY_TITLE\""
