// Presentation only: authentication and staff permissions remain in app.js.
const editor = document.querySelector('#editor');
const navigation = [...document.querySelectorAll('[data-section]')];
function showSection(key) {
  for (const button of navigation) button.setAttribute('aria-pressed', String(button.dataset.section === key));
  for (const section of document.querySelectorAll('.staff-workspace')) section.hidden = section.id !== `workspace-${key}`;
}
for (const button of navigation) button.addEventListener('click', () => showSection(button.dataset.section));
const names = { event: 'an event', deadline: 'a deadline', notice: 'a notice' };
for (const [kind, name] of Object.entries(names)) {
  const form = document.querySelector(`#${kind}-form`);
  const heading = document.querySelector(`[data-form-heading="${kind}"]`);
  const save = form.querySelector('[type="submit"]');
  const restore = () => { heading.textContent = `Add ${name}`; save.textContent = `Save ${kind}`; };
  form.addEventListener('reset', restore);
  editor.addEventListener('click', event => {
    const button = event.target.closest(`[data-edit][data-kind="${kind}s"]`);
    if (!button) return;
    // app.js resets and fills the existing form in this same click event.
    queueMicrotask(() => {
      showSection(`${kind}s`);
      heading.textContent = `Edit ${kind}`;
      save.textContent = 'Save changes';
    });
  });
}
