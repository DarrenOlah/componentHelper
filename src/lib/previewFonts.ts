// Brand G.I. fonts for the PREVIEW ONLY. Copy output omits @font-face on purpose
// (the production DNN page already loads these families); here we load them from
// public/fonts/ so previews render in the real typeface instead of a system font.
// Shared by the drawer and cards preview documents.
export function previewFontFaceCss(): string {
  const base = import.meta.env.BASE_URL
  return `@font-face {
    font-family: "GI-530";
    src: url("${base}fonts/GI-530.woff2") format("woff2");
    font-weight: 530;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: "GI-400";
    src: url("${base}fonts/GI-400.woff2") format("woff2");
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }`
}
