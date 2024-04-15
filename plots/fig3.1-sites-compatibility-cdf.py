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

# Define the order of keys
keys_order = [
    "ES5",
    "ES2015",
    "ES2016",
    "ES2017",
    "ES2018",
    "ES2019",
    "ES2020",
    "ES2021",
    "ES2022",
]

# Sort the data based on the defined order
sorted_data = {key: data[key] for key in keys_order}

# Calculate cumulative sum
cumulative_sum = 0
cdf_values = []
for value in sorted_data.values():
    cumulative_sum += value
    cdf_values.append(cumulative_sum)

plt.bar(list(sorted_data.keys()), cdf_values)
plt.xlabel("ECMAScript version")
plt.ylabel("Number of websites")
plt.title("Cumulative distribution with respect to ECMAScript versions")
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.show()
