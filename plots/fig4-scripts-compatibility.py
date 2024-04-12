import json
import matplotlib.pyplot as plt
import numpy as np

data1 = {
    "ES2015": 410,
    "ES2020": 346,
    "ES5": 295,
    "ES2022": 236,
    "ES2018": 157,
    "ES2017": 99,
    "ES2019": 62,
    "ES2021": 23,
    "ES2016": 15,
}

data2 = {
    "ES5": 864,
    "ES2015": 477,
    "ES2020": 109,
    "ES2022": 84,
    "ES2017": 48,
    "ES2018": 30,
    "ES2019": 23,
    "ES2021": 7,
    "ES2016": 1,
}

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

# Mostriamo il plot
plt.tight_layout()
plt.show()
