# Superb Sound Event Services — Cloudflare Pages Version

This package is converted from the V11 website preview for Cloudflare Pages.

## What changed
- All HTML/CSS/JS pages and the V11 launch-special design are preserved.
- Netlify-specific files were removed.
- The booking form now POSTs to `/api/booking`.
- `functions/api/booking.js` is a Cloudflare Pages Function.
- The Function sends the same formatted booking inquiry through Resend.
- `_routes.json` limits Functions to `/api/*`.

## Recommended deployment
Because this site uses a Pages Function, deploy it with a Git provider (GitHub is the simplest) or Wrangler. Cloudflare's dashboard Direct Upload does not compile a `/functions` directory.

### GitHub + Cloudflare Pages
1. Create a new GitHub repository.
2. Upload the CONTENTS of this folder to the repository root. `index.html` and the `functions` folder must both be at the repository root.
3. In Cloudflare, go to Workers & Pages and create/import a Pages project from that GitHub repository.
4. For a plain HTML site, no framework/build command is required. Use the repository root as the site content.
5. Deploy. Cloudflare will provide a `*.pages.dev` preview address.

## Required Cloudflare Variables and Secrets
In the Pages project, open Settings > Variables and Secrets and add:
- `RESEND_API_KEY` — encrypted Secret
- `BOOKING_FROM_EMAIL` — the verified Resend sender, e.g. `Bookings <bookings@yourdomain.com>`
- `BOOKING_TO_EMAIL` — `superbsoundevent@gmail.com`

Set the same values for Preview and Production if you want booking emails to work in both environments.

Never place the Resend API key inside HTML, JavaScript sent to the browser, or this ZIP.

## Test before moving the domain
1. Open the Cloudflare `pages.dev` address.
2. Test Home, Superb Sound, UR Photo Booths, FAQ, Contact, Booking, and Thank You.
3. Submit a real test booking inquiry.
4. Confirm the formatted email arrives and Reply goes to the customer's submitted email.
5. Check the site on a phone.
6. Keep `superbsoundevents.com` on Netlify until the Cloudflare preview is fully approved.

## Important
The booking form requires the Cloudflare Function. If you only upload the static HTML files without deploying the `/functions` directory through Git integration or Wrangler, the website will display but booking emails will not work.
