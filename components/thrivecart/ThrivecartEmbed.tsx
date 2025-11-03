"use client";
import { useEffect } from "react";

export default function ThrivecartEmbed() {
  useEffect(() => {
    // Dynamically inject Thrivecart script on client only
    const script = document.createElement("script");
    script.src = "https://tinder.thrivecart.com/embed/v1/thrivecart.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
}
