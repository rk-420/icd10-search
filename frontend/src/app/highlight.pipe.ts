import { Pipe, PipeTransform } from '@angular/core';

export interface TextPart {
  text: string;
  match: boolean;
}

/**
 * Splits a text into parts that match the query and parts that don't,
 * so the template can wrap matches in <mark>. We return data instead of
 * an HTML string, so there is no innerHTML and no risk of XSS.
 */
@Pipe({ name: 'highlight' })
export class HighlightPipe implements PipeTransform {
  transform(text: string, query: string): TextPart[] {
    const needle = fold(query.normalize('NFC').trim());
    if (!needle) {
      return [{ text, match: false }];
    }

    const haystack = fold(text);
    const parts: TextPart[] = [];
    let start = 0;
    let index = haystack.indexOf(needle);

    while (index !== -1) {
      if (index > start) {
        parts.push({ text: text.slice(start, index), match: false });
      }
      parts.push({ text: text.slice(index, index + needle.length), match: true });
      start = index + needle.length;
      index = haystack.indexOf(needle, start);
    }

    if (start < text.length) {
      parts.push({ text: text.slice(start), match: false });
    }
    return parts;
  }
}

/**
 * Lower-case and remove accents character by character (ö → o, É → e),
 * like MySQL's accent-insensitive collation. The result has the same length
 * as the input, so a position found in the folded text is valid in the original.
 */
function fold(value: string): string {
  return value
    .split('')
    .map((char) => {
      const folded = char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      return folded.length === 1 ? folded : char;
    })
    .join('');
}
