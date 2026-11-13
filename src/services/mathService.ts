import katex from 'katex';

export class MathService {
  /**
   * Renders a LaTeX formula to HTML string using KaTeX.
   */
  static renderLatexToHtml(latex: string, displayMode: boolean = true): string {
    if (!latex || !latex.trim()) return '';
    try {
      return katex.renderToString(latex.trim(), {
        displayMode,
        throwOnError: false,
        output: 'html'
      });
    } catch (err: any) {
      console.warn('KaTeX render error:', err);
      return `<span class="katex-error text-rose-500 font-mono text-xs" title="${err?.message || 'Error en fórmula'}">${latex}</span>`;
    }
  }

  /**
   * Scans an HTML or text string for LaTeX delimiters:
   * $$formula$$ -> display mode
   * $formula$ -> inline mode
   * Replaces them with rendered KaTeX spans/divs.
   */
  static renderFormulasInHtml(html: string): string {
    if (!html) return '';

    // First replace display formulas: $$...$$
    let processed = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, equation) => {
      return `<div class="my-3 text-center overflow-x-auto py-1">${this.renderLatexToHtml(equation, true)}</div>`;
    });

    // Then replace inline formulas: $...$ (avoiding currency signs by requiring non-space after opening and before closing)
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, equation) => {
      return `<span class="inline-math px-1">${this.renderLatexToHtml(equation, false)}</span>`;
    });

    return processed;
  }

  /**
   * Walks text nodes inside a DOM container and renders $$...$$ and $...$ math expressions safely using KaTeX.
   */
  static renderMathInElement(container: HTMLElement): void {
    if (!container || typeof document === 'undefined') return;
    const skipTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE']);
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      const parent = current.parentElement;
      if (
        parent &&
        !skipTags.has(parent.tagName) &&
        !parent.closest('.katex') &&
        current.nodeValue &&
        current.nodeValue.includes('$')
      ) {
        nodes.push(current as Text);
      }
      current = walker.nextNode();
    }

    for (const textNode of nodes) {
      const raw = textNode.nodeValue || '';
      if (!/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/.test(raw)) continue;

      const frag = document.createDocumentFragment();
      let cursor = 0;
      const regex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(raw)) !== null) {
        if (match.index > cursor) {
          frag.appendChild(document.createTextNode(raw.slice(cursor, match.index)));
        }
        const isDisplay = match[1] !== undefined;
        const latex = isDisplay ? match[1] : match[2];
        const wrapper = document.createElement(isDisplay ? 'div' : 'span');
        wrapper.className = isDisplay ? 'my-2 text-center overflow-x-auto py-1' : 'inline-math px-0.5';
        wrapper.innerHTML = this.renderLatexToHtml(latex, isDisplay);
        frag.appendChild(wrapper);
        cursor = match.index + match[0].length;
      }
      if (cursor < raw.length) {
        frag.appendChild(document.createTextNode(raw.slice(cursor)));
      }
      textNode.parentNode?.replaceChild(frag, textNode);
    }
  }
}
