import matplotlib.pyplot as plt
import numpy as np
from misc import custom_colors
from core import output, tool_reports

plt.rcParams.update({"font.size": 12})

issues = {
    tool_data["toolName"]: tool_data.get("compatibilityIssues", {})
    for tool_data in tool_reports
}
total_issues = [sum(tool_issues.values()) for tool_issues in issues.values()]

# Mapping data keys to labels
labels = {
    "CrashError": "Crashes",
    "TranspileError": "Transpilation errors",
    "ParseError": "Parse errors",
    "AnalysisError": "Analysis errors",
}

# Prepare legend
legend_labels = list(labels.values())
colors = custom_colors

# Plotting histogram
x = np.arange(len(issues))

fig, ax = plt.subplots(figsize=(12, 8))

bar_width = 0.2  # Width of each bar
bar_positions = np.arange(len(issues))  # Positions for each group of bars

rects = []

for i, (error_type, _) in enumerate(labels.items()):
    heights = [
        tool_data[error_type] if error_type in tool_data else 0
        for tool_data in issues.values()
    ]
    rect_group = ax.bar(
        x + i * bar_width, heights, width=bar_width, label=error_type, color=colors[i]
    )
    rects.append(rect_group)

# Loop through rectangles to add annotations
for i, rect_group in enumerate(rects):
    for j, rect in enumerate(rect_group):
        height = rect.get_height()
        ax.annotate(
            f"{height}\n({height / total_issues[j] * 100:.0f}%)",
            xy=(rect.get_x() + rect.get_width() / 2, height),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
        )

ax.set_xlabel("Tool")
ax.set_ylabel("Number of websites")
ax.set_title("Eventual compatibility issues")
ax.set_xticks(x + 2 * bar_width)
ax.set_xticklabels(issues.keys(), rotation=45, ha="right")

# Adding legend
ax.legend(legend_labels)

# Set y-axis limit with offset from the highest bar
ax.set_ylim(
    0, max([rect.get_height() for rect_group in rects for rect in rect_group]) * 1.1
)

plt.tight_layout()

output(plt)
