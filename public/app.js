const tabs=document.querySelectorAll('.tab'),screens=document.querySelectorAll('.screen');
const baseRooms=[
 {id:'maris',name:'Maris After Dark',handle:'@marisafterdark',viewers:'18.4K',people:'M',color:'linear-gradient(135deg,#4f46e5 0%,#0891b2 49%,#f72585 100%)',avatar:'M'},
 {id:'jay',name:'Studio Sessions',handle:'@jaywaves',viewers:'6,892',people:'J',color:'linear-gradient(135deg,#ff7a18,#af002d 50%,#319197)',avatar:'J'},
 {id:'milo',name:'Unfiltered Opinions',handle:'@milotalks',viewers:'2,143',people:'M',color:'linear-gradient(135deg,#14532d,#22c55e 55%,#0891b2)',avatar:'M'}
];
let rooms=JSON.parse(localStorage.getItem('vibe-live-rooms')||'[]'),selectedVibe='Just chatting';
const allRooms=()=>[...rooms,...baseRooms];
function show(name){screens.forEach(s=>s.classList.toggle('active',s.id===`screen-${name}`));tabs.forEach(t=>t.classList.toggle('active',t.dataset.screen===name));window.scrollTo(0,0);if(name==='home')renderFeed();if(name==='profile')renderProfile()}
tabs.forEach(t=>t.addEventListener('click',()=>show(t.dataset.screen)));
function art(room){return `<div class="live-art" style="--art:${room.color}"><span class="live-label">LIVE</span><span class="viewer">◉ ${room.viewers}</span></div>`}
function renderFeed(){document.getElementById('feed').innerHTML=allRooms().map((r,i)=>`<button class="live-card" data-room="${r.id}">${art(r)}<div class="live-meta"><div class="avatar ${i===1?'orange':i===2?'blue':''}">${r.avatar}</div><div><strong>${r.name}</strong><p>${r.handle} · AI + real fans</p></div><span class="heart">♥</span></div></button>`).join('');document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>openRoom(b.dataset.room))}
function openRoom(id){const r=allRooms().find(x=>x.id===id);document.getElementById('room-detail').innerHTML=`<div class="detail-art" style="--art:${r.color}"><span class="live-label">LIVE NOW</span><span class="viewer">◉ ${r.viewers}</span></div><div class="room-panel"><h1>${r.name}</h1><p>${r.handle} · ${r.people==='Y'?'Your saved preview room':'AI fans and real fans are watching'}</p><div class="room-actions"><button class="join" id="join-room">JOIN LIVE</button><button class="heart-btn" id="heart-room">♡ Send heart</button></div></div>`;show('detail');document.getElementById('join-room').onclick=e=>{e.target.textContent='YOU’RE WATCHING';e.target.disabled=true};document.getElementById('heart-room').onclick=e=>{e.target.textContent='♥ Heart sent';e.target.style.color='#fb2c8a'}}
document.getElementById('detail-back').onclick=()=>show('home');
document.getElementById('hero-live').onclick=()=>show('add');
document.getElementById('refresh-feed').onclick=()=>{baseRooms.push(baseRooms.shift());renderFeed()};
document.querySelectorAll('.vibe').forEach(b=>b.onclick=()=>{selectedVibe=b.dataset.vibe;document.querySelectorAll('.vibe').forEach(x=>x.classList.toggle('active',x===b))});
document.getElementById('room-form').onsubmit=e=>{e.preventDefault();const title=document.getElementById('room-title').value.trim();if(!title)return;const crowd=document.getElementById('crowd').value;const room={id:'mine-'+Date.now(),name:title,handle:'@newcreator',viewers:crowd==='1000000'?'1M':crowd==='12000'?'12K':'300',people:'Y',color:'linear-gradient(135deg,#0284c7,#4f46e5 54%,#ec4899)',avatar:'Y',vibe:selectedVibe};rooms.unshift(room);localStorage.setItem('vibe-live-rooms',JSON.stringify(rooms));document.getElementById('room-form').reset();openRoom(room.id)};
function renderProfile(){document.getElementById('stat-lives').textContent=rooms.length}
renderFeed();renderProfile();