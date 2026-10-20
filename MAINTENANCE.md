# Maintenance mode

This branch replaces the dashboard, staff sign-in, and sign-up pages with a simple maintenance notice. These pages load no Firebase or application scripts.

## Turn maintenance on

Open repository Settings → Pages. Under Build and deployment, choose Deploy from a branch, select maintenance and /(root), and Save. Wait for the Pages deployment to finish.

## Bring the site back

In the same Pages settings, switch the branch back to main, keep /(root), and Save. Wait for deployment to finish.

Continue feature work on main or a feature branch. Do not merge this maintenance branch into main. Switching branches changes the published site; it does not delete accounts or dashboard content. Already-open dashboard tabs may continue running until refreshed. Firestore permissions remain unchanged.
