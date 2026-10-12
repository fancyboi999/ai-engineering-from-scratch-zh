(function () {
  'use strict';
  const text = (key, label, value) => ({ key, label, type: 'text', value });
  const span = (start, end) => ({ start, end });
  function union(intervals) {
    const result = [];
    for (const entry of intervals.slice().sort((a, b) => a.start - b.start)) {
      const last = result[result.length - 1];
      if (last && entry.start < last.end) last.end = Math.max(last.end, entry.end);
      else result.push({ ...entry });
    }
    return result;
  }
  function literalMatches(value, literal) {
    const chars = Array.from(value), needle = Array.from(literal), result = [];
    if (!needle.length) return result;
    for (let i = 0; i <= chars.length - needle.length; i += 1) {
      if (needle.every((character, j) => chars[i + j] === character)) result.push(span(i, i + needle.length));
    }
    return result;
  }
  window.AIFSProjectFigures.register('pj-sensitive-text-redaction-gate-1', {
    title: '定位每个精确字面量，包括重叠匹配',
    steps: [{ label: '读取', detail: '按 Unicode 字符建立索引。' }, { label: '匹配', detail: '比较每个候选起点。' }, { label: '记录', detail: '保留偏移量，不保留源子字符串。' }],
    caption: '此控件展示字面量检测器。Python 还提供独立测试的邮件和 IPv4 检测器。',
    lab: { controls: [text('text', '输入文本', 'banana'), text('literal', '精确字面量', 'ana')], calculate(values) {
      const matches = literalMatches(values.text, values.literal);
      return { summary: matches.length + ' 处精确匹配；结束偏移不包含在范围内。', metrics: [{ label: '字符数', value: Array.from(values.text).length }, { label: '匹配数', value: matches.length }], columns: ['起点', '终点'], rows: matches.map(item => [item.start, item.end]) };
    } },
  });
  window.AIFSProjectFigures.register('pj-sensitive-text-redaction-gate-2', {
    title: '重叠字符只计一次',
    steps: [{ label: '排序', detail: '按起始偏移读取区间。' }, { label: '合并', detail: '相交片段延长当前结束位置。' }, { label: '计数', detail: '累加不相交区间长度。' }],
    caption: '相邻区间保持分离；相交区间取完整并集。',
    lab: { controls: [{ key: 'start', label: '第二个起点', type: 'range', min: 0, max: 8, value: 3, step: 1 }, { key: 'length', label: '第二段长度', type: 'range', min: 1, max: 5, value: 3, step: 1 }], calculate(values) {
      const original = [span(1, 4), span(values.start, values.start + values.length)], merged = union(original);
      return { summary: original.length + ' 个检测片段变为 ' + merged.length + ' 个不相交片段。', columns: ['起点', '终点'], rows: merged.map(item => [item.start, item.end]), metrics: [{ label: '移除字符数', value: merged.reduce((total, item) => total + item.end - item.start, 0) }] };
    } },
  });
  window.AIFSProjectFigures.register('pj-sensitive-text-redaction-gate-3', {
    title: '按原始偏移推进',
    steps: [{ label: '检测', detail: '找出精确字面量片段。' }, { label: '替换', detail: '追加未修改空隙和替换标记。' }, { label: '完成', detail: '在最后原始偏移后追加后缀。' }],
    caption: '替换长度不会改变原始坐标。',
    lab: { controls: [text('text', '输入文本', '🌳 banana basket'), text('literal', '精确字面量', 'ana')], calculate(values) {
      const chars = Array.from(values.text), merged = union(literalMatches(values.text, values.literal));
      let cursor = 0, output = '';
      for (const item of merged) { output += chars.slice(cursor, item.start).join('') + '[REDACTED]'; cursor = item.end; }
      output += chars.slice(cursor).join('');
      return { summary: output, metrics: [{ label: '替换片段', value: merged.length }, { label: '原始字符数', value: chars.length }, { label: '输出字符数', value: Array.from(output).length }] };
    } },
  });
  window.AIFSProjectFigures.register('pj-sensitive-text-redaction-gate-4', {
    title: '区分覆盖率和检测通过',
    steps: [{ label: '扫描', detail: '运行受支持的检测器。' }, { label: '导出', detail: '写出脱敏记录和偏移回执。' }, { label: '审阅', detail: '不支持的实体类型可能仍然存在。' }],
    caption: '合成标注计数只衡量此 fixture。残留计数为零不是匿名化证明。',
    lab: { controls: [{ key: 'supported', label: '已标注的支持实体', type: 'range', min: 0, max: 10, value: 4, step: 1 }, { key: 'unsupported', label: '已标注的不支持实体', type: 'range', min: 0, max: 10, value: 2, step: 1 }], calculate(values) {
      const total = values.supported + values.unsupported;
      return { summary: values.unsupported + ' 个不支持实体仍待审阅。', metrics: [{ label: '已移除', value: values.supported }, { label: '剩余', value: values.unsupported }, { label: 'fixture 覆盖率', value: total ? Math.round(values.supported / total * 100) + '%' : '没有标注实体' }], bars: [{ label: '已标注 fixture 实体中的移除数', value: values.supported, max: Math.max(1, total) }] };
    } },
  });
})();
