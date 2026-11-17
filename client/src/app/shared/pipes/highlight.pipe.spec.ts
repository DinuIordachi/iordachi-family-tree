import { HighlightPipe } from './highlight.pipe';

describe('HighlightPipe', () => {
  const pipe = new HighlightPipe();
  const mark = (s: string) => `<mark class="activity-hit">${s}</mark>`;

  it('wraps every case-insensitive match', () => {
    expect(pipe.transform('Ion Iordachi', 'io')).toBe(`${mark('Io')}n ${mark('Io')}rdachi`);
  });

  it('escapes HTML in the value', () => {
    const out = pipe.transform('<b>x</b>', 'b');
    expect(out).not.toContain('<b>');
    expect(out).toBe(`&lt;${mark('b')}&gt;x&lt;/${mark('b')}&gt;`);
  });

  it('treats regex characters in the term literally', () => {
    expect(pipe.transform('xa.(y a', 'a.(')).toBe(`x${mark('a.(')}y a`);
  });

  it('matches terms that contain HTML-escapable characters', () => {
    expect(pipe.transform('Tom & Jerry', '& j')).toBe(`Tom ${mark('&amp; J')}erry`);
  });

  it('returns the escaped value when the term is empty', () => {
    expect(pipe.transform('a<b', '')).toBe('a&lt;b');
    expect(pipe.transform('a<b', '   ')).toBe('a&lt;b');
    expect(pipe.transform('a<b', null)).toBe('a&lt;b');
  });

  it('renders null/undefined as empty and numbers as text', () => {
    expect(pipe.transform(null, 'x')).toBe('');
    expect(pipe.transform(undefined, 'x')).toBe('');
    expect(pipe.transform(1932, '93')).toBe(`1${mark('93')}2`);
  });

  it('ignores diacritics, like the server search', () => {
    expect(pipe.transform('Ștefan Iordăchescu', 'stefan')).toBe(`${mark('Ștefan')} Iordăchescu`);
    expect(pipe.transform('Iordăchescu', 'DACH')).toBe(`Ior${mark('dăch')}escu`);
  });
});
