# Notifications

Contract: owns local notification scheduling and the notification-type-to-route table. Every deep link
must resolve to a live thin route.

Fixtures: notification payloads arrive with the route-table test. Test with
`npm run test --workspace app -- notifications`.
