import { Resend } from "resend";
import { NextResponse } from "next/server";

/**
 * Shared org Resend (free tier): one verified domain — codeyourreality.com.
 * See org note "Contact forms and Resend". If Vercel still has FROM_EMAIL=@deckbase.co,
 * Resend returns "domain is not verified"; we coerce to this domain.
 */
const VERIFIED_SEND_DOMAIN = "codeyourreality.com";
const DEFAULT_FROM = "forms@codeyourreality.com";

function extractEmailFromFromField(value) {
  const v = String(value || "").trim();
  const angle = v.match(/<([^>]+)>/);
  return (angle ? angle[1] : v).trim();
}

function isOnVerifiedSendDomain(emailAddr) {
  const host = emailAddr.split("@")[1]?.toLowerCase();
  if (!host) return false;
  return (
    host === VERIFIED_SEND_DOMAIN || host.endsWith(`.${VERIFIED_SEND_DOMAIN}`)
  );
}

/** Resend `from`: must be @VERIFIED_SEND_DOMAIN; env FROM_EMAIL only used when it matches. */
function resolveResendFrom() {
  const raw = (process.env.FROM_EMAIL || DEFAULT_FROM).trim();
  const addr = extractEmailFromFromField(raw);
  if (isOnVerifiedSendDomain(addr)) {
    return raw.includes("<") ? raw : `Deckbase <${addr}>`;
  }
  console.warn(
    `[contact] FROM_EMAIL must be @${VERIFIED_SEND_DOMAIN} (org Resend). Got "${raw}". Using ${DEFAULT_FROM}.`
  );
  return `Deckbase <${DEFAULT_FROM}>`;
}

const CONTACT_TO = (
  process.env.CONTACT_EMAIL || "hawk20605@gmail.com"
).trim();

export async function POST(request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("Contact email: RESEND_API_KEY is not set");
      return NextResponse.json({ error: "Email service is not configured" }, { status: 503 });
    }

    const { name, email, phone, comment, areaOfInterest } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const interests = Object.entries(areaOfInterest || {})
      .filter(([, checked]) => checked)
      .map(([key]) => {
        const labels = {
          loaUsage: "App Usage Help",
          developerSupport: "Feature Request",
          devBuildRequest: "Bug Report",
          partnership: "Premium & Billing",
          others: "Others",
        };
        return labels[key] || key;
      });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = resolveResendFrom();
    const { data, error } = await resend.emails.send({
      from: from.trim(),
      to: CONTACT_TO,
      replyTo: String(email).trim(),
      subject: `[Deckbase] Contact from ${name}`,
      text: [
        `Product: Deckbase (deckbase.co contact form)`,
        ``,
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "—"}`,
        `Area of Concern: ${interests.length ? interests.join(", ") : "—"}`,
        ``,
        `Message:`,
        comment || "—",
      ].join("\n"),
    });

    if (error) {
      console.error("Contact email Resend error:", error);
      const body = {
        error: "Failed to send message",
        ...(error?.name ? { code: error.name } : {}),
      };
      const exposeDetail =
        process.env.NODE_ENV === "development" ||
        process.env.CONTACT_FORM_DEBUG === "true";
      if (exposeDetail && error?.message) {
        body.detail = error.message;
      }
      return NextResponse.json(body, { status: 502 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error("Contact email error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
