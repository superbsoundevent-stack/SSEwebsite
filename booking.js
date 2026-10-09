const esc = (v = "") =>
  String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));

const pick = (d, ...keys) => {
  for (const key of keys) {
    const value = d[key];
    if (value !== undefined && String(value).trim() !== "") return String(value);
  }
  return "—";
};

const rows = (items) =>
  `<table style="width:100%;border-collapse:collapse">${
    items.map(([k,v]) =>
      `<tr><td style="width:38%;padding:9px 12px;border-bottom:1px solid #eadcb8;font-weight:700">${esc(k)}</td>` +
      `<td style="padding:9px 12px;border-bottom:1px solid #eadcb8">${esc(v)}</td></tr>`
    ).join("")
  }</table>`;

export async function onRequestPost(context) {
  const { request, env } = context;
  const form = await request.formData();
  const d = Object.fromEntries(form.entries());
  d.music_genres = form.getAll("music_genres").join(", ") || d.music_genres || "";

  // Honeypot: silently accept obvious bot submissions.
  if (String(d["bot-field"] || d["website"] || "").trim()) {
    return Response.json({ ok: true });
  }

  const name = pick(d,"name","full-name","full_name");
  const email = pick(d,"email");
  const phone = pick(d,"phone","phone-number");
  const date = pick(d,"event-date","event_date","date");
  // Accept both current and older form field names, including custom quote choices.
  const customSelections = form.getAll("custom_quote_event").map(v=>String(v).trim()).filter(Boolean);
  const typeFromSelect = pick(d,"event_type","event-type","type");
  const type = typeFromSelect !== "—" ? typeFromSelect : (customSelections.join(", ") || "Not specified");
  const venueInput = pick(d,"venue","venue-name");
  const venue = venueInput === "—" ? "Venue not yet determined" : venueInput;
  const loc = pick(d,"city","event-city","location");
  const guests = pick(d,"guest-count","guest_count","guests");
  const service = pick(d,"service","service-type","service_type","services");
  const pkg = pick(d,"package","package-name","package_name");
  const gallery = pick(d,"gallery-preference","gallery_preference","gallery_visibility");
  const promo = pick(d,"promotion");
  const priceMap = {'Put a Ring On It — $550':550,"Let's Get It Started — $950":950,'Love On Top — $1,395':1395,'Love Over Board — $1,995':1995,'Photo booth — 2 hours':400,'Photo booth — 3 hours':500,'Photo booth — 4 hours':600};
  const chosen = pick(d,'service');
  const category = pick(d,'brand');
  const base = priceMap[chosen];
  const localDate = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const promoActive = localDate <= '2026-10-31';
  const saving = promoActive && base !== undefined ? (chosen === 'Love Over Board — $1,995' ? 200 : (category === 'Superb Sound Event Services' || category === 'UR Photo Booths' ? 100 : 0)) : 0;
  const money = n => '$' + n.toFixed(2);
  const total = base === undefined ? 'Custom quote' : money(base - saving);
  const retainer = base === undefined ? '50% of confirmed quote' : money((base - saving) / 2);
  const balance = retainer;
  const regularPrice = base === undefined ? 'Custom quote' : money(base);
  const discountAmount = base === undefined ? 'Subject to quote' : money(saving);
  const promotionStatus = promoActive ? 'Potentially eligible — signed contract and 50% retainer must be received by October 31, 2026' : 'Expired';
  const notes = pick(d,"message","notes","event-details","event_details","details");
  const brand = pick(d,"brand");
  const start = pick(d,"start_time");
  const end = pick(d,"end_time");
  const contact = pick(d,"contact_preference");
  const music = pick(d,"music_genres");
  const musicOther = pick(d,"music_other");
  const mc = pick(d,"mc_requested");
  const mustPlay = pick(d,"must_play");
  const doNotPlay = pick(d,"do_not_play");
  const boothStart = pick(d,"booth_start_time");
  const boothEnd = pick(d,"booth_end_time");
  const boothTheme = pick(d,"booth_theme");
  const boothBackdrop = pick(d,"booth_backdrop");
  const boothRequests = pick(d,"booth_requests");
  const source = pick(d,"referral_source");
  const customEvent = customSelections.join(", ") || "—";
  const isDJ = brand.includes("Superb Sound");
  const isBooth = brand.includes("Photo Booth") || service.startsWith("Love Over Board");
  const overnight = end !== "—" && start !== "—" && end < start ? "Yes — ends the following day" : "No";
  const boothOvernight = pick(d,"booth_overnight");

  const section = (title, r) =>
    `<h2 style="color:#a47b25;margin:28px 0 10px">${title}</h2>${rows(r)}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f3f0e9;font-family:Arial,sans-serif;color:#171717">
  <div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #d5ad50">
    <div style="background:#080808;color:#d5ad50;text-align:center;padding:28px 18px">
      <div style="font-size:25px;font-weight:800;letter-spacing:1px">SUPERB SOUND EVENT SERVICES</div>
      <div style="color:#fff;margin-top:7px">NEW BOOKING INQUIRY</div>
    </div>
    <div style="padding:24px">
      ${section("Client Information",[["Name",name],["Email",email],["Phone",phone],["Preferred Contact",contact],["How They Found Us",source]])}
      ${section("Event Information",[["Event Date",date],["Event Type",type],["Event Start",start],["Event End",end],["Overnight Event",overnight],["Venue / Address",venue],["City / Location",loc],["Guest Count",guests]])}
      ${section("Services Requested",[["Service Category",brand],["Selected Package",service],["Custom Quote Event Type",customEvent],["Promotion",promoActive ? "Website Launch Special 2026" : "Promotion expired"],["Promotion Status",promotionStatus]])}
      ${isDJ ? section("DJ Music & Entertainment",[["Music Genres",music],["Other Music",musicOther],["MC / Announcements",mc],["Must-Play Songs",mustPlay],["Do-Not-Play Songs",doNotPlay]]) : ""}
      ${isBooth ? section("Photo Booth Preferences",[["Booth Start",boothStart],["Booth End",boothEnd],["Booth Overnight",boothOvernight],["Theme / Colors",boothTheme],["Backdrop",boothBackdrop],["Print & Booth Requests",boothRequests],["Gallery Preference",gallery]]) : ""}
      ${section("Estimate",[["Regular Package Price",regularPrice],["Potential Promotional Savings",discountAmount],["Estimated Discounted Total",total],["Estimated Retainer",retainer],["Estimated Balance",balance]])}
      <h2 style="color:#a47b25;margin:28px 0 10px">Customer Message</h2>
      <div style="padding:14px;background:#faf7ef;border-left:4px solid #d5ad50;white-space:pre-wrap">${esc(notes)}</div>
      <div style="margin-top:28px;padding:16px;background:#111;color:#fff;text-align:center">
        <strong style="color:#d5ad50">INQUIRY ONLY</strong><br>
        Event date is not reserved until availability is confirmed and the required contract and retainer are received.
      </div>
    </div>
  </div></body></html>`;

  const key = env.RESEND_API_KEY;
  const from = env.BOOKING_FROM_EMAIL;
  const to = env.BOOKING_TO_EMAIL || "superbsoundevent@gmail.com";

  if (!key || !from) {
    return Response.json(
      { ok:false, error:"Missing RESEND_API_KEY or BOOKING_FROM_EMAIL" },
      { status:500 }
    );
  }

  const payload = {
    from,
    to:[to],
    subject:`NEW ${brand === "—" ? "BOOKING" : brand} INQUIRY | ${name} | ${date}`,
    html
  };
  if (email !== "—") payload.reply_to = email;

  const response = await fetch("https://api.resend.com/emails", {
    method:"POST",
    headers:{
      "Authorization":`Bearer ${key}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(payload)
  });

  const provider = await response.json().catch(() => ({}));
  return Response.json(
    { ok:response.ok, provider },
    { status:response.ok ? 200 : 502 }
  );
}

export function onRequestGet() {
  return new Response("Method Not Allowed", { status:405 });
}