
// ====== ADMIN SECURITY LOCK ======
const DEFAULT_ADMIN_CODE = "Raymond0@.";
function getAdminCode(){
  return localStorage.getItem('admin_code') || DEFAULT_ADMIN_CODE;
}
function isAdminLoggedIn(){
  return localStorage.getItem('raymond_auth') === 'true';
}
function checkAdminCode(){
  const input = document.getElementById('adminCodeInput').value;
  const error = document.getElementById('loginError');
  const current = getAdminCode();
  if(input === current){
    localStorage.setItem('raymond_auth', 'true');
    document.getElementById('loginOverlay').style.display='none';
    error.classList.remove('show');
    document.getElementById('adminCodeInput').value='';
  } else {
    error.classList.add('show');
    error.innerText = 'ভুল কোড! সঠিক কোড দিন।';
    document.getElementById('adminCodeInput').value='';
    document.getElementById('adminCodeInput').focus();
  }
}
function changeAdminCode(){
  const curr = document.getElementById('currentAdminCode').value;
  const nw = document.getElementById('newAdminCode').value;
  const conf = document.getElementById('confirmAdminCode').value;
  const real = getAdminCode();
  if(curr !== real) return alert('Current code ভুল!');
  if(!nw || nw.length<4) return alert('New code কমপক্ষে 4 অক্ষরের হতে হবে');
  if(nw !== conf) return alert('Confirm code মিলছে না');
  localStorage.setItem('admin_code', nw);
  document.getElementById('currentAdminCode').value='';
  document.getElementById('newAdminCode').value='';
  document.getElementById('confirmAdminCode').value='';
  alert('Admin code পরিবর্তন করা হয়েছে! নতুন কোড: '+nw);
}
function logoutAdmin(){
  localStorage.removeItem('raymond_auth');
  alert('Logged out! পরবর্তীতে কোড চাইবে।');
  location.reload();
}
// Enter key support for login
document.addEventListener('keydown', function(e){
  if(e.key==='Enter'){
    const overlay = document.getElementById('loginOverlay');
    if(overlay && overlay.style.display!=='none'){
      checkAdminCode();
    }
  }
});


const DB_KEY = 'raymond_v2_db';
const ATT_KEY = 'raymond_attendance_v2';

function loadDB(){
  const d = localStorage.getItem(DB_KEY);
  if(!d) return {orders:[], customers:[], staff:[], products:[], nextSlip:1};
  try{ return JSON.parse(d); }catch{ return {orders:[], customers:[], staff:[], products:[], nextSlip:1} }
}
function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); if(window.firebaseReady) syncToFirebase(db); }
let db = loadDB();

// Firebase
let firebaseReady = false;
let fb_db = null;
function initFirebase(){
  const cfgRaw = localStorage.getItem('firebase_config');
  if(!cfgRaw) return;
  try{
    const cfg = JSON.parse(cfgRaw);
    if(!cfg.apiKey) return;
    if(!firebase.apps.length) firebase.initializeApp(cfg);
    fb_db = firebase.firestore();
    firebaseReady = true;
    window.firebaseReady = true;
    fb_db.collection('meta').doc('raymond').onSnapshot(doc=>{
      if(doc.exists){
        const data = doc.data();
        if(data.updatedAt && data.updatedAt > (db.lastSync||0)){
          db = data.payload;
          localStorage.setItem(DB_KEY, JSON.stringify(db));
          renderAll();
        }
      }
    });
    document.getElementById('fbStatus').innerText = '✓ Connected - Live Sync Active';
    document.getElementById('fbStatus').style.color = 'green';
  }catch(e){
    console.error(e);
    document.getElementById('fbStatus').innerText = '✗ Error: '+e.message;
  }
}
function syncToFirebase(payload){
  if(!fb_db) return;
  fb_db.collection('meta').doc('raymond').set({payload, updatedAt: Date.now()});
}

// Attendance
function loadAttendance(){
  const a = localStorage.getItem(ATT_KEY);
  if(!a) return {};
  try{ return JSON.parse(a); }catch{ return {}; }
}
function saveAttendance(att){ localStorage.setItem(ATT_KEY, JSON.stringify(att)); }

function getTodayStr(){ return new Date().toISOString().split('T')[0]; }

