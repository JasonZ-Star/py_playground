# 视觉/交互 + 性能全面修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 26 issues across visual/UX, performance, SW caching, and dead code cleanup in the 枫下代码 Python playground.

**Architecture:** All changes touch 4 files — `styles.css` (CSS variables, new classes, dead code removal), `index.html` (inline style migration, JS performance fixes), `sw.js` (cache list, version fallback, worker caching), and `.gitignore` (dead code cleanup). No new files created except CSS classes appended to existing `styles.css`.

**Tech Stack:** Vanilla CSS, vanilla JS, Service Worker API, Monaco Editor, LZ-String compression.

---

## File Structure

| File | Changes |
|------|---------|
| `styles.css` | Add CSS variables (tooltip, status colors), add utility classes (`.muted`, `.text-warning`, `.text-accent`, `.notification-container`), fix hardcoded values, remove dead rules, add focus-visible, add inline-migrated classes |
| `index.html` | Remove inline styles → use CSS classes, fix LZ-String cache, output buffer, template selector hover, Monaco dedup, worker timeout, inline onclick, notification container, share modal colors |
| `sw.js` | Add `styles.css` to precache, fix version fallback, cache worker on network success |
| `.gitignore` | Add `scripts/` directory |
| `scripts/` | Delete entirely |

---

## Task 1: Quick Fixes — CSS, SW, Dead Code (Batch 1)

### Files:
- Modify: `styles.css:214`
- Modify: `sw.js:3,5-14`
- Modify: `.gitignore`
- Delete: `scripts/` directory

- [ ] **Step 1: Fix hardcoded border-radius (A3)**

In `styles.css`, line 214, change:
```css
border-radius: 6px;
```
to:
```css
border-radius: var(--radius-sm);
```

- [ ] **Step 2: Add `styles.css` to SW precache (B1)**

In `sw.js`, add `'./styles.css'` to `CORE_ASSETS` array:
```javascript
const CORE_ASSETS = [
    './',
    './index.html',
    './templates.js',
    './py-worker.js',
    './styles.css',
    './fonts/local-fonts.css',
    './share.html',
    './404.html',
    './site.webmanifest'
];
```

- [ ] **Step 3: Fix SW version fallback (C3)**

In `sw.js`, line 3, change:
```javascript
let CURRENT_CACHE = CACHE_PREFIX + '0';
```
to:
```javascript
let CURRENT_CACHE = CACHE_PREFIX + 'dev';
```

This avoids sharing cache name `v0` across all failed-fetch deployments.

- [ ] **Step 4: Delete scripts/ directory (D1)**

Delete the entire `scripts/` directory and its contents:
- `scripts/fix-css.py`, `scripts/fix-css.log`
- `scripts/fix-css.ps1`
- `scripts/fix-css2.py`, `scripts/fix-css2.log`
- `scripts/fix-css3.py`
- `scripts/fix-css4.py`, `scripts/fix-css4.log`
- `scripts/fix-final.py`, `scripts/fix-final.log`
- `scripts/orig-index.html`

- [ ] **Step 5: Update .gitignore (D1)**

Add `scripts/` to `.gitignore`:
```
.idea
/monaco
/pyodide
scripts/
```

- [ ] **Step 6: Commit**

```bash
git add styles.css sw.js .gitignore
git rm -r scripts/
git commit -m "fix: 快速修 — border-radius变量、SW缓存styles.css、版本回退、清理死代码"
```

- [ ] **Step 7: Verify**

Open `http://localhost:5500/` in browser:
1. DevTools → Application → Cache Storage → confirm `styles.css` is in the precache list
2. Share button → confirm share modal `.share-type-btn` border-radius still looks correct
3. Confirm `scripts/` directory no longer exists

---

## Task 2: CSS Variables — Tooltip, Status Colors (Batch 2a/2e)

### Files:
- Modify: `styles.css` (`:root` and `.dark-mode` blocks, notification/status rules, Monaco error glyph)

- [ ] **Step 1: Add tooltip variables (A1)**

