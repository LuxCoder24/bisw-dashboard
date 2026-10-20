const fields = ['title','date','time','location','audience','description','image','imageAlt'];
// Copy only fields accepted by the existing featured-event rules.
export function featuredEvent(event) {
  return Object.fromEntries(fields.filter(key => typeof event[key] === 'string' && event[key] !== '').map(key => [key, event[key]]));
}
export function isFeatured(event, feature) {
  return !!feature && fields.every(key => (event[key] || '') === (feature[key] || ''));
}
