import matplotlib.pyplot as plt
from global_data import global_data

data = {
    tool: tool_data["syntacticallyCompatible"]
    for tool, tool_data in global_data.items()
}
accessible_values = [tool_data["accessible"] for tool_data in global_data.values()]

# Calcolo dei rapporti percentuali rispetto al totale dei siti accessibili
percentages = {
    key: (value / accessible_values[i]) * 100
    for i, (key, value) in enumerate(data.items())
}

# Creazione dell'istogramma
plt.bar(data.keys(), data.values())

# Aggiunta dei rapporti percentuali sopra ciascuna barra
for key, value in data.items():
    plt.text(key, value + 10, f"{round(percentages[key])}%", ha="center")

# Etichette degli assi e titolo
plt.xlabel("Tool")
plt.ylabel("Number of websites")
plt.title("Syntactic compatibility")

# Mostriamo il plot
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.show()
