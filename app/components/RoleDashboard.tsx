"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import {
  AuthorityKind,
  AuthorityKindLabel,
  type AuthoritySummary,
} from "@/types/events";
import { fetchAuthority } from "@/lib/solana";

interface QuickAction {
  label: string;
  description: string;
  /** Pre-fills role + action on /write via query params. */
  href: string;
}

// Per-AuthorityKind action sets, mirroring the matrix encoded in /write.
// Each entry's `href` deep-links into /write so the dashboard is one click
// away from any allowed action.
const ACTIONS_BY_KIND: Record<number, { headline: string; actions: QuickAction[] }> = {
  // Manufacturer / Authorized service centre share the same panel — both
  // surface as "Manufacturer / Service" in the writer page's role picker
  // (key = AuthorityKind.AuthorizedServiceCenter).
  [AuthorityKind.Manufacturer]: {
    headline: "As a Manufacturer you can mint new vehicles and issue recalls.",
    actions: [
      {
        label: "Mint a new vehicle",
        description: "Register a fresh VIN with full factory specs.",
        href: `/write?role=${AuthorityKind.AuthorizedServiceCenter}&action=create_vehicle`,
      },
    ],
  },
  [AuthorityKind.AuthorizedServiceCenter]: {
    headline: "As a Service center you can record service work and mileage.",
    actions: [
      {
        label: "Service / Maintenance",
        description: "Record routine service with mileage update.",
        href: `/write?role=${AuthorityKind.AuthorizedServiceCenter}&action=svc_service`,
      },
      {
        label: "Part replacement",
        description: "Modification or replacement on a tracked vehicle.",
        href: `/write?role=${AuthorityKind.AuthorizedServiceCenter}&action=svc_part`,
      },
      {
        label: "Mileage reading",
        description: "Update odometer reading.",
        href: `/write?role=${AuthorityKind.AuthorizedServiceCenter}&action=svc_mileage`,
      },
    ],
  },
  [AuthorityKind.Police]: {
    headline:
      "As Police you can record traffic controls, accidents, theft and recovery.",
    actions: [
      {
        label: "Police control",
        description: "Routine roadside check + optional driving block.",
        href: `/write?role=${AuthorityKind.Police}&action=pol_control`,
      },
      {
        label: "Accident report",
        description: "On-site accident documentation.",
        href: `/write?role=${AuthorityKind.Police}&action=pol_accident`,
      },
      {
        label: "Theft report",
        description: "Mark vehicle as stolen.",
        href: `/write?role=${AuthorityKind.Police}&action=pol_theft`,
      },
      {
        label: "Recovery",
        description: "Stolen vehicle recovered.",
        href: `/write?role=${AuthorityKind.Police}&action=pol_recovery`,
      },
    ],
  },
  [AuthorityKind.InspectionStation]: {
    headline:
      "As an Inspection station you certify roadworthiness and can clear police-imposed driving blocks.",
    actions: [
      {
        label: "Technical inspection",
        description: "Periodic safety inspection with next-due date.",
        href: `/write?role=${AuthorityKind.InspectionStation}&action=ins_inspection`,
      },
      {
        label: "Mileage reading",
        description: "Odometer reading update.",
        href: `/write?role=${AuthorityKind.InspectionStation}&action=ins_mileage`,
      },
    ],
  },
  [AuthorityKind.Insurer]: {
    headline:
      "As an Insurer you can write policies and document accident damage.",
    actions: [
      {
        label: "Insurance policy",
        description: "Issue or renew a policy with coverage window.",
        href: `/write?role=${AuthorityKind.Insurer}&action=ins_policy`,
      },
      {
        label: "Damage report",
        description: "Document an accident, flood or theft claim.",
        href: `/write?role=${AuthorityKind.Insurer}&action=ins_damage`,
      },
    ],
  },
  [AuthorityKind.RegistrationOffice]: {
    headline:
      "As a Government office you assign plates, transfer ownership and scrap vehicles.",
    actions: [
      {
        label: "Register vehicle",
        description: "Assign plates + first owner.",
        href: `/write?role=${AuthorityKind.RegistrationOffice}&action=gov_register`,
      },
      {
        label: "Ownership transfer",
        description: "Transfer ownership between two parties.",
        href: `/write?role=${AuthorityKind.RegistrationOffice}&action=gov_transfer`,
      },
      {
        label: "Vehicle scrapping",
        description: "Mark vehicle as scrapped / end-of-life.",
        href: `/write?role=${AuthorityKind.RegistrationOffice}&action=gov_scrap`,
      },
    ],
  },
  [AuthorityKind.Customs]: {
    headline: "As Customs you can record imports.",
    actions: [
      // Import event is currently exposed via the writer's dynamic role
      // picker only; deep-linking via role/action would require adding it
      // to the writer's ROLES table.
    ],
  },
};

