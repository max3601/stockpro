import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   STOCKPRO — Gestion de Stock Offline-First
   Douala 🇨🇲 ↔ Montréal 🇨🇦
   Rôles: Propriétaire | Gestionnaire | Vendeur
═══════════════════════════════════════════════════════ */

// ── Design Tokens ─────────────────────────────────────
const C = {
  bg:         "#07080C",
  s1:         "#0E1118",
  s2:         "#141820",
  s3:         "#1C2230",
  border:     "#222A3A",
  borderHi:   "#2E3A50",
  green:      "#00E5A0",
  greenDim:   "#00E5A012",
  greenMid:   "#00E5A040",
  orange:     "#FF9500",
  orangeDim:  "#FF950012",
  red:        "#FF4060",
  redDim:     "#FF406012",
  blue:       "#3D8EFF",
  blueDim:    "#3D8EFF12",
  purple:     "#A78BFA",
  purpleDim:  "#A78BFA12",
  yellow:     "#FFD60A",
  text:       "#E8EEF8",
  sub:        "#7A8BA8",
  muted:      "#3A4558",
};

// ── LocalStorage DB (offline persistence) ─────────────
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem("sp_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem("sp_" + k, JSON.stringify(v)); } catch {} },
  clear: (k) => { try { localStorage.removeItem("sp_" + k); } catch {} },
};

// ── Seed Data ──────────────────────────────────────────
const SEED_USERS = [
  { id: "u1", name: "Propriétaire", role: "owner",   pin: "1234", location: "Montréal 🇨🇦", color: C.blue   },
  { id: "u2", name: "Kouam",        role: "stock",   pin: "1111", location: "Douala 🇨🇲",   color: C.green  },
  { id: "u3", name: "Ngozi",        role: "stock",   pin: "2222", location: "Douala 🇨🇲",   color: C.purple },
  { id: "u4", name: "Jean",         role: "vendeur", pin: "3333", location: "Douala 🇨🇲",   color: C.orange },
  { id: "u5", name: "Marie",        role: "vendeur", pin: "4444", location: "Douala 🇨🇲",   color: C.yellow },
];

const SEED_PRODUCTS = [
  { id:"A001", name:"Aspirateur Dyson V11",       cat:"Aspirateurs",  stock:12, min:5,  unit:"pcs",    qr:"QR-A001" },
  { id:"A002", name:"Aspirateur Rowenta X-Force",  cat:"Aspirateurs",  stock:3,  min:5,  unit:"pcs",    qr:"QR-A002" },
  { id:"A003", name:"Aspirateur Industriel 30L",   cat:"Aspirateurs",  stock:7,  min:3,  unit:"pcs",    qr:"QR-A003" },
  { id:"B001", name:"Balai Serpillière Pro",        cat:"Balais",       stock:25, min:10, unit:"pcs",    qr:"QR-B001" },
  { id:"B002", name:"Balai Brosse Crin Dur",        cat:"Balais",       stock:8,  min:10, unit:"pcs",    qr:"QR-B002" },
  { id:"B003", name:"Seau + Essoreuse Set",         cat:"Balais",       stock:6,  min:4,  unit:"sets",   qr:"QR-B003" },
  { id:"C001", name:"Liquide Nettoyant Sol 5L",     cat:"Chimique",     stock:40, min:15, unit:"bidons", qr:"QR-C001" },
  { id:"C002", name:"Désinfectant Multi-surfaces",  cat:"Chimique",     stock:18, min:10, unit:"L",      qr:"QR-C002" },
  { id:"E001", name:"Gants Latex (boîte 100)",      cat:"EPI",          stock:2,  min:8,  unit:"boîtes", qr:"QR-E001" },
  { id:"E002", name:"Masques FFP2 (boîte 20)",      cat:"EPI",          stock:15, min:5,  unit:"boîtes", qr:"QR-E002" },
  { id:"X001", name:"Chiffons Microfibre (lot 10)", cat:"Accessoires",  stock:60, min:20, unit:"lots",   qr:"QR-X001" },
  { id:"X002", name:"Éponges Double-face (x10)",    cat:"Accessoires",  stock:0,  min:10, unit:"packs",  qr:"QR-X002" },
];

const SEED_HISTORY = [
  { id:"h1", type:"sortie", pid:"A001", qty:2, uid:"u2", note:"Chantier Bâtiment A",      ts: Date.now()-86400000,  synced:true },
  { id:"h2", type:"entrée", pid:"C001", qty:20,uid:"u1", note:"Livraison fournisseur",     ts: Date.now()-172800000, synced:true },
  { id:"h3", type:"sortie", pid:"B001", qty:5, uid:"u3", note:"Équipe nettoyage Akwa",     ts: Date.now()-259200000, synced:true },
  { id:"h4", type:"sortie", pid:"E001", qty:6, uid:"u4", note:"Vente client",              ts: Date.now()-345600000, synced:true },
  { id:"h5", type:"entrée", pid:"A002", qty:5, uid:"u1", note:"Réapprovisionnement",       ts: Date.now()-432000000, synced:true },
];

// ── Helpers ────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2,9);
const fmtDate = ts => new Date(ts).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const roleLabel = r => ({ owner:"Propriétaire 👑", stock:"Gestionnaire 📦", vendeur:"Vendeur 🛒" }[r] || r);
const roleColor = r => ({ owner:C.blue, stock:C.green, vendeur:C.orange }[r] || C.sub);

// ── Mini QR SVG ────────────────────────────────────────
function QRViz({ code, size = 68 }) {
  const seed = code.split("").reduce((a,c,i) => a + c.charCodeAt(0)*(i+13), 0);
  const rng  = n => ((seed*7193 + n*39119) % 199999) / 199999;
  const N=11, cs=size/N;
  return (
    <svg width={size} height={size} style={{borderRadius:8,display:"block",flexShrink:0}}>
      <rect width={size} height={size} fill="#fff"/>
      {Array.from({length:N},(_,r)=>Array.from({length:N},(_,c)=>{
        const corner = (r<4&&c<4)||(r<4&&c>N-5)||(r>N-5&&c<4);
        const inner  = (r>=1&&r<=2&&c>=1&&c<=2)||(r>=1&&r<=2&&c>=N-3&&c<=N-2)||(r>=N-3&&r<=N-2&&c>=1&&c<=2);
        const on = inner ? false : corner ? true : rng(r*N+c+7)>0.46;
        return on && <rect key={`${r}${c}`} x={c*cs} y={r*cs} width={cs} height={cs} fill={C.bg}/>;
      }))}
    </svg>
  );
}

