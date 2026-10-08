# Cloudflare Pages V2 — Image Optimization

- Extracted all embedded base64 images from HTML into separately cached WebP files.
- Reused identical logos across pages instead of embedding duplicates.
- Converted PNG logos to **lossless** WebP to preserve exact appearance and transparency.
- Preserved original WebP photo bytes to avoid quality loss.
- Preserved existing lazy-loading attributes and all website styling/content.
- Added Cloudflare Pages `_headers` cache policy for fingerprinted image files.
- Netlify production site has **not** been changed.
- Booking Pages Function and Resend integration are unchanged from V1.

## Notes
- This reduces repeat downloads and HTML document size; it does not guarantee a particular reduction in Netlify credit usage because this optimized version is for Cloudflare.
- Test all pages, galleries, logos, and booking submissions on your `pages.dev` preview before switching the domain.
- Deploy via Git integration or Wrangler to ensure the Pages Function is compiled.
