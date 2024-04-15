import json
import matplotlib.pyplot as plt

data = {
    "ES2015": 745,
    "ES2020": 740,
    "ES2022": 550,
    "ES5": 538,
    "ES2017": 344,
    "ES2018": 286,
    "ES2019": 123,
    "ES2021": 56,
    "ES2016": 28,
}

keys = list(data.keys())
values = list(data.values())

plt.bar(keys, values)
plt.xlabel("ECMAScript version")
plt.ylabel("Number of websites")
plt.title("Website distribution with respect to ECMAScript versions")
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.show()
