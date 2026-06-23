# 枫下代码 前端优化 — 21st.dev 风格改造

## 改造概览

基于 21st.dev 的设计语言（暗色赛博极简 + 玻璃态 + 动效优先 + 发光渐变），对枫下代码 Python Playground 进行了系统性前端视觉升级。所有 JS 逻辑保持不变，仅通过 CSS 变量层、样式覆盖和少量 HTML 结构调整完成改造。

## 具体变更

### 1. Design Tokens 重写
- 色彩系统从传统 flat 色改为 21st.dev 风格的半透明/渐变体系
- 新增 `--accent` / `--accent-light` / `--accent-glow` 强调色 token（紫色系 #534AB7）
- 新增 `--glass-bg` / `--glass-border` / `--glass-blur` 玻璃态 token
- 新增 `--radius-sm/md/lg/xl` 圆角层级（8px → 24px）
- 新增 `--transition-fast/smooth` 动效曲线（cubic-bezier(0.16,1,0.3,1)）
- 暗色模式背景从 #1e1e1e → #0a0a0a（更深、更沉浸）
- 面板背景从 solid → rgba 半透明 + backdrop-filter: blur(16px) saturate(180%)

### 2. 面板/卡片 — 玻璃态改造
- 所有 `.panel` 使用 backdrop-filter: blur(16px) saturate(180%)
- 暗色模式下微光阴影 box-shadow: 0 0 30px rgba(83,74,183,0.04)
- 内发光边 inset 0 1px 0 rgba(255,255,255,0.04) 模拟玻璃边缘
- 编辑器面板 focus-within 时紫色发光边框

### 3. Header — Glass Navbar
- 去掉传统 bottom-border，改为 rounded 卡片式 header
- backdrop-filter 玻璃态 + 渐变伪元素装饰
- 右侧微紫色渐变光晕

### 4. 按钮 — 从彩虹实色到 Glass+Glow
- 运行按钮保留渐变（accent → accent-light）+ hover 发光阴影
- 其他按钮改为玻璃态底色 + 每个按钮保留语义色边框/文字
- hover 时统一 accent 发光（box-shadow: 0 0 16px rgba(83,74,183,0.35))
- 所有按钮增加 translateY(-1px) 悬浮微动效

### 5. 图标按钮 — Emoji → SVG
- 去掉 emoji 图标，替换为 Feather-style SVG 线条图标
- 更专业、更一致、更好缩放
- 深色模式切换时 SVG 动态切换（月亮 ↔ 太阳）

### 6. 加载屏 — 深色沉浸
- 背景改为 rgba(0,0,0,0.85) + backdrop-filter: blur(24px)
- spinner 从粗边框改为细边框 + accent-light 色顶部
- 动画从 linear 改为 cubic-bezier 弹性曲线

### 7. Modal — 玻璃态弹窗
- backdrop-filter: blur(12px) 模糊背景
- 内容区 backdrop-filter: blur(24px) + 顶部紫色渐变装饰光
- 关闭按钮改为 ghost 样式，主按钮保留 accent 渐变

### 8. 暗色模式环境光效
- 新增 #app-container::before 环境光球（radial-gradient 紫色）
- 12s 缓慢漂浮动画 ambientShift，营造沉浸氛围
- 所有内容 z-index:1 保证在光效之上

### 9. 响应式优化
- 新增 769px-1024px 中等屏幕断点，优化编辑器/输出比例
- 移动端按钮尺寸更紧凑（min-width: 70px）
- 图标按钮移动端缩小至 32px

### 10. 可访问性增强
- 所有交互元素添加 focus-visible 样式（accent-light 轮廓）
- SVG 图标按钮添加 aria-label
- 保持 WCAG 2.1 AA 兼容

## 未改动部分
- 所有 JS 逻辑（Pyodide、Monaco、模板选择、分享、数据管理器等）
- 所有 DOM ID（保证事件绑定不中断）
- templates.js / share.html / py-worker.js 等独立文件

## 风格对标
| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| 背景 | #1e1e1e solid | #0a0a0a + 玻璃态 + 环境光 |
| 面板 | solid white/dark | rgba 半透明 + backdrop-filter |
| 按钮 | 彩虹实色 | Glass + Glow + accent 统一 |
| 图标 | Emoji | Feather SVG 线条 |
| 动效 | linear/ease | cubic-bezier(0.16,1,0.3,1) 弹性 |
| 圆角 | 6-10px 混用 | 8/12/16/24px 层级 |
| 发光 | 无 | accent glow + 状态指示发光 |
| 字体 | system | Inter + JetBrains Mono (var) |

---
**Frontend Developer**: 像素匠
**改造日期**: 2026-06-22
**风格参考**: 21st.dev (暗色赛博极简 + 玻璃态 + 动效优先)
