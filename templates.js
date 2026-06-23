/**
 * templates.js
 * Python 示例代码模板
 *
 * 使用方法：
 *  1. 在 HTML 中加载此文件: <script src="templates.js" defer></script>
 *  2. 在编辑器初始化后，会自动加载所有模板到下拉菜单
 *  3. 也可以通过 URL 参数 ?template=xxx 直接加载某个模板
 */

const codeTemplates = {
    "Hello World": `print("Hello, World!")`,

    "列表操作": `nums = [1, 2, 3, 4, 5]
print(f"总和: {sum(nums)}")
print(f"平均值: {sum(nums)/len(nums)}")
print(f"最大值: {max(nums)}")
print(f"最小值: {min(nums)}")`,

    "字典操作": `person = {"name": "Alice", "age": 25, "city": "Beijing"}
print("=== 遍历字典 ===")
for key, value in person.items():
    print(f"{key}: {value}")

print("\\n=== 获取信息 ===")
print(f"名字: {person.get('name')}")
print(f"年龄: {person.get('age')}")`,

    "函数定义": `def fibonacci(n):
    """计算斐波那契数列"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print("=== 斐波那契数列 ===")
for i in range(10):
    print(f"fib({i}) = {fibonacci(i)}")`,

    "Numpy基础": `import numpy as np

print("=== 创建数组 ===")
arr = np.array([1, 2, 3, 4, 5])
print(f"数组: {arr}")

print("\\n=== 数学运算 ===")
print(f"平方: {arr**2}")
print(f"平均值: {np.mean(arr)}")
print(f"标准差: {np.std(arr)}")`,

    "Pandas基础": `import pandas as pd

data = {
    "名字": ["Alice", "Bob", "Charlie"],
    "年龄": [25, 30, 35],
    "城市": ["Beijing", "Shanghai", "Guangzhou"]
}

df = pd.DataFrame(data)
print("=== 原始数据 ===")
print(df)

print("\\n=== 统计信息 ===")
print(df.describe())`,

    "随机数": `import random

print("=== 掷骰子 5 次 ===")
for i in range(5):
    result = random.randint(1, 6)
    print(f"第{i+1}次: {result}")

print("\\n=== 随机抽样 ===")
nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
sample = random.sample(nums, 5)
print(f"从 {nums} 中随机抽取 5 个: {sample}")`,

    "字符串处理": `text = "Hello, Python World!"

print("=== 字符串变换 ===")
print(f"原文: {text}")
print(f"大写: {text.upper()}")
print(f"小写: {text.lower()}")
print(f"反转: {text[::-1]}")

print("\\n=== 字符串分割 ===")
words = text.split(", ")
print(f"分割结果: {words}")

print("\\n=== 字符串替换 ===")
replaced = text.replace("Python", "Pyodide")
print(f"替换后: {replaced}")`,

    "条件语句": `score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"

print(f"成绩: {score}")
print(f"等级: {grade}")`,

    "循环语句": `print("=== For 循环 ===")
for i in range(1, 6):
    print(f"{i} x {i} = {i*i}")

print("\\n=== While 循环 ===")
count = 0
while count < 5:
    print(f"计数: {count}")
    count += 1`,

    "异常处理": `print("=== 异常处理示例 ===")

try:
    num1 = 10
    num2 = 2
    result = num1 / num2
    print(f"结果: {num1} / {num2} = {result}")
except ZeroDivisionError:
    print("错误: 不能除以零!")
except ValueError:
    print("错误: 输入必须是数字!")
except Exception as e:
    print(f"未知错误: {e}")
else:
    print("计算成功")`,

    "列表推导式": `print("=== 列表推导式 ===")

# 创建平方数列表
squares = [x**2 for x in range(1, 6)]
print(f"平方数: {squares}")

# 创建偶数列表
evens = [x for x in range(1, 11) if x % 2 == 0]
print(f"偶数: {evens}")

# 字符串处理
text = "hello"
upper_chars = [c.upper() for c in text]
print(f"大写字符: {upper_chars}")`,

    "Lambda函数": `print("=== Lambda 函数 ===")

# 简单的 lambda 函数
square = lambda x: x ** 2
print(f"5的平方: {square(5)}")

# 配合 map 使用
nums = [1, 2, 3, 4, 5]
squared = list(map(lambda x:x**2, nums))
print(f"映射后: {squared}")

# 配合 filter 使用
evens = list(filter(lambda x: x % 2 == 0, nums))
print(f"过滤后: {evens}")`,

    "字典推导式": `print("=== 字典推导式 ===")

# 创建平方数字典
squares_dict = {x: x**2 for x in range(1, 6)}
print(f"平方数字典: {squares_dict}")

# 条件推导式
even_dict = {x: x**2 for x in range(1, 11) if x % 2 == 0}
print(f"偶数平方: {even_dict}")`,

    "集合操作": `print("=== 集合操作 ===")

set1 = {1, 2, 3, 4, 5}
set2 = {4, 5, 6, 7, 8}

print(f"集合1: {set1}")
print(f"集合2: {set2}")

print(f"\\n交集: {set1 & set2}")
print(f"并集: {set1 | set2}")
print(f"差集: {set1 - set2}")
print(f"对称差: {set1 ^ set2}")`,

    "Boolean索引": `import numpy as np

scores = np.array([45, 67, 82, 91, 56, 88, 73, 92])

# 筛选及格的（>60分）
passed = scores[scores > 60]
print(passed)  # [67 82 91 88 73 92]

# 筛选优秀的（>85分）
excellent = scores[scores > 85]
print(excellent)  # [91 88 92]

# 筛选中等的（60-80分）— 注意用 & 不用 and
medium = scores[(scores >= 60) & (scores <= 80)]
print(medium)  # [67 73]`,

    "Numpy轴操作": `import numpy as np

data = np.array([
    [10, 20, 30],
    [40, 50, 60],
    [70, 80, 90]
])

# 沿axis=0求和（竖直方向）—— 每一列的总和
sum_cols = data.sum(axis=0)
print(sum_cols)  # [120 150 180]

# 沿axis=1求和（水平方向）—— 每一行的总和
sum_rows = data.sum(axis=1)
print(sum_rows)  # [60 150 240]`,

    "Reshape与Flatten": `import numpy as np

arr = np.arange(12)
print(f"原始: {arr}")

# 改成3行4列
reshaped = arr.reshape(3, 4)
print(f"\\nReshape (3x4):\\n{reshaped}")

# 改回一维
flat = reshaped.flatten()
print(f"\\nFlatten: {flat}")`,

    "Numpy性能对比": `import numpy as np
import time

my_list = [i for i in range(1000000)]
my_array = np.arange(1000000)

timer = getattr(time, "perf_counter", time.time)

start = timer()
result_list = [x * 2 for x in my_list]
time_list = timer() - start

start = timer()
result_array = my_array * 2
time_array = timer() - start

ratio = (time_list / time_array) if time_array > 0 else float("inf")
print(f"Python列表耗时: {time_list:.4f}s")
print(f"Numpy数组耗时:  {time_array:.4f}s")
print(f"NumPy快约 {ratio:.0f} 倍")`,

    "pandas-CSV远程加载": `import pandas as pd
from pyodide.http import pyfetch
import io

async def load_csv_from_url(url):
    print(f"[Helper] 正在下载: {url}")
    try:
        resp = await pyfetch(url, timeout=15000)
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status}")
        csv_text = await resp.string()
        return pd.read_csv(io.StringIO(csv_text))
    except Exception as e:
        print(f"[Helper] 网络失败: {e}, 回退本地数据")
        return pd.read_csv("/data/boston_housing.csv")

url = 'https://playg.jasonz.top/data/boston_housing.csv'
df = await load_csv_from_url(url)
print(df.head())
# 在新行输入 df. 测试 DataFrame 补全`,

    "pandas-本地CSV": `import pandas as pd

# 本地数据已预载到 /data 目录
df = pd.read_csv("/data/boston_housing.csv")
print(df.head())
print(f"\\n数据维度: {df.shape}")
print(df.describe())`,

    "Matplotlib绘图": `# Pyodide 环境下 matplotlib 可直接渲染到浏览器
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(x, y1, label="sin(x)", linewidth=2, color="#3b82f6")
ax.plot(x, y2, label="cos(x)", linewidth=2, color="#ef4444")
ax.set_title("正弦 & 余弦曲线", fontsize=14, fontweight=600)
ax.set_xlabel("x"); ax.set_ylabel("y")
ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()`,

    "类与面向对象": `class BankAccount:
    """银行账户类 — 封装/继承/多态演示"""
    def __init__(self, owner, balance=0):
        self.owner = owner
        self._balance = balance

    def deposit(self, amount):
        if amount > 0:
            self._balance += amount
            print(f"存入 {amount}, 余额: {self._balance}")
        else:
            print("存款金额必须大于 0")

    def withdraw(self, amount):
        if 0 < amount <= self._balance:
            self._balance -= amount
            print(f"取出 {amount}, 余额: {self._balance}")
            return amount
        print("余额不足或金额无效")
        return 0

    @property
    def balance(self):
        return self._balance

    def __str__(self):
        return f"{self.owner} 的账户: 余额 ¥{self._balance:.2f}"

# 使用
acct = BankAccount("张三", 1000)
print(f"\\n=== 创建账户 ===")
print(acct)
acct.deposit(500)
acct.withdraw(200)
print(f"当前状态: {acct}")

# 子类继承
class SavingsAccount(BankAccount):
    def __init__(self, owner, balance=0, rate=0.03):
        super().__init__(owner, balance)
        self.rate = rate

    def apply_interest(self):
        interest = self._balance * self.rate
        self._balance += interest
        print(f"利息结算: +{interest:.2f}, 余额: {self._balance:.2f}")

savings = SavingsAccount("李四", 5000, 0.04)
savings.apply_interest()
print(savings)`,

    "装饰器进阶": `import time
from functools import wraps

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = func(*args, **kwargs)
        ms = (time.perf_counter() - t0) * 1000
        print(f"[计时] {func.__name__} 耗时 {ms:.2f}ms")
        return result
    return wrapper

def retry(max_attempts=3, delay=1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts:
                        raise
                    print(f"[重试] 第{attempt}次失败: {e}, 重试中...")
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@timer
def compute_factorial(n):
    import math
    return math.factorial(n)

@timer
def process_list():
    return sum(x**2 for x in range(10000))

@retry(max_attempts=3)
def unstable_op(state=[0]):
    state[0] += 1
    if state[0] < 3:
        raise ConnectionError(f"超时 (第{state[0]}次)")
    return "成功!"

print("=== 装饰器实战 ===\\n")
fact_100 = compute_factorial(100)
print(f"100! 有 {len(str(fact_100))} 位数字")

process_list()

print("\\n=== 重试机制 ===")
print(f"最终结果: {unstable_op()}")`,

    "正则表达式": `import re

text = """
联系方式：
张三: 138-1234-5678, zhangsan@example.com
李四: 13987654321, li_si@test.cn
王五: 150-9876-5432, wangwu@company.org.cn
价格信息: MacBook Pro ¥12999.00, iPhone ¥7999
日期记录: 2026-01-15, 2026/06/22
"""

print("=== 手机号提取 ===")
for m in re.findall(r"1[3-9](?:\d\s*-?){9}", text):
    print(m)

print("\\n=== 邮箱提取 ===")
for m in re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", text):
    print(m)

print("\\n=== 价格提取 ===")
for m in re.findall(r"¥([\d,]+\.?\d*)", text):
    print(f"¥{m}")

print("\\n=== 文本替换 ===")
raw = "Hello   World,   Python    is   awesome!"
cleaned = re.sub(r"\s+", " ", raw.strip())
print(f"原文: [{raw}]")
print(f"清理后: [{cleaned}]")`,

    "JSON处理": `import json

data = {
    "name": "Python Playground",
    "version": "1.0.2",
    "features": ["代码编辑", "实时运行", "模板系统"],
    "stats": {"users": 1280, "runs_today": 3567, "templates": 30}
}

json_str = json.dumps(data, ensure_ascii=False, indent=2)
print(json_str)

parsed = json.loads(json_str)
print(f"名称: {parsed['name']}")
print(f"功能数: {len(parsed['features'])}")

employees = [
    {"id": 1, "name": "Alice",   "dept": "Engineering", "salary": 120000},
    {"id": 2, "name": "Bob",     "dept": "Design",      "salary": 90000},
    {"id": 3, "name": "Charlie", "dept": "Engineering", "salary": 135000},
    {"id": 4, "name": "Diana",   "dept": "Product",     "salary": 110000},
]

eng_team = [e for e in employees if e["dept"] == "Engineering"]
print("\\n工程部员工:")
for emp in eng_team:
    print(f"  - {emp['name']}: ¥{emp['salary']:,}")

avg = sum(e["salary"] for e in employees) / len(employees)
print(f"\\n平均薪资: ¥{avg:,.0f}")`,

    "数据管道链式操作": `class Pipeline:
    def __init__(self, data):
        self.data = data
    def map_(self, fn):
        self.data = [fn(item) for item in self.data]; return self
    def filter_(self, pred):
        self.data = [item for item in self.data if pred(item)]; return self
    def sort_by(self, key=None, reverse=False):
        self.data = sorted(self.data, key=key, reverse=reverse); return self
    def take(self, n):
        self.data = self.data[:n]; return self
    def to_list(self):
        return self.data

products = [
    {"name": "键盘", "price": 299, "stock": 50, "category": "外设"},
    {"name": "显示器","price": 2499,"stock": 12, "category": "硬件"},
    {"name": "鼠标", "price": 99, "stock": 200,"category": "外设"},
    {"name": "内存条","price": 399, "stock": 0, "category": "硬件"},
    {"name": "耳机", "price": 199, "stock": 80, "category": "音频"},
    {"name": "机械键盘","price": 599,"stock": 18, "category": "外设"},
]

print("=== 数据管道筛选 TOP4 ===\\n")
result = (
    Pipeline(products)
    .filter_(lambda p: p["stock"] > 0)
    .filter_(lambda p: p["price"] >= 150)
    .sort_by(key=lambda p: -p["price"])
    .map_(lambda p: {**p, "value": f"{p['name']} ¥{p['price']}"})
    .take(4)
)

for item in result.to_list():
    print(f"  {item['value']:20s}| 库存:{item['stock']:>3d} | {item['category']}")`,

    "异步编程基础": `import asyncio

async def fetch(name, delay):
    print(f"  [{name}] 开始... ({delay}s)")
    await asyncio.sleep(delay)
    print(f"  [{name}] 完成! ({delay}s)")
    return f"{name} 的数据"

async def main():
    print("=== asyncio.gather 并发请求 ===")
    results = await asyncio.gather(
        fetch("用户服务", 1),
        fetch("订单服务", 1.5),
        fetch("商品服务", 0.8),
    )
    print(f"\\n结果: {results}")

    print("\\n=== 带超时的请求 ===")
    try:
        r = await asyncio.wait_for(fetch("慢速服务", 3), timeout=1.0)
        print(f"结果: {r}")
    except asyncio.TimeoutError:
        print("  [超时] 已取消")

await main()`,

    "类型注解入门": `from typing import List, Dict, Optional, Union
from dataclasses import dataclass

def greet(name: str) -> str:
    return f"你好, {name}!"

def divide(a: float, b: float) -> Optional[float]:
    if b == 0: return None
    return a / b

def summarize(data: List[int]) -> Dict[str, Union[int, float]]:
    return {"count": len(data), "sum": sum(data), "mean": sum(data)/len(data),
            "min": min(data), "max": max(data)}

@dataclass
class Task:
    title: str
    priority: int = 3
    done: bool = False

    def mark_done(self) -> None:
        self.done = True

print(greet("开发者"))
print(f"10/3 = {divide(10, 3):.4f}" or "除零错误")

nums = [23, 45, 12, 67, 34, 89, 5]
for k, v in summarize(nums).items():
    print(f"  {k}: {v}")

tasks = [Task("修复Bug", 1), Task("写测试", 2), Task("文档", 4)]
tasks[0].mark_done()
for t in tasks:
    s = "[x]" if t.done else "[ ]"
    print(f"  {s} P{t.priority} {t.title}")`,

    "上下文管理器": `class TimerContext:
    def __init__(self, label="代码块"):
        self.label = label; self.elapsed = None
    def __enter__(self):
        import time; self.start = time.perf_counter()
        print(f"\\n[Timer] '{self.label}' 开始...")
        return self
    def __exit__(self, exc_type, *_):
        import time; self.elapsed = time.perf_counter() - self.start
        status = "异常退出" if exc_type else "正常结束"
        print(f"[Timer] '{self.label}' {status} — {self.elapsed*1000:.2f}ms")
        return False

with TimerContext("整体流程") as t:
    total = sum(i**2 for i in range(100000))
    print(f"  计算完成: 总和 = {total:,}")

print(f"\\n最终耗时: {t.elapsed*1000:.2f}ms")`,
};

// 将模板暴露到 window
try { if (typeof window !== 'undefined') window.codeTemplates = codeTemplates; } catch {}

// 验证输出
console.log(`[Templates] ${Object.keys(codeTemplates).length} 个示例模板已加载`);
