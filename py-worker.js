/**
 * Python Web Worker (v0.36)
 *
 * 负责在后台线程中加载 Pyodide 并执行所有
 * CPU 密集型任务 (代码执行, 包安装, 代码补全)
 */

// ========================================
// Worker 全局状态
// ========================================
let pyodide = null;
let jediCompletionFn = null;
let interruptView = null;
const PYODIDE_CONFIG = {
    timeoutMs: 30000,
    jediTimeoutMs: 10000,
};
const stdlibModules = new Set();
const installed = new Set();
let extractImportsFn = null;


// ========================================
// Pyodide 加载
// ========================================

/**
 * 加载 Pyodide 核心
 * @param {string} indexURL
 */
async function loadPyodideInstance(indexURL) {
    try {
        importScripts("pyodide/pyodide.js");
        pyodide = await loadPyodide({ indexURL });
        await pyodide.loadPackage(["micropip", "jedi"]);

        // 将 Python 的 stdlib_module_names 转为 JS 数组再迭代
        let namesProxy = pyodide.runPython('list(__import__("sys").stdlib_module_names)');
        try {
            const names = namesProxy && namesProxy.toJs ? namesProxy.toJs() : [];
            for (const name of names) {
                stdlibModules.add(name);
            }
        } finally {
            try { namesProxy && namesProxy.destroy && namesProxy.destroy(); } catch {}
        }

        // 预载常用数据到虚拟文件系统
        try {
            await pyodide.FS.mkdirTree('/data');
            const resp = await fetch('data/boston_housing.csv');
            if (resp.ok) {
                const buf = new Uint8Array(await resp.arrayBuffer());
                pyodide.FS.writeFile('/data/boston_housing.csv', buf);
            }
        } catch (e) {
            // 数据预载失败非致命
            console.warn('[Worker] Preload data failed:', e.message || e);
        }

        return { success: true };
    } catch (e) {
        console.error('[Worker] Pyodide load failed:', e);
        return { success: false, error: e.message };
    }
}

// ========================================
// Jedi (代码补全)
// ========================================

/**
 * 初始化 Jedi 补全函数
 */
async function initJedi() {
    try {
        await pyodide.runPythonAsync(`
import json
import jedi
import traceback
import sys

def get_jedi_completions(code, line, column):
    try:
        script = jedi.Script(code, path="example.py")
        completions = script.complete(line, column)
        # 限制 30 条, 过滤私有属性
        result = [[c.name, c.type] for c in completions[:30] if not c.name.startswith("_")]
        return json.dumps(result)
    except Exception as e:
        # Jedi 错误不应该崩溃 Worker，而是返回空
        print(f"Jedi error: {e}", file=sys.stderr)
        return "[]"
        `);
        jediCompletionFn = pyodide.globals.get('get_jedi_completions');
        return { success: true };
    } catch (e) {
        console.error('[Worker] Jedi init failed:', e);
        return { success: false, error: e.message };
    }
}

/**
 * 执行 Jedi 补全
 * @param {object} payload - { code, line, column }
 */
async function getCompletions(payload) {
    if (!jediCompletionFn) return { success: false, error: 'Jedi not initialized' };
    const { code, line, column } = payload;
    try {
        // 为补全注入缺失别名导入（仅限分析，不影响实际运行）
        let preface = '';
        if (!/import\s+pandas\s+as\s+pd/.test(code) && /(^|\W)pd\s*\./.test(code)) preface += 'import pandas as pd\n';
        if (!/import\s+numpy\s+as\s+np/.test(code) && /(^|\W)np\s*\./.test(code)) preface += 'import numpy as np\n';
        if (!/import\s+matplotlib\.pyplot\s+as\s+plt/.test(code) && /(^|\W)plt\s*\./.test(code)) preface += 'import matplotlib.pyplot as plt\n';
        if (!/import\s+seaborn\s+as\s+sns/.test(code) && /(^|\W)sns\s*\./.test(code)) preface += 'import seaborn as sns\n';

        // 基于光标变量的最小类型引导
        try {
            const lines = code.split('\n');
            const before = (lines[line-1] || '').slice(0, Math.max(0, column));
            const m = before.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\.$/);
            if (m) {
                const varName = m[1];
                // 搜索赋值来源
                const assignRe = new RegExp('^\\s*' + varName + '\\s*=\\s*(.+)$', 'm');
                const mm = code.match(assignRe);
                if (mm) {
                    const rhs = mm[1];
                    if (/pd\s*\.\s*DataFrame\s*\(/.test(rhs)) {
                        if (!/import\s+pandas\s+as\s+pd/.test(preface + code)) preface = 'import pandas as pd\n' + preface;
                        preface += `${varName} = pd.DataFrame()\n`;
                    } else if (/(np|numpy)\s*\.\s*array\s*\(/.test(rhs)) {
                        if (!/import\s+numpy\s+as\s+np/.test(preface + code)) preface = 'import numpy as np\n' + preface;
                        preface += `${varName} = np.array([])\n`;
                    }
                }
            }
        } catch {}

        const analysisCode = preface ? preface + '\n' + code : code;

        const completionPromise = jediCompletionFn(analysisCode, line, column);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PYODIDE_CONFIG.jediTimeoutMs));
        const resultsString = await Promise.race([completionPromise, timeoutPromise]);
        const suggestions = JSON.parse(resultsString);
        return { success: true, suggestions };
    } catch (e) {
        if (e.message !== 'timeout') console.error('[Worker] Completion error:', e);
        return { success: true, suggestions: [] };
    }
}

