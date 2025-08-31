document.addEventListener("DOMContentLoaded", () => {

  // === GAS URL ===
  const GAS_URL_SEAT  = "座席配置GASのURL";       // 座席・オブジェクト座標保存用
  const GAS_URL_USAGE = "座席ID⇄生徒IDGASのURL";  // 使用状況取得用

  // === 状態管理 ===
  let isAdmin = false, dragging = null, offsetX = 0, offsetY = 0;
  let objectLayout = [
    {id:"A01", x:20, y:50, label:"A01", type:"seat", used:false, updatedAt:Date.now()},
    {id:"A02", x:120, y:50, label:"A02", type:"seat", used:false, updatedAt:Date.now()},
    {id:"O01", x:300, y:50, label:"", type:"object", updatedAt:Date.now()}
  ];

  const container = document.getElementById("seatContainer");
  const logArea   = document.getElementById("logArea");
  const roomSvg   = document.getElementById("roomSvg");

  // === ツールチップ ===
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.style.transition = "all 0.2s ease";
  document.body.appendChild(tooltip);

  // === ログ関数 ===
  function addLog(text){
    if(!isAdmin) return;
    const now = new Date().toLocaleTimeString();
    logArea.style.display = "block";
    logArea.textContent = `[${now}] ${text}\n` + logArea.textContent;
  }

  // === オブジェクト作成（座席・黒い正方形オブジェクト） ===
  function createObject(obj){
    const div = document.createElement("div");
    div.className = "object" + (isAdmin ? " admin" : "");
    let size = obj.type==="seat"?80:60;
    Object.assign(div.style,{
      left: obj.x+"px",
      top: obj.y+"px",
      width: size+"px",
      height: size+"px",
      position: "absolute",
      cursor: isAdmin?"grab":"default",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      fontWeight:"bold",
      zIndex: obj.type==="seat"?1:0,
      transition:"left 0.3s, top 0.3s",
      backgroundColor: obj.type==="object"?"#000":"#fff",
      border: obj.type==="seat"?"2px solid #000":"none",
      color: obj.type==="seat"?"#000":"#fff"
    });

    div.dataset.id = obj.id;
    div.dataset.type = obj.type;
    div.textContent = obj.type==="seat"?obj.label:obj.label;

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
      if(obj.type==="seat" || obj.type==="object") div.contentEditable = true;

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

    // 他の座席との重なり判定（座席同士のみ）
    const overlapSeat = objectLayout.some(o=>{
      if(o.id===currentId || o.type!=="seat") return false;
      return newX<o.x+80 && newX+80>o.x && newY<o.y+80 && newY+80>o.y;
    });

    if(!overlapSeat){
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
    ["addSeatBtn","addObjectBtn","manualSaveBtn"].forEach(id=>{
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
  document.getElementById("addObjectBtn").onclick = ()=>{
    const id = "O"+Date.now();
    objectLayout.push({id,x:50,y:50,label:"",type:"object",updatedAt:Date.now()});
    renderObjects();
    addLog(`オブジェクト ${id} 追加`);
  };

  // === 保存 ===
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
  renderObjects();

});
