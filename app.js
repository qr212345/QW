document.addEventListener("DOMContentLoaded", () => {

  const GAS_URL_SEAT  = "座席配置GASのURL";     
  const GAS_URL_USAGE = "座席ID⇄生徒IDGASのURL";  

  let isAdmin = true, dragging = null, offsetX = 0, offsetY = 0;

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

  const container = document.getElementById("seatContainer");
  const logArea   = document.getElementById("logArea");
  const roomSvg   = document.getElementById("roomSvg");

  // ツールチップ
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  document.body.appendChild(tooltip);

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

  function addLog(text){
    if(!isAdmin) return;
    const now = new Date().toLocaleTimeString();
    logArea.style.display = "block";
    logArea.textContent = `[${now}] ${text}\n` + logArea.textContent;
  }

  function renderRoom(pattern){
    roomSvg.innerHTML="";
    const objects = roomObjects[pattern];
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

  function createSeat(seat){
    const div = document.createElement("div");
    div.className = "seat" + (isAdmin?" admin":"");
    div.style.left = seat.x + "px";
    div.style.top  = seat.y + "px";

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width","70");
    svg.setAttribute("height","70");

    // 六角形
    const hex = document.createElementNS(svgNS, "polygon");
    hex.setAttribute("points","35,5 60,20 60,50 35,65 10,50 10,20");
    hex.setAttribute("fill", seat.used ? "#f66" : "#6f6");
    hex.setAttribute("stroke","#333");
    hex.setAttribute("stroke-width","2");
    svg.appendChild(hex);

    // ラベル
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x","35");
    text.setAttribute("y","40");
    text.setAttribute("text-anchor","middle");
    text.setAttribute("dominant-baseline","middle");
    text.setAttribute("font-size","12");
    text.setAttribute("fill","#000");
    text.textContent = seat.label;
    svg.appendChild(text);

    div.appendChild(svg);

    // ツールチップ
    div.addEventListener("mouseenter", e=>{
      tooltip.textContent = `座席: ${seat.label}\n状態: ${seat.used?"使用中":"空席"}`;
      tooltip.style.left = e.pageX + 12 + "px";
      tooltip.style.top  = e.pageY + 12 + "px";
      tooltip.style.opacity = 1;
      tooltip.style.transform = "translateY(0)";
    });
    div.addEventListener("mousemove", e=>{
      tooltip.style.left = e.pageX + 12 + "px";
      tooltip.style.top  = e.pageY + 12 + "px";
    });
    div.addEventListener("mouseleave", ()=>{
      tooltip.style.opacity = 0;
      tooltip.style.transform = "translateY(-4px)";
    });

    if(isAdmin){
      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
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
        div.style.zIndex = 1000;
        div.style.cursor = "grabbing";
      });

      // ラベル編集（ダブルクリック）
      div.addEventListener("dblclick", ()=>{
        const input = document.createElement("input");
        input.value = seat.label;
        Object.assign(input.style, {
          position:"absolute",
          left:"0px",
          top:"25px",
          width:"70px",
          textAlign:"center",
          fontSize:"12px"
        });
        div.appendChild(input);
        input.focus();
        input.addEventListener("blur", ()=>{
          seat.label = input.value;
          text.textContent = seat.label;
          div.removeChild(input);
        });
        input.addEventListener("keydown", e=>{
          if(e.key==="Enter") input.blur();
        });
      });
    }

    return div;
  }

  function renderSeats(){
    container.innerHTML="";
    seatLayout.forEach(seat => container.appendChild(createSeat(seat)));
  }

  document.addEventListener("mousemove", e=>{
    if(!dragging) return;
    let newX = e.clientX - container.getBoundingClientRect().left - offsetX;
    let newY = e.clientY - container.getBoundingClientRect().top  - offsetY;
    const pattern = document.getElementById("roomPattern").value;
    const maxWidth  = pattern==="wide"?800:600;
    const maxHeight = pattern==="wide"?600:800;
    newX = Math.max(0, Math.min(newX, maxWidth-70));
    newY = Math.max(0, Math.min(newY, maxHeight-70));

    const currentId = dragging.dataset.id;
    const overlapSeat = seatLayout.some(seat=>{
      if(seat.id===currentId) return false;
      return newX<seat.x+70 && newX+70>seat.x && newY<seat.y+70 && newY+70>seat.y;
    });
    const overlapObj = roomObjects[pattern].some(obj=>{
      if(obj.type!=="rect") return false;
      return newX<obj.x+obj.width && newX+70>obj.x && newY<obj.y+obj.height && newY+70>obj.y;
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

  document.getElementById("roomPattern").onchange = e=>{
    const val = e.target.value;
    seatLayout = JSON.parse(JSON.stringify(seatLayouts[val]));
    const width  = val==="wide"?800:600;
    const height = val==="wide"?600:800;
    roomSvg.style.width = width+"px";
    roomSvg.style.height = height+"px";
    container.style.width  = width+"px";
    container.style.height = height+"px";
    renderRoom(val);
    renderSeats();
  };

  async function fetchUsage(){
    if(isAdmin) return;
    try{
      const res = await fetch(GAS_URL_USAGE+"?action=getUsage");
      if(!res.ok) throw new Error(`HTTP error! ${res.status}`);
      const data = await res.json();
      seatLayout.forEach(s=>{
        s.used = data[s.id]?true:false;
        const div = container.querySelector(`[data-id="${s.id}"]`);
        if(div){
          const polygon = div.querySelector("polygon");
          polygon.setAttribute("fill", s.used?"#f66":"#6f6");
        }
      });
    } catch(err){ console.error("fetchUsage error:", err); }
  }
  setInterval(fetchUsage,5000);
  fetchUsage();

  const initialPattern = document.getElementById("roomPattern").value;
  seatLayout = JSON.parse(JSON.stringify(seatLayouts[initialPattern]));
  renderRoom(initialPattern);
  renderSeats();

});
