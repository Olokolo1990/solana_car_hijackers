# @vehicle-passport/sdk

Shared TypeScript SDK consumed by `client/` (frontend) and ops/test scripts.

## Why a separate package?

PDA derivation, IDL loading, and instruction builders are needed in **at least
three places**: the Next.js app, end-to-end tests in `anchor_program/tests/`,
and any scripts/CLIs we add later. Centralizing here avoids three diverging
copies of the same code.

## Build

```bash
cd sdk
npm install
npm run build       # emits to dist/
```

## Open TODOs

- [ ] Run `anchor build` in `anchor_program/`, copy generated
      `target/idl/vehicle_passport.json` → `sdk/src/idl/`
- [ ] Replace hand-written `types.ts` with import from generated IDL types
- [ ] Implement instruction builders in `client.ts`
- [ ] Add account decoders (Vehicle, Authority, VehicleEvent)
- [ ] Publish to a private npm registry once stable, or use workspace linking
