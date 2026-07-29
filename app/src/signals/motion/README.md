# MotionProvider

Contract: motion activity and pedometer observations behind one provider interface. It hides the local
Swift module and supplies equivalent deterministic fixture behavior.

Fixtures planned: steady-walk, red-light, stop-for-good, drive-off, shaky-cheat, late-classification, and
denied-permission. Test with `npm run test --workspace app -- signals/motion`.
