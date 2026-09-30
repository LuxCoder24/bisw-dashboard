# BISW IB Bulletin — visual prototype

Open `index.html` for the display and `admin.html` for the staff preview. All school content, dates, and weather are sample data. Only the Washington, DC clock and current date are live. Branding is a proposed design, not official school artwork.

## Try it

- Run any static web server in this folder, for example `python3 -m http.server 8765`.
- Open http://localhost:8765/ in your browser.
- Choose Dashboard, Featured event, or Alert at the bottom of the display.
- Open Staff preview and choose “Open demo editor.” Add or remove sample events, change the spotlight or announcement, and select a display view.
- Open the display and editor in separate tabs on the same origin to see updates. State is stored only in that browser. Opening the files directly may not share state across pages consistently; use a web server for the interactive demo.
- Reset sample content in the editor to restore the original examples.

## Display assumptions

Designed first for a horizontal 16:9 display, with responsive layouts for iPad and phone. An iPad's mirrored aspect ratio and browser controls may prevent the Samsung screen from filling edge to edge. The exact iPad/display connection needs an on-device check. A desktop full-screen button is included where the browser supports it. No claim of actual iPad or Samsung testing is made.

## Scope of this prototype

There is no authentication, protected editing, live school feed, live weather, or cross-device synchronization yet. The sign-in fields are intentionally disabled and do not collect credentials. The editor is explicitly an open demo, not a security boundary. School menus and daily lesson schedules await real source information from the counselor; no invented timetable or menu is presented as factual. Four events are shown at a time, ordered by sample date, without filtering by today's date so the concept remains reviewable.

## Proposed production setup

The files are standalone HTML, CSS, and JavaScript with relative links and no build tools or dependencies, suitable for a GitHub Pages repository. Nothing has been published or connected to a GitHub account.

After approval, connect Firebase Authentication for independent email/password accounts and Cloud Firestore for shared events and display settings. Firestore rules must allow public reads only for intended public display content and restrict writes to explicitly authorized staff (not every signed-in user). Provision staff access separately; do not permit users to grant themselves editing rights. Use a real-time listener on the display, handle offline/stale state, and define expiration for alerts and past events. Replace local prototype storage before production use.

Firebase references:
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/rules/basics

Next content needed from the counselor: authoritative calendar/deadlines, announcement process, approved school branding, and whether lunch menus or timetable information are useful and maintained.
