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
const PYODIDE_CONFIG = {
    timeoutMs: 30000,
    jediTimeoutMs: 10000,
};
const stdlibModules = new Set();
const installed = new Set();


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
    const importRegex = /(?:^|\n)\s*import\s+([a-zA-Z_][a-zA-Z0-9_.]*)|(?:^|\n)\s*from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import/g;
    let match;
    try {
        const loadedPackages = pyodide.loadedPackages;
        // Retrieve sys.modules list as JSON to ensure a plain JS array (avoid PyProxy pitfalls)
        const sysModulesJson = await pyodide.runPythonAsync('import sys, json; json.dumps(list(sys.modules.keys()))');
        const sysModules = JSON.parse(sysModulesJson || '[]');
        while ((match = importRegex.exec(code)) !== null) {
            const moduleName = (match[1] || match[2]).split('.')[0];
            if (
                moduleName &&
                !loadedPackages[moduleName] &&
                !sysModules.includes(moduleName) &&
                !stdlibModules.has(moduleName) &&
                !installed.has(moduleName)
            ) {
                pkgsToInstall.add(moduleName);
            }
        }
        // 简单别名启发式
        const lowered = code;
        const needPandas = /(^|\W)pd\s*\./.test(lowered) && !/import\s+pandas\s+as\s+pd/.test(lowered);
        const needNumpy  = /(^|\W)np\s*\./.test(lowered) && !/import\s+numpy\s+as\s+np/.test(lowered);
        const needMat    = /(^|\W)plt\s*\./.test(lowered) && !/import\s+matplotlib\.pyplot\s+as\s+plt/.test(lowered);
        const needSeaborn= /(^|\W)sns\s*\./.test(lowered) && !/import\s+seaborn\s+as\s+sns/.test(lowered);
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
        let lineNum = null;

        if (e.name === 'PythonError' || e.constructor?.name === 'PythonError') {
            try {
                await pyodide.runPythonAsync(`
import sys, io, traceback
if not isinstance(sys.stderr, io.StringIO):
    sys.stderr = io.StringIO()
traceback.print_exc(file=sys.stderr)
                `);
                errorMsg = pyodide.runPython('sys.stderr.getvalue()');
            } catch {}
        }

        // Best-effort extract error line number from traceback
        try {
            // Prefer frames pointing to <exec>/<string>/example.py (user code)
            const frameMatches = errorMsg.match(/File \"([^\"]+)\", line (\d+)/g);
            if (frameMatches && frameMatches.length) {
                // Use the last frame that looks like user code
                for (let i = frameMatches.length - 1; i >= 0; i--) {
                    const m = /File \"([^\"]+)\", line (\d+)/.exec(frameMatches[i]);
                    if (m) {
                        const file = m[1] || '';
                        const n = parseInt(m[2], 10);
                        if (Number.isFinite(n) && (file.includes('<exec>') || file.includes('<string>') || file.endsWith('example.py'))) {
                            lineNum = n; break;
                        }
                        // Fallback: accept the last frame even if file doesn't match
                        if (i === frameMatches.length - 1 && Number.isFinite(n)) {
                            lineNum = n; break;
                        }
                    }
                }
            } else {
                const m2 = errorMsg.match(/line (\d+)/);
                if (m2) lineNum = parseInt(m2[1], 10);
            }
        } catch {}

        return {
            success: false,
            output: `❌ 错误:\n${errorMsg}`,
            time: executionTime,
            line: lineNum
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
