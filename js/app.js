
// RaymondShop - Cloudflare Ready Version
// No File System Access API, No Connect Folder
// Data: IndexedDB + localStorage
// Images: Stored as base64 in DB + img/ folder for permanent deployment

let DB = { products:[], customers:[], sales:[], expenses:[], settings:{ logo: '', logoName: '' } };
const DB_KEY = 'raymondshop_cloudflare_v1';
const LOGO_KEY = 'raymond_logo_cf';
let cart = [];
let currentTab = 'dashboard';
let sidebarOpen = false;

const TABS = [
  {id:'dashboard', label:'Dashboard'},
  {id:'pos', label:'POS Sale'},
  {id:'products', label:'Products'},
  {id:'customers', label:'Customers'},
  {id:'expenses', label:'Expenses'},
  {id:'reports', label:'Reports'},
];

function openIDB(){
  return new Promise((res,rej)=>{
    const req = indexedDB.open('RaymondShopCF', 1);
    req.onupgradeneeded = e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('data')) db.createObjectStore('data');
    };
    req.onsuccess=()=>res(req.result);
    req.onerror=()=>rej(req.error);
  });
}
async function idbPut(key, val){
  const db = await openIDB();
  return new Promise(r=>{
    const tx=db.transaction('data','readwrite');
    tx.objectStore('data').put(val, key);
    tx.oncomplete=()=>r(true);
  });
}
async function idbGet(key){
  const db = await openIDB();
  return new Promise(r=>{
    const tx=db.transaction('data','readonly');
    const req=tx.objectStore('data').get(key);
    req.onsuccess=()=>r(req.result);
    req.onerror=()=>r(null);
  });
}

// Custom Popup
function showPopup(title, message){
  const popup = document.getElementById('appPopup');
  document.getElementById('popupTitle').textContent = title;
  document.getElementById('popupBody').innerHTML = message;
  popup.classList.add('show');
}
function closePopup(){ document.getElementById('appPopup')?.classList.remove('show'); }
function showConfirm(title, message, onConfirm){
  const popup = document.getElementById('appPopup');
  document.getElementById('popupTitle').textContent = title;
  document.getElementById('popupBody').innerHTML = message;
  document.getElementById('popupFooter').innerHTML = `<button class="btn" style="background:#f1f1f1;color:#111;border:1px solid #ddd" onclick="closePopup()">Cancel</button><button class="btn" onclick="closePopup(); (${onConfirm.toString()})()">Confirm</button>`;
  popup.classList.add('show');
}

async function loadData(){
  const saved = await idbGet(DB_KEY) || JSON.parse(localStorage.getItem(DB_KEY) || 'null');
  if(saved && saved.products !== undefined){ DB = saved; }
  else { DB = { products:[], customers:[], sales:[], expenses:[], settings:{} }; await persist(); }
  
  const logoData = await idbGet(LOGO_KEY) || localStorage.getItem(LOGO_KEY);
  if(logoData){
    DB.settings.logo = logoData;
    applyLogo(logoData);
  } else {
    // Try to load from img/ folder if exists (for permanent deployment)
    // Check if img/raymond-logo.png exists as static file
    const staticLogo = 'img/raymond-logo.png';
    // We will try to load it via img tag error handling
    const testImg = new Image();
    testImg.onload = ()=>{
      // If static logo exists, show it if no uploaded logo
      if(!logoData){
        const headerLogo = document.getElementById('headerLogo');
        if(headerLogo){
          headerLogo.src = staticLogo;
          headerLogo.classList.add('show');
          document.getElementById('headerLogoText')?.classList.remove('show');
        }
      }
    };
    testImg.src = staticLogo;
  }
}

async function persist(){
  await idbPut(DB_KEY, DB);
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
}

function toggleSidebar(){
  sidebarOpen = !sidebarOpen;
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if(sidebarOpen){ sidebar.classList.add('open'); overlay.classList.add('show'); }
  else { sidebar.classList.remove('open'); overlay.classList.remove('show'); }
}
function closeSidebar(){ if(sidebarOpen) toggleSidebar(); }

