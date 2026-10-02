// Keep each picture comfortably below Firestore's document size limit.
export const MAX_IMAGE_LENGTH = 200000;
export const validImage = value => typeof value === 'string' && value.length <= MAX_IMAGE_LENGTH && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);

export function imageMarkup(item, className = 'content-image') {
  if (!validImage(item?.image)) return '';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<img class="${className}" src="${item.image}" alt="${escape(item.imageAlt || item.title)}" decoding="async">`;
}

export async function prepareImage(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP picture.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a picture smaller than 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error('This picture could not be opened. Try a different JPG, PNG, or WebP file.'); }
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Picture uploads are unavailable in this browser.');
    // Flatten transparent posters onto white, preserving the entire picture.
    function draw() {
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      draw();
      for (const quality of [.86, .74, .62]) {
        const result = canvas.toDataURL('image/jpeg', quality);
        if (validImage(result)) return result;
      }
      canvas.width = Math.max(1, Math.round(canvas.width * .8));
      canvas.height = Math.max(1, Math.round(canvas.height * .8));
    }
    throw new Error('This picture could not be resized. Try a smaller picture.');
  } finally { URL.revokeObjectURL(url); }
}

export function attachImageEditor(form) {
  const field = document.createElement('fieldset');
  field.className = 'image-editor';
  field.innerHTML = `<legend>Picture (optional)</legend><label for="${form.id}-picture">Upload a picture</label><input id="${form.id}-picture" type="file" accept="image/jpeg,image/png,image/webp"><p class="image-help">JPG, PNG, or WebP · up to 10 MB. Pictures are resized automatically.</p><img class="image-preview" alt="Picture preview" hidden><button type="button" class="remove-image" hidden>Remove picture</button><label for="${form.id}-image-alt">Picture description</label><input id="${form.id}-image-alt" maxlength="120" placeholder="A short description for people using a screen reader"><p class="image-status" role="status" aria-live="polite"></p>`;
  form.insertBefore(field, form.querySelector('button[type="submit"], button:not([type])'));
  const input = field.querySelector('[type="file"]'), preview = field.querySelector('img');
  const remove = field.querySelector('button'), alt = field.querySelector('[maxlength]'), message = field.querySelector('[role="status"]');
  let picture = '', busy = false, failure = '', revision = 0;
  function paint() {
    preview.hidden = remove.hidden = !picture;
    if (picture) preview.src = picture; else preview.removeAttribute('src');
  }
  function dirty() { form.dataset.dirty = 'true'; }
  function set(item = {}) {
    revision++; busy = false; failure = ''; input.value = ''; message.textContent = '';
    picture = validImage(item.image) ? item.image : ''; alt.value = item.imageAlt || ''; paint();
  }
  input.addEventListener('change', async () => {
    const file = input.files[0]; if (!file) return;
    const current = ++revision; busy = true; failure = ''; dirty(); message.textContent = 'Preparing picture…';
    try {
      const result = await prepareImage(file);
      if (current !== revision) return;
      picture = result; paint(); message.textContent = 'Picture ready. Save this item to publish it.';
    } catch (error) {
      if (current === revision) { failure = error.message; message.textContent = `${failure} Choose another picture or remove the picture before saving.`; remove.hidden = false; }
    } finally { if (current === revision) { busy = false; input.value = ''; } }
  });
  remove.addEventListener('click', () => { set(); dirty(); message.textContent = 'Picture removed. Save this item to publish the change.'; });
  form.addEventListener('reset', () => { set(); form.dataset.dirty = 'false'; });
  return { set, fields() {
    if (busy) { const error = new Error('Please wait for your picture to finish preparing, then save again.'); error.code = 'image/preparing'; throw error; }
    if (failure) { const error = new Error(`${failure} Choose another picture or remove the picture before saving.`); error.code = 'image/invalid'; throw error; }
    return picture ? { image: picture, imageAlt: alt.value.trim() } : {};
  } };
}
