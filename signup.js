const form = document.querySelector('#signup-form');
const button = document.querySelector('#create-account');
const status = document.querySelector('#status');
const password = document.querySelector('#password');
const confirmation = document.querySelector('#confirm-password');
const checkMatch = () => confirmation.setCustomValidity(confirmation.value && confirmation.value !== password.value ? 'Passwords must match.' : '');
password.addEventListener('input', checkMatch);
confirmation.addEventListener('input', checkMatch);

try {
  const [{ initializeApp }, { getAuth, setPersistence, browserSessionPersistence, createUserWithEmailAndPassword, signOut }, { firebaseConfig }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
    import('./firebase-config.js')
  ]);
  const auth = getAuth(initializeApp(firebaseConfig));
  await setPersistence(auth, browserSessionPersistence);
  status.textContent = '';
  button.disabled = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    checkMatch();
    if (!form.reportValidity() || button.disabled) return;
    if (!navigator.onLine) { status.textContent = 'You are offline. Reconnect before creating your account.'; return; }
    button.disabled = true;
    button.textContent = 'Creating account…';
    status.textContent = '';
    try {
      const { user } = await createUserWithEmailAndPassword(auth, document.querySelector('#email').value.trim(), password.value);
      form.reset();
      form.hidden = true;
      document.querySelector('#account-id').value = user.uid;
      document.querySelector('#signup-success').hidden = false;
      document.querySelector('#signup-success h2').focus();
      status.textContent = 'Account created. Staff approval is required before editing.';
      // Registration never writes a staff approval document.
      try { await signOut(auth); } catch { /* The staff page still enforces owner approval. */ }
    } catch (error) {
      const messages = {
        'auth/email-already-in-use': 'An account already uses this email. Sign in or reset your password on the sign-in page.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/weak-password': 'Choose a stronger password with at least 8 characters, including uppercase and lowercase letters, a number, and a symbol.',
        'auth/password-does-not-meet-requirements': 'Use a password with uppercase and lowercase letters, a number, and a symbol.',
        'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
        'auth/network-request-failed': 'Unable to connect. Check your internet connection and try again.',
        'auth/operation-not-allowed': 'Account registration is unavailable. Ask the project owner to enable Email/Password sign-in in Firebase.'
      };
      status.textContent = messages[error.code] || 'Unable to create your account. Please try again later or contact the project owner.';
    } finally {
      button.disabled = false;
      button.textContent = 'Create account';
    }
  });
} catch {
  status.textContent = 'Unable to connect to account services. Check your connection and reload the page.';
}
