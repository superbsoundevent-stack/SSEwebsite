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
  // Preserve every submitted answer, including multi-select checkboxes.
  const d = {};
  for (const key of new Set(form.keys())) {
    const values = form.getAll(key).map(value => String(value).trim()).filter(Boolean);
    d[key] = values.join(", ");
  }

  // Honeypot: silently accept obvious bot submissions.
  if (String(d["bot-field"] || d["website"] || "").trim()) {
    return Response.json({ ok: true });
  }

  const name = pick(d,"name","full-name","full_name");
  const email = pick(d,"email","email_address","customer_email").trim();
  const validCustomerEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!validCustomerEmail) {
    return Response.json({ok:false,error:"Please enter a valid customer email address."},{status:400});
  }
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
  const notes = pick(d,"details","message","notes","event-details","event_details");
  const brand = pick(d,"brand");
  const start = pick(d,"start_time");
  const end = pick(d,"end_time");
  const contact = pick(d,"contact_preference");
  const music = pick(d,"music_genres","music_genre","genres");
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
  const isDJ = brand.includes("Superb Sound") || service.startsWith("Love Over Board");
  const isBooth = brand.includes("Photo Booth") || service.startsWith("Love Over Board");
  const overnight = end !== "—" && start !== "—" && end < start ? "Yes — ends the following day" : "No";
  const boothOvernight = pick(d,"booth_overnight");

  // Catch-all audit: every customer-entered form field is visible in the business email.
  // Avoid showing anti-bot traps and internal hidden pricing/calculation fields twice.
  const labels = {
    brand:"Service Brand", service:"Selected Package", custom_quote_event:"Custom Quote Event",
    type:"Event Type", date:"Event Date", start_time:"Event Start Time", end_time:"Event End Time",
    guests:"Estimated Guest Count", city:"Event City", venue:"Venue / Event Address",
    music_genres:"Music Genres", music_other:"Other Music Styles", mc_requested:"MC / Announcements",
    must_play:"Must-Play Songs / Artists", do_not_play:"Do-Not-Play Songs / Artists",
    booth_start_time:"Photo Booth Start Time", booth_end_time:"Photo Booth End Time",
    booth_overnight:"Photo Booth Overnight", booth_theme:"Event Theme / Colors",
    booth_backdrop:"Backdrop Preferences", booth_requests:"Photo Print / Booth Requests",
    name:"Customer Name", email:"Customer Email", phone:"Customer Phone",
    contact_preference:"Preferred Contact Method", referral_source:"How They Heard About Us",
    details:"Additional Details / Customer Message", gallery_visibility:"Gallery Preference",
    inquiry_acknowledgement:"Inquiry Terms Acknowledged",
    promotion:"Promotion", promotion_status:"Promotion Status", standard_price:"Regular Price",
    estimated_discount:"Estimated Discount", estimated_total:"Estimated Total",
    estimated_retainer:"Estimated Retainer", estimated_balance:"Estimated Balance"
  };
  const exclude = new Set(["bot-field", "website", "csrf_token"]);
  const submittedAnswers = Object.entries(d)
    .filter(([key, value]) => !exclude.has(key) && String(value).trim())
    .map(([key, value]) => [labels[key] || key.replace(/[_-]/g," ").replace(/\b\w/g, c => c.toUpperCase()), value]);

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
      ${section("DJ Music & Entertainment Preferences",[["Music Genres Selected",music],["Other Music Styles / Artists",musicOther],["MC / Announcements",mc],["Must-Play Songs / Artists",mustPlay],["Do-Not-Play Songs / Artists",doNotPlay]])}
      ${section("Photo Booth Preferences",[["Booth Start",boothStart],["Booth End",boothEnd],["Booth Overnight",boothOvernight],["Theme / Colors",boothTheme],["Backdrop",boothBackdrop],["Print & Booth Requests",boothRequests],["Gallery Preference",gallery]])}
      ${section("Customer Message & Special Requests",[["Customer's Full Message",notes]])}
      ${section("Complete Customer Responses (All Submitted Fields)",submittedAnswers)}
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
  // Route Gmail's Reply button to the customer, not the automated sender.
  // Resend uses reply_to to set the Reply-To email header.
  const customerReplyAddress = email.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerReplyAddress)) {
    payload.reply_to = customerReplyAddress;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method:"POST",
    headers:{
      "Authorization":`Bearer ${key}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(payload)
  });

  const provider = await response.json().catch(() => ({}));
  if (!response.ok || !provider.id) {
    console.error("Business inquiry rejected by Resend", response.status, JSON.stringify(provider));
    return Response.json({ ok:false, error:"The inquiry could not be delivered. Please try again." }, { status:502 });
  }

  // Send a separate customer acknowledgement only after the business inquiry succeeds.
  // This is an inquiry receipt, not an availability confirmation or reservation.
  let confirmationAccepted = false;
  let confirmationIssue = null;
  if (validCustomerEmail) {
    const customerHtml = `<!doctype html><html><body style="margin:0;background:#f3f0e9;font-family:Arial,sans-serif;color:#171717">
      <div style="max-width:640px;margin:24px auto;background:#fff;border:1px solid #d5ad50">
        <div style="background:#080808;color:#d5ad50;text-align:center;padding:28px 18px">
          <div style="font-size:23px;font-weight:800;letter-spacing:1px">SUPERB SOUND EVENT SERVICES</div>
          <div style="color:#fff;margin-top:8px">SUPERB SOUND • UR PHOTO BOOTHS</div>
        </div>
        <div style="padding:26px 22px">
          <h1 style="font-size:24px;margin:0 0 16px">Thank You for Your Inquiry!</h1>
          <p>Hello ${esc(name === '—' ? 'there' : name)},</p>
          <p>Thank you for considering Superb Sound Event Services and UR Photo Booths! We have received your inquiry and will review your event details before contacting you about availability and next steps.</p>
          <h2 style="font-size:18px;color:#a47b25;margin-top:25px">Your Inquiry Summary</h2>
          ${rows([["Event Type",type],["Event Date",date],["Requested Service",brand],["Selected Package",service],["Event Start",start],["Event End",end],["Venue",venue]])}
          <p style="font-size:13px;color:#555">Any promotional pricing is subject to eligibility and confirmation. The Website Launch Special requires a signed contract and the required 50% non-refundable retainer by October 31, 2026.</p>
          <div style="background:#faf7ef;border-left:4px solid #d5ad50;padding:16px;margin:22px 0">
            <strong>Important:</strong> This email confirms receipt of your inquiry only. Your event date is not reserved until availability is confirmed, your contract is signed, and the required retainer is received.
          </div>
          <p>Questions or changes? Simply reply to this email to reach us at <a href="mailto:superbsoundevent@gmail.com">superbsoundevent@gmail.com</a>.</p>
          <p>We look forward to helping make your event memorable!</p>
          <p><strong>Superb Sound Event Services &amp; UR Photo Booths</strong><br><a href="https://superbsoundevents.com">superbsoundevents.com</a></p>
        </div>
      </div></body></html>`;
    try {
      const confirmationResponse = await fetch("https://api.resend.com/emails", {
        method:"POST",
        headers:{ "Authorization":`Bearer ${key}`, "Content-Type":"application/json" },
        body:JSON.stringify({
          from,
          to:[email.trim()],
          reply_to:"superbsoundevent@gmail.com",
          subject:"We Received Your Event Inquiry | Superb Sound Event Services",
          html:customerHtml
        })
      });
      const confirmationResult = await confirmationResponse.json().catch(() => ({}));
      if (confirmationResponse.ok && confirmationResult.id) {
        confirmationAccepted = true;
        console.log("Customer confirmation accepted by Resend", confirmationResult.id);
      } else {
        confirmationIssue = `Resend rejected customer confirmation (HTTP ${confirmationResponse.status})`;
        console.error(confirmationIssue, JSON.stringify(confirmationResult));
      }
    } catch (error) {
      confirmationIssue = "Customer confirmation request failed";
      console.error(confirmationIssue, String(error));
    }
  }
  // Keep the inquiry successful if the separate acknowledgement fails;
  // do not prompt a duplicate booking submission. Check Cloudflare logs and Resend delivery logs.
  // Do not fail the form submission if only the acknowledgement email fails.
  // A successful API response means Resend accepted the message, not that it reached the inbox.
  // The inquiry remains successful even if the separate customer email fails.
  return Response.json({
    ok:true,
    provider,
    customer_confirmation_accepted:confirmationAccepted,
    ...(confirmationIssue ? {warning:"Inquiry received, but customer confirmation email was not accepted. Check Cloudflare logs and Resend email logs."} : {})
  }, { status:200 });
}

export function onRequestGet() {
  return new Response("Method Not Allowed", { status:405 });
}