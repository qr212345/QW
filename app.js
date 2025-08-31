document.addEventListener("DOMContentLoaded", () => {

  // === GAS URL ===
  const GAS_URL_SEAT  = "座席配置GASのURL";
  const GAS_URL_USAGE = "座席ID⇄生徒IDGASのURL";

  // === 状態管理 ===
  let isAdmin = false;
  let dragging = null, offsetX = 0, offsetY = 0;

  // === 定数 ===
  const SEAT_SIZE = 80;  
  const HALF = SEAT_SIZE / 2;

  // === レイアウト定義 ===
  const layoutMeta = {
    wide: { width: 800, height: 600 },
    tall: { width: 600, height: 800 }
  };

  const seatLayouts = {
    wide: [
      {id:"A01", x:140, y:220, label:"A01", used:false, updatedAt:Date.now()},
      {id:"A02", x:200, y:180, label:"A02", used:false, updatedAt:Date.now()}
    ],
    tall: [
      {id:"B01", x:120, y:120, label:"B01", used:false, updatedAt:Date.now()},
      {id:"B02", x:220, y:120, label:"B02", used:false, updatedAt:Date.now()}
    ]
  };

  // === DOM ===
  const container = document.getElementById("seatContainer");
  const roomSvg   = document.getElementById("roomSvg");
  const logArea   = document.getElementById("logArea");
  const roomPatternSelect = document.getElementById("roomPattern");
  const toggleAdminBtn = document.getElementById("toggleAdminBtn");
  const addSeatBtn = document.getElementById("addSeatBtn");
  const manualSaveBtn = document.getElementById("manualSaveBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  // === 初期座席レイアウト ===
  let seatLayout = JSON.parse(JSON.stringify(seatLayouts[roomPatternSelect.value]));

  // === ツールチップ ===
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  document.body.appendChild(tooltip);

  // === 管理者モード切替 ===
  if(toggleAdminBtn){
    toggleAdminBtn.onclick = () => {
      isAdmin = !isAdmin;
      renderSeats();
      addSeatBtn.style.display = isAdmin ? "inline-block" : "none";
      manualSaveBtn.style.display = isAdmin ? "inline-block" : "none";
      logArea.style.display = isAdmin ? "block" : "none";
      addLog(`管理者モード ${isAdmin ? "ON" : "OFF"}`);
    };
  }

  // === ログ関数 ===
  function addLog(text){
    if(!isAdmin || !logArea) return;
    const now = new Date().toLocaleTimeString();
    logArea.textContent = `[${now}] ${text}\n` + logArea.textContent;
  }

  // === 部屋描画 ===
  function renderRoom(pattern){
    if(!roomSvg) return;
    roomSvg.innerHTML = "";
    const meta = layoutMeta[pattern];
    roomSvg.setAttribute("width",  meta.width);
    roomSvg.setAttribute("height", meta.height);
    roomSvg.style.transition = "all 0.5s ease";
  }

  // === 六角形ポイント生成 ===
  function hexPoints() {
    const pad = 10;
    return [
      `${HALF},${pad}`,
      `${SEAT_SIZE - pad},${pad + 15}`,
      `${SEAT_SIZE - pad},${SEAT_SIZE - pad - 15}`,
      `${HALF},${SEAT_SIZE - pad}`,
      `${pad},${SEAT_SIZE - pad - 15}`,
      `${pad},${pad + 15}`
    ].join(" ");
  }

  // === グラデーション定義 ===
  function injectSeatGradients(svg, seatId){
    if(!svg) return {freeId:"", usedId:""};
    const svgNS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(svgNS, "defs");

    const makeGrad = (id, c1, c2) => {
      const lg = document.createElementNS(svgNS, "linearGradient");
      lg.setAttribute("id", id);
      lg.setAttribute("x1","0%"); lg.setAttribute("y1","0%");
      lg.setAttribute("x2","100%"); lg.setAttribute("y2","100%");
      const stop1 = document.createElementNS(svgNS,"stop"); stop1.setAttribute("offset","0%"); stop1.setAttribute("stop-color",c1);
      const stop2 = document.createElementNS(svgNS,"stop"); stop2.setAttribute("offset","100%"); stop2.setAttribute("stop-color",c2);
      lg.appendChild(stop1); lg.appendChild(stop2);
      return lg;
    };
    defs.appendChild(makeGrad(`gradFree-${seatId}`,"#6f6","#3c3"));
    defs.appendChild(makeGrad(`gradUsed-${seatId}`,"#f66","#c33"));
    svg.appendChild(defs);
    return { freeId:`gradFree-${seatId}`, usedId:`gradUsed-${seatId}` };
  }

  // === 座席生成 ===
  function createSeat(seat){
    const div = document.createElement("div");
    div.className = "seat" + (isAdmin?" admin":"");
    Object.assign(div.style, {
      left: seat.x+"px",
      top: seat.y+"px",
      width: SEAT_SIZE+"px",
      height: SEAT_SIZE+"px",
      position: "absolute",
      cursor: isAdmin ? "grab" : "default"
    });
    div.dataset.id = seat.id;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", SEAT_SIZE);
    svg.setAttribute("height", SEAT_SIZE);

    const { freeId, usedId } = injectSeatGradients(svg, seat.id);

    const hex = document.createElementNS(svgNS,"polygon");
    hex.setAttribute("points", hexPoints());
    hex.setAttribute("fill", seat.used?`url(#${usedId})`:`url(#${freeId})`);
    hex.setAttribute("stroke","#333"); hex.setAttribute("stroke-width","2");
    hex.dataset.role="hex";
    svg.appendChild(hex);

    const rect = document.createElementNS(svgNS,"rect");
    const rectSize = 24;
    rect.setAttribute("x",(SEAT_SIZE-rectSize)/2);
    rect.setAttribute("y",(SEAT_SIZE-rectSize)/2);
    rect.setAttribute("width",rectSize);
    rect.setAttribute("height",rectSize);
    rect.setAttribute("rx","4");
    rect.setAttribute("fill","#fff");
    svg.appendChild(rect);

    const text = document.createElementNS(svgNS,"text");
    text.setAttribute("x",HALF); text.setAttribute("y",HALF+1);
    text.setAttribute("text-anchor","middle");
    text.setAttribute("dominant-baseline","middle");
    text.setAttribute("font-size","12"); text.setAttribute("font-weight","bold");
    text.setAttribute("fill","#000");
    text.textContent = seat.label;
    svg.appendChild(text);

    div.appendChild(svg);

    // ツールチップ
    div.addEventListener("mouseenter", e=>{
      tooltip.textContent = `座席: ${seat.label}\n状態: ${seat.used?"使用中":"空席"}\n更新: ${new Date(seat.updatedAt).toLocaleTimeString()}`;
      tooltip.style.left = e.pageX+12+"px";
      tooltip.style.top  = e.pageY+12+"px";
      tooltip.style.opacity = 1;
      tooltip.style.transform = "translateY(0)";
    });
    div.addEventListener("mousemove", e=>{
      tooltip.style.left = e.pageX+12+"px";
      tooltip.style.top  = e.pageY+12+"px";
    });
    div.addEventListener("mouseleave", ()=>{
      tooltip.style.opacity=0; tooltip.style.transform="translateY(-4px)";
    });

    if(isAdmin){
      // 削除ボタン
      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      Object.assign(delBtn.style,{
        position:"absolute", top:"-10px", right:"-10px",
        width:"20px", height:"20px", borderRadius:"50%",
        border:"none", background:"#f33", color:"#fff",
        fontWeight:"bold", cursor:"pointer", opacity:0,
        transition:"opacity 0.3s"
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

      // ドラッグ
      div.addEventListener("mousedown", e=>{
        dragging = div; offsetX = e.offsetX; offsetY = e.offsetY;
        div.style.zIndex = 1000; div.style.cursor = "grabbing";
      });
    }

    return div;
  }

  function renderSeats(){
    if(!container) return;
    container.innerHTML = "";
    seatLayout.forEach(seat => container.appendChild(createSeat(seat)));
  }

  // === ドラッグ処理 ===
  document.addEventListener("mousemove", e=>{
    if(!dragging) return;
    const pattern = roomPatternSelect.value;
    const boundsW = layoutMeta[pattern].width;
    const boundsH = layoutMeta[pattern].height;

    let newX = e.clientX - container.getBoundingClientRect().left - offsetX;
    let newY = e.clientY - container.getBoundingClientRect().top  - offsetY;
    newX = Math.max(0, Math.min(newX, boundsW-SEAT_SIZE));
    newY = Math.max(0, Math.min(newY, boundsH-SEAT_SIZE));

    const currentId = dragging.dataset.id;
    const overlapSeat = seatLayout.some(s=>{
      if(s.id===currentId) return false;
      return newX< s.x+SEAT_SIZE && newX+SEAT_SIZE> s.x &&
             newY< s.y+SEAT_SIZE && newY+SEAT_SIZE> s.y;
    });

    if(!overlapSeat){
      dragging.style.left=newX+"px";
      dragging.style.top=newY+"px";
    }
  });

  document.addEventListener("mouseup", ()=>{
    if(!dragging) return;
    const seat = seatLayout.find(s=>s.id===dragging.dataset.id);
    if(seat){
      seat.x = parseInt(dragging.style.left);
      seat.y = parseInt(dragging.style.top);
      seat.updatedAt = Date.now();
    }
    dragging.style.zIndex="";
    dragging.style.cursor="grab";
    dragging=null;
  });

  // === 部屋切替 ===
  if(roomPatternSelect){
    roomPatternSelect.onchange = e=>{
      const val = e.target.value;
      seatLayout = JSON.parse(JSON.stringify(seatLayouts[val]));
      container.style.width = layoutMeta[val].width+"px";
      container.style.height = layoutMeta[val].height+"px";
      renderRoom(val);
      renderSeats();
    };
  }

  // === 座席追加 ===
  if(addSeatBtn){
    addSeatBtn.onclick = ()=>{
      const pattern = roomPatternSelect.value;
      const newId = "S" + String(Math.floor(Math.random()*1000)).padStart(3,"0");
      const newSeat = {id:newId, x:50, y:50, label:newId, used:false, updatedAt:Date.now()};
      seatLayout.push(newSeat);
      renderSeats();
      addLog(`座席 ${newId} 追加`);
    };
  }

  // === 座席保存（GAS連携）===
  if(manualSaveBtn){
    manualSaveBtn.onclick = async ()=>{
      try{
        const res = await fetch(GAS_URL_SEAT, {
          method:"POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({action:"saveSeats", seats:seatLayout})
        });
        const data = await res.json();
        addLog(`座席を保存しました (${data.status||"OK"})`);
      }catch(err){ console.error(err); addLog("保存失敗"); }
    };
  }

  // === 使用状況取得（GAS連携）===
  async function fetchUsage(){
    if(isAdmin) return;
    try{
      const res = await fetch(GAS_URL_USAGE+"?action=getUsage");
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      seatLayout.forEach(s=>{
        s.used = !!data[s.id];
        const div = container.querySelector(`[data-id="${s.id}"]`);
        if(!div) return;
        const svg = div.querySelector("svg");
        const hex = svg.querySelector('polygon[data-role="hex"]');
        if(hex){
          const freeId = `gradFree-${s.id}`;
          const usedId = `gradUsed-${s.id}`;
          hex.setAttribute("fill", s.used?`url(#${usedId})`:`url(#${freeId})`);
        }
      });
    }catch(err){console.error("fetchUsage error:",err);}
  }
  setInterval(fetchUsage,5000);
  fetchUsage();

  // === 初期描画 ===
  const initialPattern = roomPatternSelect.value || "wide";
  seatLayout = JSON.parse(JSON.stringify(seatLayouts[initialPattern]));
  container.style.width = layoutMeta[initialPattern].width+"px";
  container.style.height = layoutMeta[initialPattern].height+"px";
  renderRoom(initialPattern);
  renderSeats();

});
