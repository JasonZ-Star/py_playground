// ==================================================
//               代码模板库
// 在这里添加、修改或删除你的代码模板
// 格式: '模板名': '代码内容'
// 注意: 多行代码需要使用 \n 来表示换行
// ==================================================

// ==================================================
//               代码模板库
// ==================================================
const codeTemplates = {
    'hello': 'print("你好，世界！")',
    'loop': 'for i in range(10):\n    print(f"这是第 {i+1} 次循环")',
    
    'func': 'def greet(name):\n    return f"你好, {name}!"\n\nprint(greet("Gemini"))',
    
    'info': '# 这是一个演示模板\nimport sys\n\nprint(f"Python 版本: {sys.version}")',
    
    'numpy_test': '# 测试Numpy代码提示\nimport numpy as np\n\na = np.array([1, 2, 3])\nprint(a)\n\n# 在下面空行输入 a. 然后等待提示',
    
    'pandas-1': `# Pandas 示例 - 网络优先，本地回退
import pandas as pd
import io
from pyodide.http import pyfetch

async def load_csv_from_url(url):
    """尝试从网络加载CSV，失败则使用本地数据"""
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

# 加载波士顿房价数据集
# 注意：外部 URL 可能不可用，这种情况下会自动回退到本地数据
df = await load_csv_from_url("https://raw.githubusercontent.com/selva86/datasets/master/BostonHousing.csv")

print("\\n数据集预览:")
print(df.head())
print(f"\\n数据形状: {df.shape}")
print(f"\\n提示: 输入 'df.' 可以看到DataFrame的方法补全")`,
    
    'pandas-2': `# Pandas 示例 - 本地数据
import pandas as pd

# 直接读取本地波士顿房价数据集
df = pd.read_csv("/data/boston_housing.csv")

print("数据集预览:")
print(df.head())

print(f"\\n数据形状: {df.shape}")
print(f"列名: {list(df.columns)}")

print(f"\\n提示: 输入 'df.' 可以看到DataFrame的方法补全")
print("例如: df.describe(), df.info(), df.columns 等")`
};