const GAS_URL="https://script.google.com/macros/s/XXXXX/exec";
let isAdmin=false, dragging=null, resizing=null, offsetX=0, offsetY=0;
let seatLayout=[
  {id:"A01",x:20,y:20,label:"A01",used:false},{id:"A02",x:120,y:20,label:"A02",used:false},
  {id:"B01",x:20,y:120,label:"B01",used:false},{id:"B02",x:120,y:120,label:"B02",used:false},
];

const container=document.getElementById("seatContainer");
const logArea=document.getElementById("logArea");

function addLog(text){
  const now=new Date().toLocaleTimeString();
  logArea.style.display="block";
  logArea.textContent=`[${now}] ${text}\n`+logArea.textContent;
}

function createSeat(seat){
  const div=document.createElement("div");
  div.className="seat"+(isAdmin?" admin":"")+(seat.used?" used":"");
  div.style.left=seat.x+"px"; div.style.top=seat.y+"px";
  div.style.width=(seat.width||80)+"px"; div.style.height=(seat.height||80)+"px";
  div.textContent=seat.label;
  div.dataset.id=seat.id;
  
  if(isAdmin){
    // ドラッグ
    div.addEventListener("mousedown", e=>{if(!e.target.classList.contains("resize-handle")){dragging=div;offsetX=e.offsetX;offsetY=e.offsetY;}});

    // リサイズハンドル
    const resizer=document.createElement("div");
    resizer.className="resize-handle";
    resizer.addEventListener("mousedown", e=>{resizing=div;offsetX=e.clientX;offsetY=e.clientY; e.stopPropagation();});
    div.appendChild(resizer);
  }
  return div;
}

function renderSeats(){
  container.innerHTML="";
  seatLayout.forEach(seat=>container.appendChild(createSeat(seat)));
}

// 管理モード切替
document.getElementById("toggleAdminBtn").onclick=()=>{
  isAdmin=!isAdmin;
  document.getElementById("addSeatBtn").style.display=isAdmin?"inline-block":"none";
  document.getElementById("manualSaveBtn").style.display=isAdmin?"inline-block":"none";
  renderSeats();
  addLog(`管理モード ${isAdmin?"ON":"OFF"}`);
};

// 座席追加
document.getElementById("addSeatBtn").onclick=()=>{
  const id="S"+Date.now();
  seatLayout.push({id,x:20,y:20,label:id,used:false});
  renderSeats();
  addLog(`座席 ${id} 追加`);
};

// 自動・手動保存
async function saveSeats(){
  try{
    await fetch(GAS_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",data:seatLayout})});
    addLog("💾 保存完了");
  }catch{addLog("❌ 保存失敗");}
}
document.getElementById("manualSaveBtn").onclick=saveSeats;
setInterval(saveSeats,30000); // 自動保存30秒ごと

// 取得と表示
async function fetchStatus(){
  try{
    const res=await fetch(GAS_URL+"?action=getUsage");
    const data=await res.json();
    seatLayout.forEach(s=>{s.used=!!data[s.id];});
    renderSeats();
  }catch(err){console.error(err);}
}
setInterval(fetchStatus,5000);
fetchStatus();

// テーマ切替
document.getElementById("themeToggleBtn").onclick=()=>{
  const body=document.body;
  if(body.classList.contains("light")){body.classList.replace("light","dark");}else{body.classList.replace("dark","light");}
};
