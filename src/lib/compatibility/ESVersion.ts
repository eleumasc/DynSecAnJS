export enum ESVersion {
  ES5 = "ES5",
  ES2015 = "ES2015",
  ES2016 = "ES2016",
  ES2017 = "ES2017",
  ES2018 = "ES2018",
  ES2019 = "ES2019",
  ES2020 = "ES2020",
  ES2021 = "ES2021",
  ES2022 = "ES2022",
}

const ESVersionValues = Object.values(ESVersion);

export const lessOrEqualToESVersion = (a: ESVersion, b: ESVersion): boolean => {
  return ESVersionValues.indexOf(a) <= ESVersionValues.indexOf(b);
};

export const maxESVersion = (esVersions: ESVersion[]) => {
  return esVersions.reduce(
    (max, cur) => (lessOrEqualToESVersion(cur, max) ? max : cur),
    ESVersionValues[0]
  );
};
