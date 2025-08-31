document.addEventListener("DOMContentLoaded", () => {

  /** ==============================
   *  定数・状態管理
   *  ============================== */
  const CONFIG = {
    GAS_URL_SEAT: "https://script.google.com/macros/s/AKfycbxy-qnpbVWR5xxjzUBD10F6dz31E_Y0bBTe7dx5Menzdt3FOzuTdd1m2RiU3EtCZH4p/exec",
    GAS_URL_USAGE: "https://script.google.com/macros/s/AKfycbz7PVBPyjktzRWanKaXJs74lHASWiUSm9ZWwRuHFowpBlYuPgHh3sylBfAhYhluDIQ/exec",
    SEAT_DEFAULT_SIZE: 80,
    OBJECT_DEFAULT_SIZE: 60
  };

  let isAdmin = false;
  let dragging = null, resizing = false, offsetX = 0, offsetY = 0;
  let objectLayout = [
    {id:"A01", x:20, y:50, label:"A01", type:"seat", used:false, updatedAt:Date.now()},
    {id:"A02", x:120, y:50, label:"A02", type:"seat", used:false, updatedAt:Date.now()}
  ];

  const container = document.getElementById("seatContainer");
  const logArea   = document.getElementById("logArea");
  const roomSvg   = document.getElementById("roomSvg");

  /** ==============================
   *  ツールチップ
   *  ============================== */
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.style.transition = "all 0.2s ease";
  document.body.appendChild(tooltip);

  /** ==============================
   *  部屋描画
   *  ============================== */
  const roomObjects = { wide: [], tall: [] };
  function renderRoom(pattern) {
    roomSvg.innerHTML = "";
    roomObjects[pattern].forEach(obj => {
      if(obj.type === "rect") {
        const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
        rect.setAttribute("x", obj.x);
        rect.setAttribute("y", obj.y);
        rect.setAttribute("width", obj.width);
        rect.setAttribute("height", obj.height);
        rect.setAttribute("fill", obj.fill);
        rect.style.transition = "all 0.5s";
        roomSvg.appendChild(rect);
      }
    });
  }

  /** ==============================
   *  座席・オブジェクト描画
   *  ============================== */
  function createObject(obj) {
    const div = document.createElement("div");
    div.className = "object" + (isAdmin ? " admin" : "");
    const w = obj.width || (obj.type==="seat"?CONFIG.SEAT_DEFAULT_SIZE:CONFIG.OBJECT_DEFAULT_SIZE);
    const h = obj.height || (obj.type==="seat"?CONFIG.SEAT_DEFAULT_SIZE:CONFIG.OBJECT_DEFAULT_SIZE);

    Object.assign(div.style, {
      left: obj.x+"px",
      top: obj.y+"px",
      width: w+"px",
      height: h+"px",
      position: "absolute",
      cursor: isAdmin ? "grab" : "default",
      border: obj.type==="seat"?"2px solid #000":"none",
      backgroundColor: obj.type==="object"?"#333":"transparent",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      fontWeight:"bold",
      zIndex: obj.type==="seat"?1:0,
      transition:"left 0.3s, top 0.3s"
    });

    div.dataset.id = obj.id;
    div.dataset.type = obj.type;
    div.textContent = obj.type==="seat"?obj.label:"";

    // ツールチップ
    div.addEventListener("mouseenter", e=>{
      tooltip.textContent = `${obj.type} ${obj.label}\n更新: ${new Date(obj.updatedAt).toLocaleTimeString()}\n状態: ${obj.used?"使用中":"空席"}`;
      tooltip.style.left = e.pageX+10+"px";
      tooltip.style.top  = e.pageY+10+"px";
      tooltip.style.opacity = 1;
    });
    div.addEventListener("mousemove", e=>{
      tooltip.style.left = e.pageX+10+"px";
      tooltip.style.top  = e.pageY+10+"px";
    });
    div.addEventListener("mouseleave", ()=>{ tooltip.style.opacity = 0; });

    /** 管理者操作 */
    if(isAdmin) {
      if(obj.type==="seat") div.contentEditable = true;

      // 削除ボタン
      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      delBtn.className = "delete-btn";
      delBtn.style.opacity = "0";
      delBtn.style.transition = "opacity 0.3s";
      div.addEventListener("mouseenter", ()=> delBtn.style.opacity="1");
      div.addEventListener("mouseleave", ()=> delBtn.style.opacity="0");
      delBtn.addEventListener("click", e=>{
        objectLayout = objectLayout.filter(o=>o.id!==obj.id);
        renderObjects();
        addLog(`${obj.type} ${obj.id} 削除`);
        e.stopPropagation();
      });
      div.appendChild(delBtn);

      // ドラッグ＆リサイズ
      div.addEventListener("mousedown", e=>{
        if(e.target===delBtn) return;
        dragging = div; offsetX = e.offsetX; offsetY = e.offsetY;
        resizing = false;
        div.style.zIndex = 1000;
        div.style.cursor="grabbing";
      });

      if(obj.type==="object"){
        const handle = document.createElement("div");
        Object.assign(handle.style,{
          width:"10px", height:"10px", background:"#fff",
          border:"1px solid #000", position:"absolute",
          right:"0", bottom:"0", cursor:"se-resize", zIndex:10
        });
        div.appendChild(handle);
        handle.addEventListener("mousedown", e=>{
          e.stopPropagation();
          dragging = div;
          resizing = true;
          offsetX = e.offsetX;
          offsetY = e.offsetY;
        });
      }
    }

    if(obj.type==="seat") {
      div.classList.remove("used","free");
      div.classList.add(obj.used?"used":"free");
    }

    return div;
  }

  function renderObjects() {
    container.innerHTML="";
    objectLayout.forEach(o=>container.appendChild(createObject(o)));
  }

  /** ==============================
   *  ドラッグ＆リサイズ制御
   *  ============================== */
  document.addEventListener("mousemove", e=>{
    if(!dragging) return;
    const boundsW = container.clientWidth;
    const boundsH = container.clientHeight;
    const w = parseInt(dragging.style.width);
    const h = parseInt(dragging.style.height);
    const currentId = dragging.dataset.id;
    const currentObj = objectLayout.find(o=>o.id===currentId);

    if(resizing && currentObj.type==="object"){
      const newW = e.clientX - dragging.getBoundingClientRect().left;
      const newH = e.clientY - dragging.getBoundingClientRect().top;
      dragging.style.width = Math.max(20,newW)+"px";
      dragging.style.height= Math.max(20,newH)+"px";
      currentObj.width = newW; currentObj.height = newH; currentObj.updatedAt = Date.now();
      return;
    }

    let newX = e.clientX - container.getBoundingClientRect().left - offsetX;
    let newY = e.clientY - container.getBoundingClientRect().top - offsetY;
    newX = Math.max(0, Math.min(newX, boundsW - w));
    newY = Math.max(0, Math.min(newY, boundsH - h));

    if(currentObj.type==="seat") {
      const overlapSeat = objectLayout.some(o=>{
        if(o.id===currentId || o.type!=="seat") return false;
        return newX<o.x+CONFIG.SEAT_DEFAULT_SIZE && newX+CONFIG.SEAT_DEFAULT_SIZE>o.x &&
               newY<o.y+CONFIG.SEAT_DEFAULT_SIZE && newY+CONFIG.SEAT_DEFAULT_SIZE>o.y;
      });
      if(overlapSeat) return;
    }

    dragging.style.left = newX+"px";
    dragging.style.top  = newY+"px";
    currentObj.x = newX;
    currentObj.y = newY;
    currentObj.updatedAt = Date.now();
  });

  document.addEventListener("mouseup", ()=>{ dragging=null; resizing=false; });

  /** ==============================
   *  管理者モード切替
   *  ============================== */
  document.getElementById("toggleAdminBtn").onclick = ()=>{
    const pw = prompt("管理者パスワード入力");
    if(!isAdmin && pw!=="admin123"){ alert("パスワード違います"); return; }
    isAdmin = !isAdmin;
    logArea.style.display = isAdmin?"block":"none";
    ["addSeatBtn","addObjectBtn","manualSaveBtn"].forEach(id=>{
      const btn = document.getElementById(id);
      if(btn) btn.style.display = isAdmin?"inline-block":"none";
    });
    renderObjects();
    addLog(`管理モード ${isAdmin?"ON":"OFF"}`);
  };

  /** ==============================
   *  追加ボタン
   *  ============================== */
  document.getElementById("addSeatBtn").onclick = ()=>{
    const id = "S"+Date.now();
    objectLayout.push({id,x:20,y:50,label:id,type:"seat",used:false,updatedAt:Date.now()});
    renderObjects();
    addLog(`座席 ${id} 追加`);
  };
  document.getElementById("addObjectBtn").onclick = ()=>{
    const id = "O"+Date.now();
    objectLayout.push({id,x:50,y:50,label:"",type:"object",updatedAt:Date.now()});
    renderObjects();
    addLog(`黒オブジェクト ${id} 追加`);
  };

  /** ==============================
   *  保存
   *  ============================== */
  async function saveObjects() {
    if(!isAdmin) return;
    try{
      const res = await fetch(CONFIG.GAS_URL_SEAT,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"saveLayout", data:objectLayout})
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      addLog("💾 保存完了");
    } catch(err){
      addLog("❌ 保存失敗: "+err.message);
      console.error(err);
    }
  }
  document.getElementById("manualSaveBtn").onclick = saveObjects;

  /** ==============================
   *  使用状況取得（管理者OFF時）
   *  ============================== */
  async function fetchUsage(){
    if(isAdmin) return;
    try{
      const res = await fetch(CONFIG.GAS_URL_USAGE+"?action=getUsage");
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      objectLayout.forEach(o=>{ if(o.type==="seat") o.used = !!data[o.id]; });
      renderObjects();
    } catch(err){ console.error("fetchUsage error:", err); }
  }
  setInterval(fetchUsage,5000);
  fetchUsage();

  /** ==============================
   *  部屋パターン切替
   *  ============================== */
  document.getElementById("roomPattern").onchange = e=>{
    const val = e.target.value;
    roomSvg.setAttribute("width",val==="wide"?"800":"600");
    roomSvg.setAttribute("height",val==="wide"?"600":"800");
    container.style.width = val==="wide"?"800px":"600px";
    container.style.height= val==="wide"?"600px":"800px";
    renderRoom(val);
    renderObjects();
  };

  /** ==============================
   *  初期描画
   *  ============================== */
  renderRoom(document.getElementById("roomPattern").value);
  renderObjects();

  /** ==============================
   *  ログ表示（管理者用）
   *  ============================== */
  function addLog(text){
    if(!isAdmin) return;
    const now = new Date().toLocaleTimeString();
    logArea.style.display = "block";
    logArea.textContent = `[${now}] ${text}\n` + logArea.textContent;
  }

});