function renderNav(){
  const nav = document.getElementById('nav');
  nav.innerHTML = `
    ${TABS.map(t=>`<div onclick="switchTab('${t.id}')" data-tab="${t.id}" class="nav-item ${t.id===currentTab?'active':''}">${t.label}</div>`).join('')}
    <div style="flex:1"></div>
    <div onclick="switchTab('admin')" data-tab="admin" class="nav-item ${currentTab==='admin'?'active':''}">Admin</div>
    <div onclick="switchTab('settings')" data-tab="settings" class="nav-item settings ${currentTab==='settings'?'active':''}">Settings</div>
  `;
}
function switchTab(id){ currentTab=id; renderNav(); render(); closeSidebar(); }

function render(){
  const c=document.getElementById('content');
  if(!c) return;
  if(currentTab==='dashboard') c.innerHTML=renderDashboard();
  else if(currentTab==='pos') c.innerHTML=renderPOS();
  else if(currentTab==='products') c.innerHTML=renderProducts();
  else if(currentTab==='customers') c.innerHTML=renderCustomers();
  else if(currentTab==='expenses') c.innerHTML=renderExpenses();
  else if(currentTab==='reports') c.innerHTML=renderReports();
  else if(currentTab==='settings') c.innerHTML=renderSettings();
  else if(currentTab==='admin') c.innerHTML=renderAdmin();
  if(currentTab==='pos') setTimeout(()=>{filterPOS(); renderCart();},0);
}

