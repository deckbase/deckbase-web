import { Resend } from "resend";
import { NextResponse } from "next/server";

// Org Resend: sender must be @codeyourreality.com (verified); see .env.example.
const DEFAULT_FROM = "forms@codeyourreality.com";

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "hawk20605@gmail.com";
const rawFrom = process.env.FROM_EMAIL || DEFAULT_FROM;
const FROM_EMAIL = rawFrom.includes("<") ? rawFrom : `Deckbase <${rawFrom}>`;

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
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL.trim(),
      to: CONTACT_EMAIL,
      replyTo: email,
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
      const body = { error: "Failed to send message" };
      if (process.env.NODE_ENV === "development" && error?.message) {
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
