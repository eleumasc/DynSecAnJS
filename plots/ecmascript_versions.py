import json
import matplotlib.pyplot as plt
from core import output, syntax_report

plt.rcParams.update({"font.size": 12})

version_ranking = syntax_report["versionRankingScripts"]
keys = [row[0] for row in version_ranking]
values = [row[1] for row in version_ranking]

total = sum(values)
percentages = [(value / total) * 100 for value in values]

plt.bar(keys, values)
plt.xlabel("ECMAScript version")
plt.ylabel("Number of scripts")
plt.title("Script distribution with respect to ECMAScript versions")
plt.xticks(rotation=45, ha="right")

for i, value in enumerate(values):
    plt.text(i, value + 10, f"{percentages[i]:.0f}%", ha="center")

plt.tight_layout()

output(plt)
