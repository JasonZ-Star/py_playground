# 实现的功能详解

## 1. 异步架构 (Web Worker)

### 实现文件：`py-worker.js`

**核心功能**：
- 将所有 Python 操作移至 Web Worker，主线程仅负责 UI 更新
- 支持的操作：
  - `load`: 加载 Pyodide 环境
  - `install`: 异步安装 Python 包
  - `execute`: 执行 Python 代码
  - `complete`: 获取代码补全建议
  - `find_packages`: 使用 AST 分析代码中的包依赖

**关键代码片段**：
```javascript
// 消息处理器
self.onmessage = async function(e) {
    const { action, data, id } = e.data;
    switch(action) {
        case 'execute':
            const result = await executeCode(data.code);
            postMessage({ id, action, status: 'success', result });
            break;
        // ... 其他操作
    }
}
```

**优势**：
- UI 永不阻塞，用户可以随时操作界面
- 长时间运行的包安装不影响编辑器响应
- 可以通过 terminate() 强制中断执行

## 2. 深色模式

### 实现位置：`index.html` (CSS + JavaScript)

**三层实现**：

1. **首帧主题（head 内联脚本）**：
```javascript
(function(){
    var t = localStorage.getItem('pythonEditorTheme');
    var dark = t ? (t === 'dark') : 
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if(dark){ document.documentElement.classList.add('dark-mode'); }
})();
```

2. **CSS 变量系统**：
```css
:root {
    --bg-primary: #f7f7f7;
    --text-primary: #333;
    /* ... */
}

.dark-mode {
    --bg-primary: #1e1e1e;
    --text-primary: #d4d4d4;
    /* ... */
}
```

3. **主题切换函数**：
```javascript
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    if (isDark) {
        document.body.classList.remove('dark-mode');
        monaco.editor.setTheme('vs');
        StorageManager.setTheme('light');
    } else {
        document.body.classList.add('dark-mode');
        monaco.editor.setTheme('vs-dark');
        StorageManager.setTheme('dark');
    }
}
```

**特性**：
- 首次访问检测系统偏好
- 主题选择持久化到 localStorage
- 刷新页面不会出现"白屏闪烁"
- 编辑器主题与页面主题同步

## 3. 错误行高亮与跳转

### 实现位置：`index.html` + `py-worker.js`

**流程**：

1. **Worker 提取错误行**：
```python
# 在 py-worker.js 的 executeCode 函数中
try:
    await pyodide.runPythonAsync(code);
except err:
    pyodide.runPython('traceback.print_exc(file=sys.stderr)');
    const traceback = pyodide.runPython('sys.stderr.getvalue()');
    // 正则提取：File "<exec>", line N
    const lineMatch = traceback.match(/File\s+"<[^"]+>",\s+line\s+(\d+)/);
    errorLine = parseInt(lineMatch[1], 10);
```

2. **前端高亮显示**：
```javascript
function highlightErrorLine(lineNumber) {
    // 添加行装饰
    errorDecorations = editor.deltaDecorations([], [{
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
            isWholeLine: true,
            className: 'error-line-decoration',
            glyphMarginClassName: 'error-line-glyph'
        }
    }]);
    
    // 添加 marker
    monaco.editor.setModelMarkers(model, 'py', [{
        startLineNumber: lineNumber,
        message: '运行出错，详见输出区',
        severity: monaco.MarkerSeverity.Error
    }]);
    
    // 滚动到错误行
    editor.revealLineInCenter(lineNumber);
}
```

3. **跳转按钮**：
```javascript
jumpToErrorButton.addEventListener('click', () => {
    editor.revealLineInCenter(lastErrorLine);
    editor.setPosition({ lineNumber: lastErrorLine, column: 1 });
    editor.focus();
});
```

**视觉效果**：
- 错误行背景变红色半透明
- 左侧边栏显示红色标记
- 悬停显示"运行出错"提示
- 一键跳转并聚焦到错误位置

## 4. Monaco Editor 多源加载

### 实现位置：`index.html` (loadMonaco 函数)

**加载策略**：

```javascript
async function loadMonaco() {
    // 1. 检查并注入 AMD loader
    if (typeof require === 'undefined') {
        const loaderPaths = [
            '/monaco/min/vs/loader.js',
            '/monoca/min/vs/loader.js'
        ];
        // 依次尝试加载
    }
    
    // 2. 多源回退
    const basePaths = [
        'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs',
        'https://unpkg.com/monaco-editor@0.47.0/min/vs',
        '/monaco/min/vs',
        '/monoca/min/vs'
    ];
    
    for (const basePath of basePaths) {
        try {
            require.config({ paths: { 'vs': basePath } });
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject('timeout'), 5000);
                require(['vs/editor/editor.main'], () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            break; // 成功则跳出循环
        } catch(e) {
            continue; // 失败则尝试下一个
        }
    }
}
```

