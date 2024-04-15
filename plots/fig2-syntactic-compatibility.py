import matplotlib.pyplot as plt

# Dati forniti
# syntacticallyCompatible
data = {
    "JEST": 538,
    "IF-Transpiler": 538,
    "GIFC": 1941,
    "Jalangi": 538,
    "Linvail": 1941,
    "Project Foxhound": 3410,
}
accessible = 3410

# Calcolo dei rapporti percentuali rispetto al totale dei siti accessibili
percentages = {key: (value / accessible) * 100 for key, value in data.items()}

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
