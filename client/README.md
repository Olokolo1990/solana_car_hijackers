# client — Vehicle Passport Next.js frontend

Two user-facing pages:

| Route | Audience | Purpose |
|---|---|---|
| `/` | Public | VIN lookup → event timeline |
| `/write` | Authorities | Wallet-gated form to append events |
| `/authorities` | Public | Directory of registered institutional writers |

## Setup

```bash
cd client
cp .env.example .env.local   # fill in NEXT_PUBLIC_HELIUS_API_KEY etc.
npm install
npm run dev                  # http://localhost:3000
```

## Open TODOs

- [ ] Wire `fetchVehicleEvents` against Helius DAS API
- [ ] Generate Anchor IDL types and use them to build `write_event` ix in `pages/write.tsx`
- [ ] Server-side Irys upload route (so users don't need to fund their own Arweave wallet)
- [ ] EventTimeline + EventForm components (currently inlined in pages — extract for reuse)
- [ ] Tailwind setup (added to deps but not yet configured — see postcss.config.js / tailwind.config.js)
- [ ] Read-only PDF report export with on-chain proof block
