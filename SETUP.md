# BISW dashboard: GitHub + Firebase setup

Prepared 30 September 2026 using the current official documentation linked below. These instructions are for the new `bisw-github-firebase` package, not the earlier prototype ZIP.

**What goes where:** GitHub stores the website files and GitHub Pages hosts them. Firebase Authentication checks staff passwords. Cloud Firestore stores the public events and display settings, and enforces who can edit. Your iPad only opens the public dashboard; your counselor signs into a separate staff page on their own device.

No terminal, Firebase CLI, npm, or Firebase Hosting is required for the setup below. The code uses Firebase's documented browser-module option, pinned to SDK 12.19.0. Firebase recommends bundling for production size optimization; this small static version uses its supported CDN alternative to keep setup simple. [SDK setup](https://firebase.google.com/docs/web/setup), [CDN option](https://firebase.google.com/docs/web/alt-setup).

## 1. Download and extract the new ZIP

Extract `bisw-github-firebase.zip`. Inside its folder you will find:

| File | Purpose | Change it? |
|---|---|---|
| `index.html` | Public display | Only for later design changes |
| `admin.html` | Staff sign-in and editor | Only for later design changes |
| `style.css` and `favicon.svg` | Appearance | Optional |
| `firebase-config.js` | Your Firebase connection details | **Yes: paste your project values** |
| `boot.js`, `app.js`, `helpers.js` | Sign-in, shared content, and display behavior | No |
| `weather.js` | Washington, DC hourly forecast | No |
| `firestore.rules` | Database permissions and validation | **Copy its full contents into Firebase** |
| `firebase.json` | Optional future CLI rules deployment | No; not used by GitHub Pages |
| `.nojekyll` | Disables Jekyll processing | No |
| `SETUP.md` | This guide | No |
| `RULES-CHECKS.md` | Permission checks to run after setup | Follow it |

The site starts empty. It does not publish the prototype's invented school events.

## 2. Create your Firebase project