// ── UI Primitives ──────────────────────────────────────
const Tag = ({children,color=C.green,sm}) => (
  <span style={{background:color+"20",color,border:`1px solid ${color}40`,borderRadius:6,
    padding:sm?"1px 6px":"3px 9px",fontSize:sm?10:11,fontWeight:700,letterSpacing:0.4,whiteSpace:"nowrap"}}>
    {children}
  </span>
);

const StockBar = ({v,max,color}) => {
  const pct = Math.min(max>0?(v/max)*100:0,100);
  const c = color||(v===0?C.red:v<max?C.orange:C.green);
  return (
    <div style={{background:C.border,borderRadius:99,height:5,overflow:"hidden",marginTop:5}}>
      <div style={{width:`${pct}%`,height:"100%",background:c,borderRadius:99,transition:"width .4s ease"}}/>
    </div>
  );
};

const Chip = ({active,onClick,children}) => (
  <button onClick={onClick} style={{background:active?C.green:C.s3,color:active?C.bg:C.sub,
    border:`1px solid ${active?C.green:C.border}`,borderRadius:20,padding:"6px 14px",
    fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",transition:"all .18s",flexShrink:0}}>
    {children}
  </button>
);

function Btn({children,variant="primary",onClick,style={},disabled,full=true}) {
  const map = {
    primary: {bg:C.green,  color:C.bg},
    danger:  {bg:C.red,    color:"#fff"},
    ghost:   {bg:C.s3,     color:C.sub,  border:`1px solid ${C.border}`},
    blue:    {bg:C.blue,   color:"#fff"},
    orange:  {bg:C.orange, color:C.bg},
  };
  const v = map[variant]||map.primary;
  return (
    <button disabled={disabled} onClick={onClick} style={{
      background:v.bg,color:v.color,border:v.border||"none",
      borderRadius:12,padding:"12px 18px",fontWeight:800,fontSize:14,
      cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.45:1,
      width:full?"100%":"auto",transition:"opacity .15s",...style}}>
      {children}
    </button>
  );
}

const Label = ({children}) => (
  <div style={{color:C.sub,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6}}>{children}</div>
);

function Input({label,...p}) {
  return (
    <div style={{marginBottom:14}}>
      {label&&<Label>{label}</Label>}
      <input {...p} style={{width:"100%",background:C.s1,border:`1px solid ${C.border}`,
        borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,
        outline:"none",boxSizing:"border-box",...(p.style||{})}}/>
    </div>
  );
}

function Sel({label,children,...p}) {
  return (
    <div style={{marginBottom:14}}>
      {label&&<Label>{label}</Label>}
      <select {...p} style={{width:"100%",background:C.s1,border:`1px solid ${C.border}`,
        borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}>
        {children}
      </select>
    </div>
  );
}

function Sheet({title,onClose,children}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#000D",zIndex:900,display:"flex",
      alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.s2,border:`1px solid ${C.border}`,
        borderRadius:"20px 20px 0 0",padding:"0 18px 40px",width:"100%",maxWidth:480,
        maxHeight:"93vh",overflowY:"auto",boxShadow:"0 -24px 80px #0009"}}>
        <div style={{width:38,height:4,background:C.border,borderRadius:99,margin:"14px auto 18px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{color:C.text,fontWeight:800,fontSize:17}}>{title}</span>
          <button onClick={onClose} style={{background:C.s3,border:"none",color:C.sub,
            borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,lineHeight:"32px"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({msg,color}) {
  return (
    <div style={{position:"fixed",top:18,left:"50%",transform:"translateX(-50%)",
      background:C.s2,border:`1px solid ${color}60`,color,
      borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:700,
      zIndex:9999,whiteSpace:"nowrap",boxShadow:`0 4px 24px ${color}30`,
      animation:"fadeIn .2s ease"}}>
      {msg}
    </div>
  );
}

// ── Offline Banner ─────────────────────────────────────
function OfflineBanner({offline,pending}) {
  if (!offline && pending===0) return null;
  return (
    <div style={{background:offline?C.orangeDim:C.blueDim,
      border:`1px solid ${offline?C.orange:C.blue}40`,
      borderRadius:12,padding:"10px 14px",marginBottom:12,
      display:"flex",gap:10,alignItems:"flex-start"}}>
      <span style={{fontSize:20,lineHeight:1}}>{offline?"⚡":"🔄"}</span>
      <div>
        <div style={{color:offline?C.orange:C.blue,fontWeight:800,fontSize:13}}>
          {offline?"Mode hors-ligne actif":"Synchronisation en cours..."}
        </div>
        {offline&&(
          <div style={{color:C.sub,fontSize:11,marginTop:2}}>
            {pending>0?`${pending} mouvement(s) en attente de sync · `:""}
            Données sauvegardées localement ✓
          </div>
        )}
      </div>
    </div>
  );
}

// ── LOGIN SCREEN ───────────────────────────────────────
function LoginScreen({users, onLogin}) {
  const [sel,  setSel]  = useState(null);
  const [pin,  setPin]  = useState("");
  const [err,  setErr]  = useState("");
  const [shake,setShake]= useState(false);

  const tryLogin = () => {
    if (!sel) return;
    if (sel.pin === pin) { onLogin(sel); }
    else {
      setErr("Code PIN incorrect");
      setShake(true);
      setPin("");
      setTimeout(()=>setShake(false),500);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",
      flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{`
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        * { box-sizing:border-box; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:99px}
      `}</style>

      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{fontSize:48,marginBottom:8}}>📦</div>
        <div style={{fontSize:28,fontWeight:900,letterSpacing:-1,color:C.text,fontFamily:"'Syne',sans-serif"}}>
          STOCK<span style={{color:C.green}}>PRO</span>
        </div>
        <div style={{fontSize:12,color:C.sub,letterSpacing:2,fontWeight:600}}>GESTION DE STOCK</div>
      </div>

      {/* User list */}
      <div style={{width:"100%",maxWidth:380,marginBottom:20}}>
        <Label>SÉLECTIONNER UN COMPTE</Label>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {users.map(u=>(
            <button key={u.id} onClick={()=>{setSel(u);setPin("");setErr("");}}
              style={{background:sel?.id===u.id?u.color+"15":C.s2,
                border:`2px solid ${sel?.id===u.id?u.color:C.border}`,
                borderRadius:14,padding:"13px 16px",cursor:"pointer",
                display:"flex",alignItems:"center",gap:12,transition:"all .15s",textAlign:"left"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:u.color+"25",
                border:`2px solid ${u.color}`,display:"flex",alignItems:"center",
                justifyContent:"center",fontWeight:900,fontSize:16,color:u.color,flexShrink:0}}>
                {u.name[0]}
              </div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontWeight:800,fontSize:15}}>{u.name}</div>
                <div style={{color:C.sub,fontSize:12}}>{roleLabel(u.role)} · {u.location}</div>
              </div>
              {sel?.id===u.id&&<span style={{color:u.color,fontSize:18}}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* PIN */}
      {sel&&(
        <div style={{width:"100%",maxWidth:380,animation:"fadeIn .2s ease"}}>
          <Label>CODE PIN</Label>
          <div style={{display:"flex",gap:10,marginBottom:8,
            animation:shake?"shake .4s ease":"none"}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{flex:1,height:52,background:C.s2,border:`1px solid ${pin.length>i?sel.color:C.border}`,
                borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:22,color:sel.color,transition:"border-color .15s"}}>
                {pin.length>i?"●":""}
              </div>
            ))}
          </div>
          {/* Numpad */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((n,i)=>(
              <button key={i} onClick={()=>{
                if(n==="") return;
                if(n==="⌫"){ setPin(p=>p.slice(0,-1)); setErr(""); }
                else if(pin.length<4){ const np=pin+n; setPin(np); if(np.length===4) setTimeout(()=>tryLogin(),100); }
              }} style={{padding:"16px 0",background:n===""?C.bg:C.s2,
                border:`1px solid ${n===""?C.bg:C.border}`,borderRadius:12,
                color:C.text,fontSize:18,fontWeight:700,cursor:n===""?"default":"pointer",
                transition:"background .1s"}} disabled={n===""}>
                {n}
              </button>
            ))}
          </div>
          {err&&<div style={{color:C.red,fontSize:12,textAlign:"center",marginBottom:8}}>⚠ {err}</div>}
          <Btn onClick={tryLogin} disabled={pin.length<4}>🔑 Se connecter</Btn>
        </div>
      )}
    </div>
  );
}

// ── SCANNER MODAL ──────────────────────────────────────
function ScannerSheet({products, user, onConfirm, onClose}) {
  const canEntry = user.role !== "vendeur";
  const [phase,   setPhase]   = useState("scan");
  const [scanning,setScanning]= useState(false);
  const [lineY,   setLineY]   = useState(0);
  const [found,   setFound]   = useState(null);
  const [op,      setOp]      = useState("sortie");
  const [qty,     setQty]     = useState(1);
  const [note,    setNote]    = useState("");
  const [manual,  setManual]  = useState("");
  const [err,     setErr]     = useState("");

  useEffect(()=>{
    if(!scanning) return;
    const t = setInterval(()=>setLineY(l=>(l+2.5)%100),25);
    const sim = setTimeout(()=>{
      const p = products[Math.floor(Math.random()*products.length)];
      setFound(p); setPhase("confirm"); setScanning(false);
      clearInterval(t);
    },2400);
    return ()=>{ clearInterval(t); clearTimeout(sim); };
  },[scanning]);

  const tryManual = () => {
    const code = manual.trim().toUpperCase();
    const p = products.find(x=>x.qr===manual.trim()||x.id===code);
    if(p){ setFound(p); setPhase("confirm"); setErr(""); }
    else setErr("Code introuvable. Exemple: QR-A001 ou A001");
  };

  const overStock = op==="sortie" && qty > found?.stock;

  return (
    <Sheet title="📷 Scanner QR Code" onClose={onClose}>
      {phase==="scan" && <>
        {/* Viewfinder */}
        <div style={{background:C.s1,borderRadius:18,height:220,position:"relative",
          overflow:"hidden",marginBottom:16,
          border:`2px solid ${scanning?C.green:C.border}`,
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          {/* Corners */}
          {[[0,0,"top","left"],[0,1,"top","right"],[1,0,"bottom","left"],[1,1,"bottom","right"]].map(([r,c,v,h],i)=>(
            <div key={i} style={{position:"absolute",[v]:14,[h]:14,width:26,height:26,
              [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]:`3px solid ${C.green}`,
              [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]:`3px solid ${C.green}`,
              borderRadius:v==="top"&&h==="left"?"6px 0 0 0":v==="top"&&h==="right"?"0 6px 0 0":v==="bottom"&&h==="left"?"0 0 0 6px":"0 0 6px 0"}}/>
          ))}
          {scanning ? <>
            <div style={{position:"absolute",left:"8%",right:"8%",top:`${lineY}%`,
              height:2,background:C.green,boxShadow:`0 0 16px ${C.green}`,transition:"top .025s linear"}}/>
            <span style={{color:C.sub,fontSize:13,zIndex:1}}>Analyse en cours...</span>
          </> : <>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:50,marginBottom:8}}>📦</div>
              <div style={{color:C.sub,fontSize:13}}>Pointez la caméra vers le QR Code</div>
            </div>
          </>}
        </div>

        {scanning
          ? <Btn variant="ghost" onClick={()=>setScanning(false)}>Annuler</Btn>
          : <Btn onClick={()=>setScanning(true)}>📷 Activer la caméra</Btn>
        }

        <div style={{textAlign:"center",color:C.muted,fontSize:12,margin:"14px 0 10px",letterSpacing:1}}>— OU CODE MANUEL —</div>
        <div style={{display:"flex",gap:8}}>
          <input value={manual} onChange={e=>{setManual(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&tryManual()}
            placeholder="ex: QR-A001 ou A001"
            style={{flex:1,background:C.s1,border:`1px solid ${err?C.red:C.border}`,
              borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,outline:"none"}}/>
          <button onClick={tryManual} style={{background:C.greenDim,border:`1px solid ${C.greenMid}`,
            color:C.green,borderRadius:10,padding:"0 18px",cursor:"pointer",fontWeight:900,fontSize:16,flexShrink:0}}>→</button>
        </div>
        {err&&<div style={{color:C.red,fontSize:12,marginTop:6}}>⚠ {err}</div>}
      </>}

      {phase==="confirm" && found && <>
        {/* Product card */}
        <div style={{background:C.s1,borderRadius:14,padding:16,marginBottom:18,
          border:`1px solid ${C.greenMid}`}}>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <QRViz code={found.qr} size={64}/>
            <div style={{flex:1,minWidth:0}}>
              <Tag sm>✅ PRODUIT IDENTIFIÉ</Tag>
              <div style={{color:C.text,fontWeight:900,fontSize:16,marginTop:5,lineHeight:1.2}}>{found.name}</div>
              <div style={{color:C.sub,fontSize:12,marginTop:4}}>
                {found.id} · Stock : <b style={{color:found.stock<found.min?C.orange:C.green}}>{found.stock} {found.unit}</b>
              </div>
              <StockBar v={found.stock} max={found.min*2}/>
            </div>
          </div>
        </div>

        {/* Operation selector */}
        <div style={{marginBottom:14}}>
          <Label>TYPE D'OPÉRATION</Label>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setOp("sortie")} style={{flex:1,padding:"12px",borderRadius:12,
              fontWeight:800,fontSize:14,cursor:"pointer",transition:"all .15s",
              border:`2px solid ${op==="sortie"?C.red:C.border}`,
              background:op==="sortie"?C.redDim:C.s1,
              color:op==="sortie"?C.red:C.sub}}>
              📤 Sortie
            </button>
            {canEntry&&(
              <button onClick={()=>setOp("entrée")} style={{flex:1,padding:"12px",borderRadius:12,
                fontWeight:800,fontSize:14,cursor:"pointer",transition:"all .15s",
                border:`2px solid ${op==="entrée"?C.green:C.border}`,
                background:op==="entrée"?C.greenDim:C.s1,
                color:op==="entrée"?C.green:C.sub}}>
                📥 Entrée
              </button>
            )}
          </div>
          {!canEntry&&(
            <div style={{color:C.sub,fontSize:11,marginTop:6,textAlign:"center"}}>
              🔒 Les vendeurs peuvent uniquement faire des sorties
            </div>
          )}
        </div>

        {/* Qty */}
        <div style={{marginBottom:14}}>
          <Label>QUANTITÉ ({found.unit})</Label>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setQty(q=>Math.max(1,q-1))}
              style={{background:C.s3,border:`1px solid ${C.border}`,color:C.text,
                borderRadius:10,width:48,height:48,cursor:"pointer",fontSize:22,flexShrink:0}}>−</button>
            <input type="number" min={1} value={qty} onChange={e=>setQty(Math.max(1,+e.target.value))}
              style={{flex:1,background:C.s1,border:`1px solid ${overStock?C.orange:C.border}`,
                borderRadius:10,padding:"11px",color:C.text,fontSize:22,fontWeight:900,
                outline:"none",textAlign:"center"}}/>
            <button onClick={()=>setQty(q=>q+1)}
              style={{background:C.s3,border:`1px solid ${C.border}`,color:C.text,
                borderRadius:10,width:48,height:48,cursor:"pointer",fontSize:22,flexShrink:0}}>+</button>
          </div>
        </div>

        <Input label="NOTE / DESTINATION"
          placeholder={user.role==="vendeur"?"ex: Vente comptoir":"ex: Chantier Akwa Nord"}
          value={note} onChange={e=>setNote(e.target.value)}/>

        {overStock&&(
          <div style={{background:C.orangeDim,border:`1px solid ${C.orange}40`,
            borderRadius:10,padding:"9px 14px",fontSize:12,color:C.orange,marginBottom:12}}>
            ⚠ Quantité ({qty}) supérieure au stock disponible ({found.stock} {found.unit})
          </div>
        )}

        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" onClick={()=>{setPhase("scan");setFound(null);setQty(1);setNote("");}} style={{flex:1}}>← Retour</Btn>
          <Btn variant={op==="sortie"?"danger":"primary"}
            onClick={()=>{ onConfirm({product:found,qty,op,note}); onClose(); }}
            disabled={overStock} style={{flex:2}}>
            {op==="sortie"?`📤 Sortir ${qty} ${found.unit}`:`📥 Rentrer ${qty} ${found.unit}`}
          </Btn>
        </div>
      </>}
    </Sheet>
  );
}

// ── ADD / EDIT PRODUCT ─────────────────────────────────
function ProductSheet({product, onSave, onDelete, onClose}) {
  const isEdit = !!product;
  const newId  = "Z"+uid().slice(0,3).toUpperCase();
  const [f, setF] = useState(product||{id:newId,name:"",cat:"Aspirateurs",unit:"pcs",stock:0,min:5,qr:""});
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  useEffect(()=>{ if(!isEdit) set("qr","QR-"+f.id); },[f.id]);

  return (
    <Sheet title={isEdit?"✏️ Modifier le produit":"➕ Nouveau Produit"} onClose={onClose}>
      <Input label="NOM DU PRODUIT" placeholder="ex: Aspirateur Nilfisk VP300"
        value={f.name} onChange={e=>set("name",e.target.value)}/>
      <Sel label="CATÉGORIE" value={f.cat} onChange={e=>set("cat",e.target.value)}>
        {["Aspirateurs","Balais","Chimique","EPI","Accessoires","Autre"].map(c=><option key={c}>{c}</option>)}
      </Sel>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Input label="STOCK" type="number" min={0} value={f.stock} onChange={e=>set("stock",+e.target.value)}/></div>
        <div style={{flex:1}}><Input label="STOCK MIN (alerte)" type="number" min={1} value={f.min} onChange={e=>set("min",+e.target.value)}/></div>
      </div>
      <Sel label="UNITÉ" value={f.unit} onChange={e=>set("unit",e.target.value)}>
        {["pcs","bidons","boîtes","sets","kg","L","lots","packs"].map(u=><option key={u}>{u}</option>)}
      </Sel>
      <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,
        padding:14,marginBottom:16,display:"flex",gap:14,alignItems:"center"}}>
        <QRViz code={f.qr||f.id} size={56}/>
        <div>
          <div style={{color:C.sub,fontSize:11,fontWeight:700}}>QR CODE</div>
          <div style={{color:C.text,fontWeight:700,fontSize:14}}>{f.qr||"QR-"+f.id}</div>
          <div style={{color:C.muted,fontSize:11,marginTop:2}}>Imprimez ce code à coller sur le produit</div>
        </div>
      </div>
      <Btn onClick={()=>{ if(f.name.trim()) onSave(f); }} style={{marginBottom:8}}>
        {isEdit?"✅ Enregistrer les modifications":"✅ Créer le produit"}
      </Btn>
      {isEdit&&<Btn variant="danger" onClick={()=>onDelete(f.id)}>🗑 Supprimer ce produit</Btn>}
    </Sheet>
  );
}

// ── ADD USER ───────────────────────────────────────────
function UserSheet({user:editUser, onSave, onDelete, onClose}) {
  const isEdit = !!editUser;
  const [f, setF] = useState(editUser||{id:"u"+uid(),name:"",role:"vendeur",pin:"",location:"Douala 🇨🇲",color:C.orange});
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <Sheet title={isEdit?"✏️ Modifier l'utilisateur":"👤 Nouvel Utilisateur"} onClose={onClose}>
      <Input label="NOM COMPLET" placeholder="ex: Paul Biya" value={f.name} onChange={e=>set("name",e.target.value)}/>
      <Sel label="RÔLE" value={f.role} onChange={e=>set("role",e.target.value)}>
        <option value="stock">Gestionnaire de Stock 📦</option>
        <option value="vendeur">Vendeur 🛒</option>
      </Sel>
      <Sel label="LOCALISATION" value={f.location} onChange={e=>set("location",e.target.value)}>
        <option value="Douala 🇨🇲">Douala 🇨🇲</option>
        <option value="Montréal 🇨🇦">Montréal 🇨🇦</option>
      </Sel>
      <Input label="CODE PIN (4 chiffres)" type="number" placeholder="ex: 5678"
        value={f.pin} onChange={e=>set("pin",String(e.target.value).slice(0,4))}/>
      <div style={{marginBottom:14}}>
        <Label>COULEUR</Label>
        <div style={{display:"flex",gap:8}}>
          {[C.green,C.blue,C.orange,C.purple,C.yellow,C.red].map(col=>(
            <div key={col} onClick={()=>set("color",col)}
              style={{width:36,height:36,borderRadius:"50%",background:col,cursor:"pointer",
                border:`3px solid ${f.color===col?"#fff":col}`,flexShrink:0,transition:"border .15s"}}/>
          ))}
        </div>
      </div>
      <Btn onClick={()=>{ if(f.name.trim()&&f.pin.length===4) onSave(f); }} style={{marginBottom:8}}>
        {isEdit?"✅ Enregistrer":"✅ Créer l'utilisateur"}
      </Btn>
      {isEdit&&<Btn variant="danger" onClick={()=>onDelete(f.id)}>🗑 Supprimer</Btn>}
    </Sheet>
  );
}

