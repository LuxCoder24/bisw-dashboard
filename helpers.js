export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dcDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export const dateLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'});
export function timeLabel(time) {const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
export const upcoming = (items, today = dcDate()) => items.filter(x=>x.date>=today).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
export function activeView(display, feature, alert, now = Date.now()) {
  if (!display || display.expiresAt <= now) return 'dashboard';
  if (display.view==='event' && feature?.title && feature.date>=dcDate(new Date(now))) return 'event';
  if (display.view==='alert' && alert?.title) return 'alert';
  return 'dashboard';
}