function checkReset(){
  const last = localStorage.getItem('last_att_date');
  const today = getTodayStr();
  if(last !== today){
    // reset handled by UI - we keep history but UI shows Absent by default for new date
    localStorage.setItem('last_att_date', today);
  }
}

// Navigation
let currentTab = 'dashboard';
function switchTab(tab){
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('nav-'+tab).classList.add('active');
  document.getElementById('topTitle').innerText = tab.charAt(0).toUpperCase()+tab.slice(1).replace('-',' ');
  document.querySelectorAll('.tab-content').forEach(el=>el.style.display='none');
  document.getElementById('tab-'+tab).style.display='block';
  if(tab==='order-slip') renderOrderSlip();
  if(tab==='customers') renderCustomers();
  if(tab==='daily-presents') renderAttendance();
  if(tab==='portal') renderPortal();
}

// Dashboard + dropdown
function toggleDropdown(){
  document.getElementById('plusDropdown').classList.toggle('show');
}

// New Order
let editingOrder = null;
function openNewOrder(){
  document.getElementById('plusDropdown').classList.remove('show');
  document.getElementById('orderModal').classList.add('show');
  document.getElementById('orderForm').reset();
  document.getElementById('orderSlipPreview').innerText = 'Slip #'+db.nextSlip;
  // set delivery default +3 days
  const d = new Date(); d.setDate(d.getDate()+3);
  document.getElementById('f_delivery').valueAsDate = d;
}
function closeOrderModal(){ document.getElementById('orderModal').classList.remove('show'); }

