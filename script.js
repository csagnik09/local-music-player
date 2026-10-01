const $=s=>document.querySelector(s);
const audio=new Audio();audio.preload="metadata";
let tracks=[],view="all",albumKey=null,cur=null,shuffle=false,repeat=0,filter="",nid=1,shown=[];
const dirImg={};
let playlists=[],plId=null;
try{playlists=JSON.parse(localStorage.getItem("lmp.playlists")||"[]")}catch(e){playlists=[]}
const save=()=>{try{localStorage.setItem("lmp.playlists",JSON.stringify(playlists))}catch(e){}};
const tkey=t=>t.path+"|"+t.file.size;
const curPl=()=>playlists.find(p=>p.id===plId);
let tt;const toast=m=>{const e=$("#toast");e.textContent=m;e.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>e.classList.remove("on"),1800)};
function ask(title,val,confirm){return new Promise(res=>{
  const i=$("#di");$("#dt").textContent=title;i.style.display=confirm?"none":"";i.value=val||"";$("#dlg").classList.add("on");
  if(!confirm)setTimeout(()=>{i.focus();i.select()},30);
  const done=v=>{$("#dlg").classList.remove("on");$("#dok").onclick=$("#dc").onclick=i.onkeydown=null;res(v)};
  $("#dok").onclick=()=>done(confirm?true:(i.value.trim()||null));$("#dc").onclick=()=>done(null);
  i.onkeydown=e=>{if(e.key==="Enter")$("#dok").click();if(e.key==="Escape")done(null)};
})}
const newPl=name=>{const p={id:Date.now()+Math.random().toString(36).slice(2,6),name,items:[]};playlists.push(p);save();return p};
function toggleIn(p,t){const k=tkey(t),i=p.items.indexOf(k);
  if(i<0){p.items.push(k);toast("Added to "+p.name)}else{p.items.splice(i,1);toast("Removed from "+p.name)}save();render()}
