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
}

export const EventTypeLabel: Record<EventType, string> = {
  [EventType.Inspection]: "Technical inspection",
  [EventType.MileageReading]: "Mileage reading",
  [EventType.Accident]: "Accident",
  [EventType.Service]: "Service",
  [EventType.PartReplacement]: "Part replacement",
  [EventType.InsuranceClaim]: "Insurance claim",
  [EventType.OwnershipTransfer]: "Ownership transfer",
  [EventType.Theft]: "Theft",
  [EventType.Recovery]: "Recovery",
  [EventType.Import]: "Import",
  [EventType.Recall]: "Manufacturer recall",
  [EventType.Scrapping]: "Scrapping",
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
}
