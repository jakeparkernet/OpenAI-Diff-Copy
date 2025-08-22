
// Diff Copy (Patched) — content script (v0.4.2)
// Change from 0.4.1: for table-style diffs ([data-diff-header]), if no Copy button is found,
// place the button inside the header actions container `.ms-auto.flex.items-center`
// (instead of using the below-bar fallback). Everything else is unchanged.

(() => {
  const TABLE = {
    CONTAINER_SELECTOR: '[data-diff-header]',
    ROW_SELECTOR: 'tr.diff-line',
    OP_SELECTOR: '.diff-line-content-operator',
    RAW_SELECTOR: '.diff-line-syntax-raw',
    ITEM_SELECTOR: '.diff-line-content-item'
  };
  const CODE = { CODE_SELECTOR: 'code.language-diff, code[class*="language-diff"]' };
  const CM   = { CONTENT_SELECTOR: '.cm-editor .cm-content', LINE_SELECTOR: '.cm-line' };

  // ---------- helpers ----------
  const visible = (el) => !!(el && el.offsetParent !== null);
  function sanitizeLine(text) {
    return (text || '').replace(/\r/g, '').replace(/\u200b/g, '').replace(/\n+$/g, '');
  }
  function isDiffMeta(lineTrim) {
    return /^(?:--- |\+\+\+ |@@|diff --git|index )/.test(lineTrim);
  }

  // ---------- extractors ----------
  function extractFromTable(container) {
    const table = container.querySelector(TABLE.ROW_SELECTOR)?.closest('table');
    if (!table) return '';
    const rows = table.querySelectorAll(TABLE.ROW_SELECTOR);
    const lines = [];
    rows.forEach(row => {
      const opEl = row.querySelector(TABLE.OP_SELECTOR);
      const op = (opEl && (opEl.getAttribute('data-operator') || opEl.textContent.trim())) || '';
      if (op === '-') return;
      const raw = row.querySelector(TABLE.RAW_SELECTOR);
      const item = row.querySelector(TABLE.ITEM_SELECTOR);
      let text = raw ? raw.textContent : (item ? item.textContent : '');
      lines.push(sanitizeLine(text));
    });
    return lines.join('\n');
  }
  function commonExtractFromText(fullText) {
    const text = (fullText || '').replace(/\r/g, '');
    const out = [];
    for (const line of text.split('\n')) {
      const ltrim = line.replace(/^\s+/, '');
      if (isDiffMeta(ltrim)) continue;
      const first = ltrim.charAt(0);
      if (first === '-') continue;
      if (first === '+') out.push(sanitizeLine(line.replace(/^(\s*)\+\s?/, '$1')));
      else out.push(sanitizeLine(line));
    }
    return out.join('\n');
  }
  const extractFromCode = (codeEl) => commonExtractFromText(codeEl.innerText || '');
  function extractFromCM(contentEl) {
    const parts = [];
    contentEl.querySelectorAll(CM.LINE_SELECTOR).forEach(lineEl => parts.push(lineEl.textContent || ''));
    return commonExtractFromText(parts.join('\n'));
  }

  // ---------- copy button targeting (chat/canvas) ----------
  function findCopyCandidates(anchor) {
    const scope = anchor.closest('article') || document;
    const all = Array.from(scope.querySelectorAll('button[aria-label="Copy"]'));
    return all.filter(visible);
  }
  function nearestByGeometry(anchor, candidates) {
    if (!candidates.length) return null;
    const ar = anchor.getBoundingClientRect();
    let best = null;
    let bestScore = Infinity;
    for (const c of candidates) {
      const cr = c.getBoundingClientRect();
      const dy = Math.max(0, ar.top - cr.bottom) + Math.max(0, cr.top - ar.bottom);
      const dx = Math.abs((cr.left + cr.right) / 2 - (ar.left + ar.right) / 2);
      const score = dy * 1000 + dx;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  }
  function insertionHostForCopy(copyBtn) {
    const hoverWrap = copyBtn.closest('.hover\\:text-token-text-primary');
    return hoverWrap || copyBtn;
  }
  function insertAfter(target, node) {
    target.parentNode.insertBefore(node, target.nextSibling);
  }

  // ---------- UI ----------
  function makeButton(getText) {
    const btn = document.createElement('button');
    btn.className = '__diffCopyPatchedBtn flex gap-1 items-center select-none px-1.5 py-1';
    btn.textContent = 'Copy Patched';
    btn.setAttribute('aria-label', 'Copy Patched');
    Object.assign(btn.style, {
      font: '12px/1.2 system-ui, sans-serif',
      borderRadius: '6px',
      border: '1px solid rgba(0,0,0,0.15)',
      background: 'rgba(0,0,0,0.04)',
      cursor: 'pointer',
      marginLeft: '8px',
      whiteSpace: 'nowrap',
      order: '9999'
    });
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = getText();
      try {
        await navigator.clipboard.writeText(text);
        flash(btn, 'Copied!');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        try { document.execCommand('copy'); flash(btn, 'Copied!'); }
        catch { flash(btn, 'Copy failed'); }
        finally { document.body.removeChild(ta); }
      }
    });
    return btn;
  }
  function flash(btn, msg) {
    const old = btn.textContent;
    btn.textContent = msg; btn.disabled = true;
    setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1200);
  }
  function ensureSingleIn(container) {
    const all = container.querySelectorAll('.__diffCopyPatchedBtn');
    if (all.length > 1) for (let i = 0; i < all.length - 1; i++) all[i].remove();
  }

  // New: header actions placement for table-style diffs
  function placeInHeaderActions(container, getText) {
    // Typical header actions container:
    // <div class="ms-auto flex items-center ...">
    const actions = container.querySelector('.ms-auto.flex.items-center');
    if (!actions) return false;
    actions.appendChild(makeButton(getText));
    ensureSingleIn(actions);
    return true;
  }

  function placeNextToCopy(anchor, getText) {
    const candidates = findCopyCandidates(anchor);
    const copyBtn = nearestByGeometry(anchor, candidates);
    if (!copyBtn) return false;
    const host = insertionHostForCopy(copyBtn);
    insertAfter(host, makeButton(getText));
    ensureSingleIn(host.parentElement || host);
    return true;
  }

  function insertBelowBar(anchorEl, getText) {
    const block = anchorEl.closest('pre, .code-block, .code, .markdown, .prose, .cm-editor') || anchorEl;
    let bar = block && block.parentNode && block.parentNode.querySelector(':scope > .__diffCopyBelowBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = '__diffCopyBelowBar';
      Object.assign(bar.style, { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' });
      if (block && block.parentNode) block.parentNode.insertBefore(bar, block.nextSibling);
    }
    const btn = makeButton(getText);
    bar.appendChild(btn);
  }

  function rehomeIfCopyAppears(anchor, getText) {
    const below = (anchor.closest('article') || document).querySelector('.__diffCopyBelowBar .__diffCopyPatchedBtn');
    if (!below) return;
    if (placeNextToCopy(anchor, getText)) {
      const bar = below.parentElement;
      below.remove();
      if (bar && !bar.querySelector('.__diffCopyPatchedBtn')) bar.remove();
    }
  }

  // ---------- enhancers ----------
  function enhanceTableContainer(container) {
    if (container.dataset.__diffCopyEnhanced === '1') return;
    container.dataset.__diffCopyEnhanced = '1';
    const getter = () => extractFromTable(container);
    // 1) Try Copy button
    if (placeNextToCopy(container, getter)) return;
    // 2) NEW: try the header actions container
    if (placeInHeaderActions(container, getter)) return;
    // 3) Fallback
    insertBelowBar(container, getter);
  }
  function enhanceCodeBlock(codeEl) {
    if (codeEl.dataset.__diffCopyEnhanced === '1') return;
    codeEl.dataset.__diffCopyEnhanced = '1';
    const getter = () => extractFromCode(codeEl);
    if (!placeNextToCopy(codeEl, getter)) insertBelowBar(codeEl, getter);
  }
  function enhanceCodeMirror(cmContent) {
    if (cmContent.dataset.__diffCopyEnhanced === '1') return;
    cmContent.dataset.__diffCopyEnhanced = '1';
    const getter = () => extractFromCM(cmContent);
    if (!placeNextToCopy(cmContent, getter)) insertBelowBar(cmContent, getter);
  }

  // ---------- scanning ----------
  function scan() {
    document.querySelectorAll(TABLE.CONTAINER_SELECTOR).forEach(enhanceTableContainer);
    document.querySelectorAll(CODE.CODE_SELECTOR).forEach(enhanceCodeBlock);
    document.querySelectorAll(CM.CONTENT_SELECTOR).forEach(enhanceCodeMirror);

    document.querySelectorAll(CODE.CODE_SELECTOR + ',' + CM.CONTENT_SELECTOR + ',' + TABLE.CONTAINER_SELECTOR).forEach(anchor => {
      const getText = anchor.matches(CODE.CODE_SELECTOR)
        ? () => extractFromCode(anchor)
        : anchor.matches(CM.CONTENT_SELECTOR)
          ? () => extractFromCM(anchor)
          : () => extractFromTable(anchor);
      rehomeIfCopyAppears(anchor, getText);
    });
  }
  const obs = new MutationObserver(() => scan());
  obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
  scan();
})();