/**
 * (v0.32) 预热 Jedi 引擎
 */
async function warmupCompletion(moduleName) {
    if (!jediCompletionFn) return;
    try {
        const testCode = `import ${moduleName}\n${moduleName}.`;
        await Promise.race([
            jediCompletionFn(testCode, 2, moduleName.length + 1),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)) // 预热超时
        ]);
        console.log(`[Worker] Warmup completion for ${moduleName} done.`);
    } catch (e) {
        console.warn(`[Worker] Warmup completion for ${moduleName} skipped:`, e.message);
    }
}

// ========================================
// 包管理
// ========================================

/**
 * (v0.36) 在 Worker 中查找包
 * (v0.34 的 findNewPackages 逻辑)
 */
async function findPackages(payload) {
    const { code } = payload;
    const pkgsToInstall = new Set();
    try {
        await ensureAstHelper();
        const loadedPackages = pyodide.loadedPackages;
        const sysModules = await pyodide.runPythonAsync('list(sys.modules.keys())');

        // 通过 AST 获取顶级包列表
        let pkgJson = '[]';
        try {
            pkgJson = extractImportsFn(code);
        } catch (e) {
            // AST 失败时退化为空列表
        }
        const topPkgs = JSON.parse(pkgJson || '[]');
        for (const moduleName of topPkgs) {
            if (moduleName &&
                !loadedPackages[moduleName] &&
                !sysModules.includes(moduleName) &&
                !stdlibModules.has(moduleName) &&
                !installed.has(moduleName)) {
                pkgsToInstall.add(moduleName);
            }
        }

        // 别名启发式：处理未显式导入但使用了常见别名的情况
        const needPandas = /(^|\W)pd\s*\./.test(code) && !/import\s+pandas(\s+as\s+pd|\s*$)/.test(code);
        const needNumpy  = /(^|\W)np\s*\./.test(code) && !/import\s+numpy(\s+as\s+np|\s*$)/.test(code);
        const needMat    = /(^|\W)plt\s*\./.test(code) && !/import\s+matplotlib\.pyplot(\s+as\s+plt|\s*$)/.test(code);
        const needSeaborn= /(^|\W)sns\s*\./.test(code) && !/import\s+seaborn(\s+as\s+sns|\s*$)/.test(code);
        if (needPandas) pkgsToInstall.add('pandas');
        if (needNumpy) pkgsToInstall.add('numpy');
        if (needMat) pkgsToInstall.add('matplotlib');
        if (needSeaborn) pkgsToInstall.add('seaborn');

    } catch (e) {
        console.warn('[Worker] Error finding packages:', e);
    }

    return { success: true, packages: Array.from(pkgsToInstall) };
}


/**
 * 安装包
 * @param {object} payload - { packages: string[] }
 */
async function installPackages(payload) {
    const { packages } = payload;
    if (!packages || packages.length === 0) {
        return { success: true };
    }

    try {
        const micropip = pyodide.pyimport("micropip");
        const toInstall = [];
        for (const pkg of packages) {
            if (pyodide.loadedPackages[pkg]) {
                installed.add(pkg);
            } else {
                toInstall.push(pkg);
            }
        }

        const preferLoad = new Set(['numpy','pandas','matplotlib','seaborn','scipy','scikit-learn','sklearn','Pillow','PIL','sympy','networkx','bokeh','altair']);
        for (const pkg of toInstall) {
            let ok = false;
            if (preferLoad.has(pkg)) {
                try {
                    await pyodide.loadPackage(pkg);
                    installed.add(pkg); ok = true;
                } catch (e) {
                    // fallback to micropip
                }
            }
            if (!ok) {
                await micropip.install([pkg]);
                installed.add(pkg);
            }
        }

        for (const pkg of packages) {
            await warmupCompletion(pkg);
        }

        await pyodide.runPythonAsync(`
try:
    import jedi.cache
    jedi.cache.clear()
except (ImportError, AttributeError):
    pass
        `);
        try { micropip.destroy(); } catch {}
        return { success: true };

    } catch (e) {
        console.error('[Worker] Install failed:', e);
        return { success: false, error: e.message };
    }
}


