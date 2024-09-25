import json
import matplotlib.pyplot as plt
from core import output, syntax_report

plt.rcParams.update({"font.size": 12})

keys = [tool_data[0] for tool_data in syntax_report]
values = [tool_data[1] for tool_data in syntax_report]

total = sum(values)
percentages = [(value / total) * 100 for value in values]

plt.bar(keys, values)
plt.xlabel("ECMAScript version")
plt.ylabel("Number of websites")
plt.title("Website distribution with respect to ECMAScript versions")
plt.xticks(rotation=45, ha="right")

for i, value in enumerate(values):
    plt.text(i, value + 10, f"{percentages[i]:.0f}%", ha="center")

plt.tight_layout()

output(plt)
