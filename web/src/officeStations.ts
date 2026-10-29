import type { Person } from "./api.js";

export function isOliver(name: string): boolean {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z]+/).includes("oliver");
}

/** Notebook (3) is reserved; other people only occupy desktop stations (0–2). */
export function assignStations(people: Pick<Person, "id" | "name">[]): Map<string, number> {
  const assignments = new Map<string, number>();
  let notebookAssigned = false;
  let desktop = 0;
  for (const person of [...people].sort((a,b) => a.id.localeCompare(b.id))) {
    if (isOliver(person.name)) {
      assignments.set(person.id, notebookAssigned ? -1 : 3);
      notebookAssigned = true;
    } else assignments.set(person.id, desktop < 3 ? desktop++ : -1);
  }
  return assignments;
}
