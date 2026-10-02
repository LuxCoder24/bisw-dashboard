import { esc, dateLabel, timeLabel } from './helpers.js';
import { imageMarkup } from './images.js';

// Give long college-visit notes multiple readable slides instead of cutting them off.
export function eventPages(events) {
  return events.flatMap((event, eventIndex) => {
    let remaining = String(event.description || '').trim();
    const budget = imageMarkup(event) ? 180 : 280, chunks = [];
    while (remaining) {
      let end = 0, units = 0;
      // Paragraph breaks also use space on a television, even in short notes.
      while (end < remaining.length && units + (remaining[end] === '\n' ? 28 : 1) <= budget) {
        units += remaining[end] === '\n' ? 28 : 1; end++;
      }
      if (end === remaining.length) break;
      const space = Math.max(remaining.lastIndexOf(' ', end), remaining.lastIndexOf('\n', end));
      if (space > 0) end = space;
      end = Math.max(1, end);
      chunks.push(remaining.slice(0, end).trim()); remaining = remaining.slice(end).trim();
    }
    chunks.push(remaining);
    return chunks.map((description, page) => ({...event,description,eventIndex,page,pages:chunks.length}));
  });
}

export function createEventCarousel(section, interval = 12000) {
  const target = section.querySelector('#events'), count = section.querySelector('#event-position');
  let items = [], eventCount = 0, index = 0, signature = '', visible = true, timer;
  const stopped = () => !visible || document.hidden;
  function schedule() {
    clearTimeout(timer);
    if (items.length > 1 && !stopped()) timer = setTimeout(() => { index = (index + 1) % items.length; paint(); schedule(); }, interval);
  }
  function paint() {
    const item = items[index];
    target.innerHTML = item ? `<article class="event-slide${imageMarkup(item) ? ' has-image' : ''}"><div class="event-text"><div class="event-meta"><span>${esc(dateLabel(item.date))}</span><span>${esc(timeLabel(item.time))}</span></div><h3>${esc(item.title)}</h3><p class="event-location">${esc(item.location)}</p><p class="event-description"${item.description ? '' : ' hidden'}>${esc(item.description)}</p><span class="small-tag">${esc(item.audience)}</span></div>${imageMarkup(item, 'event-image')}</article>` : '<p class="empty-state">No upcoming events.</p>';
    count.hidden = items.length < 2;
    count.textContent = item ? `${item.eventIndex + 1} / ${eventCount}${item.pages > 1 ? ` · Details ${item.page + 1} / ${item.pages}` : ''}` : '';
    section.setAttribute('aria-label', item ? `Upcoming events, event ${item.eventIndex + 1} of ${eventCount}, details ${item.page + 1} of ${item.pages}` : 'Upcoming events');
    target.setAttribute('aria-live', 'off');
  }
  document.addEventListener('visibilitychange', schedule);
  return {
    update(next, isVisible = true) {
      const nextSignature = JSON.stringify(next);
      const visibilityChanged = visible !== isVisible;
      visible = isVisible;
      if (signature !== nextSignature) {
        const selected = items[index];
        eventCount = next.length; items = eventPages(next);
        index = Math.max(0, items.findIndex(item => item.id === selected?.id && item.page === selected?.page));
        signature = nextSignature; paint(); schedule();
      } else if (visibilityChanged) schedule();
    }
  };
}
