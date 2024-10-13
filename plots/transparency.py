import matplotlib.pyplot as plt
import numpy as np
from misc import custom_colors
from core import output, tool_reports

plt.rcParams.update({"font.size": 12})

accessible_values = [tool_data["all"] for tool_data in tool_reports]

# Mapping data keys to labels
labels = {
    "transparent": "Transparent",
    "nonTransparent": "Non-transparent",
}

# Plotting pie charts
fig, axs = plt.subplots(3, 2, figsize=(15, 10))
axs = axs.flatten()

# Prepare legend
legend_labels = list(labels.values())
colors = ["lightskyblue", "red", "lightgray"]

for i, tool_data in enumerate(tool_reports):
    tool_transparency_data = {
        "transparent": tool_data["transparent"],
        "nonTransparent": tool_data["nonTransparent"],
    }
    sizes = [value for value in tool_transparency_data.values()]
    axs[i].pie(
        sizes,
        labels=None,
        startangle=150,
        colors=colors,
        autopct=lambda p: "{:.0f} ({:.0f}%)".format(p * sum(sizes) / 100, p),
    )

    axs[i].axis("equal")  # Equal aspect ratio ensures that pie is drawn as a circle
    axs[i].set_title(tool_data["toolName"], pad=-50)

axs[-1].axis("off")

# Adding legend
fig.legend(legend_labels, loc="lower center", ncol=2)

# Adding common title
fig.suptitle("Transparency analysis")

plt.tight_layout()

output(plt)
