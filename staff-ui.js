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

const composer = document.querySelector('#event-composer');
const eventForm = document.querySelector('#event-form');
const addEvent = document.querySelector('#add-event');
const cancelEvent = document.querySelector('#cancel-event-edit');
let eventDirty = false;
function openComposer() {
  showSection('events');
  composer.hidden = false;
  cancelEvent.hidden = false;
  addEvent.setAttribute('aria-expanded','true');
  eventForm.querySelector('input').focus();
  composer.scrollIntoView({behavior:'auto',block:'start'});
}
eventForm.addEventListener('input', () => { eventDirty = true; });
eventForm.addEventListener('change', () => { eventDirty = true; });
eventForm.addEventListener('reset', () => {
  eventDirty = false;
  const feedback = eventForm.querySelector('.form-status');
  if(feedback) feedback.textContent = '';
  queueMicrotask(() => {
    composer.hidden = true;
    addEvent.setAttribute('aria-expanded','false');
    document.querySelector('#event-extras').open = false;
    if(!editor.hidden) addEvent.focus();
  });
});
addEvent.addEventListener('click', openComposer);
cancelEvent.addEventListener('click', event => {
  if (eventForm.querySelector('[type="submit"]').disabled || (eventDirty && !confirm('Discard your unsaved event changes?'))) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
editor.addEventListener('click', event => {
  if(event.target.closest('[data-edit][data-kind="events"]')) queueMicrotask(() => {
    openComposer();
    document.querySelector('#event-extras').open = true;
  });
  if(event.target.closest('[data-go-events]')) {
    showSection('events');
    document.querySelector('#heading-events').focus();
  }
});
// Keep the editor open after an error; app.js resets it only after a confirmed save.
composer.addEventListener('keydown', event => {
  if(event.key === 'Escape' && !eventForm.querySelector('[type="submit"]').disabled) {
    event.preventDefault();cancelEvent.click();
  }
});

editor.addEventListener('click', event => {
  if (!event.target.closest('[data-edit][data-kind="events"]')) return;
  if (eventForm.querySelector('[type="submit"]').disabled || (eventDirty && !confirm('Discard your unsaved event changes and edit this event?'))) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
}, true);
