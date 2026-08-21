import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { MapPinIcon } from "@heroicons/react/24/outline";
import { matchGovernorate } from "../lib/governorates";

// Default Leaflet marker assets break under bundlers — point them at the
// imported URLs so the pin renders.
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface PickedAddress {
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

interface Props {
  onSelect: (a: PickedAddress) => void;
}

const DEFAULT_CENTER: [number, number] = [30.0444, 31.2357]; // Cairo

// Free OpenStreetMap geocoding. Fine for low volume; for production scale
// swap in a paid geocoder (usage policy: <=1 req/sec, no heavy bulk use).
const reverseGeocode = async (
  lat: number,
  lng: number,
  lang: string
): Promise<PickedAddress> => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${lang}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.json();
  const a = data.address || {};
  const city =
    a.city || a.town || a.village || a.suburb || a.county || "";
  // The geocoder answers with its own name for a governorate — "Aj Jiza",
  // "Western", "بنى سويف" — and the address form stores one canonical
  // spelling that the shipping zones are matched against. Unrecognised
  // names are passed through rather than blanked, so nothing is lost.
  const rawState = a.state || a.governorate || a.region || "";
  const state = matchGovernorate(rawState) ?? rawState;
  const address =
    data.display_name ||
    [a.road, a.neighbourhood, a.suburb].filter(Boolean).join(", ");
  return { address, city, state, lat, lng };
};

const LocationMarker: React.FC<{
  position: [number, number];
  onMove: (lat: number, lng: number) => void;
}> = ({ position, onMove }) => {
  const markerRef = useRef<L.Marker>(null);
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return (
    <Marker
      position={position}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (m) {
            const ll = m.getLatLng();
            onMove(ll.lat, ll.lng);
          }
        },
      }}
    />
  );
};

const Recenter: React.FC<{ position: [number, number] }> = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position);
  }, [map, position]);
  return null;
};

const AddressMapPicker: React.FC<Props> = ({ onSelect }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "en";
  const [position, setPosition] = useState<[number, number]>(DEFAULT_CENTER);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const applyPoint = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setBusy(true);
    try {
      onSelect(await reverseGeocode(lat, lng, lang));
    } catch {
      // keep the marker; just couldn't resolve the address text
    } finally {
      setBusy(false);
    }
  };

  /**
   * Drop the pin where the customer actually is.
   *
   * The browser asks permission the first time and remembers the answer, so a
   * refusal has to be said out loud — otherwise the button looks broken. Every
   * failure here is recoverable: the map is still there to tap.
   */
  const [locating, setLocating] = useState(false);
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("This browser cannot share your location. Tap the map instead."));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await applyPoint(coords.latitude, coords.longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? t("Location permission was refused. Allow it in your browser, or tap the map.")
            : err.code === err.TIMEOUT
              ? t("Finding your location took too long. Try again, or tap the map.")
              : t("Your location could not be determined. Tap the map instead."),
        );
      },
      // A phone's first GPS fix is not instant, and a stale fix from an hour
      // ago is worse than none when the point decides where a parcel goes.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        q
      )}&countrycodes=eg&limit=1&accept-language=${lang}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        await applyPoint(parseFloat(data[0].lat), parseFloat(data[0].lon));
      }
    } catch {
      // ignore — user can drop the pin manually
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder={t("Search for your area, street, or landmark")}
          className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={busy}
          className="bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? t("Searching…") : t("Search")}
        </button>
      </div>
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating || busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)] hover:text-white disabled:opacity-50"
      >
        <MapPinIcon className="h-4 w-4" />
        {locating ? t("Finding you…") : t("Use my current location")}
      </button>
      <p className="text-xs text-[var(--text-muted)]">
        {t("Tap the map or drag the pin to set your exact delivery location.")}
      </p>
      <div className="h-64 w-full overflow-hidden rounded-lg border border-[var(--border)]">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter position={position} />
          <LocationMarker position={position} onMove={applyPoint} />
        </MapContainer>
      </div>
    </div>
  );
};

export default AddressMapPicker;
