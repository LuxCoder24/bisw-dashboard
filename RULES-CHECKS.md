# Check the database permissions

Do these checks after publishing `firestore.rules` and creating your `staff/{UID}` document. They are especially important because a hidden editor alone does not protect a database.

In Firebase → Firestore Database → Rules, open **Rules Playground**. The console may arrange fields slightly differently. Choose the operation, document path, authentication state, and request data described below, then run the simulation. The published rules must also pass Firebase's syntax check when you press Publish.

Use this valid example event for create/update simulations (enter a map/object, or individual fields if the UI asks for them):

```json
{
  "title": "Setup test",
  "date": "2026-10-01",
  "time": "12:30",
  "location": "IB common room",
  "audience": "IB YEAR 1 & 2"
}
```

The fixed date is only for permission simulation. Use a current/future date for the actual display test.

| Operation | Path | Authentication | Expected |
|---|---|---|---|
| get | `/events/setup-test` | Off | Allow |
| create | `/events/setup-test` | Off | Deny |
| create | `/events/setup-test` | On, UID `unapproved-test-user` | Deny |
| create | `/events/setup-test` | On, your approved UID | Allow |
| create | `/events/setup-test` | On, your approved UID, but change title to a number | Deny |
| create | `/staff/unapproved-test-user` | On, UID `unapproved-test-user`; data `{"enabled":true}` | Deny |
| get | `/staff/YOUR_ACTUAL_UID` | Off | Deny |
| get | `/staff/YOUR_ACTUAL_UID` | On, your own UID | Allow |
| get | `/staff/YOUR_ACTUAL_UID` | On, another UID | Deny |
| get | `/settings/alert` | Off | Allow |
| create | `/settings/display` | Off; data `{"view":"alert","expiresAt":1800000000000}` | Deny |

For approved checks, use the UID whose real staff document already exists with boolean `enabled: true`. If any expected denial is allowed, do not continue using the site until the published rules match the supplied file.

Then test the actual site:

1. Open the public dashboard in a private window: no login required.
2. Open `admin.html` in that private window: editor hidden until sign-in.
3. Sign in with your approved account and add an event with today's date. Confirm it appears in the public window.
4. Edit and remove that test event; confirm the display follows.
5. Save an announcement, choose Alert, then choose Everyday dashboard. Confirm the other window follows.
6. Sign out: the editor should disappear.
7. For a revocation test, temporarily set your own `staff/{UID}.enabled` to false from the Firebase console while signed in. The editor should close; writes must be denied. Restore true from the console afterward.

Rules Playground is a manual permission check, not a replacement for all production testing. Also test on the actual iPad and school network.
