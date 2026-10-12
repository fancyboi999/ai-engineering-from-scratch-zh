(function () {
  'use strict';
  const range = (key, label, value, max) => ({ key, label, type: 'range', min: 0, max, step: 1, value });
  window.AIFSProjectFigures.register('pj-dataset-contract-gate-1', {
    title: '读取行之前拒绝矛盾契约',
    steps: [{ label: '声明', detail: '指定字段及其允许数值区间。' }, { label: '校验', detail: '要求最小值不大于最大值。' }, { label: '继续', detail: '只有有效契约才能评估记录。' }],
    caption: '错误策略是输入错误，与数据集质量失败不同。',
    lab: { controls: [range('min', '最少 token', 0, 20), range('max', '最多 token', 10, 20)], calculate(values) {
      return { summary: values.min <= values.max ? '契约区间有效。' : '无效契约：最小值超过最大值。', metrics: [{ label: '最小值', value: values.min }, { label: '最大值', value: values.max }, { label: '区间宽度', value: Math.max(0, values.max - values.min) }] };
    } },
  });
  window.AIFSProjectFigures.register('pj-dataset-contract-gate-2', {
    title: '比较边界前检查类型',
    steps: [{ label: '读取', detail: '解析给定 JSON 标量。' }, { label: '类型', detail: '要求整数，不强制转换字符串或布尔值。' }, { label: '限制', detail: '接受零到十的整数。' }],
    caption: '本阶段建模 min=0、max=10 的整数字段。',
    lab: { controls: [{ key: 'value', label: 'JSON 值', type: 'text', value: 'true' }], calculate(values) {
      let value;
      try { value = JSON.parse(values.value); } catch (_) { return { summary: '无效 JSON 输入。', metrics: [] }; }
      let rule = 'pass';
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) rule = 'type';
      else if (value < 0) rule = 'min';
      else if (value > 10) rule = 'max';
      return { summary: '规则结果：' + rule, columns: ['输入', '运行时类型', '结果'], rows: [[values.value, typeof value, rule]] };
    } },
  });
  window.AIFSProjectFigures.register('pj-dataset-contract-gate-3', {
    title: '隔离每个重复成员',
    steps: [{ label: '索引', detail: '将键映射到从一开始的行号。' }, { label: '分组', detail: '保留有两行及以上的组。' }, { label: '标记', detail: '标记每个成员，包括第一个。' }],
    caption: '输入字符串 ID 的 JSON 数组。大小写仍有区别。',
    lab: { controls: [{ key: 'ids', label: '记录 ID', type: 'text', value: '["a","b","a","c"]' }], calculate(values) {
      let ids;
      try { ids = JSON.parse(values.ids); } catch (_) { return { summary: '请输入 JSON 数组。', metrics: [] }; }
      if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) return { summary: '每个 ID 必须是字符串。', metrics: [] };
      const index = new Map();
      ids.forEach((id, i) => { if (!index.has(id)) index.set(id, []); index.get(id).push(i + 1); });
      const groups = Array.from(index.values()).filter(rows => rows.length > 1);
      return { summary: groups.length + ' 个重复组。', metrics: [{ label: '隔离行数', value: groups.reduce((sum, rows) => sum + rows.length, 0) }], columns: ['源行'], rows: groups.map(rows => [rows.join(', ')]) };
    } },
  });
  window.AIFSProjectFigures.register('pj-dataset-contract-gate-4', {
    title: '干净分区仍可能未通过数据集门禁',
    steps: [{ label: '分区', detail: '将无效行与接受行分开。' }, { label: '数据集', detail: '检查原始批次大小。' }, { label: '门禁', detail: '要求既无行问题，也无数据集问题。' }],
    caption: '门禁针对给定批次。导出接受行不会消除批次失败。',
    lab: { controls: [range('rows', '输入行数', 4, 12), range('bad', '有问题的行数', 3, 12), range('minimum', '最小批次大小', 1, 12)], calculate(values) {
      const bad = Math.min(values.bad, values.rows), accepted = values.rows - bad, failedSize = values.rows < values.minimum;
      return { summary: !bad && !failedSize ? '通过：输入批次满足两条规则。' : '失败：请检查行与数据集证据。', metrics: [{ label: '接受', value: accepted }, { label: '隔离', value: bad }, { label: '最小大小检查', value: failedSize ? 'fail' : 'pass' }], bars: [{ label: '接受行数', value: accepted, max: Math.max(1, values.rows) }, { label: '隔离行数', value: bad, max: Math.max(1, values.rows) }] };
    } },
  });
})();