**容错能力**：
- CDN 不可用时自动降级到本地
- 每个源设置 5 秒超时
- 支持拼写错误的目录名（monoca）
- AMD loader 缺失时自动注入

## 5. Service Worker 离线缓存

### 实现文件：`sw.js`

**核心功能**：

1. **预缓存核心资源**：
```javascript
const CORE_ASSETS = [
    './', './index.html', './templates.js', './py-worker.js',
    './monaco/min/vs/loader.js',
    './monaco/min/vs/editor/editor.worker.js',
    './monaco/min/vs/language/json/json.worker.js',
    // ... 更多 worker 文件
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(
                CORE_ASSETS.map(url => cache.add(url))
            );
        })
    );
});
```

2. **网络优先策略**：
```javascript
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(request, { cache: 'no-store' })
            .then(response => {
                // 成功时回填缓存
                if (response.ok) {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, response.clone());
                    });
                }
                return response;
            })
            .catch(() => {
                // 失败时使用缓存
                return caches.match(request);
            })
    );
});
```

**特点**：
- 首次访问后可完全离线使用
- 在线时优先获取最新资源
- Monaco worker 文件全部预缓存
- 失败静默处理，不阻止加载

## 6. 增强代码补全

### 实现位置：`py-worker.js` (Jedi 初始化)

**类型推断优化**：

```python
def get_jedi_completions(code, line, column):
    # 启发式类型推断
    lines = code.split('\\n')
    namespace = {}
    
    for line_text in lines[:line]:
        # pandas DataFrame 推断
        if 'pd.read_csv' in line_text or 'pd.DataFrame' in line_text:
            import pandas as pd
            var_name = line_text.split('=')[0].strip()
            namespace[var_name] = pd.DataFrame()
        
        # numpy array 推断
        if 'np.array' in line_text:
            import numpy as np
            var_name = line_text.split('=')[0].strip()
            namespace[var_name] = np.array([])
    
    script = jedi.Script(code, path='example.py')
    completions = script.complete(line, column)
    return [[c.name, c.type] for c in completions if not c.name.startswith('_')]
```

**Monaco 集成**：
```javascript
monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.'],
    provideCompletionItems: async (model, position) => {
        const { completions } = await worker.complete(code, line, column);
        return {
            suggestions: completions.map(([name, type]) => ({
                label: name,
                kind: mapTypeToKind(type),
                insertText: name
            }))
        };
    }
});
```

**支持的补全**：
- 标准库模块和函数
- 第三方库（pandas, numpy 等）
- DataFrame 实例方法（.head, .describe, .columns 等）
- ndarray 实例方法和属性
- 用户定义的变量和函数

## 7. Tooltip 位置优化

### 实现位置：`index.html` (CSS + JavaScript)

**自适应定位**：

```javascript
function adjustTooltipPosition(button) {
    const rect = button.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    
    if (spaceBelow < 50 && spaceAbove > spaceBelow) {
        button.setAttribute('data-tooltip-pos', 'top');
    } else {
        button.setAttribute('data-tooltip-pos', 'bottom');
    }
}
```

**CSS 实现**：
```css
.icon-button[data-tooltip]::after {
    content: attr(data-tooltip);
    /* ... 样式 ... */
}

.icon-button[data-tooltip][data-tooltip-pos="bottom"]::after {
    top: calc(100% + 5px);
}

.icon-button[data-tooltip][data-tooltip-pos="top"]::after {
    bottom: calc(100% + 5px);
}
```

**效果**：
- 根据屏幕空间自动调整方向
- 避免被浏览器地址栏/工具栏遮挡
- hover 和 focus 都触发显示

## 8. 增强 Pandas 模板

### 实现文件：`templates.js`

**网络优先策略**：

```python
# pandas-1 模板
async def load_csv_from_url(url):
    try:
        print(f"正在从网络下载数据: {url}")
        resp = await pyfetch(url, timeout=15000)
        csv_text = await resp.string()
        df = pd.read_csv(io.StringIO(csv_text))
        print("✅ 网络数据加载成功")
        return df
    except Exception as e:
        print(f"⚠️ 网络加载失败: {e}")
        print("正在使用本地数据...")
        return pd.read_csv("/data/boston_housing.csv")

df = await load_csv_from_url("https://raw.githubusercontent.com/.../BostonHousing.csv")
```

