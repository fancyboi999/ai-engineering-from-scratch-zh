(function (scope) {
  'use strict';
  function validate(report, project) {
    if (!report || report.schemaVersion !== 1 || !Array.isArray(report.projects)) throw new Error('请选择项目评分器生成的 JSON 报告。');
    var matches = report.projects.filter(function (p) { return p.id === project.id; });
    if (matches.length !== 1) throw new Error('报告必须包含且只包含一条本项目结果。');
    var result = matches[0];
    if (result.mode !== 'learner') throw new Error('请对自己的工作区运行评分器，不要使用 --solution。');
    if (!project.manifestHash || result.manifestHash !== project.manifestHash) throw new Error('项目已变化，请重新运行当前评分器。');
    if (!result.allStagesPassed || !result.certificateEligible || !Array.isArray(result.stages) || result.stages.length !== project.stages.length) throw new Error('请用 --all --strict 通过所有阶段后再导入报告。');
    project.stages.forEach(function (stage, i) {
      var row = result.stages[i];
      if (!row || row.id !== stage.id || row.status !== 'pass' || !Number.isInteger(row.tests) || row.tests < 1 || row.skippedTests !== 0) throw new Error('每阶段都必须通过测试，不能有跳过项。');
    });
    if (!report.generatedAt || !Number.isFinite(Date.parse(report.generatedAt))) throw new Error('报告没有有效的完成日期。');
    return result;
  }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function certificate(report, project, name) {
    var result = validate(report, project);
    var tests = result.stages.reduce(function (sum, stage) { return sum + stage.tests; }, 0);
    return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>项目完成</title><style>body{font-family:Georgia,serif;color:#172436;background:#f7f6ef;max-width:900px;margin:70px auto;padding:50px;border:3px solid #3553ff}h1{font-size:44px}h2{font-size:32px}p{line-height:1.7}small{display:block;margin-top:60px}code{overflow-wrap:anywhere}@media print{body{margin:0}}</style><p>从零开始学 AI 工程</p><h1>项目完成证书</h1><p>颁发给</p><h2>' + escape(name.trim().slice(0, 100)) + '</h2><p>完成项目：<strong>' + escape(project.title) + '</strong>.</p><p>' + project.stages.length + ' 个阶段 · ' + tests + ' 个通过的测试 · ' + escape(report.generatedAt.slice(0, 10)) + '</p><p>语言：' + escape(project.languages.join(', ')) + '</p><small>独立社区课程。依据学习者提供的本地评分报告；非监考、非独立核验，也非厂商资质。</small><p>课程指纹：<code>' + escape(result.manifestHash) + '</code></p></html>';
  }
  function mount(host, project) {
    host.innerHTML = '<div class="pj-eyebrow">项目证书</div><h3>保留你的学习证据。</h3><p>在自己的工作区通过每个阶段，再导入评分报告下载完成证书。</p><pre class="pj-cmd"><code>python3 scripts/project_test.py ' + escape(project.id) + ' --all --strict --path my-' + escape(project.id) + ' --report completion.json</code></pre><div class="pj-certificate-fields"><label>你的姓名<input id="pjCertificateName" maxlength="100" autocomplete="name"></label><label>评分报告<input id="pjCertificateFile" type="file" accept="application/json,.json"></label><button type="button" class="pj-action" id="pjCertificateDownload" disabled>下载证书</button></div><p id="pjCertificateStatus" role="status">证书基于本地证据，并非监考证书或厂商资质。</p>';
    var report = null;
    var status = host.querySelector('#pjCertificateStatus');
    var button = host.querySelector('#pjCertificateDownload');
    var name = host.querySelector('#pjCertificateName');
    function enabled() { button.disabled = !report || !name.value.trim(); }
    name.addEventListener('input', enabled);
    host.querySelector('#pjCertificateFile').addEventListener('change', async function (event) {
      report = null; enabled();
      try {
        var file = event.target.files[0];
        if (!file || file.size > 2000000) throw new Error('请选择小于 2 MB 的评分 JSON 报告。');
        var parsed = JSON.parse(await file.text());
        validate(parsed, project); report = parsed;
        status.textContent = '导入的学习者报告已通过全部阶段。输入姓名即可下载。';
      } catch (error) { status.textContent = error.message; }
      enabled();
    });
    button.addEventListener('click', function () {
      if (button.disabled) return;
      var url = URL.createObjectURL(new Blob([certificate(report, project, name.value)], { type: 'text/html' }));
      var link = document.createElement('a'); link.href = url; link.download = project.id + '-certificate.html'; link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }
  var api = { validate: validate, certificate: certificate, mount: mount };
  if (typeof module !== 'undefined') module.exports = api;
  else scope.AIFSProjectCertificates = api;
}(typeof window !== 'undefined' ? window : globalThis));
