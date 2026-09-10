# Shield configuration visual inputs

The shield reuses the approved Family A clay lock pieces from
`prototype/assets/icons/` byte-for-byte. No new visual was generated:

- `ClayLockBody.png` = `prototype/assets/icons/lock-body.png`
- `ClayLockShackle.png` = `prototype/assets/icons/lock-shackle.png`

`ClayLockIcon.swift` layers the shackle behind the body at runtime. Both inputs
already passed the RGBA, transparent-corner, residual-chroma, and coverage gates
recorded in `prototype/assets/icons/FOUNDRY.md`.
