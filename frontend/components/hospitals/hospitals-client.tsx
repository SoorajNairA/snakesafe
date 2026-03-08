"use client";

import { useState } from "react";
import {
  MapPin,
  Phone,
  ExternalLink,
  Loader2,
  Navigation,
  Search,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";

type Hospital = {
  id: string;
  name: string;
  distance: string;
  address: string;
  phone: string;
  antivenom: boolean;
  lat: number;
  lng: number;
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchNearbyHospitals(
  userLat: number,
  userLng: number,
  radiusM = 15000
): Promise<Hospital[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radiusM},${userLat},${userLng});
      way["amenity"="hospital"](around:${radiusM},${userLat},${userLng});
    );
    out center;
  `;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });
  if (!res.ok) throw new Error("Overpass API error");
  const data = await res.json();

  return (data.elements as Record<string, unknown>[])
    .map((el, i) => {
      const tags = (el.tags ?? {}) as Record<string, string>;
      const lat = typeof el.lat === "number" ? el.lat : (el.center as { lat: number })?.lat;
      const lng = typeof el.lon === "number" ? el.lon : (el.center as { lon: number })?.lon;
      if (!lat || !lng) return null;

      const distKm = haversineKm(userLat, userLng, lat, lng);
      const name = tags.name || tags["name:en"] || "Unnamed Hospital";
      const parts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"], tags["addr:state"]]
        .filter(Boolean)
        .join(", ");

      return {
        id: String(el.id ?? i),
        name,
        distance: distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
        address: parts || tags["addr:full"] || "Address not available",
        phone: tags.phone || tags["contact:phone"] || "",
        antivenom: /emergency/i.test(tags.healthcare_speciality ?? "") || tags.emergency === "yes",
        lat,
        lng,
        _distKm: distKm,
      };
    })
    .filter((h): h is Hospital & { _distKm: number } => h !== null)
    .sort((a, b) => a._distKm - b._distKm)
    .slice(0, 10)
    .map(({ _distKm: _, ...h }) => h);
}

export function HospitalsClient() {
  const [detecting, setDetecting] = useState(false);
  const [located, setLocated] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const detectAndSearch = async () => {
    setDetecting(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setDetecting(false);
        setLocated(true);
        await loadHospitals(coords.lat, coords.lng);
      },
      () => {
        setDetecting(false);
        setError("Location access denied. Try searching manually.");
      }
    );
  };

  const loadHospitals = async (lat: number, lng: number) => {
    setSearching(true);
    setError("");
    try {
      const results = await fetchNearbyHospitals(lat, lng);
      if (results.length === 0) setError("No hospitals found within 15 km. Try a larger area.");
      setHospitals(results);
    } catch {
      setError("Could not fetch hospitals. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleManualSearch = async () => {
    if (!manualQuery.trim()) return;
    setSearching(true);
    setLocated(true);
    setError("");
    try {
      // Geocode the manual query via Nominatim (OpenStreetMap)
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualQuery)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const geoData = await geo.json();
      if (!geoData.length) {
        setError("Location not found. Try a more specific query.");
        setSearching(false);
        return;
      }
      const { lat, lon } = geoData[0];
      const coords = { lat: parseFloat(lat), lng: parseFloat(lon) };
      setUserCoords(coords);
      await loadHospitals(coords.lat, coords.lng);
    } catch {
      setError("Geocoding failed. Check your connection and try again.");
      setSearching(false);
    }
  };

  const getDirectionsUrl = (h: Hospital) =>
    `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <FadeIn className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-6 h-6 text-accent" />
          <h1 className="text-3xl font-bold text-foreground">Hospital Finder</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Locate nearby hospitals with antivenom treatment, sorted by distance.
        </p>
      </FadeIn>

      {/* Location controls */}
      <AnimatePresence mode="wait">
        {!located && (
          <motion.div
            key="locate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-border bg-card p-6 flex flex-col items-center gap-4 text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center"
            >
              <Navigation className="w-7 h-7 text-accent" />
            </motion.div>
          <div>
            <p className="font-semibold text-foreground mb-1">Find hospitals near you</p>
            <p className="text-muted-foreground text-sm">Share your location or search manually to find the closest facilities.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
            <Button
              onClick={detectAndSearch}
              disabled={detecting}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-all hover:shadow-[0_0_20px_oklch(0.60_0.18_155/0.25)]"
            >
              {detecting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Detecting...</>
              ) : (
                <><Navigation className="w-4 h-4 mr-2" /> Use My Location</>
              )}
            </Button>
          </div>

          {/* Manual fallback */}
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-1 mb-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-2">or search manually</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="City, zip code, or address"
                className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow"
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSearch}
                disabled={searching || !manualQuery.trim()}
                className="border-border text-foreground hover:bg-secondary"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && !searching && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 mt-2"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Loading */}
      <AnimatePresence>
        {searching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-3 py-12"
          >
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
            <p className="text-muted-foreground">Finding nearby hospitals...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {!searching && hospitals.length > 0 && (
        <div className="space-y-3">
          <FadeIn>
            <p className="text-sm text-muted-foreground mb-4">
              Found <span className="text-foreground font-medium">{hospitals.length}</span> hospitals within 15 km
            </p>
          </FadeIn>
          <StaggerContainer className="space-y-3">
          {hospitals.map((h) => (
            <StaggerItem key={h.id}>
            <div
              className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-border/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{h.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{h.address}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-accent shrink-0">{h.distance}</span>
              </div>

              {/* Antivenom badge */}
              {h.antivenom && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Antivenom Available
                </span>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <a href={`tel:${h.phone}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border text-foreground hover:bg-secondary"
                  >
                    <Phone className="w-4 h-4 mr-1.5" />
                    Call
                  </Button>
                </a>
                <a
                  href={getDirectionsUrl(h)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button
                    size="sm"
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 transition-all"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Directions
                  </Button>
                </a>
              </div>
            </div>
            </StaggerItem>
          ))}
          </StaggerContainer>

          <Button
            variant="outline"
            className="w-full border-border text-foreground hover:bg-secondary mt-2"
            onClick={() => { setLocated(false); setHospitals([]); setError(""); setUserCoords(null); }}
          >
            Search Again
          </Button>
        </div>
      )}
    </div>
  );
}
