# Python 在线运行（Pyodide + Monaco）

本项目是一个纯静态网页的 Python 在线运行环境，基于 Pyodide 与 Monaco 编辑器，支持：
- 离线执行（使用本地 `pyodide/` 目录中的 WASM 与 wheel 包）
- Jedi 自动补全（第三方库补全修复，支持 pandas/numpy 等）
- 自动包管理：根据 `import` 智能安装缺失包（micropip）
- 30 秒执行超时保护，运行输出展示
- 本地代码自动保存与链接分享（`?code=...`/`?template=...`）


## 一、快速开始

1) 使用本地静态服务器打开项目根目录（不要直接用浏览器打开本地文件）：

```cmd
cd H:\Code_Files\py_playground
python -m http.server 5500
```

或使用 NPM 脚本：

```cmd
cd H:\Code_Files\py_playground
npm run start
```

2) 浏览器访问：
- http://localhost:5500/

3) 体验：
- 在编辑器内输入示例代码或选择模板，点击“运行”。
- 补全：输入点号“.”或按 Ctrl+Space 触发建议。


## 二、主要实现说明

- Pyodide 由 Web Worker (`py-worker.js`) 加载与管理，主线程不直接加载 Pyodide。
- 首次运行会加载 `jedi` 与 `micropip` 包。
- 自动包管理：在编辑器输入时或运行前扫描 `import`/`from ... import ...`，对未加载且非标准库的模块使用 `pyodide.loadPackage` 或 `micropip.install` 安装，避免重复安装。
- 第三方库补全：放宽补全超时为 10 秒，并在安装后对导入的库进行一次预热请求，提升后续补全速度。
- 已内置 Service Worker 注册（`sw.js`），用于基础缓存与离线体验（可按需调整缓存名单）。


## 三、文件结构

- `index.html`：页面与核心逻辑（Monaco 初始化、Pyodide 管理、补全、运行、分享等）
- `templates.js`：示例代码模板
- `py-worker.js`：实际使用的 Web Worker（加载 Pyodide、安装包、执行、补全）
- `sw.js`：最小化的 Service Worker（可选）
- `pyodide/`：Pyodide runtime 与常用 wheel 包（用于离线；若缺失，可改为 CDN 方案）
- `fonts/`：JetBrains Mono 等本地字体（可选）
- `data/`：示例数据集


## 四、已知事项

- 由于 WebAssembly 限制，某些原生扩展或依赖系统接口的包不可用。
- 大体量库（pandas/numpy 等）首次补全可能需要 1-5 秒进行预热。
- 为安全考虑，运行时禁止 `subprocess`、`os.system`、`eval/exec` 等。
- 若需真正的“停止/中断”，浏览器需具备 SharedArrayBuffer 可用（COOP/COEP 头），且需要在 Worker/执行端配合实现（当前回退为重启 Worker）。


## 五、常用操作

- 运行代码：点击"运行"或 Ctrl+Enter
- 格式化：暂未实现（占位）
- 分享：点击"分享"复制带 code 的链接；也可用 `?template=...` 预置模板


## 六、故障排查

- 白屏或控制台报错：打开 F12 查看 Console；资源加载失败时可检查是否存在本地 `pyodide/` 目录。
- 包安装失败：检查包名是否正确；或确认 `pyodide/` 目录是否包含所需包，或改为在线 CDN。
- 资源加载慢：Monaco 走 CDN，可切换到你更快的镜像源或放到本地。

## 七、性能与体验优化

- **浏览器原生 color-scheme**：通过 `<meta name="color-scheme">` 与 `color-scheme: light/dark` CSS 声明，让滚动条、表单控件、链接等系统 UI 元素自动跟随主题，避免硬编码。
- **本地 Pyodide 资源优先**：`<link rel="preload">` 预取 `python_stdlib.zip` 与 `pyodide.asm.wasm` 关键资源，缩短首次加载时间。
- **CSS 变量回退**：`local-fonts.css` 使用 `local()` 优先系统字体，避免缺失 woff2 时 FOIT（无样式文字闪烁）。
- **Warmed Jedi Cache**：`warmupCache` Set 避免重复预热同一模块，按"运行"时只预热本次新增包。
- **SEO / PWA**：补全 `og:*` / `twitter:*` / `theme-color` / `site.webmanifest`，支持添加到主屏幕、社交分享卡片。
- **404 页面**：玻璃态风格（与主站一致）+ 2 秒自动跳转 + 渐变 404 大字 + 立即返回按钮。
- **share.html 玻璃态化**：与主站 21st.dev 风格统一，添加环境光效、按钮 hover 发光。