document.getElementById('orderForm').addEventListener('submit', function(e){
  e.preventDefault();
  const order = {
    id: Date.now(),
    slip: db.nextSlip++,
    name: document.getElementById('f_name').value,
    mobile: document.getElementById('f_mobile').value,
    type: document.getElementById('f_type').value,
    fabric: document.getElementById('f_fabric').value,
    qty: document.getElementById('f_qty').value,
    chest: document.getElementById('f_chest').value,
    length: document.getElementById('f_length').value,
    shoulder: document.getElementById('f_shoulder').value,
    sleeve: document.getElementById('f_sleeve').value,
    waist: document.getElementById('f_waist').value,
    delivery: document.getElementById('f_delivery').value,
    total: parseFloat(document.getElementById('f_total').value)||0,
    advance: parseFloat(document.getElementById('f_advance').value)||0,
    due: 0,
    notes: document.getElementById('f_notes').value,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
  order.due = order.total - order.advance;
  db.orders.unshift(order);
  // add customer
  let cust = db.customers.find(c=>c.mobile===order.mobile);
  if(!cust){
    db.customers.push({id:Date.now(), name:order.name, mobile:order.mobile, totalOrders:1, totalSpent:order.total, lastDate:order.createdAt});
  } else {
    cust.totalOrders++; cust.totalSpent+=order.total; cust.lastDate=order.createdAt; cust.name=order.name;
  }
  saveDB(db);
  closeOrderModal();
  alert('Order Saved! Slip #'+order.slip);
  renderAll();
  switchTab('order-slip');
});

function renderOrderSlip(){
  const container = document.getElementById('orderSlipList');
  if(db.orders.length===0){ container.innerHTML='<div class="empty">No orders yet. Create from Dashboard +</div>'; return; }
  let html = '<table class="table"><tr><th>Slip No</th><th>Customer</th><th>Mobile</th><th>Type</th><th>Delivery</th><th>Total ৳</th><th>Status</th></tr>';
  db.orders.forEach(o=>{
    html+=`<tr onclick="openSlip(${o.id})"><td><b>#${o.slip}</b></td><td>${o.name}</td><td>${o.mobile}</td><td>${o.type}</td><td>${o.delivery}</td><td>৳ ${o.total}</td><td><span class="badge ${o.status==='Pending'?'badge-pending':'badge-delivered'}">${o.status}</span></td></tr>`;
  });
  html+='</table>';
  container.innerHTML=html;
}
function openSlip(id){
  const o = db.orders.find(x=>x.id===id);
  if(!o) return;
  const due = o.total - o.advance;
  document.getElementById('slipDetail').innerHTML = `
    <div style="padding:20px">
      <h2 style="margin-bottom:10px">Slip #${o.slip} - ${o.type}</h2>
      <p><b>Customer:</b> ${o.name} | ${o.mobile}</p>
      <p><b>Delivery:</b> ${o.delivery} | <b>Status:</b> ${o.status}</p>
      <hr style="margin:12px 0">
      <p><b>Fabric:</b> ${o.fabric} | <b>Qty:</b> ${o.qty}</p>
      <p><b>Measurements:</b> Chest ${o.chest}, Length ${o.length}, Shoulder ${o.shoulder}, Sleeve ${o.sleeve}, Waist ${o.waist}</p>
      <hr style="margin:12px 0">
      <p><b>Total:</b> ৳ ${o.total} | <b>Advance:</b> ৳ ${o.advance} | <b>Due:</b> ৳ ${due}</p>
      <p><b>Notes:</b> ${o.notes}</p>
      <br>
      <button class="btn btn-red" onclick="markDelivered(${o.id})">Mark Delivered</button>
      <button class="btn btn-gray" onclick="window.print()">Print Slip</button>
    </div>
  `;
  document.getElementById('slipModal').classList.add('show');
}
function markDelivered(id){
  const o = db.orders.find(x=>x.id===id);
  if(o){ o.status='Delivered'; saveDB(db); renderOrderSlip(); document.getElementById('slipModal').classList.remove('show'); }
}

// Sale Products
function openSale(){
  document.getElementById('plusDropdown').classList.remove('show');
  document.getElementById('saleModal').classList.add('show');
  renderSaleProducts();
}
let cart = [];
function renderSaleProducts(){
  const list = document.getElementById('saleProductList');
  if(db.products.length===0){ list.innerHTML='<div class="empty">No products in Portal. Add first.</div>'; return; }
  list.innerHTML = db.products.map(p=>`
    <div style="border:1px solid #eee;padding:10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div><b>${p.name}</b> - ৳ ${p.price} (Stock ${p.stock})</div>
      <button class="btn btn-red" onclick="addToCart(${p.id})">Add</button>
    </div>
  `).join('');
  renderCart();
}
function addToCart(id){
  const p = db.products.find(x=>x.id===id);
  if(!p) return;
  const c = cart.find(x=>x.id===id);
  if(c) c.qty++; else cart.push({id:p.id, name:p.name, price:p.price, qty:1});
  renderCart();
}
function renderCart(){
  const el = document.getElementById('cartList');
  if(cart.length===0){ el.innerHTML='Cart empty'; document.getElementById('cartTotal').innerText='৳ 0'; return; }
  let total=0;
  el.innerHTML = cart.map(i=>{ total+=i.price*i.qty; return `<div style="display:flex;justify-content:space-between;padding:6px 0"><span>${i.name} x${i.qty}</span><span>৳ ${i.price*i.qty}</span></div>` }).join('');
  document.getElementById('cartTotal').innerText='৳ '+total;
}
function checkoutSale(){
  if(cart.length===0) return alert('Cart empty');
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  // reduce stock
  cart.forEach(c=>{
    const p = db.products.find(x=>x.id===c.id);
    if(p) p.stock -= c.qty;
  });
  const order = {id:Date.now(), slip:db.nextSlip++, name:'Walk-in Sale', mobile:'-', type:'Sale', fabric:'-', qty:cart.length, delivery:getTodayStr(), total, advance:total, due:0, notes:'Products: '+cart.map(c=>c.name+'x'+c.qty).join(', '), status:'Delivered', createdAt:new Date().toISOString()};
  db.orders.unshift(order);
  saveDB(db);
  cart=[];
  document.getElementById('saleModal').classList.remove('show');
  alert('Sale completed! Slip #'+order.slip);
  renderAll();
}

// Customers
function renderCustomers(){
  const el = document.getElementById('customerList');
  if(db.customers.length===0){ el.innerHTML='<div class="empty">No customers yet</div>'; return; }
  el.innerHTML = '<table class="table"><tr><th>Name</th><th>Mobile</th><th>Orders</th><th>Spent ৳</th><th>Last</th></tr>'+db.customers.map(c=>`<tr><td>${c.name}</td><td>${c.mobile}</td><td>${c.totalOrders}</td><td>৳ ${c.totalSpent}</td><td>${new Date(c.lastDate).toLocaleDateString()}</td></tr>`).join('')+'</table>';
}

// Attendance
function renderAttendance(){
  checkReset();
  const today = getTodayStr();
  const att = loadAttendance();
  const todayAtt = att[today] || {};
  const container = document.getElementById('attendanceList');
  if(db.staff.length===0){ container.innerHTML='<div class="empty">No staff in Portal. Add staff first.</div>'; return; }
  container.innerHTML = db.staff.map(s=>{
    const status = todayAtt[s.id] || 'Absent';
    const isPresent = status==='Present';
    return `<div class="attendance-row">
      <div><b>${s.name}</b> <small style="color:#888">(${s.role})</small></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-gray ${!isPresent?'active-absent':''}" onclick="markAttendance(${s.id},'Absent')">Absent</button>
        <button class="btn btn-gray ${isPresent?'active-present':''}" onclick="markAttendance(${s.id},'Present')">Present</button>
      </div>
    </div>`;
  }).join('') + `
    <div style="margin-top:20px;display:flex;gap:8px">
      <button class="btn btn-gray" onclick="showHistory('weekly')">Weekly History</button>
      <button class="btn btn-gray" onclick="showHistory('monthly')">Monthly History</button>
      <button class="btn btn-gray" onclick="showHistory('yearly')">Yearly History</button>
    </div>
    <div id="historyView" style="margin-top:16px"></div>
  `;
}
function markAttendance(staffId, status){
  const today = getTodayStr();
  const att = loadAttendance();
  if(!att[today]) att[today]={};
  if(status==='Present'){
    att[today][staffId] = {status, time:new Date().toLocaleString()};
  } else {
    delete att[today][staffId];
  }
  saveAttendance(att);
  renderAttendance();
  saveDB(db); // trigger firebase sync if needed
}
function showHistory(type){
  const att = loadAttendance();
  const el = document.getElementById('historyView');
  let html='<div class="card"><h4>'+type+' History</h4><br>';
  const now = new Date();
  let days = type==='weekly'?7:type==='monthly'?30:365;
  for(let i=0;i<days;i++){
    const d = new Date(); d.setDate(now.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const dayAtt = att[ds];
    if(dayAtt){
      html+=`<div style="padding:6px 0;border-bottom:1px solid #f0f0f0"><b>${ds}</b>: `;
      db.staff.forEach(s=>{
        if(dayAtt[s.id]) html+=`${s.name} (${dayAtt[s.id].time}) Present, `;
      });
      html+='</div>';
    }
  }
  html+='</div>';
  el.innerHTML=html;
}

// Portal
function renderPortal(){
  document.getElementById('portalStaffList').innerHTML = db.staff.length? db.staff.map(s=>`<div class="attendance-row"><div><b>${s.name}</b> - ${s.role} - ${s.phone} - ৳${s.salary}</div><button class="btn btn-gray" onclick="deleteStaff(${s.id})">Delete</button></div>`).join('') : '<div class="empty">No staff</div>';
  document.getElementById('portalProductList').innerHTML = db.products.length? db.products.map(p=>`<div class="attendance-row"><div><b>${p.name}</b> - ৳${p.price} - Stock ${p.stock}</div><button class="btn btn-gray" onclick="deleteProduct(${p.id})">Delete</button></div>`).join('') : '<div class="empty">No products</div>';
}
function addStaff(){
  const name=document.getElementById('staffName').value;
  const role=document.getElementById('staffRole').value;
  const phone=document.getElementById('staffPhone').value;
  const salary=document.getElementById('staffSalary').value;
  if(!name) return alert('Name required');
  db.staff.push({id:Date.now(), name, role, phone, salary});
  saveDB(db);
  document.getElementById('staffName').value=''; document.getElementById('staffPhone').value=''; document.getElementById('staffSalary').value='';
  renderPortal(); renderAttendance();
}
function deleteStaff(id){ db.staff=db.staff.filter(s=>s.id!==id); saveDB(db); renderPortal(); }
function addProduct(){
  const name=document.getElementById('prodName').value;
  const price=parseFloat(document.getElementById('prodPrice').value)||0;
  const stock=parseInt(document.getElementById('prodStock').value)||0;
  if(!name) return alert('Name required');
  db.products.push({id:Date.now(), name, price, stock});
  saveDB(db);
  document.getElementById('prodName').value=''; document.getElementById('prodPrice').value=''; document.getElementById('prodStock').value='';
  renderPortal();
}
function deleteProduct(id){ db.products=db.products.filter(p=>p.id!==id); saveDB(db); renderPortal(); }

// Settings - logo & firebase
function handleLogoUpload(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size>2*1024*1024) return alert('Image must be <2MB');
  const reader = new FileReader();
  reader.onload = e=>{
    localStorage.setItem('shop_logo', e.target.result);
    document.getElementById('logoPreview').innerHTML = `<img src="${e.target.result}">`;
    // also save to img folder permission note - store in localStorage and offer download
    const a = document.createElement('a');
    a.href = e.target.result;
    a.download = 'logo.png';
    // user can manually move to img folder if needed
  };
  reader.readAsDataURL(file);
}
function saveShopInfo(){
  const info = {
    name: document.getElementById('shopName').value,
    address: document.getElementById('shopAddress').value,
    phone: document.getElementById('shopPhone').value
  };
  localStorage.setItem('shop_info', JSON.stringify(info));
  alert('Shop info saved');
}
function saveFirebaseConfig(){
  const cfg = {
    apiKey: document.getElementById('fb_apiKey').value,
    authDomain: document.getElementById('fb_authDomain').value,
    projectId: document.getElementById('fb_projectId').value,
    storageBucket: document.getElementById('fb_storageBucket').value,
    messagingSenderId: document.getElementById('fb_messagingSenderId').value,
    appId: document.getElementById('fb_appId').value
  };
  if(!cfg.apiKey) return alert('apiKey required');
  localStorage.setItem('firebase_config', JSON.stringify(cfg));
  alert('Firebase config saved! Reloading...');
  location.reload();
}
function testFirebase(){
  if(!firebaseReady) return alert('Not connected. Save config first.');
  alert('Firebase Connected! Live sync active');
}
function clearAllData(){
  if(confirm('Delete all data? This cannot be undone!')){
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(ATT_KEY);
    location.reload();
  }
}

function renderAll(){ renderOrderSlip(); renderCustomers(); renderPortal(); }



window.onload = function(){
  // Admin login check - browser remembers, reset clears it
  const overlay = document.getElementById('loginOverlay');
  if(isAdminLoggedIn()){
    if(overlay) overlay.style.display='none';
  } else {
    if(overlay) overlay.style.display='flex';
    setTimeout(()=>{ const inp=document.getElementById('adminCodeInput'); if(inp) inp.focus(); }, 300);
  }
  checkReset();
  initFirebase();
  const infoRaw = localStorage.getItem('shop_info');
  if(infoRaw){
    try{ const info=JSON.parse(infoRaw); document.getElementById('shopName').value=info.name||''; document.getElementById('shopAddress').value=info.address||''; document.getElementById('shopPhone').value=info.phone||''; }catch{}
  }
  const logo = localStorage.getItem('shop_logo');
  if(logo){ document.getElementById('logoPreview').innerHTML=`<img src="${logo}">`; const sLogo=document.getElementById('sidebarLogo'); if(sLogo) sLogo.innerHTML=`<img src="${logo}" style="width:100%;height:100%;object-fit:cover">`; }
  const effective = getFirebaseConfig();
  const ids = ['fb_apiKey','fb_authDomain','fb_projectId','fb_storageBucket','fb_messagingSenderId','fb_appId'];
  ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.value=effective[id.replace('fb_','')]||effective[id]||''; });
  // Fill correctly
  document.getElementById('fb_apiKey').value=effective.apiKey||'';
  document.getElementById('fb_authDomain').value=effective.authDomain||'';
  document.getElementById('fb_projectId').value=effective.projectId||'';
  document.getElementById('fb_storageBucket').value=effective.storageBucket||'';
  document.getElementById('fb_messagingSenderId').value=effective.messagingSenderId||'';
  document.getElementById('fb_appId').value=effective.appId||'';
  updateDash();
  renderAll();
}
