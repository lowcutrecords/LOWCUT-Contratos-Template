const zone='America/Argentina/Buenos_Aires';
export function dateKey(date=new Date()){
  const parts=new Intl.DateTimeFormat('en',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=type=>parts.find(p=>p.type===type).value;return get('year')+'-'+get('month')+'-'+get('day');
}
export function addCalendarDays(key,days){const [y,m,d]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+days,12)).toISOString().slice(0,10);}
export function minimumReleaseDate(reference){const date=reference?.toDate?reference.toDate():new Date(reference);if(!Number.isFinite(date.getTime()))throw Error('No se pudo determinar el inicio del plazo.');return addCalendarDays(dateKey(date),14);}
export function validReleaseDate(value,minimum){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value&&value>=minimum;}

