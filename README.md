# Python 在线运行（Pyodide + CodeMirror）

本项目是一个纯静态网页的 Python 在线运行环境，基于 Pyodide 与 CodeMirror 编辑器，支持：
- 离线执行（使用本地 `pyodide/` 目录中的 WASM 与 wheel 包）
- Jedi 自动补全（通过 PyodideConsole + jedi）
- 外链编辑器资源（CodeMirror）超时自动回退到本地 vendor 目录
- 自动解析并加载依赖（`pyodide.loadPackagesFromImports`），并对 numpy 进行了显式兜底


## 一、快速开始

1) 使用本地静态服务器打开项目根目录（不要直接用浏览器打开本地文件）：

```cmd
cd H:\Code_Files\py_playground
python -m http.server 5500
```

2) 浏览器访问：
- http://localhost:5500/

3) 体验：
- 在编辑器内输入示例代码或选择模板，点击“运行”。
- 试试补全：输入变量或模块名后按 Ctrl+Space，或输入一个点号“.” 触发补全。


## 二、编辑器资源的“外链超时 -> 本地回退”

页面默认引用了 CodeMirror 的 CDN 链接（见 `index.html` 头部）。为兼顾离线与弱网环境，我们在页面脚本中增加了一个 2.5 秒的超时检测：
- 如果 2.5 秒内外链资源加载成功，则继续使用 CDN。
- 如果超过 2.5 秒仍未就绪，则自动改为加载本地 `vendor/codemirror` 下的相同文件。

你需要按以下目录准备好本地文件（当你希望完全离线或 CDN 不稳定时）：

```
vendor/
  codemirror/
    codemirror.min.css
    codemirror.min.js
    mode/
      python/
        python.min.js
    addon/
      hint/
        show-hint.min.css
        show-hint.min.js
```

对应的下载来源（任选其一，版本需与外链匹配 5.65.5）：
- 官方发布包（CodeMirror 5）：https://codemirror.net/5/
- 或使用你信任的 CDN 下载同版本后保存到上述目录

注意：
- 目录与文件名需与上方完全一致，否则本地回退会失败并在页面上提示错误。
- 本项目已内置 CSS 类用于提示 UI（`.CodeMirror-hints` 等），静态扫描可能误报“未使用”，实际运行时会生效。


## 三、Pyodide 与依赖加载

- Pyodide 通过本地 `pyodide/` 目录加载，无需联网。
- 运行用户代码前，会执行 `pyodide.loadPackagesFromImports(code)` 自动解析并加载代码里 `import` 的包。
- 出现过一种现象：日志显示先加载了 `numpy-tests`（测试包），但用户代码仍然 `import numpy` 失败；为此我们增加了显式兜底：
  1) 如果代码包含 `import numpy`/`from numpy import ...`，我们会尝试 `pyodide.pyimport("numpy")`；
  2) 若未加载成功，则执行 `pyodide.loadPackage('numpy')` 强制从本地 `pyodide/` 安装 numpy 的 wheel。

这可以避免只加载到测试包但未装入运行时包而报 PythonError 的问题。


## 四、Jedi 自动补全

- 页面在 Pyodide 就绪后会 `loadPackage('jedi')`，并通过 `pyodide.pyimport('pyodide.console')` 创建 PyodideConsole 实例。
- CodeMirror 的提示回调会调用 `pyconsole.complete(当前行文本)` 来获取补全建议。
- 触发方式：
  - Ctrl+Space 主动补全
  - 输入点号 “.” 自动弹出候选


## 五、可选的字体离线化（可跳过）

- 页头引入了 `LXGW WenKai Screen` 的外链 CSS。若你希望完全离线，可自行下载对应字体和 CSS，放到 `vendor/fonts`，并将 `index.html` 的链接替换为本地路径。
- 该字体为可选，未就绪也不影响功能。


## 六、常见问题（FAQ）

1) 页面提示“无法加载编辑器资源。请检查网络或按 README 准备本地 vendor/codemirror 目录。”
   - 说明 2.5 秒内未能从 CDN 拉到 CodeMirror，且本地 vendor 目录未准备好或路径不匹配。请按照“二、编辑器资源的本地回退”章节准备文件。

2) 执行涉及 numpy 的代码报 PythonError，日志上只有 `Loaded numpy-tests`。
   - 这是因为自动解析只装入了测试包。当前实现已在运行前做兜底：检查 `numpy` 是否可 import，不可时自动 `loadPackage('numpy')`。

3) 需要联网吗？
   - 加载 Pyodide 与常见科学包（见 `pyodide/` 目录）不需要联网。
   - CodeMirror 默认走 CDN，但已内置本地回退方案；若你常在离线环境，建议提前准备好 `vendor/codemirror`。


## 七、运行与调试小贴士

- 建议使用 Chromium 内核的浏览器，通过本地 http 服务访问。
- 如果遇到白屏或控制台错误，请打开开发者工具（F12）查看 Console 日志；页面在关键步骤处打印了 `[Debug]` 日志，便于排查。
- 如果你有自己的编辑器主题、快捷键或更多提示触发条件，可在 `index.html` 的 CodeMirror 初始化处进一步调整（`extraKeys`、`hintOptions`、`editor.on('inputRead', ...)`）。


## 八、目录说明

- `index.html`：页面主体、加载器与运行逻辑（包含 CDN -> 本地的回退实现）
- `templates.js`：示例代码模板
- `pyodide/`：Pyodide runtime、锁文件与本地 wheel 包
- `fonts/`：JetBrains Mono（本地）与其他字体（可选）
- `vendor/`：本地回退的第三方前端资源目录（需自行准备 CodeMirror 文件）


## 九、后续建议（可选）

- 增加一个简单的本地启动脚本（例如 `npm run serve` 使用 `http-server` 或者 VS Code/JetBrains 的 Live Server 插件）。
- 将外链字体也本地化，保证完全离线体验。
- 增加基础的 UI 提示（例如包加载进度条）与更多模板示例。

