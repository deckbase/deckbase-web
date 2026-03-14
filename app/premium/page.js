"use client";

import "../globals.css";
import { useEffect } from "react";

import Testimonial from "@/components/Testimonial";
import FaqsWhite from "@/components/FaqsWhite";
import ReadyToStart from "@/components/Ready";
import PricingPlans from "@/components/PricingPolicy";

export default function Premium() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <PricingPlans />
      <ReadyToStart />
      <Testimonial />
      <FaqsWhite />
    </>
  );
}
