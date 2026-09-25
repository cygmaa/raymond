
const DEFAULT_FIREBASE_CONFIG={apiKey:"AIzaSyDmupiTTuxwYZPci-lFehUL1pNv9TV8CE8",authDomain:"raymond-df295.firebaseapp.com",projectId:"raymond-df295",storageBucket:"raymond-df295.firebasestorage.app",messagingSenderId:"36554452985",appId:"1:36554452985:web:51546aaf1ba16d536d5728"};
let db={orders:[],customers:[],staff:[],products:[],tailoredProducts:[],sizeSegments:{},nextSlip:1,lastSync:0};
try{let d=localStorage.getItem('raymond_v2_db');if(d){db=JSON.parse(d);if(!db.tailoredProducts)db.tailoredProducts=[];if(!db.sizeSegments)db.sizeSegments={};}}catch{}
function saveDB(){
  db.lastSync=Date.now();
  localStorage.setItem('raymond_v2_db',JSON.stringify(db));
  console.log('saveDB local, fb_db:',!!fb_db);
  if(fb_db){ syncToFirebase(db); }
  updateDash();
}
let firebaseReady=false,fb_db=null,fb_unsubscribe=null;
function getFirebaseConfig(){try{let c=JSON.parse(localStorage.getItem('firebase_config'));if(c&&c.apiKey)return c}catch{}return DEFAULT_FIREBASE_CONFIG;}
function initFirebase(){
  try{
    let cfg=getFirebaseConfig();
    console.log('initFirebase with',cfg.projectId);
    if(!firebase.apps.length){
      firebase.initializeApp(cfg);
    }
    fb_db=firebase.firestore();
    firebaseReady=true;window.firebaseReady=true;
    let st=document.getElementById('fbStatus');
    if(st){st.innerText='✓ Connected - Live Sync Active (Project: '+cfg.projectId+')';st.style.color='green';}
    // Unsubscribe previous
    if(fb_unsubscribe){ fb_unsubscribe(); fb_unsubscribe=null; }
    fb_unsubscribe = fb_db.collection('meta').doc('raymond').onSnapshot(doc=>{
      if(doc.exists){
        let data=doc.data();
        console.log('onSnapshot remote updatedAt',data.updatedAt,'local lastSync',db.lastSync);
        if(data.updatedAt > (db.lastSync||0)+2000){
          console.log('Remote newer, applying');
          let remote = data.payload;
          if(remote){
            db=remote;
            if(!db.tailoredProducts)db.tailoredProducts=[];
            if(!db.sizeSegments)db.sizeSegments={};
            if(!db.staff)db.staff=[];
            if(!db.products)db.products=[];
            if(!db.orders)db.orders=[];
            if(!db.customers)db.customers=[];
            localStorage.setItem('raymond_v2_db',JSON.stringify(db));
            renderAll();
          }
        }
      }else{
        console.log('No remote doc, pushing local');
        syncToFirebase(db);
      }
    }, err=>{
      console.error('Snapshot error',err);
      let st=document.getElementById('fbStatus');
      if(st){st.innerText='✗ Listener Error: '+err.message;st.style.color='red';}
    });
  }catch(e){
    console.error('init error',e);
    let st=document.getElementById('fbStatus');
    if(st){st.innerText='✗ Init Error: '+e.message;st.style.color='red';}
  }
}
function syncToFirebase(payload){
  if(!fb_db){ console.error('fb_db null'); return; }
  fb_db.collection('meta').doc('raymond').set({payload:payload,updatedAt:Date.now()}).then(()=>{
    console.log('Push success');
    let st=document.getElementById('fbStatus');
    if(st){st.innerText='✓ Saved to cloud - '+new Date().toLocaleTimeString()+' - '+getFirebaseConfig().projectId;st.style.color='green';}
  }).catch(err=>{
    console.error('Push failed',err);
    alert('Firebase Save Failed: '+err.message+'\n\nFirestore Rules check: allow read, write: if true;');
  });
}
function parseBulkConfig(){
  const bulk=document.getElementById('bulkFirebasePaste').value.trim();
  if(!bulk)return alert('Paste first');
  function ex(k){
    let m=bulk.match(new RegExp(k+'\\s*:\\s*"([^"]+)"','i'));
    if(m)return m[1];
    m=bulk.match(new RegExp(k+"\\s*:\\s*'([^']+)'",'i'));
    return m?m[1]:'';
  }
  let cfg={apiKey:ex('apiKey'),authDomain:ex('authDomain'),projectId:ex('projectId'),storageBucket:ex('storageBucket'),messagingSenderId:ex('messagingSenderId'),appId:ex('appId')};
  if(!cfg.apiKey){alert('Parse failed');return;}
  document.getElementById('fb_apiKey').value=cfg.apiKey;
  document.getElementById('fb_authDomain').value=cfg.authDomain;
  document.getElementById('fb_projectId').value=cfg.projectId;
  document.getElementById('fb_storageBucket').value=cfg.storageBucket;
  document.getElementById('fb_messagingSenderId').value=cfg.messagingSenderId;
  document.getElementById('fb_appId').value=cfg.appId;
  localStorage.setItem('firebase_config',JSON.stringify(cfg));
  let st=document.getElementById('fbStatus');
  if(st){st.innerText='✓ 6 fields filled! Reconnecting...';st.style.color='green';}
  // For new config, we need to re-init: delete old app if project changed
  try{
    let currentProject = firebase.apps.length ? firebase.apps[0].options.projectId : null;
    if(currentProject && currentProject !== cfg.projectId){
      firebase.apps[0].delete().then(()=>{ firebase.initializeApp(cfg); initFirebase(); alert('SUCCESS! Connected to '+cfg.projectId); });
    }else{
      if(!firebase.apps.length) firebase.initializeApp(cfg);
      initFirebase();
      alert('SUCCESS! Connected '+cfg.projectId);
    }
  }catch(e){
    initFirebase();
  }
}
let currentPortalSub='readymade',currentSettingsSub='shopinfo';
function switchPortalSub(sub){
  currentPortalSub=sub;
  document.querySelectorAll('#portalSubSidebar .sub-nav-item').forEach(n=>n.classList.remove('active'));
  let s=document.getElementById('sub-'+sub);
  if(s)s.classList.add('active');
  document.querySelectorAll('.portal-sub-content').forEach(c=>c.style.display='none');
  let el=document.getElementById('portal-'+sub);
  if(el)el.style.display='block';
  if(sub==='readymade' && typeof renderPortalProducts==='function') renderPortalProducts();
  if(sub==='tailored' && typeof renderTailoredProducts==='function') renderTailoredProducts();
  if(sub==='size' && typeof renderSizeSegments==='function') renderSizeSegments();
  if(sub==='staff' && typeof renderStaff==='function') renderStaff();
}
function switchSettingsSub(sub){
  currentSettingsSub=sub;
  document.querySelectorAll('#settingsSubSidebar .sub-nav-item').forEach(n=>n.classList.remove('active'));
  let s=document.getElementById('sub-'+sub);
  if(s)s.classList.add('active');
  document.querySelectorAll('.settings-sub-content').forEach(c=>c.style.display='none');
  let el=document.getElementById('settings-'+sub);
  if(el)el.style.display='block';
}
function toggleMobileMenu(){let sb=document.querySelector('.sidebar');if(sb)sb.classList.toggle('mobile-open');}
function openNewOrder(){populateProductDropdown();let pv=document.getElementById('orderSlipPreview');if(pv)pv.innerText=' - Slip #'+db.nextSlip;let m=document.getElementById('orderModal');if(m){m.style.display='flex';}}
function closeOrderModal(){let m=document.getElementById('orderModal');if(m)m.style.display='none';}
function populateProductDropdown(){let sel=document.getElementById('f_type');if(!sel)return;sel.innerHTML='';if(db.tailoredProducts.length===0){sel.innerHTML='<option>No products - Add in Portal > Tailored</option>';}else{db.tailoredProducts.forEach(p=>{let o=document.createElement('option');o.value=p.name;o.innerText=p.name;sel.appendChild(o);});}renderDynamicSizes();}
function renderDynamicSizes(){let prodEl=document.getElementById('f_type');let prod=prodEl?prodEl.value:'';let cont=document.getElementById('dynamicSizeFields');if(!cont)return;cont.innerHTML='';let segs=db.sizeSegments[prod]||[];if(segs.length===0){cont.innerHTML='<div style=grid-column:1/-1;padding:12px;background:#fff3cd;border-radius:4px;font-size:13px>No size segments for '+prod+'. Add in Portal > Size Segments</div>';return;}segs.forEach(s=>{let d=document.createElement('div');d.innerHTML='<label style=font-size:12px>'+s+'</label><input data-size=\''+s+'\' placeholder=\''+s+'\' style=width:100%;padding:6px;border:1px solid #ddd;margin-top:2px>';cont.appendChild(d);});}
let orderForm=document.getElementById('orderForm');
if(orderForm){orderForm.addEventListener('submit',function(e){e.preventDefault();let nameEl=document.getElementById('f_name');let name=nameEl?nameEl.value:'';let mobEl=document.getElementById('f_mobile');let mobile=mobEl?mobEl.value:'';let typeEl=document.getElementById('f_type');let type=typeEl?typeEl.value:'';if(!type||type.includes('No products'))return alert('Add Tailored Product first in Portal');let sizes={};document.querySelectorAll('#dynamicSizeFields input[data-size]').forEach(inp=>{sizes[inp.dataset.size]=inp.value;});let totalEl=document.getElementById('f_total');let order={id:Date.now(),slipNo:db.nextSlip,name:name,mobile:mobile,type:type,fabric:document.getElementById('f_fabric')?.value||'',qty:parseInt(document.getElementById('f_qty')?.value)||1,delivery:document.getElementById('f_delivery')?.value||'',total:parseFloat(totalEl?.value)||0,advance:parseFloat(document.getElementById('f_advance')?.value)||0,notes:document.getElementById('f_notes')?.value||'',sizes:sizes,status:'Pending',createdAt:new Date().toISOString()};order.due=order.total-order.advance;db.orders.push(order);db.nextSlip++;if(!db.customers.find(c=>c.mobile===mobile))db.customers.push({id:Date.now(),name:name,mobile:mobile});saveDB();closeOrderModal();this.reset();alert('Saved #'+order.slipNo+' - Synced to Firebase');renderAll();});}
function renderOrderSlip(){let el=document.getElementById('orderSlipList');if(!el)return;if(!db.orders.length){el.innerHTML='<div style=padding:20px;color:#666>No orders</div>';return;}let h='<table style=width:100%;border-collapse:collapse><tr style=background:#f5f5f5><th style=padding:8px;text-align:left;border:1px solid #ddd>Slip</th><th style=padding:8px;text-align:left;border:1px solid #ddd>Customer</th><th style=padding:8px;text-align:left;border:1px solid #ddd>Product</th><th style=padding:8px;text-align:left;border:1px solid #ddd>Total</th></tr>';db.orders.slice().reverse().forEach(o=>{h+='<tr style=cursor:pointer onclick=viewSlip('+o.id+')><td style=padding:8px;border:1px solid #ddd>#'+o.slipNo+'</td><td style=padding:8px;border:1px solid #ddd>'+o.name+'</td><td style=padding:8px;border:1px solid #ddd>'+o.type+'</td><td style=padding:8px;border:1px solid #ddd>৳'+o.total+'</td></tr>';});el.innerHTML=h+'</table>';}
function viewSlip(id){let o=db.orders.find(x=>x.id===id);if(!o)return;let s='';if(o.sizes){s='<br><b>Measurements:</b><br>';for(let k in o.sizes){s+=k+': '+o.sizes[k]+' | ';}}let det=document.getElementById('slipDetail');if(det)det.innerHTML='<div style=padding:10px><b>Slip #'+o.slipNo+'</b><br>'+o.name+' - '+o.mobile+'<br>'+o.type+s+'<br>Total ৳'+o.total+'<br><br><button class=btn btn-gray onclick=deleteOrder('+o.id+')>Delete</button></div>';let m=document.getElementById('slipModal');if(m)m.style.display='flex';}
function deleteOrder(id){if(confirm('Delete?')){db.orders=db.orders.filter(o=>o.id!==id);saveDB();let m=document.getElementById('slipModal');if(m)m.style.display='none';renderOrderSlip();}}
function renderCustomers(){let el=document.getElementById('customerList');if(!el)return;if(!db.customers.length){el.innerHTML='<div style=padding:20px;color:#666>No customers</div>';return;}let h='<table style=width:100%;border-collapse:collapse><tr style=background:#f5f5f5><th style=padding:8px;text-align:left;border:1px solid #ddd>Name</th><th style=padding:8px;text-align:left;border:1px solid #ddd>Mobile</th></tr>';db.customers.forEach(c=>{h+='<tr><td style=padding:8px;border:1px solid #ddd>'+c.name+'</td><td style=padding:8px;border:1px solid #ddd>'+c.mobile+'</td></tr>';});el.innerHTML=h+'</table>';}
function renderPortalProducts(){let el=document.getElementById('portalProductList');if(!el)return;el.innerHTML=db.products.length?db.products.map(p=>'<div style=display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee><div><b>'+p.name+'</b></div><button class=btn btn-gray onclick=deleteProduct('+p.id+')>Del</button></div>').join(''):'<div style=padding:20px;color:#666>No readymade</div>';}
function addProduct(){let n=document.getElementById('prodName')?.value;if(!n)return alert('Name');db.products.push({id:Date.now(),name:n,price:parseFloat(document.getElementById('prodPrice')?.value)||0,stock:parseInt(document.getElementById('prodStock')?.value)||0});saveDB();let el=document.getElementById('prodName');if(el)el.value='';renderPortalProducts();}
function deleteProduct(id){db.products=db.products.filter(p=>p.id!==id);saveDB();renderPortalProducts();}
function renderTailoredProducts(){let el=document.getElementById('tailoredProductList'),sel=document.getElementById('sizeProductSelect');if(el)el.innerHTML=db.tailoredProducts.length?db.tailoredProducts.map(p=>'<div style=display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee><div><b>'+p.name+'</b></div><button class=btn btn-gray onclick=deleteTailoredProduct('+p.id+')>Del</button></div>').join(''):'<div style=padding:20px;color:#666>Add Shirt, Pant etc</div>';if(sel){let cur=sel.value;sel.innerHTML='<option value="">Select Product</option>';db.tailoredProducts.forEach(p=>{let o=document.createElement('option');o.value=p.name;o.innerText=p.name;sel.appendChild(o);});if(cur)sel.value=cur;}}
function addTailoredProduct(){let n=document.getElementById('tailoredName')?.value.trim();if(!n)return alert('Name');if(db.tailoredProducts.find(p=>p.name===n))return alert('Exists');db.tailoredProducts.push({id:Date.now(),name:n});if(!db.sizeSegments[n])db.sizeSegments[n]=[];saveDB();let inp=document.getElementById('tailoredName');if(inp)inp.value='';renderTailoredProducts();}
function deleteTailoredProduct(id){let p=db.tailoredProducts.find(x=>x.id===id);if(!p)return;if(!confirm('Delete '+p.name+'?'))return;db.tailoredProducts=db.tailoredProducts.filter(x=>x.id!==id);delete db.sizeSegments[p.name];saveDB();renderTailoredProducts();renderSizeSegments();}
function renderSizeSegments(){let prodEl=document.getElementById('sizeProductSelect');let prod=prodEl?prodEl.value:'';let list=document.getElementById('sizeSegmentsList');if(!list)return;if(!prod){list.innerHTML='Select product';return;}let segs=db.sizeSegments[prod]||[];list.innerHTML=segs.length?segs.map((s,i)=>'<div style=display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee><div>'+s+'</div><button class=btn btn-gray onclick=deleteSizeSegment(\''+prod+'\','+i+')>Del</button></div>').join(''):'No segments - Add Height, Chest etc';}
function addSizeSegment(){let prodEl=document.getElementById('sizeProductSelect');let prod=prodEl?prodEl.value:'';if(!prod)return alert('Select product');let nEl=document.getElementById('newSizeName');let n=nEl?nEl.value.trim():'';if(!n)return alert('Name');if(!db.sizeSegments[prod])db.sizeSegments[prod]=[];db.sizeSegments[prod].push(n);saveDB();if(nEl)nEl.value='';renderSizeSegments();}
function deleteSizeSegment(prod,idx){if(!db.sizeSegments[prod])return;db.sizeSegments[prod].splice(idx,1);saveDB();renderSizeSegments();}
function renderStaff(){let el=document.getElementById('portalStaffList');if(!el)return;el.innerHTML=db.staff.length?db.staff.map(s=>'<div style=display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee><div>'+s.name+' - '+s.role+'</div><button class=btn btn-gray onclick=deleteStaff('+s.id+')>Del</button></div>').join(''):'No staff';}
function addStaff(){let n=document.getElementById('staffName')?.value;if(!n)return alert('Name');db.staff.push({id:Date.now(),name:n,role:document.getElementById('staffRole')?.value||'',phone:document.getElementById('staffPhone')?.value||'',salary:document.getElementById('staffSalary')?.value||''});saveDB();let els=['staffName','staffRole','staffPhone','staffSalary'];els.forEach(id=>{let e=document.getElementById(id);if(e)e.value='';});renderStaff();renderAttendance();}
function deleteStaff(id){db.staff=db.staff.filter(s=>s.id!==id);saveDB();renderStaff();renderAttendance();}
function saveShopInfo(){let name=document.getElementById('shopName')?.value||'';let addr=document.getElementById('shopAddress')?.value||'';let phone=document.getElementById('shopPhone')?.value||'';localStorage.setItem('shop_info',JSON.stringify({name:name,address:addr,phone:phone}));alert('Company info saved');}
function changeAdminCode(){let cur=document.getElementById('currentAdminCode')?.value||'';let nw=document.getElementById('newAdminCode')?.value||'';let conf=document.getElementById('confirmAdminCode')?.value||'';let real=localStorage.getItem('admin_code')||'Raymond0@.';if(cur!==real)return alert('Current wrong');if(nw!==conf)return alert('Confirm mismatch');localStorage.setItem('admin_code',nw);alert('Code changed');}
function saveFirebaseConfig(){let cfg={apiKey:document.getElementById('fb_apiKey')?.value||'',authDomain:document.getElementById('fb_authDomain')?.value||'',projectId:document.getElementById('fb_projectId')?.value||'',storageBucket:document.getElementById('fb_storageBucket')?.value||'',messagingSenderId:document.getElementById('fb_messagingSenderId')?.value||'',appId:document.getElementById('fb_appId')?.value||''};localStorage.setItem('firebase_config',JSON.stringify(cfg));alert('Saved - Project: '+cfg.projectId+' - Reloading');location.reload();}
function testFirebase(){try{let cfg=getFirebaseConfig();alert('Testing connection to '+cfg.projectId+'...');if(fb_db){fb_db.collection('meta').doc('test').set({time:Date.now()}).then(()=>alert('✓ Firebase Write OK - Data can be saved!')).catch(e=>alert('✗ Write Failed: '+e.message));}else alert('Firebase not initialized');}catch(e){alert(e.message);}}
function clearAllData(){if(confirm('Clear all local data?')){localStorage.removeItem('raymond_v2_db');location.reload();}}
function loadAttendance(){let d=localStorage.getItem('raymond_attendance_v2');return d?JSON.parse(d):{};}
function saveAttendance(a){localStorage.setItem('raymond_attendance_v2',JSON.stringify(a));}
function renderAttendance(){let el=document.getElementById('attendanceList');if(!el)return;if(!db.staff.length){el.innerHTML='<div style=font-size:13px;color:#666>No staff - Add in Portal > Staff Management</div>';return;}let att=loadAttendance(),today=new Date().toISOString().split('T')[0],todayAtt=att[today]||{};let h='';db.staff.forEach(s=>{let p=!!todayAtt[s.id];h+='<div style=display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee><div style=font-size:13px><b>'+s.name+'</b> - '+s.role+'</div><button class=btn '+(p?'btn-red':'btn-gray')+' style=font-size:12px onclick=toggleAttendance('+s.id+')>'+(p?'Present':'Mark')+'</button></div>';});el.innerHTML=h;}
function toggleAttendance(id){let att=loadAttendance(),today=new Date().toISOString().split('T')[0];if(!att[today])att[today]={};if(att[today][id])delete att[today][id];else att[today][id]={time:new Date().toLocaleString()};saveAttendance(att);renderAttendance();}
function renderAll(){renderOrderSlip();renderCustomers();renderPortalProducts();renderTailoredProducts();renderSizeSegments();renderStaff();renderAttendance();updateDash();}
function updateDash(){let dc=document.getElementById('dashOrderCount');if(dc)dc.innerText=db.orders.length;let cc=document.getElementById('dashCustomerCount');if(cc)cc.innerText=db.customers.length;let st=document.getElementById('dashSaleTotal');if(st)st.innerText='৳ '+db.orders.reduce((s,o)=>s+o.total,0);let dc2=document.getElementById('dashOrderCount2');if(dc2)dc2.innerText=db.orders.length;let cc2=document.getElementById('dashCustomerCount2');if(cc2)cc2.innerText=db.customers.length;let st2=document.getElementById('dashSaleTotal2');if(st2)st2.innerText='৳ '+db.orders.reduce((s,o)=>s+o.total,0);let dd=document.getElementById('dashDate');if(dd)dd.innerText=new Date().toLocaleDateString();let td=document.getElementById('todayDate');if(td)td.innerText=new Date().toLocaleDateString();}
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
  let shopInfo=localStorage.getItem('shop_info');
  if(shopInfo){try{let s=JSON.parse(shopInfo);let n=document.getElementById('shopName');if(n)n.value=s.name||'';let a=document.getElementById('shopAddress');if(a)a.value=s.address||'';let p=document.getElementById('shopPhone');if(p)p.value=s.phone||'';}catch{}}
  renderAll();
}
