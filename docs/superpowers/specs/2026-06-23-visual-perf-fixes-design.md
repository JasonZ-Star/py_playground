# 枫下代码 — 视觉/交互 + 性能全面修复设计

**日期**: 2026-06-23
**范围**: 视觉/交互（12项）+ 性能（9项）+ SW缓存（3项）+ 死代码清理（2项）= 共26项
**方案**: 按影响层次分4批修复，每批独立可浏览器验证

---

## 第1批：快速修（5项，1-3行改动）

| # | 问题 | 文件 | 修复 |
|---|------|------|------|
| A3 | `.share-type-btn` 硬编码 `border-radius: 6px` | `styles.css:214` | 改为 `var(--radius-sm)` |
| B4 | Monaco fallback 数组有重复项 | `index.html` | 删除两个重复的 `/monaco/min/vs` 条目 |
| B1 | `styles.css` 不在 SW 缓存列表 | `sw.js` | CORE_ASSETS 加入 `'./styles.css'` |
| D1 | scripts/ 是 CSS 提取事故的修复残骸 | 整个目录 | 删除 `scripts/`，加 `.gitignore` |
| C3 | SW 版本回退 `'0'` 导致缓存污染 | `sw.js:3` | 改为 `CACHE_PREFIX + APP_VERSION`（从 package.json 取不到时用 `'dev'`） |

---

## 第2批：CSS 修复（8项）

### 2a. Tooltip 暗色模式不可见 (A1)

**问题**: tooltip 背景 `#18181b` 在暗色页面 (`#09090b`) 上几乎不可见。

**修复**: 在 `:root` 和 `:root.dark-mode` 新增 tooltip 专用变量：

```css
:root {
  --tooltip-bg: #18181b;
  --tooltip-fg: #fafafa;
}
:root.dark-mode {
  --tooltip-bg: #e4e4e7;   /* 浅色背景在暗色页面中醒目 */
  --tooltip-fg: #18181b;
}
```

将 `.icon-button[data-tooltip]::after` 和 dark-mode 覆盖中的硬编码色替换为 `var(--tooltip-bg)` / `var(--tooltip-fg)`。

### 2b. `.muted` 类缺失 (A6)

**问题**: 多处使用 `class="muted"` 但 CSS 无对应规则，文字颜色意图失效。

**修复**: 在 `styles.css` 中添加：
```css
.muted { color: var(--muted); }
```

### 2c. Modal 按钮 focus-visible (A7)

**问题**: `.modal-footer button` 无键盘焦点样式，其他交互元素均有。

**修复**: 新增规则：
```css
.modal-footer button:focus-visible {
  outline: 2px solid var(--accent-light);
  outline-offset: 2px;
}
```

### 2d. `.ts-search` focus-visible (A8)

**问题**: 搜索框 focus 仅有 border-color 变化，无可见 ring。

**修复**: 在 `.ts-search:focus` 追加：
```css
box-shadow: 0 0 0 3px var(--accent-subtle);
```

### 2e. 状态/通知颜色变量 (A2)

**问题**: 绿/红/橙色全部硬编码，与设计系统其他变量不一致。

**修复**: 在 `:root` 新增：
```css
--color-success: #22c55e;
--color-error: #ef4444;
--color-warning: #f59e0b;
```

替换所有 `#22c55e` → `var(--color-success)`，`#ef4444` → `var(--color-error)`，`#f59e0b` → `var(--color-warning)`。

### 2f. 清理死代码 CSS (A4/A5)

**问题**: `#template-selector` 的可见样式被 `display:none !important` 完全覆盖，是死代码。

**修复**: 删除 `#template-selector` 的可见样式规则（hover/focus），只保留隐藏规则。删除响应式媒体查询中对 `#template-selector` 的样式。

### 2g. 统一 transition 声明 (A12)

**问题**: `.share-type-btn` 使用硬编码 transition，其他用 `var(--transition-fast)`。

**修复**: `.share-type-btn` 的 `transition` 改为 `background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast)`。

### 2h. 内联样式迁移 (A10)

**问题**: `index.html` 中 28+ 内联样式与 `styles.css` 提取原则不一致。

**修复**: 在 `styles.css` 新增以下类，然后在 `index.html` 中用 class 替换 inline style：

| 类名 | 替换目标 |
|------|----------|
| `.noscript-fallback` | noscript 区域整体布局 + 暗色主题 |
| `.noscript-inner` | noscript 内部容器 |
| `.footer` | footer `flex:0 0 auto` |
| `.share-url-input` | 分享链接输入框全样式 |
| `.share-info` | 分享说明段落 |
| `.settings-row` | 设置行 `display:flex; gap; min-width` |
| `.data-toolbar` | 数据管理器工具栏 |
| `.data-hint` | 数据管理器提示文字 `font-size:12px; color:var(--muted)` |
| `.data-title` | 数据管理器标题 `font-weight:600` |

