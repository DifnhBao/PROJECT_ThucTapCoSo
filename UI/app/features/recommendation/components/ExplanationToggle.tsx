"use client";
import React from "react";
export default function ExplanationToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className="dev-toggle" aria-pressed={checked} onClick={() => onChange(!checked)}>Vì sao có bài này?</button>;
}
