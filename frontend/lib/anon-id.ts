"use client";

const ANON_KEY = "snakesafe_anon_id";

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getAnonId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(ANON_KEY);
  if (existing) return existing;

  const id = generateId();
  window.localStorage.setItem(ANON_KEY, id);
  return id;
}