// ========================================
// 代码执行（一次性返回 stdout/stderr）
// ========================================

/**
 * 执行 Python 代码
 * @param {object} payload - { code: string }
 */
async function executeCode(payload) {
    const { code } = payload;

    const startTime = Date.now();
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`执行超时 (>${PYODIDE_CONFIG.timeoutMs / 1000}秒)`)), PYODIDE_CONFIG.timeoutMs)
    );

    try {
        await pyodide.runPythonAsync(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
        `);

        await Promise.race([pyodide.runPythonAsync(code), timeoutPromise]);

        const stdout = pyodide.runPython('sys.stdout.getvalue()');
        const stderr = pyodide.runPython('sys.stderr.getvalue()');
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(3);

        const output = (stderr && stderr.trim()) || (stdout && stdout.trim()) || '(无输出)';
        return {
            success: true,
            output: output,
            time: executionTime
        };

    } catch (e) {
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(3);
        let errorMsg = e.message || String(e);
        let errLine = null;

        if (e.name === 'PythonError' || e.constructor?.name === 'PythonError') {
            try {
                await pyodide.runPythonAsync(`
import sys, io, traceback
if not isinstance(sys.stderr, io.StringIO):
    sys.stderr = io.StringIO()
# 打印完整回溯
traceback.print_exc(file=sys.stderr)
# 提取最后一帧行号
_lno = None
try:
    _tb = sys.exc_info()[2]
    _stk = traceback.extract_tb(_tb)
    if _stk:
        _lno = _stk[-1].lineno
except Exception:
    _lno = None
                `);
                errorMsg = pyodide.runPython('sys.stderr.getvalue()');
                try { errLine = pyodide.runPython('_lno'); } catch {}
            } catch {}
        }

        return {
            success: false,
            output: `❌ 错误:\n${errorMsg}`,
            time: executionTime,
            line: (typeof errLine === 'number' ? errLine : null)
        };
    }
}


// ========================================
// Worker 消息处理器
// ========================================

self.onmessage = async (e) => {
    const { id, type, action, payload } = e.data || {};
    if (type !== 'request') return;

    let responsePayload = {};

    try {
        switch (action) {
            case 'load':
                responsePayload = await loadPyodideInstance(payload.indexURL);
                break;

            case 'init_jedi':
                responsePayload = await initJedi();
                break;

            case 'setup_interrupt':
                try {
                    const { sab } = payload || {};
                    if (sab) {
                        interruptView = new Int32Array(sab);
                        // 将中断缓冲区传给 pyodide
                        // 若浏览器不支持 SAB，此路径不会执行
                        // 这里不会抛错，但 pyodide 可能在某些版本不暴露 setInterruptBuffer
                        if (pyodide?.setInterruptBuffer) {
                            pyodide.setInterruptBuffer(interruptView);
                        }
                        responsePayload = { success: true };
                    } else {
                        responsePayload = { success: false, error: 'No SAB provided' };
                    }
                } catch (err) {
                    responsePayload = { success: false, error: err.message };
                }
                break;

            case 'find_packages':
                responsePayload = await findPackages(payload);
                break;

            case 'install':
                responsePayload = await installPackages(payload);
                break;

            case 'execute':
                responsePayload = await executeCode(payload);
                break;

            case 'complete':
                responsePayload = await getCompletions(payload);
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        // 发送成功响应
        self.postMessage({ id, type: 'response', payload: responsePayload });

    } catch (e) {
        // 发送失败响应
        self.postMessage({
            id,
            type: 'response',
            payload: { success: false, error: e.message }
        });
    }
};

/**
 * 确保 AST 辅助函数可用
 * 定义 Python 辅助函数 _extract_top_packages via ast.parse
 * 并缓存其 PyProxy 以供重用
 */
async function ensureAstHelper() {
    if (extractImportsFn) return;
    await pyodide.runPythonAsync(`
import ast, json

def _extract_top_packages(code):
    try:
        tree = ast.parse(code)
    except Exception:
        return json.dumps([])
    pkgs = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name:
                    pkgs.add(alias.name.split('.')[0])
        elif isinstance(node, ast.ImportFrom):
            if getattr(node, 'module', None):
                pkgs.add(node.module.split('.')[0])
    return json.dumps(sorted(pkgs))
    `);
    extractImportsFn = pyodide.globals.get('_extract_top_packages');
}
