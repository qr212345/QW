document.addEventListener("DOMContentLoaded", () => {

  // === GAS URL ===
  const GAS_URL_SEAT  = "座席配置GASのURL";     
  const GAS_URL_USAGE = "座席ID⇄生徒IDGASのURL";  

  // === 状態管理 ===
  let isAdmin = false, dragging = null, offsetX = 0, offsetY = 0;

  // === 部屋パターンごとの初期座席レイアウト ===
  const seatLayouts = {
    wide: [
      {id:"A01", x:20, y:50, label:"A01", used:false, updatedAt: Date.now()},
      {id:"A02", x:120, y:50, label:"A02", used:false, updatedAt: Date.now()},
      {id:"B01", x:20, y:150, label:"B01", used:false, updatedAt: Date.now()},
      {id:"B02", x:120, y:150, label:"B02", used:false, updatedAt: Date.now()},
    ],
    tall: [
      {id:"A01", x:20, y:50, label:"A01", used:false, updatedAt: Date.now()},
      {id:"A02", x:20, y:150, label:"A02", used:false, updatedAt: Date.now()},
      {id:"B01", x:120, y:50, label:"B01", used:false, updatedAt: Date.now()},
      {id:"B02", x:120, y:150, label:"B02", used:false, updatedAt: Date.now()},
    ]
  };

  let seatLayout = JSON.parse(JSON.stringify(seatLayouts["wide"]));

  // === DOM ===
  const container = document.getElementById("seatContainer");
  const logArea   = document.getElementById("logArea");
  const roomSvg   = document.getElementById("roomSvg");

  // === ツールチップ ===
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  Object.assign(tooltip.style, {
    transition: "all 0.2s",
    padding: "6px 12px",
    borderRadius: "6px",
    background: "rgba(0,0,0,0.75)",
    color: "#fff",
    fontSize: "13px",
    position: "absolute",
    pointerEvents: "none",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    opacity: 0
  });
  document.body.appendChild(tooltip);

  // === 部屋データ ===
  const roomObjects = {
    wide: [
      {type:"rect", x:100, y:50, width:50, height:200, fill:"#aaa"},
      {type:"rect", x:300, y:50, width:50, height:200, fill:"#aaa"},
      {type:"rect", x:0, y:0, width:800, height:30, fill:"#222"} // スクリーン
    ],
    tall: [
      {type:"rect", x:50, y:100, width:200, height:50, fill:"#aaa"},
      {type:"rect", x:50, y:300, width:200, height:50, fill:"#aaa"},
      {type:"rect", x:0, y:0, width:600, height:30, fill:"#222"} // スクリーン
    ]
  };

  // === ログ関数 ===
  function addLog(text){
    if(!isAdmin) return;
    const now = new Date().toLocaleTimeString();
    logArea.style.display = "block";
    logArea.textContent = `[${now}] ${text}\n` + logArea.textContent;
  }

  // === 部屋描画 ===
  function renderRoom(pattern){
    roomSvg.innerHTML="";
    const objects = roomObjects[pattern];
    if(!objects){ console.error("Invalid room pattern:", pattern); return; }
    objects.forEach(obj => {
      if(obj.type==="rect"){
        const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
        rect.setAttribute("x", obj.x);
        rect.setAttribute("y", obj.y);
        rect.setAttribute("width", obj.width);
        rect.setAttribute("height", obj.height);
        rect.setAttribute("fill", obj.fill);
        rect.style.transition = "all 0.5s ease";
        roomSvg.appendChild(rect);
      }
    });
  }

  // === 座席生成 ===
  function createSeat(seat){
    const div = document.createElement("div");
    div.className = "seat" + (isAdmin?" admin":"");
    Object.assign(div.style, {
      left: seat.x + "px",
      top: seat.y + "px",
      width: "70px",
      height: "70px",
      lineHeight: "70px",
      textAlign: "center",
      borderRadius: "12px",
      background: seat.used ? "linear-gradient(135deg,#f66,#c33)" : "linear-gradient(135deg,#6f6,#3c3)",
      color: "#fff",
      fontWeight: "bold",
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      position: "absolute",
      cursor: isAdmin ? "grab" : "default",
      transition: "all 0.3s ease"
    });
    div.textContent = seat.label;
    div.dataset.id = seat.id;
    div.contentEditable = isAdmin;

    // ツールチップ
    div.addEventListener("mouseenter", e=>{
      tooltip.textContent = `座席: ${seat.label}\n状態: ${seat.used?"使用中":"空席"}`;
      tooltip.style.left = e.pageX + 12 + "px";
      tooltip.style.top  = e.pageY + 12 + "px";
      tooltip.style.opacity = 1;
    });
    div.addEventListener("mousemove", e=>{
      tooltip.style.left = e.pageX + 12 + "px";
      tooltip.style.top  = e.pageY + 12 + "px";
    });
    div.addEventListener("mouseleave", ()=>{ tooltip.style.opacity = 0; });

    if(isAdmin){
      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      Object.assign(delBtn.style, {
        position: "absolute",
        top: "-10px",
        right: "-10px",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        border: "none",
        background: "#f33",
        color: "#fff",
        fontWeight: "bold",
        cursor: "pointer",
        opacity: 0,
        transition: "opacity 0.3s"
      });
      div.addEventListener("mouseenter", ()=>{ delBtn.style.opacity=1; });
      div.addEventListener("mouseleave", ()=>{ delBtn.style.opacity=0; });
      delBtn.addEventListener("click", e=>{
        seatLayout = seatLayout.filter(s=>s.id!==seat.id);
        renderSeats();
        addLog(`座席 ${seat.id} 削除`);
        e.stopPropagation();
      });
      div.appendChild(delBtn);

      div.addEventListener("mousedown", e=>{
        dragging = div; offsetX = e.offsetX; offsetY = e.offsetY;
        div.style.zIndex = 1000;
        div.style.cursor = "grabbing";
      });
    }

    return div;
  }

  function renderSeats(){
    container.innerHTML="";
    seatLayout.forEach(seat => container.appendChild(createSeat(seat)));
  }

  // === ドラッグ処理 ===
  document.addEventListener("mousemove", e=>{
    if(!dragging) return;
    let newX = e.clientX - container.getBoundingClientRect().left - offsetX;
    let newY = e.clientY - container.getBoundingClientRect().top  - offsetY;
    const pattern = document.getElementById("roomPattern").value;
    const maxWidth  = pattern==="wide"?800:600;
    const maxHeight = pattern==="wide"?600:800;
    newX = Math.max(0, Math.min(newX, maxWidth-80));
    newY = Math.max(0, Math.min(newY, maxHeight-80));

    let currentId = dragging.dataset.id;
    let overlapSeat = seatLayout.some(seat=>{
      if(seat.id===currentId) return false;
      return newX<seat.x+80 && newX+80>seat.x && newY<seat.y+80 && newY+80>seat.y;
    });

    let overlapObj = roomObjects[pattern].some(obj=>{
      if(obj.type!=="rect") return false;
      return newX<obj.x+obj.width && newX+80>obj.x && newY<obj.y+obj.height && newY+80>obj.y;
    });

    if(!overlapSeat && !overlapObj){
      dragging.style.left = newX + "px";
      dragging.style.top  = newY + "px";
    }
  });

  document.addEventListener("mouseup", e=>{
    if(!dragging) return;
    const seat = seatLayout.find(s=>s.id===dragging.dataset.id);
    seat.x = parseInt(dragging.style.left);
    seat.y = parseInt(dragging.style.top);
    seat.updatedAt = Date.now();
    dragging.style.zIndex = "";
    dragging.style.cursor = "grab";
    dragging = null;
  });

  // === 部屋パターン切替 ===
  document.getElementById("roomPattern").onchange = e=>{
    const val = e.target.value;
    seatLayout = JSON.parse(JSON.stringify(seatLayouts[val]));
    const width  = val==="wide"?800:600;
    const height = val==="wide"?600:800;

    roomSvg.style.transition = "all 0.5s ease";
    container.style.transition = "all 0.5s ease";

    roomSvg.setAttribute("width", width);
    roomSvg.setAttribute("height", height);
    container.style.width  = width + "px";
    container.style.height = height + "px";

    renderRoom(val);
    renderSeats();
  };

  // === 使用状況自動取得 ===
  async function fetchUsage(){
    if(isAdmin) return;
    try{
      const res = await fetch(GAS_URL_USAGE+"?action=getUsage");
      if(!res.ok) throw new Error(`HTTP error! ${res.status}`);
      const data = await res.json();
      seatLayout.forEach(s=>{
        s.used = data[s.id]?true:false;
        const div = container.querySelector(`[data-id="${s.id}"]`);
        if(div) div.style.background = s.used 
          ? "linear-gradient(135deg,#f66,#c33)" 
          : "linear-gradient(135deg,#6f6,#3c3)";
      });
    } catch(err){ console.error("fetchUsage error:", err); }
  }
  setInterval(fetchUsage,5000);
  fetchUsage();

  // === 初期描画 ===
  const initialPattern = document.getElementById("roomPattern").value;
  seatLayout = JSON.parse(JSON.stringify(seatLayouts[initialPattern]));
  renderRoom(initialPattern);
  renderSeats();

});
と比べて何が変更されてる・
