import { Pipe, PipeTransform } from '@angular/core';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Lower-cased, accent-free form of one character ("Ș" → "s"). */
function fold(char: string): string {
  return char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Wraps every case- and accent-insensitive occurrence of `term` in
 * `<mark class="activity-hit">`. The output is HTML-escaped, so it is safe
 * to bind with `[innerHTML]`. The term is matched literally.
 */
@Pipe({ name: 'highlight', standalone: true, pure: true })
export class HighlightPipe implements PipeTransform {
  transform(value: unknown, term: string | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    const text = typeof value === 'string' ? value : String(value);
    const needle = [...(term ?? '').trim()].map(fold).join('');
    if (!needle) {
      return escapeHtml(text);
    }

    // Fold the text one character at a time, remembering where each folded
    // character came from so matches map back onto the original string.
    const chars = [...text];
    let folded = '';
    const origin: number[] = [];
    chars.forEach((char, i) => {
      for (const f of fold(char)) {
        folded += f;
        origin.push(i);
      }
    });
    origin.push(chars.length);

    let out = '';
    let cursor = 0;
    let from = 0;
    for (let at = folded.indexOf(needle, from); at !== -1; at = folded.indexOf(needle, from)) {
      const start = origin[at];
      const end = origin[at + needle.length - 1] + 1;
      if (start >= cursor) {
        out += escapeHtml(chars.slice(cursor, start).join(''));
        out += `<mark class="activity-hit">${escapeHtml(chars.slice(start, end).join(''))}</mark>`;
        cursor = end;
      }
      from = at + needle.length;
    }
    return out + escapeHtml(chars.slice(cursor).join(''));
  }
}
