"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AuthorityKind,
  AuthorityKindLabel,
  EventType,
  EventTypeLabel,
} from "@/types/events";

// === Action definitions ===
//
// A "writer action" is either:
//   - write_event: appends a VehicleEvent to an existing Vehicle (the
//     existing on-chain instruction `write_event`)
//   - create_vehicle: mints a brand-new vehicle passport for a new VIN
//     (the on-chain instruction `mint_vehicle_passport`, Manufacturer-only)

interface WriteEventAction {
  id: string;
  kind: "write_event";
  type: EventType;
  label: string;
  requiresMileage: boolean;
  requiresValidUntil: boolean;
  requiresValidFrom: boolean;
  validFromLabel?: string;
  validUntilLabel?: string;
  allowsBlockDriving?: boolean;
  allowsClearBlock?: boolean;
}

interface CreateVehicleAction {
  id: string;
  kind: "create_vehicle";
  label: string;
}

type Action = WriteEventAction | CreateVehicleAction;

interface RoleDef {
  key: AuthorityKind;
  label: string;
  actions: Action[];
}

const ROLES: RoleDef[] = [
  {
    key: AuthorityKind.AuthorizedServiceCenter,
    label: "Manufacturer / Service",
    actions: [
      { id: "create_vehicle", kind: "create_vehicle", label: "Create a new vehicle (mint passport)" },
      { id: "svc_service", kind: "write_event", type: EventType.Service, label: "Service / Maintenance", requiresMileage: true, requiresValidUntil: false, requiresValidFrom: false },
      { id: "svc_part", kind: "write_event", type: EventType.PartReplacement, label: "Part replacement / Modification", requiresMileage: true, requiresValidUntil: false, requiresValidFrom: false },
      { id: "svc_mileage", kind: "write_event", type: EventType.MileageReading, label: "Mileage reading", requiresMileage: true, requiresValidUntil: false, requiresValidFrom: false },
    ],
  },
  {
    key: AuthorityKind.Police,
    label: "Police",
    actions: [
      {
        id: "pol_control",
        kind: "write_event",
        type: EventType.PoliceControl,
        label: "Police control (mileage check)",
        requiresMileage: true,
        requiresValidUntil: false,
        requiresValidFrom: false,
        allowsBlockDriving: true,
      },
      { id: "pol_accident", kind: "write_event", type: EventType.Accident, label: "Accident report", requiresMileage: true, requiresValidUntil: false, requiresValidFrom: false },
      { id: "pol_theft", kind: "write_event", type: EventType.Theft, label: "Theft report", requiresMileage: false, requiresValidUntil: false, requiresValidFrom: false },
      { id: "pol_recovery", kind: "write_event", type: EventType.Recovery, label: "Recovery", requiresMileage: false, requiresValidUntil: false, requiresValidFrom: false },
    ],
  },
  {
    key: AuthorityKind.InspectionStation,
    label: "Inspection station",
    actions: [
      {
        id: "ins_inspection",
        kind: "write_event",
        type: EventType.Inspection,
        label: "Technical inspection",
        requiresMileage: true,
        requiresValidUntil: true,
        requiresValidFrom: false,
        validUntilLabel: "Next inspection due",
        allowsClearBlock: true,
      },
      { id: "ins_mileage", kind: "write_event", type: EventType.MileageReading, label: "Mileage reading", requiresMileage: true, requiresValidUntil: false, requiresValidFrom: false },
    ],
  },
  {
    key: AuthorityKind.Insurer,
    label: "Insurance company",
    actions: [
      { id: "ins_damage", kind: "write_event", type: EventType.Accident, label: "Damage report (accident, flood, theft, etc.)", requiresMileage: true, requiresValidUntil: false, requiresValidFrom: false },
      {
        id: "ins_policy",
        kind: "write_event",
        type: EventType.InsuranceClaim,
        label: "Insurance policy",
        requiresMileage: false,
        requiresValidUntil: true,
        requiresValidFrom: true,
        validFromLabel: "Coverage start",
        validUntilLabel: "Coverage expiry",
      },
    ],
  },
  {
    key: AuthorityKind.RegistrationOffice,
    label: "Government",
    actions: [
      { id: "gov_transfer", kind: "write_event", type: EventType.OwnershipTransfer, label: "Ownership transfer", requiresMileage: false, requiresValidUntil: false, requiresValidFrom: false },
      { id: "gov_scrap", kind: "write_event", type: EventType.Scrapping, label: "Vehicle scrapping", requiresMileage: false, requiresValidUntil: false, requiresValidFrom: false },
    ],
  },
];

