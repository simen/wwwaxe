interface WwwaxeOptions {
    /** Keep data-* attributes (default: false) */
    keepDataAttributes?: boolean;
    /** Keep id attributes (default: true) */
    keepIds?: boolean;
    /** Keep class attributes (default: false) */
    keepClasses?: boolean;
    /** Keep aria-hidden elements (default: false) */
    keepAriaHidden?: boolean;
    /** Convert HTML tags to markdown syntax for token efficiency (default: true) */
    markdown?: boolean;
    /** Strip chrome (header, nav, footer, aside, dialog) and isolate core content (default: false) */
    core?: boolean;
}
/**
 * wwwaxe - Strip non-content data from HTML
 *
 * Takes raw HTML and returns condensed HTML retaining meaningful structure
 * and content while stripping scripts, styles, and presentational attributes.
 */
declare function wwwaxe(html: string, options?: WwwaxeOptions): string;

export { type WwwaxeOptions, wwwaxe };