In `styles.css`, in the `:root` block (after line 33), add:
```css
--tooltip-bg: #18181b;
--tooltip-fg: #fafafa;
```

In the `.dark-mode` block (after line 52), add:
```css
--tooltip-bg: #e4e4e7;
--tooltip-fg: #18181b;
```

- [ ] **Step 2: Add status color variables (A2)**

In `:root`, add:
```css
--color-success: #22c55e;
--color-error: #ef4444;
--color-warning: #f59e0b;
```

(These are the same in both light and dark mode — no dark-mode override needed.)

- [ ] **Step 3: Apply tooltip variables**

In line 80, change:
```css
background: #18181b; color: #fafafa;
```
to:
```css
background: var(--tooltip-bg); color: var(--tooltip-fg);
```

In line 82, remove the dark-mode override entirely:
```css
/* DELETE: .dark-mode .icon-button[data-tooltip]::after { background: #27272a; } */
```

- [ ] **Step 4: Apply status color variables**

Replace in `styles.css`:
- Line 179: `#22c55e` → `var(--color-success)`
- Line 180: `#ef4444` → `var(--color-error)`
- Line 186: `#22c55e` → `var(--color-success)`
- Line 187: `#ef4444` → `var(--color-error)`
- Line 189: `#f59e0b` → `var(--color-warning)`
- Line 240: `#ef4444` → `var(--color-error)`

- [ ] **Step 5: Commit**

```bash
git add styles.css
git commit -m "feat: tooltip暗色可见 + 状态颜色CSS变量"
```

- [ ] **Step 6: Verify**

1. Switch to dark mode → hover over header icon buttons → tooltip should show light background with dark text (visible)
2. Switch to light mode → hover → tooltip shows dark background with light text
3. Run Python code with error → error status dot should still show red

---

## Task 3: Utility Classes, Focus-Visible, Dead CSS (Batch 2b-2g)

### Files:
- Modify: `styles.css`

- [ ] **Step 1: Add `.muted` class (A6)**

After the `.badge.hidden` rule (line 237), add:
```css
.muted { color: var(--muted); }
```

- [ ] **Step 2: Add `.text-warning` and `.text-accent` classes (B6 prep)**

```css
.text-warning { color: var(--color-warning); }
.text-accent { color: var(--accent); }
```

- [ ] **Step 3: Add modal button focus-visible (A7)**

After `.modal-footer .btn-secondary:hover` (line 203), add:
```css
.modal-footer button:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
```

- [ ] **Step 4: Add `.ts-search` focus-visible ring (A8)**

In `.ts-search:focus` (line 115), change:
```css
.ts-search:focus { border-color:var(--fg); }
```
to:
```css
.ts-search:focus { border-color:var(--fg); box-shadow: 0 0 0 3px var(--accent-subtle); }
```

- [ ] **Step 5: Clean dead `#template-selector` CSS (A4/A5)**

Remove the visible `#template-selector` rule block at lines 99-101 (the hover and focus rules). Keep the hiding rule at line 109. Also remove `#template-selector` from the 480px media query at line 303:
```css
/* DELETE line 303: #template-selector{font-size:12px;padding:7px 32px 7px 8px} */
```

- [ ] **Step 6: Unify `.share-type-btn` transition (A12)**

In `.share-type-btn` (line 223), change:
```css
transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
```
to:
```css
transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
```

- [ ] **Step 7: Add notification container class (B2 prep)**

```css
#notification-container { position:fixed; bottom:20px; right:20px; display:flex; flex-direction:column-reverse; gap:8px; z-index:1000; pointer-events:none; }
```

- [ ] **Step 8: Commit**

```bash
git add styles.css
git commit -m "feat: .muted类、focus-visible、死CSS清理、transition统一、通知容器类"
```

- [ ] **Step 9: Verify**

1. Open data manager → muted text should now appear gray
2. Tab through share modal buttons → focus-visible ring should appear on all buttons
3. Open template dropdown → search input should show focus ring

---

## Task 4: Inline Style Migration (Batch 2h)

