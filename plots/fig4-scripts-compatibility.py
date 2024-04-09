import json
import matplotlib.pyplot as plt
import numpy as np

# JSON forniti
json_data1 = """
{
  "ES2015": 1636,
  "ES2020": 1457,
  "ES5": 1185,
  "ES2022": 912,
  "ES2018": 701,
  "ES2017": 467,
  "ES2019": 267,
  "ES2021": 110,
  "ES2016": 84
}
"""

json_data2 = """
{
  "ES5": 3533,
  "ES2015": 2219,
  "ES2020": 401,
  "ES2022": 265,
  "ES2017": 252,
  "ES2018": 103,
  "ES2019": 65,
  "ES2021": 36,
  "ES2016": 4
}
"""

# Caricamento dei dati JSON
data1 = json.loads(json_data1)
data2 = json.loads(json_data2)

# Estraiamo le chiavi comuni e le ordiniamo in ordine lessicografico
common_keys = sorted(set(data1.keys()) | set(data2.keys()))

# Prendiamo i valori corrispondenti per le chiavi comuni
values1 = [data1.get(key, 0) for key in common_keys]
values2 = [data2.get(key, 0) for key in common_keys]

# Impostiamo la larghezza delle barre
bar_width = 0.35

# Posizione delle barre sull'asse X
ind = np.arange(len(common_keys))

# Creiamo il plot
fig, ax = plt.subplots()
rects1 = ax.bar(ind - bar_width / 2, values1, bar_width, label="external scripts")
rects2 = ax.bar(ind + bar_width / 2, values2, bar_width, label="inline scripts")

# Aggiungiamo le etichette, il titolo e la legenda
ax.set_xlabel("ECMAScript version")
ax.set_ylabel("Number of websites")
ax.set_title("Distribution of external and inline scripts w.r.t. ECMAScript versions")
ax.set_xticks(ind)
ax.set_xticklabels(common_keys, rotation=45, ha="right")
ax.legend()

# Mostraimo il plot
plt.tight_layout()
plt.show()
