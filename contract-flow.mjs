import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,onAuthStateChanged,signOut,sendEmailVerification} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {getFirestore,doc,getDoc,runTransaction,serverTimestamp,onSnapshot} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {profileValues,profileDocuments,canSign} from './profile-model.mjs';
import {registrationLink} from './invitation-link.mjs';
const app=initializeApp({apiKey:'AIzaSyDcLpCPu-3eNKtd3j8w51RdiqCvP6L8WlU',authDomain:'lowcut-artist-portal.firebaseapp.com',projectId:'lowcut-artist-portal',appId:'1:483516737605:web:0dc3012d3e1db7db39db2c'});
const auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
const form=$('contractForm'),fields=$('contractFields'),msg=$('accountMessage');
const contractId=new URLSearchParams(location.search).get('contract');
const validId=contractId&&contractId.length<=200&&!contractId.includes('/');
let loaded=null,profile=null,unsubscribe=()=>{},generation=0,busy=false;
let accessMode='login';
const defaults=new Map([...document.querySelectorAll('[data-contract-lang]')].map(el=>[el.dataset.contractLang,el.innerHTML]));
function say(text){msg.textContent=text;if(text&&!document.body.classList.contains('access-pending'))$('contractAccessStatus').textContent=text;}
function accessHeading(title,intro){$('accessTitle').textContent=title;$('accessIntro').textContent=intro;}
function gate(show){document.body.classList.toggle('access-pending',show);$('accountPanel').hidden=!show;$('accountStrip').hidden=show;}
function mode(value){
  accessMode=value;const register=value==='register',needsLink=register&&!validId;
  $('accessLoginTab').setAttribute('aria-selected',String(!register));$('accessRegisterTab').setAttribute('aria-selected',String(register));
  $('accountLogin').hidden=register;$('accountCreate').hidden=!register;
  $('confirmPasswordField').hidden=!register||needsLink;$('accountPasswordConfirm').required=register&&!needsLink;
  $('accountPassword').autocomplete=register?'new-password':'current-password';
  $('accountCredentials').hidden=needsLink;$('accountEmail').required=!needsLink;$('accountPassword').required=!needsLink;
  $('invitationField').hidden=!needsLink;$('invitationLink').required=needsLink;
  $('accountEmail').disabled=needsLink;$('accountPassword').disabled=needsLink;
  $('invitationLink').disabled=!needsLink;$('accountPasswordConfirm').disabled=!register||needsLink;
  $('accountCreate').textContent=needsLink?'CONTINUAR CON MI INVITACIÓN':'CREAR MI CUENTA';
  accessHeading(register?'CREAR CUENTA':'INICIAR SESIÓN',register?'La misma cuenta te dará acceso al portal y a tus contratos.':'Usá tu cuenta de LOWCUT// Records para continuar.');
  say(needsLink?'El registro de artistas se habilita con una invitación individual.':'');
}
function showContract(text,editableProfile=false){gate(false);$('contractAccessStatus').textContent=text;$('editProfile').hidden=!editableProfile;}
function error(e){console.error(e.code||e.message);say(e.code==='permission-denied'?'No hay permiso para esta invitación. Verificá el email de tu cuenta; si coincide, LOWCUT debe revisar las reglas de Firebase.':e.code?.startsWith('auth/')?'No se pudo completar el acceso. Revisá tus datos o volvé a iniciar sesión.':e.message||'No se pudo completar la operación.');}
function resetAccess(){fields.disabled=true;profile=null;loaded=null;unsubscribe();unsubscribe=()=>{};}
function prefill(p,a){
  const values=profileValues(auth.currentUser,p,a);$('profileName').value=values.name;
  for(const [key,value] of Object.entries({artist_name:values.name,main_artists:values.name,email:values.email}))form.elements[key].value=value;
  form.dispatchEvent(new Event('input',{bubbles:true}));
}
function renderContract(c){
  const custom=!!(c.pageContent?.es||c.pageContent?.en);
  document.querySelector('.terms').style.display=custom?'none':'';
  for(const el of document.querySelectorAll('[data-contract-lang]')){
    const lang=el.dataset.contractLang,text=c.pageContent?.[lang];
    if(text){el.textContent=text;el.style.whiteSpace='pre-wrap';}
    else {el.innerHTML=defaults.get(lang);el.style.whiteSpace='';}
  }
  if(c.title)form.elements.release_title.value=c.title;
  form.dispatchEvent(new Event('input',{bubbles:true}));
}
function renderSavedSignature(c){
  if(c.signature?.acceptedText){for(const el of document.querySelectorAll('[data-contract-lang]')){el.textContent=c.signature.acceptedText;el.style.whiteSpace='pre-wrap';}}
  for(const [name,value] of Object.entries(c.releaseData||{})){const el=form.elements[name];if(!el)continue;if(el.type==='checkbox')el.checked=value==='Sí';else el.value=value;}
  form.dispatchEvent(new Event('input',{bubbles:true}));
}
async function loadAccount(user){
  const token=++generation;resetAccess();gate(true);$('accountForm').hidden=!!user;$('accessTabs').hidden=!!user;$('profilePanel').hidden=!user;$('accountLogout').hidden=!user;
  $('verifyPanel').hidden=true;$('profileEditor').hidden=true;$('missingInvite').hidden=true;
  if(!user){mode(new URLSearchParams(location.search).get('mode')==='register'?'register':'login');return;}
  $('accountIdentity').textContent=user.email||'';
  if(!validId){accessHeading('TU CUENTA','Ya iniciaste sesión con tu cuenta de LOWCUT// Records.');$('missingInvite').hidden=false;say('Abrí un contrato desde el portal para continuar.');return;}
  $('accountVerify').hidden=user.emailVerified;$('accountRefresh').hidden=user.emailVerified;
  $('profileSave').disabled=!user.emailVerified;
  if(!user.emailVerified){accessHeading('VERIFICÁ TU EMAIL','Un paso más para acceder a tu contrato.');$('verifyPanel').hidden=false;say('Después de verificarlo, tocá «Ya verifiqué mi email».');return;}
  accessHeading('CARGANDO TU ACCESO','Estamos comprobando tu perfil y tu contrato.');say('');
  try{
    const snap=await getDoc(doc(db,'contracts',contractId));if(token!==generation)return;
    if(!snap.exists())throw Error('La invitación no existe.');
    loaded=snap.data();
    const userSnap=await getDoc(doc(db,'users',user.uid));if(token!==generation)return;
    profile=userSnap.exists()?userSnap.data():null;
    const admin=profile?.role==='admin'&&profile.active===true;
    if(profile&&(profile.active!==true||(!admin&&profile.role!=='artist')))throw Error('Esta cuenta no tiene acceso activo.');
    let artist=null;
    if(profile?.artistId){const a=await getDoc(doc(db,'artists',profile.artistId));if(token!==generation)return;artist=a.exists()?a.data():null;if(artist?.active===false)throw Error('El perfil artístico está desactivado.');}
    if(!admin)prefill(profile||{},artist||{});renderContract(loaded);
    if(loaded.status==='signed'){renderSavedSignature(loaded);showContract('CONTRATO FIRMADO · '+(loaded.signedAt||'')+' · '+(loaded.signature?.name||'Firma registrada'));$('profileSave').disabled=true;return;}
    if(admin){showContract('VISTA ADMIN · Contrato '+(loaded.active===false?'desactivado':'pendiente'));$('profileSave').disabled=true;return;}
    if(!canSign(loaded,user.uid,user.email))throw Error('La invitación está desactivada o corresponde a otra cuenta.');
    fields.disabled=!(profile&&artist?.active===true);
    if(fields.disabled){accessHeading('COMPLETÁ TU PERFIL','Tu nombre artístico se completará en el contrato y en el portal.');$('profileEditor').hidden=false;say('Guardá tu perfil para continuar.');}
    else showContract((artist.name||profile.name)+' · '+user.email,true);
    // Availability changes lock the form immediately. The transaction also checks at signing time.
    const seenRevision=loaded.pageRevision||1;
    unsubscribe=onSnapshot(doc(db,'contracts',contractId),s=>{
      if(token!==generation)return;
      const c=s.exists()?s.data():null;
      if(!c||!canSign(c,user.uid,user.email)){fields.disabled=true;$('contractAccessStatus').textContent=c?.status==='signed'?'La firma ya quedó registrada.':'La invitación ya no está disponible.';}
      else if((c.pageRevision||1)!==seenRevision){fields.disabled=true;$('contractAccessStatus').textContent='LOWCUT actualizó el texto. Recargá la página y revisalo antes de firmar.';}
    },e=>{fields.disabled=true;error(e);});
  }catch(e){fields.disabled=true;$('profileSave').disabled=true;accessHeading('REVISÁ TU ACCESO','Este contrato necesita una cuenta autorizada por LOWCUT.');error(e);}
}
onAuthStateChanged(auth,loadAccount);
$('accessLoginTab').addEventListener('click',()=>mode('login'));$('accessRegisterTab').addEventListener('click',()=>mode('register'));
$('accountForm').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!$('accountForm').reportValidity())return;
  if(accessMode==='register'&&!validId){try{location.assign(registrationLink($('invitationLink').value.trim()));}catch(e){error(e);}return;}
  if(accessMode==='register'&&$('accountPassword').value!==$('accountPasswordConfirm').value){say('Las contraseñas deben coincidir.');return;}
  busy=true;$('accountLogin').disabled=true;$('accountCreate').disabled=true;
  try{
    if(accessMode==='register'){const c=await createUserWithEmailAndPassword(auth,$('accountEmail').value.trim(),$('accountPassword').value);await sendEmailVerification(c.user);say('Cuenta creada. Revisá tu correo para verificar el email.');}
    else await signInWithEmailAndPassword(auth,$('accountEmail').value.trim(),$('accountPassword').value);
    $('accountPassword').value='';$('accountPasswordConfirm').value='';
  }catch(e){error(e);}finally{busy=false;$('accountLogin').disabled=false;$('accountCreate').disabled=false;}
});
$('accountVerify').addEventListener('click',async()=>{try{await sendEmailVerification(auth.currentUser);say('Verificación enviada. Revisá tu correo.');}catch(e){error(e);}});
$('accountRefresh').addEventListener('click',async()=>{try{await auth.currentUser.reload();await auth.currentUser.getIdToken(true);await loadAccount(auth.currentUser);}catch(e){error(e);}});
async function logout(){++generation;resetAccess();form.reset();$('profileName').value='';await signOut(auth);}
$('accountLogout').addEventListener('click',logout);$('stripLogout').addEventListener('click',logout);
$('editProfile').addEventListener('click',()=>{gate(true);$('profileEditor').hidden=false;accessHeading('TU PERFIL','Podés corregir tu nombre artístico antes de continuar.');say('');window.scrollTo(0,0);});
$('profileSave').addEventListener('click',async()=>{
  if(busy||!validId)return;const user=auth.currentUser;if(!user?.emailVerified)return;busy=true;$('profileSave').disabled=true;fields.disabled=true;
  try{
    const name=$('profileName').value;
    await runTransaction(db,async tx=>{
      const u=doc(db,'users',user.uid),c=await tx.get(doc(db,'contracts',contractId)),p=await tx.get(u);
      if(!c.exists())throw Error('La invitación no existe.');
      const values=profileDocuments(user,p.exists()?p.data():null,c.data(),contractId,name);
      tx.set(u,values.user,{merge:true});tx.set(doc(db,'artists',values.artistId),values.artist,{merge:true});
      tx.update(doc(db,'contracts',contractId),{artistId:values.artistId,artistIds:[values.artistId],authorizedUids:[...new Set([...(c.data().authorizedUids||[]),user.uid])],updatedAt:serverTimestamp()});
    });
    if(auth.currentUser?.uid===user.uid)await loadAccount(user);
  }catch(e){error(e);}finally{busy=false;$('profileSave').disabled=false;}
});
form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||fields.disabled)return;
  if(!form.checkValidity()){form.reportValidity();return;}
  const user=auth.currentUser;if(!user?.emailVerified)return;
  const values=Object.fromEntries(new FormData(form));
  if(values.legal_name.length>150||values.electronic_signature.length>150){$('formError').textContent='El nombre legal admite hasta 150 caracteres.';return;}
  if(values.electronic_signature.trim()!==values.legal_name.trim()){$('formError').textContent='La firma debe coincidir con tu nombre legal.';return;}
  const lang=document.documentElement.lang==='en'?'en':'es';
  const acceptedText=document.querySelector('[data-contract-lang="'+lang+'"]').innerText;
  const revision=loaded.pageRevision||1;
  busy=true;$('submitBtn').disabled=true;$('formError').textContent='';
  try{
    await runTransaction(db,async tx=>{
      const ref=doc(db,'contracts',contractId),snap=await tx.get(ref),u=await tx.get(doc(db,'users',user.uid));
      if(!snap.exists()||!canSign(snap.data(),user.uid,user.email))throw Error('La invitación ya no está disponible.');
      const c=snap.data(),p=u.data();
      if(!p||p.active!==true||p.role!=='artist')throw Error('Completá tu perfil antes de firmar.');
      const artist=await tx.get(doc(db,'artists',p.artistId));
      if(!artist.exists()||artist.data().active!==true)throw Error('Tu perfil artístico no está activo.');
      if((c.pageRevision||1)!==revision)throw Error('El texto cambió. Recargá y revisá la nueva versión.');
      tx.update(ref,{status:'signed',artistId:p.artistId,artistIds:[p.artistId],authorizedUids:[...new Set([...(c.authorizedUids||[]),user.uid])],signedAt:values.signature_date,signedAtTimestamp:serverTimestamp(),signedBy:user.uid,
        signature:{name:values.electronic_signature,legalName:values.legal_name,email:user.email,contactEmail:values.email,language:lang,acceptedText,pageRevision:revision},releaseData:values,updatedAt:serverTimestamp()});
    });
    fields.disabled=true;unsubscribe();document.querySelector('.shell').style.display='none';document.querySelector('.hero').style.display='none';$('success').style.display='grid';window.scrollTo(0,0);
  }catch(e){$('formError').textContent=e.message||'No se pudo guardar la firma. Intentá nuevamente.';}
  finally{busy=false;$('submitBtn').disabled=false;}
});

