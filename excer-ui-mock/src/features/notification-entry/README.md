# Notification-entry feature

`NotificationPreviewScreen` renders the three debug-only local notification fixtures. The component does not schedule or deliver a notification. `onEnterDestination` is the single navigation boundary: an unopened preview enters its focused tab in one tap, while `?phase=tapped` keeps the post-tap explanation inspectable from debug without making it a required intermediate step. `onDismiss` returns to debug without changing product data.
