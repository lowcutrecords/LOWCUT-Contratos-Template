export const DRAFT_FIELDS=['legal_name','artist_name','email','release_title','release_type','main_artists','featuring','producers','authors','release_date','genre','explicit','master_owner','credits'];
export function pickDraftData(values){return Object.fromEntries(DRAFT_FIELDS.map(key=>[key,String(values[key]||'').trim()]));}