// One uploaded photo or document. previewUrl is null for non-image files.
interface AttachedFile {
  file: File;
  previewUrl: string | null;
}

const MAX_ATTACHMENTS = 10;

// Body / fuel / transmission options for Create-vehicle.
const BODY_TYPES = ["Sedan", "Hatchback", "SUV", "Coupe", "Wagon/Estate", "Pickup", "Van", "Convertible", "Minivan", "Other"] as const;
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in hybrid", "Hydrogen", "LPG", "Other"] as const;
const TRANSMISSIONS = ["Manual", "Automatic", "Semi-automatic", "CVT", "DCT (dual-clutch)"] as const;

// === Page ===

export default function WriteEventPage() {
  const [vin, setVin] = useState("");
  const [roleKey, setRoleKey] = useState<AuthorityKind | "">("");
  const [actionId, setActionId] = useState<string>("");

  // Common write_event fields
  const [mileage, setMileage] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [description, setDescription] = useState("");

  // Multi-attachment uploader (photos + PDFs). The on-chain schema is unchanged:
  // each file uploads to Arweave separately, then a JSON manifest listing all
  // tx IDs is itself uploaded; that manifest's tx ID goes into doc_arweave_tx.
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  // Police-specific
  const [blockDriving, setBlockDriving] = useState(false);

  // Inspection-specific
  const [clearBlock, setClearBlock] = useState(false);

  // Create-vehicle fields
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [bodyType, setBodyType] = useState<typeof BODY_TYPES[number] | "">("");
  const [fuelType, setFuelType] = useState<typeof FUEL_TYPES[number] | "">("");
  const [transmission, setTransmission] = useState<typeof TRANSMISSIONS[number] | "">("");
  const [engineCc, setEngineCc] = useState("");
  const [powerHp, setPowerHp] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [seats, setSeats] = useState("5");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#ffffff");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [equipment, setEquipment] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const role = useMemo(() => ROLES.find((r) => r.key === roleKey), [roleKey]);
  const action = useMemo(
    () => role?.actions.find((a) => a.id === actionId),
    [role, actionId]
  );

  // Reset action on role change if no longer valid.
  useEffect(() => {
    if (actionId !== "" && !role?.actions.some((a) => a.id === actionId)) {
      setActionId("");
    }
  }, [roleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function onAttachmentsAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;
    setAttachments((prev) => {
      const room = MAX_ATTACHMENTS - prev.length;
      const accepted = incoming.slice(0, Math.max(0, room));
      const newOnes: AttachedFile[] = accepted.map((f) => ({
        file: f,
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      }));
      return [...prev, ...newOnes];
    });
    // Clear the input so the same file can be re-selected later.
    e.target.value = "";
  }
  function removeAttachment(index: number) {
    setAttachments((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }
  // Revoke any remaining object URLs on unmount.
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    };
  }, []);

  // --- Validation ---
  function isFormValid(): boolean {
    if (vin.trim().length !== 17) return false;
    if (!role || !action) return false;
    if (action.kind === "create_vehicle") {
      return !!(make && model && year && bodyType && fuelType && transmission && powerHp && weightKg && colorName && countryOfOrigin.length === 2);
    }
    if (action.requiresMileage && !mileage) return false;
    if (action.requiresValidFrom && !validFrom) return false;
    if (action.requiresValidUntil && !validUntil) return false;
    if (description.trim().length === 0) return false;
    return true;
  }

  // --- Submit ---
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid() || !role || !action) return;
    setSubmitting(true);
    try {
      const base = {
        vin: vin.trim().toUpperCase(),
        role: role.label,
        roleKind: role.key,
        timestamp: Math.floor(Date.now() / 1000),
      };
      let payload: Record<string, unknown>;
      if (action.kind === "create_vehicle") {
        payload = {
          ...base,
          instruction: "mint_vehicle_passport",
          make,
          model,
          year: Number(year),
          bodyType,
          fuelType,
          transmission,
          engineCc: engineCc ? Number(engineCc) : null,
          powerHp: Number(powerHp),
          weightKg: Number(weightKg),
          seats: Number(seats),
          colorName,
          colorHex,
          countryOfOrigin: countryOfOrigin.toUpperCase(),
          equipment: equipment.trim(),
          attachments: attachments.map((a) => ({
            name: a.file.name,
            sizeBytes: a.file.size,
            type: a.file.type,
          })),
        };
      } else {
        payload = {
          ...base,
          instruction: "write_event",
          eventType: action.label,
          eventTypeId: action.type,
          mileageKm: action.requiresMileage ? Number(mileage) : 0,
          validFromUnix: action.requiresValidFrom ? Math.floor(new Date(validFrom).getTime() / 1000) : 0,
          validUntilUnix: action.requiresValidUntil ? Math.floor(new Date(validUntil).getTime() / 1000) : 0,
          blockDriving: action.allowsBlockDriving ? blockDriving : false,
          clearDrivingBlock: action.allowsClearBlock ? clearBlock : false,
          description: description.trim(),
          attachments: attachments.map((a) => ({
            name: a.file.name,
            sizeBytes: a.file.size,
            type: a.file.type,
          })),
        };
      }
      console.log("[mock writer submission]", payload);
      alert(
        "Mock submission accepted (check console for the structured payload).\n\n" +
          "Real chain submission will be wired after the contract redeploy."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // === Styles ===
  const fieldStyle: React.CSSProperties = { display: "grid", gap: "0.35rem" };
  const inputStyle: React.CSSProperties = {
    padding: "0.55rem 0.7rem", fontSize: "1rem", border: "1px solid #d1d5db", borderRadius: 6, fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = { fontSize: "0.85rem", fontWeight: 600, color: "#374151" };
  const hintStyle: React.CSSProperties = { fontSize: "0.78rem", color: "#6b7280" };
  const sectionStyle: React.CSSProperties = {
    border: "1px solid #e5e7eb", borderRadius: 8, padding: "1rem 1.25rem", display: "grid", gap: "1rem",
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", margin: 0,
  };

  // Shared attachment uploader: multi-file input + thumbnail grid with × remove.
  const attachmentsBlock = (
    <>
      <input
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={onAttachmentsAdd}
        disabled={attachments.length >= MAX_ATTACHMENTS}
        style={inputStyle}
      />
      <div style={hintStyle}>
        {attachments.length}/{MAX_ATTACHMENTS} files. Picking again appends — it doesn&apos;t replace.
      </div>
      {attachments.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.6rem",
            marginTop: "0.5rem",
          }}
        >
          {attachments.map((att, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "0.4rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                background: "#fff",
              }}
            >
              {att.previewUrl ? (
                <img
                  src={att.previewUrl}
                  alt={att.file.name}
                  style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 4, background: "#f3f4f6" }}
                />
              ) : (
                <div
                  style={{
                    height: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f3f4f6",
                    borderRadius: 4,
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  document
                </div>
              )}
              <div
                title={att.file.name}
                style={{ fontSize: "0.7rem", color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {att.file.name}
              </div>
              <div style={{ fontSize: "0.65rem", color: "#6b7280" }}>
                {(att.file.size / 1024).toFixed(1)} KB
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                aria-label={`Remove ${att.file.name}`}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  background: "rgba(0,0,0,0.65)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  fontSize: "0.9rem",
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <section style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Submit event</h1>
      <p style={hintStyle}>
        Authorized institutions append events (or mint new vehicles) on the
        on-chain registry. In production, your wallet&apos;s registered
        authority kind determines which roles you can act as.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "1.2rem", marginTop: "1.5rem" }}>
        {/* VIN — always */}
        <label style={fieldStyle}>
          <span style={labelStyle}>VIN</span>
          <input
            required
            type="text"
            maxLength={17}
            placeholder="17-character VIN, e.g. WVWZZZ1KZ8M094375"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.04em" }}
          />
          <span style={hintStyle}>{vin.length}/17 — ISO 3779</span>
        </label>

        {/* Role */}
        <label style={fieldStyle}>
          <span style={labelStyle}>Role</span>
          <select
            required
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value === "" ? "" : (Number(e.target.value) as AuthorityKind))}
            style={inputStyle}
          >
            <option value="">— pick a role —</option>
            {ROLES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
          {role && (
            <span style={hintStyle}>
              On-chain authority kind: <code>{AuthorityKindLabel[role.key]}</code>
            </span>
          )}
        </label>

        {/* Action picker */}
        {role && (
          <label style={fieldStyle}>
            <span style={labelStyle}>Action</span>
            <select required value={actionId} onChange={(e) => setActionId(e.target.value)} style={inputStyle}>
              <option value="">— pick an action —</option>
              {role.actions.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            {action && action.kind === "write_event" && (
              <span style={hintStyle}>
                On-chain event:{" "}
                <code>{EventTypeLabel[action.type]} (id {action.type})</code>
              </span>
            )}
            {action && action.kind === "create_vehicle" && (
              <span style={hintStyle}>
                On-chain instruction: <code>mint_vehicle_passport</code> — Manufacturer authority required
              </span>
            )}
          </label>
        )}

        {/* === Create-vehicle form === */}
        {action?.kind === "create_vehicle" && (
          <>
            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Identity</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Make</span>
                  <input required maxLength={32} placeholder="e.g. Volkswagen" value={make} onChange={(e) => setMake(e.target.value)} style={inputStyle} />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Model</span>
                  <input required maxLength={32} placeholder="e.g. Golf" value={model} onChange={(e) => setModel(e.target.value)} style={inputStyle} />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Production year</span>
                  <input required type="number" min={1900} max={new Date().getFullYear() + 1} placeholder="2024" value={year} onChange={(e) => setYear(e.target.value)} style={inputStyle} />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Country of origin (ISO-2)</span>
                  <input required maxLength={2} placeholder="DE" value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: "monospace" }} />
                </label>
              </div>
            </div>

            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Powertrain</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Fuel type</span>
                  <select required value={fuelType} onChange={(e) => setFuelType(e.target.value as typeof FUEL_TYPES[number])} style={inputStyle}>
                    <option value="">—</option>
                    {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Transmission</span>
                  <select required value={transmission} onChange={(e) => setTransmission(e.target.value as typeof TRANSMISSIONS[number])} style={inputStyle}>
                    <option value="">—</option>
                    {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Engine displacement (cc) — optional for EV</span>
                  <input type="number" min={0} max={20000} placeholder="1968" value={engineCc} onChange={(e) => setEngineCc(e.target.value)} style={inputStyle} />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Power (hp)</span>
                  <input required type="number" min={0} max={2000} placeholder="150" value={powerHp} onChange={(e) => setPowerHp(e.target.value)} style={inputStyle} />
                </label>
              </div>
            </div>

            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Body</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Body type</span>
                  <select required value={bodyType} onChange={(e) => setBodyType(e.target.value as typeof BODY_TYPES[number])} style={inputStyle}>
                    <option value="">—</option>
                    {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Kerb weight (kg)</span>
                  <input required type="number" min={300} max={10000} placeholder="1450" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} style={inputStyle} />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Seats</span>
                  <input required type="number" min={1} max={50} value={seats} onChange={(e) => setSeats(e.target.value)} style={inputStyle} />
                </label>
              </div>
            </div>

            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Appearance</p>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", alignItems: "end" }}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Color name</span>
                  <input required maxLength={32} placeholder="e.g. Pearl White" value={colorName} onChange={(e) => setColorName(e.target.value)} style={inputStyle} />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Color</span>
                  <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} style={{ ...inputStyle, height: 48, padding: 4 }} />
                </label>
              </div>
            </div>

            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Equipment</p>
              <label style={fieldStyle}>
                <span style={labelStyle}>Equipment list (free text)</span>
                <textarea
                  rows={4}
                  placeholder="e.g. LED headlights, panoramic sunroof, leather seats, navigation, parking sensors front+rear, …"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <span style={hintStyle}>
                  Hashed and stored on-chain (<code>equipment_hash</code>); full text uploaded to Arweave.
                </span>
              </label>
            </div>

            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Photos (optional)</p>
              {attachmentsBlock}
            </div>
          </>
        )}

        {/* === write_event form === */}
        {action?.kind === "write_event" && (
          <>
            {action.requiresMileage && (
              <label style={fieldStyle}>
                <span style={labelStyle}>Mileage (km)</span>
                <input required type="number" min={0} max={9_999_999} placeholder="e.g. 134500" value={mileage} onChange={(e) => setMileage(e.target.value)} style={inputStyle} />
                <span style={hintStyle}>On-chain anti-rollback: must be ≥ vehicle&apos;s last recorded mileage.</span>
              </label>
            )}

            {(action.requiresValidFrom || action.requiresValidUntil) && (
              <div style={{ display: "grid", gridTemplateColumns: action.requiresValidFrom ? "1fr 1fr" : "1fr", gap: "1rem" }}>
                {action.requiresValidFrom && (
                  <label style={fieldStyle}>
                    <span style={labelStyle}>{action.validFromLabel ?? "Valid from"}</span>
                    <input required type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} style={inputStyle} />
                  </label>
                )}
                {action.requiresValidUntil && (
                  <label style={fieldStyle}>
                    <span style={labelStyle}>{action.validUntilLabel ?? "Valid until"}</span>
                    <input required type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={inputStyle} />
                  </label>
                )}
              </div>
            )}

            {action.allowsBlockDriving && (
              <div style={{ ...sectionStyle, background: "#fef3c7", borderColor: "#fcd34d" }}>
                <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <input type="checkbox" checked={blockDriving} onChange={(e) => setBlockDriving(e.target.checked)} />
                  <span style={labelStyle}>Block driving (vehicle is unsafe / requires repair before use)</span>
                </label>
                {blockDriving && (
                  <span style={hintStyle}>
                    Vehicle&apos;s on-chain status flips to <strong>driving blocked</strong> immediately and stays
                    blocked indefinitely. <strong>Only an inspection station</strong> can clear the block (after a
                    passing technical inspection). No automatic time-based expiry.
                  </span>
                )}
              </div>
            )}

            {action.allowsClearBlock && (
              <div style={{ ...sectionStyle, background: "#d1fae5", borderColor: "#6ee7b7" }}>
                <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <input type="checkbox" checked={clearBlock} onChange={(e) => setClearBlock(e.target.checked)} />
                  <span style={labelStyle}>Clear active driving block (inspection passed, vehicle is roadworthy)</span>
                </label>
                <span style={hintStyle}>
                  Sets <code>vehicle.driving_blocked_since = 0</code>. Has no effect if no block is active.
                </span>
              </div>
            )}

            <label style={fieldStyle}>
              <span style={labelStyle}>Description</span>
              <textarea
                required
                rows={4}
                placeholder='e.g. "Damaged hood and right front lamp; collision at low speed at an intersection."'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <span style={hintStyle}>
                Description + dates + photo are uploaded to Arweave; the
                hash (<code>payload_hash</code>) is anchored on-chain.
              </span>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Photos / documents (optional)</span>
              {attachmentsBlock}
            </label>
          </>
        )}

        <button
          type="submit"
          disabled={!isFormValid() || submitting}
          style={{
            padding: "0.7rem 1.4rem", fontSize: "1rem",
            background: !isFormValid() || submitting ? "#9ca3af" : "#111827",
            color: "white", border: "none", borderRadius: 6,
            cursor: !isFormValid() || submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting…" : action?.kind === "create_vehicle" ? "Create vehicle" : "Submit event"}
        </button>

        <div style={{ ...hintStyle, marginTop: "0.5rem" }}>
          <strong>Mock mode</strong> — submission is logged to the browser
          console, not sent to chain. Real submission wires up after contract
          redeploy with: <code>PoliceControl</code>, <code>valid_from</code>/<code>valid_until</code> on
          <code> VehicleEvent</code>, <code>driving_blocked_since</code> on <code>Vehicle</code>
          (cleared only by inspection station), and the extended <code>mint_vehicle_passport</code> args.
        </div>
      </form>
    </section>
  );
}
