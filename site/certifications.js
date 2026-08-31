(function () {
  'use strict';

  var root = document.documentElement;
  var assessmentTimer = null;
  var TUTOR_GUIDE_URL = 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/certifications/claude/GETTING_STARTED.md';

  function esc(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function attr(value) {
    return esc(value).replace(/`/g, '&#96;');
  }

  function data() {
    return typeof CERTIFICATIONS !== 'undefined' && CERTIFICATIONS
      ? CERTIFICATIONS
      : { program: null, tracks: [], lessonsByPath: {}, assessmentsById: {} };
  }

  function tracks() {
    return Array.isArray(data().tracks) ? data().tracks : [];
  }

  function query(name) {
    return new URLSearchParams(window.location.search).get(name) || '';
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function scrollToPageTop() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  function focusWithoutScrolling(element) {
    if (!element || typeof element.focus !== 'function') return;
    try {
      element.focus({ preventScroll: true });
    } catch (_) {
      element.focus();
    }
  }

  function updateAssessmentResultUrl(id, showResult) {
    if (!window.history || typeof window.history.replaceState !== 'function') return;
    try {
      var params = new URLSearchParams(window.location.search);
      params.set('id', id);
      if (showResult) params.set('result', 'latest');
      else params.delete('result');
      window.history.replaceState(null, '', (window.location.pathname || 'assessment.html') + '?' + params.toString() + (window.location.hash || ''));
    } catch (_) {}
  }

  function findTrack(id) {
    return tracks().find(function (track) {
      return track.id === id || track.slug === id || track.examCode === id;
    }) || null;
  }

  function lessonRefPath(ref) {
    return typeof ref === 'string' ? ref : ref && ref.path ? ref.path : '';
  }

  function findCoreLesson(path) {
    if (typeof PHASES === 'undefined' || !Array.isArray(PHASES)) return null;
    for (var i = 0; i < PHASES.length; i++) {
      for (var j = 0; j < PHASES[i].lessons.length; j++) {
        var lesson = PHASES[i].lessons[j];
        var match = lesson.url && lesson.url.match(/(phases\/[^/?#]+\/[^/?#]+)/);
        if (match && match[1] === path) {
          return {
            path: path,
            name: lesson.name,
            summary: lesson.summary || '',
            type: lesson.type || '',
            languages: lesson.lang || '',
            phaseId: PHASES[i].id,
            phaseName: PHASES[i].name,
          };
        }
      }
    }
    return null;
  }

  function findKnownLesson(path) {
    var lessonsByPath = data().lessonsByPath || {};
    if (Object.prototype.hasOwnProperty.call(lessonsByPath, path) && lessonsByPath[path]) return lessonsByPath[path];
    return findCoreLesson(path);
  }

  function findLesson(path) {
    return findKnownLesson(path) || {
      path: path,
      name: String(path || '').split('/').pop().replace(/^\d+-/, '').replace(/-/g, ' '),
      summary: '',
    };
  }

  function trackContainsLesson(track, path) {
    return !!(track && Array.isArray(track.lessons) && track.lessons.some(function (ref) {
      return lessonRefPath(ref) === path;
    }));
  }

  function lessonIsComplete(path) {
    if (!path || !window.AIFSProgress || typeof window.AIFSProgress.isLessonComplete !== 'function') return false;
    try {
      return !!window.AIFSProgress.isLessonComplete(path);
    } catch (_) {
      return false;
    }
  }

  function validatedInternalLessonReference(ref) {
    var path = lessonRefPath(ref);
    if (!/^(?:certifications\/claude\/lessons\/[^/?#]+|phases\/[^/?#]+\/[^/?#]+)$/.test(path)) return null;
    var lesson = findKnownLesson(path);
    if (!lesson) return null;
    return {
      path: path,
      lesson: lesson,
      label: ref && typeof ref === 'object' ? ref.label || ref.title || '' : '',
    };
  }

  function lessonReferenceHref(path, sourceTrack) {
    var href = '/lesson?path=' + encodeURIComponent(path);
    if (sourceTrack) {
      href += trackContainsLesson(sourceTrack, path)
        ? '&track=' + encodeURIComponent(sourceTrack.id)
        : '&fromTrack=' + encodeURIComponent(sourceTrack.id);
      return href;
    }
    var containingTrack = tracks().find(function (track) { return trackContainsLesson(track, path); });
    return href + (containingTrack ? '&track=' + encodeURIComponent(containingTrack.id) : '');
  }

  function renderInternalLessonReference(ref, sourceTrack) {
    var validated = validatedInternalLessonReference(ref);
    if (!validated) return '';
    var crossTrack = !!(sourceTrack && !trackContainsLesson(sourceTrack, validated.path));
    var label = validated.label || validated.lesson.name;
    if (crossTrack) label += ' · 补充内容：' + (sourceTrack.examCode || sourceTrack.shortName || sourceTrack.id);
    return '<a href="' + attr(lessonReferenceHref(validated.path, sourceTrack)) + '">' + esc(label) + ' →</a>';
  }

  function examValue(track, names, fallback) {
    var exam = track && track.exam ? track.exam : {};
    for (var i = 0; i < names.length; i++) {
      if (exam[names[i]] !== undefined && exam[names[i]] !== null && exam[names[i]] !== '') return exam[names[i]];
      if (track && track[names[i]] !== undefined && track[names[i]] !== null && track[names[i]] !== '') return track[names[i]];
    }
    return fallback;
  }

  function minutes(track) {
    return examValue(track, ['durationMinutes', 'minutes', 'timeLimitMinutes'], '未列出');
  }

  function questions(track) {
    return examValue(track, ['questionCount', 'questions', 'items'], '未列出');
  }

  function passing(track) {
    return examValue(track, ['passingScaledScore', 'passingScore', 'passingScaled'], '查看官方指南');
  }

  function price(track) {
    var value = examValue(track, ['price', 'fee', 'priceUsd', 'feeUsd'], '查看官方提供方');
    if (typeof value === 'number') return '$' + value;
    return value;
  }

  function formatDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function setTheme(preferred) {
    var stored = preferred || '';
    if (!stored) {
      try { stored = localStorage.getItem('theme') || ''; } catch (_) {}
    }
    var theme = stored || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
    var icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === 'light' ? 'N' : 'D';
  }

  function initTheme() {
    setTheme();
    var button = document.getElementById('themeToggle');
    if (!button) return;
    button.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('theme', next); } catch (_) {}
      setTheme(next);
    });
  }

  function metaChip(text) {
    return text ? '<span class="cert-meta-chip">' + esc(text) + '</span>' : '';
  }

  function assessmentKindLabel(value) {
    var labels = { diagnostic: '诊断', mock: '模拟考试', practice: '练习' };
    return labels[String(value || '').toLowerCase()] || value || '练习';
  }

  function examFacts(track) {
    return [
      { value: questions(track), label: '题数' },
      { value: String(minutes(track)).match(/^\d+$/) ? minutes(track) + ' 分钟' : minutes(track), label: '时间限制' },
      { value: passing(track), label: '合格分数' },
      { value: price(track), label: '考试费用' },
      { value: examValue(track, ['format'], '闭卷'), label: '形式' },
      { value: examValue(track, ['validityMonths', 'validForMonths'], '查看提供方'), label: '有效期' },
    ];
  }

  function renderCardFacts(track, limit) {
    return examFacts(track).slice(0, limit || 3).map(function (fact) {
      var value = fact.value;
      if (fact.label === '有效期' && typeof value === 'number') value += ' 个月';
      return '<div class="cert-card-fact"><strong>' + esc(value) + '</strong><span class="cert-fact-label">' + esc(fact.label) + '</span></div>';
    }).join('');
  }

  function renderTrackBadge(track) {
    var badge = track && track.badge;
    if (!badge || !badge.imageUrl) return '';
    var width = Number(badge.width) || 600;
    var height = Number(badge.height) || width;
    return '<img class="cert-track-badge" src="' + attr(badge.imageUrl) + '" width="' + width + '" height="' + height + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="" aria-hidden="true">';
  }

  function renderAccessNotice(id, program, includeAllLinks) {
    var mount = document.getElementById(id);
    if (!mount) return;
    var notice = program && program.accessNotice;
    if (!notice) {
      mount.hidden = true;
      mount.innerHTML = '';
      return;
    }
    var links = Array.isArray(program.officialLinks) ? program.officialLinks.filter(function (link) {
      if (!link || !link.url) return false;
      return includeAllLinks || String(link.label || '').toLowerCase().indexOf('faq') !== -1;
    }) : [];
    mount.hidden = false;
    mount.innerHTML = '<div><strong>当前官方考试访问受限</strong><p>' + esc(notice) + '</p></div>' +
      (links.length ? '<div class="cert-source-links" aria-label="官方认证来源">' + links.map(function (link) {
        return '<a href="' + attr(link.url) + '" target="_blank" rel="noopener">' + esc(link.label || '官方来源') + ' ↗</a>';
      }).join('') + '</div>' : '');
  }

  function renderCatalog() {
    var certs = data();
    var program = certs.program || {};
    var title = document.getElementById('certProgramTitle');
    var summary = document.getElementById('certProgramSummary');
    var meta = document.getElementById('certProgramMeta');
    var grid = document.getElementById('certTrackGrid');
    if (!grid) return;

    if (!certs.program || !tracks().length) {
      grid.innerHTML = '<div class="cert-empty">认证路线正在整理中。添加项目清单后请运行 <code>node site/build.js</code>。</div>';
      if (summary) summary.textContent = '本地认证课程表尚未生成。';
      return;
    }

    if (title) title.textContent = 'AI 认证课程';
    if (summary) summary.textContent = '免费、独立、开源的 AI 工程认证备考课程。先从 Claude 开始，后续会加入更多认证体系。';
    if (meta) {
      var verified = program.verifiedAt || program.lastVerified || program.updatedAt;
      meta.innerHTML = metaChip('Claude 现已开放') +
        metaChip(tracks().length + ' 条岗位路线') +
        metaChip(Object.keys(certs.lessonsByPath || {}).length + ' 节认证课程') +
        metaChip(verified ? '核验于 ' + formatDate(verified) : '版本化来源材料');
    }
    renderAccessNotice('certAccessNotice', program, true);
    var notice = document.getElementById('certProgramNotice');
    if (notice && program.disclaimer) {
      notice.innerHTML = '<strong>独立备考材料</strong><p>' + esc(program.disclaimer) + '</p>' +
        (program.scoringNotice ? '<p>' + esc(program.scoringNotice) + '</p>' : '');
    }

    grid.innerHTML = tracks().map(function (track, index) {
      var domains = Array.isArray(track.domains) ? track.domains.length : 0;
      var lessonCount = Array.isArray(track.lessons) ? track.lessons.length : 0;
      var delay = Math.min(index * 30, 80);
      var badge = renderTrackBadge(track);
      return '<a class="cert-track-card cert-catalog-arrival" style="--cert-arrival-delay:' + delay + 'ms" href="certification.html?id=' + encodeURIComponent(track.id) + '">' +
        '<div class="cert-card-top"><span class="cert-card-code">' + esc(track.examCode || track.shortName || track.slug) + '</span><span class="cert-status">' + esc(track.level || '学习路线') + '</span></div>' +
        '<div class="cert-card-identity' + (badge ? ' has-badge' : '') + '"><h3>' + esc(track.credential || track.title || track.shortName || track.id) + '</h3>' + badge + '</div>' +
        '<p>' + esc(track.summary || track.audience || '沿着这份认证蓝图学习和实践的路线。') + '</p>' +
        '<div class="cert-card-facts">' + renderCardFacts(track, 3) + '</div>' +
        '<div class="cert-card-footer"><span>' + lessonCount + ' 节课 · ' + domains + ' 个知识域</span><span>打开路线 →</span></div>' +
      '</a>';
    }).join('');
  }

  function completedLessons(track) {
    var count = 0;
    var refs = Array.isArray(track.lessons) ? track.lessons : [];
    refs.forEach(function (ref) {
      var path = lessonRefPath(ref);
      if (lessonIsComplete(path)) count++;
    });
    return count;
  }

  function assessmentVersion(assessment) {
    return assessment && assessment.version != null ? assessment.version : 1;
  }

  function assessmentBest(id) {
    var assessment = data().assessmentsById[id] || null;
    if (!window.AIFSCertProgress || typeof window.AIFSCertProgress.getBest !== 'function') return null;
    try {
      var best = window.AIFSCertProgress.getBest(id, assessmentVersion(assessment));
      return isRecord(best) && isFiniteNumber(best.percent) && best.percent >= 0 && best.percent <= 100 ? best : null;
    } catch (_) {
      return null;
    }
  }

  function assessmentAttempts(id, version) {
    if (!window.AIFSCertProgress || typeof window.AIFSCertProgress.getAttempts !== 'function') return [];
    try {
      var attempts = window.AIFSCertProgress.getAttempts(id, version);
      if (!Array.isArray(attempts)) return [];
      return attempts.filter(function (attempt) {
        return isRecord(attempt) && isRecord(attempt.answers) &&
          isFiniteNumber(attempt.startedAt) && attempt.startedAt > 0 &&
          isFiniteNumber(attempt.durationMs) && attempt.durationMs >= 0;
      });
    } catch (_) {
      return [];
    }
  }

  function progressIsPersistent() {
    return !!(window.AIFSCertProgress && window.AIFSCertProgress.isPersistent && window.AIFSCertProgress.isPersistent());
  }

  function renderTrackSeo(track) {
    var name = track.credential || track.title || track.shortName || track.id;
    document.title = name + ' - 免费认证备考';
    var description = track.summary || '免费、独立的认证备考路线，包含课程和原创练习。';
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', description);
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', 'https://aieng-zh.cn/certification.html?id=' + encodeURIComponent(track.id));
  }

  function renderTrackNotFound(hero) {
    document.title = '未找到认证路线 - AI Engineering from Scratch';
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', '请选择当前可用的认证备考路线。');
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', 'https://aieng-zh.cn/certifications.html');
    var breadcrumb = document.getElementById('trackBreadcrumb');
    if (breadcrumb) breadcrumb.textContent = '未找到';
    var main = document.getElementById('main');
    if (main) {
      Array.from(main.querySelectorAll('.cert-section, .cert-access-notice, .cert-notice')).forEach(function (section) {
        section.hidden = true;
      });
    }
    hero.classList.add('is-not-found');
    hero.innerHTML = '<div class="cert-track-not-found-copy"><div class="cert-eyebrow">未找到路线</div><h1>请选择一条可用的认证路线。</h1><p class="cert-track-summary">这个路线 ID 与当前认证课程表不匹配。</p><div class="cert-track-hero-actions"><a class="cert-action" href="certifications.html">所有认证</a></div></div>';
  }

  function renderTrack() {
    var id = query('id') || query('track');
    var track = findTrack(id);
    var hero = document.getElementById('trackHero');
    if (!hero) return;
    if (!track) {
      renderTrackNotFound(hero);
      return;
    }

    renderTrackSeo(track);
    var breadcrumb = document.getElementById('trackBreadcrumb');
    if (breadcrumb) breadcrumb.textContent = track.examCode || track.shortName || track.id;
    var refs = Array.isArray(track.lessons) ? track.lessons : [];
    var complete = completedLessons(track);
    var firstIncomplete = refs.find(function (ref) {
      var path = lessonRefPath(ref);
      return path && !lessonIsComplete(path);
    }) || refs[0];
    var firstPath = lessonRefPath(firstIncomplete);

    hero.innerHTML = '<div class="cert-eyebrow">' + esc(track.examCode || track.shortName || '认证路线') + '</div>' +
      '<h1>' + esc(track.credential || track.title || track.shortName || track.id) + '</h1>' +
      '<p class="cert-track-summary">' + esc(track.summary || track.audience || '') + '</p>' +
      '<div class="cert-meta-row">' + examFacts(track).map(function (fact) {
        var value = fact.value;
        if (fact.label === '有效期' && typeof value === 'number') value += ' 个月';
        return metaChip(fact.label + ': ' + value);
      }).join('') + '</div>' +
      '<div class="cert-track-hero-actions">' +
        (firstPath ? '<a class="cert-action" href="/lesson?path=' + encodeURIComponent(firstPath) + '&track=' + encodeURIComponent(track.id) + '">' + (complete ? '继续学习' : '开始学习') + '</a>' : '') +
        '<a class="cert-action secondary" href="#trackAssessments">练习与评估</a>' +
        '<a class="cert-action secondary" href="' + attr(TUTOR_GUIDE_URL) + '" target="_blank" rel="noopener" aria-label="在 GitHub 上跟随 AI 导师学习（新标签页）">在 GitHub 上跟随 AI 导师学习 ↗</a>' +
        (track.exam && track.exam.officialGuideUrl ? '<a class="cert-action secondary" href="' + attr(track.exam.officialGuideUrl) + '" target="_blank" rel="noopener">官方考试指南</a>' : '') +
      '</div>';

    renderAccessNotice('trackAccessNotice', data().program || {}, false);
    renderTrackProgress(track);
    renderDomains(track);
    renderLessons(track);
    renderDeepDives(track);
    renderAssessments(track);
    renderStudyPlans(track);

    if (window.AIFSProgress) {
      window.AIFSProgress.onChange(function () {
        renderTrackProgress(track);
        renderLessons(track);
      });
    }
    if (window.AIFSCertProgress) {
      window.AIFSCertProgress.onChange(function () { renderAssessments(track); });
    }
  }

  function renderTrackProgress(track) {
    var mount = document.getElementById('trackProgress');
    if (!mount) return;
    var total = Array.isArray(track.lessons) ? track.lessons.length : 0;
    var complete = completedLessons(track);
    var percent = total ? Math.round((complete / total) * 100) : 0;
    var assessments = Array.isArray(track.assessments) ? track.assessments : [];
    var attempted = assessments.filter(function (meta) { return assessmentBest(meta.id); }).length;
    mount.innerHTML = '<div class="cert-progress-head"><div><div class="cert-eyebrow">本地进度</div><h2 id="progressTitle">你的进度</h2></div><div class="cert-progress-number">' + percent + '%</div></div>' +
      '<div class="cert-progress-bar" role="progressbar" aria-labelledby="progressTitle" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent + '"><div class="cert-progress-fill" style="--cert-progress:' + (percent / 100) + '"></div></div>' +
      '<div class="cert-progress-detail"><span>' + complete + ' / ' + total + ' 节课已完成</span><span>' + attempted + ' / ' + assessments.length + ' 套测评已作答</span><span>' + (progressIsPersistent() ? '仅保存在当前浏览器' : '浏览器存储不可用；进度只是临时状态') + '</span></div>';
  }

  function renderDomains(track) {
    var mount = document.getElementById('trackDomains');
    if (!mount) return;
    var domains = Array.isArray(track.domains) ? track.domains : [];
    mount.innerHTML = domains.length ? domains.map(function (domain) {
      var objectives = Array.isArray(domain.objectives) ? domain.objectives : [];
      return '<article class="cert-domain-row"><div class="cert-domain-weight">' + esc(domain.weight != null ? domain.weight + '%' : '核心') + '</div><div><h3>' + esc(domain.name || domain.title || domain.id) + '</h3><div class="cert-card-code">' + esc(domain.id || '') + '</div></div><ul class="cert-objectives">' + objectives.map(function (objective) { return '<li>' + esc(objective) + '</li>'; }).join('') + '</ul></article>';
    }).join('') : '<div class="cert-empty">这份路线清单暂未提供知识域详情。</div>';
  }

  function renderLessons(track) {
    var mount = document.getElementById('trackLessons');
    if (!mount) return;
    var refs = Array.isArray(track.lessons) ? track.lessons : [];
    mount.innerHTML = refs.length ? refs.map(function (ref, index) {
      var normalized = typeof ref === 'string' ? { path: ref } : ref;
      var path = normalized.path;
      var lesson = findLesson(path);
      var done = lessonIsComplete(path);
      var domains = Array.isArray(normalized.domains) ? normalized.domains : [];
      var origin = path.indexOf('phases/') === 0 ? '核心课程' : (normalized.role || lesson.type || '认证课程');
      return '<article class="cert-lesson-row' + (done ? ' is-complete' : '') + '">' +
        '<div class="cert-lesson-num">' + String(index + 1).padStart(2, '0') + '</div>' +
        '<div class="cert-lesson-copy"><h3>' + esc(lesson.name) + '</h3><p>' + esc((done ? '已完成 · ' : '') + origin + (lesson.summary ? ' · ' + lesson.summary : '')) + '</p></div>' +
        '<div class="cert-domain-chips">' + domains.map(function (domain) { return '<span class="cert-domain-chip">' + esc(domain) + '</span>'; }).join('') + '</div>' +
        '<a class="cert-lesson-open" href="/lesson?path=' + encodeURIComponent(path) + '&track=' + encodeURIComponent(track.id) + '">' + (done ? '复习' : '打开') + ' →</a>' +
      '</article>';
    }).join('') : '<div class="cert-empty">这条路线暂未添加课程。</div>';
  }

  function renderDeepDives(track) {
    var section = document.getElementById('trackDeepDiveSection');
    var mount = document.getElementById('trackDeepDives');
    if (!section || !mount) return;
    var refs = Array.isArray(track.deepDives) ? track.deepDives : [];
    section.hidden = refs.length === 0;
    if (!refs.length) {
      mount.innerHTML = '';
      return;
    }
    mount.innerHTML = refs.map(function (ref) {
      var normalized = typeof ref === 'string' ? { path: ref } : ref || {};
      var path = normalized.path || '';
      var lesson = findLesson(path);
      var title = normalized.label || lesson.name;
      var reason = normalized.reason || lesson.summary || '来自 AI Engineering from Scratch 核心课程的补充背景。';
      return '<article class="cert-deep-dive-row">' +
        '<div class="cert-deep-dive-badge">可选</div>' +
        '<div class="cert-lesson-copy"><h3>' + esc(title) + '</h3><p>' + esc(reason) + '</p></div>' +
        '<a class="cert-lesson-open" href="' + attr(lessonReferenceHref(path, track)) + '">打开课程 →</a>' +
      '</article>';
    }).join('');
  }

  function renderAssessments(track) {
    var mount = document.getElementById('trackAssessments');
    if (!mount) return;
    var assessments = Array.isArray(track.assessments) ? track.assessments : [];
    mount.classList.toggle('cert-two-card-grid', assessments.length === 2);
    mount.innerHTML = assessments.length ? assessments.map(function (meta) {
      var assessment = data().assessmentsById[meta.id] || meta;
      var best = assessmentBest(meta.id);
      var version = assessmentVersion(assessment);
      var attempts = assessmentAttempts(meta.id, version);
      var latest = attempts[0] || null;
      var count = assessment.questionCount || meta.questionCount || (Array.isArray(assessment.questions) ? assessment.questions.length : 0);
      var limit = assessment.timeLimitMinutes || meta.timeLimitMinutes || 0;
      return '<article class="cert-assessment-card"><div class="cert-assessment-head"><span class="cert-assessment-kind">' + esc(assessmentKindLabel(assessment.kind)) + '</span><span class="cert-card-code">' + count + ' 道题' + (limit ? ' · ' + limit + ' 分钟' : '') + '</span></div><h3>' + esc(assessment.title || meta.title || '练习测评') + '</h3><p>' + esc(assessment.summary || assessment.description || '原创场景练习，提交后提供反馈。') + '</p><div class="cert-assessment-best">' + (best ? '最佳练习得分：' + best.percent + '%' : '本设备尚未作答') + '</div><div class="cert-track-hero-actions"><a class="cert-action" href="assessment.html?id=' + encodeURIComponent(meta.id) + '">' + (latest ? '再做一次' : '开始练习') + '</a>' + (latest ? '<a class="cert-action secondary" href="assessment.html?id=' + encodeURIComponent(meta.id) + '&result=latest">查看最近结果</a>' : '') + '</div></article>';
    }).join('') : '<div class="cert-empty">这条路线的练习测评正在准备中。</div>';
  }

  function normalizePlans(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    return Object.keys(value).map(function (key) {
      var plan = value[key];
      if (typeof plan === 'string') return { title: key, description: plan };
      return Object.assign({ id: key, title: plan.title || key }, plan);
    });
  }

  function renderStudyPlans(track) {
    var mount = document.getElementById('trackStudyPlans');
    if (!mount) return;
    var plans = normalizePlans(track.studyPlans);
    mount.classList.toggle('cert-two-card-grid', plans.length === 2);
    mount.innerHTML = plans.length ? plans.map(function (plan) {
      var steps = plan.steps || plan.schedule || plan.weeks || plan.milestones || [];
      if (!Array.isArray(steps) && steps && typeof steps === 'object') {
        steps = Object.keys(steps).map(function (key) { return key + ': ' + steps[key]; });
      }
      if (!Array.isArray(steps)) steps = [];
      var pace = plan.duration || plan.pace || (plan.durationDays ? plan.durationDays + ' 天' : plan.id || '学习计划');
      var workload = plan.hoursPerWeek ? plan.hoursPerWeek + ' 小时/周' : '';
      return '<article class="cert-plan-card"><div class="cert-card-code">' + esc(pace) + '</div><h3>' + esc(plan.title || plan.label || plan.name || '学习计划') + '</h3><p>' + esc(plan.description || plan.summary || workload) + '</p>' + (steps.length ? '<ul>' + steps.map(function (step) { return '<li>' + esc(typeof step === 'string' ? step : step.title || step.name || JSON.stringify(step)) + '</li>'; }).join('') + '</ul>' : '') + '</article>';
    }).join('') : '<div class="cert-empty">默认按上面的课程顺序学习。</div>';
  }

  function normalizeQuestion(question, index) {
    var correct = question.correct;
    if (!Array.isArray(correct)) correct = correct == null ? [] : [correct];
    return {
      id: question.id || 'q-' + (index + 1),
      domain: question.domain || 'general',
      objective: question.objective || '',
      type: question.type === 'multiple' || correct.length > 1 ? 'multiple' : 'single',
      prompt: question.prompt || question.question || '',
      options: Array.isArray(question.options) ? question.options : [],
      correct: correct.map(Number).sort(function (a, b) { return a - b; }),
      explanation: question.explanation || '',
      references: Array.isArray(question.references) ? question.references : [],
    };
  }

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function validDraftForAssessment(draft, version, questions, limit) {
    if (!isRecord(draft) || !isRecord(draft.answers)) return false;
    if (String(draft.version) !== String(version)) return false;
    if (!isFiniteNumber(draft.startedAt) || draft.startedAt <= 0) return false;
    if (!isFiniteNumber(draft.deadlineAt) || draft.deadlineAt < 0) return false;
    var expectedDeadline = limit ? draft.startedAt + limit * 60000 : 0;
    if (draft.deadlineAt !== expectedDeadline) return false;

    var questionsById = Object.create(null);
    questions.forEach(function (question) { questionsById[question.id] = question; });
    return Object.keys(draft.answers).every(function (id) {
      var question = questionsById[id];
      var selected = draft.answers[id];
      if (!question || !Array.isArray(selected)) return false;
      if (question.type === 'single' && selected.length > 1) return false;
      var seen = {};
      return selected.every(function (choice) {
        if (!isFiniteNumber(choice) || Math.floor(choice) !== choice || choice < 0 || choice >= question.options.length || seen[choice]) return false;
        seen[choice] = true;
        return true;
      });
    });
  }

  function sameAnswers(a, b) {
    var left = (Array.isArray(a) ? a : []).map(Number).filter(isFiniteNumber).sort(function (x, y) { return x - y; });
    var right = (Array.isArray(b) ? b : []).map(Number).filter(isFiniteNumber).sort(function (x, y) { return x - y; });
    return left.length === right.length && left.every(function (value, index) { return value === right[index]; });
  }

  function scoreAssessmentAnswers(questions, answers) {
    var safeAnswers = isRecord(answers) ? answers : {};
    var correct = 0;
    var domains = {};
    questions.forEach(function (question) {
      var ok = sameAnswers(safeAnswers[question.id], question.correct);
      if (ok) correct++;
      if (!domains[question.domain]) domains[question.domain] = { correct: 0, total: 0 };
      domains[question.domain].total++;
      if (ok) domains[question.domain].correct++;
    });
    return {
      correct: correct,
      total: questions.length,
      percent: questions.length ? Math.round((correct / questions.length) * 100) : 0,
      domains: domains,
    };
  }

  function findAssessmentMeta(id) {
    var found = null;
    tracks().some(function (track) {
      var meta = (track.assessments || []).find(function (item) { return item.id === id; });
      if (!meta) return false;
      found = { meta: meta, track: track };
      return true;
    });
    return found;
  }

  function renderAssessment() {
    var id = query('id');
    var mount = document.getElementById('assessmentMount');
    var located = findAssessmentMeta(id);
    var assessment = data().assessmentsById[id];
    if (!mount) return;
    if (!assessment && located && located.meta.path && window.AIFSContentSource) {
      fetch(window.AIFSContentSource.repoUrl(located.meta.path)).then(function (response) {
        if (!response.ok) throw new Error('无法加载练习数据');
        return response.json();
      }).then(function (loaded) {
        assessment = Object.assign({}, loaded, located.meta, { id: id });
        renderAssessmentLoaded(mount, assessment, located.track);
      }).catch(function () { renderAssessmentError(mount); });
      return;
    }
    if (!assessment) {
      renderAssessmentError(mount);
      return;
    }
    var track = located ? located.track : findTrack(assessment.track);
    renderAssessmentLoaded(mount, assessment, track);
  }

  function renderAssessmentError(mount) {
    mount.innerHTML = '<div class="cert-error"><h1>未找到测评</h1><p>生成的认证数据中没有这套练习。</p><a class="cert-action" href="certifications.html">所有认证</a></div>';
  }

  function renderAssessmentLoaded(mount, assessment, track, forceForm) {
    var questions = (assessment.questions || []).map(normalizeQuestion);
    if (!questions.length) {
      mount.innerHTML = '<div class="cert-error"><h1>练习仍在编写</h1><p>这套测评已有元数据，但尚未加入题目。</p><a class="cert-action" href="' + (track ? 'certification.html?id=' + encodeURIComponent(track.id) : 'certifications.html') + '">返回路线</a></div>';
      return;
    }
    var title = assessment.title || '练习测评';
    var version = assessmentVersion(assessment);
    document.title = title + ' - AI Engineering from Scratch';
    var existing = assessmentAttempts(assessment.id, version);
    if (!forceForm && query('result') === 'latest' && existing && existing[0]) {
      renderAssessmentResults(mount, assessment, track, questions, existing[0]);
      return;
    }

    var limit = Number(assessment.timeLimitMinutes || 0);
    var draft = window.AIFSCertProgress && window.AIFSCertProgress.getDraft(assessment.id, version);
    if (draft && !validDraftForAssessment(draft, version, questions, limit)) {
      if (window.AIFSCertProgress) window.AIFSCertProgress.clearDraft(assessment.id, version);
      draft = null;
    }
    if (!draft) {
      var now = Date.now();
      draft = { answers: {}, startedAt: now, deadlineAt: limit ? now + limit * 60000 : 0, version: version };
      if (window.AIFSCertProgress) window.AIFSCertProgress.saveDraft(assessment.id, version, draft);
    }

    mount.innerHTML = '<div class="assessment-shell"><div class="cert-breadcrumb"><a href="certifications.html">认证</a><span>/</span>' + (track ? '<a href="certification.html?id=' + encodeURIComponent(track.id) + '">' + esc(track.examCode || track.shortName || track.id) + '</a><span>/</span>' : '') + '<span>练习</span></div><section class="assessment-hero"><div class="cert-eyebrow">' + esc(assessmentKindLabel(assessment.kind)) + '</div><h1>' + esc(title) + '</h1><p>' + esc(assessment.summary || assessment.description || '完成原创场景题后提交，即可查看解析和知识域反馈。') + '</p><p class="assessment-scoring-note">准备好后即可提交；未作答题目按错误计算。</p><div class="cert-meta-row">' + metaChip(questions.length + ' 道原创题') + metaChip(limit ? limit + ' 分钟限制' : '不限时') + metaChip(progressIsPersistent() ? '已保存到本地' : '进度仅在当前页面有效') + '</div></section>' +
      '<div class="cert-notice"><strong>仅为练习分数</strong><p>结果是本开源课程计算的百分比，不是官方量表分数、认证决定或通过保证。</p></div>' +
      (limit ? '<div class="cert-timer" id="assessmentTimer" role="timer" aria-live="off" aria-label="剩余时间"><span>剩余时间</span><strong id="assessmentTimerValue">' + formatRemaining(draft.deadlineAt - Date.now()) + '</strong></div>' : '') +
      '<form class="assessment-form" id="assessmentForm" tabindex="-1" aria-label="测评题目">' + questions.map(function (question, index) { return renderQuestion(question, index, draft.answers[question.id] || []); }).join('') + '<div class="cert-submit-row"><p>可以提交未完成的作答；未答题按错误计算，提交后显示解析。</p><button class="cert-action" type="submit">提交练习</button></div></form></div>';

    var form = document.getElementById('assessmentForm');
    form.addEventListener('change', function (event) {
      var input = event.target;
      if (!input.matches('input[data-question]')) return;
      var qid = input.getAttribute('data-question');
      var question = questions.find(function (item) { return item.id === qid; });
      if (!question) return;
      if (question.type === 'multiple') {
        draft.answers[qid] = Array.from(form.querySelectorAll('input[data-question="' + cssEscape(qid) + '"]:checked')).map(function (node) { return Number(node.value); });
      } else {
        draft.answers[qid] = [Number(input.value)];
      }
      Array.from(form.querySelectorAll('input[data-question="' + cssEscape(qid) + '"]')).forEach(function (node) {
        var option = node.closest('.cert-option');
        if (option) option.classList.toggle('is-selected', node.checked);
      });
      if (window.AIFSCertProgress) window.AIFSCertProgress.saveDraft(assessment.id, version, draft);
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitAssessment(mount, assessment, track, questions, draft, false);
    });
    startTimer(mount, assessment, track, questions, draft);
  }

  function cssEscape(value) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(value);
    return String(value).replace(/(["\\])/g, '\\$1');
  }

  function renderQuestion(question, index, selected) {
    var inputType = question.type === 'multiple' ? 'checkbox' : 'radio';
    selected = Array.isArray(selected) ? selected : [];
    return '<fieldset class="cert-question"><legend><div class="cert-question-head"><span class="cert-question-kicker">第 ' + (index + 1) + ' 题 · ' + esc(question.domain) + '</span><span class="cert-question-kicker">' + (question.type === 'multiple' ? '多选' : '单选') + '</span></div><div class="cert-question-prompt">' + esc(question.prompt) + '</div></legend><div class="cert-option-list">' + question.options.map(function (option, optionIndex) {
      var isSelected = selected.map(Number).indexOf(optionIndex) !== -1;
      var checked = isSelected ? ' checked' : '';
      return '<label class="cert-option' + (isSelected ? ' is-selected' : '') + '"><input type="' + inputType + '" name="question-' + attr(question.id) + '" value="' + optionIndex + '" data-question="' + attr(question.id) + '"' + checked + '><span>' + esc(option) + '</span></label>';
    }).join('') + '</div></fieldset>';
  }

  function formatRemaining(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var hours = Math.floor(total / 3600);
    var mins = Math.floor((total % 3600) / 60);
    var secs = total % 60;
    return (hours ? String(hours).padStart(2, '0') + ':' : '') + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function startTimer(mount, assessment, track, questions, draft) {
    if (assessmentTimer) clearInterval(assessmentTimer);
    if (!draft.deadlineAt) return;
    function tick() {
      var remaining = draft.deadlineAt - Date.now();
      var value = document.getElementById('assessmentTimerValue');
      var timer = document.getElementById('assessmentTimer');
      if (value) value.textContent = formatRemaining(remaining);
      if (timer) timer.classList.toggle('is-low', remaining <= 5 * 60000);
      if (remaining <= 0) {
        clearInterval(assessmentTimer);
        assessmentTimer = null;
        submitAssessment(mount, assessment, track, questions, draft, true);
      }
    }
    tick();
    assessmentTimer = setInterval(tick, 1000);
  }

  function submitAssessment(mount, assessment, track, questions, draft, timedOut) {
    if (assessmentTimer) {
      clearInterval(assessmentTimer);
      assessmentTimer = null;
    }
    var score = scoreAssessmentAnswers(questions, draft.answers);
    var submittedAt = Date.now();
    var attempt = {
      answers: draft.answers,
      correct: score.correct,
      total: score.total,
      percent: score.percent,
      domains: score.domains,
      startedAt: draft.startedAt,
      submittedAt: submittedAt,
      durationMs: submittedAt - draft.startedAt,
      timedOut: !!timedOut,
      version: assessmentVersion(assessment),
    };
    if (window.AIFSCertProgress) window.AIFSCertProgress.recordAttempt(assessment.id, assessmentVersion(assessment), attempt);
    renderAssessmentResults(mount, assessment, track, questions, attempt);
    updateAssessmentResultUrl(assessment.id, true);
    scrollToPageTop();
    focusWithoutScrolling(document.getElementById('assessmentResultsSummary'));
  }

  function renderRemediation(track, questions, attempt) {
    if (!attempt) return '';
    var groups = Object.create(null);
    var answers = isRecord(attempt.answers) ? attempt.answers : {};
    questions.forEach(function (question, index) {
      if (sameAnswers(answers[question.id] || [], question.correct)) return;
      var id = question.domain || 'general';
      if (!groups[id]) groups[id] = { id: id, references: [], paths: Object.create(null), reviewIds: [] };
      groups[id].reviewIds.push('review-' + (question.id || index + 1));
      question.references.forEach(function (ref) {
        var validated = validatedInternalLessonReference(ref);
        if (!validated || groups[id].paths[validated.path]) return;
        groups[id].paths[validated.path] = true;
        groups[id].references.push(ref);
      });
    });

    var recomputed = scoreAssessmentAnswers(questions, answers);
    var missed = Object.keys(groups).map(function (id) {
      var score = recomputed.domains[id] || { correct: 0, total: groups[id].reviewIds.length };
      var percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;
      groups[id].score = score;
      groups[id].percent = percent;
      return groups[id];
    }).sort(function (a, b) {
      return a.percent - b.percent;
    });
    if (!missed.length) return '';

    var cards = missed.map(function (item) {
      var domain = track && (track.domains || []).find(function (entry) { return entry.id === item.id; });
      var links = item.references.map(function (ref) {
        return '<li>' + renderInternalLessonReference(ref, track) + '</li>';
      }).join('');
      if (!links) {
        links = '<li><a href="#' + attr(item.reviewIds[0]) + '">查看错题解析 →</a></li>';
      }
      return '<article class="cert-remediation-domain"><h3>' + esc(domain ? domain.name : item.id) + '</h3><span>' + item.score.correct + '/' + item.score.total + ' · ' + item.percent + '%</span><ul class="cert-remediation-links">' + links + '</ul></article>';
    }).join('');

    return '<section class="cert-remediation" aria-labelledby="remediationTitle"><div class="cert-eyebrow">定向补强</div><h2 id="remediationTitle">复习做错的决策</h2><p>下面每节课都来自错题的内部引用。先复习对应决策，再开始一次新的练习。</p><div class="cert-remediation-grid">' + cards + '</div></section>';
  }

  function renderAssessmentResults(mount, assessment, track, questions, attempt) {
    var attemptAnswers = isRecord(attempt.answers) ? attempt.answers : {};
    var scoreSummary = scoreAssessmentAnswers(questions, attemptAnswers);
    var domainHtml = Object.keys(scoreSummary.domains).map(function (id) {
      var score = scoreSummary.domains[id];
      var percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;
      var domain = track && (track.domains || []).find(function (item) { return item.id === id; });
      return '<div class="cert-domain-score"><strong>' + esc(domain ? domain.name : id) + '</strong><span>' + score.correct + '/' + score.total + ' · ' + percent + '%</span></div>';
    }).join('');
    var remediationHtml = renderRemediation(track, questions, attempt);
    var latestResultHref = 'assessment.html?id=' + encodeURIComponent(assessment.id) + '&result=latest';
    mount.innerHTML = '<div class="assessment-shell cert-results"><div class="cert-breadcrumb"><a href="certifications.html">认证</a><span>/</span>' + (track ? '<a href="certification.html?id=' + encodeURIComponent(track.id) + '">' + esc(track.examCode || track.shortName || track.id) + '</a><span>/</span>' : '') + '<span>结果</span></div><section class="cert-results-summary" id="assessmentResultsSummary" tabindex="-1" aria-label="测评结果"><div class="cert-results-head"><div><div class="cert-eyebrow">练习结果</div><div class="cert-results-score">' + scoreSummary.percent + '%</div></div><div><strong>' + scoreSummary.correct + ' / ' + scoreSummary.total + ' 题完全正确</strong><p>' + (attempt.timedOut ? '计时结束时自动提交。' : '用时 ' + formatDuration(attempt.durationMs) + ' 后提交') + '</p></div></div><div class="cert-domain-score-grid">' + domainHtml + '</div><div class="cert-notice"><strong>不是官方量表分数</strong><p>这个百分比只衡量当前原创练习，不能预测或保证认证提供方的量表分数。</p></div><div class="cert-track-hero-actions"><button class="cert-action" type="button" id="assessmentRetake">开始新的作答</button><a class="cert-action secondary" href="' + attr(latestResultHref) + '">再次查看最近结果</a>' + (track ? '<a class="cert-action secondary" href="certification.html?id=' + encodeURIComponent(track.id) + '">返回路线</a>' : '') + '</div></section>' + remediationHtml + '<section aria-labelledby="reviewTitle"><div class="cert-section-heading"><div><div class="cert-eyebrow">复盘</div><h2 id="reviewTitle">决策与解析</h2></div><p>用每道错题定位需要复习的知识域和决策规则。</p></div>' + questions.map(function (question, index) { return renderReview(question, index, attemptAnswers[question.id] || [], track); }).join('') + '</section></div>';
    var retake = document.getElementById('assessmentRetake');
    if (retake) retake.addEventListener('click', function () {
      if (window.AIFSCertProgress) window.AIFSCertProgress.clearDraft(assessment.id, assessmentVersion(assessment));
      updateAssessmentResultUrl(assessment.id, false);
      renderAssessmentLoaded(mount, assessment, track, true);
      scrollToPageTop();
      focusWithoutScrolling(document.getElementById('assessmentForm'));
    });
  }

  function formatDuration(ms) {
    if (!isFiniteNumber(ms) || ms < 0) return '未知时长';
    var mins = Math.floor(ms / 60000);
    var secs = Math.floor((ms % 60000) / 1000);
    return mins + ' 分 ' + secs + ' 秒';
  }

  function renderReview(question, index, picked, track) {
    picked = Array.isArray(picked) ? picked : [];
    var ok = sameAnswers(picked, question.correct);
    var pickedLabels = picked.map(function (choice) { return question.options[Number(choice)] || ''; }).filter(Boolean);
    var correctLabels = question.correct.map(function (choice) { return question.options[Number(choice)] || ''; }).filter(Boolean);
    var refs = question.references.map(function (ref) {
      if (typeof ref === 'string') {
        if (/^https?:\/\//i.test(ref)) {
          var sourceLabel = '外部来源';
          try {
            var sourceUrl = new URL(ref);
            sourceLabel = (/\.pdf$/i.test(sourceUrl.pathname) ? '考试指南' : sourceUrl.hostname.replace(/^www\./, '')) + ' ↗';
          } catch (_) {}
          return '<li><a href="' + attr(ref) + '" target="_blank" rel="noopener">' + esc(sourceLabel) + '</a></li>';
        }
        if (/^(certifications|phases)\//.test(ref)) {
          var internalLink = renderInternalLessonReference(ref, track);
          return internalLink ? '<li>' + internalLink + '</li>' : '<li>' + esc(ref) + '</li>';
        }
        return '<li>' + esc(ref) + '</li>';
      }
      if (!ref) return '';
      var label = ref.label || ref.title || ref.url || ref.path || '参考资料';
      if (ref.url) return '<li><a href="' + attr(ref.url) + '" target="_blank" rel="noopener">' + esc(label) + ' ↗</a></li>';
      if (ref.path) {
        var objectLink = renderInternalLessonReference(ref, track);
        return objectLink ? '<li>' + objectLink + '</li>' : '<li>' + esc(label) + '</li>';
      }
      return '<li>' + esc(label) + '</li>';
    }).join('');
    return '<article class="cert-review ' + (ok ? 'is-correct' : 'is-wrong') + '" id="review-' + attr(question.id || index + 1) + '"><div class="cert-question-kicker">第 ' + (index + 1) + ' 题 · ' + esc(question.domain) + ' · ' + (ok ? '正确' : '复习') + '</div><h3>' + esc(question.prompt) + '</h3><div class="cert-review-answer"><strong>你的答案</strong><p>' + esc(pickedLabels.length ? pickedLabels.join('；') : '未作答') + '</p></div>' + (!ok ? '<div class="cert-review-answer"><strong>正确答案</strong><p>' + esc(correctLabels.join('；')) + '</p></div>' : '') + '<div class="cert-review-explanation"><strong>解析</strong><p>' + esc(question.explanation || '尚未添加解析。') + '</p></div>' + (refs ? '<ul class="cert-reference-list">' + refs + '</ul>' : '') + '</article>';
  }

  function init() {
    initTheme();
    var page = document.body.getAttribute('data-cert-page');
    if (page === 'catalog') renderCatalog();
    else if (page === 'track') renderTrack();
    else if (page === 'assessment') renderAssessment();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
