import json
import matplotlib.pyplot as plt

# Dati in formato Ruby Hash convertiti in formato JSON
json_data = """
{
  "ES2015": 1702,
  "ES2020": 1521,
  "ES5": 1183,
  "ES2022": 1068,
  "ES2018": 654,
  "ES2017": 549,
  "ES2019": 248,
  "ES2021": 132,
  "ES2016": 74
}
"""

# Caricamento dei dati JSON
data = json.loads(json_data)


# Funzione per creare il plot
def plot_json(data):
    keys = list(data.keys())
    values = list(data.values())

    plt.bar(keys, values)
    plt.xlabel("ECMAScript version")
    plt.ylabel("Number of websites")
    plt.title("Website distribution with respect to ECMAScript versions")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.show()


# Chiamata alla funzione per creare il plot
plot_json(data)