function closeMenu(){$("#menu").style.display="none"}
function openMenu(t,el){
  const m=$("#menu"),r=el.getBoundingClientRect();m.innerHTML="";
  playlists.forEach(p=>{const b=document.createElement("button");b.textContent=(p.items.includes(tkey(t))?"✓ ":"")+p.name;b.onclick=()=>{closeMenu();toggleIn(p,t)};m.append(b)});
  const n=document.createElement("button");n.className="new";n.textContent="+ New playlist";
  n.onclick=async()=>{closeMenu();const nm=await ask("New playlist","");if(nm)toggleIn(newPl(nm),t)};m.append(n);
  m.style.display="block";
  m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+"px";
  let y=r.bottom+4;if(y+m.offsetHeight>innerHeight-8)y=Math.max(8,r.top-m.offsetHeight-4);m.style.top=y+"px";
}
function renderPls(){
  const box=$("#pls");box.innerHTML="";
  playlists.forEach(p=>{const b=document.createElement("button");b.className="nav"+(view==="playlist"&&plId===p.id?" on":"");
    const i=document.createElement("span");i.className="pi";i.textContent="♫";
    const n=document.createElement("span");n.className="pn";n.textContent=p.name;b.append(i,n);
    b.onclick=()=>{view="playlist";plId=p.id;$("#list").scrollTop=0;render()};box.append(b)});
}
const AUD=/\.(mp3|m4a|mp4|aac|flac|wav|ogg|oga|opus|weba|webm)$/i,IMG=/\.(jpe?g|png|webp|gif|bmp)$/i;
const P='<path d="M8 5v14l11-7z"/>',PA='<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';
const fmt=s=>{if(!isFinite(s))return"–:––";s=Math.floor(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};
const grad=s=>{const h=hue(s);return`linear-gradient(135deg,hsl(${h} 60% 45%),hsl(${(h+50)%360} 60% 28%))`};
const akey=t=>t.album.toLowerCase();
const artOf=t=>t&&(t.art||(dirImg[t.dir]||{}).url)||null;
const bg=t=>{const a=artOf(t);return a?`url('${a}') center/cover no-repeat`:grad(t.album+t.title)};

/* ---------- tag + artwork readers ---------- */
const toURL=b=>new Promise(res=>{
  const fr=new FileReader();
  fr.onerror=()=>res(null);
  fr.onload=()=>{const i=new Image();
    i.onload=()=>{try{const k=Math.min(1,400/Math.max(i.width,i.height)),c=document.createElement("canvas");
      c.width=Math.max(1,Math.round(i.width*k));c.height=Math.max(1,Math.round(i.height*k));
      c.getContext("2d").drawImage(i,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.85))}catch(e){res(fr.result)}};
    i.onerror=()=>res(fr.result);i.src=fr.result};
  fr.readAsDataURL(b);
});
const sniff=u=>u[0]===0x89?"image/png":u[0]===0x47?"image/gif":"image/jpeg";
const str=(u,l="utf-8")=>new TextDecoder(l).decode(u).replace(/\0+$/,"");
const ss=(b,p)=>((b[p]&127)<<21)|((b[p+1]&127)<<14)|((b[p+2]&127)<<7)|(b[p+3]&127);
async function id3(file){
  const h=new Uint8Array(await file.slice(0,10).arrayBuffer());
  if(str(h.slice(0,3),"latin1")!=="ID3")return{};
  const ver=h[3],size=ss(h,6);
  const b=new Uint8Array(await file.slice(10,10+size).arrayBuffer()),dv=new DataView(b.buffer),r={};
  let p=0;if(h[5]&64)p=ver===4?ss(b,0):dv.getUint32(0)+4;
  const txt=d=>str(d.slice(1),["latin1","utf-16","utf-16be","utf-8"][d[0]]||"utf-8");
  const M={TT2:"TIT2",TP1:"TPE1",TAL:"TALB",TRK:"TRCK",PIC:"APIC"};
  while(p+(ver===2?6:10)<=b.length){
    let id,fs,d;
    if(ver===2){id=M[str(b.slice(p,p+3),"latin1")]||"";fs=(b[p+3]<<16)|(b[p+4]<<8)|b[p+5];d=b.slice(p+6,p+6+fs);p+=6+fs;if(!fs)break}
    else{id=str(b.slice(p,p+4),"latin1");if(!/^[A-Z0-9]{4}$/.test(id))break;
      fs=ver===4?ss(b,p+4):dv.getUint32(p+4);d=b.slice(p+10,p+10+fs);p+=10+fs}
    if(id==="TIT2")r.title=txt(d);else if(id==="TPE1")r.artist=txt(d);else if(id==="TALB")r.album=txt(d);
    else if(id==="TRCK")r.trk=parseInt(txt(d))||null;
    else if(id==="APIC"&&!r.art){
      const enc=d[0];let i=1;if(ver===2)i=5;else{while(i<d.length&&d[i])i++;i+=2}let j=i;
      if(enc===1||enc===2){while(j+1<d.length&&(d[j]||d[j+1]))j+=2;j+=2}else{while(j<d.length&&d[j])j++;j++}
      const img=d.slice(j);if(img.length)r.art=new Blob([img],{type:sniff(img)});
    }
  }
  return r;
}
async function flac(file){
  const b=new Uint8Array(await file.slice(0,10*1024*1024).arrayBuffer()),r={};
  if(str(b.slice(0,4),"latin1")!=="fLaC")return r;
  let p=4;
  while(p+4<=b.length){
    const last=b[p]&128,t=b[p]&127,len=(b[p+1]<<16)|(b[p+2]<<8)|b[p+3];p+=4;if(p+len>b.length)break;
    const d=b.slice(p,p+len),v=new DataView(d.buffer,d.byteOffset,d.length);
    if(t===4){
      let q=4+v.getUint32(0,true);const n=v.getUint32(q,true);q+=4;
      for(let k=0;k<n&&q<d.length;k++){const l=v.getUint32(q,true);q+=4;const s=str(d.slice(q,q+l));q+=l;
        const e=s.indexOf("=");if(e<0)continue;const key=s.slice(0,e).toUpperCase(),val=s.slice(e+1);
        if(key==="TITLE")r.title=val;else if(key==="ARTIST")r.artist=val;else if(key==="ALBUM")r.album=val;else if(key==="TRACKNUMBER")r.trk=parseInt(val)||null}
    }else if(t===6&&!r.art){
      let q=4;q+=4+v.getUint32(q);q+=4+v.getUint32(q);q+=16;const pl=v.getUint32(q);q+=4;
      const img=d.slice(q,q+pl);r.art=new Blob([img],{type:sniff(img)});
    }
    p+=len;if(last)break;
  }
  return r;
}
async function mp4(file){
  const buf=await file.slice(0,16*1024*1024).arrayBuffer(),b=new Uint8Array(buf),dv=new DataView(buf),r={};
  const walk=(s,e)=>{let p=s;
    while(p+8<=e){
      let sz=dv.getUint32(p);const t=str(b.slice(p+4,p+8),"latin1");
      if(sz===1)sz=Number(dv.getBigUint64(p+8));if(sz<8)break;const end=Math.min(p+sz,e);
      if(t==="moov"||t==="udta"||t==="ilst")walk(p+8,end);
      else if(t==="meta")walk(p+12,end);
      else if(["\xa9nam","\xa9ART","\xa9alb","covr","trkn"].includes(t)){
        const d=b.slice(p+8+16,end);
        if(t==="covr"){if(d.length)r.art=new Blob([d],{type:sniff(d)})}
        else if(t==="trkn")r.trk=(d[2]<<8|d[3])||null;
        else{const s=str(d);if(t==="\xa9nam")r.title=s;else if(t==="\xa9ART")r.artist=s;else r.album=s}
      }
      p+=sz;
    }};
  walk(0,b.length);return r;
}
async function readTags(f){
  const x=(f.name.split(".").pop()||"").toLowerCase();
  if(x==="mp3")return id3(f);if(x==="flac")return flac(f);
  if(["m4a","mp4","aac"].includes(x))return mp4(f);
  return{};
}

