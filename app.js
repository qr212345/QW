document.addEventListener("DOMContentLoaded", () => {

const GAS_URL="https://script.google.com/macros/s/AKfycbxHBADXalkfU1N5EEjvpWaQg-P_z_jnBhuKJRa5FGpuFhJ3xKwBBqgvFHhjGXKryy0/exec";

let isAdmin=false, dragging=null, offsetX=0, offsetY=0;
let seatLayout=[
  {id:"A01",x:20,y:50,label:"A01",used:false, updatedAt: Date.now()},
  {id:"A02",x:120,y:50,label:"A02",used:false, updatedAt: Date.now()},
  {id:"B01",x:20,y:150,label:"B01",used:false, updatedAt: Date.now()},
  {id:"B02",x:120,y:150,label:"B02",used:false, updatedAt: Date.now()},
];

const container=document.getElementById("seatContainer");
const logArea=document.getElementById("logArea");
const roomSvg=document.getElementById("roomSvg");

// ツールチップ
const tooltip = document.createElement("div");
tooltip.className = "tooltip";
document.body.appendChild(tooltip);

// 部屋オブジェクト（柱・スクリーン）
const roomObjects = {
  wide: [
    {type:"rect", x:100, y:50, width:50, height:200, fill:"#888"},
    {type:"rect", x:300, y:50, width:50, height:200, fill:"#888"},
    {type:"rect", x:0, y:0, width:800, height:30, fill:"#444"} // スクリーン
  ],
  tall: [
    {type:"rect", x:50, y:100, width:200, height:50, fill:"#888"},
    {type:"rect", x:50, y:300, width:200, height:50, fill:"#888"},
    {type:"rect", x:0, y:0, width:600, height:30, fill:"#444"} // スクリーン
  ]
};

// ログ表示（管理者モードのみ）
function addLog(text){
  if(!isAdmin) return;
  const now=new Date().toLocaleTimeString();
  logArea.style.display="block";
  logArea.textContent=`[${now}] ${text}\n` + logArea.textContent;
}

// 部屋描画
function renderRoom(pattern){
  const svg = roomSvg;
  svg.innerHTML="";
  roomObjects[pattern].forEach(obj=>{
    if(obj.type==="rect"){
      const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
      rect.setAttribute("x", obj.x);
      rect.setAttribute("y", obj.y);
      rect.setAttribute("width", obj.width);
      rect.setAttribute("height", obj.height);
      rect.setAttribute("fill", obj.fill);
      svg.appendChild(rect);
    }
  });
}

// 座席作成
function createSeat(seat){
  const div=document.createElement("div");
  div.className="seat"+(isAdmin?" admin":"");
  div.style.left=seat.x+"px"; div.style.top=seat.y+"px";
  div.textContent=seat.label;
  div.dataset.id=seat.id;
  div.contentEditable = isAdmin;

  // ステータス別クラス
  div.classList.remove("used","free");
  div.classList.add(seat.used?"used":"free");

  // ツールチップ
  div.addEventListener("mouseenter", e=>{
    tooltip.textContent = `座席: ${seat.label}\n状態: ${seat.used?"使用中":"空席"}`;
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
    tooltip.style.opacity = 1;
  });
  div.addEventListener("mousemove", e=>{
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  });
  div.addEventListener("mouseleave", ()=>{ tooltip.style.opacity = 0; });

  if(isAdmin){
    div.style.border="2px dashed #f00";

    // 削除ボタン
    const delBtn=document.createElement("button");
    delBtn.textContent="×";
    delBtn.style.position="absolute"; delBtn.style.top="0"; delBtn.style.right="0";
    delBtn.style.width="20px"; delBtn.style.height="20px"; delBtn.style.fontSize="14px";
    delBtn.addEventListener("click",(e)=>{
      seatLayout = seatLayout.filter(s=>s.id!==seat.id);
      renderSeats();
      addLog(`座席 ${seat.id} 削除`);
      e.stopPropagation();
    });
    div.appendChild(delBtn);

    // ドラッグ開始
    div.addEventListener("mousedown", e=>{
      dragging=div; offsetX=e.offsetX; offsetY=e.offsetY;
      div.style.zIndex=1000;
    });
  }
  return div;
}

// 座席描画
function renderSeats(){
  container.innerHTML="";
  seatLayout.forEach(seat=>container.appendChild(createSeat(seat)));
}

// ドラッグ移動
document.addEventListener("mousemove", e=>{
  if(dragging){
    let newX = e.clientX - container.getBoundingClientRect().left - offsetX;
    let newY = e.clientY - container.getBoundingClientRect().top - offsetY;

    newX = Math.max(0, Math.min(newX, container.clientWidth-80));
    newY = Math.max(0, Math.min(newY, container.clientHeight-80));

    newX = Math.round(newX/10)*10;
    newY = Math.round(newY/10)*10;

    const currentId = dragging.dataset.id;
    let overlapSeat=false;
    seatLayout.forEach(seat=>{
      if(seat.id===currentId) return;
      if(newX<seat.x+80 && newX+80>seat.x &&
         newY<seat.y+80 && newY+80>seat.y) overlapSeat=true;
    });

    let pattern = document.getElementById("roomPattern").value;
    let overlapObj=false;
    roomObjects[pattern].forEach(obj=>{
      if(obj.type==="rect"){
        if(newX<obj.x+obj.width && newX+80>obj.x &&
           newY<obj.y+obj.height && newY+80>obj.y) overlapObj=true;
      }
    });

    if(!overlapSeat && !overlapObj){
      dragging.style.left=newX+"px";
      dragging.style.top=newY+"px";
    }
  }
});

document.addEventListener("mouseup", e=>{
  if(dragging){
    const seat = seatLayout.find(s=>s.id===dragging.dataset.id);
    seat.x=parseInt(dragging.style.left);
    seat.y=parseInt(dragging.style.top);
    seat.updatedAt = Date.now();
    dragging.style.zIndex="";
    dragging=null;
  }
});

// 管理モードON/OFF（パスワード）
document.getElementById("toggleAdminBtn").onclick=()=>{
  if(!isAdmin){
    const pw=prompt("管理者パスワードを入力");
    if(pw!=="admin123"){alert("パスワード違います"); return;}
    isAdmin=true; logArea.style.display="block";
  } else {
    isAdmin=false; logArea.style.display="none";
  }
  document.getElementById("addSeatBtn").style.display=isAdmin?"inline-block":"none";
  document.getElementById("manualSaveBtn").style.display=isAdmin?"inline-block":"none";
  renderSeats();
  addLog(`管理モード ${isAdmin?"ON":"OFF"}`);
};

// 座席追加
document.getElementById("addSeatBtn").onclick=()=>{
  const id="S"+Date.now();
  seatLayout.push({id,x:20,y:50,label:id,used:false,updatedAt:Date.now()});
  renderSeats();
  addLog(`座席 ${id} 追加`);
};

// 手動保存
async function saveSeats(){
  try{
    await fetch(GAS_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"save",data:seatLayout})
    });
    addLog("💾 保存完了");
  }catch(err){ addLog("❌ 保存失敗: "+err); }
}
document.getElementById("manualSaveBtn").onclick=saveSeats;

// テーマ切替
document.getElementById("themeToggleBtn").onclick=()=>{
  const body=document.body;
  if(body.classList.contains("light")) body.classList.replace("light","dark");
  else body.classList.replace("dark","light");
};

// 部屋パターン切替
document.getElementById("roomPattern").onchange=(e)=>{
  const val=e.target.value;
  if(val==="wide"){roomSvg.setAttribute("width","800"); roomSvg.setAttribute("height","600"); container.style.width="800px"; container.style.height="600px";}
  else{roomSvg.setAttribute("width","600"); roomSvg.setAttribute("height","800"); container.style.width="600px"; container.style.height="800px";}
  renderRoom(val);
  renderSeats();
};

// 初期描画
renderRoom(document.getElementById("roomPattern").value);
renderSeats();

// 自動取得（管理モードOFFのときのみ）
async function fetchStatus(){
  if(isAdmin) return;
  try{
    const res = await fetch(GAS_URL+"?action=getUsage");
    const data = await res.json();
    seatLayout.forEach(s=>{ if(data[s.id]) s.used=data[s.id].used; });
    renderSeats();
  }catch(err){ console.error(err); }
}
setInterval(fetchStatus,5000);
fetchStatus();

});