function renderDashboard(){
  const today=DB.sales.filter(s=>new Date(s.date).toDateString()===new Date().toDateString()).reduce((a,b)=>a+(b.total||0),0);
  const total=DB.sales.reduce((a,b)=>a+(b.total||0),0);
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div class="card"><div style="font-size:11px;color:#777">TODAY SALE</div><div style="font-size:22px;font-weight:800">৳ ${today}</div></div>
    <div class="card"><div style="font-size:11px;color:#777">TOTAL SALE</div><div style="font-size:22px;font-weight:800">৳ ${total}</div></div>
    <div class="card"><div style="font-size:11px;color:#777">PRODUCTS</div><div style="font-size:22px;font-weight:800">${DB.products.length}</div></div>
  </div>
  <div class="card"><h4>Recent Sales</h4><table class="table"><tr><th>Date</th><th>Customer</th><th>Amount</th></tr>${DB.sales.slice(0,5).map(s=>`<tr><td>${new Date(s.date).toLocaleDateString()}</td><td>${s.customerName}</td><td>৳ ${s.total}</td></tr>`).join('') || '<tr><td colspan=3 style="text-align:center;color:#999;padding:20px">No sales yet - Fresh start for Cloudflare</td></tr>'}</table></div>`;
}
function renderProducts(){
  return `<div style="display:flex;justify-content:space-between;margin-bottom:12px"><h3 style="font-weight:800;font-size:18px">Products (${DB.products.length})</h3><button class="btn" onclick="openProductModal()">+ Add Product</button></div>
  <div class="card"><table class="table"><tr><th>Name</th><th>Stock</th><th>Sell</th><th>Action</th></tr>${DB.products.map(p=>`<tr><td style="font-weight:600">${p.name}</td><td>${p.stock}</td><td>৳${p.sellPrice}</td><td><button onclick="openProductModal('${p.id}')" style="font-size:12px">Edit</button> <button onclick="deleteProduct('${p.id}')" style="font-size:12px;color:#CC0000;margin-left:8px">Delete</button></td></tr>`).join('') || '<tr><td colspan=4 style="text-align:center;color:#999;padding:20px">No products</td></tr>'}</table></div>`;
}
function renderPOS(){
  return `<div class="pos-layout"><div><div style="display:flex;gap:8px;margin-bottom:12px"><input id="posSearch" oninput="filterPOS()" placeholder="Search products..." class="input" style="flex:1"><select id="posCustomer" class="input" style="max-width:180px"><option value="">Walk-in</option>${DB.customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><div id="posGrid" class="pos-products"></div></div><div class="cart"><div style="padding:14px;border-bottom:1px solid #e5e5e5;font-weight:700">Cart (<span id="cartCount">0</span>)</div><div id="cartList" style="flex:1;overflow:auto;padding:12px"></div><div style="padding:14px;border-top:1px solid #e5e5e5"><div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:10px"><span>Total:</span><span>৳ <span id="cartTotal">0</span></span></div><select id="payMethod" class="input" style="margin-bottom:8px"><option value="cash">Cash</option><option value="due">Due</option></select><button class="btn" onclick="checkout()" style="width:100%">Complete Sale</button></div></div></div>`;
}
function filterPOS(){
  const q=(document.getElementById('posSearch')?.value||'').toLowerCase();
  const grid=document.getElementById('posGrid'); if(!grid) return;
  const list=DB.products.filter(p=>p.name.toLowerCase().includes(q) && p.stock>0);
  grid.innerHTML=list.map(p=>`<div class="p-card" onclick="addToCart('${p.id}')"><div style="font-weight:600;font-size:13px">${p.name}</div><div style="font-size:11px;color:#777">Stock: ${p.stock}</div><div style="font-weight:800;color:#CC0000;margin-top:6px">৳ ${p.sellPrice}</div></div>`).join('')||'<div style="color:#999">No products</div>';
}
function renderCustomers(){ return `<div style="display:flex;justify-content:space-between;margin-bottom:12px"><h3 style="font-weight:800">Customers</h3><button class="btn btn-black" onclick="openCustomerModal()">+ Add</button></div><div class="card"><table class="table"><tr><th>Name</th><th>Phone</th><th>Due</th></tr>${DB.customers.map(c=>`<tr><td>${c.name}</td><td>${c.phone}</td><td style="color:${c.due>0?'#CC0000':''}">৳ ${c.due||0}</td></tr>`).join('') || '<tr><td colspan=3 style="text-align:center;color:#999;padding:20px">No customers</td></tr>'}</table></div>`; }
function renderExpenses(){ const total=DB.expenses.reduce((a,b)=>a+b.amount,0); return `<div style="display:flex;justify-content:space-between;margin-bottom:12px"><h3 style="font-weight:800">Expenses ৳ ${total}</h3><button class="btn btn-black" onclick="openExpenseModal()">+ Add</button></div><div class="card"><table class="table"><tr><th>Date</th><th>Category</th><th>Amount</th></tr>${DB.expenses.map(e=>`<tr><td>${e.date}</td><td>${e.category}</td><td>৳ ${e.amount}</td></tr>`).join('') || '<tr><td colspan=3 style="text-align:center;color:#999;padding:20px">No expenses</td></tr>'}</table></div>`; }
function renderReports(){ return `<div class="card"><h4>Sales History</h4><table class="table" style="margin-top:10px"><tr><th>Date</th><th>Items</th><th>Total</th></tr>${DB.sales.map(s=>`<tr><td>${new Date(s.date).toLocaleString()}</td><td>${s.items.map(i=>i.name+' x'+i.qty).join(', ')}</td><td>৳ ${s.total}</td></tr>`).join('') || '<tr><td colspan=3 style="text-align:center;color:#999">No data</td></tr>'}</table></div>`; }

function renderSettings(){
  return `<div class="card"><h3 style="font-weight:800;font-size:18px">Settings - Cloudflare Version</h3>
  <div style="margin-top:16px;padding:16px;background:#f9f9f9;border:1px solid #e5e5e5">
    <div style="font-weight:600">☁️ Cloudflare Deployment Ready</div>
    <div style="font-size:13px;color:#666;margin-top:6px">This version has no folder permission system. All data saved in browser (IndexedDB).<br>For permanent images across devices, upload logo in Admin, then download and add to <code>img/</code> folder and redeploy.</div>
    <div style="margin-top:12px;font-size:12px">Storage: Browser IndexedDB (per device)<br>Images: <code>img/</code> folder for permanent deployment<br>Backup: Download/Restore JSON</div>
  </div>
  <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btn-black" onclick="exportData()">Download Backup (raymond_backup.json)</button>
    <label class="btn" style="background:#fff;border:1px solid #ddd;cursor:pointer">Restore Backup <input type="file" style="display:none" accept=".json" onchange="importData(event)"></label>
    <button class="btn" style="background:#fff;border:1px solid #ddd;color:#CC0000" onclick="showConfirm('Clear?', 'Clear all data? Cannot be undone.', ()=>{DB={products:[],customers:[],sales:[],expenses:[],settings:{}}; persist(); render();})">Clear All</button>
  </div>
  <div style="margin-top:16px;padding:12px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px">
    <b>How to make logo permanent for all devices on Cloudflare:</b><br>
    1. Upload logo in Admin menu<br>
    2. Logo will show immediately on this device<br>
    3. To make it visible on all mobiles/computers, download the logo file<br>
    4. Rename to <code>raymond-logo.png</code> and put in <code>img/</code> folder<br>
    5. Redeploy to Cloudflare Pages<br>
    6. Now all devices will see logo from <code>img/raymond-logo.png</code>
  </div>
  </div>`;
}

function renderAdmin(){
  return `<div class="card"><h3 style="font-weight:800;font-size:18px">Admin - Raymond Logo (Cloudflare Permanent)</h3>
  <div style="margin-top:16px">
    <div style="font-weight:600;margin-bottom:8px">Upload Logo - Permanent Solution for Cloudflare</div>
    <div style="font-size:13px;color:#666;margin-bottom:12px">Upload logo. It will be saved in browser and also you can download to add to <code>img/</code> folder for permanent cross-device visibility.</div>
    <div class="logo-upload" onclick="document.getElementById('logoInput').click()">
      <div style="font-size:13px">Click to upload logo</div>
      <div style="font-size:11px;color:#888">PNG recommended, will be visible on all devices after adding to img/ folder and redeploying</div>
      <img id="logoPreview" class="logo-preview" style="display:none">
    </div>
    <input type="file" id="logoInput" accept="image/*" style="display:none" onchange="uploadLogo(event)">
    <div id="logoPathDisplay" style="font-size:12px;margin-top:8px;color:#666">${DB.settings.logoName ? `Current: img/${DB.settings.logoName} (browser)` : 'No logo - Upload to make permanent'}</div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-black" onclick="document.getElementById('logoInput').click()">Upload Logo</button>
      <button class="btn" style="background:#fff;border:1px solid #ddd" onclick="downloadLogo()">Download Logo for img/ folder</button>
      <button class="btn" style="background:#fff;border:1px solid #ddd" onclick="removeLogo()">Remove</button>
    </div>
    <div style="margin-top:16px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:12px">
      <b>Permanent Method for Cloudflare:</b><br>
      • After upload, click "Download Logo for img/ folder"<br>
      • Save as <code>raymond-logo.png</code> inside <code>img/</code> folder in your project<br>
      • Upload project to Cloudflare Pages again<br>
      • Now logo visible on all phones/computers without uploading
    </div>
  </div>
  </div>`;
}

// Logo handling for Cloudflare - permanent via img folder
let currentLogoBase64 = '';

async function uploadLogo(e){
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ showPopup('Too Large', 'Image must be less than 5MB'); return; }
  if(!file.type.startsWith('image/')){ showPopup('Invalid', 'Please select image file'); return; }

  const reader = new FileReader();
  reader.onload = async (ev)=>{
    const base64 = ev.target.result;
    currentLogoBase64 = base64;
    DB.settings.logo = base64;
    DB.settings.logoName = file.name;
    await idbPut(LOGO_KEY, base64);
    localStorage.setItem(LOGO_KEY, base64);
    await persist();
    applyLogo(base64);
    showPopup('Logo Saved', `Logo uploaded: <b>${file.name}</b><br><br>Visible now on this device.<br><br>To make permanent for all devices:<br>1. Click "Download Logo for img/ folder"<br>2. Save as <code>raymond-logo.png</code> in <code>img/</code> folder<br>3. Redeploy to Cloudflare Pages`, 'success');
    render();
  };
  reader.readAsDataURL(file);
}

