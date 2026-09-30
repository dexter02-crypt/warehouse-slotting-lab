export function parseCsv(text) {
  const lines = String(text).trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("csv");
  const head = lines[0].split(",").map(x => x.trim());
  const basic = ["sku","picks_per_day","aisle","shelf"];
  const extended = [...basic,"size","weight","zone","demand_cv","slot_capacity","max_weight"];
  const mode = head.join(",") === basic.join(",") ? "basic"
    : head.join(",") === extended.join(",") ? "extended" : null;
  if (!mode) throw new Error("header");

  const rows = lines.slice(1).filter(Boolean).map((line, i) => {
    const c = line.split(",").map(x => x.trim());
    if (c.length !== (mode === "basic" ? 4 : 10)) throw new Error(`row-${i+2}`);
    const picks = Number(c[1]), aisle = Number(c[2]), shelf = Number(c[3]);
    if (!c[0] || !Number.isFinite(picks) || picks < 0 ||
        !Number.isInteger(aisle) || aisle < 1 || !Number.isInteger(shelf) || shelf < 1)
      throw new Error(`row-${i+2}`);
    if (mode === "basic") {
      return {sku:c[0],picks,aisle,shelf,size:1,weight:1,zone:"ambient",demandCV:0.25,slotCapacity:999,maxWeight:999};
    }
    const size=Number(c[4]), weight=Number(c[5]), demandCV=Number(c[7]),
          slotCapacity=Number(c[8]), maxWeight=Number(c[9]), zone=c[6];
    if (![size,weight,demandCV,slotCapacity,maxWeight].every(Number.isFinite) ||
        size<=0 || weight<=0 || demandCV<0 || slotCapacity<=0 || maxWeight<=0 ||
        !zone || zone.length>32) throw new Error(`row-${i+2}`);
    return {sku:c[0],picks,aisle,shelf,size,weight,zone,demandCV,slotCapacity,maxWeight};
  });
  if (rows.length > 5000 || new Set(rows.map(r=>r.sku)).size !== rows.length) throw new Error("rows");
  return rows;
}

export function classifyABC(rows) {
  const sorted=rows.map(x=>({...x})).sort((a,b)=>b.picks-a.picks||a.sku.localeCompare(b.sku));
  const total=sorted.reduce((s,x)=>s+x.picks,0); let cum=0;
  return sorted.map(x=>{
    const before=cum/(total||1); cum+=x.picks;
    const abc=before<0.8?"A":before<0.95?"B":"C";
    return {...x,abc,cumulativeShare:total?cum/total:0};
  });
}

export function xyzClass(demandCV) {
  if (!Number.isFinite(demandCV) || demandCV < 0) throw new Error("demandCV");
  return demandCV <= 0.5 ? "X" : demandCV <= 1.0 ? "Y" : "Z";
}

export function aisleDistance(a, b={aisle:1,shelf:1}, cfg={}) {
  const aisleSpacing=Number(cfg.aisleSpacing ?? 4), shelfSpacing=Number(cfg.shelfSpacing ?? 1),
        crossAisleShelf=Number(cfg.crossAisleShelf ?? 1);
  if (![aisleSpacing,shelfSpacing].every(x=>Number.isFinite(x)&&x>0) ||
      !Number.isFinite(crossAisleShelf)) throw new Error("distance-config");
  if (a.aisle === b.aisle) return Math.abs(a.shelf-b.shelf)*shelfSpacing;
  return Math.abs(a.shelf-crossAisleShelf)*shelfSpacing
    + Math.abs(a.aisle-b.aisle)*aisleSpacing
    + Math.abs(b.shelf-crossAisleShelf)*shelfSpacing;
}

export function weightedTravel(rows, depot={aisle:1,shelf:1}, cfg={}) {
  return rows.reduce((s,x)=>s+x.picks*2*aisleDistance(x,depot,cfg),0);
}

export function compatible(sku, slot) {
  return sku.size <= slot.slotCapacity && sku.weight <= slot.maxWeight &&
    (slot.zone === "any" || sku.zone === slot.zone);
}

function slotRecords(rows) {
  return rows.map(x=>({
    aisle:x.aisle,shelf:x.shelf,zone:x.zone,
    slotCapacity:x.slotCapacity,maxWeight:x.maxWeight
  }));
}

