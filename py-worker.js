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
let dataMounted = false;
let dataMountPromise = null;

function fsExists(path) {
    try {
        const st = pyodide && pyodide.FS && pyodide.FS.analyzePath(path);
        return !!(st && st.exists);
    } catch { return false; }
}

function getDataBaseUrlCandidates() {
    const candidates = [];
    try {
        // Relative to worker script (same directory root)
        candidates.push(new URL('data/', self.location.href).href);
    } catch {}
    try {
        // Absolute at origin root (useful when hosted at root)
        candidates.push(new URL('/data/', self.location.origin).href);
    } catch {}
    try {
        // Relative to current path directory
        const u = new URL(self.location.href);
        const dir = u.pathname.replace(/[^/]+$/, '');
        candidates.push(new URL(dir + 'data/', u.origin).href);
    } catch {}
    // De-duplicate
    return Array.from(new Set(candidates));
}

async function resolveDataBaseUrl() {
    const cands = getDataBaseUrlCandidates();
    // Try directory listing first
    for (const base of cands) {
        try {
            const r = await fetch(base, { method: 'GET', cache: 'no-cache' });
            if (r.ok) return base;
        } catch {}
    }
    // Fallback: try a known file
    for (const base of cands) {
        try {
            const r = await fetch(new URL('boston_housing.csv', base).href, { cache: 'no-cache' });
            if (r.ok) return base;
        } catch {}
    }
    // As a last resort, return the first candidate
    return cands[0] || '/data/';
}

function postProgress(text, payload) {
    try { self.postMessage({ type: 'progress', text, payload }); } catch {}
}

// Ensure a specific file exists in Pyodide FS; fetch from candidates if missing
async function ensureFilePresent(pathInFs, candidates) {
    if (fsExists(pathInFs)) return true;
    const bases = candidates || getDataBaseUrlCandidates();
    // Normalize the path to a relative file part against a /data/ base
    const rel = pathInFs.replace(/^\/+/, ''); // strip leading '/'
    const relAgainstData = rel.startsWith('data/') ? rel.slice('data/'.length) : rel;
    for (const base of bases) {
        try {
            // If base already ends with /data/, append only the file part; otherwise append full relative path
            const baseEndsWithData = /\/data\/?$/.test(base);
            const joinPart = baseEndsWithData ? relAgainstData : rel;
            const url = new URL(joinPart, base).href;
            const r = await fetch(url, { cache: 'no-cache' });
            if (!r.ok) continue;
            const buf = await r.arrayBuffer();
            // Ensure directory
            try { pyodide.FS.mkdirTree(pathInFs.replace(/\/[^/]*$/, '')); } catch {}
            pyodide.FS.writeFile(pathInFs, new Uint8Array(buf));
            return true;
        } catch {}
    }
    return false;
}

// Try to mirror /data directory into Pyodide FS
async function mountDataDir(baseUrl) {
    baseUrl = baseUrl || await resolveDataBaseUrl();
    if (!pyodide || !pyodide.FS) return;
    try { pyodide.FS.mkdirTree('/data'); } catch {}

    let mountedCount = 0;
    try {
        const res = await fetch(baseUrl, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const hrefs = [];
        const re = /href=["']([^"'#?]+)["']/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
            const href = m[1];
            if (!href || href === '../') continue;
            if (href.endsWith('/')) continue;
            hrefs.push(href);
        }
        if (hrefs.length === 0) hrefs.push('boston_housing.csv');

        for (const name of hrefs) {
            try {
                const url = new URL(name, baseUrl).href;
                const r = await fetch(url);
                if (r.ok) {
                    const buf = await r.arrayBuffer();
                    const path = '/data/' + name;
                    const parts = path.split('/').slice(1, -1);
                    if (parts.length) {
                        let acc = '';
                        for (const p of parts) { acc += '/' + p; try { pyodide.FS.mkdir(acc); } catch {} }
                    }
                    pyodide.FS.writeFile(path, new Uint8Array(buf));
                    mountedCount++;
                }
            } catch (e) {
                console.warn('[Worker] Skip mounting file from data:', name, e?.message || e);
            }
        }
        dataMounted = mountedCount > 0;
        // Ensure the key CSV exists even if directory listing missed it
        if (!fsExists('/data/boston_housing.csv')) {
            const ok = await ensureFilePresent('/data/boston_housing.csv', [baseUrl]);
            if (ok) mountedCount++;
            dataMounted = dataMounted || ok;
        }
        postProgress('数据目录挂载完成', `${mountedCount} 个文件`);
    } catch (e) {
        console.warn('[Worker] Data directory listing failed, fallback single file:', e?.message || e);
        try {
            const ok = await ensureFilePresent('/data/boston_housing.csv', [baseUrl]);
            if (ok) {
                dataMounted = true; mountedCount = 1;
                postProgress('数据文件挂载完成', 'boston_housing.csv');
            }
        } catch (e2) {
            console.warn('[Worker] Fallback mount /data/boston_housing.csv failed:', e2?.message || e2);
            postProgress('数据挂载失败', e2?.message || 'fallback failed');
        }
    }
}