**本地数据**：
- `data/boston_housing.csv` 包含 20 行波士顿房价数据
- 包含 14 个特征列：CRIM, ZN, INDUS, CHAS, NOX, RM, AGE, DIS, RAD, TAX, PTRATIO, B, LSTAT, MEDV

**优势**：
- 在线时展示真实数据集
- 离线时仍可正常运行
- 返回 DataFrame 对象便于测试补全
- 提示用户尝试 `df.` 补全

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  主线程 UI   │  │ Web Worker   │  │Service Worker│    │
│  │  (index.html)│  │(py-worker.js)│  │   (sw.js)    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │            │
│         │  postMessage     │                  │            │
│         ├─────────────────>│                  │            │
│         │  {execute:code}  │                  │            │
│         │                  │                  │            │
│         │                  │ loadPyodide()    │            │
│         │                  ├─────────┐        │            │
│         │                  │         │        │            │
│         │                  │ runPython()      │            │
│         │                  │<────────┘        │            │
│         │                  │                  │            │
│         │  onmessage       │                  │            │
│         │<─────────────────┤                  │            │
│         │  {result}        │                  │            │
│         │                  │                  │            │
│  ┌──────┴──────────────────┴──────────────────┴─────────┐ │
│  │            Monaco Editor (vs-dark/vs)                 │ │
│  │     ┌──────────────────────────────────────┐         │ │
│  │     │ Python Code with Error Highlighting  │         │ │
│  │     └──────────────────────────────────────┘         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                                      │
         │ fetch (network first)                │
         └──────────────┬───────────────────────┘
                        ▼
              ┌──────────────────┐
              │   CDN / Cache    │
              │  jsDelivr/unpkg  │
              │  Monaco Editor   │
              │  Pyodide WASM    │
              └──────────────────┘
```

## 测试场景

### 1. 基础功能测试
- [ ] 启动页面，观察加载过程
- [ ] 运行默认 "Hello from Monaco!" 代码
- [ ] 选择不同模板并运行
- [ ] 清空代码和输出

### 2. 异步测试
- [ ] 运行需要安装包的代码（如 pandas）
- [ ] 观察 UI 在安装过程中是否响应
- [ ] 安装过程中切换模板
- [ ] 安装过程中切换主题

### 3. 补全测试
- [ ] 输入 `import pandas as pd`，然后 `pd.`，观察补全
- [ ] 输入 `df = pd.DataFrame()`，然后 `df.`，观察补全
- [ ] 输入 `import numpy as np`，然后 `np.`，观察补全
- [ ] 测试 Ctrl+Space 手动触发

### 4. 错误测试
- [ ] 运行有语法错误的代码
- [ ] 运行有运行时错误的代码
- [ ] 观察错误行是否高亮
- [ ] 点击"跳转到错误行"按钮
- [ ] 修复错误后重新运行

### 5. 主题测试
- [ ] 切换到深色模式，观察所有元素
- [ ] 刷新页面，确认主题保持
- [ ] 切换回浅色模式
- [ ] 清除 localStorage，刷新页面（应检测系统偏好）

### 6. 离线测试
- [ ] 在线访问一次页面
- [ ] 断开网络连接
- [ ] 刷新页面，确认可以访问
- [ ] 运行代码，确认 Python 环境工作
- [ ] 测试补全功能

### 7. Monaco 回退测试
- [ ] 禁用 jsDelivr（浏览器 devtools → Network → Block request URL）
- [ ] 刷新页面，观察是否回退到 unpkg
- [ ] 依次禁用所有 CDN，观察本地加载

### 8. 长时间运行测试
- [ ] 运行无限循环代码：`while True: pass`
- [ ] 点击"停止"按钮
- [ ] 确认 Worker 重启
- [ ] 再次运行正常代码

## 性能指标

预期性能（在普通硬件上）：
- 首次加载（冷启动）：3-5 秒
- 二次加载（有缓存）：1-2 秒
- 主题切换响应：< 100ms
- 代码补全延迟：< 500ms
- 简单代码执行：< 100ms
- 包安装时间：2-10 秒（视包大小）

## 浏览器兼容性

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| 基础运行 | ✅ 90+ | ✅ 90+ | ✅ 15.4+ | ✅ 90+ |
| Web Worker | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ (HTTPS) | ✅ |
| SharedArrayBuffer | ⚠️ 需配置 | ⚠️ 需配置 | ❌ | ⚠️ 需配置 |
| 深色模式 | ✅ | ✅ | ✅ | ✅ |
| Monaco Editor | ✅ | ✅ | ✅ | ✅ |

注：SharedArrayBuffer 用于中断执行，不支持时降级为 Worker 重启。