export function optimize(rows, depot={aisle:1,shelf:1}, cfg={}) {
  const slots=slotRecords(rows).sort((a,b)=>
    aisleDistance(a,depot,cfg)-aisleDistance(b,depot,cfg) ||
    a.aisle-b.aisle || a.shelf-b.shelf);
  const skus=classifyABC(rows).map(x=>({...x,xyz:xyzClass(x.demandCV)}));
  const remaining=[...slots], out=[];
  for (const sku of skus) {
    const idx=remaining.findIndex(slot=>compatible(sku,slot));
    if (idx<0) throw new Error(`no-compatible-slot:${sku.sku}`);
    const slot=remaining.splice(idx,1)[0];
    out.push({...sku,
      originalAisle:sku.aisle, originalShelf:sku.shelf,
      aisle:slot.aisle, shelf:slot.shelf,
      assignedSlotCapacity:slot.slotCapacity, assignedMaxWeight:slot.maxWeight,
      assignedZone:slot.zone,
    });
  }
  return out;
}

function rng(seed) {
  let x=(Number(seed)>>>0)||1;
  return () => ((x=(Math.imul(x,1664525)+1013904223)>>>0)/2**32);
}

function chooseWeighted(rows, random) {
  const total=rows.reduce((s,x)=>s+x.picks,0);
  if (!total) return rows[Math.floor(random()*rows.length)];
  let r=random()*total;
  for (const x of rows) { r-=x.picks; if (r<=0) return x; }
  return rows.at(-1);
}

export function pickRouteDistance(items, depot={aisle:1,shelf:1}, cfg={}) {
  const remaining=items.map(x=>({...x})); let pos={...depot}, total=0;
  while (remaining.length) {
    let best=0, d=Infinity;
    for (let i=0;i<remaining.length;i++) {
      const nd=aisleDistance(pos,remaining[i],cfg);
      if (nd<d) {d=nd;best=i;}
    }
    const next=remaining.splice(best,1)[0]; total+=d; pos=next;
  }
  return total+aisleDistance(pos,depot,cfg);
}

export function simulatePickLists(currentRows, optimizedRows, options={}) {
  const orders=Math.max(1,Math.min(10000,Number(options.orders ?? 500)));
  const maxLines=Math.max(1,Math.min(20,Number(options.maxLines ?? 5)));
  const random=rng(options.seed ?? 42), depot=options.depot ?? {aisle:1,shelf:1}, cfg=options.cfg ?? {};
  const currBySku=new Map(currentRows.map(x=>[x.sku,x]));
  const optBySku=new Map(optimizedRows.map(x=>[x.sku,x]));
  let before=0,after=0;
  for(let o=0;o<orders;o++){
    const lineCount=1+Math.floor(random()*maxLines), skus=new Set();
    let guard=0;
    while(skus.size<Math.min(lineCount,currentRows.length)&&guard++<100){
      skus.add(chooseWeighted(currentRows,random).sku);
    }
    before+=pickRouteDistance([...skus].map(s=>currBySku.get(s)),depot,cfg);
    after+=pickRouteDistance([...skus].map(s=>optBySku.get(s)),depot,cfg);
  }
  return {orders,before,after,averageBefore:before/orders,averageAfter:after/orders,
    reduction:before?1-after/before:0};
}

export function summarize(rows,depot={aisle:1,shelf:1},cfg={},simulation={}) {
  const classified=classifyABC(rows).map(x=>({...x,xyz:xyzClass(x.demandCV)}));
  const optimized=optimize(rows,depot,cfg);
  const before=weightedTravel(rows,depot,cfg), after=weightedTravel(optimized,depot,cfg);
  const classes={A:0,B:0,C:0,X:0,Y:0,Z:0};
  for(const x of classified){classes[x.abc]++;classes[x.xyz]++;}
  const sim=simulatePickLists(rows,optimized,{...simulation,depot,cfg});
  return {skus:rows.length,classes,before,after,reduction:before?1-after/before:0,optimized,simulation:sim};
}

export function toCsv(rows) {
  const head="sku,picks_per_day,aisle,shelf,size,weight,zone,demand_cv,slot_capacity,max_weight";
  return [head,...rows.map(x=>[
    x.sku,x.picks,x.aisle,x.shelf,x.size,x.weight,x.assignedZone??x.zone,x.demandCV,
    x.assignedSlotCapacity??x.slotCapacity,x.assignedMaxWeight??x.maxWeight
  ].join(","))].join("\n")+"\n";
}
