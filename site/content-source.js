/**
 * Resolve repository content for static pages.
 *
 * Local previews are served from the repository root, so ../ reaches lesson
 * and assessment source files directly. Deploys keep the existing branch-aware
 * raw GitHub behavior through build-meta.js.
 */
(function () {
  'use strict';

  var REPO_RAW = 'https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/';

  function isLocal() {
    var host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  }

  function clean(path) {
    var value = String(path || '');
    // 这些路径来自 URL query/manifest；只允许仓库内已知课程树，拒绝编码或解码后的跳转语义。
    if (!value || /[%\\?#]/.test(value) || /^\//.test(value) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(value) || /\/\//.test(value)) {
      throw new Error('Invalid repository content path');
    }
    var allowed = /^(?:phases\/[a-z0-9-]+\/[a-z0-9-]+|certifications\/claude\/(?:lessons\/[a-z0-9-]+|assessments\/[a-z0-9-]+))(?:\/[A-Za-z0-9._-]+)*$/;
    if (!allowed.test(value)) throw new Error('Repository content path is outside the allowed lesson trees');
    return value;
  }

  function hasDotSegment(value) {
    return String(value || '').split('/').some(function (segment) {
      return segment === '.' || segment === '..';
    });
  }

  function rawRepoUrl(path) {
    var safe = clean(path);
    var configured = window.__AIFS_SOURCE || {};
    var owner = /^[A-Za-z0-9-]+$/.test(configured.owner || '') ? configured.owner : 'fancyboi999';
    var repo = /^[A-Za-z0-9_.-]+$/.test(configured.repo || '') && !hasDotSegment(configured.repo)
      ? configured.repo
      : 'ai-engineering-from-scratch-zh';
    var fallbackRevision = /^[A-Za-z0-9._/-]+$/.test(window.__AIFS_REF || '') && !hasDotSegment(window.__AIFS_REF)
      ? window.__AIFS_REF
      : 'main';
    var revision = /^[A-Za-z0-9._/-]+$/.test(configured.revision || '') && !hasDotSegment(configured.revision)
      ? configured.revision
      : fallbackRevision;
    return 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + revision + '/' + safe;
  }

  function repoUrl(path) {
    var safe = clean(path);
    var locationPath = window.location.pathname || new URL(window.location.href).pathname;
    if (isLocal() && locationPath.indexOf('/lessons/') !== 0) return '../' + safe;
    return rawRepoUrl(safe);
  }

  function localDirectoryFiles(path) {
    if (!isLocal()) return Promise.reject(new Error('Local directory listing is unavailable'));
    var locationPath = window.location.pathname || new URL(window.location.href).pathname;
    if (locationPath.indexOf('/lessons/') === 0) {
      return Promise.reject(new Error('Pre-rendered lessons use the repository fallback for directory listings'));
    }

    var safe = clean(path).replace(/\/+$/, '');
    if (!safe || /\\/.test(safe)) return Promise.reject(new Error('Invalid local directory path'));

    var expectedUrl = new URL(repoUrl(safe) + '/', window.location.href);
    return fetch(expectedUrl.href, { headers: { 'Accept': 'text/html' } }).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));

      var responseUrl = new URL(res.url);
      if (responseUrl.origin !== expectedUrl.origin || responseUrl.pathname !== expectedUrl.pathname) {
        throw new Error('Unexpected local directory response');
      }

      return res.text().then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var heading = doc.querySelector('h1');
        var indexLabel = (doc.title + ' ' + (heading ? heading.textContent : '')).trim();
        if (!/(?:directory listing for|index of)/i.test(indexLabel)) {
          throw new Error('Local server does not expose directory listings');
        }

        var files = [];
        doc.querySelectorAll('a[href]').forEach(function (link) {
          var href = link.getAttribute('href');
          var fileUrl;
          try {
            fileUrl = new URL(href, responseUrl.href);
          } catch (_) {
            return;
          }

          if (fileUrl.origin !== expectedUrl.origin || fileUrl.search || fileUrl.hash) return;
          if (fileUrl.pathname.indexOf(expectedUrl.pathname) !== 0 || /\/$/.test(fileUrl.pathname)) return;

          var encodedName = fileUrl.pathname.slice(expectedUrl.pathname.length);
          var name;
          try {
            name = decodeURIComponent(encodedName);
          } catch (_) {
            return;
          }
          if (!name || /[\\/]/.test(name)) return;

          files.push({
            name: name,
            path: safe + '/' + name,
            size: 0,
            html_url: fileUrl.href,
            download_url: fileUrl.href,
          });
        });

        return Promise.all(files.map(function (file) {
          return fetch(file.download_url, { method: 'HEAD' }).then(function (head) {
            var size = Number(head.headers.get('content-length'));
            if (head.ok && isFinite(size) && size >= 0) file.size = size;
            return file;
          }).catch(function () {
            return file;
          });
        }));
      });
    });
  }

  function mergeLessonOutputs(lessonPath, directoryEntries, artifacts) {
    var lesson = clean(lessonPath).replace(/\/+$/, '');
    var liveEntries = Array.isArray(directoryEntries) ? directoryEntries : [];
    if (!lesson) return liveEntries.slice();

    var prefix = lesson + '/outputs/';
    var selected = (Array.isArray(artifacts) ? artifacts : []).filter(function (artifact) {
      var artifactLesson = clean(artifact && artifact.lessonPath).replace(/\/+$/, '');
      var artifactFile = clean(artifact && artifact.file).replace(/\/+$/, '');
      return artifactLesson === lesson && artifactFile.indexOf(prefix) === 0;
    });
    var artifactByPath = Object.create(null);
    selected.forEach(function (artifact, index) {
      artifactByPath[clean(artifact.file).replace(/\/+$/, '')] = index;
      if (artifact.bundlePath) {
        artifactByPath[clean(artifact.bundlePath).replace(/\/+$/, '')] = index;
      }
    });

    var seen = Object.create(null);
    var merged = [];
    liveEntries.forEach(function (entry) {
      var entryPath = clean(entry && entry.path).replace(/\/+$/, '');
      if (!entryPath && entry && entry.name) {
        entryPath = prefix + clean(entry.name).replace(/\/+$/, '');
      }
      var index = Object.prototype.hasOwnProperty.call(artifactByPath, entryPath)
        ? artifactByPath[entryPath]
        : -1;
      if (index < 0) {
        merged.push(entry);
      } else if (!seen[index]) {
        merged.push(selected[index]);
        seen[index] = true;
      }
    });
    selected.forEach(function (artifact, index) {
      if (!seen[index]) merged.push(artifact);
    });
    return merged;
  }

  window.AIFSContentSource = {
    isLocal: isLocal,
    repoUrl: repoUrl,
    rawRepoUrl: rawRepoUrl,
    localDirectoryFiles: localDirectoryFiles,
    mergeLessonOutputs: mergeLessonOutputs,
  };
}());