/* ---------- library ---------- */
function parse(name){
  let n=name.replace(/\.[^.]+$/,"").replace(/_/g," ").trim(),a="Unknown artist",trk=null,m=n.match(/^(.+?)\s+-\s+(.+)$/);
  if(m){a=m[1];n=m[2]}
  if(/^\d{1,3}$/.test(a)){trk=+a;a="Unknown artist"}
  else{const k=n.match(/^(\d{1,3})[.\s)-]+(.+)$/);if(k){trk=+k[1];n=k[2]}}
  return{title:n,artist:a,trk};
}
const resort=()=>tracks.sort((a,b)=>a.album.localeCompare(b.album)||(a.trk??999)-(b.trk??999)||a.title.localeCompare(b.title,undefined,{numeric:true}));
let tm;const sched=()=>{clearTimeout(tm);tm=setTimeout(()=>{resort();render()},80)};
function addFiles(list){
  const dirOf=p=>p.includes("/")?p.slice(0,p.lastIndexOf("/")):"";
  const all=[...list].map(f=>({f,p:f.webkitRelativePath||f._path||f.name}));
  all.forEach(({f,p})=>{
    if(!IMG.test(f.name)||f.type.startsWith("audio"))return;
    const d=dirOf(p),good=/cover|folder|front|album|art/i.test(f.name),c=dirImg[d];
    if(!c||(good&&!c.good)){const o=dirImg[d]={good,url:null};toURL(f).then(u=>{o.url=u;sched()})}
  });
  const added=[];
  all.forEach(({f,p})=>{
    if(!(f.type.startsWith("audio/")||AUD.test(f.name)))return;
    if(tracks.some(t=>t.path===p&&t.file.size===f.size))return;
    const dir=dirOf(p),pr=parse(f.name);
    const t={id:nid++,file:f,path:p,dir,url:URL.createObjectURL(f),dur:NaN,liked:false,title:pr.title,artist:pr.artist,trk:pr.trk,album:dir?dir.split("/").pop():"Singles",art:null};
    tracks.push(t);added.push(t);
  });
  resort();render();
  added.forEach(async t=>{
    const a=new Audio();a.preload="metadata";a.src=t.url;a.onloadedmetadata=()=>{t.dur=a.duration;sched()};
    try{const m=await readTags(t.file);
      if(m.title)t.title=m.title;if(m.artist)t.artist=m.artist;if(m.album)t.album=m.album;
      if(m.trk)t.trk=m.trk;if(m.art)t.art=await toURL(m.art);
    }catch(e){}
    sched();
  });
}
function visible(){
  let base;
  if(view==="playlist"){const p=curPl(),m=new Map(tracks.map(t=>[tkey(t),t]));base=p?p.items.map(k=>m.get(k)).filter(Boolean):[]}
  else base=tracks.filter(t=>view==="liked"?t.liked:view==="album"?akey(t)===albumKey:true);
  return base.filter(t=>(t.title+" "+t.artist+" "+t.album).toLowerCase().includes(filter));
}
function groups(v){
  const m=new Map();
  v.forEach(t=>{const k=akey(t);if(!m.has(k))m.set(k,{key:k,name:t.album,tracks:[]});m.get(k).tracks.push(t)});
  return[...m.values()].map(g=>{
    const ar=[...new Set(g.tracks.map(t=>t.artist))];
    return{...g,artist:ar.length>1?"Various artists":ar[0],art:g.tracks.find(artOf)||g.tracks[0]};
  });
}