// ══════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════
export default function StockPro() {
  // Persistent state
  const [users,    setUsers]    = useState(()=>LS.get("users",    SEED_USERS));
  const [products, setProducts] = useState(()=>LS.get("products", SEED_PRODUCTS));
  const [history,  setHistory]  = useState(()=>LS.get("history",  SEED_HISTORY));
  const [syncQ,    setSyncQ]    = useState(()=>LS.get("syncQ",    []));

  // Session state
  const [me,       setMe]       = useState(null);
  const [offline,  setOffline]  = useState(!navigator.onLine);
  const [tab,      setTab]      = useState("dashboard");
  const [modal,    setModal]    = useState(null); // "scan"|"addProd"|"editProd"|"addUser"|"editUser"|null
  const [ctx,      setCtx]      = useState(null); // context for modal
  const [search,   setSearch]   = useState("");
  const [catF,     setCatF]     = useState("Tous");
  const [histF,    setHistF]    = useState("tous");
  const [toast,    setToast]    = useState(null);

  // Persist
  useEffect(()=>LS.set("users",    users),    [users]);
  useEffect(()=>LS.set("products", products), [products]);
  useEffect(()=>LS.set("history",  history),  [history]);
  useEffect(()=>LS.set("syncQ",    syncQ),    [syncQ]);

  // Online/offline
  useEffect(()=>{
    const on = ()=>{ setOffline(false); autoSync(); };
    const off= ()=>setOffline(true);
    window.addEventListener("online",on);
    window.addEventListener("offline",off);
    return ()=>{ window.removeEventListener("online",on); window.removeEventListener("offline",off); };
  },[]);

  const showToast = (msg,color=C.green) => {
    setToast({msg,color});
    setTimeout(()=>setToast(null),3000);
  };

  const autoSync = useCallback(()=>{
    setSyncQ(q=>{
      if(q.length===0) return q;
      setHistory(h=>h.map(x=>({...x,synced:true})));
      showToast(`🔄 ${q.length} mouvement(s) synchronisé(s)`, C.blue);
      return [];
    });
  },[]);

  // Simulate sync every 45s when online
  useEffect(()=>{
    if(!offline){ const t=setInterval(autoSync,45000); return ()=>clearInterval(t); }
  },[offline,autoSync]);

  // ── Actions ──────────────────────────────────────────
  const handleScan = ({product,qty,op,note}) => {
    setProducts(prev=>prev.map(p=>p.id===product.id
      ?{...p, stock: op==="sortie"?Math.max(0,p.stock-qty):p.stock+qty}
      :p
    ));
    const entry = {
      id:uid(), type:op, pid:product.id, qty,
      uid:me.id, note, ts:Date.now(), synced:!offline
    };
    setHistory(prev=>[entry,...prev]);
    if(offline) setSyncQ(q=>[...q,entry]);
    showToast(`${op==="sortie"?"📤 Sortie":"📥 Entrée"} : ${qty}× ${product.name}`,
      op==="sortie"?C.red:C.green);
  };

  const saveProd = (f) => {
    setProducts(prev=>{
      const exists = prev.find(p=>p.id===f.id);
      return exists?prev.map(p=>p.id===f.id?f:p):[...prev,f];
    });
    showToast(ctx?"✅ Produit modifié":"✅ Produit ajouté");
    setModal(null); setCtx(null);
  };

  const deleteProd = (id) => {
    setProducts(prev=>prev.filter(p=>p.id!==id));
    showToast("🗑 Produit supprimé", C.orange);
    setModal(null); setCtx(null);
  };

  const saveUser = (f) => {
    setUsers(prev=>{
      const exists = prev.find(u=>u.id===f.id);
      return exists?prev.map(u=>u.id===f.id?f:u):[...prev,f];
    });
    showToast(ctx?"✅ Utilisateur modifié":"✅ Utilisateur ajouté");
    setModal(null); setCtx(null);
  };

  const deleteUser = (id) => {
    setUsers(prev=>prev.filter(u=>u.id!==id));
    showToast("🗑 Utilisateur supprimé", C.orange);
    setModal(null); setCtx(null);
  };

  // ── Computed ──────────────────────────────────────────
  const alerts      = products.filter(p=>p.stock<p.min);
  const outOfStock  = products.filter(p=>p.stock===0);
  const cats        = ["Tous",...Array.from(new Set(products.map(p=>p.cat)))];
  const isOwner     = me?.role==="owner";
  const canEdit     = isOwner;
  const canEntry    = me?.role!=="vendeur";

  const filteredProds = products.filter(p=>{
    const q=search.toLowerCase();
    return (p.name.toLowerCase().includes(q)||p.id.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q))
      &&(catF==="Tous"||p.cat===catF);
  });

  const filteredHist = history.filter(h=>{
    if(histF==="sorties") return h.type==="sortie";
    if(histF==="entrées") return h.type==="entrée";
    if(histF==="moi") return h.uid===me?.id;
    return true;
  });

  // Times
  const mtlTime = new Date().toLocaleString("fr-CA",{timeZone:"America/Toronto",hour:"2-digit",minute:"2-digit"});
  const dlaTime = new Date().toLocaleString("fr-CM",{timeZone:"Africa/Douala",hour:"2-digit",minute:"2-digit"});

  // Nav items by role
  const navItems = [
    { id:"dashboard", icon:"📊", label:"Tableau" },
    { id:"stock",     icon:"📦", label:"Stock" },
    { id:"history",   icon:"📋", label:"Historique", hide: me?.role==="vendeur" },
    { id:"remote",    icon:"🌍", label:"Montréal",   hide: !isOwner },
    { id:"team",      icon:"👥", label:"Équipe",      hide: !isOwner },
  ].filter(n=>!n.hide);

  // ── Not logged in ──────────────────────────────────────
  if (!me) return <LoginScreen users={users} onLogin={u=>{setMe(u); setTab("dashboard");}}/>;

  // ── App ────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,
      fontFamily:"'Syne','Trebuchet MS',sans-serif",maxWidth:480,margin:"0 auto",position:"relative"}}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        *{box-sizing:border-box}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:99px}
      `}</style>

      {toast && <Toast msg={toast.msg} color={toast.color}/>}

      {/* ── HEADER ── */}
      <div style={{padding:"12px 16px 10px",background:C.s1,borderBottom:`1px solid ${C.border}`,
        position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:C.muted,letterSpacing:2,fontWeight:700}}>STOCKPRO</div>
            <div style={{fontSize:20,fontWeight:900,letterSpacing:-0.5}}>
              {tab==="dashboard"&&"Tableau de bord"}
              {tab==="stock"&&"Inventaire"}
              {tab==="history"&&"Historique"}
              {tab==="remote"&&"Vue Montréal 🌍"}
              {tab==="team"&&"Équipe"}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {/* Connection dot */}
            <div style={{width:8,height:8,borderRadius:"50%",
              background:offline?C.orange:C.green,
              boxShadow:`0 0 6px ${offline?C.orange:C.green}`,
              animation:offline?"pulse 1.5s infinite":"none"}}
              title={offline?"Hors-ligne":"En ligne"}/>
            {alerts.length>0&&(
              <Tag color={C.red}>⚠ {alerts.length}</Tag>
            )}
            {/* Avatar */}
            <div onClick={()=>{ setMe(null); setTab("dashboard"); }}
              style={{width:36,height:36,borderRadius:"50%",background:me.color+"20",
                border:`2px solid ${me.color}`,display:"flex",alignItems:"center",
                justifyContent:"center",fontWeight:900,fontSize:14,color:me.color,cursor:"pointer"}}
              title="Se déconnecter">
              {me.name[0]}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{padding:"14px 14px 96px",animation:"fadeIn .25s ease"}}>
        <OfflineBanner offline={offline} pending={syncQ.length}/>

        {/* ════ DASHBOARD ════ */}
        {tab==="dashboard" && <>
          <div style={{marginBottom:18}}>
            <div style={{color:C.sub,fontSize:12,fontWeight:700}}>
              Douala 🇨🇲 {dlaTime} · {roleLabel(me.role)}
            </div>
            <div style={{fontSize:22,fontWeight:900,marginTop:2}}>Bonjour, {me.name} 👋</div>
          </div>

          {/* KPI Grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[
              {l:"Articles en stock",v:products.reduce((a,p)=>a+p.stock,0),i:"📦",c:C.green},
              {l:"Alertes stock bas", v:alerts.length, i:"⚠️", c:alerts.length>0?C.red:C.green},
              {l:"Références totales",v:products.length,i:"🏷️",c:C.blue},
              {l:"Ruptures de stock", v:outOfStock.length,i:"🚫",c:outOfStock.length>0?C.red:C.green},
            ].map((k,i)=>(
              <div key={i} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,
                padding:"14px 16px",borderLeft:`3px solid ${k.c}`}}>
                <div style={{fontSize:24,marginBottom:4}}>{k.i}</div>
                <div style={{fontSize:28,fontWeight:900,color:k.c,lineHeight:1}}>{k.v}</div>
                <div style={{fontSize:11,color:C.sub,fontWeight:600,marginTop:3}}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Scan CTA */}
          <button onClick={()=>setModal("scan")} style={{width:"100%",padding:"20px",
            borderRadius:18,marginBottom:14,
            background:`linear-gradient(135deg, #0A2618, #071C12)`,
            border:`2px solid ${C.greenMid}`,color:C.green,fontWeight:900,fontSize:18,
            cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,
            boxShadow:`0 0 40px ${C.greenDim}, inset 0 1px 0 ${C.greenDim}`}}>
            <span style={{fontSize:32}}>📷</span>
            Scanner un QR Code
          </button>

          {/* Alerts */}
          {alerts.length>0&&(
            <div style={{background:C.redDim,border:`1px solid ${C.red}30`,
              borderRadius:16,padding:16,marginBottom:14}}>
              <div style={{color:C.red,fontWeight:800,fontSize:14,marginBottom:12}}>
                ⚠ Stocks critiques ({alerts.length})
              </div>
              {alerts.map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:10,paddingBottom:10,
                  borderBottom:`1px solid ${C.border}`}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{p.name}</div>
                    <div style={{fontSize:11,color:C.sub}}>{p.cat}</div>
                  </div>
                  <Tag color={p.stock===0?C.red:C.orange}>
                    {p.stock===0?"RUPTURE":`${p.stock}/${p.min} ${p.unit}`}
                  </Tag>
                </div>
              ))}
            </div>
          )}

          {/* Recent history */}
          <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,padding:16}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>🕐 Derniers mouvements</div>
            {history.slice(0,6).map(h=>{
              const p  = products.find(x=>x.id===h.pid);
              const u2 = users.find(x=>x.id===h.uid);
              return (
                <div key={h.id} style={{display:"flex",gap:10,alignItems:"center",
                  marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:36,height:36,borderRadius:10,flexShrink:0,
                    background:h.type==="sortie"?C.redDim:C.greenDim,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                    {h.type==="sortie"?"📤":"📥"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {p?.name||h.pid}
                    </div>
                    <div style={{fontSize:11,color:C.sub}}>{u2?.name||"?"} · {fmtDate(h.ts)}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                    <Tag color={h.type==="sortie"?C.red:C.green}>{h.type==="sortie"?"−":"+"}{h.qty}</Tag>
                    {!h.synced&&<Tag color={C.orange} sm>⏳</Tag>}
                  </div>
                </div>
              );
            })}
          </div>
        </>}

        {/* ════ STOCK ════ */}
        {tab==="stock" && <>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{flex:1,background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,
                padding:"11px 14px",color:C.text,fontSize:14,outline:"none"}}/>
            {canEdit&&(
              <button onClick={()=>setModal("addProd")}
                style={{background:C.greenDim,border:`1px solid ${C.greenMid}`,color:C.green,
                  borderRadius:12,padding:"0 16px",cursor:"pointer",fontWeight:900,fontSize:24,flexShrink:0}}>
                +
              </button>
            )}
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14,paddingBottom:4}}>
            {cats.map(c=><Chip key={c} active={catF===c} onClick={()=>setCatF(c)}>{c}</Chip>)}
          </div>
          <div style={{color:C.sub,fontSize:12,marginBottom:10,fontWeight:600}}>
            {filteredProds.length} produit(s)
          </div>
          {filteredProds.map(p=>{
            const statusColor = p.stock===0?C.red:p.stock<p.min?C.orange:C.green;
            return (
              <div key={p.id} onClick={()=>{ if(canEdit){setCtx(p);setModal("editProd");} }}
                style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,
                  padding:16,marginBottom:10,cursor:canEdit?"pointer":"default",
                  borderLeft:`3px solid ${statusColor}`,transition:"border-color .2s"}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{background:statusColor+"18",border:`1px solid ${statusColor}35`,
                    borderRadius:12,padding:10,flexShrink:0}}>
                    <QRViz code={p.qr} size={44}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:3}}>
                      <div style={{fontWeight:800,fontSize:14,lineHeight:1.2}}>{p.name}</div>
                      <Tag color={statusColor} sm>
                        {p.stock===0?"RUPTURE":p.stock<p.min?"BAS":"OK"}
                      </Tag>
                    </div>
                    <div style={{color:C.sub,fontSize:11,marginBottom:8}}>
                      {p.id} · {p.cat}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{flex:1,marginRight:12}}>
                        <StockBar v={p.stock} max={Math.max(p.min*2,p.stock+1)} color={statusColor}/>
                      </div>
                      <div style={{fontWeight:900,fontSize:15,color:statusColor,whiteSpace:"nowrap"}}>
                        {p.stock} <span style={{color:C.sub,fontWeight:400,fontSize:11}}>{p.unit}</span>
                      </div>
                    </div>
                    <div style={{color:C.muted,fontSize:10,marginTop:4}}>Min: {p.min} {p.unit}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </>}

        {/* ════ HISTORY ════ */}
        {tab==="history" && <>
          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14,paddingBottom:4}}>
            {[{k:"tous",l:"Tous"},
              {k:"sorties",l:"📤 Sorties"},
              {k:"entrées",l:"📥 Entrées"},
              {k:"moi",    l:"👤 Mes actions"}
            ].map(f=><Chip key={f.k} active={histF===f.k} onClick={()=>setHistF(f.k)}>{f.l}</Chip>)}
          </div>
          <div style={{color:C.sub,fontSize:12,marginBottom:10,fontWeight:600}}>
            {filteredHist.length} mouvement(s)
          </div>
          {filteredHist.map(h=>{
            const p  = products.find(x=>x.id===h.pid);
            const u2 = users.find(x=>x.id===h.uid);
            return (
              <div key={h.id} style={{background:C.s2,border:`1px solid ${C.border}`,
                borderRadius:14,padding:14,marginBottom:10,
                borderLeft:`3px solid ${h.type==="sortie"?C.red:C.green}`}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{fontSize:26}}>{h.type==="sortie"?"📤":"📥"}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:14}}>{p?.name||h.pid}</div>
                    <div style={{color:C.sub,fontSize:11,marginTop:2}}>
                      {u2?.name||"?"} · {fmtDate(h.ts)}
                    </div>
                    {h.note&&<div style={{color:C.muted,fontSize:11,marginTop:3}}>📝 {h.note}</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <Tag color={h.type==="sortie"?C.red:C.green}>
                      {h.type==="sortie"?"−":"+"}  {h.qty}
                    </Tag>
                    <Tag color={h.synced?C.green:C.orange} sm>
                      {h.synced?"✓ Sync":"⏳ Attente"}
                    </Tag>
                  </div>
                </div>
              </div>
            );
          })}
        </>}

        {/* ════ REMOTE — MONTRÉAL VIEW ════ */}
        {tab==="remote" && isOwner && <>
          {/* Clock banner */}
          <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,
            padding:16,marginBottom:14,display:"flex",justifyContent:"space-around"}}>
            {[
              {city:"Montréal 🇨🇦",time:mtlTime,tz:"EST"},
              {city:"Douala 🇨🇲",  time:dlaTime, tz:"WAT"},
            ].map(({city,time,tz})=>(
              <div key={city} style={{textAlign:"center"}}>
                <div style={{color:C.sub,fontSize:11,fontWeight:700}}>{city}</div>
                <div style={{fontSize:26,fontWeight:900,letterSpacing:-1,color:C.text}}>{time}</div>
                <div style={{color:C.muted,fontSize:10}}>{tz}</div>
              </div>
            ))}
          </div>

          {/* Status overview */}
          <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>📊 Statut global du stock</div>
            {[
              {l:"🟢 En stock normal",  v:products.filter(p=>p.stock>=p.min).length,   c:C.green},
              {l:"🟠 Stock bas",        v:products.filter(p=>p.stock>0&&p.stock<p.min).length, c:C.orange},
              {l:"🔴 Rupture totale",   v:outOfStock.length,                           c:C.red},
            ].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:13,color:C.sub}}>{r.l}</span>
                <span style={{fontWeight:900,fontSize:18,color:r.c}}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* By category */}
          <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>📦 Par catégorie</div>
            {cats.filter(c=>c!=="Tous").map(cat=>{
              const catProds = products.filter(p=>p.cat===cat);
              const total    = catProds.reduce((a,p)=>a+p.stock,0);
              const hasAlert = catProds.some(p=>p.stock<p.min);
              return (
                <div key={cat} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700}}>{cat}</span>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      {hasAlert&&<Tag color={C.orange} sm>⚠</Tag>}
                      <span style={{fontWeight:800,color:C.text}}>{total}</span>
                    </div>
                  </div>
                  <StockBar v={total} max={Math.max(...products.filter(p=>p.cat===cat).map(p=>p.min*3),1)}
                    color={hasAlert?C.orange:C.green}/>
                </div>
              );
            })}
          </div>

          {/* Pending sync */}
          {syncQ.length>0&&(
            <div style={{background:C.orangeDim,border:`1px solid ${C.orange}40`,
              borderRadius:16,padding:16,marginBottom:14}}>
              <div style={{color:C.orange,fontWeight:800,fontSize:13,marginBottom:4}}>
                ⏳ {syncQ.length} mouvement(s) en attente de synchronisation
              </div>
              <div style={{color:C.sub,fontSize:12}}>
                Ces actions ont été effectuées hors-ligne à Douala et seront synchronisées dès le retour de la connexion.
              </div>
              <Btn variant="orange" onClick={autoSync} style={{marginTop:10}}>
                🔄 Synchroniser maintenant
              </Btn>
            </div>
          )}

          {/* Team activity */}
          <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,padding:16}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>👥 Activité de l'équipe</div>
            {users.filter(u=>u.role!=="owner").map(u=>{
              const count = history.filter(h=>h.uid===u.id).length;
              const last  = history.find(h=>h.uid===u.id);
              return (
                <div key={u.id} style={{display:"flex",gap:10,alignItems:"center",
                  marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:38,height:38,borderRadius:"50%",
                    background:u.color+"20",border:`2px solid ${u.color}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:900,fontSize:15,color:u.color,flexShrink:0}}>
                    {u.name[0]}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{u.name}</div>
                    <div style={{color:C.sub,fontSize:11}}>{roleLabel(u.role)}</div>
                    {last&&<div style={{color:C.muted,fontSize:10,marginTop:2}}>Dernière action : {fmtDate(last.ts)}</div>}
                  </div>
                  <Tag color={u.color}>{count} acte(s)</Tag>
                </div>
              );
            })}
          </div>
        </>}

        {/* ════ TEAM ════ */}
        {tab==="team" && isOwner && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{color:C.sub,fontSize:12,fontWeight:600}}>{users.length} utilisateur(s)</div>
            <button onClick={()=>setModal("addUser")}
              style={{background:C.greenDim,border:`1px solid ${C.greenMid}`,color:C.green,
                borderRadius:12,padding:"8px 16px",cursor:"pointer",fontWeight:800,fontSize:13}}>
              + Ajouter
            </button>
          </div>
          {users.map(u=>(
            <div key={u.id} onClick={()=>{ if(u.role!=="owner"){setCtx(u);setModal("editUser");} }}
              style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,
                padding:16,marginBottom:10,cursor:u.role!=="owner"?"pointer":"default",
                display:"flex",gap:12,alignItems:"center"}}>
              <div style={{width:46,height:46,borderRadius:"50%",background:u.color+"20",
                border:`2px solid ${u.color}`,display:"flex",alignItems:"center",
                justifyContent:"center",fontWeight:900,fontSize:18,color:u.color,flexShrink:0}}>
                {u.name[0]}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15}}>{u.name}</div>
                <div style={{color:C.sub,fontSize:12,marginTop:2}}>{roleLabel(u.role)}</div>
                <div style={{color:C.muted,fontSize:11,marginTop:1}}>{u.location}</div>
              </div>
              {u.role==="owner"
                ? <Tag color={C.blue}>Propriétaire</Tag>
                : <span style={{color:C.muted,fontSize:16}}>›</span>
              }
            </div>
          ))}
        </>}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,background:C.s1,borderTop:`1px solid ${C.border}`,
        padding:"8px 8px 16px",display:"flex",justifyContent:"space-around",zIndex:100}}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{
            flex:1,background:"none",border:"none",cursor:"pointer",padding:"6px 4px",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:20}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:0.3,
              color:tab===n.id?C.green:C.muted,transition:"color .15s"}}>
              {n.label}
            </span>
            {tab===n.id&&(
              <div style={{width:20,height:2,background:C.green,borderRadius:99,marginTop:1}}/>
            )}
          </button>
        ))}
        {/* Scan FAB */}
        <button onClick={()=>setModal("scan")} style={{
          position:"absolute",top:-22,right:16,
          width:52,height:52,borderRadius:"50%",
          background:`linear-gradient(135deg,${C.green},#00B37A)`,
          border:"none",cursor:"pointer",fontSize:22,
          boxShadow:`0 4px 20px ${C.greenMid}`,
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          📷
        </button>
      </div>

      {/* ── MODALS ── */}
      {modal==="scan" && (
        <ScannerSheet products={products} user={me}
          onConfirm={handleScan} onClose={()=>setModal(null)}/>
      )}
      {modal==="addProd" && (
        <ProductSheet onSave={saveProd} onDelete={deleteProd} onClose={()=>{setModal(null);setCtx(null);}}/>
      )}
      {modal==="editProd" && ctx && (
        <ProductSheet product={ctx} onSave={saveProd} onDelete={deleteProd} onClose={()=>{setModal(null);setCtx(null);}}/>
      )}
      {modal==="addUser" && (
        <UserSheet onSave={saveUser} onDelete={deleteUser} onClose={()=>{setModal(null);setCtx(null);}}/>
      )}
      {modal==="editUser" && ctx && (
        <UserSheet user={ctx} onSave={saveUser} onDelete={deleteUser} onClose={()=>{setModal(null);setCtx(null);}}/>
      )}
    </div>
  );
}
