import matplotlib.pyplot as plt
import numpy as np

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

# Mapping error types to labels
error_labels = {
    "CrashError": "Crashes",
    "BabelError": "Transpilation errors",
    "ParseError": "Parse errors",
    "AnalysisError": "Analysis errors",
}

# Extracting unique error types
error_types = set()
for project_data in data.values():
    error_types.update(project_data.keys())

# Plotting pie charts
fig, axs = plt.subplots(2, 3, figsize=(15, 10))
axs = axs.flatten()

# Prepare legend
legend_labels = list(error_labels.values())
colors = plt.cm.tab20(np.linspace(0, 1, len(legend_labels)))

for i, (project, project_data) in enumerate(data.items()):
    labels = [
        error_labels[error] for error, value in project_data.items() if value != 0
    ]
    sizes = [value for value in project_data.values() if value != 0]
    axs[i].pie(sizes, labels=None, startangle=140, colors=colors, autopct=lambda p: '{:.0f} ({:.0f}%)'.format(p * sum(sizes) / 100, p))
    axs[i].axis("equal")  # Equal aspect ratio ensures that pie is drawn as a circle
    axs[i].set_title(project)

# Creating legend
fig.legend(legend_labels, loc="lower center", ncol=2)

# Adding common title
fig.suptitle("Eventual compatibility issues")

plt.tight_layout()
plt.show()
