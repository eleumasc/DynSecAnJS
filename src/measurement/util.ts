export const countSetsAndFilterStrings = (
  sets: Set<string>[],
  regexps: RegExp[]
) => {
  const matchedSetsCount = new Map<string, number>();
  const unmatchedSets: Set<string>[] = [];

  regexps.forEach((regexp) => {
    matchedSetsCount.set(regexp.toString(), 0);
  });

  sets.forEach((set) => {
    let matched = false;
    const unmatchedSet = new Set<string>();

    set.forEach((string) => {
      let foundMatch = false;
      regexps.forEach((regexp) => {
        if (regexp.test(string)) {
          matchedSetsCount.set(
            regexp.toString(),
            (matchedSetsCount.get(regexp.toString()) ?? 0) + 1
          );
          foundMatch = true;
          matched = true;
        }
      });
      if (!foundMatch) {
        unmatchedSet.add(string);
      }
    });

    if (unmatchedSet.size > 0) {
      unmatchedSets.push(unmatchedSet);
    }
  });

  return {
    matchedSetsCount: Object.fromEntries(matchedSetsCount),
    unmatchedSets: unmatchedSets,
  };
};