/* ---------- render ---------- */
function render(){
  const v=visible(),L=$("#list");
  if(view==="album"&&!tracks.some(t=>akey(t)===albumKey))view="albums";
  if(view==="playlist"&&!curPl())view="all";
  $("#plact").style.display=view==="playlist"?"flex":"none";
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("on",b.dataset.v===view||(view==="album"&&b.dataset.v==="albums")||(view==="playlist"&&b.dataset.v==="playlists")));
  renderPls();
  const at=view==="album"?tracks.find(t=>akey(t)===albumKey):view==="playlist"?(v.find(artOf)||v[0]||null):cur;
  $("#cover").style.background=at?bg(at):"";$("#cover").textContent=at&&artOf(at)?"":"♪";
  document.documentElement.style.setProperty("--hue",at?`hsl(${hue(at.album)} 45% 24%)`:"#1e3a2a");
  $("#hero small").textContent=view==="album"?"Album":(view==="albums"||view==="playlists")?"Collection":view==="playlist"?"Playlist":"Library";
  $("#ttl").textContent=view==="playlists"?"Playlists":view==="playlist"?curPl().name:view==="album"?at.album:view==="albums"?"Albums":view==="liked"?"Liked Songs":"Your Library";
  const tot=v.reduce((s,t)=>s+(t.dur||0),0);
  $("#sub").textContent=(view==="albums"?groups(v).length+" albums · ":"")+v.length+" song"+(v.length==1?"":"s")+(tot?" · "+Math.round(tot/60)+" min":"");
  if(view==="playlists")$("#sub").textContent=playlists.length+" playlist"+(playlists.length==1?"":"s");
  if(view==="playlist"){const p=curPl(),miss=p.items.filter(k=>!tracks.some(t=>tkey(t)===k)).length;if(miss)$("#sub").textContent+=" · "+miss+" not loaded"}
  if(cur){$("#nt").textContent=cur.title;$("#na").textContent=cur.artist+" · "+cur.album;
    const a=$("#nart");a.style.background=bg(cur);a.textContent=artOf(cur)?"":"♪"}
  if(view==="playlists"){
    const m=new Map(tracks.map(t=>[tkey(t),t]));
    shown=playlists.map(p=>{const ts=p.items.map(k=>m.get(k)).filter(Boolean);return{p,art:ts.find(artOf)||ts[0]||null}});
    L.innerHTML=`<div class="grid"><div class="card" data-p="new"><div class="art" style="background:var(--hover)">＋</div><b>New playlist</b><span>Create one</span></div>`+shown.map((g,i)=>`<div class="card" data-p="${i}"><div class="art">${g.art&&artOf(g.art)?"":"♫"}</div><b></b><span></span></div>`).join("")+`</div>`;
    L.querySelectorAll(".card[data-p]").forEach(c=>{if(c.dataset.p==="new")return;const g=shown[+c.dataset.p];
      c.querySelector("b").textContent=g.p.name;c.querySelector("span").textContent=g.p.items.length+" songs";
      c.querySelector(".art").style.background=g.art?bg(g.art):grad(g.p.name)});
    return;
  }
  if(!v.length&&view==="playlist"){
    const p=curPl();L.innerHTML=`<div id="empty"><h2>${p.items.length?"Songs not loaded":"This playlist is empty"}</h2>${p.items.length?"Add the original song files again to see this playlist's songs.":"Click the ＋ next to any song to add it here."}</div>`;return}
  if(!v.length){
    L.innerHTML=`<div id="empty"><h2>${tracks.length?"Nothing here":"Add your music"}</h2>${tracks.length?"No songs match this view.":"Use <b>Add songs</b> or <b>Add album folder</b>, or drag files and folders into this window. Cover art is picked up automatically."}</div>`;return;
  }
  if(view==="albums"){
    shown=groups(v);
    L.innerHTML=`<div class="grid">`+shown.map((g,i)=>`<div class="card" data-a="${i}"><div class="art">${artOf(g.art)?"":"♪"}</div><b></b><span></span></div>`).join("")+`</div>`;
    L.querySelectorAll(".card").forEach((c,i)=>{c.querySelector("b").textContent=shown[i].name;c.querySelector(".art").style.background=bg(shown[i].art);c.querySelector("span").textContent=shown[i].artist+" · "+shown[i].tracks.length+" songs"});
    return;
  }
  L.innerHTML=`<div class="row head"><span class="n">#</span><span>Title</span><span></span><span></span><span class="d">Time</span></div>`+v.map((t,i)=>{
    const c=cur===t;
    return`<div class="row ${c?"cur":""} ${c&&!audio.paused?"playing":""}" data-id="${t.id}">
    <span class="n"><span class="num">${view==="album"&&t.trk?t.trk:i+1}</span><span class="bars"><i></i><i></i><i></i></span></span>
    <span class="t"><span class="art">${artOf(t)?"":"♪"}</span><div><b></b><span></span></div></span>
    <button class="addpl" data-m="${t.id}" aria-label="Add to playlist" title="Add to playlist">＋</button><button class="heart ${t.liked?"on":""}" data-h="${t.id}" aria-label="Like"><svg viewBox="0 0 24 24"><path d="M12 21s-8-5.200-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 5.800-8 11-8 11z"/></svg></button>
    <span class="d">${fmt(t.dur)}</span></div>`}).join("");
  [...L.querySelectorAll(".row[data-id]")].forEach((r,i)=>{const t=v[i];r.querySelector("b").textContent=t.title;r.querySelector(".art").style.background=bg(t);r.querySelector(".t span:last-child").textContent=t.artist+(view==="album"?"":" · "+t.album)});
}

