document.addEventListener("DOMContentLoaded", () => {

  const GAS_URL_SEAT = "座席配置GASのURL";
  const GAS_URL_USAGE = "座席ID⇔生徒IDGASのURL";

  let isAdmin = false, dragging = null, offsetX = 0, offsetY = 0;
  let seatLayout = [
    {id:"A01",x:20,y:50,label:"A01",used:false, updatedAt: Date.now()},
    {id:"A02",x:120,y:50,label:"A02",used:false, updatedAt: Date.now()},
    {id:"B01",x:20,y:150,label:"B01",used:false, updatedAt: Date.now()},
    {id:"B02",x:120,y:150,label:"B02",used:false, updatedAt: Date.now()},
  ];

  const container = document.getElementById("seatContainer");
  const logArea = document.getElementById("logArea");
  const roomSvg = document.getElementById("roomSvg");

  // ツールチップ
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.style.transition = "all 0.2s";
  document.body.appendChild(tooltip);

  const roomObjects = { /* 縦横部屋データは前述通り */ };

  function addLog(text){
    if(!isAdmin) return;
    const now = new Date().toLocaleTimeString();
    logArea.style.display="block";
    logArea.textContent = `[${now}] ${text}\n` + logArea.textContent;
  }

  function renderRoom(pattern){
    roomSvg.innerHTML="";
    roomObjects[pattern].forEach(obj=>{
      if(obj.type==="rect"){
        const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
        rect.setAttribute("x", obj.x);
        rect.setAttribute("y", obj.y);
        rect.setAttribute("width", obj.width);
        rect.setAttribute("height", obj.height);
        rect.setAttribute("fill", obj.fill);
        rect.style.transition="all 0.5s";
        roomSvg.appendChild(rect);
      }
    });
  }

  function createSeat(seat){
    const div = document.createElement("div");
    div.className = "seat" + (isAdmin ? " admin" : "");
    div.style.left = seat.x + "px";
    div.style.top = seat.y + "px";
    div.style.transition="left 0.3s, top 0.3s";
    div.textContent = seat.label;
    div.dataset.id = seat.id;
    div.contentEditable = isAdmin;
    div.classList.remove("used","free");
    div.classList.add(seat.used ? "used" : "free");

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
      div.style.border = "2px dashed #f00";
      div.style.cursor="grab";

      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      delBtn.className="delete-btn";
      delBtn.style.opacity="0"; delBtn.style.transition="opacity 0.3s";
      div.addEventListener("mouseenter", ()=>{ delBtn.style.opacity="1"; });
      div.addEventListener("mouseleave", ()=>{ delBtn.style.opacity="0"; });
      delBtn.addEventListener("click", e=>{
        seatLayout = seatLayout.filter(s => s.id !== seat.id);
        renderSeats();
        addLog(`座席 ${seat.id} 削除`);
        e.stopPropagation();
      });
      div.appendChild(delBtn);

      div.addEventListener("mousedown", e=>{
        dragging = div; offsetX = e.offsetX; offsetY = e.offsetY;
        div.style.zIndex = 1000;
        div.style.cursor="grabbing";
      });
    }

    return div;
  }

  function renderSeats(){
    container.innerHTML="";
    seatLayout.forEach(seat=>container.appendChild(createSeat(seat)));
  }

  document.addEventListener("mousemove", e=>{
    if(!dragging) return;

    let newX = e.clientX - container.getBoundingClientRect().left - offsetX;
    let newY = e.clientY - container.getBoundingClientRect().top - offsetY;

    newX = Math.max(0, Math.min(newX, container.clientWidth-80));
    newY = Math.max(0, Math.min(newY, container.clientHeight-80));

    const currentId = dragging.dataset.id;
    let overlapSeat = seatLayout.some(seat=>{
      if(seat.id===currentId) return false;
      return newX<seat.x+80 && newX+80>seat.x && newY<seat.y+80 && newY+80>seat.y;
    });

    if(!overlapSeat){
      dragging.style.left = newX + "px";
      dragging.style.top = newY + "px";
    }
  });

  document.addEventListener("mouseup", e=>{
    if(!dragging) return;
    const seat = seatLayout.find(s => s.id === dragging.dataset.id);
    seat.x = parseInt(dragging.style.left);
    seat.y = parseInt(dragging.style.top);
    seat.updatedAt = Date.now();
    dragging.style.zIndex = "";
    dragging.style.cursor="grab";
    dragging = null;
  });

  // 管理モード・座席追加・保存・テーマ切替は前述同様

  document.getElementById("roomPattern").onchange = e=>{
    const val = e.target.value;
    let cx = val==="wide" ? 400 : 300;
    let cy = val==="wide" ? 300 : 400;
    let angle = val==="wide" ? 90 : -90;

    seatLayout.forEach(seat=>{
      let dx = seat.x - cx, dy = seat.y - cy;
      let rad = angle * Math.PI / 180;
      seat.x = cx + dx*Math.cos(rad) - dy*Math.sin(rad);
      seat.y = cy + dx*Math.sin(rad) + dy*Math.cos(rad);
    });

    roomSvg.setAttribute("width", val==="wide" ? "800" : "600");
    roomSvg.setAttribute("height", val==="wide" ? "600" : "800");
    container.style.width = val==="wide" ? "800px" : "600px";
    container.style.height = val==="wide" ? "600px" : "800px";

    renderRoom(val);
    renderSeats();
  };

  // 使用状況自動取得（管理モードOFFのみ）
  async function fetchUsage(){
    if(isAdmin) return;
    try{
      const res = await fetch(GAS_URL_USAGE+"?action=getUsage");
      const data = await res.json();
      seatLayout.forEach(s=>{
        s.used = data[s.id] ? true : false;
      });
      renderSeats();
    } catch(err){ console.error(err); }
  }
  setInterval(fetchUsage,5000);
  fetchUsage();

  renderRoom(document.getElementById("roomPattern").value);
  renderSeats();

});
