// Types for the Accurate (accuratess.com) shipping carrier admin UI.
// Mirrors backend/models/accurateSettings.model.js.
export interface AccurateMapping {
  governorate: string;
  zoneId: number;
  subzoneId: number;
}

export interface AccurateSettings {
  enabled: boolean;
  serviceId?: number | null;
  senderName?: string;
  senderPhone?: string;
  senderMobile?: string;
  senderAddress?: string;
  senderZoneId?: number | null;
  senderSubzoneId?: number | null;
  typeCode: "FDP" | "PDP" | "PTP" | "RTS" | "CLC";
  priceTypeCode: "EXCLD" | "INCLD";
  defaultWeight: number;
  mappings: AccurateMapping[];
}

// Shape returned by Accurate's *Dropdown queries (zones, services).
export interface DropDownEntry {
  id: number;
  code?: string | null;
  name?: string | null;
}

export const SHIPMENT_TYPE_CODES: AccurateSettings["typeCode"][] = [
  "FDP",
  "PDP",
  "PTP",
  "RTS",
  "CLC",
];

export const PRICE_TYPE_CODES: AccurateSettings["priceTypeCode"][] = [
  "EXCLD",
  "INCLD",
];
