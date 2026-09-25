const DEFAULT_FIREBASE_CONFIG={apiKey:"AIzaSyDmupiTTuxwYZPci-lFehUL1pNv9TV8CE8",authDomain:"raymond-df295.firebaseapp.com",projectId:"raymond-df295",storageBucket:"raymond-df295.firebasestorage.app",messagingSenderId:"36554452985",appId:"1:36554452985:web:51546aaf1ba16d536d5728"};
let db={orders:[],customers:[],staff:[],products:[],tailoredProducts:[],sizeSegments:{},nextSlip:1,lastSync:0};
try{let d=localStorage.getItem('raymond_v2_db');if(d){db=JSON.parse(d);if(!db.tailoredProducts)db.tailoredProducts=[];if(!db.sizeSegments)db.sizeSegments={};}}catch{}
function saveDB(){db.lastSync=Date.now();localStorage.setItem('raymond_v2_db',JSON.stringify(db));if(window.firebaseReady)syncToFirebase(db);updateDash();}
let firebaseReady=false,fb_db=null;
function getFirebaseConfig(){try{let c=JSON.parse(localStorage.getItem('firebase_config'));if(c&&c.apiKey)return c}catch{}return DEFAULT_FIREBASE_CONFIG;}
function initFirebase(){try{let cfg=getFirebaseConfig();if(!firebase.apps.length)firebase.initializeApp(cfg);fb_db=firebase.firestore();firebaseReady=true;window.firebaseReady=true;let st=document.getElementById('fbStatus');if(st){st.innerText='✓ Connected - Live Sync Active (Project: '+cfg.projectId+') - FIXED NOW';st.style.color='green';}}catch(e){}}
function syncToFirebase(p){if(!fb_db)return;fb_db.collection('meta').doc('raymond').set({payload:p,updatedAt:Date.now()});}
function parseBulkConfig(){
  const bulk=document.getElementById('bulkFirebasePaste').value.trim();
  if(!bulk)return alert('Paste first');
  function ex(k){let m=bulk.match(new RegExp(k+'\\s*:\\s*"([^"]+)"','i'));return m?m[1]:'';}
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
  if(st){st.innerText='✓ 6 fields filled! Connecting...';st.style.color='green';}
  setTimeout(()=>{try{if(firebase.apps.length===0)firebase.initializeApp(cfg);fb_db=firebase.firestore();firebaseReady=true;window.firebaseReady=true;st.innerText='✓ Connected - '+cfg.projectId+' - FIXED';alert('SUCCESS! Connected '+cfg.projectId);}catch(e){alert(e.message);}},500);
}
let currentPortalSub='readymade',currentSettingsSub='shopinfo';
function switchTab(tab){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));document.getElementById('nav-'+tab).classList.add('active');document.querySelectorAll('.tab-content').forEach(t=>t.style.display='none');document.getElementById('tab-'+tab).style.display='block';let ps=document.getElementById('portalSubSidebar'),ss=document.getElementById('settingsSubSidebar');if(ps)ps.classList.remove('show');if(ss)ss.classList.remove('show');if(tab==='portal'){ps.classList.add('show');switchPortalSub(currentPortalSub);}if(tab==='settings'){ss.classList.add('show');switchSettingsSub(currentSettingsSub);}}
function switchPortalSub(sub){currentPortalSub=sub;document.querySelectorAll('#portalSubSidebar .sub-nav-item').forEach(n=>n.classList.remove('active'));document.getElementById('sub-'+sub).classList.add('active');document.querySelectorAll('.portal-sub-content').forEach(c=>c.style.display='none');document.getElementById('portal-'+sub).style.display='block';if(sub==='readymade')renderPortalProducts();if(sub==='tailored')renderTailoredProducts();if(sub==='size')renderSizeSegments();if(sub==='staff')renderStaff();}
function switchSettingsSub(sub){currentSettingsSub=sub;document.querySelectorAll('#settingsSubSidebar .sub-nav-item').forEach(n=>n.classList.remove('active'));document.getElementById('sub-'+sub).classList.add('active');document.querySelectorAll('.settings-sub-content').forEach(c=>c.style.display='none');document.getElementById('settings-'+sub).style.display='block';}
function toggleMobileMenu(){document.querySelector('.sidebar').classList.toggle('mobile-open');}
function toggleDropdown(){document.getElementById('plusDropdown').classList.toggle('show');}
function openNewOrder(){document.getElementById('plusDropdown').classList.remove('show');populateProductDropdown();document.getElementById('orderSlipPreview').innerText=' - Slip #'+db.nextSlip;document.getElementById('orderModal').classList.add('show');}
function closeOrderModal(){document.getElementById('orderModal').classList.remove('show');}
function populateProductDropdown(){let sel=document.getElementById('f_type');sel.innerHTML='';if(db.tailoredProducts.length===0){sel.innerHTML='<option>No products</option>';}else{db.tailoredProducts.forEach(p=>{let o=document.createElement('option');o.value=p.name;o.innerText=p.name;sel.appendChild(o);});}renderDynamicSizes();}
function renderDynamicSizes(){let prod=document.getElementById('f_type').value,cont=document.getElementById('dynamicSizeFields');cont.innerHTML='';let segs=db.sizeSegments[prod]||[];if(segs.length===0){cont.innerHTML='<div class="form-group full" style="padding:12px;background:#fff3cd">No size for '+prod+'</div>';return;}segs.forEach(s=>{let d=document.createElement('div');d.className='form-group';d.innerHTML='<label>'+s+'</label><input data-size="'+s+'">';cont.appendChild(d);});}
document.getElementById('orderForm')?.addEventListener('submit',function(e){e.preventDefault();let name=document.getElementById('f_name').value,mobile=document.getElementById('f_mobile').value,type=document.getElementById('f_type').value;let sizes={};document.querySelectorAll('#dynamicSizeFields input[data-size]').forEach(i=>{sizes[i.dataset.size]=i.value;});let order={id:Date.now(),slipNo:db.nextSlip,name,mobile,type,sizes,total:parseFloat(document.getElementById('f_total').value)||0,status:'Pending',createdAt:new Date().toISOString()};db.orders.push(order);db.nextSlip++;saveDB();closeOrderModal();alert('Saved #'+order.slipNo);});
function renderOrderSlip(){let el=document.getElementById('orderSlipList');if(!el)return;el.innerHTML=db.orders.length?db.orders.map(o=>'<div>'+o.name+' - '+o.type+'</div>').join(''):'No orders';}
function renderCustomers(){}
function renderPortalProducts(){let el=document.getElementById('portalProductList');if(el)el.innerHTML=db.products.length?db.products.map(p=>'<div>'+p.name+'</div>').join(''):'No products';}
function addProduct(){let n=document.getElementById('prodName').value;if(!n)return;db.products.push({id:Date.now(),name:n,price:0});saveDB();renderPortalProducts();}
function renderTailoredProducts(){let el=document.getElementById('tailoredProductList'),sel=document.getElementById('sizeProductSelect');if(el)el.innerHTML=db.tailoredProducts.map(p=>'<div>'+p.name+' <button onclick="deleteTailoredProduct('+p.id+')">Del</button></div>').join('');if(sel){sel.innerHTML='<option value="">Select</option>';db.tailoredProducts.forEach(p=>{let o=document.createElement('option');o.value=p.name;o.innerText=p.name;sel.appendChild(o);});}}
function addTailoredProduct(){let n=document.getElementById('tailoredName').value.trim();if(!n)return;db.tailoredProducts.push({id:Date.now(),name:n});if(!db.sizeSegments[n])db.sizeSegments[n]=[];saveDB();renderTailoredProducts();}
function deleteTailoredProduct(id){db.tailoredProducts=db.tailoredProducts.filter(x=>x.id!==id);saveDB();renderTailoredProducts();}
function renderSizeSegments(){let prod=document.getElementById('sizeProductSelect').value,list=document.getElementById('sizeSegmentsList');if(!prod){list.innerHTML='Select product';return;}let segs=db.sizeSegments[prod]||[];list.innerHTML=segs.map((s,i)=>'<div>'+s+' <button onclick="deleteSizeSegment(\''+prod+'\','+i+')">Del</button></div>').join('')||'No segments';}
function addSizeSegment(){let prod=document.getElementById('sizeProductSelect').value;if(!prod)return alert('Select product');let n=document.getElementById('newSizeName').value.trim();if(!n)return;if(!db.sizeSegments[prod])db.sizeSegments[prod]=[];db.sizeSegments[prod].push(n);saveDB();renderSizeSegments();}
function deleteSizeSegment(p,i){db.sizeSegments[p].splice(i,1);saveDB();renderSizeSegments();}
function renderStaff(){}
function updateDash(){}
function renderAll(){renderPortalProducts();renderTailoredProducts();renderSizeSegments();}
window.onload=function(){if(localStorage.getItem('raymond_auth')!=='true'&&location.href.includes('/app/')){location.href='../index.html';return;}initFirebase();let eff=getFirebaseConfig();['fb_apiKey','fb_authDomain','fb_projectId','fb_storageBucket','fb_messagingSenderId','fb_appId'].forEach((id,i)=>{let k=['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'][i];let el=document.getElementById(id);if(el)el.value=eff[k]||'';});renderAll();}
