import { fullName, lifespan, memberAriaLabel } from './member-text';
import { member } from './testing/member-factory';

describe('lifespan', () => {
  it('shows birth and death years for the deceased', () =>
    expect(lifespan(member('1', {}, { birthday: '1925-04-12', diedAt: '1998-11-03T14:20:00+00:00' }))).toBe(
      '1925 – 1998',
    ));
  it('shows an open range for the living', () =>
    expect(lifespan(member('1', {}, { birthday: '1955-01-08' }))).toBe('1955 –'));
  it('is empty for an unparseable birthday', () =>
    expect(lifespan(member('1', {}, { birthday: 'garbage' }))).toBe(''));
  it('is empty without a birthday', () => expect(lifespan(member('1', {}, {}))).toBe(''));
});

describe('fullName', () => {
  it('joins first and last name', () =>
    expect(fullName(member('1', {}, { 'first name': 'Ion', 'last name': 'Iordachi' }))).toBe('Ion Iordachi'));
  it('accepts a lone first name', () =>
    expect(fullName(member('1', {}, { 'first name': 'Ion', 'last name': undefined }))).toBe('Ion'));
  it('never shows a lone last name', () =>
    expect(fullName(member('1', {}, { 'first name': '', 'last name': 'Iordachi' }))).toBe('Unknown'));
});

describe('memberAriaLabel', () => {
  it('describes a deceased member', () =>
    expect(
      memberAriaLabel(
        member(
          '1',
          {},
          { 'first name': 'Vasile', 'last name': 'Iordachi', birthday: '1925-04-12', diedAt: '1998-11-03T00:00:00Z' },
        ),
      ),
    ).toBe('Vasile Iordachi, born 1925, died 1998'));
  it('describes a living member', () =>
    expect(memberAriaLabel(member('1', {}, { 'first name': 'Ion', 'last name': 'Iordachi', birthday: '1955-01-08' }))).toBe(
      'Ion Iordachi, born 1955',
    ));
  it('omits unknown dates', () =>
    expect(memberAriaLabel(member('1', {}, { 'first name': 'Ion', 'last name': 'Iordachi' }))).toBe('Ion Iordachi'));
});
