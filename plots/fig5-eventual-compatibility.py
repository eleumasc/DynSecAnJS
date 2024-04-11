import matplotlib.pyplot as plt
import numpy as np

# Dati forniti
# left: syntactic + both, right: eventual + both
data = {
    "JEST": (832, 2865),
    "IF-Transpiler": (809, 2540),
    "GIFC": (2179, 1882),
    "Jalangi": (799, 535),
    "Linvail": (1547, 1192),
}

# Calcolo dei rapporti percentuali rispetto al totale di accessibili
percentages = {
    key: [(value / 3721) * 100 for value in values] for key, values in data.items()
}

# Creazione dell'istogramma
fig, ax = plt.subplots()

# Posizione delle barre sull'asse X
ind = np.arange(len(data))

# Larghezza delle barre
width = 0.35

# Creazione delle barre
rects1 = ax.bar(
    ind - width / 2, [pair[0] for pair in data.values()], width, label="syntactic"
)
rects2 = ax.bar(
    ind + width / 2, [pair[1] for pair in data.values()], width, label="eventual"
)

# Aggiunta delle percentuali sopra ciascuna barra
for rects in [rects1, rects2]:
    for rect in rects:
        height = rect.get_height()
        ax.annotate(
            "{:.0f}%".format(height / 3721 * 100),
            xy=(rect.get_x() + rect.get_width() / 2, height),
            xytext=(0, 3),  # Offset verticale
            textcoords="offset points",
            ha="center",
            va="bottom",
        )

# Etichette degli assi e titolo
ax.set_xlabel("Tool")
ax.set_ylabel("Number of websites")
ax.set_title("Syntactic and eventual compatibility")
ax.set_xticks(ind)
ax.set_xticklabels(data.keys(), rotation=45, ha="right")
ax.legend()

# Mostriamo il plot
plt.tight_layout()
plt.show()
