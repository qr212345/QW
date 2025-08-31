document.addEventListener("DOMContentLoaded", () => {

  // === GAS URL ===
  const GAS_URL_SEAT  = "座席配置GASのURL";       // 座席・机・スクリーン座標保存用
  const GAS_URL_USAGE = "座席ID⇄生徒IDGASのURL";  // 使用状況取得用

  // === 状態管理 ===
  let isAdmin = false, dragging = null, offsetX = 0, offsetY = 0;
  let objectLayout = [
    {id:"A01", x:20, y:50, label:"A01", type:"seat", used:false, updatedAt:Date.now()},
    {id:"A02", x:120, y:50, label:"A02", type:"seat", used:false, updatedAt:Date.now()},
    {id:"B01", x:20, y:150, label:"B01", type:"seat", used:false, updatedAt:Date.now()},
    {id:"B02", x:120, y:150, label:"B02", type:"seat", used:false, updatedAt:Date.now()}
  ];

  const container = document.getElementById("seatContainer");
  const logArea   = document.getElementById("logArea");
  const roomSvg   = document.getElementById("roomSvg");

  // === ツールチップ ===
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.style.transition = "all 0.2s ease";
  document.body.appendChild(tooltip);

  // === 部屋データ ===
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
        rect.style.transition = "all 0.5s";
        roomSvg.appendChild(rect);
      }
    });
  }

  // === オブジェクト作成（座席・机・スクリーン） ===
  function createObject(obj){
    const div = document.createElement("div");
    div.className = "object" + (isAdmin ? " admin" : "");
    const size = obj.type==="seat"?80: obj.type==="block"?60: obj.type==="screen"?120:80;
    const height = obj.type==="seat"?80: obj.type==="block"?60: obj.type==="screen"?60:80;
    Object.assign(div.style,{
      left: obj.x+"px",
      top: obj.y+"px",
      width: size+"px",
      height: height+"px",
      position: "absolute",
      cursor: isAdmin?"grab":"default",
      border: obj.type==="seat"?"2px solid #000":"none",
      backgroundColor: obj.type==="block"?"#333": obj.type==="screen"?"#666":"transparent",
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
    div.addEventListener("mouseleave", ()=>{
      tooltip.style.opacity = 0;
    });

    if(isAdmin){
      // contentEditable
      if(obj.type==="seat") div.contentEditable = true;

      // 削除ボタン
      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      delBtn.className = "delete-btn";
      delBtn.style.opacity = "0";
      delBtn.style.transition = "opacity 0.3s";
      div.addEventListener("mouseenter", ()=>{ delBtn.style.opacity="1"; });
      div.addEventListener("mouseleave", ()=>{ delBtn.style.opacity="0"; });
      delBtn.addEventListener("click", e=>{
        objectLayout = objectLayout.filter(o=>o.id!==obj.id);
        renderObjects();
        addLog(`${obj.type} ${obj.id} 削除`);
        e.stopPropagation();
      });
      div.appendChild(delBtn);

      // ドラッグ
      div.addEventListener("mousedown", e=>{
        dragging = div; offsetX = e.offsetX; offsetY = e.offsetY;
        div.style.zIndex = 1000; div.style.cursor="grabbing";
      });
    }

    // 座席使用状況クラス
    if(obj.type==="seat"){
      div.classList.remove("used","free");
      div.classList.add(obj.used?"used":"free");
    }

    return div;
  }

  function renderObjects(){
    container.innerHTML="";
    objectLayout.forEach(o=>container.appendChild(createObject(o)));
  }

  // === ドラッグ処理 ===
  document.addEventListener("mousemove", e=>{
    if(!dragging) return;
    const boundsW = container.clientWidth;
    const boundsH = container.clientHeight;
    const w = parseInt(dragging.style.width);
    const h = parseInt(dragging.style.height);
    let newX = e.clientX - container.getBoundingClientRect().left - offsetX;
    let newY = e.clientY - container.getBoundingClientRect().top - offsetY;
    newX = Math.max(0, Math.min(newX, boundsW-w));
    newY = Math.max(0, Math.min(newY, boundsH-h));

    const currentId = dragging.dataset.id;
    const currentObj = objectLayout.find(o=>o.id===currentId);

    // 他の座席との重なり判定
    const overlapSeat = objectLayout.some(o=>{
      if(o.id===currentId || o.type!=="seat") return false;
      return newX<o.x+80 && newX+80>o.x && newY<o.y+80 && newY+80>o.y;
    });

    // 部屋オブジェクト（机やスクリーン）との衝突判定
    const pattern = document.getElementById("roomPattern").value;
    const overlapObj = roomObjects[pattern].some(obj=>{
      if(obj.type!=="rect") return false;
      return newX<obj.x+obj.width && newX+w>obj.x && newY<obj.y+obj.height && newY+h>obj.y;
    });

    if(!overlapSeat && !overlapObj){
      dragging.style.left = newX+"px";
      dragging.style.top  = newY+"px";
    }
  });

  document.addEventListener("mouseup", ()=>{
    if(!dragging) return;
    const obj = objectLayout.find(o=>o.id===dragging.dataset.id);
    obj.x = parseInt(dragging.style.left);
    obj.y = parseInt(dragging.style.top);
    obj.updatedAt = Date.now();
    dragging.style.zIndex="";
    dragging.style.cursor = "grab";
    dragging = null;
  });

  // === 管理者モード切替 ===
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
    ["addSeatBtn","addBlockBtn","addScreenBtn","manualSaveBtn"].forEach(id=>{
      const btn = document.getElementById(id);
      if(btn) btn.style.display = isAdmin?"inline-block":"none";
    });
    renderObjects();
    addLog(`管理モード ${isAdmin?"ON":"OFF"}`);
  };

  // === 追加ボタン ===
  document.getElementById("addSeatBtn").onclick = ()=>{
    const id = "S"+Date.now();
    objectLayout.push({id,x:20,y:50,label:id,type:"seat",used:false,updatedAt:Date.now()});
    renderObjects();
    addLog(`座席 ${id} 追加`);
  };
  document.getElementById("addBlockBtn").onclick = ()=>{
    const id = "B"+Date.now();
    objectLayout.push({id,x:50,y:50,label:id,type:"block",updatedAt:Date.now()});
    renderObjects();
    addLog(`机 ${id} 追加`);
  };
  document.getElementById("addScreenBtn").onclick = ()=>{
    const id = "SC"+Date.now();
    objectLayout.push({id,x:0,y:0,label:id,type:"screen",updatedAt:Date.now()});
    renderObjects();
    addLog(`スクリーン ${id} 追加`);
  };

  // === 保存（座席・机・スクリーン） ===
  async function saveObjects(){
    if(!isAdmin) return;
    try{
      const res = await fetch(GAS_URL_SEAT,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"save", data:objectLayout})
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      addLog("💾 保存完了");
    } catch(err){ addLog("❌ 保存失敗: "+err); console.error(err); }
  }
  document.getElementById("manualSaveBtn").onclick = saveObjects;

  // === テーマ切替 ===
  document.getElementById("themeToggleBtn").onclick = ()=>{
    const body = document.body;
    if(body.classList.contains("light")) body.classList.replace("light","dark");
    else body.classList.replace("dark","light");
  };

  // === 部屋パターン切替 ===
  document.getElementById("roomPattern").onchange = e=>{
    const val = e.target.value;
    roomSvg.setAttribute("width",val==="wide"?"800":"600");
    roomSvg.setAttribute("height",val==="wide"?"600":"800");
    container.style.width = val==="wide"?"800px":"600px";
    container.style.height= val==="wide"?"600px":"800px";
    renderRoom(val);
    renderObjects();
  };

  // === 使用状況取得（管理者OFFのみ）===
  async function fetchUsage(){
    if(isAdmin) return;
    try{
      const res = await fetch(GAS_URL_USAGE+"?action=getUsage");
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      objectLayout.forEach(o=>{
        if(o.type==="seat") o.used = !!data[o.id];
      });
      renderObjects();
    } catch(err){ console.error(err); }
  }
  setInterval(fetchUsage,5000);
  fetchUsage();

  // === 初期描画 ===
  renderRoom(document.getElementById("roomPattern").value);
  renderObjects();

});