function applyLogo(base64){
  currentLogoBase64 = base64;
  const headerLogo = document.getElementById('headerLogo');
  const preview = document.getElementById('logoPreview');
  if(headerLogo){ headerLogo.src = base64; headerLogo.classList.add('show'); document.getElementById('headerLogoText')?.classList.remove('show'); }
  if(preview){ preview.src = base64; preview.style.display='block'; }
}

function downloadLogo(){
  if(!currentLogoBase64 && !DB.settings.logo){
    showPopup('No Logo', 'Upload a logo first');
    return;
  }
  const base64 = currentLogoBase64 || DB.settings.logo;
  const a = document.createElement('a');
  a.href = base64;
  a.download = 'raymond-logo.png';
  a.click();
  showPopup('Downloaded', 'Logo downloaded as <b>raymond-logo.png</b><br><br>Now put it in <code>img/</code> folder and redeploy to Cloudflare Pages for permanent visibility on all devices.');
}

async function removeLogo(){
  DB.settings.logo = '';
  DB.settings.logoName = '';
  currentLogoBase64 = '';
  await idbPut(LOGO_KEY, null);
  localStorage.removeItem(LOGO_KEY);
  const headerLogo = document.getElementById('headerLogo');
  if(headerLogo){ headerLogo.src=''; headerLogo.classList.remove('show'); }
  const preview = document.getElementById('logoPreview');
  if(preview) preview.style.display='none';
  document.getElementById('headerLogoText')?.classList.add('show');
  await persist();
  showPopup('Removed', 'Logo removed. To remove permanent logo from all devices, also delete img/raymond-logo.png and redeploy.');
}

