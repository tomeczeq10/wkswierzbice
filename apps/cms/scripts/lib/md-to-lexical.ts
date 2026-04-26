/**
 * Konwersja prostego markdown body → Lexical SerializedEditorState.
 *
 * Zakres: dokładnie tyle, ile używają nasze 24 plików `.md` w
 * `apps/web/src/content/news/*.md`:
 *   - akapity rozdzielone podwójnymi newline'ami,
 *   - linebreak (single `\n` w obrębie akapitu) → `<br>` (Lexical `linebreak` node),
 *   - inline:
 *     - **bold** / __bold__   → format=1,
 *     - _italic_ / *italic*   → format=2,
 *     - [text](url)           → link node (format dziedziczy z kontekstu,
 *       więc `_text [link](url) text_` propaguje italic na cały link).
 *
 * Algorytm 2-stopniowy:
 *   1. parseInline(line, format) — najpierw rozpoznaje bold/italic (mogą obejmować
 *      linki); rekursywnie parsuje wnętrze z dodanym formatem.
 *   2. parseLinksAndText(text, format) — w plain text segmentach wyciąga linki;
 *      `format` propaguje na text-node dzieci linka.
 *
 * Dzięki temu np. `_Pełny wpis [na fanpage'u](https://...)._` da:
 *   italic-text "Pełny wpis " + link{children: italic-text "na fanpage'u"} + italic-text "."
 *
 * Świadome ograniczenia (NIE obsługujemy):
 *   - `# nagłówki`, `> blockquote`, listy, code blocks, obrazki.
 *   Nasze `.md` ich nie zawierają (zweryfikowane przez grep).
 *   Jeśli kiedyś dojdą — rozszerzymy parser albo przejdziemy na `unified+remark`.
 *
 * Format Lexical odpowiada wersji używanej przez Payload 3.84
 * (`lexical@0.41.0`).
 */

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;

type LexicalText = {
  type: 'text';
  version: 1;
  detail: 0;
  format: number;
  mode: 'normal';
  style: '';
  text: string;
};

type LexicalLinebreak = {
  type: 'linebreak';
  version: 1;
};

type LexicalLink = {
  type: 'link';
  version: 3;
  fields: {
    linkType: 'custom';
    url: string;
    newTab: boolean;
  };
  direction: 'ltr';
  format: '';
  indent: 0;
  children: LexicalText[];
};

type LexicalInline = LexicalText | LexicalLinebreak | LexicalLink;

type LexicalParagraph = {
  type: 'paragraph';
  version: 1;
  textFormat: 0;
  direction: 'ltr';
  format: '';
  indent: 0;
  children: LexicalInline[];
};

export type LexicalEditorState = {
  root: {
    type: 'root';
    version: 1;
    direction: 'ltr';
    format: '';
    indent: 0;
    children: LexicalParagraph[];
  };
};

function makeText(text: string, format = 0): LexicalText {
  return { type: 'text', version: 1, detail: 0, format, mode: 'normal', style: '', text };
}

function makeLinebreak(): LexicalLinebreak {
  return { type: 'linebreak', version: 1 };
}

function makeLink(url: string, children: LexicalText[]): LexicalLink {
  return {
    type: 'link',
    version: 3,
    fields: { linkType: 'custom', url, newTab: true },
    direction: 'ltr',
    format: '',
    indent: 0,
    children,
  };
}

/**
 * Wyciąga linki `[text](url)` z plain-text segmentu i zwraca listę nodes.
 * `format` propaguje się na text nodes (włącznie z dziećmi linka).
 */
function parseLinksAndText(text: string, format: number): LexicalInline[] {
  const nodes: LexicalInline[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIdx = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > lastIdx) {
      nodes.push(makeText(text.slice(lastIdx, start), format));
    }
    nodes.push(makeLink(m[2], [makeText(m[1], format)]));
    lastIdx = start + m[0].length;
  }
  if (lastIdx < text.length) {
    nodes.push(makeText(text.slice(lastIdx), format));
  }
  return nodes;
}

/**
 * Parser inline 1 linia → lista nodes. Rekurencyjny: outer warstwa to bold/italic,
 * w środku przekazujemy `format` w dół (do parseLinksAndText).
 *
 * NB: regex italic używa lookbehind/lookahead żeby nie kraść wnętrza bold (`**`).
 * Italic obejmuje też nawiasy `[ ] ( )` — dlatego link parsujemy DRUGIM krokiem.
 */
function parseInline(line: string, baseFormat = 0): LexicalInline[] {
  const nodes: LexicalInline[] = [];
  const re =
    /(\*\*([^*\n]+)\*\*)|(__([^_\n]+)__)|(?<![A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9_])|(?<![A-Za-z0-9*])\*([^*\n]+)\*(?![A-Za-z0-9*])/g;

  let lastIndex = 0;
  for (const m of line.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      nodes.push(...parseLinksAndText(line.slice(lastIndex, start), baseFormat));
    }
    if (m[1] !== undefined) {
      nodes.push(...parseInline(m[2], baseFormat | FORMAT_BOLD));
    } else if (m[3] !== undefined) {
      nodes.push(...parseInline(m[4], baseFormat | FORMAT_BOLD));
    } else if (m[5] !== undefined) {
      nodes.push(...parseInline(m[5], baseFormat | FORMAT_ITALIC));
    } else if (m[6] !== undefined) {
      nodes.push(...parseInline(m[6], baseFormat | FORMAT_ITALIC));
    }
    lastIndex = start + m[0].length;
  }
  if (lastIndex < line.length) {
    nodes.push(...parseLinksAndText(line.slice(lastIndex), baseFormat));
  }
  return nodes;
}

function makeParagraph(lines: string[]): LexicalParagraph {
  const children: LexicalInline[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) children.push(makeLinebreak());
    children.push(...parseInline(lines[i]));
  }
  return {
    type: 'paragraph',
    version: 1,
    textFormat: 0,
    direction: 'ltr',
    format: '',
    indent: 0,
    children,
  };
}

export function markdownToLexical(markdown: string): LexicalEditorState {
  const trimmed = markdown.trim();
  if (!trimmed) {
    return {
      root: {
        type: 'root',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [makeParagraph([''])],
      },
    };
  }

  const blocks = trimmed.split(/\n{2,}/);
  const paragraphs: LexicalParagraph[] = blocks
    .map((block) => block.split('\n').map((l) => l.trimEnd()))
    .map((lines) => lines.filter((l) => l.length > 0))
    .filter((lines) => lines.length > 0)
    .map(makeParagraph);

  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: paragraphs,
    },
  };
}
