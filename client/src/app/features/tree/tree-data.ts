import type { Data } from 'family-chart';

/**
 * Placeholder Iordachi family across four generations.
 * Replace with API-driven data once the backend exposes a family-tree endpoint.
 */
export const SAMPLE_FAMILY_TREE: Data = [
  {
    id: 'vasile',
    data: { 'first name': 'Vasile', 'last name': 'Iordachi', birthday: '1925', gender: 'M' },
    rels: { parents: [], spouses: ['maria'], children: ['ion'] },
  },
  {
    id: 'maria',
    data: { 'first name': 'Maria', 'last name': 'Iordachi', birthday: '1928', gender: 'F' },
    rels: { parents: [], spouses: ['vasile'], children: ['ion'] },
  },
  {
    id: 'ion',
    data: { 'first name': 'Ion', 'last name': 'Iordachi', birthday: '1955', gender: 'M' },
    rels: { parents: ['vasile', 'maria'], spouses: ['elena'], children: ['andrei', 'mihai'] },
  },
  {
    id: 'elena',
    data: { 'first name': 'Elena', 'last name': 'Iordachi', birthday: '1958', gender: 'F' },
    rels: { parents: [], spouses: ['ion'], children: ['andrei', 'mihai'] },
  },
  {
    id: 'andrei',
    data: { 'first name': 'Andrei', 'last name': 'Iordachi', birthday: '1985', gender: 'M' },
    rels: { parents: ['ion', 'elena'], spouses: ['ana'], children: ['dinu', 'sofia'] },
  },
  {
    id: 'ana',
    data: { 'first name': 'Ana', 'last name': 'Iordachi', birthday: '1987', gender: 'F' },
    rels: { parents: [], spouses: ['andrei'], children: ['dinu', 'sofia'] },
  },
  {
    id: 'mihai',
    data: { 'first name': 'Mihai', 'last name': 'Iordachi', birthday: '1988', gender: 'M' },
    rels: { parents: ['ion', 'elena'], spouses: [], children: [] },
  },
  {
    id: 'dinu',
    data: { 'first name': 'Dinu', 'last name': 'Iordachi', birthday: '2015', gender: 'M' },
    rels: { parents: ['andrei', 'ana'], spouses: [], children: [] },
  },
  {
    id: 'sofia',
    data: { 'first name': 'Sofia', 'last name': 'Iordachi', birthday: '2018', gender: 'F' },
    rels: { parents: ['andrei', 'ana'], spouses: [], children: [] },
  },
];
