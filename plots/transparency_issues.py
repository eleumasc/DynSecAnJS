import matplotlib.pyplot as plt
import numpy as np
from misc import custom_colors
from core import output, tool_reports

plt.rcParams.update({"font.size": 12})

issues = {
    tool_data["toolName"]: tool_data.get("transparencyIssues", {})
    for tool_data in tool_reports
}
total_issues = [sum(tool_issues.values()) for tool_issues in issues.values()]

# Mapping data keys to labels
labels = {
    "ReferenceError": "ReferenceError",
    "SyntaxError": "SyntaxError",
    "TypeError": "TypeError",
    "OtherError": "Other",
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
    values = [
        tool_data[error_type] if error_type in tool_data else 0
        for tool_data in issues.values()
    ]
    percentages = [value / total_issues[j] * 100 for j, value in enumerate(values)]
    heights = percentages
    rect_group = ax.bar(
        x + i * bar_width, heights, width=bar_width, label=error_type, color=colors[i]
    )
    for j, rect in enumerate(rect_group):
        ax.annotate(
            f"{values[j]}\n({percentages[j]:.0f}%)",
            xy=(rect.get_x() + rect.get_width() / 2, percentages[j]),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
        )
    rects.append(rect_group)

ax.set_xlabel("Tool")
ax.set_ylabel("Number of websites")
ax.set_title("Transparency issues")
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
