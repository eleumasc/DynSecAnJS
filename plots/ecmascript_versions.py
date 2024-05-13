import json
import matplotlib.pyplot as plt
from data import compatibility_data

plt.rcParams.update({"font.size": 10})

data = compatibility_data

keys = list(data.keys())
values = list(data.values())

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
plt.show()