type State =
  | { kind: "disconnected" }
  | { kind: "loading" }
  | { kind: "unregistered" }
  | { kind: "ok"; auth: AuthoritySummary };

export function RoleDashboard() {
  const wallet = useAnchorWallet();
  const [state, setState] = useState<State>({ kind: "disconnected" });

  useEffect(() => {
    if (!wallet) {
      setState({ kind: "disconnected" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    fetchAuthority(wallet.publicKey)
      .then((auth) => {
        if (cancelled) return;
        setState(auth ? { kind: "ok", auth } : { kind: "unregistered" });
      })
      .catch(() => !cancelled && setState({ kind: "unregistered" }));
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  // Hidden when no wallet — keeps the home page tidy.
  if (state.kind === "disconnected") return null;

  const cardBase: React.CSSProperties = {
    marginTop: "2rem",
    padding: "1.25rem 1.5rem",
    borderRadius: 10,
    border: "1px solid",
  };

  if (state.kind === "loading") {
    return (
      <div
        style={{
          ...cardBase,
          background: "#f9fafb",
          borderColor: "#e5e7eb",
          color: "#6b7280",
        }}
      >
        Checking your authority record on devnet…
      </div>
    );
  }

  if (state.kind === "unregistered") {
    return (
      <div
        style={{
          ...cardBase,
          background: "#fef3c7",
          borderColor: "#fcd34d",
          color: "#92400e",
        }}
      >
        <div style={{ fontWeight: 700 }}>Wallet connected, but not an authority.</div>
        <div style={{ marginTop: "0.45rem", fontSize: "0.92rem" }}>
          Public lookup works for everyone, but to <em>write</em> events you
          need to be onboarded as an institutional authority. Ask the program
          admin to register your pubkey via{" "}
          <Link
            href="/register"
            style={{ color: "#92400e", textDecoration: "underline" }}
          >
            /register
          </Link>
          .
        </div>
      </div>
    );
  }

  // Registered. Branch on revoked vs. active.
  const auth = state.auth;
  if (!auth.active) {
    return (
      <div
        style={{
          ...cardBase,
          background: "#fee2e2",
          borderColor: "#fca5a5",
          color: "#991b1b",
        }}
      >
        <div style={{ fontWeight: 700 }}>Authority revoked.</div>
        <div style={{ marginTop: "0.45rem", fontSize: "0.92rem" }}>
          Your authority record &ldquo;{auth.name}&rdquo; (
          {AuthorityKindLabel[auth.kind]}) is currently revoked on-chain.
          Submissions will be rejected.
        </div>
      </div>
    );
  }

  const dashboard = ACTIONS_BY_KIND[auth.kind];
  return (
    <div
      style={{
        ...cardBase,
        background: "#ecfdf5",
        borderColor: "#6ee7b7",
        color: "#065f46",
      }}
    >
      <div
        style={{
          fontSize: "0.78rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 700,
        }}
      >
        Welcome, {AuthorityKindLabel[auth.kind]}
      </div>
      <div style={{ marginTop: "0.4rem", fontSize: "1.1rem", fontWeight: 600 }}>
        {auth.name}{" "}
        <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#047857" }}>
          · {auth.countryCode} · {auth.eventsWritten} events written
        </span>
      </div>

      {dashboard ? (
        <>
          <p style={{ marginTop: "0.75rem", fontSize: "0.92rem", color: "#047857" }}>
            {dashboard.headline}
          </p>
          {dashboard.actions.length > 0 && (
            <div
              style={{
                marginTop: "1rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {dashboard.actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  style={{
                    display: "block",
                    padding: "0.75rem 0.9rem",
                    background: "white",
                    border: "1px solid #6ee7b7",
                    borderRadius: 8,
                    textDecoration: "none",
                    color: "#065f46",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {a.label} →
                  </div>
                  <div
                    style={{
                      marginTop: "0.2rem",
                      fontSize: "0.8rem",
                      color: "#047857",
                    }}
                  >
                    {a.description}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ marginTop: "0.75rem", fontSize: "0.92rem" }}>
          Use the writer page for available actions.
        </p>
      )}
    </div>
  );
}
