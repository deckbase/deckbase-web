"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { InfinitySpin } from "react-loader-spinner";
import { MdCancel } from "react-icons/md";

const AREAS = [
  { key: "loaUsage", label: "App Usage Help" },
  { key: "developerSupport", label: "Feature Request" },
  { key: "devBuildRequest", label: "Bug Report" },
  { key: "partnership", label: "Premium & Billing" },
  { key: "others", label: "Others" },
];

const inputClass =
  "w-full h-11 px-4 rounded-xl text-white text-sm placeholder-white/25 outline-none transition-all duration-200 " +
  "bg-white/[0.04] border border-white/[0.08] " +
  "focus:border-[#2383e2]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#2383e2]/30";

const labelClass = "block text-[11px] font-medium uppercase tracking-widest text-white/35 mb-2";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const ContactForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showTray, setShowTray] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      comment: "",
      areaOfInterest: {
        loaUsage: false,
        developerSupport: false,
        devBuildRequest: false,
        partnership: false,
        others: false,
      },
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Name is required"),
      email: Yup.string().email("Invalid email address").required("Email is required"),
      phone: Yup.string().required("Phone number is required"),
      comment: Yup.string().max(500, "Comment must be at most 500 characters"),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      setSubmitError(null);
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const base =
            typeof payload.error === "string"
              ? payload.error
              : "Something went wrong. Please try again or email hello@deckbase.co.";
          const code =
            typeof payload.code === "string" ? ` (${payload.code})` : "";
          const detail =
            typeof payload.detail === "string" ? ` — ${payload.detail}` : "";
          setSubmitError(`${base}${code}${detail}`.trim());
          return;
        }

        setShowTray(true);
        formik.resetForm();
      } catch (error) {
        console.error("Error submitting contact form:", error);
        setSubmitError("Something went wrong. Please try again or email hello@deckbase.co.");
      } finally {
        setIsLoading(false);
      }
    },
  });

  const hasErrors = Object.keys(formik.errors).length > 0;

  useEffect(() => {
    if (!hasErrors) return;
    const timer = setTimeout(() => formik.setErrors({}), 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasErrors]);

  return (
    <>
      <style>{`
        /* Phone input — dark theme */
        .react-international-phone-input-container {
          display: flex !important;
          width: 100% !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background: rgba(255,255,255,0.04) !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .react-international-phone-input-container:focus-within {
          border-color: rgba(35,131,226,0.5) !important;
          box-shadow: 0 0 0 1px rgba(35,131,226,0.3) !important;
          background: rgba(255,255,255,0.06) !important;
        }
        .react-international-phone-country-selector-button {
          background: transparent !important;
          border: none !important;
          border-right: 1px solid rgba(255,255,255,0.08) !important;
          padding: 0 10px !important;
          height: 44px !important;
        }
        .react-international-phone-country-selector-button:hover {
          background: rgba(255,255,255,0.05) !important;
        }
        .react-international-phone-country-selector-button__button-content {
          color: white !important;
        }
        .react-international-phone-input {
          background: transparent !important;
          border: none !important;
          color: white !important;
          font-size: 14px !important;
          height: 44px !important;
          flex: 1 !important;
          padding: 0 16px !important;
        }
        .react-international-phone-input::placeholder {
          color: rgba(255,255,255,0.25) !important;
        }
        .react-international-phone-country-selector-dropdown {
          background: #111118 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 10px !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.6) !important;
        }
        .react-international-phone-country-selector-dropdown__list-item:hover {
          background: rgba(255,255,255,0.05) !important;
        }
        .react-international-phone-country-selector-dropdown__list-item-country-name {
          color: rgba(255,255,255,0.85) !important;
        }
        .react-international-phone-country-selector-dropdown__list-item-dial-code {
          color: rgba(255,255,255,0.4) !important;
        }
        .react-international-phone-flag-emoji {
          font-size: 16px;
        }
        /* Custom checkbox */
        .area-checkbox {
          appearance: none;
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border: 1.5px solid rgba(255,255,255,0.2);
          border-radius: 5px;
          background: transparent;
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
          transition: all 0.15s;
        }
        .area-checkbox:checked {
          background: #2383e2;
          border-color: #2383e2;
        }
        .area-checkbox:checked::after {
          content: '';
          position: absolute;
          left: 4px;
          top: 1px;
          width: 5px;
          height: 9px;
          border: 2px solid white;
          border-top: none;
          border-left: none;
          transform: rotate(45deg);
        }
        .area-checkbox:hover:not(:checked) {
          border-color: rgba(255,255,255,0.4);
        }
      `}</style>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <InfinitySpin visible width="160" color="#2383e2" ariaLabel="loading" />
        </motion.div>
      )}

      {/* Background */}
      <div className="fixed inset-0 -z-10" style={{ background: "#07070f" }}>
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-15%",
            width: "60vw",
            height: "60vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(35,131,226,0.1) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "0%",
            right: "-10%",
            width: "45vw",
            height: "45vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)",
            filter: "blur(60px)",
          }}
        />
        {/* Grain */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Page layout */}
      <div className="min-h-screen w-full flex flex-col lg:flex-row">
        {/* ── Left panel ── */}
        <div className="hidden lg:flex flex-col justify-between w-[42%] min-h-screen pt-36 pb-16 pl-16 pr-8 border-r border-white/[0.06]">
          <div>
            <motion.p {...fadeUp(0.15)} className="text-[11px] uppercase tracking-[0.2em] text-white/30 mb-10">
              Deckbase / Contact
            </motion.p>

            <motion.h1
              {...fadeUp(0.25)}
              style={{ fontFamily: '"Tiempos Fine", serif' }}
              className="text-[clamp(3.5rem,5vw,5.5rem)] text-white leading-[1.05] mb-8"
            >
              Let&apos;s<br />
              <em style={{ fontStyle: "italic", color: "rgba(255,255,255,0.5)" }}>
                talk.
              </em>
            </motion.h1>

            <motion.p {...fadeUp(0.4)} className="text-white/40 text-[15px] leading-relaxed max-w-[280px]">
              Tell us what&apos;s on your mind — support, feature ideas, partnerships, or anything else.
            </motion.p>
          </div>

          {/* Decorative floating cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="relative h-36 mb-8"
          >
            {[
              { rotate: -8, x: 0, y: 0, delay: 0.6 },
              { rotate: 3, x: 40, y: -20, delay: 0.75 },
              { rotate: 12, x: 80, y: -8, delay: 0.9 },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: card.delay }}
                style={{
                  position: "absolute",
                  left: card.x,
                  top: card.y,
                  rotate: `${card.rotate}deg`,
                  width: 80,
                  height: 52,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(4px)",
                }}
              />
            ))}
          </motion.div>

          {/* Info rows */}
          <motion.div {...fadeUp(0.6)} className="space-y-0">
            <div className="border-t border-white/[0.07] py-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/25 mb-1.5">Email</p>
              <a
                href="mailto:hello@deckbase.co"
                className="text-white/55 hover:text-white text-sm transition-colors duration-200"
              >
                hello@deckbase.co
              </a>
            </div>
            <div className="border-t border-white/[0.07] py-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/25 mb-1.5">Response time</p>
              <p className="text-white/55 text-sm">Within 24 hours</p>
            </div>
          </motion.div>
        </div>

        {/* ── Right panel — form ── */}
        <div className="flex-1 flex flex-col justify-center pt-32 lg:pt-20 pb-16 px-6 sm:px-10 lg:px-16">
          {/* Mobile heading */}
          <div className="lg:hidden mb-10 text-center">
            <motion.h1
              {...fadeUp(0.1)}
              style={{ fontFamily: '"Tiempos Fine", serif' }}
              className="text-5xl text-white"
            >
              Let&apos;s <em style={{ fontStyle: "italic", color: "rgba(255,255,255,0.45)" }}>talk.</em>
            </motion.h1>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={formik.handleSubmit}
            className="w-full max-w-[500px] mx-auto lg:mx-0 space-y-5"
          >
            {/* Name */}
            <div>
              <label htmlFor="name" className={labelClass}>Name</label>
              <input
                type="text"
                id="name"
                name="name"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.name}
                className={inputClass}
                placeholder="Your full name"
                data-lpignore="true"
                autoComplete="off"
              />
              {formik.touched.name && formik.errors.name && (
                <p className="text-red-400/80 text-xs mt-1.5">{formik.errors.name}</p>
              )}
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className={labelClass}>Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.email}
                  className={inputClass}
                  placeholder="you@email.com"
                  data-lpignore="true"
                  autoComplete="off"
                />
                {formik.touched.email && formik.errors.email && (
                  <p className="text-red-400/80 text-xs mt-1.5">{formik.errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>Phone</label>
                <PhoneInput
                  placeholder="Phone number"
                  value={formik.values.phone}
                  onChange={(phone) => formik.setFieldValue("phone", phone)}
                  onBlur={() => formik.setFieldTouched("phone", true)}
                  defaultCountry="us"
                  name="phone"
                  international
                />
                {formik.touched.phone && formik.errors.phone && (
                  <p className="text-red-400/80 text-xs mt-1.5">{formik.errors.phone}</p>
                )}
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="comment" className={labelClass}>Message</label>
              <textarea
                name="comment"
                id="comment"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.comment}
                rows={4}
                className={`${inputClass} h-auto py-3 resize-none`}
                placeholder="Describe what you need help with…"
              />
              {formik.touched.comment && formik.errors.comment && (
                <p className="text-red-400/80 text-xs mt-1.5">{formik.errors.comment}</p>
              )}
            </div>

            {/* Area of Concern */}
            <div className="pt-1">
              <p className={labelClass}>Area of concern</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1">
                {AREAS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      className="area-checkbox"
                      name={`areaOfInterest.${key}`}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      checked={formik.values.areaOfInterest?.[key] || false}
                    />
                    <span className="text-sm text-white/50 group-hover:text-white/75 transition-colors duration-150 select-none">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 space-y-2">
              {submitError && (
                <p className="text-red-400/90 text-sm text-center" role="alert">
                  {submitError}
                </p>
              )}
              <button
                type="submit"
                className="w-full h-11 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #2383e2 0%, #1a6bc9 100%)",
                  boxShadow: "0 1px 24px rgba(35,131,226,0.25)",
                }}
              >
                Send message
              </button>
            </div>

            {/* Mobile email link */}
            <p className="lg:hidden text-center text-white/25 text-xs pt-1">
              Or email us at{" "}
              <a href="mailto:hello@deckbase.co" className="text-white/45 hover:text-white/70 transition-colors underline underline-offset-2">
                hello@deckbase.co
              </a>
            </p>
          </motion.form>
        </div>
      </div>

      {/* Success modal */}
      {showTray && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onClick={() => setShowTray(false)}
          className="fixed inset-0 z-[500000] flex items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer"
        >
          <MdCancel
            className="absolute left-5 top-10 lg:top-14 lg:left-14 text-2xl text-white/50 hover:text-white transition-colors"
            onClick={() => setShowTray(false)}
          />
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.05 }}
            onClick={(e) => e.stopPropagation()}
            className="text-center rounded-2xl p-10 lg:p-16 flex flex-col items-center gap-5 max-w-sm mx-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.15 }}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(35,131,226,0.15)", border: "1px solid rgba(35,131,226,0.3)" }}
            >
              <motion.svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2383e2"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  d="M20 6L9 17l-5-5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, delay: 0.3 }}
                />
              </motion.svg>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={{ fontFamily: '"Tiempos Fine", serif' }}
              className="text-2xl text-white"
            >
              Message sent.
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-white/45 text-sm leading-relaxed"
            >
              We&apos;ll get back to you within 24 hours.
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              onClick={() => setShowTray(false)}
              className="mt-2 px-6 py-2 rounded-full text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-200"
            >
              Close
            </motion.button>
          </motion.div>
        </motion.section>
      )}
    </>
  );
};

const Contact = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex w-full items-center justify-center bg-[#07070f]">
        <InfinitySpin visible width="160" color="#2383e2" ariaLabel="loading" />
      </div>
    }
  >
    <ContactForm />
  </Suspense>
);

export default Contact;