### Files:
- Modify: `styles.css` (add new classes)
- Modify: `index.html` (replace inline styles with classes)

- [ ] **Step 1: Add noscript fallback classes to `styles.css`**

```css
/* Noscript fallback */
.noscript-fallback { position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#fafafa;font-family:system-ui,sans-serif;padding:24px;text-align:center;z-index:10000; }
.noscript-inner { max-width:420px; }
.noscript-inner h1 { margin:0 0 12px;font-size:20px; }
.noscript-inner p { margin:0;font-size:14px;color:#a1a1aa;line-height:1.6; }
```

Note: noscript content is shown before JS/CSS loads, so these MUST use hardcoded colors (no CSS variables available).

- [ ] **Step 2: Add share modal classes to `styles.css`**

```css
.share-url-input { width:100%; padding:8px; border:1px solid var(--panel-border); border-radius:var(--radius-sm); font-family:var(--font-mono); font-size:12px; background:var(--panel-bg); color:var(--fg); }
.share-info { margin-top:8px; font-size:12px; color:var(--muted); line-height:1.5; }
```

- [ ] **Step 3: Add settings modal classes to `styles.css`**

```css
.settings-row { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.settings-row label { min-width:90px; }
.settings-row input[type="range"] { flex:1; }
.settings-row .settings-value { width:60px; text-align:right; }
```

- [ ] **Step 4: Add data manager classes to `styles.css`**

```css
.data-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:10px; }
.data-hint { font-size:12px; }
.data-section { margin-top:12px; }
.data-title { font-weight:600; }
```

- [ ] **Step 5: Replace noscript inline styles in `index.html`**

Replace lines 78-83:
```html
<noscript>
    <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#fafafa;font-family:system-ui,sans-serif;padding:24px;text-align:center;z-index:10000;">
        <div style="max-width:420px;">
            <h1 style="margin:0 0 12px;font-size:20px;">需要启用 JavaScript</h1>
            <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">枫下代码是基于 WebAssembly + Web Worker 的 Python 运行环境，请先在浏览器中启用 JavaScript 后再访问。</p>
        </div>
    </div>
</noscript>
```
with:
```html
<noscript>
    <div class="noscript-fallback">
        <div class="noscript-inner">
            <h1>需要启用 JavaScript</h1>
            <p>枫下代码是基于 WebAssembly + Web Worker 的 Python 运行环境，请先在浏览器中启用 JavaScript 后再访问。</p>
        </div>
    </div>
</noscript>
```

- [ ] **Step 6: Replace footer inline style in `index.html`**

Line 130, change:
```html
<footer class="site-footer" role="contentinfo" style="flex:0 0 auto;">
```
to:
```html
<footer class="site-footer" role="contentinfo">
```

(The `.site-footer` already has `margin-top:auto` which handles the layout; `flex:0 0 auto` is redundant in a flex column with `overflow:hidden`.)

- [ ] **Step 7: Replace share-url inline style in `index.html`**

Line 137, change:
```html
<input type="text" id="share-url" readonly aria-label="分享链接" style="width: 100%; padding: 8px; border: 1px solid var(--panel-border); border-radius: 6px; font-family: monospace; font-size: 12px; background: var(--panel-bg); color: var(--fg);">
```
to:
```html
<input type="text" id="share-url" readonly aria-label="分享链接" class="share-url-input">
```

- [ ] **Step 8: Replace share-info inline style in `index.html`**

Line 148, change:
```html
<p id="share-info" style="margin-top:8px;font-size:12px;color:var(--muted);line-height:1.5;"></p>
```
to:
```html
<p id="share-info" class="share-info"></p>
```

- [ ] **Step 9: Replace settings modal inline styles in `index.html`**

