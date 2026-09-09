/** What a facet chip shows next to its name: nothing when the facet is open, the names when one or two are chosen, a count beyond that. */
export function facetValue(names: string[], count: (n: number) => string): string | undefined {
  if (names.length === 0) return undefined;
  if (names.length <= 2) return names.join(", ");
  return count(names.length);
}
