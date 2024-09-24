import matplotlib.pyplot as plt
import numpy as np
from misc import custom_colors
from data import tool_reports

plt.rcParams.update({"font.size": 12})

# Mapping data keys to labels
labels = {
    "syntacticallyCompatibleScore": "Syntactically compatible",
    "eventuallyCompatibleScore": "Eventually compatible",
    "compatibleScore": "Compatible",
}

# Prepare legend
legend_labels = list(labels.values())
colors = custom_colors

# Plotting histogram
x = np.arange(len(tool_reports))

fig, ax = plt.subplots(figsize=(12, 8))

bar_width = 0.3  # Width of each bar

main_rects = []
unknown_rects = []

# Drawing main bars
for i, (error_type, label) in enumerate(labels.items()):
    heights = [
        tool_data[error_type] if error_type in tool_data else 0
        for tool_data in tool_reports
    ]
    main_rect_group = ax.bar(
        x + i * bar_width,
        heights,
        width=bar_width,
        label=label,
        color=colors[i],
        zorder=1,
    )
    main_rects.append(main_rect_group)

# Loop through original main bars to add annotations
for rect_group, label in zip(main_rects, labels.values()):
    for j, rect in enumerate(rect_group):
        height = rect.get_height()
        ax.annotate(
            f"({height * 100:.0f}%)",
            xy=(rect.get_x() + rect.get_width() / 2, height),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
        )

# Adding legend
ax.legend(legend_labels)

# Set y-axis limit with offset from the highest bar
ax.set_ylim(
    0,
    max([rect.get_height() for rect_group in main_rects for rect in rect_group]) * 1.1,
)

ax.set_xlabel("Tool")
ax.set_ylabel("Number of websites")
ax.set_title("Compatibility analysis")
ax.set_xticks(x + 2 * bar_width)
ax.set_xticklabels(
    [tool_data["toolName"] for tool_data in tool_reports], rotation=45, ha="right"
)

plt.tight_layout()
plt.show()
