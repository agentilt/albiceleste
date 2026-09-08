/** Responsive visibility class for a column priority: 1 always, 2 from `sm`, 3 from `lg`. Shared by both tables. */
export function priorityClass(priority: 1 | 2 | 3 | undefined): string {
  return priority === 2 ? "hidden sm:table-cell" : priority === 3 ? "hidden lg:table-cell" : "";
}