Lines 178-187, change:
```html
<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
    <label for="editor-font-slider" style="min-width:90px;">编辑器字号</label>
    <input type="range" id="editor-font-slider" min="10" max="32" step="1" style="flex:1;">
    <span id="editor-font-value" style="width:60px;text-align:right;">18px</span>
</div>
<div style="display:flex;align-items:center;gap:10px;">
    <label for="output-font-slider" style="min-width:90px;">输出区域字号</label>
    <input type="range" id="output-font-slider" min="10" max="28" step="1" style="flex:1;">
    <span id="output-font-value" style="width:60px;text-align:right;">15px</span>
</div>
```
to:
```html
<div class="settings-row">
    <label for="editor-font-slider">编辑器字号</label>
    <input type="range" id="editor-font-slider" min="10" max="32" step="1">
    <span id="editor-font-value" class="settings-value">18px</span>
</div>
<div class="settings-row">
    <label for="output-font-slider">输出区域字号</label>
    <input type="range" id="output-font-slider" min="10" max="28" step="1">
    <span id="output-font-value" class="settings-value">15px</span>
</div>
```

- [ ] **Step 10: Replace data manager inline styles in `index.html`**

Lines 201-208, change:
```html
<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
    <button class="tiny-button" id="refresh-data-list">刷新</button>
    <button class="tiny-button" id="upload-data-from-modal">上传文件</button>
    <span class="muted" style="font-size:12px;">支持 CSV/TXT 预览</span>
</div>
<div id="data-file-list" class="file-list" aria-live="polite">正在加载…</div>
<div style="margin-top:12px;">
    <label for="preview-editor-container" style="font-weight:600;">预览</label>
```
to:
```html
<div class="data-toolbar">
    <button class="tiny-button" id="refresh-data-list">刷新</button>
    <button class="tiny-button" id="upload-data-from-modal">上传文件</button>
    <span class="muted data-hint">支持 CSV/TXT 预览</span>
</div>
<div id="data-file-list" class="file-list" aria-live="polite">正在加载…</div>
<div class="data-section">
    <label for="preview-editor-container" class="data-title">预览</label>
```

- [ ] **Step 11: Commit**

```bash
git add styles.css index.html
git commit -m "refactor: 迁移28+内联样式到CSS类"
```

- [ ] **Step 12: Verify**

1. Open page → noscript fallback should look the same (test by disabling JS briefly)
2. Share modal → input and info text should look identical
3. Settings modal → sliders and labels should be aligned
4. Data manager → toolbar and preview section should look identical

---

## Task 5: LZ-String Cache Fix (Batch 3a)

### Files:
- Modify: `index.html` (LZ-String `_getBaseValue` function)

- [ ] **Step 1: Fix the cache variable scope (B8)**

In `index.html`, find the LZ-String block starting at line 225. Change:
```javascript
(function(global){
    var f=String.fromCharCode;
    var LZString={
        _keyStrUriSafe:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",
        _getBaseValue:function(alphabet, character){
            var baseReverseDic = {};
            if (!baseReverseDic[alphabet]){
                baseReverseDic[alphabet] = {};
                for (var i=0; i<alphabet.length; i++){
                    baseReverseDic[alphabet][alphabet.charAt(i)] = i;
                }
            }
            return baseReverseDic[alphabet][character];
        },
```
to:
```javascript
(function(global){
    var f=String.fromCharCode;
    var baseReverseDic = {};
    var LZString={
        _keyStrUriSafe:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",
        _getBaseValue:function(alphabet, character){
            if (!baseReverseDic[alphabet]){
                baseReverseDic[alphabet] = {};
                for (var i=0; i<alphabet.length; i++){
                    baseReverseDic[alphabet][alphabet.charAt(i)] = i;
                }
            }
            return baseReverseDic[alphabet][character];
        },
```

