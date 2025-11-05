/**
 * templates.js
 * Python 示例代码模板
 *
 * 使用方法：
 *  1. 在 HTML 中加载此文件: <script src="templates.js" defer></script>
 *  2. 在编辑器初始化后，会自动加载所有模板到下拉菜单
 *  3. 也可以通过 URL 参数 ?template=pandas-1 直接加载某个模板
 */

const codeTemplates = {
    "Boolean-Indexing": 'import numpy as np\n\nscores = np.array([45, 67, 82, 91, 56, 88, 73, 92])\n\n# 筛选及格的（>60分）\npassed = scores[scores > 60]\nprint(passed)  # [67 82 91 88 73 92]\n\n# 筛选优秀的（>85分）\nexcellent = scores[scores > 85]\nprint(excellent)  # [91 88 92]\n\n# 筛选中等的（60-80分）\n# 注意：用&（按位与），不能用and\nmedium = scores[(scores >= 60) & (scores <= 80)]\nprint(medium)  # [67 73]\n',

    "Numpy-Axis-Operations": 'import numpy as np\n\ndata = np.array([\n    [10, 20, 30],\n    [40, 50, 60],\n    [70, 80, 90]\n])\n\n# 沿axis=0求和（竖直方向）—— 得到每一列的总和\nsum_cols = data.sum(axis=0)\nprint(sum_cols)  # [120 150 180]\n\n# 沿axis=1求和（水平方向）—— 得到每一行的总和\nsum_rows = data.sum(axis=1)\nprint(sum_rows)  # [60 150 240]\n',

    "Reshape-and-Flatten": 'import numpy as np\n\narr = np.arange(12)  # [0 1 2 3 4 5 6 7 8 9 10 11]\n\n# 改成3行4列\nreshaped = arr.reshape(3, 4)\n\nprint(reshaped)\n# [[ 0  1  2  3]\n#  [ 4  5  6  7]\n#  [ 8  9 10 11]]\n\n# 改回一维\nflat = reshaped.flatten()\nprint(flat)  \n# [0 1 2 3 4 5 6 7 8 9 10 11]\n',

    "Numpy-comp": 'import numpy as np\nimport time\n\n# Python列表\nmy_list = [i for i in range(1000000)]\n\n# NumPy数组\nmy_array = np.arange(1000000)\n\n# 测试列表：每个元素乘以2\nstart = time.time()\nresult_list = [x * 2 for x in my_list]\ntime_list = time.time() - start\n\n# 测试数组：每个元素乘以2\nstart = time.time()\nresult_array = my_array * 2\ntime_array = time.time() - start\n\nprint(f"列表耗时: {time_list:.4f}秒")\nprint(f"数组耗时: {time_array:.4f}秒")\nprint(f"性能差异: {time_list / time_array:.0f}倍")\n',

    "pandas-1": 'import pandas as pd\nfrom pyodide.http import pyfetch\nimport io\nimport asyncio\n\nasync def load_csv_from_url(url):\n    print(f" [Helper] 正在从 {url} 下载数据...")\n    try:\n        resp = await pyfetch(url, timeout=15000)\n        if resp.status != 200:\n            print(f"❌ [Helper] 下载失败! 状态码: {resp.status}")\n            raise RuntimeError("download failed")\n        csv_text = await resp.string()\n        print("✅ 下载成功")\n        # 直接返回 DataFrame，便于后续补全\n        return pd.read_csv(io.StringIO(csv_text))\n    except Exception as e:\n        print(f"⚠️ [Helper] 网络不可用或下载失败: {e}")\n        print("⚠️ [Helper] 使用本地备用数据 /data/boston_housing.csv")\n        try:\n            return pd.read_csv("/data/boston_housing.csv")\n        except Exception as ee:\n            print(f"❌ 本地数据读取失败: {ee}")\n            return pd.DataFrame()\n\nurl = \'https://playg.jasonz.top/data/boston_housing.csv\' \n\n# 加载数据（优先网络，失败回退本地）\nboston_housing = await load_csv_from_url(url)\nprint(boston_housing.head())\n\n# 在新行输入 \'boston_housing.\' 测试 DataFrame 实例补全\n',

    "pandas-2": '# 第二章配套练习\n\nimport pandas as pd\n\n# 导入本地数据 boston_housing.csv（已预载到 /data）\nboston_housing = pd.read_csv("/data/boston_housing.csv")\nprint(boston_housing.head())\n\n# 在新行输入 \'boston_housing.\' 测试 DataFrame 补全，然后继续你的分析...\n\n',

    "Hello World": 'print("Hello, World!")',

    "列表操作": 'nums = [1, 2, 3, 4, 5]\nprint(f"总和: {sum(nums)}")\nprint(f"平均值: {sum(nums)/len(nums)}")\nprint(f"最大值: {max(nums)}")\nprint(f"最小值: {min(nums)}")',

    "字典操作": 'person = {"name": "Alice", "age": 25, "city": "Beijing"}\nprint("=== 遍历字典 ===")\nfor key, value in person.items():\n    print(f"{key}: {value}")\n\nprint("\\n=== 获取信息 ===")\nprint(f"名字: {person.get(\'name\')}")\nprint(f"年龄: {person.get(\'age\')}")',

    "函数定义": 'def fibonacci(n):\n    """计算斐波那契数列"""\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nprint("=== 斐波那契数列 ===")\nfor i in range(10):\n    print(f"fib({i}) = {fibonacci(i)}")',

    "Numpy基础": 'import numpy as np\n\nprint("=== 创建数组 ===")\narr = np.array([1, 2, 3, 4, 5])\nprint(f"数组: {arr}")\n\nprint("\\n=== 数学运算 ===")\nprint(f"平方: {arr**2}")\nprint(f"平均值: {np.mean(arr)}")\nprint(f"标准差: {np.std(arr)}")',

    "Pandas基础": 'import pandas as pd\n\ndata = {\n    "名字": ["Alice", "Bob", "Charlie"],\n    "年龄": [25, 30, 35],\n    "城市": ["Beijing", "Shanghai", "Guangzhou"]\n}\n\ndf = pd.DataFrame(data)\nprint("=== 原始数据 ===")\nprint(df)\n\nprint("\\n=== 统计信息 ===")\nprint(df.describe())',

    "随机数": 'import random\n\nprint("=== 掷骰子 5 次 ===")\nfor i in range(5):\n    result = random.randint(1, 6)\n    print(f"第{i+1}次: {result}")\n\nprint("\\n=== 随机抽样 ===")\nnums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\nsample = random.sample(nums, 5)\nprint(f"从 {nums} 中随机抽取 5 个: {sample}")',

    "字符串处理": 'text = "Hello, Python World!"\n\nprint("=== 字符串变换 ===")\nprint(f"原文: {text}")\nprint(f"大写: {text.upper()}")\nprint(f"小写: {text.lower()}")\nprint(f"反转: {text[::-1]}")\n\nprint("\\n=== 字符串分割 ===")\nwords = text.split(\', \')\nprint(f"分割结果: {words}")\n\nprint("\\n=== 字符串替换 ===")\nreplaced = text.replace("Python", "Pyodide")\nprint(f"替换后: {replaced}")',

    "条件语句": 'score = 85\n\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelse:\n    grade = "F"\n\nprint(f"成绩: {score}")\nprint(f"等级: {grade}")',

    "循环语句": 'print("=== For 循环 ===")\nfor i in range(1, 6):\n    print(f"{i} x {i} = {i*i}")\n\nprint("\\n=== While 循环 ===")\ncount = 0\nwhile count < 5:\n    print(f"计数: {count}")\n    count += 1',

    "异常处理": 'print("=== 异常处理示例 ===")\n\ntry:\n    num1 = 10\n    num2 = 2\n    result = num1 / num2\n    print(f"结果: {num1} / {num2} = {result}")\nexcept ZeroDivisionError:\n    print("❌ 错误: 不能除以零!")\nexcept ValueError:\n    print("❌ 错误: 输入必须是数字!")\nexcept Exception as e:\n    print(f"❌ 未知错误: {e}")\nelse:\n    print("✅ 计算成功")',

    "列表推导式": 'print("=== 列表推导式 ===")\n\n# 创建平方数列表\nsquares = [x**2 for x in range(1, 6)]\nprint(f"平方数: {squares}")\n\n# 创建偶数列表\nevens = [x for x in range(1, 11) if x % 2 == 0]\nprint(f"偶数: {evens}")\n\n# 字符串处理\ntext = "hello"\nupper_chars = [c.upper() for c in text]\nprint(f"大写字符: {upper_chars}")',

    "λ函数": 'print("=== Lambda 函数 ===")\n\n# 简单的 lambda 函数\nsquare = lambda x: x ** 2\nprint(f"5的平方: {square(5)}")\n\n# 配合 map 使用\nnums = [1, 2, 3, 4, 5]\nsquared = list(map(lambda x:x**2, nums))\nprint(f"映射后: {squared}")\n\n# 配合 filter 使用\nevens = list(filter(lambda x: x % 2 == 0, nums))\nprint(f"过滤后: {evens}")',

    "字典推导式": 'print("=== 字典推导式 ===")\n\n# 创建平方数字典\nsquares_dict = {x: x**2 for x in range(1, 6)}\nprint(f"平方数字典: {squares_dict}")\n\n# 条件推导式\neven_dict = {x: x**2 for x in range(1, 11) if x % 2 == 0}\nprint(f"偶数平方: {even_dict}")',

    "集合操作": 'print("=== 集合操作 ===")\n\nset1 = {1, 2, 3, 4, 5}\nset2 = {4, 5, 6, 7, 8}\n\nprint(f"集合1: {set1}")\nprint(f"集合2: {set2}")\n\nprint(f"\\n交集: {set1 & set2}")\nprint(f"并集: {set1 | set2}")\nprint(f"差集: {set1 - set2}")\nprint(f"对称差: {set1 ^ set2}")'
};

// 验证: 在控制台输出已加载的模板数量
console.log(`[Templates] 加载了 ${Object.keys(codeTemplates).length} 个示例模板`);
