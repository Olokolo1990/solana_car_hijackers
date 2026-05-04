// Hand-mirrored from anchor_program/programs/vehicle_passport/src/state.rs.
// Once `anchor build` runs, replace this with the generated IDL types from
// `target/types/vehicle_passport.ts`.

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

export enum AuthorityKind {
  Manufacturer = 0,
  RegistrationOffice = 1,
  Police = 2,
  InspectionStation = 3,
  Insurer = 4,
  Customs = 5,
  AuthorizedServiceCenter = 6,
}

export interface RawVehicleEvent {
  vehicle: string;
  authority: string;
  eventType: number;
  timestamp: number;
  mileageKm: number;
  docArweaveTx: Uint8Array;
  payloadHash: Uint8Array;
  sequence: number;
}
