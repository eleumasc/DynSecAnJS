import matplotlib.pyplot as plt

# Dizionario fornito
# nota: somma di syntactic + both
data = {
    'JEST': 832,
    'IF-Transpiler': 809,
    'GIFC': 2179,
    'Jalangi': 799,
    'Linvail': 1547
}

# Calcolo dei rapporti percentuali rispetto al totale dei siti accessibili
percentages = {key: (value / 3721) * 100 for key, value in data.items()}

# Creazione dell'istogramma
plt.bar(data.keys(), data.values())

# Aggiunta dei rapporti percentuali sopra ciascuna barra
for key, value in data.items():
    plt.text(key, value + 10, f'{round(percentages[key])}%', ha='center')

# Etichette degli assi e titolo
plt.xlabel('Tool')
plt.ylabel('Number of websites')
plt.title('Syntactic compatibility')

# Mostraimo il plot
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.show()