function exportData(){
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='raymond_backup.json'; a.click();
}
async function importData(e){
  const file=e.target.files[0]; if(!file) return;
  const text=await file.text();
  try{ DB=JSON.parse(text); await persist(); if(DB.settings.logo) { currentLogoBase64=DB.settings.logo; applyLogo(DB.settings.logo); } showPopup('Success', 'Restore successful!'); render(); }catch{ showPopup('Error', 'Invalid file'); }
}

// Modals and POS same as before but with custom popup
function openModal(html){ document.getElementById('modalBox').innerHTML=html; document.getElementById('modal').classList.add('open'); }
function closeModal(){ document.getElementById('modal').classList.remove('open'); }
function openProductModal(id){
  const p=id?DB.products.find(x=>x.id===id):null;
  openModal(`<h3 style="font-weight:700;margin-bottom:12px">${p?'Edit':'Add'} Product</h3><div style="display:grid;gap:10px"><input id="m_name" value="${p?.name||''}" placeholder="Name" class="input"><input id="m_cat" value="${p?.category||''}" placeholder="Category" class="input"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><input id="m_buy" type="number" value="${p?.buyPrice||''}" placeholder="Buy" class="input"><input id="m_sell" type="number" value="${p?.sellPrice||''}" placeholder="Sell" class="input"><input id="m_stock" type="number" value="${p?.stock||''}" placeholder="Stock" class="input"></div><div style="display:flex;gap:8px"><button class="btn" onclick="saveProduct('${id||''}')">Save</button><button class="btn" style="background:#f1f1f1;color:#111;border:1px solid #ddd" onclick="closeModal()">Cancel</button></div></div>`);
}
async function saveProduct(id){
  const data={name:document.getElementById('m_name').value, category:document.getElementById('m_cat').value||'General', buyPrice:+document.getElementById('m_buy').value||0, sellPrice:+document.getElementById('m_sell').value||0, stock:+document.getElementById('m_stock').value||0, sku:''};
  if(!data.name){ showPopup('Required','Name required'); return; }
  if(id){ const idx=DB.products.findIndex(x=>x.id===id); DB.products[idx]={...DB.products[idx],...data}; } else DB.products.unshift({id:'p'+Date.now(),...data});
  await persist(); closeModal(); render();
}
async function deleteProduct(id){ showConfirm('Delete?', 'Delete this product?', async ()=>{ DB.products=DB.products.filter(x=>x.id!==id); await persist(); render(); }); }
function openCustomerModal(){ openModal(`<h3 style="font-weight:700;margin-bottom:10px">Add Customer</h3><div style="display:grid;gap:10px"><input id="c_name" placeholder="Name" class="input"><input id="c_phone" placeholder="Phone" class="input"><div style="display:flex;gap:8px"><button class="btn btn-black" onclick="saveCustomer()">Save</button><button class="btn" style="background:#f1f1f1;color:#111" onclick="closeModal()">Cancel</button></div></div>`); }
async function saveCustomer(){ const data={name:document.getElementById('c_name').value, phone:document.getElementById('c_phone').value}; if(!data.name){ showPopup('Required','Name required'); return; } DB.customers.unshift({id:'c'+Date.now(),...data,due:0,totalBuy:0}); await persist(); closeModal(); render(); }
function openExpenseModal(){ openModal(`<h3 style="font-weight:700;margin-bottom:10px">Add Expense</h3><div style="display:grid;gap:10px"><input id="e_cat" placeholder="Category" class="input"><input id="e_amt" type="number" placeholder="Amount" class="input"><div style="display:flex;gap:8px"><button class="btn btn-black" onclick="saveExpense()">Save</button><button class="btn" style="background:#f1f1f1;color:#111" onclick="closeModal()">Cancel</button></div></div>`); }
async function saveExpense(){ const data={category:document.getElementById('e_cat').value||'General', amount:+document.getElementById('e_amt').value||0, date:new Date().toISOString().split('T')[0]}; DB.expenses.unshift({id:'e'+Date.now(),...data}); await persist(); closeModal(); render(); }
function addToCart(id){
  const p=DB.products.find(x=>x.id===id);
  const ex=cart.find(x=>x.id===id);
  if(ex){ if(ex.qty<p.stock) ex.qty++; else showPopup('Stock','Out of stock'); } else cart.push({id:p.id,name:p.name,sellPrice:p.sellPrice,buyPrice:p.buyPrice,qty:1});
  renderCart();
}
function renderCart(){
  const list=document.getElementById('cartList'); const totalEl=document.getElementById('cartTotal'); const countEl=document.getElementById('cartCount');
  if(!list) return;
  list.innerHTML=cart.length? cart.map((it,i)=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #eee;font-size:13px"><span>${it.name} x${it.qty}</span><span>৳${it.qty*it.sellPrice} <button onclick="cart.splice(${i},1);renderCart()" style="color:#CC0000">x</button></span></div>`).join('') : '<div style="text-align:center;color:#999;padding:20px;font-size:13px">Cart empty</div>';
  if(totalEl) totalEl.textContent=cart.reduce((a,b)=>a+b.qty*b.sellPrice,0);
  if(countEl) countEl.textContent=cart.length;
}
async function checkout(){
  if(!cart.length){ showPopup('Empty','Cart empty'); return; }
  const custId=document.getElementById('posCustomer')?.value;
  const cust=DB.customers.find(c=>c.id===custId);
  const total=cart.reduce((a,b)=>a+b.qty*b.sellPrice,0);
  DB.sales.unshift({id:'s'+Date.now(), date:new Date().toISOString(), items:[...cart], total, customerName:cust?.name||'Walk-in', customerId:custId||'', paymentMethod:document.getElementById('payMethod')?.value||'cash'});
  cart.forEach(it=>{ const p=DB.products.find(x=>x.id===it.id); if(p) p.stock=Math.max(0,p.stock-it.qty); });
  cart=[]; await persist(); showPopup('Success','Sale completed ৳ '+total); render();
}

document.addEventListener('DOMContentLoaded', async()=>{
  renderNav();
  await loadData();
  render();
});
