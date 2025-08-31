document.addEventListener("DOMContentLoaded", () => {

  const GAS_URL_SEAT  = "座席配置GASのURL";       // 座席座標保存用
  const GAS_URL_USAGE = "座席ID⇄生徒IDGASのURL";  // 使用状況取得用

  let isAdmin = false, dragging = null, offsetX = 0, offsetY = 0;

  // 座席・机を統一して全て type="seat"
  let seatLayout = [
    {id:"A01", x:50, y:50, label:"A01", used:false, updatedAt: Date.now(), style:"seat"},
    {id:"A02", x:150, y:50, label:"A02", used:false, updatedAt: Date.now(), style:"seat"},
    {id:"B01", x:50, y:150, label:"B01", used:false, updatedAt: Date.now(), style:"block"},
    {id:"B02", x:150, y:150, label:"B02", used:false, updatedAt: Date.now(), style:"block"}
  ];

  const container = document.getElementById("seatContainer");
  const roomSvg   = document.getElementById("roomSvg");
  const logArea   = document.getElementById("logArea");

  // ツールチップ
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.style.transition = "all 0.2s";
  document.body.appendChild(tooltip);

  // 部屋パターンごとのサイズ
  const roomMeta = {
    wide: {width:800,height:600},
    tall: {width:600,height:800}
  };

  // 座席作成
  function createSeat(seat){
    const div = document.createElement("div");
    div.className = "seat "+seat.style + (isAdmin?" admin":"");
    div.style.left = seat.x + "px";
    div.style.top = seat.y + "px";
    div.style.width = "80px";
    div.style.height= "80px";
    div.style.position="absolute";
    div.style.cursor = isAdmin?"grab":"default";
    div.style.display="flex";
    div.style.alignItems="center";
    div.style.justifyContent="center";
    div.style.fontWeight="bold";
    div.dataset.id = seat.id;
    div.contentEditable = isAdmin;
    div.textContent = seat.label;

    // 使用状況
    div.classList.remove("used","free");
    div.classList.add(seat.used?"used":"free");

    // ツールチップ
    div.addEventListener("mouseenter", e=>{
      tooltip.textContent = `座席: ${seat.label}\n状態: ${seat.used?"使用中":"空席"}\n更新: ${new Date(seat.updatedAt).toLocaleTimeString()}`;
      tooltip.style.left = e.pageX + 10 + "px";
      tooltip.style.top  = e.pageY + 10 + "px";
      tooltip.style.opacity = 1;
    });
    div.addEventListener("mousemove", e=>{
      tooltip.style.left = e.pageX + 10 + "px";
      tooltip.style.top  = e.pageY + 10 + "px";
    });
    div.addEventListener("mouseleave", ()=>{ tooltip.style.opacity = 0; });

    if(isAdmin){
      // 削除ボタン
      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      delBtn.className = "delete-btn";
      delBtn.style.opacity = 0;
      delBtn.style.transition="opacity 0.3s";
      div.addEventListener("mouseenter", ()=>{ delBtn.style.opacity=1; });
      div.addEventListener("mouseleave", ()=>{ delBtn.style.opacity=0; });
      delBtn.addEventListener("click", e=>{
        seatLayout = seatLayout.filter(s=>s.id!==seat.id);
        renderSeats();
        addLog(`座席 ${seat.id} 削除`);
        e.stopPropagation();
      });
      div.appendChild(delBtn);

      // ドラッグ
      div.addEventListener("mousedown", e=>{
        dragging = div; offsetX=e.offsetX; offsetY=e.offsetY;
        div.style.zIndex=1000; div.style.cursor="grabbing";
      });
    }

    return div;
  }

  function renderSeats(){
    container.innerHTML="";
    seatLayout.forEach(s=>container.appendChild(createSeat(s)));
  }

  // ドラッグ処理
  document.addEventListener("mousemove", e=>{
    if(!dragging) return;
    const boundsW = container.clientWidth;
    const boundsH = container.clientHeight;
    const w = 80; const h = 80;
    let newX = e.clientX - container.getBoundingClientRect().left - offsetX;
    let newY = e.clientY - container.getBoundingClientRect().top - offsetY;
    newX = Math.max(0, Math.min(newX, boundsW-w));
    newY = Math.max(0, Math.min(newY, boundsH-h));
    dragging.style.left=newX+"px";
    dragging.style.top=newY+"px";
  });

  document.addEventListener("mouseup", ()=>{
    if(!dragging) return;
    const s = seatLayout.find(o=>o.id===dragging.dataset.id);
    s.x = parseInt(dragging.style.left);
    s.y = parseInt(dragging.style.top);
    s.updatedAt = Date.now();
    dragging.style.zIndex=""; dragging.style.cursor="grab";
    dragging=null;
  });

  // 管理者モード
  document.getElementById("toggleAdminBtn").onclick = ()=>{
    if(!isAdmin){
      const pw = prompt("管理者パスワード入力");
      if(pw!=="admin123"){ alert("パスワード違います"); return; }
      isAdmin = true;
      logArea.style.display="block";
    } else {
      isAdmin = false;
      logArea.style.display="none";
    }
    ["addSeatBtn","manualSaveBtn"].forEach(id=>{
      const btn = document.getElementById(id);
      if(btn) btn.style.display = isAdmin?"inline-block":"none";
    });
    renderSeats();
    addLog(`管理モード ${isAdmin?"ON":"OFF"}`);
  };

  // 座席追加
  document.getElementById("addSeatBtn").onclick = ()=>{
    const id = "S"+Date.now();
    seatLayout.push({id,x:50,y:50,label:id,type:"seat",used:false,updatedAt:Date.now(),style:"seat"});
    renderSeats();
    addLog(`座席 ${id} 追加`);
  };

  // 保存
  async function saveSeats(){
    if(!isAdmin) return;
    try{
      const res = await fetch(GAS_URL_SEAT,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"save",data:seatLayout})
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      addLog("💾 保存完了");
    } catch(err){ addLog("❌ 保存失敗: "+err); console.error(err); }
  }
  document.getElementById("manualSaveBtn").onclick = saveSeats;

  // テーマ切替
  document.getElementById("themeToggleBtn").onclick = ()=>{
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");
  };

  // 部屋パターン切替
  document.getElementById("roomPattern").onchange = e=>{
    const val = e.target.value;
    roomSvg.setAttribute("width", roomMeta[val].width);
    roomSvg.setAttribute("height", roomMeta[val].height);
    container.style.width = roomMeta[val].width+"px";
    container.style.height = roomMeta[val].height+"px";
  };

  // 使用状況取得
  async function fetchUsage(){
    if(isAdmin) return;
    try{
      const res = await fetch(GAS_URL_USAGE+"?action=getUsage");
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      seatLayout.forEach(s=>{ if(s.type==="seat") s.used = !!data[s.id]; });
      renderSeats();
    } catch(err){ console.error(err); }
  }
  setInterval(fetchUsage,5000);
  fetchUsage();

  // 初期描画
  renderSeats();

  function addLog(text){
    if(!isAdmin) return;
    const now = new Date().toLocaleTimeString();
    logArea.textContent = `[${now}] ${text}\n` + logArea.textContent;
  }

});
