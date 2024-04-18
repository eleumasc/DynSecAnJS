import matplotlib.pyplot as plt
import numpy as np
from misc import custom_colors

data = {
    "JEST": {
        "syntacticallyCompatible": 538,
        "compatible": 140,
        "eventuallyCompatible": 274,
        "unknownCompatibility": 0,
    },
    "IF-Transpiler": {
        "syntacticallyCompatible": 538,
        "compatible": 81,
        "eventuallyCompatible": 197,
        "unknownCompatibility": 0,
    },
    "GIFC": {
        "syntacticallyCompatible": 1941,
        "compatible": 880,
        "eventuallyCompatible": 1385,
        "unknownCompatibility": 25,
    },
    "Jalangi": {
        "syntacticallyCompatible": 538,
        "compatible": 503,
        "eventuallyCompatible": 2261,
        "unknownCompatibility": 395,
    },
    "Linvail": {
        "syntacticallyCompatible": 1941,
        "compatible": 430,
        "eventuallyCompatible": 560,
        "unknownCompatibility": 21,
    },
    "Project Foxhound": {
        "syntacticallyCompatible": 3410,
        "compatible": 2990,
        "eventuallyCompatible": 2990,
        "unknownCompatibility": 12,
    },
}
accessible = 3410

# Mapping data keys to labels
labels = {
    "syntacticallyCompatible": "Syntactically compatible",
    "eventuallyCompatible": "Eventually compatible",
    "compatible": "Compatible",
}

# Prepare legend
legend_labels = list(labels.values())
colors = custom_colors

# Plotting histogram
x = np.arange(len(data))

fig, ax = plt.subplots(figsize=(12, 8))

bar_width = 0.3  # Width of each bar

main_rects = []
unknown_rects = []

# Drawing main bars
for i, (error_type, label) in enumerate(labels.items()):
    heights = [tool_data[error_type] for tool_data in data.values()]
    main_rect_group = ax.bar(
        x + i * bar_width,
        heights,
        width=bar_width,
        label=label,
        color=colors[i],
        zorder=1,
    )
    main_rects.append(main_rect_group)

# Drawing unknown bars
for i, (error_type, label) in enumerate(labels.items()):
    if error_type != "syntacticallyCompatible":
        heights = [
            tool_data[error_type] + tool_data["unknownCompatibility"]
            for tool_data in data.values()
        ]
        unknown_rect_group = ax.bar(
            x + i * bar_width,
            heights,
            width=bar_width,
            color=colors[i],
            alpha=0.5,
            hatch="/",
            edgecolor="white",
            zorder=0,
        )
        unknown_rects.append(unknown_rect_group)

# Loop through original main bars to add annotations
for rect_group, label in zip(main_rects, labels.values()):
    for rect in rect_group:
        height = rect.get_height()
        ax.annotate(
            f"{height}\n({height / accessible * 100:.0f}%)",
            xy=(rect.get_x() + rect.get_width() / 2, height),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
        )

# Loop through unknown bars to add annotations
for i, rect_group in enumerate(unknown_rects):
    for j, rect in enumerate(rect_group):
        height = rect.get_height()
        main_height = main_rects[i + 1][j].get_height()
        text_voffset = 3
        if abs(main_height - height) < 200:
            text_voffset += 24
        ax.annotate(
            f"{height}\n({height / accessible * 100:.0f}%)",
            xy=(rect.get_x() + rect.get_width() / 2, height),
            xytext=(0, text_voffset),
            textcoords="offset points",
            ha="center",
            color="red",
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
ax.set_xticklabels(data.keys(), rotation=45, ha="right")

plt.tight_layout()
plt.show()
