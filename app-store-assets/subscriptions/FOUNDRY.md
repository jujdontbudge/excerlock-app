# Subscription promotional assets

## Premium Annual promotional image v2

- Final path: `app-store-assets/subscriptions/premium-annual-promo-v2.png`.
- Intended use: the optional 1024 x 1024 App Store Connect promotional image for `com.johansardar.excerlock.premium.a.annual`.
- Family: E — Composed square.
- Subject: the shipped and validated Family B sparkle cutout at `prototype/assets/icons/icon-sparkle.png`.
- Composition: flat `#F25A16` brand fill with the subject centred at 46% of the square width.
- Generation: deterministic `prototype/scripts/compose_square.py`; no image model was used because Family E explicitly forbids generated square composition.
- Validation: `prototype/scripts/validate_square.py` passed at 1024 x 1024 RGB with exact background corners, zero residual chroma, 26.95% safe inset, 0.05% centre drift, and no failures.
- Distinction: 218,873 of 1,048,576 pixels differ from `app/assets/icon.png`; the subscription art uses the Premium sparkle rather than the app icon's lock.
- App Store status: 2.3.2 fix complete — the rejected Annual promotional image was removed through the documented v1 DELETE endpoint (HTTP 204), authoritative Annual read-back shows no promotional image, and the Monthly subscription remains unchanged; the optional replacement was not uploaded.

Exact composition command:

```bash
python3 prototype/scripts/compose_square.py \
  --subject prototype/assets/icons/icon-sparkle.png \
  --background '#F25A16' \
  --size 1024 \
  --subject-width 0.46 \
  --out app-store-assets/subscriptions/premium-annual-promo-v2.png
```
