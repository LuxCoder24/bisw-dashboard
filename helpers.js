import {validImage} from './images.js';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dcDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export const dateLabel = date => date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
export function timeLabel(time) {if(!time)return '';const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
export const hasContent = item => !!item && (['title','description','detail'].some(key=>typeof item[key]==='string'&&item[key].trim()) || validImage(item.image));
export const isCurrent = (item,today=dcDate()) => !!item && (!item.date || item.date>=today);
export const contentOrder = (a,b) => ((a.date||'9999-12-31')+(a.time||'')).localeCompare((b.date||'9999-12-31')+(b.time||''));
export const upcoming = (items, today = dcDate()) => items.filter(x=>hasContent(x)&&isCurrent(x,today)).sort(contentOrder);
export function activeView(display, feature, alert, now = Date.now()) {
  if (!display || display.expiresAt <= now) return 'dashboard';
  if (display.view==='event' && hasContent(feature) && isCurrent(feature,dcDate(new Date(now)))) return 'event';
  if (display.view==='alert' && hasContent(alert)) return 'alert';
  return 'dashboard';
}
