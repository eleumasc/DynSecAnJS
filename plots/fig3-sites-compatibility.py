import json
import matplotlib.pyplot as plt

data = {
    "ES2015": 421,
    "ES2020": 362,
    "ES5": 293,
    "ES2022": 291,
    "ES2018": 146,
    "ES2017": 99,
    "ES2019": 61,
    "ES2021": 26,
    "ES2016": 12,
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