Open [Firebase Console](https://console.firebase.google.com/) and create a project, for example **BISW IB Dashboard**. Google may suggest a unique project ID; accept it or choose your own. You may leave Google Analytics and optional AI features disabled for this dashboard.

Start with the **Spark** plan. This implementation does not require Cloud Functions, file storage, or a billing upgrade. Usage limits still apply; see the quota note at the end. [Firebase pricing](https://firebase.google.com/pricing).

From the project overview, choose the **Web** icon (`</>`), or **Add app → Web**. Give it a nickname such as `BISW display`. You do not need Firebase Hosting because GitHub Pages will host the website. Register the app.

Open **Project settings → General → Your apps**, choose this web app, and select the **Config** view. You need the object that begins `const firebaseConfig = { ... }`.

## 3. Put your Firebase configuration into the file

Open `firebase-config.js` in a plain-text editor. On a Mac, avoid saving it as rich text or adding `.txt`. You can instead edit this file directly on GitHub after uploading it in step 7.

Replace the placeholder values with the actual values shown for your web app. Preserve `export const` at the beginning. The finished file has this shape:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_REAL_FIREBASE_WEB_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "COPY_THE_EXACT_STORAGE_BUCKET_VALUE",
  messagingSenderId: "COPY_THE_EXACT_SENDER_ID",
  appId: "COPY_THE_EXACT_APP_ID"
};
```

Copy the exact bucket value; do not guess its suffix. An additional `measurementId` field is harmless but not needed. Do not copy Firebase's example initialization or import code into this file; those parts are already provided.

This is your **Firebase web configuration**, which is meant to be used in browser code. Use the Firebase browser key restricted to Firebase services; do not substitute a Gemini API key, service-account JSON, private key, GitHub token, or password. Database rules provide the staff-only write protection. [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys).

## 4. Enable email/password sign-in

In Firebase, open **Authentication** (current documentation places it under **Security**). Choose **Get started** if shown, then **Sign-in method → Email/Password**. Enable **Email/Password** and save. Leave email-link/passwordless sign-in off; this app uses ordinary email and password. [Password sign-in documentation](https://firebase.google.com/docs/auth/web/password-auth).

In **Authentication → Users**, add an account for yourself. Use your real email and a unique password. Add a separate account for your counselor. Each person should have their own account.

The account's **UID** is its unique identifier. Copy yours; you will use it in step 6. The UID is not the email address.

For the counselor, you can create the account with a temporary random password and have them use the app's **Send password reset email** button to set their own password. Firebase also allows reset emails from its console. Do not place passwords in the repository. [Managing users](https://firebase.google.com/docs/auth/web/manage-users).

## 5. Create Firestore and publish the rules

Open **Firestore Database** and choose **Create database**. Select **Standard edition** and the **`(default)` database** if prompted. Choose an appropriate US location; Northern Virginia (`us-east4`) is a reasonable option for DC if available. The location cannot be changed later, so check it before confirming.

Choose **Production mode**, then create the database. Production mode starts with browser access denied; the next step grants exactly the access this app needs. [Firestore setup](https://firebase.google.com/docs/firestore/quickstart).

Open the **Rules** tab. Delete the starter rules in the editor, open the supplied `firestore.rules`, and copy **the entire file** into the editor. Click **Publish**.

Uploading `firestore.rules` to GitHub does **not** publish the rules to Firebase. This copy-and-publish step is required.

The supplied rules allow anyone to read display content. They allow edits only when the signed-in user's UID has an enabled staff record. A visitor cannot create their own staff approval, even if they obtain a Firebase account. [Rules with document-based permissions](https://firebase.google.com/docs/firestore/security/rules-conditions).

## 6. Approve the staff accounts

In **Firestore Database → Data**, click **Start collection**:

```text
Collection ID: staff
Document ID: PASTE_THE_EXACT_UID_FROM_AUTHENTICATION
Field: enabled
Type: boolean
Value: true
```

Choose the **boolean** type, not a string containing the word `true`. Click **Save**.

Repeat with your counselor's UID as a second document in the same `staff` collection. You do not need to add names, emails, passwords, or any other fields.

Only these staff approval documents need manual creation. The editor will create events, deadlines, notices, and settings when you save them.

To remove editing access later, change that person's `enabled` value to **false** in Firestore. You can also disable their Authentication account. Changing the staff record makes subsequent writes fail even if they still have a sign-in session.

## 7. Upload the website to GitHub

Create a repository on [GitHub](https://github.com/new), for example:

```text
bisw-dashboard
```

Choose **Public** for GitHub Pages on GitHub Free. Choose **Add README** so the repository has a `main` branch, then create it. [GitHub Pages requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

In the repository, choose **Add file → Upload files**. Upload the **files inside** the extracted folder, not the ZIP and not a containing folder. `index.html`, `admin.html`, `style.css`, and the JavaScript files must all be at the top level. Commit the uploaded files.

If you have not yet edited `firebase-config.js`, click it on GitHub, choose the pencil/Edit control, replace the values as in step 3, and commit the change.

The hidden `.nojekyll` file may not appear in Finder's upload selection. If necessary, use **Add file → Create new file**, name it `.nojekyll`, leave it empty (a comment is also fine), and commit it.

Open **Settings → Pages** and set:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

Save. GitHub will show the published URL once deployment finishes. It can take up to about 10 minutes. Use the actual URL displayed by GitHub, typically:

```text
https://YOUR_GITHUB_USERNAME.github.io/bisw-dashboard/
```

[Publishing source settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [publication timing](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## 8. Add your domain in Firebase

In **Authentication → Settings → Authorized domains**, choose **Add domain** and add:

```text
YOUR_GITHUB_USERNAME.github.io
```

Use only the hostname: no `https://`, repository name, or trailing slash. Keep the default Firebase domains. Add a custom domain here too if you use one later.

This setting does not itself give anyone editing permission; staff approval is still controlled by Firestore rules. The existing `authDomain` in `firebase-config.js` should remain the one supplied by Firebase, normally `YOUR_PROJECT_ID.firebaseapp.com`.

## 9. Sign in and publish your first items

Open the staff page:

```text
https://YOUR_GITHUB_USERNAME.github.io/bisw-dashboard/admin.html
```

Sign in using your approved account. Add a real upcoming event with a current/future date. Open the public dashboard on another device or in a signed-out/private window. It should appear without refreshing. Firestore uses a real-time listener for these updates. [Real-time updates](https://firebase.google.com/docs/firestore/query-data/listen).

The editor supports:

- Adding, editing, and removing events.
- Adding and removing deadlines and IB notices.
- Saving a featured event and an announcement.
- Switching all connected displays between the everyday dashboard, featured event, and alert.
- Selecting a 1-, 4-, 8-, or 24-hour duration for a featured-event or alert takeover. The screen then returns to the dashboard automatically.

Saving an announcement or featured event does not switch the screen automatically. Save it first, then select its display view. “Everyday dashboard” returns the screen immediately.

All content you save is public, including saved announcements that are not currently selected. There is no private draft area. Events with past dates are hidden on the display; events from earlier today stay visible until the date changes in DC. Expired notices are hidden after their last display date. Hiding does not delete the database record. Remove old records periodically to keep the data small.

Run the supplied `RULES-CHECKS.md` before relying on staff access. This checks both permitted actions and denied actions.

## 10. Put it on the Samsung display

On the connected iPad, open the public URL in Safari. Do not leave the staff page signed in on the display device. Keep the iPad connected to power and the internet, and adjust Auto-Lock as appropriate for school use. The full-screen button works only where the browser supports it; iPad mirroring and its aspect ratio may leave borders on the Samsung screen.

Check the physical screen once for text size, mirroring, sleep behavior, and whether the page remains visible through a full school day. This hardware setup has not been tested here.

## Weather and costs

The weather panel fetches the **National Weather Service hourly forecast** for central Washington, DC, every 15 minutes. It is labeled as a forecast, not a measured school weather station reading. NWS currently provides an open, no-fee API; no separate key is needed for this implementation. It shows an unavailable message if a request fails. [NWS API documentation](https://www.weather.gov/documentation/services-web-api).

Firebase's listed Firestore free quotas include 50,000 document reads and 20,000 writes per day, with one free database per project. This should be ample for a small school display with modest traffic, but that is an estimate, not a guarantee. Each visitor and changed document can use quota. Check **Firestore → Usage** after launch. [Firestore quotas](https://firebase.google.com/docs/firestore/quotas).

This starter enforces staff write permissions with rules. Firebase App Check, which helps reduce API abuse, is not configured. It is a separate optional hardening step before wider promotion; do not enable enforcement until the app has been integrated with it, or requests will fail.

## Updating the design later

Change the files in GitHub and commit; Pages republishes them. Staff content changes go through `admin.html` and appear without a GitHub commit. Changes to `firestore.rules` must also be pasted and published in the Firebase console.

No existing demo local-storage data is imported automatically. Enter actual school information using the new editor.

## Troubleshooting

| Symptom | Check |
|---|---|
| “Setup incomplete” | Replace every `PASTE_...` value in `firebase-config.js`, commit, wait for deployment, reload. |
| GitHub 404 | Pages is using `main` and `/ (root)`; `index.html` is at the root; use the URL shown in Pages settings. |
| Sign-in fails | Enable Email/Password, verify the user exists, check your password and project configuration. |
| “This account is not approved” | `staff/{UID}` exists; its ID exactly matches Authentication UID; `enabled` is boolean `true`. |
| “Access denied” | Publish the supplied rules in the same project's default database; check staff approval. |
| Event does not show | Date is current/future, item saved successfully, and it is among the first four upcoming events. |
| Updates do not reach another device | Both devices must use the new Firebase-connected URL and the same configuration; the old prototype only saves locally. |
| Alert does not appear | Save its content, then select Alert. It returns to Dashboard when the selected duration ends. |
| Weather unavailable | Check internet/school filtering and retry later; NWS may be temporarily unavailable. |
| Code changes seem missing | Wait for the Pages deployment, then reload the browser. |

## Validation status

JavaScript syntax, date handling, ordering, expiry, escaping, and unconfigured-page behavior can be checked locally. Actual Firebase sign-in, server-enforced rules, and cross-device updates require your project and accounts. They have **not** been verified against your Firebase project yet. A Java runtime was unavailable here, so the rules have not been run in the Firestore emulator; use the included Rules Playground checks and live smoke test after publishing them.
