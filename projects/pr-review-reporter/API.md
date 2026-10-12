# 公共实现契约

使用 --diff - 从 stdin 读取；使用 --repo /path --base REF --head REF 获取只读 Git diff；或使用 --candidates recorded-findings.json，对照提供的补丁验证另一位审查者的发现。

四种词法检测器仅产生狭义审查候选，不判定漏洞是否可利用。二进制和 combined diff 不在范围内。带引号的 Git 路径在验证路径穿越和定位前先解码。不向远程 PR 发布评论。

### diff_parser.py

```python
def decode_path(raw)
def parse(raw)
```

### main.ts

```typescript
export function parseDiff(raw: string): AddedLine[]
export function inspect(lines: AddedLine[]): Finding[]
export function verify(findings: unknown[], lines: AddedLine[]): { accepted: Finding[]; rejected: unknown[] }
export function merge(findings: Finding[]): Finding[]
export function escapeHTML(value: string): string
export function render(findings: Finding[], rejected = 0): string
```

starter 提供记录和类的接口。方法在实现前会有意抛出异常。

candidates 输入必须是数组。将格式错误的条目原样保留在 `rejected` 中：在读取源证据前拒绝 null、数组、非对象值、非字符串的 `file`、`quote`、`rule` 或 `message`，以及非正整数行号。要求去除首尾空白后 quote、rule 和 message 非空，severity 受支持，且已有的精确位置和引文匹配。只有接受的发现才能进入渲染或 SARIF 导出。

阶段测试规定正常结果和应拒绝的输入。不要把学习者实现的导入替换成参考实现的导入。最后一阶段还会用提供的输入驱动器测试你的累积实现。
