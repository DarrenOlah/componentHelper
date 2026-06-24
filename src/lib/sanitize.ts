// Shared, security-critical sanitizers for the snippet generators (drawer, cards).
// Pure and DOM-free so they unit-test with literal inputs. Both generators import
// from here so the escaping/allowlist rules live in exactly one place.

// ---- HTML escaping (HTML context, NOT JS-string context) ------------------
// `&` must be replaced first so the entities we introduce aren't double-escaped.

// Attribute context: also escape the quote we wrap attributes in.
export function escapeHtmlAttr(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Text node context.
export function escapeHtmlText(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Control chars (incl. tab/newline) can smuggle a scheme past the checks below.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')

// ---- URL safety -----------------------------------------------------------
// Allow only safe URL schemes; neutralize javascript:/data:/etc. to '#'.
// Scheme-less values (root-relative, anchors, relative paths) pass through.
const SAFE_HREF_SCHEMES = ['http', 'https', 'mailto', 'tel']
export function safeHref(raw: string): string {
  const stripped = raw.trim().replace(CONTROL_CHARS, '')
  if (!stripped) return ''
  const scheme = stripped.toLowerCase().match(/^([a-z][a-z0-9+.-]*):/)
  if (scheme) {
    return SAFE_HREF_SCHEMES.includes(scheme[1]) ? stripped : '#'
  }
  return stripped
}

// A neutral gray placeholder square (visible on either a dark or light surface),
// shown until the user supplies a real image/icon URL — and the safe fallback for
// any rejected src. Inline SVG data-URI so it needs no network.
export const IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='160'%20height='160'%3E%3Crect%20width='160'%20height='160'%20fill='%23999999'/%3E%3C/svg%3E"

// Image src safety. Unlike safeHref (which neutralizes bad values to '#'), a bad
// image should fall back to a *visible* placeholder rather than a dead src.
// Allowed: http/https, scheme-less/relative paths ('/Portals/...', '//cdn/x.png',
// 'a/b.png'), and data: URIs that are explicitly an image type. Everything else
// (javascript:, data:text/html, other schemes, empty) → IMAGE_PLACEHOLDER.
const DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml|avif)[;,]/i
export function safeImageSrc(raw: string): string {
  const stripped = raw.trim().replace(CONTROL_CHARS, '')
  if (!stripped) return IMAGE_PLACEHOLDER
  const scheme = stripped.toLowerCase().match(/^([a-z][a-z0-9+.-]*):/)
  if (scheme) {
    if (scheme[1] === 'http' || scheme[1] === 'https') return stripped
    if (scheme[1] === 'data') return DATA_IMAGE.test(stripped) ? stripped : IMAGE_PLACEHOLDER
    return IMAGE_PLACEHOLDER
  }
  return stripped // scheme-less: relative / root-relative / protocol-relative
}

// ---- CSS value sanitization (prevents injection into the <style> block) ---
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
export function safeColor(raw: string, fallback: string): string {
  return HEX_COLOR.test(raw.trim()) ? raw.trim() : fallback
}

// ---- Font Awesome class safety (class-attribute context) -------------------
// The icon/logo cards can emit `<i class="...">` for an FA glyph. Validate the
// class string before it lands in the attribute: each token must match the FA
// naming shape (fa-solid, fa-house, fa-fw, ...), so nothing can carry a quote,
// space, '<', '>', '=' or scheme out of the attribute. Tokens are kept in order,
// deduped, and capped (a style prefix + name + a couple modifiers is plenty).
// Returns '' when nothing valid survives, which the generator treats as "no icon".
const FA_TOKEN = /^fa-[a-z0-9-]+$/
const FA_MAX_TOKENS = 4
export function sanitizeIconClass(raw: string): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of raw.trim().split(/\s+/)) {
    if (FA_TOKEN.test(t) && !seen.has(t)) {
      seen.add(t)
      out.push(t)
      if (out.length >= FA_MAX_TOKENS) break
    }
  }
  return out.join(' ')
}
