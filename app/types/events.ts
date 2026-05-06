// Mirror of the on-chain enums in programs/vehicle_history/src/state/.
// After `anchor build`, replace this with the generated IDL types.

export enum EventType {
  Inspection = 0,
  MileageReading = 1,
  Accident = 2,
  Service = 3,
  PartReplacement = 4,
  InsuranceClaim = 5,
  OwnershipTransfer = 6,
  Theft = 7,
  Recovery = 8,
  Import = 9,
  Recall = 10,
  Scrapping = 11,
  PoliceControl = 12,
}

export const EventTypeLabel: Record<EventType, string> = {
  [EventType.Inspection]: "Technical inspection",
  [EventType.MileageReading]: "Mileage reading",
  [EventType.Accident]: "Accident",
  [EventType.Service]: "Service",
  [EventType.PartReplacement]: "Part replacement",
  [EventType.InsuranceClaim]: "Insurance policy",
  [EventType.OwnershipTransfer]: "Ownership transfer",
  [EventType.Theft]: "Theft",
  [EventType.Recovery]: "Recovery",
  [EventType.Import]: "Import",
  [EventType.Recall]: "Manufacturer recall",
  [EventType.Scrapping]: "Scrapping",
  [EventType.PoliceControl]: "Police control",
};

export enum AuthorityKind {
  Manufacturer = 0,
  RegistrationOffice = 1,
  Police = 2,
  InspectionStation = 3,
  Insurer = 4,
  Customs = 5,
  AuthorizedServiceCenter = 6,
}

export const AuthorityKindLabel: Record<AuthorityKind, string> = {
  [AuthorityKind.Manufacturer]: "Manufacturer",
  [AuthorityKind.RegistrationOffice]: "Registration office",
  [AuthorityKind.Police]: "Police",
  [AuthorityKind.InspectionStation]: "Inspection station",
  [AuthorityKind.Insurer]: "Insurer",
  [AuthorityKind.Customs]: "Customs",
  [AuthorityKind.AuthorizedServiceCenter]: "Authorized service center",
};

export interface VehicleSummary {
  vinHash: string;
  make: string;
  model: string;
  year: number;
  colorCode: number;
  lastMileage: number;
  eventCount: number;
  createdAt: number;
  // === Registration cache (added in v2 redeploy) ===
  /** "" if vehicle is not yet officially registered. */
  currentLicensePlate: string;
  /** hex-encoded; "00..00" if no owner set. */
  currentOwnerHash: string;
  /** 0 if not yet registered. */
  registeredAtOfficial: number;
  /** Decoded ISO-2 string ("PL", "DE", …) or "" if not registered. */
  registrationCountry: string;
  /** 0 if driving is permitted; otherwise unix timestamp when Police set the block. */
  drivingBlockedSince: number;
  // === Manufacturer specs (added in v4 redeploy 2026-05-06) ===
  fuelType: number;
  transmission: number;
  bodyType: number;
  engineCc: number;
  powerHp: number;
  weightKg: number;
  seats: number;
  colorName: string;
  /** ISO-2 string or "" if unset. */
  countryOfOrigin: string;
  equipment: string;
}

export const FuelTypeLabel: Record<number, string> = {
  0: "Petrol",
  1: "Diesel",
  2: "Electric",
  3: "Hybrid",
  4: "Plug-in hybrid",
  5: "Hydrogen",
  6: "LPG",
  7: "Other",
};

export const TransmissionLabel: Record<number, string> = {
  0: "Manual",
  1: "Automatic",
  2: "Semi-automatic",
  3: "CVT",
  4: "DCT (dual-clutch)",
};

export const BodyTypeLabel: Record<number, string> = {
  0: "Sedan",
  1: "Hatchback",
  2: "SUV",
  3: "Coupe",
  4: "Wagon/Estate",
  5: "Pickup",
  6: "Van",
  7: "Convertible",
  8: "Minivan",
  9: "Other",
};

export interface AuthoritySummary {
  signer: string;
  kind: AuthorityKind;
  countryCode: string;
  name: string;
  active: boolean;
  eventsWritten: number;
  registeredAt: number;
}

export interface GlobalConfigSummary {
  admin: string;
  vehicleCount: number;
  authorityCount: number;
}

export interface VehicleEvent {
  vehicle: string;
  authority: string;
  authorityKind: AuthorityKind;
  authorityName: string;
  eventType: EventType;
  timestamp: number;
  mileageKm: number;
  docArweaveTx: string;
  payloadHash: string;
  sequence: number;
  /** 0 if not applicable (e.g. insurance policy start). */
  validFrom: number;
  /** 0 if not applicable (e.g. insurance expiry, next inspection due). */
  validUntil: number;
  /** Free-text comment from the writing authority. Empty string if none. Added in v3 redeploy 2026-05-06. */
  description: string;
}