The only change: move `var baseReverseDic = {};` from inside `_getBaseValue` to the IIFE scope (one line above `var LZString={`).

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "perf: 修复LZ-String缓存失效 — baseReverseDic提升到闭包顶层"
```

- [ ] **Step 3: Verify**

1. Open page, write some code, click Share
2. Copy the long URL, open in a new tab → should decode and load correctly
3. Open DevTools Console → no errors related to LZ-String

---

## Task 6: Output Buffer (Batch 3b)

### Files:
- Modify: `index.html` (WorkerClient class)

- [ ] **Step 1: Add buffer fields to constructor (B3)**

In the `WorkerClient` constructor (line 666), find:
```javascript
class WorkerClient { constructor(workerPath, outputEl, progressEl){ this.workerPath=workerPath; this.worker=null; this.reqId=1; this.pending=new Map(); this.outputEl=outputEl; this.progressEl=progressEl; this.indexURL='pyodide/'; this.jediReady=false; this.interruptView=null; }
```
change to:
```javascript
class WorkerClient { constructor(workerPath, outputEl, progressEl){ this.workerPath=workerPath; this.worker=null; this.reqId=1; this.pending=new Map(); this.outputEl=outputEl; this.progressEl=progressEl; this.indexURL='pyodide/'; this.jediReady=false; this.interruptView=null; this._outputBuffer=[]; this._outputFlushRAF=0; }
```

- [ ] **Step 2: Replace textContent += with buffered append in _onMessage**

In `_onMessage` (line 671), find the two occurrences of:
```javascript
this.outputEl.textContent += (this.outputEl.textContent? '\n':'') + (text??'');
```

Replace BOTH (stdout and stderr cases) with:
```javascript
this._outputBuffer.push(text??''); if(!this._outputFlushRAF){ this._outputFlushRAF=requestAnimationFrame(()=>{ const chunk=this._outputBuffer.join('\n'); this._outputBuffer.length=0; this._outputFlushRAF=0; this.outputEl.textContent += (this.outputEl.textContent? '\n':'') + chunk; this.outputEl.scrollTop=this.outputEl.scrollHeight; }); }
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "perf: 输出缓冲区 — textContent+=改为rAF批量追加，O(n²)→O(n)"
```

- [ ] **Step 4: Verify**

1. Run `for i in range(1000): print(i)` → should complete smoothly without frame drops
2. Run `import time; [print(f'line {i}') for i in range(100)]` → output should appear in chunks, scrolling auto-follows

---

## Task 7: Monaco Dedup, Template Hover, Worker Timeout (Batch 3c/3e + B4)

### Files:
- Modify: `index.html`

- [ ] **Step 1: Remove duplicate Monaco fallback entries (B4)**

Find the `trySources` array (around line 978):
```javascript
const trySources = [
    'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs/loader.min.js',
    'https://unpkg.com/monaco-editor@0.47.0/min/vs/loader.min.js',
    '/monaco/min/vs/loader.js',
    '/monaco/min/vs/loader.js'
];
```
Remove the duplicate last entry:
```javascript
const trySources = [
    'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs/loader.min.js',
    'https://unpkg.com/monaco-editor@0.47.0/min/vs/loader.min.js',
    '/monaco/min/vs/loader.js'
];
```

Find the `bases` array (around line 1003):
```javascript
const bases = [
    'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs',
    'https://unpkg.com/monaco-editor@0.47.0/min/vs',
    '/monaco/min/vs',
    '/monaco/min/vs'
];
```
Remove the duplicate last entry:
```javascript
const bases = [
    'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs',
    'https://unpkg.com/monaco-editor@0.47.0/min/vs',
    '/monaco/min/vs'
];
```

- [ ] **Step 2: Fix template selector hover (B7)**

First, add CSS to `styles.css` (after the `.ts-option:hover` rule at line 119):
```css
.ts-option[data-active="true"] { background: var(--accent-subtle); }
```

In `index.html`, find the mousemove handler (around line 1779-1784):
```javascript
li.addEventListener('mousemove', () => {
    // sync active highlight with hover
    Array.from(optsList.children).forEach(c => c.style.background = '');
    li.style.background = 'var(--accent-subtle)';
    activeIndex = i;
});
```
Replace with:
```javascript
li.addEventListener('mousemove', () => {
    if (activeIndex === i) return;
    const prev = optsList.querySelector('[data-active="true"]');
    if (prev) prev.dataset.active = 'false';
    li.dataset.active = 'true';
    activeIndex = i;
});
```

In `moveActive` function (around line 1893-1895):
```javascript
items.forEach((el, i) => {
    el.style.background = (i === activeIndex) ? 'var(--accent-subtle)' : '';
});
```
Replace with:
```javascript
items.forEach((el, i) => {
    el.dataset.active = (i === activeIndex) ? 'true' : 'false';
});
```

- [ ] **Step 3: Fix worker timeout tiering (B9)**

In `request` method (line 674), find:
```javascript
setTimeout(()=>{ if(this.pending.has(id)){ this.pending.delete(id); rej(new Error(`Worker request '${action}' timeout`)); } }, Math.max(CONFIG.COMPLETION.requestTimeoutMs, CONFIG.RUNTIME.executionTimeoutMs));
```
Replace with:
```javascript
const timeoutMs = action === 'run_code' ? CONFIG.RUNTIME.executionTimeoutMs : CONFIG.COMPLETION.requestTimeoutMs; setTimeout(()=>{ if(this.pending.has(id)){ this.pending.delete(id); rej(new Error(`Worker request '${action}' timeout`)); } }, timeoutMs);
```

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "perf: Monaco去重、模板hover优化、Worker超时分层"
```

- [ ] **Step 5: Verify**

1. Template dropdown → hover highlight should track mouse smoothly
2. Keyboard up/down in template dropdown → highlight should follow
3. Monaco editor should load normally (from CDN or local)

---

## Task 8: CSV Virtual Scroll + Notification Container (Batch 3d/3f)

### Files:
- Modify: `index.html` (VirtualCSVRenderer.render, Notification._ensureContainer)

- [ ] **Step 1: Optimize CSV virtual scroll render (B5)**

In `VirtualCSVRenderer.render()` (line 1327-1339), the current code does `this.rowsHost.innerHTML=''` then rebuilds everything. Replace the render method body with a diff-based approach.

Find the entire `render()` method. The key section to change is:
```javascript
this.rowsHost.innerHTML=''; const padTopDiv = document.createElement('div'); padTopDiv.style.height = topPad + 'px'; this.rowsHost.appendChild(padTopDiv); this.rowsHost.appendChild(frag);
// spacer to set total height
const total = Math.max(this.totalLines * lh + (this.header? lh: 0), ch);
const spacerTail = document.createElement('div'); spacerTail.style.height = Math.max(0, total - (topPad + (rows.length+ (this.header?1:0))*lh)) + 'px'; this.rowsHost.appendChild(spacerTail);
```

Replace with a reuse approach that keeps existing children when possible. Since the CSV renderer is complex and minified, the safest optimization is to keep the `innerHTML=''` but batch it with a DocumentFragment more efficiently. Replace the innerHTML clearing with a targeted child removal:

The full optimized render method replaces the rAF callback body. Since the code is minified, replace the entire rAF block from `requestAnimationFrame(async ()=>{` to the closing `}); }` with:

```javascript
render(){ if(this._renderPending){ return; } this._renderPending = true; requestAnimationFrame(async ()=>{ this._renderPending=false; if(!this.container) return; const ch = this.container.clientHeight||300; const lh = this.opts.lineHeight; const visible = Math.ceil(ch / lh) + this.opts.overscan; const scrollTop = this.container.scrollTop||0; const start = Math.max(0, Math.floor(scrollTop / lh) - Math.floor(this.opts.overscan/2)); const end = start + visible; await this.ensureIndexed(end+1); let rows = await this.readLines(start, end);
                    if(this.header && this.header.length && start===0 && rows.length>0){ rows = rows.slice(1); }
                    const frag = document.createDocumentFragment();
                    if(this.header && this.header.length){ const hr = document.createElement('div'); hr.className='csv-row header'; hr.style.gridTemplateColumns = this.gridTemplate; this.header.forEach((v,i)=>{ const c=document.createElement('div'); c.className='csv-cell'; c.textContent = v; hr.appendChild(c); }); frag.appendChild(hr); }
                    rows.forEach((cols)=>{ const row = document.createElement('div'); row.className='csv-row'; row.style.gridTemplateColumns = this.gridTemplate; for(let i=0;i<this.colCount;i++){ const cell=document.createElement('div'); cell.className='csv-cell'; cell.textContent = String(cols[i]??''); row.appendChild(cell); } frag.appendChild(row); });
                    const topPad = start * lh + (this.header? lh: 0);
                    // Batch DOM update: replace children instead of innerHTML=''
                    while(this.rowsHost.lastChild) this.rowsHost.removeChild(this.rowsHost.lastChild);
                    const padTopDiv = document.createElement('div'); padTopDiv.style.height = topPad + 'px'; this.rowsHost.appendChild(padTopDiv); this.rowsHost.appendChild(frag);
                    const total = Math.max(this.totalLines * lh + (this.header? lh: 0), ch);
                    const spacerTail = document.createElement('div'); spacerTail.style.height = Math.max(0, total - (topPad + (rows.length+ (this.header?1:0))*lh)) + 'px'; this.rowsHost.appendChild(spacerTail);
                }); }
```

Key change: `this.rowsHost.innerHTML=''` → `while(this.rowsHost.lastChild) this.rowsHost.removeChild(this.rowsHost.lastChild)`. This avoids HTML parsing overhead and prevents the browser from serializing the entire subtree.

- [ ] **Step 2: Replace notification container inline style (B2)**

In `Notification._ensureContainer()` (line 688-689), change:
```javascript
el.style.cssText = 'position:fixed;bottom:20px;right:20px;display:flex;flex-direction:column-reverse;gap:8px;z-index:1000;pointer-events:none;';
```
to:
```javascript
el.className = 'notification-container';
```

(Note: The CSS class `#notification-container` was added in Task 3. Since the element gets `id='notification-container'`, the `#notification-container` CSS selector will apply. The `className` assignment here is for semantic clarity — the id selector alone is sufficient.)

Actually, since the element already gets `el.id = 'notification-container'` on the next line, and CSS uses `#notification-container`, just delete the `el.style.cssText` line entirely. The id + CSS class handles it.

Also remove the notification inline `style.cssText` at line 719:
```javascript
n.style.cssText = 'pointer-events:auto;';
```
This can be handled by adding to the `.notification` CSS rule: `pointer-events: auto;` — but actually, the container has `pointer-events:none` and children need `pointer-events:auto`, so add to `styles.css`:
```css
.notification { pointer-events: auto; }
```
The existing `.notification` rule at line 183 already exists — append `pointer-events: auto;` to it. Then remove line 719.

- [ ] **Step 3: Commit**

```bash
git add index.html styles.css
git commit -m "perf: CSV虚拟滚动DOM优化 + 通知容器样式提取"
```

- [ ] **Step 4: Verify**

1. Open data manager → upload a CSV → virtual table should scroll smoothly
2. Notifications should still appear bottom-right with correct styling

---

## Task 9: Inline onclick + Share Modal Colors (Batch 4b/4c)

### Files:
- Modify: `index.html` (modal close buttons, share modal info)

- [ ] **Step 1: Remove inline onclick from modal close buttons (A11)**

In `index.html`, find the three inline onclick close buttons:

Line 151:
```html
<button class="btn-secondary" onclick="document.getElementById('share-modal').classList.remove('active')">关闭</button>
```
Change to:
```html
<button class="btn-secondary modal-close-btn" data-modal="share-modal">关闭</button>
```

Line 169:
```html
<button class="btn-secondary" onclick="document.getElementById('help-modal').classList.remove('active')">关闭</button>
```
Change to:
```html
<button class="btn-secondary modal-close-btn" data-modal="help-modal">关闭</button>
```

Line 218:
```html
<button class="btn-secondary" onclick="document.getElementById('data-modal').classList.remove('active')">关闭</button>
```
Change to:
```html
<button class="btn-secondary modal-close-btn" data-modal="data-modal">关闭</button>
```

- [ ] **Step 2: Add event listener for modal close buttons**

In the JS section, find where the settings modal close button is wired (search for `close-settings-button`). Near that location, add:

```javascript
// Generic modal close buttons
document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        if (modalId) document.getElementById(modalId)?.classList.remove('active');
    });
});
```

- [ ] **Step 3: Replace share modal hardcoded colors (B6)**

In the share modal's `copyAndShow` function (around line 2217), change:
```javascript
infoEl.innerHTML = `<strong style="color:var(--accent);">跨设备可用</strong> · 永久有效 · URL 含完整代码（${url.length} 字符）`;
```
to:
```javascript
infoEl.innerHTML = `<strong class="text-accent">跨设备可用</strong> · 永久有效 · URL 含完整代码（${url.length} 字符）`;
```

Change (around line 2222):
```javascript
infoEl.innerHTML = `<strong style="color:#f59e0b;">仅限当前浏览器</strong> · 7 天有效期至 ${dateStr} · 跨设备请使用「下载/复制代码」`;
```
to:
```javascript
infoEl.innerHTML = `<strong class="text-warning">仅限当前浏览器</strong> · 7 天有效期至 ${dateStr} · 跨设备请使用「下载/复制代码」`;
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "refactor: modal关闭统一addEventListener + share颜色CSS变量"
```

- [ ] **Step 5: Verify**

1. Open each modal (share, help, data) → close button should work
2. Share code → long link info should show "跨设备可用" in accent color
3. Switch to short link → should show "仅限当前浏览器" in warning color
4. Settings modal close still works (uses its own button id)

---

## Task 10: SW Worker Cache Update (Batch 4a)

### Files:
- Modify: `sw.js` (py-worker network-first handler)

- [ ] **Step 1: Cache worker on successful network fetch (C2)**

In `sw.js`, find the py-worker handler (lines 85-103). Change:
```javascript
try {
    const res = await fetch(req);
    // If network ok, return it
    if (res && res.ok) return res;
    // Fallback to cache when network gives non-ok
    const cached = await caches.match(req) || await caches.match('./py-worker.js');
    if (cached) return cached;
    return res; // may be non-ok, but return something
} catch (e) {
    // Network error: try cache
    const cached = await caches.match(req) || await caches.match('./py-worker.js');
    if (cached) return cached;
    // Last resort: error response so we don't hang the fetch
    return new Response('/* worker unavailable */', { status: 503, headers: { 'Content-Type': 'application/javascript' } });
}
```
to:
```javascript
try {
    const res = await fetch(req);
    // If network ok, update cache and return it
    if (res && res.ok) {
        try {
            const cache = await caches.open(CURRENT_CACHE);
            await cache.put('./py-worker.js', res.clone());
        } catch {}
        return res;
    }
    // Fallback to cache when network gives non-ok
    const cached = await caches.match(req) || await caches.match('./py-worker.js');
    if (cached) return cached;
    return res; // may be non-ok, but return something
} catch (e) {
    // Network error: try cache
    const cached = await caches.match(req) || await caches.match('./py-worker.js');
    if (cached) return cached;
    // Last resort: error response so we don't hang the fetch
    return new Response('/* worker unavailable */', { status: 503, headers: { 'Content-Type': 'application/javascript' } });
}
```

- [ ] **Step 2: Commit**

```bash
git add sw.js
git commit -m "fix: SW网络成功后更新py-worker缓存，避免回退到旧版本"
```

- [ ] **Step 3: Verify**

1. DevTools → Application → Cache Storage → check `py-worker.js` entry exists
2. Reload page → worker should load from cache (check Network tab: "from ServiceWorker")
3. Modify `py-worker.js` version → reload → should fetch new version from network

---

## Final Verification Checklist

After all 10 tasks are complete:

- [ ] Light/dark mode toggle works throughout
- [ ] Tooltips visible in both modes
- [ ] All modal buttons show focus ring on Tab
- [ ] Template dropdown hover is smooth
- [ ] Running `for i in range(1000): print(i)` doesn't lag
- [ ] CSV data preview scrolls smoothly
- [ ] Share long link → decode works in new tab
- [ ] Share short link → works in same browser
- [ ] DevTools → Application → Cache Storage shows `styles.css` in precache
- [ ] No console errors on page load
- [ ] Service Worker installs and activates without errors
