import matplotlib.pyplot as plt
import numpy as np
from misc import custom_colors

data = {
    "JEST": {
        "nonTransparent": 218,
        "transparent": 45,
    },
    "IF-Transpiler": {
        "nonTransparent": 165,
        "transparent": 22,
    },
    "GIFC": {
        "nonTransparent": 1113,
        "transparent": 52,
    },
    "Jalangi": {
        "nonTransparent": 762,
        "transparent": 808,
    },
    "Linvail": {
        "nonTransparent": 221,
        "transparent": 215,
    },
    "Project Foxhound": {
        "nonTransparent": 65,
        "transparent": 2807,
    },
}
accessible = 3410

# Mapping data keys to labels
labels = {
    "transparent": "Transparent",
    "nonTransparent": "Non-transparent",
    "notApplicable": "N/A",
}

# Plotting pie charts
fig, axs = plt.subplots(2, 3, figsize=(15, 10))
axs = axs.flatten()

# Prepare legend
legend_labels = list(labels.values())
colors = custom_colors

for i, (tool, raw_tool_data) in enumerate(data.items()):
    tool_data = {
        "transparent": raw_tool_data["transparent"],
        "nonTransparent": raw_tool_data["nonTransparent"],
        "notApplicable": accessible
        - raw_tool_data["transparent"]
        - raw_tool_data["nonTransparent"],
    }
    sizes = [value for value in tool_data.values()]
    axs[i].pie(
        sizes,
        labels=None,
        startangle=140,
        colors=colors,
        autopct=lambda p: "{:.0f} ({:.0f}%)".format(p * sum(sizes) / 100, p),
    )
    axs[i].axis("equal")  # Equal aspect ratio ensures that pie is drawn as a circle
    axs[i].set_title(tool)

# Adding legend
fig.legend(legend_labels, loc="lower center", ncol=2)

# Adding common title
fig.suptitle("Transparency")

plt.tight_layout()
plt.show()
