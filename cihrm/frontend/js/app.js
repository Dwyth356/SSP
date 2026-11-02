const $ = (s) => document.querySelector(s);
let currentUser = null;
const themeStorageKey='cihrm-theme';
function applyTheme(theme){
  const isDark=theme==='dark';
  document.documentElement.dataset.theme=isDark?'dark':'light';
  $('#themeIcon').textContent=isDark?'☀':'☾';
  $('#themeLabel').textContent=isDark?'Light mode':'Dark mode';
  $('#themeToggle').setAttribute('aria-label',`Switch to ${isDark?'light':'dark'} mode`);
  $('#themeToggle').title=`Switch to ${isDark?'light':'dark'} mode`;
}
let savedTheme='light';
try{savedTheme=localStorage.getItem(themeStorageKey)==='dark'?'dark':'light'}catch(error){console.warn('Theme preference could not be loaded.',error)}
applyTheme(savedTheme);
$('#themeToggle').addEventListener('click',()=>{
  const nextTheme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  applyTheme(nextTheme);
  try{localStorage.setItem(themeStorageKey,nextTheme)}catch(error){console.warn('Theme preference could not be saved.',error)}
});
const navByRole = {
  student: [['Dashboard','▦'],['Room Availability','▣'],['Guest Management','♙'],['Reservations','▤'],['Check-in / Check-out','⇄'],['Billing and Folio','₱'],['Housekeeping','✧'],['Learning Scenarios','◇'],['Assessments','✓'],['My Learning Progress','◷'],['Activity History','≡'],['My Profile','◎']],
  instructor: [['Dashboard','▦'],['Reservations','▤'],['Check-in / Check-out','⇄'],['Billing and Folio','₱'],['Housekeeping','✧'],['Student Management','♙'],['Learning Scenarios','◇'],['Assessment Management','✓'],['Student Submissions','▤'],['Performance Monitoring','◷'],['Activity & Reports','▧'],['My Profile','◎']],
  admin: [['Dashboard','▦'],['User Management','♙'],['Room Management','▣'],['Guest Management','♧'],['Reservation Management','▤'],['Check-in / Check-out','⇄'],['Billing and Folio','₱'],['Housekeeping','✧'],['Learning Scenarios','◇'],['Assessment Management','✓'],['System Settings','⚙'],['Activity & Reports','▧'],['My Profile','◎']]
};
const api = async (url, options={}) => {
  const endpoint = new URL('../backend/api.php', window.location.href);
  endpoint.searchParams.set('route', url);
  const res = await fetch(endpoint,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.message||'Request failed');
  return data;
};
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function showApp(user){
  currentUser=user;$('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');
  $('#topName').textContent=user.full_name;$('#topRole').textContent=user.role;$('#avatar').textContent=user.full_name[0].toUpperCase();
  $('#sideUser').textContent=`${user.full_name} · ${user.role}`;
  $('.topbar').appendChild($('#themeToggle'));
  $('#navigation').innerHTML=navByRole[user.role].map(([n,i])=>`<button class="nav-link" data-page="${n}"><span>${i}</span><span>${n}</span></button>`).join('');
  $('#navigation').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)renderPage(b.dataset.page)});
  renderPage('Dashboard');
}
function showLogin(){currentUser=null;$('#appView').classList.add('hidden');$('#loginView').classList.remove('hidden');document.body.prepend($('#themeToggle'))}
function setAuthMode(mode){
  const signup=mode==='signup';
  $('#loginForm').classList.toggle('hidden',signup);
  $('#signupForm').classList.toggle('hidden',!signup);
  $('#authHeading').textContent=signup?'Create your account':'Welcome back';
  $('#authDescription').textContent=signup?'Sign up as a student to access the training workspace.':'Sign in to your hotel operations training workspace.';
  $('#authSwitchPrompt').textContent=signup?'Already registered?':'New here?';
  $('#authSwitch').textContent=signup?'Sign in':'Create a student account';
  $('#loginError').textContent='';
  $('#signupError').textContent='';
}
$('#authSwitch').addEventListener('click',()=>setAuthMode($('#signupForm').classList.contains('hidden')?'signup':'login'));
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#loginError').textContent='';try{const d=await api('/auth/login',{method:'POST',body:JSON.stringify({email:$('#email').value,password:$('#password').value})});showApp(d.user)}catch(err){$('#loginError').textContent=err instanceof TypeError?'Cannot reach the C.I.H.R.M. server. Start the PHP server and open http://127.0.0.1:3000.':err.message}});
$('#signupForm').addEventListener('submit',async e=>{
  e.preventDefault();
  $('#signupError').textContent='';
  const password=$('#signupPassword').value;
  if(password!==$('#signupConfirmPassword').value){
    $('#signupError').textContent='Passwords do not match.';
    return;
  }
  try{
    const data=await api('/auth/register',{method:'POST',body:JSON.stringify({
      full_name:$('#signupName').value,
      email:$('#signupEmail').value,
      password
    })});
    showApp(data.user);
  }catch(err){
    $('#signupError').textContent=err instanceof TypeError?'Cannot reach the C.I.H.R.M. server. Start the PHP server and open http://127.0.0.1:3000.':err.message;
  }
});
$('#togglePassword').onclick=()=>{const p=$('#password');p.type=p.type==='password'?'text':'password';$('#togglePassword').textContent=p.type==='password'?'Show':'Hide'};
$('#logoutBtn').onclick=async()=>{try{await api('/auth/logout',{method:'POST'})}finally{showLogin()}};
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
async function renderPage(page){
  $('#pageHeading').textContent=page;
  document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('#sidebar').classList.remove('open');
  const content=$('#content');content.innerHTML='<div class="panel empty">Loading workspace…</div>';
  try{
    if(page==='Dashboard') return await dashboard();
    if(page==='Check-in / Check-out') return await frontDesk();
    if(page==='Billing and Folio') return await billing();
    if(page==='Housekeeping') return await housekeeping();
    if(page==='My Learning Progress') return await learningProgress();
    if(page.includes('Room')) return await rooms(page);
    if(page.includes('Guest')) return await guests();
    if(page.includes('Reservation')) return await reservations();
    if(page==='Activity & Reports') return await reports();
    if(page.includes('Activity')) return await activity(page);
    if(page.includes('Scenario')) return await scenarios();
    if(page.includes('Assessment')||page.includes('Submission')||page.includes('Performance')) return await assessments();
    if(page==='Student Management') return await members();
    if(page==='User Management') return await users();
    if(page==='My Profile') return profile();
    content.innerHTML=`<div class="welcome"><div><span class="eyebrow">TRAINING WORKSPACE</span><h2>${page}</h2><p>This module is part of the C.I.H.R.M. learning workflow.</p></div></div><div class="panel"><h3>${page}</h3><p class="role-note">This module is not available in this build.</p></div>`;
  }catch(err){content.innerHTML=`<div class="panel"><p class="error">${err.message}</p></div>`}
}
async function dashboard(){
 const d=await api('/dashboard');
 const isAdmin=currentUser.role==='admin',isInst=currentUser.role==='instructor';
 const stats=isAdmin?[['Total Users',d.users.totalUsers],['Students',d.users.students],['Instructors',d.users.instructors],['Total Rooms',d.rooms.totalRooms],['Available Rooms',d.rooms.availableRooms||0],['Occupied Rooms',d.rooms.occupiedRooms||0],['Reservations',d.reservations.totalReservations],['Pending Reservations',d.reservations.pendingReservations||0]]:
 isInst?[['Total Students',d.users.students],['Learning Scenarios', (await api('/scenarios')).length],['Assessments', (await api('/assessments')).length],['Active Rooms',d.rooms.availableRooms||0]]:
 [['Total Reservations',d.reservations.totalReservations],['Available Rooms',d.rooms.availableRooms||0],['Occupied Rooms',d.rooms.occupiedRooms||0],['Pending Reservations',d.reservations.pendingReservations||0],['Completed Check-ins',d.reservations.checkedIn||0],['Completed Check-outs',d.reservations.checkedOut||0]];
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">OVERVIEW / ${currentUser.role.toUpperCase()}</span><h2>Good day, ${currentUser.full_name.split(' ')[0]}.</h2><p>Here is your hotel operations learning overview.</p></div><span class="pill">● Training environment</span></div><div class="stats">${stats.map(([l,v])=>`<div class="stat"><span class="label">${l}</span><strong>${v??0}</strong><small>Live database data</small></div>`).join('')}</div><div class="grid-two"><div class="panel"><div class="panel-head"><div><h3>Recent reservations</h3><p>Latest reservation activity</p></div><span class="pill">Updated live</span></div>${reservationTable(d.recent)}</div><div class="panel"><div class="panel-head"><div><h3>Quick actions</h3><p>Common front-desk tasks</p></div></div><div class="quick-grid"><button class="quick" onclick="renderPage('Guest Management')">＋ Register guest<span>Create a guest profile</span></button><button class="quick" onclick="renderPage('Reservations')">▤ New reservation<span>Book an available room</span></button><button class="quick" onclick="renderPage('Room Availability')">▣ View rooms<span>Check room readiness</span></button><button class="quick" onclick="renderPage('Learning Scenarios')">◇ Practice scenario<span>Build hospitality skills</span></button></div></div></div>`;
}
function reservationTable(rows){if(!rows.length)return '<div class="empty">No reservations recorded yet.</div>';return `<div class="table-wrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.guest_name)}</td><td>${esc(r.room_number)}</td><td>${String(r.check_in_date).slice(0,10)} – ${String(r.check_out_date).slice(0,10)}</td><td><span class="status ${statusClass(r.reservation_status)}">${r.reservation_status}</span></td></tr>`).join('')}</tbody></table></div>`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function statusClass(s){return String(s||'').toLowerCase().replace(/[^a-z]/g,'')}
async function rooms(page){
 const data=await api('/rooms');const canEdit=currentUser.role==='admin';
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">ROOM INVENTORY</span><h2>${page}</h2><p>Room readiness and occupancy overview.</p></div>${canEdit?'<button class="btn primary" id="addRoom">＋ Add room</button>':''}</div><div class="panel"><div class="toolbar"><input id="roomSearch" placeholder="Search room number or type…"><select id="roomFilter"><option value="">All housekeeping statuses</option><option>Clean</option><option>Dirty</option><option>Cleaning</option><option>Maintenance</option></select></div><div id="roomTable"></div></div>`;
 const draw=()=>{const q=$('#roomSearch').value.toLowerCase(),f=$('#roomFilter').value;const list=data.filter(r=>(r.room_number+r.room_type).toLowerCase().includes(q)&&(!f||r.housekeeping_status===f));$('#roomTable').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Room</th><th>Type</th><th>Floor</th><th>Rate / night</th><th>Capacity</th><th>Housekeeping</th><th>Occupancy</th>${canEdit?'<th>Action</th>':''}</tr></thead><tbody>${list.map(r=>`<tr><td><b>${esc(r.room_number)}</b></td><td>${esc(r.room_type)}</td><td>${r.floor}</td><td>₱${Number(r.rate).toLocaleString()}</td><td>${r.max_occupancy}</td><td>${esc(r.housekeeping_status)}</td><td><span class="status ${statusClass(r.occupancy_status)}">${r.occupancy_status}</span></td>${canEdit?`<td><button class="btn secondary" onclick="editRoom('${r.room_id}')">Edit</button></td>`:''}</tr>`).join('')}</tbody></table></div>`||'<div class="empty">No rooms found.</div>'};
 $('#roomSearch').oninput=draw;$('#roomFilter').onchange=draw;draw();
 if(canEdit)$('#addRoom').onclick=()=>roomForm();
 window.editRoom=id=>{const r=data.find(x=>x.room_id===id);roomForm(r)};
}
function roomForm(r={}){const modal=prompt(r.room_id?'Edit housekeeping status (Clean, Dirty, Cleaning, Maintenance):':'Enter room number, room type, floor, rate, max occupancy separated by commas:',r.room_id?r.housekeeping_status:'');if(modal===null)return;if(r.room_id){const status=modal.trim();api('/rooms/'+r.room_id,{method:'PUT',body:JSON.stringify({...r,housekeeping_status:status})}).then(x=>{toast(x.message);renderPage('Room Management')}).catch(e=>toast(e.message))}else{const [room_number,room_type,floor,rate,max_occupancy]=modal.split(',').map(x=>x.trim());api('/rooms',{method:'POST',body:JSON.stringify({room_number,room_type,floor,rate,max_occupancy})}).then(x=>{toast(x.message);renderPage('Room Management')}).catch(e=>toast(e.message))}}
async function guests(){
 const rows=await api('/guests');
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">GUEST RELATIONS</span><h2>Guest Management</h2><p>Maintain guest profiles for reservation practice.</p></div><button class="btn primary" id="newGuest">＋ Register guest</button></div><div class="panel"><div class="toolbar"><input id="guestSearch" placeholder="Search guest name or phone…"></div><div id="guestTable"></div></div>`;
 const draw=()=>{const q=$('#guestSearch').value.toLowerCase(),list=rows.filter(g=>(g.full_name+g.phone).toLowerCase().includes(q));$('#guestTable').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Guest name</th><th>Email</th><th>Phone</th><th>Address</th><th>ID type</th></tr></thead><tbody>${list.map(g=>`<tr><td><b>${esc(g.full_name)}</b></td><td>${esc(g.email||'—')}</td><td>${esc(g.phone)}</td><td>${esc(g.address||'—')}</td><td>${esc(g.id_type||'—')}</td></tr>`).join('')}</tbody></table></div>`};
 $('#guestSearch').oninput=draw;draw();
 $('#newGuest').onclick=async()=>{const full_name=prompt('Guest full name:');if(!full_name)return;const phone=prompt('Phone number:');if(!phone)return;const email=prompt('Email (optional):')||'';const address=prompt('Address (optional):')||'';try{const d=await api('/guests',{method:'POST',body:JSON.stringify({full_name,phone,email,address})});toast(d.message);renderPage('Guest Management')}catch(e){toast(e.message)}};
}
async function reservations(){
 const [rows,guestsList,roomsList]=await Promise.all([api('/reservations'),api('/guests'),api('/rooms')]);
 const guestsOptions=guestsList.map(g=>`<option value="${esc(g.guest_id)}">${esc(g.full_name)} · ${esc(g.phone)}</option>`).join('');
 const roomsOptions=roomsList.filter(r=>r.housekeeping_status==='Clean').map(r=>`<option value="${esc(r.room_id)}">Room ${esc(r.room_number)} · ${esc(r.room_type)} · ${Number(r.rate).toLocaleString()} / night · max ${r.max_occupancy}</option>`).join('');
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">FRONT DESK</span><h2>Reservation Management</h2><p>Create and manage reservations; date overlaps and room capacity are checked.</p></div></div><div class="panel"><h3>New reservation</h3><form id="reservationForm" class="form-grid"><label>Guest<select name="guest_id" required><option value="">Select guest</option>${guestsOptions}</select></label><label>Room<select name="room_id" required><option value="">Select clean room</option>${roomsOptions}</select></label><label>Check-in date<input name="check_in_date" type="date" required></label><label>Check-out date<input name="check_out_date" type="date" required></label><label>Number of guests<input name="pax" type="number" min="1" value="1" required></label><label>Booking type<select name="booking_type"><option>Advance</option><option>Walk-in</option></select></label><div class="form-actions"><button class="btn primary" type="submit">Create reservation</button></div><p id="reservationError" class="error"></p></form></div><div class="panel"><h3>Reservations</h3><div id="reservationList"></div></div>`;
 const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 $('#reservationForm [name="check_in_date"]').min=today;
 $('#reservationForm [name="check_out_date"]').min=today;
 drawReservations(rows,'reservationList');
 $('#reservationForm').onsubmit=async e=>{
  e.preventDefault();
  const form=new FormData(e.currentTarget),payload=Object.fromEntries(form.entries());
  payload.pax=Number(payload.pax);
  try{const result=await api('/reservations',{method:'POST',body:JSON.stringify(payload)});toast(result.message);await reservations()}
  catch(error){$('#reservationError').textContent=error.message}
 };
 $('#reservationList').onclick=handleReservationAction;
}
async function frontDesk(){
 const rows=await api('/reservations');
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">FRONT DESK</span><h2>Check-in / Check-out</h2><p>Check in arriving guests and check out current occupants.</p></div></div><div class="panel"><div id="frontDeskList"></div></div>`;
 drawReservations(rows,'frontDeskList');
 $('#frontDeskList').onclick=handleReservationAction;
}
function drawReservations(rows,containerId){
 const container=$(`#${containerId}`);
 if(!rows.length){container.innerHTML='<div class="empty">No reservations recorded yet.</div>';return}
 container.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Guests</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(r=>{
  let action='';
  if(['Pending','Confirmed'].includes(r.reservation_status)){
   action=`<button class="btn secondary" data-reservation-action="check-in" data-id="${esc(r.reservation_id)}">Check in</button> <button class="btn secondary" data-reservation-action="cancel" data-id="${esc(r.reservation_id)}">Cancel</button>`;
  }else if(r.reservation_status==='Checked-in'){
   action=`<button class="btn primary" data-reservation-action="check-out" data-id="${esc(r.reservation_id)}">Check out</button>`;
  }else action='—';
  return `<tr><td><b>${esc(r.guest_name)}</b></td><td>${esc(r.room_number)} · ${esc(r.room_type)}</td><td>${esc(String(r.check_in_date).slice(0,10))} – ${esc(String(r.check_out_date).slice(0,10))}</td><td>${r.pax}</td><td><span class="status ${statusClass(r.reservation_status)}">${esc(r.reservation_status)}</span></td><td>${action}</td></tr>`;
 }).join('')}</tbody></table></div>`;
}
async function handleReservationAction(event){
 const button=event.target.closest('[data-reservation-action]');
 if(!button)return;
 const action=button.dataset.reservationAction,id=button.dataset.id;
 if(action==='cancel'&&!confirm('Cancel this reservation?'))return;
 try{
  const result=await api(`/reservations/${encodeURIComponent(id)}/${action}`,{method:'POST',body:'{}'});
  toast(result.message);
  if($('#pageHeading').textContent==='Check-in / Check-out')await frontDesk();else await reservations();
 }catch(error){toast(error.message)}
}
async function activity(page){const rows=await api('/activity');$('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">AUDIT TRAIL</span><h2>${page}</h2><p>Your recorded actions in the training system.</p></div></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Action</th><th>Timestamp</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.action)}</td><td>${esc(r.timestamp)}</td></tr>`).join('')}</tbody></table></div></div>`}
async function reports(){
 const data=await api('/reports'),summary=data.summary;
 const stats=[['Students',summary.students],['Scenarios',summary.scenarios],['Submissions',summary.submissions],['Pending reviews',summary.pending_reviews||0],['Graded',summary.graded||0],['Average grade',summary.average_percent===null?'—':`${summary.average_percent}%`]];
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">INSTRUCTOR OVERVIEW</span><h2>Activity &amp; Reports</h2><p>Student learning outcomes and the latest system activity.</p></div><button class="btn primary" id="exportReports">Export CSV</button></div><div class="stats">${stats.map(([label,value])=>`<div class="stat"><span class="label">${esc(label)}</span><strong>${esc(value??0)}</strong></div>`).join('')}</div><div class="panel"><div class="panel-head"><div><h3>Learning report</h3><p>Scenario submissions and assessment results</p></div></div>${data.assessments.length?`<div class="table-wrap"><table><thead><tr><th>Student</th><th>Email</th><th>Scenario</th><th>Status</th><th>Score</th><th>Completed</th></tr></thead><tbody>${data.assessments.map(row=>`<tr><td>${esc(row.student_name)}</td><td>${esc(row.email)}</td><td>${esc(row.scenario_title)}</td><td>${esc(row.submission_status)}</td><td>${row.score===null?'—':`${esc(row.score)} / ${esc(row.target_points)}`}</td><td>${esc(row.completed_at||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No student submissions to report yet.</div>'}</div><div class="panel"><div class="panel-head"><div><h3>Activity log</h3><p>Most recent 200 recorded actions</p></div></div>${data.activity.length?`<div class="table-wrap"><table><thead><tr><th>User</th><th>Action</th><th>Timestamp</th></tr></thead><tbody>${data.activity.map(row=>`<tr><td>${esc(row.full_name)}</td><td>${esc(row.action)}</td><td>${esc(row.timestamp)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No activity recorded yet.</div>'}</div>`;
 $('#exportReports').onclick=()=>{
  const rows=[['Report','Student','Email','Scenario','Status','Score','Target points','Completed','Activity user','Action','Timestamp']];
  data.assessments.forEach(row=>rows.push(['Learning',row.student_name,row.email,row.scenario_title,row.submission_status,row.score??'',row.target_points,row.completed_at??'','','','']));
  data.activity.forEach(row=>rows.push(['Activity','','','','','','','',row.full_name,row.action,row.timestamp]));
  const csv=rows.map(row=>row.map(value=>{
   let cell=String(value??'');
   if(/^[=+\-@\t\r]/.test(cell))cell=`'${cell}`;
   return `"${cell.replace(/"/g,'""')}"`;
  }).join(',')).join('\r\n');
  const link=document.createElement('a'),url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
  link.href=url;link.download='cihrm-activity-and-reports.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
}
async function housekeeping(){
 const rows=await api('/housekeeping');
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">ROOM OPERATIONS</span><h2>Housekeeping</h2><p>Update room readiness; occupied rooms cannot be marked clean or under maintenance.</p></div></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Room</th><th>Type</th><th>Occupancy</th><th>Current status</th><th>Current guest</th><th>Update</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.room_number)}</td><td>${esc(r.room_type)}</td><td>${esc(r.occupancy_status)}</td><td><span class="status ${statusClass(r.housekeeping_status)}">${esc(r.housekeeping_status)}</span></td><td>${esc(r.guest_name||'—')}</td><td><select data-housekeeping-room="${esc(r.room_id)}"><option${r.housekeeping_status==='Clean'?' selected':''}>Clean</option><option${r.housekeeping_status==='Dirty'?' selected':''}>Dirty</option><option${r.housekeeping_status==='Cleaning'?' selected':''}>Cleaning</option><option${r.housekeeping_status==='Maintenance'?' selected':''}>Maintenance</option></select> <button class="btn secondary" data-save-housekeeping="${esc(r.room_id)}">Save</button></td></tr>`).join('')}</tbody></table></div></div>`;
 $('#content').onclick=async e=>{
  const button=e.target.closest('[data-save-housekeeping]');
  if(!button)return;
  const roomId=button.dataset.saveHousekeeping;
  const status=$(`[data-housekeeping-room="${CSS.escape(roomId)}"]`).value;
  try{const result=await api(`/housekeeping/${encodeURIComponent(roomId)}`,{method:'PUT',body:JSON.stringify({housekeeping_status:status})});toast(result.message);await housekeeping()}
  catch(error){toast(error.message)}
 };
}
const money=value=>`₱${Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
async function billing(){
 const rows=await api('/folios');
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">GUEST ACCOUNTS</span><h2>Billing and Folio</h2><p>Review room charges, add simulated charges, apply tax/discount, and record simulated payment.</p></div></div>${rows.length?rows.map(f=>`<div class="panel"><div class="panel-head"><div><h3>Folio · ${esc(f.guest_name)} · Room ${esc(f.room_number)}</h3><p>Reservation ${esc(f.reservation_id)} · ${esc(f.check_in_date)} – ${esc(f.check_out_date)} · ${esc(f.reservation_status)}</p></div><span class="status ${statusClass(f.payment_status)}">${esc(f.reservation_status==='Cancelled'?'Cancelled':f.payment_status)}</span></div><div class="table-wrap"><table><thead><tr><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>${f.items.map(i=>`<tr><td>${esc(i.description)}</td><td>${esc(i.category)}</td><td>${money(i.amount)}</td></tr>`).join('')||'<tr><td colspan="3">No items yet.</td></tr>'}</tbody></table></div><p class="role-note">Subtotal: ${money(f.subtotal)} · Discount (${esc(f.discount_type||'None')}): ${f.discount_type==='Percent'?`${Number(f.discount_amount).toFixed(2)}%`:money(f.discount_amount)} · Tax (${Number(f.tax_rate).toFixed(2)}%): ${money(f.tax_amount)} · <b>Total: ${money(f.grand_total)}</b></p><div class="form-actions">${f.reservation_status==='Cancelled'?'<span class="role-note">Cancelled reservation; payment is not available.</span>':f.payment_status!=='Paid'?`<button class="btn secondary" data-folio-action="charge" data-id="${esc(f.folio_id)}">Add charge</button><button class="btn secondary" data-folio-action="adjust" data-id="${esc(f.folio_id)}">Discount / tax</button><button class="btn primary" data-folio-action="pay" data-id="${esc(f.folio_id)}">Mark paid</button>`:'<span class="role-note">Paid folios are locked.</span>'}</div></div>`).join(''):'<div class="panel empty">No folios yet. A folio is created automatically with each reservation.</div>'}`;
 $('#content').onclick=async e=>{
  const button=e.target.closest('[data-folio-action]');
  if(!button)return;
  const action=button.dataset.folioAction,id=button.dataset.id,folio=rows.find(item=>item.folio_id===id);
  try{
   let result;
   if(action==='charge'){
    const description=prompt('Charge description:');if(!description)return;
    const category=prompt('Category (e.g. Food, Laundry, Service):','Service');if(!category)return;
    const amount=prompt('Amount:','0');if(amount===null)return;
    result=await api(`/folios/${encodeURIComponent(id)}/items`,{method:'POST',body:JSON.stringify({description,category,amount:Number(amount)})});
   }else if(action==='adjust'){
    const discount_type=prompt('Discount type: None, Fixed, or Percent',folio.discount_type||'None');if(discount_type===null)return;
    const normalized=discount_type==='None'?'':discount_type;
    const discount_amount=prompt(normalized==='Percent'?'Discount percent (0-100):':'Discount amount:',String(normalized?folio.discount_amount:0));if(discount_amount===null)return;
    const tax_rate=prompt('Tax percent (0-100):',String(folio.tax_rate||0));if(tax_rate===null)return;
    result=await api(`/folios/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({discount_type:normalized,discount_amount:Number(discount_amount),tax_rate:Number(tax_rate)})});
   }else{
    if(!confirm(`Record this folio as paid (${money(folio.grand_total)})? This is a simulation; no real payment will be processed.`))return;
    result=await api(`/folios/${encodeURIComponent(id)}/payment`,{method:'POST',body:JSON.stringify({payment_status:'Paid'})});
   }
   toast(result.message);await billing();
  }catch(error){toast(error.message)}
 };
}
async function scenarios(){
 const rows=await api('/scenarios');
 const canCreate=['instructor','admin'].includes(currentUser.role);
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">EXPERIENTIAL LEARNING</span><h2>Learning Scenarios</h2><p>Complete a written response for instructor assessment.</p></div>${canCreate?'<button class="btn primary" id="addScenario">＋ Add scenario</button>':''}</div><div class="stats">${rows.map(s=>{
  const status=s.submission_status||'Not Started';
  let action='';
  if(status==='In Progress')action=`<form class="scenario-submit" data-scenario-form="${esc(s.scenario_id)}"><label>Your response<textarea name="submission_text" rows="5" maxlength="20000" required>${esc(s.submission_text||'')}</textarea></label><button class="btn primary" type="submit">Submit for review</button></form>`;
  else if(status==='Submitted')action=`<p class="role-note">Submitted for instructor review.</p>${s.score===null?`<button class="btn secondary" data-delete-submission="${esc(s.assessment_id)}">Delete submission</button>`:''}`;
  else action=`<button class="btn primary" data-scenario-start="${esc(s.scenario_id)}">${status==='Graded'?'Try again':'Start scenario'}</button>`;
  return `<article class="stat scenario-card"><span class="label">${esc(s.difficulty)} · ${s.target_points} points · ${esc(status)}</span><strong style="font-size:18px">${esc(s.title)}</strong><small>${esc(s.learning_objectives||'Practical hotel operations')}</small><p class="role-note">${esc(s.description||'')}<br><b>Instructions:</b> ${esc(s.instructions||'')}</p>${s.score!==null?`<p><b>Score:</b> ${esc(s.score)} / ${esc(s.target_points)}</p><p class="role-note">${esc(s.feedback||'')}</p>`:''}${action}</article>`;
 }).join('')}</div>`;
 $('#content').onclick=async e=>{
  if(e.target.closest('#addScenario')){
   const title=prompt('Scenario title:');if(title===null)return;
   const difficulty=prompt('Difficulty: Beginner, Intermediate, or Advanced','Beginner');if(difficulty===null)return;
   const learning_objectives=prompt('Learning objectives:');if(learning_objectives===null)return;
   const target_points=prompt('Target points (1-10,000):','100');if(target_points===null)return;
   const description=prompt('Scenario description:');if(description===null)return;
   const instructions=prompt('Student instructions:');if(instructions===null)return;
   try{const result=await api('/scenarios',{method:'POST',body:JSON.stringify({title,difficulty,learning_objectives,target_points:Number(target_points),description,instructions})});toast(result.message);await scenarios()}
   catch(error){toast(error.message)}
   return;
  }
  const deleteButton=e.target.closest('[data-delete-submission]');
  if(deleteButton){
   if(!confirm('Delete this ungraded submission? This cannot be undone.'))return;
   try{const result=await api(`/assessments/${deleteButton.dataset.deleteSubmission}`,{method:'DELETE'});toast(result.message);await scenarios()}
   catch(error){toast(error.message)}
   return;
  }
  const button=e.target.closest('[data-scenario-start]');
  if(!button)return;
  try{const result=await api(`/scenarios/${encodeURIComponent(button.dataset.scenarioStart)}/start`,{method:'POST',body:'{}'});toast(result.message);await scenarios()}
  catch(error){toast(error.message)}
 };
 $('#content').onsubmit=async e=>{
  const form=e.target.closest('[data-scenario-form]');
  if(!form)return;
  e.preventDefault();
  const submission_text=new FormData(form).get('submission_text');
  try{const result=await api(`/scenarios/${encodeURIComponent(form.dataset.scenarioForm)}/submit`,{method:'POST',body:JSON.stringify({submission_text})});toast(result.message);await scenarios()}
  catch(error){toast(error.message)}
 };
}
async function assessments(){
 const rows=await api('/assessments'),canGrade=['admin','instructor'].includes(currentUser.role);
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">STUDENT DEVELOPMENT</span><h2>Assessments & Submissions</h2><p>${canGrade?'Review student work and provide a score and feedback.':'Track submitted work and instructor feedback.'}</p></div></div><div class="panel">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Student</th><th>Scenario</th><th>Submission</th><th>Score</th><th>Status</th><th>Feedback / Action</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${esc(a.student_name)}</td><td>${esc(a.scenario_title)}</td><td>${esc(a.submission_text||'—')}</td><td>${a.score===null?'—':`${esc(a.score)} / ${esc(a.target_points)}`}</td><td>${esc(a.submission_status)}</td><td>${a.submission_status==='Submitted'?`${canGrade?`<button class="btn primary" data-grade-assessment="${a.assessment_id}" data-target="${a.target_points}">Grade</button> `:''}<button class="btn secondary" data-delete-assessment="${a.assessment_id}">Delete</button>`:esc(a.feedback||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No assessment submissions yet.</div>'}</div>`;
 $('#content').onclick=async e=>{
  const deleteButton=e.target.closest('[data-delete-assessment]');
  if(deleteButton){
   if(!confirm('Delete this ungraded submission? Graded work cannot be deleted.'))return;
   try{const result=await api(`/assessments/${deleteButton.dataset.deleteAssessment}`,{method:'DELETE'});toast(result.message);await assessments()}
   catch(error){toast(error.message)}
   return;
  }
  const button=e.target.closest('[data-grade-assessment]');
  if(!button)return;
  const score=prompt(`Score from 0 to ${button.dataset.target}:`);if(score===null)return;
  const feedback=prompt('Feedback for the student:');if(feedback===null)return;
  try{const result=await api(`/assessments/${button.dataset.gradeAssessment}/grade`,{method:'POST',body:JSON.stringify({score:Number(score),feedback})});toast(result.message);await assessments()}
  catch(error){toast(error.message)}
 };
}
async function learningProgress(){
 const progress=await api('/progress');
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">STUDENT DEVELOPMENT</span><h2>My Learning Progress</h2><p>Your submitted and graded scenario work.</p></div></div><div class="stats"><div class="stat"><span class="label">Graded scenarios</span><strong>${progress.completed} / ${progress.total_scenarios}</strong></div><div class="stat"><span class="label">Points earned</span><strong>${progress.points_earned} / ${progress.points_possible}</strong></div><div class="stat"><span class="label">Average score</span><strong>${progress.average_percent===null?'—':`${progress.average_percent}%`}</strong></div></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Scenario</th><th>Difficulty</th><th>Status</th><th>Score</th><th>Completed</th><th>Feedback</th></tr></thead><tbody>${progress.scenarios.map(s=>`<tr><td>${esc(s.title)}</td><td>${esc(s.difficulty)}</td><td>${esc(s.submission_status)}</td><td>${s.score===null?'—':`${esc(s.score)} / ${esc(s.target_points)}`}</td><td>${esc(s.completed_at||'—')}</td><td>${esc(s.feedback||'—')}</td></tr>`).join('')}</tbody></table></div></div>`;
}
async function users(){const rows=await api('/admin/users');$('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">ACCESS CONTROL</span><h2>User Management</h2><p>Administrator-only account directory. Display IDs are numeric labels; database keys remain unchanged.</p></div><button class="btn primary" id="addUser">＋ Create account</button></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>User ID</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th></tr></thead><tbody>${rows.map(u=>`<tr><td>${esc(u.display_id)}</td><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.department||'—')}</td><td>${u.is_active?'Active':'Inactive'}</td></tr>`).join('')}</tbody></table></div></div>`;$('#addUser').onclick=async()=>{const full_name=prompt('Full name:');if(!full_name)return;const email=prompt('Email:');if(!email)return;const password=prompt('Temporary password (at least 8 characters):');if(!password)return;const role=prompt('Role: student, instructor, or admin','student');try{const d=await api('/admin/users',{method:'POST',body:JSON.stringify({full_name,email,password,role})});toast(d.message);renderPage('User Management')}catch(e){toast(e.message)}}}
function profile(){$('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">ACCOUNT</span><h2>My Profile</h2><p>Your signed-in training account.</p></div></div><div class="panel"><h3>${esc(currentUser.full_name)}</h3><p class="role-note">User ID: ${esc(currentUser.display_id??'—')}<br>${esc(currentUser.email)}<br>Role: ${esc(currentUser.role)}<br>Department: ${esc(currentUser.department||'Not specified')}<br>Year level: ${esc(currentUser.year_level||'Not specified')}</p>${currentUser.role==='instructor'?'<button class="btn primary" id="viewMembers">Members</button>':''}</div>`;$('#viewMembers')?.addEventListener('click',members)}
async function members(){
 const rows=await api('/instructor/members');
 const details=(title,items,render)=>`<h4>${title} (${items.length})</h4>${items.length?`<div class="table-wrap"><table><tbody>${items.map(render).join('')}</tbody></table></div>`:'<p class="role-note">No records.</p>'}`;
 $('#content').innerHTML=`<div class="welcome"><div><span class="eyebrow">INSTRUCTOR ACCESS</span><h2>Student Members</h2><p>Student profiles, assessment submissions, activity, and reservations.</p></div><button class="btn secondary" id="backToProfile">Back to profile</button></div>${rows.length?rows.map(student=>`<details class="panel"><summary><b>User ID ${esc(student.display_id)} · ${esc(student.full_name)}</b> · ${esc(student.email)} · ${student.is_active?'Active':'Inactive'}</summary><p class="role-note">Department: ${esc(student.department||'Not specified')} · Year level: ${esc(student.year_level||'Not specified')} · Joined: ${esc(student.created_at)}</p>${details('Learning records',student.assessments,row=>`<tr><td>${esc(row.scenario_title)}</td><td>${esc(row.submission_status)}</td><td>${row.score===null?'—':`${esc(row.score)} / ${esc(row.target_points)}`}</td><td>${esc(row.submission_text||'No submission')}</td><td>${esc(row.feedback||'')}</td><td>${esc(row.completed_at||'—')}</td></tr>`)}${details('Reservations',student.reservations,row=>`<tr><td>${esc(row.reservation_id)}</td><td>${esc(row.guest_name)}</td><td>Room ${esc(row.room_number)}</td><td>${esc(row.check_in_date)} – ${esc(row.check_out_date)}</td><td>${esc(row.reservation_status)}</td><td>${esc(row.created_at)}</td></tr>`)}${details('Activity',student.activity,row=>`<tr><td>${esc(row.timestamp)}</td><td>${esc(row.action)}</td></tr>`)}</details>`).join(''):'<div class="panel empty">No student accounts found.</div>'}`;
 $('#backToProfile').onclick=profile;
}
(async()=>{try{const d=await api('/auth/me');showApp(d.user)}catch(_){showLogin()}})();
