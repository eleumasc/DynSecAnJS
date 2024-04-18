import matplotlib.pyplot as plt
import numpy as np
from misc import custom_colors

data = {
    "JEST": {
        "CrashError": 159,
        "BabelError": 195,
        "ParseError": 2095,
        "AnalysisError": 687,
    },
    "IF-Transpiler": {
        "CrashError": 344,
        "BabelError": 197,
        "ParseError": 209,
        "AnalysisError": 2463,
    },
    "GIFC": {
        "CrashError": 152,
        "BabelError": 191,
        "ParseError": 53,
        "AnalysisError": 1604,
    },
    "Jalangi": {
        "CrashError": 370,
        "BabelError": 243,
        "ParseError": 141,
        "AnalysisError": 0,
    },
    "Linvail": {
        "CrashError": 1616,
        "BabelError": 108,
        "ParseError": 45,
        "AnalysisError": 1060,
    },
    "Project Foxhound": {
        "CrashError": 408,
        "BabelError": 0,
        "ParseError": 0,
        "AnalysisError": 0,
    },
}
issues = [sum(tool_data.values()) for tool_data in data.values()]

# Mapping data keys to labels
labels = {
    "CrashError": "Crashes",
    "BabelError": "Transpilation errors",
    "ParseError": "Parse errors",
    "AnalysisError": "Analysis errors",
}

# Prepare legend
legend_labels = list(labels.values())
colors = custom_colors

# Plotting histogram
x = np.arange(len(data))

fig, ax = plt.subplots(figsize=(12, 8))

bar_width = 0.2  # Width of each bar
bar_positions = np.arange(len(data))  # Positions for each group of bars

rects = []

for i, (error_type, _) in enumerate(labels.items()):
    heights = [tool_data[error_type] for tool_data in data.values()]
    rect_group = ax.bar(
        x + i * bar_width, heights, width=bar_width, label=error_type, color=colors[i]
    )
    rects.append(rect_group)

# Loop through rectangles to add annotations
for i, rect_group in enumerate(rects):
    for j, rect in enumerate(rect_group):
        height = rect.get_height()
        ax.annotate(
            f"{height}\n({height / issues[j] * 100:.0f}%)",
            xy=(rect.get_x() + rect.get_width() / 2, height),
            xytext=(0, 3),  # 3 points vertical offset
            textcoords="offset points",
            ha="center",
        )

ax.set_xlabel("Tools")
ax.set_ylabel("Number of websites")
ax.set_title("Eventual compatibility issues")
ax.set_xticks(x + 2 * bar_width)
ax.set_xticklabels(data.keys(), rotation=45, ha="right")

# Adding legend
ax.legend(legend_labels)

# Set y-axis limit with offset from the highest bar
ax.set_ylim(
    0, max([rect.get_height() for rect_group in rects for rect in rect_group]) * 1.1
)

plt.tight_layout()
plt.show()
