window.AIFSProjectFigures.register("pj-document-extraction-desk-1", {
  "title": "提取值之前先定义字段",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，明确契约。"
    },
    {
      "label": "计算状态",
      "detail": "validate_schema(schema)"
    },
    {
      "label": "检查结果",
      "detail": "改变下方一个输入，预测结果并解释计算差异。"
    }
  ],
  "caption": "原创的机制演示。输入会立即更新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'labels',label:'两个字段的标签',type:'text',value:'Seats,Attendees'}],calculate(v){const labels=v.labels.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);const unique=new Set(labels);const valid=labels.length===unique.size&&labels.length>0;return {summary:valid?'每个规范化标签只有一个目标字段。':'拒绝：重复或空标签会使 schema 产生歧义。',metrics:[{label:'标签数',value:labels.length},{label:'不同标签数',value:unique.size}],columns:['标签','出现次数'],rows:[...unique].map(label=>[label,labels.filter(x=>x===label).length])};}}
});

window.AIFSProjectFigures.register("pj-document-extraction-desk-2", {
  "title": "提取候选值并保留证据",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，明确契约。"
    },
    {
      "label": "计算状态",
      "detail": "extract_candidates(text, schema)"
    },
    {
      "label": "检查结果",
      "detail": "改变下方一个输入，预测结果并解释计算差异。"
    }
  ],
  "caption": "原创的机制演示。输入会立即更新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'source',label:'源文本',type:'text',value:'Seats: 18; revised Seats: 24'},{key:'quote',label:'候选引文',type:'text',value:'24'}],calculate(v){const text=Array.from(v.source),quote=Array.from(v.quote);const matches=[];if(quote.length)for(let i=0;i<=text.length-quote.length;i++)if(quote.every((c,j)=>c===text[i+j]))matches.push(i);return {summary:matches.length===1?'一个精确字符区间支持此引文。':matches.length?'存在多个区间：保留并展示歧义。':'没有精确区间：拒绝伪造或缺失的引文。',metrics:[{label:'匹配数',value:matches.length}],columns:['起点','终点','引文'],rows:matches.map(start=>[start,start+quote.length,v.quote])};}}
});

window.AIFSProjectFigures.register("pj-document-extraction-desk-3", {
  "title": "将批准绑定到一个文档版本",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，明确契约。"
    },
    {
      "label": "计算状态",
      "detail": "typed_value(quote, kind); review_document(text, schema, candidates, decisions=None)"
    },
    {
      "label": "检查结果",
      "detail": "改变下方一个输入，预测结果并解释计算差异。"
    }
  ],
  "caption": "原创的机制演示。输入会立即更新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'quote',label:'候选整数',type:'text',value:'18'},{key:'approved',label:'审核者已选择此区间',type:'checkbox',value:false},{key:'changed',label:'批准后源文本已改变',type:'checkbox',value:false}],calculate(v){const valid=/^[+-]?\d+$/.test(v.quote);const state=!valid?'invalid':v.changed&&v.approved?'stale approval':v.approved?'approved':'proposed';return {summary:state==='approved'?'有效且绑定来源的值可以导出。':'在失败的边界问题解决前，不将此值放入已批准输出。',metrics:[{label:'状态',value:({'invalid':'无效','stale approval':'批准已过期','approved':'已批准','proposed':'待审核'})[state]},{label:'导出的值',value:state==='approved'?Number(v.quote):'无'}],columns:['边界','结果'],rows:[['整数',valid?'有效':'无效'],['源版本',v.changed?'已改变':'相同'],['决定',v.approved?'已选择':'待定']]};}}
});

window.AIFSProjectFigures.register("pj-document-extraction-desk-4", {
  "title": "展示证据并导出已审核的值",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，明确契约。"
    },
    {
      "label": "计算状态",
      "detail": "render_review(report)"
    },
    {
      "label": "检查结果",
      "detail": "改变下方一个输入，预测结果并解释计算差异。"
    }
  ],
  "caption": "原创的机制演示。输入会立即更新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'required',label:'必填字段',type:'range',value:3,min:1,max:6,step:1},{key:'approved',label:'已批准的必填字段',type:'range',value:2,min:0,max:6,step:1}],calculate(v){const accepted=Math.min(v.approved,v.required),missing=v.required-accepted;return {summary:missing?'审核仍未完成；可选字段不能弥补必填字段。':'所有必填字段都有绑定来源的决定。',metrics:[{label:'状态',value:missing?'需要审核':'已批准'},{label:'剩余数',value:missing}],bars:[{label:'必填字段',value:v.required},{label:'已批准的必填字段',value:accepted}]};}}
});
