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

  // Honeypot: silently accept obvious bot submissions.
  if (String(d["bot-field"] || d["website"] || "").trim()) {
    return Response.json({ ok: true });
  }

  const name = pick(d,"name","full-name","full_name");
  const email = pick(d,"email");
  const phone = pick(d,"phone","phone-number");
  const date = pick(d,"event-date","event_date","date");
  const type = pick(d,"event-type","event_type");
  const venue = pick(d,"venue","venue-name");
  const loc = pick(d,"city","event-city","location");
  const guests = pick(d,"guest-count","guest_count","guests");
  const service = pick(d,"service","service-type","service_type","services");
  const pkg = pick(d,"package","package-name","package_name");
  const gallery = pick(d,"gallery-preference","gallery_preference");
  const promo = pick(d,"promotion");
  const total = pick(d,"estimated_total");
  const retainer = pick(d,"estimated_retainer");
  const balance = pick(d,"estimated_balance");
  const notes = pick(d,"message","notes","event-details","event_details");

  const section = (title, r) =>
    `<h2 style="color:#a47b25;margin:28px 0 10px">${title}</h2>${rows(r)}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f3f0e9;font-family:Arial,sans-serif;color:#171717">
  <div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #d5ad50">
    <div style="background:#080808;color:#d5ad50;text-align:center;padding:28px 18px">
      <div style="font-size:25px;font-weight:800;letter-spacing:1px">SUPERB SOUND EVENT SERVICES</div>
      <div style="color:#fff;margin-top:7px">NEW BOOKING INQUIRY</div>
    </div>
    <div style="padding:24px">
      ${section("Client Information",[["Name",name],["Email",email],["Phone",phone]])}
      ${section("Event Information",[["Event Date",date],["Event Type",type],["Venue",venue],["City / Location",loc],["Guest Count",guests]])}
      ${section("Services Requested",[["Service",service],["Package",pkg],["Photo Booth Gallery",gallery],["Promotion",promo]])}
      ${section("Estimate",[["Estimated Total",total],["Estimated Retainer",retainer],["Estimated Balance",balance]])}
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
    subject:`NEW BOOKING INQUIRY | ${name} | ${date}`,
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