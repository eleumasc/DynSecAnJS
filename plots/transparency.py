import matplotlib.pyplot as plt
import numpy as np
from misc import custom_colors
from data import transparency_data

plt.rcParams.update({"font.size": 11})

data = transparency_data
accessible_values = [
    tool_data["accessible"] for tool_data in transparency_data.values()
]

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
colors = [custom_colors[0], custom_colors[3], "lightgray"]

for i, (tool, raw_tool_data) in enumerate(data.items()):
    tool_data = {
        "transparent": raw_tool_data["transparent"],
        "nonTransparent": raw_tool_data["nonTransparent"],
        "notApplicable": accessible_values[i]
        - raw_tool_data["transparent"]
        - raw_tool_data["nonTransparent"],
    }
    sizes = [value for value in tool_data.values()]
    axs[i].pie(
        sizes,
        labels=None,
        startangle=150,
        colors=colors,
        autopct=lambda p: "{:.0f} ({:.0f}%)".format(p * sum(sizes) / 100, p),
    )
    axs[i].axis("equal")  # Equal aspect ratio ensures that pie is drawn as a circle
    axs[i].set_title(tool, pad=-50)

# Adding legend
fig.legend(legend_labels, loc="lower center", ncol=2)

# Adding common title
fig.suptitle("Transparency analysis")

plt.tight_layout()
plt.show()
