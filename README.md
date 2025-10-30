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

- Pyodide 通过本地 `pyodide/` 目录加载，无需联网。
- 首次运行会加载 `jedi` 与 `micropip` 包。
- 自动包管理：在编辑器输入时或运行前扫描 `import`/`from ... import ...`，对未加载且非标准库的模块使用 `micropip.install` 安装，避免重复安装。
- 第三方库补全：放宽补全超时为 10 秒，并在安装后对导入的库进行一次预热请求，提升后续补全速度。


## 三、文件结构

- `index.html`：页面与核心逻辑（Monaco 初始化、Pyodide 管理、补全、运行、分享等）
- `templates.js`：示例代码模板
- `py-worker.js`：备选 Worker 实现（当前页面未使用，供后续迁移到 Worker 参考）
- `pyodide/`：Pyodide runtime 与常用 wheel 包
- `fonts/`：JetBrains Mono 等本地字体（可选）
- `data/`：示例数据集


## 四、已知事项

- 由于 WebAssembly 限制，某些原生扩展或依赖系统接口的包不可用。
- 大体量库（pandas/numpy 等）首次补全可能需要 1-5 秒进行预热。
- 为安全考虑，运行时禁止 `subprocess`、`os.system`、`eval/exec` 等。


## 五、常用操作

- 运行代码：点击“▶️ 运行”或 Ctrl+Enter
- 格式化：暂未实现（占位）
- 分享：点击“🔗 分享”复制带 code 的链接；也可用 `?template=...` 预置模板


## 六、故障排查

- 白屏或控制台报错：打开 F12 查看 Console；文件按需打印了 `[Debug]` 日志。
- 包安装失败：检查包名是否正确；或查看 `pyodide/` 目录是否包含所需 wheel。
- 资源加载慢：Monaco 走 CDN，可切换到你更快的镜像源。
