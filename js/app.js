const DEFAULT_FIREBASE_CONFIG={apiKey:"AIzaSyDmupiTTuxwYZPci-lFehUL1pNv9TV8CE8",authDomain:"raymond-df295.firebaseapp.com",projectId:"raymond-df295",storageBucket:"raymond-df295.firebasestorage.app",messagingSenderId:"36554452985",appId:"1:36554452985:web:51546aaf1ba16d536d5728"};
let db={orders:[],customers:[],staff:[],products:[],tailoredProducts:[],sizeSegments:{},nextSlip:1,lastSync:0};
try{let d=localStorage.getItem('raymond_v2_db');if(d){db=JSON.parse(d);if(!db.tailoredProducts)db.tailoredProducts=[];if(!db.sizeSegments)db.sizeSegments={};}}catch{}
function saveDB(){
  db.lastSync=Date.now();
  localStorage.setItem('raymond_v2_db',JSON.stringify(db));
  console.log('Local saved, pushing to Firebase...');
  if(fb_db){
    syncToFirebase(db);
  }else{
    console.log('fb_db not ready, will sync after init');
  }
  updateDash();
}
let firebaseReady=false,fb_db=null;
function getFirebaseConfig(){try{let c=JSON.parse(localStorage.getItem('firebase_config'));if(c&&c.apiKey)return c}catch{}return DEFAULT_FIREBASE_CONFIG;}
function initFirebase(){
  try{
    let cfg=getFirebaseConfig();
    if(!firebase.apps.length)firebase.initializeApp(cfg);
    fb_db=firebase.firestore();
    firebaseReady=true;window.firebaseReady=true;
    let st=document.getElementById('fbStatus');
    if(st){st.innerText='✓ Connected - Live Sync Active (Project: '+cfg.projectId+')';st.style.color='green';}
    console.log('Firebase initialized, setting up listener for',cfg.projectId);
    // Live listener - other devices data will come here
    fb_db.collection('meta').doc('raymond').onSnapshot(doc=>{
      if(doc.exists){
        let data=doc.data();
        console.log('Firebase update received, updatedAt:',data.updatedAt,'local lastSync:',db.lastSync);
        // Only overwrite if remote is newer than 2 sec
        if(data.updatedAt > (db.lastSync||0)+2000){
          console.log('Remote newer, updating local DB');
          db=data.payload;
          if(!db.tailoredProducts)db.tailoredProducts=[];
          if(!db.sizeSegments)db.sizeSegments={};
          localStorage.setItem('raymond_v2_db',JSON.stringify(db));
          renderAll();
          updateDash();
          if(st){st.innerText='✓ Synced from cloud - '+new Date().toLocaleTimeString();st.style.color='green';}
        }
      }else{
        console.log('No remote doc yet, pushing local data');
        // First time - push local data to cloud
        syncToFirebase(db);
      }
    }, err=>{
      console.error('Firebase listener error:',err);
      if(st){st.innerText='✗ Listener Error: '+err.message;st.style.color='red';}
    });
  }catch(e){
    console.error('Firebase init error:',e);
    let st=document.getElementById('fbStatus');
    if(st){st.innerText='✗ Init Error: '+e.message;st.style.color='red';}
  }
}
function syncToFirebase(payload){
  if(!fb_db){
    console.error('fb_db not initialized');
    return;
  }
  console.log('Pushing to Firebase...');
  fb_db.collection('meta').doc('raymond').set({
    payload:payload,
    updatedAt:Date.now()
  }).then(()=>{
    console.log('✓ Pushed to Firebase successfully');
    let st=document.getElementById('fbStatus');
    if(st){st.innerText='✓ Saved to cloud - '+new Date().toLocaleTimeString()+' - Project: '+getFirebaseConfig().projectId;st.style.color='green';}
  }).catch(err=>{
    console.error('Firebase save error:',err);
    alert('Firebase Save Failed: '+err.message+'\n\nCheck Firestore Rules! Go to Firebase Console > Firestore Database > Rules and set:\nallow read, write: if true;');
    let st=document.getElementById('fbStatus');
    if(st){st.innerText='✗ Save Failed: '+err.message;st.style.color='red';}
  });
}
function parseBulkConfig(){
  const bulk=document.getElementById('bulkFirebasePaste').value.trim();
  if(!bulk)return alert('Paste first');
  function ex(k){let m=bulk.match(new RegExp(k+'\\s*:\\s*"([^"]+)"','i'));if(m)return m[1];m=bulk.match(new RegExp(k+"\\s*:\\s*'([^']+)'",'i'));return m?m[1]:'';}
  let cfg={apiKey:ex('apiKey'),authDomain:ex('authDomain'),projectId:ex('projectId'),storageBucket:ex('storageBucket'),messagingSenderId:ex('messagingSenderId'),appId:ex('appId')};
  if(!cfg.apiKey){alert('Parse failed - Paste like apiKey: "AIza..."');return;}
  document.getElementById('fb_apiKey').value=cfg.apiKey;
  document.getElementById('fb_authDomain').value=cfg.authDomain;
  document.getElementById('fb_projectId').value=cfg.projectId;
  document.getElementById('fb_storageBucket').value=cfg.storageBucket;
  document.getElementById('fb_messagingSenderId').value=cfg.messagingSenderId;
  document.getElementById('fb_appId').value=cfg.appId;
  localStorage.setItem('firebase_config',JSON.stringify(cfg));
  let st=document.getElementById('fbStatus');
  if(st){st.innerText='✓ 6 fields filled! Connecting...';st.style.color='green';}
  setTimeout(()=>{
    try{
      if(firebase.apps.length===0)firebase.initializeApp(cfg);
      else{ /* already initialized, delete and re-init for new project */ try{firebase.app().delete().then(()=>{firebase.initializeApp(cfg);initFirebase();});}catch{initFirebase();} return; }
      fb_db=firebase.firestore();
      firebaseReady=true;window.firebaseReady=true;
      if(st){st.innerText='✓ Connected - '+cfg.projectId+' - FIXED';st.style.color='green';}
      alert('SUCCESS! Connected '+cfg.projectId+' - Now data will sync to cloud');
      initFirebase();
    }catch(e){alert('Connection Error: '+e.message);}
  },500);
}
let currentPortalSub='readymade',currentSettingsSub='shopinfo';
function switchTab(tab){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));let nav=document.getElementById('nav-'+tab);if(nav)nav.classList.add('active');document.querySelectorAll('.tab-content').forEach(t=>t.style.display='none');let el=document.getElementById('tab-'+tab);if(el)el.style.display='block';let topTitle=document.getElementById('topTitle');if(topTitle)topTitle.innerText=tab;let ps=document.getElementById('portalSubSidebar'),ss=document.getElementById('settingsSubSidebar');if(ps)ps.classList.remove('show');if(ss)ss.classList.remove('show');if(tab==='portal'){if(ps)ps.classList.add('show');switchPortalSub(currentPortalSub);}else if(tab==='settings'){if(ss)ss.classList.add('show');switchSettingsSub(currentSettingsSub);}if(tab==='order-slip')renderOrderSlip();if(tab==='customers')renderCustomers();}
function switchPortalSub(sub){currentPortalSub=sub;document.querySelectorAll('#portalSubSidebar .sub-nav-item').forEach(n=>n.classList.remove('active'));let s=document.getElementById('sub-'+sub);if(s)s.classList.add('active');document.querySelectorAll('.portal-sub-content').forEach(c=>c.style.display='none');let el=document.getElementById('portal-'+sub);if(el)el.style.display='block';if(sub==='readymade')renderPortalProducts();if(sub==='tailored')renderTailoredProducts();if(sub==='size')renderSizeSegments();if(sub==='staff')renderStaff();}
function switchSettingsSub(sub){currentSettingsSub=sub;document.querySelectorAll('#settingsSubSidebar .sub-nav-item').forEach(n=>n.classList.remove('active'));let s=document.getElementById('sub-'+sub);if(s)s.classList.add('active');document.querySelectorAll('.settings-sub-content').forEach(c=>c.style.display='none');let el=document.getElementById('settings-'+sub);if(el)el.style.display='block';}
function toggleMobileMenu(){let sb=document.querySelector('.sidebar');if(sb)sb.classList.toggle('mobile-open');}
function toggleDropdown(){let d=document.getElementById('plusDropdown');if(d)d.classList.toggle('show');}
function openNewOrder(){let dd=document.getElementById('plusDropdown');if(dd)dd.classList.remove('show');populateProductDropdown();let pv=document.getElementById('orderSlipPreview');if(pv)pv.innerText=' - Slip #'+db.nextSlip;let m=document.getElementById('orderModal');if(m)m.classList.add('show');}
function closeOrderModal(){let m=document.getElementById('orderModal');if(m)m.classList.remove('show');}
function populateProductDropdown(){let sel=document.getElementById('f_type');if(!sel)return;sel.innerHTML='';if(db.tailoredProducts.length===0){sel.innerHTML='<option>No products - Add in Portal > Tailored</option>';}else{db.tailoredProducts.forEach(p=>{let o=document.createElement('option');o.value=p.name;o.innerText=p.name;sel.appendChild(o);});}renderDynamicSizes();}
function renderDynamicSizes(){let prodEl=document.getElementById('f_type');let prod=prodEl?prodEl.value:'';let cont=document.getElementById('dynamicSizeFields');if(!cont)return;cont.innerHTML='';let segs=db.sizeSegments[prod]||[];if(segs.length===0){cont.innerHTML='<div class="form-group full" style="padding:12px;background:#fff3cd;border-radius:4px;font-size:12px">No size segments for '+prod+'. Add in Portal > Size Segments</div>';return;}segs.forEach(s=>{let d=document.createElement('div');d.className='form-group';d.innerHTML='<label>'+s+'</label><input data-size="'+s+'" placeholder="'+s+'">';cont.appendChild(d);});}
let orderForm=document.getElementById('orderForm');
if(orderForm){orderForm.addEventListener('submit',function(e){e.preventDefault();let nameEl=document.getElementById('f_name');let name=nameEl?nameEl.value:'';let mobEl=document.getElementById('f_mobile');let mobile=mobEl?mobEl.value:'';let typeEl=document.getElementById('f_type');let type=typeEl?typeEl.value:'';if(!type||type.includes('No products'))return alert('Add Tailored Product first in Portal');let sizes={};document.querySelectorAll('#dynamicSizeFields input[data-size]').forEach(inp=>{sizes[inp.dataset.size]=inp.value;});let totalEl=document.getElementById('f_total');let order={id:Date.now(),slipNo:db.nextSlip,name:name,mobile:mobile,type:type,fabric:document.getElementById('f_fabric')?.value||'',qty:parseInt(document.getElementById('f_qty')?.value)||1,delivery:document.getElementById('f_delivery')?.value||'',total:parseFloat(totalEl?.value)||0,advance:parseFloat(document.getElementById('f_advance')?.value)||0,notes:document.getElementById('f_notes')?.value||'',sizes:sizes,status:'Pending',createdAt:new Date().toISOString()};order.due=order.total-order.advance;db.orders.push(order);db.nextSlip++;if(!db.customers.find(c=>c.mobile===mobile))db.customers.push({id:Date.now(),name:name,mobile:mobile});saveDB();closeOrderModal();this.reset();alert('Saved #'+order.slipNo+' - Synced to Firebase');renderAll();});}
function renderOrderSlip(){let el=document.getElementById('orderSlipList');if(!el)return;if(!db.orders.length){el.innerHTML='<div class="empty">No orders</div>';return;}let h='<table class="table"><tr><th>Slip</th><th>Customer</th><th>Product</th><th>Total</th></tr>';db.orders.slice().reverse().forEach(o=>{h+='<tr onclick="viewSlip('+o.id+')"><td>#'+o.slipNo+'</td><td>'+o.name+'</td><td>'+o.type+'</td><td>৳'+o.total+'</td></tr>';});el.innerHTML=h+'</table>';}
function viewSlip(id){let o=db.orders.find(x=>x.id===id);if(!o)return;let s='';if(o.sizes){s='<br><b>Measurements:</b> ';for(let k in o.sizes){s+=k+':'+o.sizes[k]+' | ';}}let det=document.getElementById('slipDetail');if(det)det.innerHTML='<div style="padding:20px">Slip #'+o.slipNo+'<br>'+o.name+'<br>'+o.type+s+'<br>Total ৳'+o.total+'<br><button class="btn btn-gray" onclick="deleteOrder('+o.id+')">Delete</button></div>';let m=document.getElementById('slipModal');if(m)m.classList.add('show');}
function deleteOrder(id){if(confirm('Delete?')){db.orders=db.orders.filter(o=>o.id!==id);saveDB();let m=document.getElementById('slipModal');if(m)m.classList.remove('show');renderOrderSlip();}}
function renderCustomers(){let el=document.getElementById('customerList');if(!el)return;if(!db.customers.length){el.innerHTML='<div class="empty">No customers</div>';return;}let h='<table class="table"><tr><th>Name</th><th>Mobile</th></tr>';db.customers.forEach(c=>{h+='<tr><td>'+c.name+'</td><td>'+c.mobile+'</td></tr>';});el.innerHTML=h+'</table>';}
function renderPortalProducts(){let el=document.getElementById('portalProductList');if(!el)return;el.innerHTML=db.products.length?db.products.map(p=>'<div class="attendance-row"><div><b>'+p.name+'</b></div><button class="btn btn-gray" onclick="deleteProduct('+p.id+')">Del</button></div>').join(''):'<div class="empty">No readymade</div>';}
function addProduct(){let n=document.getElementById('prodName')?.value;if(!n)return alert('Name');db.products.push({id:Date.now(),name:n,price:parseFloat(document.getElementById('prodPrice')?.value)||0,stock:parseInt(document.getElementById('prodStock')?.value)||0});saveDB();renderPortalProducts();}
function deleteProduct(id){db.products=db.products.filter(p=>p.id!==id);saveDB();renderPortalProducts();}
function renderTailoredProducts(){let el=document.getElementById('tailoredProductList'),sel=document.getElementById('sizeProductSelect');if(el)el.innerHTML=db.tailoredProducts.length?db.tailoredProducts.map(p=>'<div class="attendance-row"><div><b>'+p.name+'</b></div><button class="btn btn-gray" onclick="deleteTailoredProduct('+p.id+')">Del</button></div>').join(''):'<div class="empty">Add Shirt, Pant etc</div>';if(sel){let cur=sel.value;sel.innerHTML='<option value="">Select Product</option>';db.tailoredProducts.forEach(p=>{let o=document.createElement('option');o.value=p.name;o.innerText=p.name;sel.appendChild(o);});if(cur)sel.value=cur;}}
function addTailoredProduct(){let n=document.getElementById('tailoredName')?.value.trim();if(!n)return alert('Name');if(db.tailoredProducts.find(p=>p.name===n))return alert('Exists');db.tailoredProducts.push({id:Date.now(),name:n});if(!db.sizeSegments[n])db.sizeSegments[n]=[];saveDB();let inp=document.getElementById('tailoredName');if(inp)inp.value='';renderTailoredProducts();}
function deleteTailoredProduct(id){let p=db.tailoredProducts.find(x=>x.id===id);if(!p)return;if(!confirm('Delete '+p.name+'?'))return;db.tailoredProducts=db.tailoredProducts.filter(x=>x.id!==id);delete db.sizeSegments[p.name];saveDB();renderTailoredProducts();renderSizeSegments();}
function renderSizeSegments(){let prodEl=document.getElementById('sizeProductSelect');let prod=prodEl?prodEl.value:'';let list=document.getElementById('sizeSegmentsList');if(!list)return;if(!prod){list.innerHTML='Select product';return;}let segs=db.sizeSegments[prod]||[];list.innerHTML=segs.length?segs.map((s,i)=>'<div class="attendance-row"><div>'+s+'</div><button class="btn btn-gray" onclick="deleteSizeSegment(\''+prod+'\','+i+')">Del</button></div>').join(''):'No segments - Add Height, Chest etc';}
function addSizeSegment(){let prodEl=document.getElementById('sizeProductSelect');let prod=prodEl?prodEl.value:'';if(!prod)return alert('Select product');let nEl=document.getElementById('newSizeName');let n=nEl?nEl.value.trim():'';if(!n)return alert('Name');if(!db.sizeSegments[prod])db.sizeSegments[prod]=[];db.sizeSegments[prod].push(n);saveDB();if(nEl)nEl.value='';renderSizeSegments();}
function deleteSizeSegment(prod,idx){if(!db.sizeSegments[prod])return;db.sizeSegments[prod].splice(idx,1);saveDB();renderSizeSegments();}
function renderStaff(){let el=document.getElementById('portalStaffList');if(!el)return;el.innerHTML=db.staff.length?db.staff.map(s=>'<div class="attendance-row"><div>'+s.name+' - '+s.role+'</div><button class="btn btn-gray" onclick="deleteStaff('+s.id+')">Del</button></div>').join(''):'No staff';}
function addStaff(){let n=document.getElementById('staffName')?.value;if(!n)return alert('Name');db.staff.push({id:Date.now(),name:n,role:document.getElementById('staffRole')?.value||'',phone:document.getElementById('staffPhone')?.value||'',salary:document.getElementById('staffSalary')?.value||''});saveDB();renderStaff();}
function deleteStaff(id){db.staff=db.staff.filter(s=>s.id!==id);saveDB();renderStaff();}
function saveShopInfo(){let name=document.getElementById('shopName')?.value||'';let addr=document.getElementById('shopAddress')?.value||'';let phone=document.getElementById('shopPhone')?.value||'';localStorage.setItem('shop_info',JSON.stringify({name:name,address:addr,phone:phone}));alert('Shop info saved');}
function saveFirebaseConfig(){let cfg={apiKey:document.getElementById('fb_apiKey')?.value||'',authDomain:document.getElementById('fb_authDomain')?.value||'',projectId:document.getElementById('fb_projectId')?.value||'',storageBucket:document.getElementById('fb_storageBucket')?.value||'',messagingSenderId:document.getElementById('fb_messagingSenderId')?.value||'',appId:document.getElementById('fb_appId')?.value||''};localStorage.setItem('firebase_config',JSON.stringify(cfg));alert('Saved - Project: '+cfg.projectId+' - Reloading');location.reload();}
function testFirebase(){try{let cfg=getFirebaseConfig();alert('Testing connection to '+cfg.projectId+'...');if(fb_db){fb_db.collection('meta').doc('test').set({time:Date.now()}).then(()=>alert('✓ Firebase Write OK - Data can be saved!')).catch(e=>alert('✗ Write Failed: '+e.message));}else alert('Firebase not initialized');}catch(e){alert(e.message);}}
function clearAllData(){if(confirm('Clear all local data? This will also clear cloud if you save after.')){localStorage.clear();location.reload();}}
function renderAll(){renderOrderSlip();renderCustomers();renderPortalProducts();renderTailoredProducts();renderSizeSegments();renderStaff();updateDash();}
function updateDash(){let dc=document.getElementById('dashOrderCount');if(dc)dc.innerText=db.orders.length;let cc=document.getElementById('dashCustomerCount');if(cc)cc.innerText=db.customers.length;let st=document.getElementById('dashSaleTotal');if(st)st.innerText='৳ '+db.orders.reduce((s,o)=>s+o.total,0);let td=document.getElementById('todayDate');if(td)td.innerText=new Date().toLocaleDateString();}
window.onload=function(){
  console.log('App loading...');
  if(localStorage.getItem('raymond_auth')!=='true' && window.location.href.includes('/app/')){window.location.href='../index.html';return;}
  initFirebase();
  let eff=getFirebaseConfig();
  ['fb_apiKey','fb_authDomain','fb_projectId','fb_storageBucket','fb_messagingSenderId','fb_appId'].forEach((id,i)=>{
    let k=['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'][i];
    let el=document.getElementById(id);
    if(el)el.value=eff[k]||'';
  });
  renderAll();
  updateDash();
  console.log('App loaded, db orders:',db.orders.length);
}
