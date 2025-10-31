# Python 在线运行 - 全链路优化版

本项目是一个纯静态网页的 Python 在线运行环境，基于 **Pyodide** 与 **Monaco Editor**，具备完整的异步架构、离线支持、深色模式和智能补全功能。

## ✨ 核心特性

### 🚀 异步架构
- **Web Worker 后台处理**：包安装、代码执行、补全计算全部在 Worker 中完成，UI 永不阻塞
- **AST 智能包分析**：自动解析 import 语句，识别需要安装的第三方包
- **渐进式加载**：分阶段加载核心环境、补全引擎，用户可即时开始编码

### 🌓 深色模式
- **完整主题系统**：基于 CSS 变量的全局主题切换
- **首帧主题一致**：通过内联脚本避免"白屏闪烁"
- **状态持久化**：主题选择保存到 localStorage，刷新后保持
- **系统偏好检测**：首次访问时自动检测系统深色模式偏好

### 🎯 智能错误定位
- **Traceback 解析**：自动提取 Python 错误的行号
- **行内高亮**：在编辑器中高亮错误行，添加左侧红色标记
- **一键跳转**：输出区提供"跳转到错误行"按钮
- **悬浮提示**：错误行添加 Monaco marker，鼠标悬停可见提示

### 💡 增强代码补全
- **Jedi 集成**：基于 Jedi 的 Python 代码分析
- **类型推断**：针对 pandas DataFrame、numpy ndarray 等常见实例进行启发式类型推断
- **实时触发**：输入 `.` 自动弹出补全，Ctrl+Space 手动触发
- **智能过滤**：自动过滤私有成员（`_` 开头）

### 📡 离线增强
- **Service Worker**：缓存核心资源实现离线访问
- **Monaco Workers 预缓存**：编辑器 worker 文件提前缓存，加速启动
- **网络优先策略**：在线时优先获取最新资源，离线时回退缓存
- **渐进式缓存**：成功的网络请求自动回填缓存

### 🎨 Monaco Editor 多源加载
- **多 CDN 回退**：jsDelivr → unpkg → 本地 monaco → 本地 monoca
- **AMD Loader 注入**：检测到缺失时自动注入本地 loader
- **超时保护**：每个源设置 5 秒超时，确保快速回退

### 📦 增强示例模板
- **Pandas 网络回退**：优先从网络加载 CSV，失败自动使用本地数据
- **本地数据集**：预置波士顿房价数据集供离线使用
- **补全友好**：模板代码返回 DataFrame 对象，便于测试补全功能

## 🚀 快速开始

### 1. 准备依赖

本项目需要以下目录（根据使用场景选择准备）：

#### 必需（核心功能）
```
pyodide/                    # Pyodide WASM 运行时
  pyodide.js
  pyodide.asm.js
  packages/
    jedi.js               # 代码补全引擎
    micropip.js           # 包管理器
    numpy.js              # 示例需要
    pandas.js             # 示例需要
```

下载 Pyodide（版本 0.23.0+）：
- 官方：https://github.com/pyodide/pyodide/releases
- 或使用 CDN：https://cdn.jsdelivr.net/pyodide/

#### 可选（离线完整体验）
```
monaco/                     # Monaco Editor 本地备份
  min/
    vs/
      loader.js
      editor/
        editor.main.js
        editor.main.css
        editor.worker.js
      language/
        json/json.worker.js
        css/css.worker.js
        html/html.worker.js
        typescript/ts.worker.js
```

下载 Monaco Editor（版本 0.47.0）：
- npm: `npm install monaco-editor@0.47.0`
- CDN: https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/

### 2. 启动服务

```bash
# 方式 1: Python 内置服务器
python -m http.server 5500

# 方式 2: Node.js http-server
npm run start

# 方式 3: 任何静态文件服务器
```

### 3. 访问应用

浏览器打开：http://localhost:5500/

**重要**：必须通过 HTTP(S) 协议访问，直接打开 file:// 会导致 CORS 错误和 Service Worker 无法注册。

## 📁 项目结构

```
.
├── index.html              # 主页面（全功能 UI + Monaco 加载）
├── py-worker.js            # Web Worker（异步 Python 操作）
├── sw.js                   # Service Worker（离线缓存）
├── templates.js            # 代码示例模板
├── index.js                # 占位文件
├── data/
│   └── boston_housing.csv  # 示例数据集
├── fonts/                  # JetBrains Mono 字体
└── README.md               # 本文件
```

## 🎮 功能使用

### 代码编辑与运行
1. 在编辑器中输入 Python 代码或选择示例模板
2. 点击"运行"按钮执行代码
3. 首次运行会自动安装检测到的第三方包
4. 输出显示在右侧面板

### 代码补全
- 输入变量名后按 `Ctrl+Space` 触发补全
- 输入 `.` 后自动弹出成员补全
- 适用于标准库、第三方库和用户定义的对象

### 错误调试
- 代码运行出错时，错误行会自动高亮
- 点击输出区的"跳转到错误行"按钮快速定位
- 鼠标悬停在错误行上查看提示