async function ensureDataMounted() {
    if (dataMounted) return;
    if (!dataMountPromise) {
        dataMountPromise = (async ()=>{ const base = await resolveDataBaseUrl(); await mountDataDir(base); })().catch((e)=>{
            console.warn('[Worker] ensureDataMounted failed:', e?.message || e);
        });
    }
    try { await dataMountPromise; } catch {}
}

// ========================================
// Pyodide 加载
// ========================================

/**
 * 加载 Pyodide 核心
 * @param {string} indexURL
 */
async function loadPyodideInstance(indexURL) {
    try {
        const cdnBases = [
            'https://cdn.jsdelivr.net/pyodide/v0.29.0/full',
            'https://unpkg.com/pyodide@0.29.0/full',
            'https://fastly.jsdelivr.net/pyodide/v0.29.0/full',
            'https://cdnjs.cloudflare.com/ajax/libs/pyodide/0.29.0/full'
        ];
        const localBase = (indexURL || 'pyodide/').replace(/\/+$/, '');
        const candidates = [...cdnBases, localBase];
        let lastErr;
        for (const base of candidates) {
            try {
                // Load pyodide.js from candidate base
                importScripts(`${base}/pyodide.js`);
                // Initialize with matching indexURL
                pyodide = await loadPyodide({ indexURL: `${base}/` });
                await pyodide.loadPackage(["micropip", "jedi"]);

                // Fill stdlib names
                let namesProxy = pyodide.runPython('list(__import__("sys").stdlib_module_names)');
                try {
                    const names = namesProxy && namesProxy.toJs ? namesProxy.toJs() : [];
                    for (const name of names) {
                        stdlibModules.add(name);
                    }
                } finally {
                    try { namesProxy && namesProxy.destroy && namesProxy.destroy(); } catch {}
                }

                // Mount data directory (best-effort)
                try { const base = await resolveDataBaseUrl(); await mountDataDir(base); } catch (e) { console.warn('[Worker] mountDataDir failed:', e?.message || e); }

                return { success: true };
            } catch (e) {
                lastErr = e;
                console.warn('[Worker] Pyodide load failed from', base, e?.message || e);
                // Try next candidate
            }
        }
        return { success: false, error: lastErr?.message || 'Pyodide 加载失败' };
    } catch (e) {
        console.error('[Worker] Pyodide load failed (fatal):', e);
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
        // Ensure jedi is available
        let hasJedi = false;
        try {
            await pyodide.runPythonAsync('import jedi; _v=jedi.__version__');
            hasJedi = true;
        } catch {}
        if (!hasJedi) {
            postProgress('尝试加载补全引擎 (Jedi)…');
            try { await pyodide.loadPackage('jedi'); hasJedi = true; } catch {}
        }
        if (!hasJedi) {
            postProgress('正在修复补全引擎 (Jedi)，可能稍慢…');
            try {
                const micropip = pyodide.pyimport('micropip');
                await micropip.install(['jedi==0.19.1']);
                try { micropip.destroy(); } catch {}
                await pyodide.runPythonAsync('import jedi; _v=jedi.__version__');
                hasJedi = true;
            } catch (e) {
                console.warn('[Worker] micropip install jedi failed:', e?.message || e);
            }
        }
        if (!hasJedi) {
            postProgress('补全引擎不可用', '请检查网络或稍后重试');
            return { success: false, error: 'Jedi 不可用' };
        }

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
        postProgress('补全引擎就绪', 'Jedi');
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

        const nativeOnly = new Set(['numpy','pandas','matplotlib','seaborn','scipy','scikit-learn','sklearn','Pillow','PIL','sympy','networkx','bokeh','altair']);
        const preferLoad = nativeOnly; // keep same set, but forbid pip fallback

        const failures = [];
        for (const pkg of toInstall) {
            if (preferLoad.has(pkg)) {
                try {
                    await pyodide.loadPackage(pkg);
                    installed.add(pkg);
                    continue;
                } catch (e) {
                    // Do not fallback to micropip for native packages in Pyodide
                    failures.push({ pkg, error: e.message || String(e) });
                    continue;
                }
            }
            // For other (likely pure-Python) packages, try micropip
            try {
                await micropip.install([pkg]);
                installed.add(pkg);
            } catch (e) {
                failures.push({ pkg, error: e.message || String(e) });
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

        // Post-install self-check: try importing installed packages to catch incompatible wheels
        try {
            const names = JSON.stringify(Array.from(new Set(toInstall)));
            const checkResult = await pyodide.runPythonAsync(`
import json, importlib
fails = {}
oks = []
for _name in json.loads('''${names}'''):
    try:
        if not _name:
            continue
        importlib.import_module(_name)
        oks.append(_name)
    except Exception as e:
        fails[_name] = str(e)
json.dumps({'ok': oks, 'fail': fails})
            `);
            const parsed = JSON.parse(checkResult || '{"ok":[],"fail":{}}');
            const failMap = parsed && parsed.fail ? parsed.fail : {};
            const bad = Object.keys(failMap);
            if (bad.length) {
                const msg = bad.map(k => `${k}: ${failMap[k]}`).join('; ');
                postProgress('包自检失败', msg);
                return { success: false, error: `包自检失败: ${msg}` };
            }
        } catch (e) {
            // Self-check errors shouldn't crash install; just log
            console.warn('[Worker] Post-install self-check skipped:', e?.message || e);
        }

        if (failures.length) {
            const msg = failures.map(f => `${f.pkg}: ${f.error}`).join('; ');
            postProgress('部分包安装失败', msg);
            return { success: false, error: `部分包安装失败: ${msg}` };
        }
        postProgress('模块安装完成', packages.join(', '));
        return { success: true };

    } catch (e) {
        console.error('[Worker] Install failed:', e);
        postProgress('模块安装失败', e.message || 'unknown');
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
        // Ensure data is mounted before running user code
        try { await ensureDataMounted(); } catch {}
        // Second-chance ensure key CSV exists, in case directory listing was blocked
        try { await ensureFilePresent('/data/boston_housing.csv'); } catch {}

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
        let colNum = null;

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

        // Prefer the frame that points to user code ('<exec>' / '<string>' / 'example.py')
        try {
            const frames = [];
            const re = /File \"([^\"]+)\", line (\d+)/g;
            let m;
            while ((m = re.exec(errorMsg)) !== null) {
                frames.push({ file: m[1], line: parseInt(m[2], 10) });
            }
            let preferred = null;
            for (let i = frames.length - 1; i >= 0; i--) {
                const f = frames[i];
                if (!Number.isFinite(f.line)) continue;
                if (f.file.includes('<exec>') || f.file.includes('<string>') || f.file.endsWith('example.py')) {
                    preferred = f.line; break;
                }
            }
            if (preferred != null) {
                lineNum = preferred;
            } else if (frames.length) {
                // fallback to last frame's line
                lineNum = frames[frames.length - 1].line;
            } else {
                const m2 = errorMsg.match(/line (\d+)/);
                if (m2) lineNum = parseInt(m2[1], 10);
            }
            // Try to find a caret line to estimate column (syntax errors)
            const parts = (errorMsg || '').split(/\n/);
            for (let i = parts.length - 1; i >= 1; i--) {
                const ln = parts[i];
                if (/^\s*\^+\s*$/.test(ln)) {
                    const firstCaret = ln.indexOf('^');
                    if (firstCaret >= 0) { colNum = firstCaret + 1; }
                    break;
                }
            }
            if (colNum == null) {
                const mc = errorMsg.match(/column\s+(\d+)/i);
                if (mc) colNum = parseInt(mc[1], 10);
            }
        } catch {}

        return {
            success: false,
            output: `❌ 错误:\n${errorMsg}`,
            time: executionTime,
            line: lineNum,
            col: colNum
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

            case 'setup_interrupt':
                try {
                    if (pyodide && typeof pyodide.setInterruptBuffer === 'function' && payload?.sab) {
                        pyodide.setInterruptBuffer(payload.sab);
                        responsePayload = { success: true };
                    } else {
                        responsePayload = { success: false, error: 'setInterruptBuffer not available' };
                    }
                } catch (err) {
                    responsePayload = { success: false, error: err.message || String(err) };
                }
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
