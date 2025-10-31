// py-worker.js - Web Worker for async Python operations
// Handles package installation, code execution, and completions without blocking UI

let pyodide = null;
let jediInitialized = false;

// Message handler
self.onmessage = async function(e) {
    const { action, data, id } = e.data;
    
    try {
        switch(action) {
            case 'load':
                await loadPyodideInstance(data);
                postMessage({ id, action, status: 'success' });
                break;
            case 'install':
                await installPackages(data.packages);
                postMessage({ id, action, status: 'success' });
                break;
            case 'execute':
                const result = await executeCode(data.code);
                postMessage({ id, action, status: 'success', result });
                break;
            case 'complete':
                const completions = await getCompletions(data.code, data.line, data.column);
                postMessage({ id, action, status: 'success', completions });
                break;
            case 'find_packages':
                const packages = await findPackages(data.code);
                postMessage({ id, action, status: 'success', packages });
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch(error) {
        postMessage({ 
            id, 
            action, 
            status: 'error', 
            error: error.message || error.toString(),
            stack: error.stack
        });
    }
};

// Load Pyodide instance
async function loadPyodideInstance(config) {
    if (pyodide) return;
    
    postMessage({ action: 'load', status: 'progress', message: '正在加载 Python 核心环境...' });
    
    // Import Pyodide from CDN or local
    importScripts(config.pyodideUrl || 'pyodide/pyodide.js');
    
    pyodide = await loadPyodide({ 
        indexURL: config.indexURL || 'pyodide/' 
    });
    
    // Redirect stdout/stderr
    await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);
    
    postMessage({ action: 'load', status: 'progress', message: 'Python 环境加载完成' });
}

// Initialize Jedi for completions
async function initJedi() {
    if (jediInitialized) return;
    
    postMessage({ action: 'load', status: 'progress', message: '正在加载代码补全引擎 (jedi)...' });
    
    try {
        await pyodide.loadPackage('jedi');
        
        await pyodide.runPythonAsync(`
import json
import jedi
import traceback
import sys

# Heuristic type hints for common aliases
_type_hints = {
    'pd': 'pandas',
    'np': 'numpy',
    'plt': 'matplotlib.pyplot'
}

def get_jedi_completions(code, line, column):
    try:
        # Try to infer variable types from common patterns
        lines = code.split('\\n')
        namespace = {}
        
        # Check for common import patterns and create dummy objects
        for line_text in lines[:line]:
            # pandas DataFrame inference
            if 'pd.read_csv' in line_text or 'pd.DataFrame' in line_text:
                try:
                    import pandas as pd
                    match = None
                    if '=' in line_text:
                        var_name = line_text.split('=')[0].strip()
                        namespace[var_name] = pd.DataFrame()
                except: pass
            
            # numpy array inference
            if 'np.array' in line_text or 'np.ndarray' in line_text:
                try:
                    import numpy as np
                    if '=' in line_text:
                        var_name = line_text.split('=')[0].strip()
                        namespace[var_name] = np.array([])
                except: pass
        
        script = jedi.Script(code, path='example.py')
        completions = script.complete(line, column)
        
        # Filter out private members and format results
        result = [
            [c.name, c.type] 
            for c in completions 
            if not c.name.startswith('_')
        ]
        return json.dumps(result)
    except Exception as e:
        print(f"Jedi completion error: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return "[]"
`);
        
        jediInitialized = true;
        postMessage({ action: 'load', status: 'progress', message: '代码补全引擎就绪' });
    } catch(err) {
        console.warn('Failed to initialize Jedi:', err);
        postMessage({ action: 'load', status: 'progress', message: '代码补全不可用，但不影响运行' });
    }
}

// Find packages in code using AST
async function findPackages(code) {
    if (!pyodide) throw new Error('Pyodide not loaded');
    
    const result = await pyodide.runPythonAsync(`
import ast
import sys

def find_top_level_imports(code):
    try:
        tree = ast.parse(code)
        imports = set()
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    # Get top-level package name
                    imports.add(alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split('.')[0])
        
        return list(imports)
    except:
        return []

import json
json.dumps(find_top_level_imports(${JSON.stringify(code)}))
`);
    
    const allImports = JSON.parse(result);
    
    // Filter out stdlib and already loaded
    const loadedPackages = Object.keys(pyodide.loadedPackages);
    const stdlibNames = pyodide.pyimport('sys').stdlib_module_names;
    const stdlibArray = Array.isArray(stdlibNames) ? stdlibNames : Array.from(stdlibNames);
    
    const toInstall = allImports.filter(pkg => 
        !loadedPackages.includes(pkg) && !stdlibArray.includes(pkg)
    );
    
    return toInstall;
}

// Install packages
async function installPackages(packages) {
    if (!pyodide) throw new Error('Pyodide not loaded');
    if (!packages || packages.length === 0) return;
    
    await pyodide.loadPackage('micropip');
    const micropip = pyodide.pyimport('micropip');
    
    for (const pkg of packages) {
        postMessage({ 
            action: 'install', 
            status: 'progress', 
            message: `正在安装 ${pkg}...` 
        });
        
        try {
            await micropip.install(pkg);
            postMessage({ 
                action: 'install', 
                status: 'progress', 
                message: `✅ ${pkg} 安装成功` 
            });
        } catch(err) {
            postMessage({ 
                action: 'install', 
                status: 'progress', 
                message: `⚠️ ${pkg} 安装失败: ${err.message}` 
            });
        }
    }
    
    micropip.destroy();
}

// Execute Python code
async function executeCode(code) {
    if (!pyodide) throw new Error('Pyodide not loaded');
    
    // Reset stdout/stderr
    await pyodide.runPythonAsync(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);
    
    let errorLine = null;
    
    try {
        await pyodide.runPythonAsync(code);
        const stdout = pyodide.runPython('sys.stdout.getvalue()');
        const stderr = pyodide.runPython('sys.stderr.getvalue()');
        
        return {
            stdout: stdout || '',
            stderr: stderr || '',
            error: null,
            errorLine: null
        };
    } catch(err) {
        let errorMsg = err.message || err.toString();
        
        // Try to get Python traceback
        try {
            pyodide.runPython('traceback.print_exc(file=sys.stderr)');
            const traceback = pyodide.runPython('sys.stderr.getvalue()');
            if (traceback) {
                errorMsg = traceback;
                
                // Extract error line from traceback
                // Look for pattern: File "<exec>", line N
                const lineMatch = traceback.match(/File\s+"<[^"]+>",\s+line\s+(\d+)/);
                if (lineMatch) {
                    errorLine = parseInt(lineMatch[1], 10);
                }
            }
        } catch(tbErr) {
            console.error('Failed to get traceback:', tbErr);
        }
        
        return {
            stdout: '',
            stderr: '',
            error: errorMsg,
            errorLine: errorLine
        };
    }
}

// Get completions using Jedi
async function getCompletions(code, line, column) {
    if (!pyodide) throw new Error('Pyodide not loaded');
    
    // Initialize Jedi if not done yet
    if (!jediInitialized) {
        await initJedi();
    }
    
    if (!jediInitialized) {
        return []; // Jedi failed to load
    }
    
    try {
        const completeFn = pyodide.globals.get('get_jedi_completions');
        const resultStr = await completeFn(code, line, column);
        return JSON.parse(resultStr);
    } catch(err) {
        console.error('Completion error:', err);
        return [];
    }
}

// Send ready message
postMessage({ action: 'ready', status: 'success' });
