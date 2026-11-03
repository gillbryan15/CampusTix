/* CampusTix app logic
   Sections: data, helpers, participant screens, organizer screens, QR scanning. */

const $=s=>document.querySelector(s),KEY='campustix_profile',API='api.php',FEE=0.5;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const G=['#c7d2fe,#a5b4fc','#fbcfe8,#f9a8d4','#bbf7d0,#86efac','#fde68a,#fcd34d','#bae6fd,#7dd3fc','#ddd6fe,#c4b5fd'];
const seed=()=>({events:[
{id:'e1',title:'UMS Fun Run 2026',date:'2026-11-14T06:30',venue:'Dewan Besar Canselor',price:12,cap:200,emoji:'🏃',desc:'5km campus run with Group A and Group B categories.'},
{id:'e2',title:'Hackathon: Build for Sabah',date:'2026-11-21T09:00',venue:'FKI Lab 3',price:8,cap:80,emoji:'💻',desc:'24-hour hackathon. Meals included.'},
{id:'e3',title:'Malam Kebudayaan',date:'2026-11-28T20:00',venue:'Panggung Auditorium',price:5,cap:300,emoji:'🎭',desc:'Cultural night with performances from every college.'},
{id:'e4',title:'Career Talk: Tech Industry',date:'2026-12-02T14:00',venue:'Dewan Kuliah A',price:0,cap:150,emoji:'🎤',desc:'Free talk with industry speakers.'},
{id:'e5',title:'Charity Futsal Cup',date:'2026-12-06T08:00',venue:'Gelanggang Futsal',price:20,cap:64,emoji:'⚽',desc:'Team registration. All proceeds go to charity.'},
{id:'e6',title:'Photography Workshop',date:'2026-12-12T10:00',venue:'Studio Media',price:15,cap:40,emoji:'📷',desc:'Hands-on workshop with a pro photographer.'}],regs:[],profile:{}});
/* ---------- Shared data (synced with api.php) ---------- */
let S={events:[],regs:[],profile:{}},server={events:[],regs:[]},pending=0;
try{S.profile=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
const copy=o=>JSON.parse(JSON.stringify(o));
// What changed in collection c since the last server snapshot
function diff(c){
 const old=new Map(server[c].map(x=>[x.id,JSON.stringify(x)])),now=new Set(S[c].map(x=>x.id));
 return{upsert:S[c].filter(x=>old.get(x.id)!==JSON.stringify(x)),delete:[...old.keys()].filter(id=>!now.has(id))}}
function adopt(d){S.events=d.events;S.regs=d.regs;server=copy(d)}
async function save(extra){
 try{localStorage.setItem(KEY,JSON.stringify(S.profile))}catch(e){}
 pending++;
 try{const r=await fetch(API,{method:'POST',body:JSON.stringify({events:diff('events'),regs:diff('regs'),...extra})});adopt(await r.json())}
 catch(e){toast('Cannot reach the server')}
 pending--}
// Every 3 seconds, pull in changes made by other users and redraw if anything changed
let shownTicket=null; // id of the ticket whose QR is open on this device
async function poll(){
 if(pending)return;
 try{const d=await(await fetch(API)).json();
  if(JSON.stringify([d.events,d.regs])!==JSON.stringify([server.events,server.regs])){adopt(d);render();if(shownTicket){const t=S.regs.find(x=>x.id===shownTicket);if(t&&t.in)checkedInView(t)}}}catch(e){}}
async function init(){
 try{const d=await(await fetch(API)).json();adopt(d);
  if(!d.init){S.events=seed().events;await save({init:true})}}
 catch(e){toast('Server not reachable. Open this through XAMPP.')}
 render();setInterval(poll,2000)}
let role='p',tab='browse',q='',view=null;
const fmt=d=>new Date(d).toLocaleString('en-MY',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
const rm=n=>n?'RM'+Number(n).toFixed(2):'Free';
const left=e=>e.cap-S.regs.filter(r=>r.eid===e.id).length;
const ev=id=>S.events.find(e=>e.id===id);
function toast(t){const x=$('#toast');x.textContent=t;x.style.display='block';setTimeout(()=>x.style.display='none',2200)}
function open(h){$('#md').innerHTML=h;$('#ov').classList.add('on');document.querySelectorAll('[data-qr]').forEach(el=>{el.innerHTML='';new QRCode(el,{text:el.dataset.qr,width:240,height:240,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.L})})}
function closeModal(){shownTicket=null;stopCam();$('#ov').classList.remove('on')}
$('#ov').onclick=e=>{if(e.target.id==='ov')closeModal()};
$('#rp').onclick=()=>{role='p';tab='browse';view=null;$('#rp').className='on';$('#ro').className='';render()};
$('#ro').onclick=()=>{role='o';tab='dash';view=null;$('#ro').className='on';$('#rp').className='';render()};
function render(){
 const T=role==='p'?[['browse','Browse events'],['tickets','My tickets']]:[['dash','My events']];
 $('#tabs').innerHTML=T.map(([k,l])=>`<button class="tab ${tab===k?'on':''}" onclick="tab='${k}';view=null;render()">${l}</button>`).join('');
 $('#main').innerHTML=role==='p'?(tab==='browse'?browse():tickets()):(view?detail():dash());
}
/* PARTICIPANT */
function browse(){
 const L=S.events.filter(e=>(e.title+e.venue).toLowerCase().includes(q.toLowerCase()));
 return `<div class="bar"><input placeholder="Search events…" value="${esc(q)}" oninput="q=this.value;render();this.focus()"></div>`+
 (L.length?`<div class="grid">${L.map(card).join('')}</div>`:'<div class="empty">No events found.</div>');
}
function card(e){const i=S.events.indexOf(e),n=left(e);
 return `<div class="card"><div class="banner" style="background:linear-gradient(135deg,${G[i%6]})">${esc(e.emoji)}</div><div class="cb"><h3>${esc(e.title)}</h3>
 <div class="mut">📅 ${fmt(e.date)}</div><div class="mut">📍 ${esc(e.venue)}</div><div class="mut">${esc(e.desc)}</div>
 <div class="row"><span class="price">${rm(e.price)}</span><button class="btn sm" ${n<=0?'disabled':''} onclick="reg('${e.id}')">${n<=0?'Sold out':'Register'}</button></div>
 <span class="pill">${n} spots left</span></div></div>`}
function reg(id){const e=ev(id),p=S.profile;
 open(`<h2>${esc(e.title)}</h2><div class="mut">${fmt(e.date)} · ${esc(e.venue)}</div>
 <label>Full name</label><input id="f_n" value="${esc(p.name)}">
 <div class="two"><div><label>Matric number</label><input id="f_m" value="${esc(p.matric)}" placeholder="BI2312345"></div><div><label>Phone</label><input id="f_p" value="${esc(p.phone)}" placeholder="012-3456789"></div></div>
 <label>Email</label><input id="f_e" type="email" value="${esc(p.email)}">
 <div class="mut" style="margin-top:14px">Ticket ${rm(e.price)}${e.price?` + platform fee ${rm(FEE)}`:''}</div>
 <div id="err" style="color:#dc2626;font-size:13px;min-height:18px"></div>
 <div class="row"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="pay('${id}')">${e.price?'Pay '+rm(e.price+FEE):'Get free ticket'}</button></div>`)}
function pay(id){const e=ev(id),v=k=>$('#f_'+k).value.trim(),err=m=>$('#err').textContent=m;
 const p={name:v('n'),matric:v('m').toUpperCase(),phone:v('p'),email:v('e')};
 if(!p.name||!p.matric||!p.phone||!p.email)return err('Please fill in all fields.');
 if(!/^\S+@\S+\.\S+$/.test(p.email))return err('Enter a valid email.');
 if(!/^[0-9+\- ]{9,15}$/.test(p.phone))return err('Enter a valid phone number.');
 if(S.regs.some(r=>r.eid===id&&r.matric===p.matric))return err('This matric number is already registered.');
 if(left(e)<=0)return err('Sorry, this event is full.');
 S.profile=p;
 open(`<div class="c"><div class="spin"></div><b>Processing payment…</b></div>`);
 setTimeout(()=>{const r={...p,id:'r'+Date.now()+Math.random().toString(36).slice(2,5),eid:id,code:'CT-'+id.toUpperCase()+'-'+Math.random().toString(36).slice(2,8).toUpperCase(),paid:e.price?e.price+FEE:0,at:Date.now(),in:null};
  S.regs.push(r);save();done(r,true)},1300)}
function done(r,anim){const e=ev(r.eid);
 if(r.in&&!anim)return checkedInView(r);
 shownTicket=r.id;
 open(`<div class="c ${anim?'pop':''}">${anim?`<svg class="chk" viewBox="0 0 52 52"><circle cx="26" cy="26" r="25"/><path d="M14 27l8 8 16-17"/></svg><h2>Payment Completed</h2><div class="mut">You’re in! Show this QR at the urusetia table.</div>`:`<h2>${esc(e.title)}</h2>`}
 <div class="qr" data-qr="${r.code}"></div><b>${esc(r.name)}</b><div class="mut">${esc(r.matric)} · ${r.code}</div>
 <div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();tab='tickets';render()">${anim?'View my tickets':'Close'}</button></div></div>`);render()}
function tickets(){
 const m=(S.profile.matric||'').toUpperCase(),L=S.regs.filter(r=>r.matric===m);
 if(!L.length)return `<div class="empty">No tickets yet. Register for an event to get your QR.</div>`;
 return `<div class="grid">${L.map(r=>{const e=ev(r.eid)||{title:'Event removed',date:r.at,venue:''};return `<div class="card"><div class="cb"><h3>${esc(e.title)}</h3><div class="mut">📅 ${fmt(e.date)}</div><div class="mut">📍 ${esc(e.venue)}</div>
 <span class="pill ${r.in?'ok':''}">${r.in?'Checked in':'Ready to scan'}</span><div class="row"><button class="btn sm" onclick='done(S.regs.find(x=>x.id=="${r.id}"),false)'>Show QR</button></div></div></div>`}).join('')}</div>`}
/* ORGANIZER */
function dash(){
 return `<div class="bar"><button class="btn" onclick="form()">+ Create event</button></div>`+
 (S.events.length?`<div class="grid">${S.events.map(e=>{const R=S.regs.filter(r=>r.eid===e.id),A=R.filter(r=>r.in).length;
 return `<div class="card"><div class="cb"><h3>${esc(e.emoji)} ${esc(e.title)}</h3><div class="mut">📅 ${fmt(e.date)}</div><div class="mut">📍 ${esc(e.venue)}</div>
 <div class="mut">${R.length}/${e.cap} registered · ${A} attended · ${rm(e.price)}</div>
 <div class="row"><button class="btn sm" onclick="view='${e.id}';render()">Participants</button><button class="btn ghost sm" onclick="form('${e.id}')">Edit</button><button class="btn ghost sm red" onclick="del('${e.id}')">Delete</button></div></div></div>`}).join('')}</div>`:'<div class="empty">No events yet. Create your first one.</div>');
}
function form(id){const e=id?ev(id):{title:'',date:'',venue:'',price:0,cap:100,emoji:'🎉',desc:''};
 open(`<h2>${id?'Edit':'New'} event</h2><label>Title</label><input id="g_t" value="${esc(e.title)}">
 <div class="two"><div><label>Date & time</label><input id="g_d" type="datetime-local" value="${esc(e.date)}"></div><div><label>Emoji</label><input id="g_x" value="${esc(e.emoji)}" maxlength="2"></div></div>
 <label>Venue</label><input id="g_v" value="${esc(e.venue)}">
 <div class="two"><div><label>Price (RM, 0 = free)</label><input id="g_p" type="number" min="0" step="0.5" value="${e.price}"></div><div><label>Capacity</label><input id="g_c" type="number" min="1" value="${e.cap}"></div></div>
 <label>Description</label><textarea id="g_s" rows="3">${esc(e.desc)}</textarea><div id="err" style="color:#dc2626;font-size:13px;min-height:18px"></div>
 <div class="row"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveEv('${id||''}')">Save</button></div>`)}
function saveEv(id){const v=k=>$('#g_'+k).value.trim();
 const o={title:v('t'),date:v('d'),venue:v('v'),price:Math.max(0,+v('p')||0),cap:Math.max(1,+v('c')||1),emoji:v('x')||'🎉',desc:v('s')};
 if(!o.title||!o.date||!o.venue)return $('#err').textContent='Title, date and venue are required.';
 if(id)Object.assign(ev(id),o);else S.events.push({id:'e'+Date.now()+Math.random().toString(36).slice(2,5),...o});
 save();closeModal();render();toast('Event saved')}
function del(id){if(!confirm('Delete this event and its registrations?'))return;S.events=S.events.filter(e=>e.id!==id);S.regs=S.regs.filter(r=>r.eid!==id);save();render()}
let sq='';
function detail(){const e=ev(view);if(!e){view=null;return dash()}
 const R=S.regs.filter(r=>r.eid===e.id).sort((a,b)=>a.name.localeCompare(b.name)),A=R.filter(r=>r.in).length,
 L=R.filter(r=>(r.name+r.matric).toLowerCase().includes(sq.toLowerCase()));
 return `<button class="btn ghost sm" onclick="view=null;render()">← Back</button><h2 style="margin:14px 0 0">${esc(e.emoji)} ${esc(e.title)}</h2><div class="mut">${fmt(e.date)} · ${esc(e.venue)}</div>
 <div class="stats"><div class="stat"><b>${R.length}</b>Registered</div><div class="stat"><b>${A}</b>Attended</div><div class="stat"><b>${R.length-A}</b>Not yet in</div><div class="stat"><b>${rm(R.reduce((s,r)=>s+(r.paid?e.price:0),0))}</b>Ticket sales</div></div>
 <div class="bar"><button class="btn" onclick="cam()">📷 Scan QR with camera</button><label class="btn ghost" style="margin:0;cursor:pointer;display:inline-block;font-size:15px;color:var(--pri)">Upload QR photo<input type="file" accept="image/*" capture="environment" hidden onchange="fromImg(this)"></label></div>
 <div class="bar"><input id="scan" placeholder="Or type the ticket code (CT-…)"><button class="btn ghost" onclick="scan()">Check in</button></div>
 <div class="bar"><input placeholder="Search name or matric…" value="${esc(sq)}" oninput="sq=this.value;render();this.focus()"></div>
 ${L.length?`<div class="tw"><table><tr><th>Name</th><th>Matric</th><th>Phone</th><th>Email</th><th>Attendance</th><th></th></tr>${L.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.matric)}</td><td>${esc(r.phone)}</td><td>${esc(r.email)}</td>
 <td><span class="pill ${r.in?'ok':''}">${r.in?'Hadir '+new Date(r.in).toLocaleTimeString('en-MY',{hour:'numeric',minute:'2-digit'}):'Absent'}</span></td>
 <td><button class="btn ghost sm" onclick="tog('${r.id}')">${r.in?'Undo':'Check in'}</button></td></tr>`).join('')}</table></div>`:'<div class="empty">No participants yet. List is sorted A–Z.</div>'}`}
function tog(id){const r=S.regs.find(x=>x.id===id);r.in=r.in?null:Date.now();save();render()}
function checkIn(c){c=(c||'').trim().toUpperCase();const r=S.regs.find(x=>x.code===c&&x.eid===view);
 if(!r)return{ok:0,msg:S.regs.some(x=>x.code===c)?'Ticket is for a different event':'Unknown ticket: '+c.slice(0,20)};
 if(r.in)return{ok:0,msg:r.name+' already checked in'};
 r.in=Date.now();save();render();return{ok:1,reg:r,msg:'✓ '+r.name+' checked in'}}
function scan(){flash(checkIn($('#scan').value))}
let stream=null,raf=0,lock=0,last={code:'',until:0};
function stopCam(){cancelAnimationFrame(raf);if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
async function cam(){
 open(`<h2>Scan ticket</h2><div class="mut">Point the camera at the participant’s QR code. It keeps scanning until you tap Done.</div><video id="vid" playsinline muted style="width:100%;border-radius:14px;margin-top:12px;background:#000"></video><div id="res" class="c" style="min-height:28px;font-weight:700;margin-top:8px"></div><div class="row"><button class="btn ghost" onclick="closeModal()">Done</button></div>`);
 if(typeof jsQR==='undefined'){$('#res').textContent='Scanner library did not load. Check your internet connection and refresh.';$('#res').style.color='#dc2626';return}
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}})}catch(e){$('#res').textContent='Camera blocked or unavailable. Open this page in your phone browser, or use Upload QR photo or type the code.';$('#res').style.color='#dc2626';return}
 const v=$('#vid');v.srcObject=stream;await v.play();$('#res').textContent='Scanning… hold the QR steady and fill the frame';
 const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
 const tick=()=>{if(!stream)return;
  if(v.videoWidth&&Date.now()>lock){cv.width=v.videoWidth;cv.height=v.videoHeight;cx.drawImage(v,0,0);
   const d=cx.getImageData(0,0,cv.width,cv.height),c=jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});
   if(c&&!(c.data===last.code&&Date.now()<last.until)){last={code:c.data,until:Date.now()+6000};lock=Date.now()+1500;flash(checkIn(c.data))}}
  raf=requestAnimationFrame(tick)};
 tick()}
function fromImg(i){const f=i.files[0];if(!f)return;if(typeof jsQR==='undefined')return toast('Scanner library did not load. Refresh the page.');const im=new Image();
 im.onload=()=>{const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const cx=cv.getContext('2d');cx.drawImage(im,0,0);
  const d=cx.getImageData(0,0,cv.width,cv.height),c=jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});c?flash(checkIn(c.data)):toast('No QR found in that photo');URL.revokeObjectURL(im.src)};
 im.src=URL.createObjectURL(f);i.value=''}
/* ---------- Check-in feedback ---------- */
// Organizer: after each scan, close the camera and pop up the result (green check or red cross)
const CHK='<svg class="chk" viewBox="0 0 52 52"><circle cx="26" cy="26" r="25"/><path d="M14 27l8 8 16-17"/></svg>';
const CROSS='<svg class="chk" viewBox="0 0 52 52" style="--ok:#dc2626"><circle cx="26" cy="26" r="25"/><path d="M17 17l18 18M35 17L17 35" style="stroke-dasharray:60;stroke-dashoffset:60"/></svg>';
function flash(r){
 stopCam(); // 1) release the camera
 const g=r.reg,e=g?ev(g.eid):null;
 open(`<div class="c pop">${r.ok?CHK:CROSS}<h2>${r.ok?'Check-in Completed':'Check-in Failed'}</h2>
  ${r.ok?`<b>${esc(g.name)}</b><div class="mut">${esc(g.matric)}</div><div class="mut">${esc(e?e.title:'')}</div>`:`<div class="mut">${esc(r.msg)}</div>`}
  <div class="row" style="justify-content:center;margin-top:14px"><button class="btn ghost" onclick="closeModal()">Done</button><button class="btn" onclick="cam()">Scan next</button></div></div>`); // 2) then show the popup
 beep(r.ok);if(navigator.vibrate)navigator.vibrate(r.ok?80:[60,40,60])}
function beep(ok){
 try{const a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator();o.frequency.value=ok?880:300;o.connect(a.destination);o.start();setTimeout(()=>{o.stop();a.close()},ok?120:260)}catch(e){}}
// Participant: replaces the QR with a confirmation once the organizer has scanned it
function checkedInView(r){
 const e=ev(r.eid)||{title:''};closeModal(); // 1) close the QR
 setTimeout(()=>open(`<div class="c pop"><svg class="chk" viewBox="0 0 52 52"><circle cx="26" cy="26" r="25"/><path d="M14 27l8 8 16-17"/></svg><h2>Check-in Completed</h2><b>${esc(r.name)}</b><div class="mut">${esc(e.title)}</div><div class="mut">Hadir ${new Date(r.in).toLocaleTimeString('en-MY',{hour:'numeric',minute:'2-digit'})}</div><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal()">Close</button></div></div>`),350); // 2) then pop up the confirmation
 if(navigator.vibrate)navigator.vibrate(120)}

init();
