document.addEventListener("DOMContentLoaded", () => {

  // === GAS URL ===
  const GAS_URL_SEAT  = "座席配置GASのURL";
  const GAS_URL_USAGE = "座席ID⇄生徒IDGASのURL";

  // === 状態管理 ===
  let isAdmin = false, dragging = null, offsetX = 0, offsetY = 0;

  // === 定数 ===
  const SEAT_SIZE = 80;  // 座席の描画・衝突サイズ
  const HALF = SEAT_SIZE / 2;

  // === レイアウト定義（2つの部屋パターン） ===
  // 画像の2レイアウトに合わせて座席座標・部屋オブジェクトをここで定義
  // 必要に応じて座標を微調整してください
  const layoutMeta = {
    layout1: { width: 1000, height: 700 }, // 協働・グループワーク型（六角机）
    layout2: { width: 1000, height: 700 }  // 講義・長机列＋グループ島ミックス
  };

  const seatLayouts = {
    layout1: [
      // 例: 六角机の周りに6席 × 複数島（代表のみ）
      {id:"A01", x:140, y:220, label:"A01", used:false, updatedAt: Date.now()},
      {id:"A02", x:200, y:180, label:"A02", used:false, updatedAt: Date.now()},
      {id:"A03", x:260, y:220, label:"A03", used:false, updatedAt: Date.now()},
      {id:"A04", x:260, y:290, label:"A04", used:false, updatedAt: Date.now()},
      {id:"A05", x:200, y:330, label:"A05", used:false, updatedAt: Date.now()},
      {id:"A06", x:140, y:290, label:"A06", used:false, updatedAt: Date.now()},

      {id:"B01", x:460, y:220, label:"B01", used:false, updatedAt: Date.now()},
      {id:"B02", x:520, y:180, label:"B02", used:false, updatedAt: Date.now()},
      {id:"B03", x:580, y:220, label:"B03", used:false, updatedAt: Date.now()},
      {id:"B04", x:580, y:290, label:"B04", used:false, updatedAt: Date.now()},
      {id:"B05", x:520, y:330, label:"B05", used:false, updatedAt: Date.now()},
      {id:"B06", x:460, y:290, label:"B06", used:false, updatedAt: Date.now()}
      // 必要に応じて島を増やす
    ],
    layout2: [
      // 例: 上部は長机列、下部は小島
      {id:"C01", x:120, y:120, label:"C01", used:false, updatedAt: Date.now()},
      {id:"C02", x:220, y:120, label:"C02", used:false, updatedAt: Date.now()},
      {id:"C03", x:320, y:120, label:"C03", used:false, updatedAt: Date.now()},
      {id:"C04", x:420, y:120, label:"C04", used:false, updatedAt: Date.now()},
      {id:"C05", x:520, y:120, label:"C05", used:false, updatedAt: Date.now()},
      {id:"C06", x:620, y:120, label:"C06", used:false, updatedAt: Date.now()},

      {id:"D01", x:200, y:360, label:"D01", used:false, updatedAt: Date.now()},
      {id:"D02", x:260, y:320, label:"D02", used:false, updatedAt: Date.now()},
      {id:"D03", x:320, y:360, label:"D03", used:false, updatedAt: Date.now()},
      {id:"D04", x:320, y:420, label:"D04", used:false, updatedAt: Date.now()},
      {id:"D05", x:260, y:460, label:"D05", used:false, updatedAt: Date.now()},
      {id:"D06", x:200, y:420, label:"D06", used:false, updatedAt: Date.now()}
    ]
  };

  // === 部屋オブジェクト（衝突対象） ===
  // type: "rect" のみ衝突対象。スクリーン、ホワイトボード、長机などを配置。
  const roomObjects = {
    layout1: [
      // スクリーン
      {type:"rect", x:0,   y:0,   width:layoutMeta.layout1.width, height:30, fill:"#222"},
      // ホワイトボード中央
      {type:"rect", x:380, y:80,  width:240, height:30, fill:"#e6e6e6"},
      // 長机例（部屋内障害物）
      {type:"rect", x:120, y:450, width:200, height:50, fill:"#bdbdbd"},
      {type:"rect", x:680, y:200, width:220, height:60, fill:"#bdbdbd"},
      // 自販機・水道（占有物）
      {type:"rect", x:860, y:60,  width:60,  height:60, fill:"#8aa"},
      {type:"rect", x:860, y:140, width:60,  height:40, fill:"#8ab"}
      // 必要に応じて追加
    ],
    layout2: [
      // スクリーン2面
      {type:"rect", x:0,   y:0,    width:layoutMeta.layout2.width, height:30, fill:"#222"},
      {type:"rect", x:layoutMeta.layout2.width-280, y:0, width:280, height:30, fill:"#222"},
      // 長机の列
      {type:"rect", x:80,  y:70,  width:760, height:40, fill:"#bdbdbd"},
      {type:"rect", x:80,  y:160, width:760, height:40, fill:"#bdbdbd"},
      // 右側ホワイトボード
      {type:"rect", x:760, y:260, width:160, height:40, fill:"#e6e6e6"},
      // 下駄箱・入口付近
      {type:"rect", x:40,  y:60,  width:30,  height:120, fill:"#999"},
      {type:"rect", x:20,  y:60,  width:20,  height:40,  fill:"#777"}
      // 必要に応じて追加
    ]
  };

  // === 現在の座席レイアウト ===
  let seatLayout = JSON.parse(JSON.stringify(seatLayouts["layout1"]));

  // === DOM ===
  const container = document.getElementById("seatContainer");
  const logArea   = document.getElementById("logArea");
  const roomSvg   = document.getElementById("roomSvg");

  // === ツールチップ ===
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  Object.assign(tooltip.style, {
    transition: "opacity 0.2s, transform 0.2s",
    padding: "6px 12px",
    borderRadius: "6px",
    background: "rgba(0,0,0,0.75)",
    color: "#fff",
    fontSize: "13px",
    position: "absolute",
    pointerEvents: "none",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    opacity: 0,
    whiteSpace: "pre-line",
    transform: "translateY(-4px)"
  });
  document.body.appendChild(tooltip);

  // === ログ関数 ===
  function addLog(text){
    if(!isAdmin) return;
    const now = new Date().toLocaleTimeString();
    logArea.style.display = "block";
    logArea.textContent = `[${now}] ${text}\n` + logArea.textContent;
  }

  // === 部屋描画 ===
  function renderRoom(pattern){
    roomSvg.innerHTML = "";
    const meta = layoutMeta[pattern];
    roomSvg.setAttribute("width",  meta.width);
    roomSvg.setAttribute("height", meta.height);
    roomSvg.style.transition = "all 0.5s ease";

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

  // === 六角形ポイント生成（SEAT_SIZEに合わせる） ===
  function hexPoints() {
    // パディング
    const pad = 10;
    const top     = `${HALF},${pad}`;                 // 上
    const ru      = `${SEAT_SIZE - pad},${pad + 15}`; // 右上
    const rd      = `${SEAT_SIZE - pad},${SEAT_SIZE - pad - 15}`; // 右下
    const bottom  = `${HALF},${SEAT_SIZE - pad}`;     // 下
    const ld      = `${pad},${SEAT_SIZE - pad - 15}`; // 左下
    const lu      = `${pad},${pad + 15}`;             // 左上
    return [top, ru, rd, bottom, ld, lu].join(" ");
  }

  // === グラデーション定義を座席SVGに追加 ===
  function injectSeatGradients(svg, seatId){
    const svgNS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(svgNS, "defs");

    const makeGrad = (id, c1, c2) => {
      const lg = document.createElementNS(svgNS, "linearGradient");
      lg.setAttribute("id", id);
      lg.setAttribute("x1", "0%");
      lg.setAttribute("y1", "0%");
      lg.setAttribute("x2", "100%");
      lg.setAttribute("y2", "100%");
      const stop1 = document.createElementNS(svgNS, "stop");
      stop1.setAttribute("offset", "0%");
      stop1.setAttribute("stop-color", c1);
      const stop2 = document.createElementNS(svgNS, "stop");
      stop2.setAttribute("offset", "100%");
      stop2.setAttribute("stop-color", c2);
      lg.appendChild(stop1); lg.appendChild(stop2);
      return lg;
    };

    const freeId = `gradFree-${seatId}`;
    const usedId = `gradUsed-${seatId}`;
    defs.appendChild(makeGrad(freeId, "#6f6", "#3c3"));
    defs.appendChild(makeGrad(usedId, "#f66", "#c33"));
    svg.appendChild(defs);
    return { freeId, usedId };
  }

  // === 座席生成（六角形＋中央四角＋ラベル） ===
  function createSeat(seat){
    const div = document.createElement("div");
    Object.assign(div.style, {
      left: seat.x + "px",
      top: seat.y + "px",
      width: SEAT_SIZE + "px",
      height: SEAT_SIZE + "px",
      position: "absolute",
      cursor: isAdmin ? "grab" : "default",
      transition: "all 0.3s ease"
    });
    div.dataset.id = seat.id;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width",  SEAT_SIZE);
    svg.setAttribute("height", SEAT_SIZE);

    // グラデーション定義
    const { freeId, usedId } = injectSeatGradients(svg, seat.id);

    // 六角形（外形）
    const hex = document.createElementNS(svgNS, "polygon");
    hex.setAttribute("points", hexPoints());
    hex.setAttribute("fill", seat.used ? `url(#${usedId})` : `url(#${freeId})`);
    hex.setAttribute("stroke", "#333");
    hex.setAttribute("stroke-width", "2");
    hex.dataset.role = "hex";
    svg.appendChild(hex);

    // 中央四角
    const rect = document.createElementNS(svgNS, "rect");
    const rectSize = 24;
    rect.setAttribute("x", (SEAT_SIZE - rectSize)/2);
    rect.setAttribute("y", (SEAT_SIZE - rectSize)/2);
    rect.setAttribute("width",  rectSize);
    rect.setAttribute("height", rectSize);
    rect.setAttribute("rx", "4");
    rect.setAttribute("fill", "#fff");
    svg.appendChild(rect);

    // ラベル
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", HALF);
    text.setAttribute("y", HALF + 1);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "12");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("fill", "#000");
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
    container.innerHTML = "";
    seatLayout.forEach(seat => container.appendChild(createSeat(seat)));
  }

  // === ドラッグ処理 ===
  document.addEventListener("mousemove", e=>{
    if(!dragging) return;
    const pattern = document.getElementById("roomPattern").value;
    const boundsW = layoutMeta[pattern].width;
    const boundsH = layoutMeta[pattern].height;

    let newX = e.clientX - container.getBoundingClientRect().left - offsetX;
    let newY = e.clientY - container.getBoundingClientRect().top  - offsetY;
    newX = Math.max(0, Math.min(newX, boundsW - SEAT_SIZE));
    newY = Math.max(0, Math.min(newY, boundsH - SEAT_SIZE));

    const currentId = dragging.dataset.id;
    const overlapSeat = seatLayout.some(seat=>{
      if(seat.id===currentId) return false;
      return newX < seat.x + SEAT_SIZE && newX + SEAT_SIZE > seat.x &&
             newY < seat.y + SEAT_SIZE && newY + SEAT_SIZE > seat.y;
    });

    const overlapObj = roomObjects[pattern].some(obj=>{
      if(obj.type!=="rect") return false;
      return newX < obj.x + obj.width && newX + SEAT_SIZE > obj.x &&
             newY < obj.y + obj.height && newY + SEAT_SIZE > obj.y;
    });

    if(!overlapSeat && !overlapObj){
      dragging.style.left = newX + "px";
      dragging.style.top  = newY + "px";
    }
  });

  document.addEventListener("mouseup", ()=>{
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
    const val = e.target.value; // "layout1" or "layout2"
    // レイアウト座席を差し替え
    seatLayout = JSON.parse(JSON.stringify(seatLayouts[val]));

    // コンテナリサイズ
    const width  = layoutMeta[val].width;
    const height = layoutMeta[val].height;
    container.style.transition = "all 0.5s ease";
    container.style.width  = width + "px";
    container.style.height = height + "px";

    renderRoom(val);
    renderSeats();
  };

  // === 使用状況自動取得 ===
  async function fetchUsage(){
    if(isAdmin) return; // 管理作業中は更新しない
    try{
      const res = await fetch(GAS_URL_USAGE + "?action=getUsage");
      if(!res.ok) throw new Error(`HTTP error! ${res.status}`);
      const data = await res.json();
      seatLayout.forEach(s=>{
        s.used = data[s.id] ? true : false;
        const div = container.querySelector(`[data-id="${s.id}"]`);
        if(!div) return;
        // SVG内の六角形の塗りを切り替え
        const svg = div.querySelector("svg");
        const hex = svg && svg.querySelector('polygon[data-role="hex"]');
        if(hex){
          const freeId = `gradFree-${s.id}`;
          const usedId = `gradUsed-${s.id}`;
          hex.setAttribute("fill", s.used ? `url(#${usedId})` : `url(#${freeId})`);
        }
      });
    } catch(err){
      console.error("fetchUsage error:", err);
    }
  }
  setInterval(fetchUsage, 5000);
  fetchUsage();

  // === 初期描画 ===
  const initialPattern = document.getElementById("roomPattern").value || "layout1";
  seatLayout = JSON.parse(JSON.stringify(seatLayouts[initialPattern]));

  // コンテナ初期サイズ
  container.style.width  = layoutMeta[initialPattern].width + "px";
  container.style.height = layoutMeta[initialPattern].height + "px";

  renderRoom(initialPattern);
  renderSeats();

});