---

## 第3批：JS 性能修复（6项）

### 3a. LZ-String `_getBaseValue` 缓存修复 (B8)

**问题**: `baseReverseDic` 声明在函数内部，每次调用都是空对象，缓存从未生效。分享链接解码时每字符都重建字典。

**修复**: 将 `baseReverseDic` 提升到 LZ-String 闭包顶层：
```javascript
// 在 LZ-String 对象定义之前或内部顶层
var baseReverseDic = {};

// _getBaseValue 中直接使用，不再重新声明
_getBaseValue: function(alphabet, character) {
    if (!baseReverseDic[alphabet]) {
        baseReverseDic[alphabet] = {};
    }
    var dict = baseReverseDic[alphabet];
    // ...rest unchanged
}
```

### 3b. 输出缓冲区 (B3)

**问题**: `textContent +=` 在大量输出时 O(n²)。

**修复**: 在 `WorkerClient` 中引入缓冲区：
```javascript
// 构造函数中初始化
this._outputBuffer = [];
this._outputFlushRAF = 0;

// _onMessage 的 stdout/stderr 处理中
this._outputBuffer.push(text);
if (!this._outputFlushRAF) {
    this._outputFlushRAF = requestAnimationFrame(() => {
        const chunk = this._outputBuffer.join('\n');
        this._outputBuffer.length = 0;
        this._outputFlushRAF = 0;
        this.outputEl.textContent += (this.outputEl.textContent ? '\n' : '') + chunk;
        this.outputEl.scrollTop = this.outputEl.scrollHeight;
    });
}
```

### 3c. 模板选择器 hover 优化 (B7)

**问题**: mousemove 时全量清除所有子元素的 inline style.background。

**修复**: CSS 新增 `[data-active="true"]` 规则，JS 只切换 `dataset.active`：
```css
.ts-option[data-active="true"] { background: var(--accent-subtle); }
```

### 3d. CSV 虚拟滚动优化 (B5)

**问题**: 每次 scroll 用 `innerHTML=''` 重建全部可见行。

**修复**: 改为 diff 模式——按行索引判断哪些行需新增/移除/复用，只操作变化的 DOM 节点。

### 3e. Worker 超时分层 (B9)

**问题**: 所有请求共用 30s 超时，快速请求的孤儿项在 pending map 中停留过久。

**修复**: 按 action 分层：
```javascript
const timeoutMs = action === 'run_code'
    ? CONFIG.RUNTIME.executionTimeoutMs
    : CONFIG.COMPLETION.requestTimeoutMs;
```

### 3f. 通知容器样式提取 (B2)

**问题**: `_ensureContainer` 每次重建时用 `style.cssText` 注入样式。

**修复**: 样式迁移到 `styles.css` 的 `.notification-container` 类，JS 只添加类名。

---

## 第4批：SW + 一致性收尾（3项）

### 4a. SW 网络优先策略增强 (C2)

**问题**: py-worker 网络成功后不更新缓存，回退时可能用旧版本。

**修复**: 在网络成功后 `cache.put()` 更新缓存：
```javascript
const response = await fetch(event.request);
const clone = response.clone();
cache.put(event.request, clone);
return response;
```

### 4b. Inline onclick 统一 (A11)

**问题**: share/help/data modal 关闭按钮用 inline onclick，settings modal 用 addEventListener。

**修复**: 移除 inline onclick，改为 JS 中 addEventListener 注册。给三个关闭按钮各加 `data-dismiss` 属性或统一用 `.modal-close` 类。

### 4c. JS 中的硬编码颜色 (B6)

**问题**: `infoEl.innerHTML` 中 `style="color:#f59e0b"` 硬编码。

**修复**: CSS 新增 `.text-warning { color: var(--color-warning); }` 和 `.text-accent { color: var(--accent); }`，JS 中用 `classList` 替换 inline style。

---

## 不改动的部分

- 所有 JS 核心逻辑（Pyodide 管理、Monaco 初始化、包安装、Jedi 补全）
- DOM ID（保证事件绑定不中断）
- templates.js / share.html / py-worker.js 的功能逻辑
- 21st.dev 设计风格和视觉语言

## 验证方式

每批完成后浏览器手动验证：
1. 浅色/深色模式切换正常
2. 运行 Python 代码正常
3. 模板选择器正常
4. 分享链接生成/解码正常
5. 大量输出（`for i in range(1000): print(i)`）不卡顿
6. CSV 数据预览滚动流畅
7. 键盘 Tab 导航所有按钮有焦点样式
8. Service Worker 安装和缓存正常（DevTools → Application → Cache Storage）
