import json
import matplotlib.pyplot as plt

data = {
    "ES2015": 1702,
    "ES2020": 1521,
    "ES5": 1183,
    "ES2022": 1068,
    "ES2018": 654,
    "ES2017": 549,
    "ES2019": 248,
    "ES2021": 132,
    "ES2016": 74,
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