### 主题切换
- 点击右上角 🌓 图标切换深色/浅色主题
- 主题选择会自动保存，刷新后保持
- 编辑器主题与页面主题同步

### 停止执行
- 对于长时间运行的代码，点击"停止"按钮中断
- Worker 会被终止并重新启动，确保环境干净

### 离线使用
- 首次在线访问后，核心资源会被缓存
- 后续可在无网络环境下访问和运行代码
- Service Worker 自动处理缓存更新

## 🔧 技术架构

### 前端架构
- **UI 主线程**：仅负责界面渲染和用户交互
- **Web Worker 线程**：执行所有 Python 相关操作
- **Service Worker 线程**：管理资源缓存和离线功能

### 通信机制
```
用户交互 → WorkerClient → postMessage → py-worker.js
                            ← onmessage ← Pyodide 执行结果
```

### Monaco 加载策略
```
1. 检查 AMD loader (require)
   ├─ 未找到 → 注入本地 loader (monaco/monoca)
   └─ 已有 → 继续
2. 尝试加载 Monaco
   ├─ jsDelivr CDN (5s 超时)
   ├─ unpkg CDN (5s 超时)
   ├─ 本地 /monaco/min/vs
   └─ 本地 /monoca/min/vs
```

### Service Worker 缓存
- **安装阶段**：预缓存核心资产（HTML、JS、Monaco workers）
- **激活阶段**：清理旧版本缓存
- **请求阶段**：网络优先，失败回退缓存

## 🎨 自定义

### 添加代码模板
编辑 `templates.js`：
```javascript
const codeTemplates = {
    'my-template': `# 你的代码
print("Hello, World!")`,
    // ... 更多模板
};
```

### 修改主题颜色
编辑 `index.html` 中的 CSS 变量：
```css
:root {
    --bg-primary: #f7f7f7;
    --text-primary: #333;
    /* ... 更多变量 */
}

.dark-mode {
    --bg-primary: #1e1e1e;
    --text-primary: #d4d4d4;
    /* ... 更多变量 */
}
```

### 添加更多示例数据
将 CSV/JSON 文件放到 `data/` 目录，在模板中使用：
```python
import pandas as pd
df = pd.read_csv("/data/your-data.csv")
```

## ⚙️ 浏览器兼容性

### 完整支持（推荐）
- Chrome/Edge 90+
- Firefox 90+
- Safari 15.4+

### 功能降级
- **无 Service Worker**：离线功能不可用，其他正常
- **无 SharedArrayBuffer**：无法中断执行，需刷新页面

### 不支持
- IE 11 及以下（不支持 WebAssembly）

## 🐛 常见问题

### Q: 页面白屏或编辑器无法加载
A: 
1. 检查浏览器控制台错误
2. 确认通过 HTTP(S) 访问，不是 file://
3. 检查 Monaco Editor CDN 是否可访问
4. 准备本地 monaco/ 目录作为回退

### Q: 代码补全不工作
A:
1. 等待"✅ Python 环境准备就绪"提示
2. 确认 Jedi 包已加载（查看控制台日志）
3. 尝试手动触发补全（Ctrl+Space）

### Q: Service Worker 未生效
A:
1. 必须通过 HTTPS 或 localhost 访问
2. 检查浏览器开发者工具 → Application → Service Workers
3. 点击 "Update" 或 "Unregister" 重新注册

### Q: 包安装失败
A:
1. 某些包不支持 Pyodide（如 tensorflow）
2. 检查包名是否正确
3. 查看控制台详细错误信息

### Q: 深色模式闪烁
A:
- 已通过 `<head>` 内联脚本解决，如仍有问题请清除浏览器缓存

## 📝 开发路线图

### 已完成 ✅
- [x] 异步 Web Worker 架构
- [x] 深色模式完整支持
- [x] 错误行高亮与跳转
- [x] Monaco 多源加载
- [x] Service Worker 离线缓存
- [x] Jedi 补全优化
- [x] Pandas/Numpy 模板

### 计划中 🔜
- [ ] 主题配置界面（跟随系统/总是深色/总是浅色）
- [ ] 更多预置数据集
- [ ] 代码格式化（Black）
- [ ] 代码静态检查（Pyflakes）
- [ ] 执行历史记录
- [ ] 代码片段分享功能
- [ ] 多文件项目支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南
1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

## 🙏 致谢

- [Pyodide](https://pyodide.org/) - Python for the browser
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - VS Code 编辑器核心
- [Jedi](https://jedi.readthedocs.io/) - Python 代码分析
- [pandas](https://pandas.pydata.org/) - 数据分析库
- [NumPy](https://numpy.org/) - 科学计算库

## 📧 联系方式

- Issues: https://github.com/JasonZ-Star/py_playground/issues
- Discussions: https://github.com/JasonZ-Star/py_playground/discussions

---

**享受 Python 在线编程的乐趣！** 🐍✨
