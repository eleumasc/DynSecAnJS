export enum JavaScriptVersion {
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

const valuesJavaScriptVersion = Object.values(JavaScriptVersion);

export const lessOrEqualToJavaScriptVersion = (
  a: JavaScriptVersion,
  b: JavaScriptVersion
): boolean => {
  return (
    valuesJavaScriptVersion.indexOf(a) <= valuesJavaScriptVersion.indexOf(b)
  );
};
