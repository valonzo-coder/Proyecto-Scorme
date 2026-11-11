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
}