/* ---------- playback ---------- */
function playT(t){
  cur=t;audio.src=t.url;audio.play().catch(()=>{});
  document.title=t.title+" · "+t.artist;
  if("mediaSession"in navigator){const a=artOf(t);navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album,artwork:a?[{src:a}]:[]})}
  render();
}
function step(d,auto){
  const v=visible();if(!v.length)return;
  const c=v.indexOf(cur);let n;
  if(shuffle&&v.length>1){do{n=Math.floor(Math.random()*v.length)}while(n===c)}
  else{n=c+d;if(n>=v.length){if(repeat===2||!auto)n=0;else{audio.pause();audio.currentTime=0;return}}if(n<0)n=v.length-1}
  playT(v[n]);
}
function toggle(){
  if(!cur){const v=visible();if(v.length)playT(shuffle?v[Math.floor(Math.random()*v.length)]:v[0]);return}
  audio.paused?audio.play():audio.pause();
}
function ui(){
  const p=audio.paused;
  $("#play").innerHTML=`<svg viewBox="0 0 24 24">${p?P:PA}</svg>`;
  $("#big").innerHTML=`<svg viewBox="0 0 24 24">${p?P:PA}</svg>`;
  const r=$("#list .row.cur");if(r)r.classList.toggle("playing",!p);
}
const setP=el=>el.style.setProperty("--p",(el.value-el.min)/(el.max-el.min)*100+"%");
audio.onplay=audio.onpause=ui;
audio.onended=()=>{repeat===1?(audio.currentTime=0,audio.play()):step(1,true)};
let seeking=false;const sk=$("#seek");
audio.ontimeupdate=()=>{if(seeking)return;sk.value=audio.duration?audio.currentTime/audio.duration*1000:0;setP(sk);$("#cur").textContent=fmt(audio.currentTime)};
audio.onloadedmetadata=()=>{$("#dur").textContent=fmt(audio.duration)};
audio.onerror=()=>{if(cur)$("#na").textContent="Can't play this file format"};
sk.oninput=()=>{seeking=true;setP(sk);$("#cur").textContent=fmt(sk.value/1000*audio.duration)};
sk.onchange=()=>{if(audio.duration)audio.currentTime=sk.value/1000*audio.duration;seeking=false};
const vr=$("#vr");audio.volume=.8;setP(vr);
vr.oninput=()=>{audio.volume=vr.value/100;audio.muted=false;setP(vr)};
$("#mute").onclick=()=>{audio.muted=!audio.muted;vr.value=audio.muted?0:audio.volume*100;setP(vr)};
$("#play").onclick=toggle;
$("#big").onclick=()=>{const v=visible();if((view==="album"||view==="playlist")&&v.length&&!v.includes(cur))playT(v[0]);else toggle()};
$("#next").onclick=()=>step(1,false);
$("#prev").onclick=()=>{if(audio.currentTime>3)audio.currentTime=0;else step(-1,false)};
const setShuf=()=>["#shuf","#shuf2"].forEach(s=>$(s).classList.toggle("on",shuffle));
$("#shuf").onclick=$("#shuf2").onclick=()=>{shuffle=!shuffle;setShuf()};
$("#rep").onclick=()=>{repeat=(repeat+1)%3;const b=$("#rep");b.classList.toggle("on",repeat>0);b.classList.toggle("rep1",repeat===1)};

