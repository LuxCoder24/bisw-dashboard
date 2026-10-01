try {
  const { firebaseConfig } = await import('./firebase-config.js');
  if (['apiKey','authDomain','projectId','appId'].some(k => !firebaseConfig[k] || firebaseConfig[k].includes('PASTE_'))) {
    throw new Error('Complete firebase-config.js using your Firebase web app configuration, then reload.');
  }
  const { start } = await import('./app.js');
  await start(firebaseConfig);
} catch (error) {
  document.getElementById('connection').textContent = 'Setup incomplete';
  document.getElementById('status').textContent = error.message.startsWith('Complete firebase-config')
    ? error.message : 'Unable to start the dashboard. Check the Firebase configuration and internet connection, then reload.';
  console.error(error);
}
