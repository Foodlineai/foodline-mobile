import { demoPersonas } from '../personas/fixtures';
import type { Actor, CompanyOption, Session } from './types';

export const demoActor: Actor = {
  id: 'actor-mehul',
  name: 'Mehul Pradhan',
  email: 'mehul@foodlineai.com',
  initials: 'MP',
};

export const demoCompanies: CompanyOption[] = [
  { id: 'co-southern', name: 'Southern Fresh Distribution', subtitle: 'Atlanta · 2 warehouses' },
  { id: 'co-harbour', name: 'Harbour Foods Group', subtitle: 'Savannah · 1 warehouse' },
];

export function demoSession(personaKey: keyof typeof demoPersonas = 'admin'): Session {
  return {
    actor: demoActor,
    company: demoCompanies[0]!,
    persona: demoPersonas[personaKey]!,
  };
}