/* ---------- UI wiring ---------- */
$("#list").onclick=e=>{
  const pc=e.target.closest("[data-p]");
  if(pc){
    if(pc.dataset.p==="new")ask("New playlist","").then(n=>{if(n){const p=newPl(n);view="playlist";plId=p.id;render()}});
    else{plId=shown[+pc.dataset.p].p.id;view="playlist";$("#list").scrollTop=0;render()}
    return;
  }
  const c=e.target.closest(".card");
  if(c){albumKey=shown[+c.dataset.a].key;view="album";$("#list").scrollTop=0;render();return}
  const mb=e.target.closest("[data-m]");
  if(mb){openMenu(tracks.find(x=>x.id==mb.dataset.m),mb);return}
  const h=e.target.closest("[data-h]");
  if(h){const t=tracks.find(x=>x.id==h.dataset.h);t.liked=!t.liked;render();e.stopPropagation();return}
  const r=e.target.closest(".row[data-id]");if(!r)return;
  const t=tracks.find(x=>x.id==r.dataset.id);
  cur===t?toggle():playT(t);
};
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{view=b.dataset.v;$("#list").scrollTop=0;render()});
document.addEventListener("click",e=>{if(!e.target.closest("#menu,.addpl"))closeMenu()});
$("#list").addEventListener("scroll",closeMenu);
$("#newPl").onclick=async()=>{const n=await ask("New playlist","");if(n){const p=newPl(n);view="playlist";plId=p.id;render()}};
$("#plren").onclick=async()=>{const p=curPl(),n=await ask("Rename playlist",p.name);if(n){p.name=n;save();render()}};
$("#pldel").onclick=async()=>{const p=curPl();if(await ask("Delete “"+p.name+"”?","",true)){playlists=playlists.filter(x=>x!==p);save();view="all";render()}};
$("#addM").onclick=()=>$("#fi").click();
$("#now").onclick=()=>{if(cur&&matchMedia("(max-width:820px)").matches)$("#bar").classList.add("full")};
$("#npc").onclick=()=>$("#bar").classList.remove("full");
$("#q").oninput=e=>{filter=e.target.value.toLowerCase();render()};
$("#addF").onclick=()=>$("#fi").click();$("#addD").onclick=()=>$("#fd").click();
$("#fi").onchange=e=>{addFiles(e.target.files);e.target.value=""};
$("#fd").onchange=e=>{addFiles(e.target.files);e.target.value=""};

async function walkEntry(en,out,path=""){
  if(en.isFile){const f=await new Promise(r=>en.file(r,()=>r(null)));if(f){f._path=path+en.name;out.push(f)}}
  else if(en.isDirectory){
    const rd=en.createReader(),kids=[];
    for(;;){const b=await new Promise(r=>rd.readEntries(r,()=>r([])));if(!b.length)break;kids.push(...b)}
    for(const k of kids)await walkEntry(k,out,path+en.name+"/");
  }
}
let dc=0;
addEventListener("dragenter",e=>{e.preventDefault();dc++;$("#drop").classList.add("on")});
addEventListener("dragleave",()=>{if(--dc<=0){dc=0;$("#drop").classList.remove("on")}});
addEventListener("dragover",e=>e.preventDefault());
addEventListener("drop",async e=>{
  e.preventDefault();dc=0;$("#drop").classList.remove("on");
  const ens=[...e.dataTransfer.items].map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);
  if(ens.length){const out=[];await Promise.all(ens.map(en=>walkEntry(en,out)));addFiles(out)}
  else addFiles(e.dataTransfer.files);
});
addEventListener("keydown",e=>{
  if(e.target.tagName==="INPUT"&&e.target.type!=="range")return;
  if(e.code==="Escape")$("#bar").classList.remove("full");
  if(e.code==="Space"){e.preventDefault();toggle()}
  else if(e.code==="ArrowRight"&&e.shiftKey)step(1,false);
  else if(e.code==="ArrowLeft"&&e.shiftKey)step(-1,false);
  else if(e.code==="ArrowRight")audio.currentTime+=5;
  else if(e.code==="ArrowLeft")audio.currentTime-=5;
});
if("mediaSession"in navigator){const m=navigator.mediaSession;
  m.setActionHandler("play",()=>audio.play());m.setActionHandler("pause",()=>audio.pause());
  m.setActionHandler("nexttrack",()=>step(1,false));m.setActionHandler("previoustrack",()=>step(-1,false));}
setP(sk);render();
