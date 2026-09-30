export function parseCsv(text){
  const lines=String(text).trim().split(/\r?\n/); if(lines.length<2)throw new Error("csv");
  const head=lines[0].split(",").map(x=>x.trim()); const need=["sku","picks_per_day","aisle","shelf"];
  if(need.some((x,i)=>head[i]!==x))throw new Error("header");
  const rows=lines.slice(1).filter(Boolean).map((line,i)=>{const c=line.split(",").map(x=>x.trim());if(c.length!==4)throw new Error(`row-${i+2}`);const picks=Number(c[1]),aisle=Number(c[2]),shelf=Number(c[3]);if(!c[0]||!Number.isFinite(picks)||picks<0||!Number.isInteger(aisle)||aisle<1||!Number.isInteger(shelf)||shelf<1)throw new Error(`row-${i+2}`);return {sku:c[0],picks,aisle,shelf}});
  if(rows.length>5000||new Set(rows.map(r=>r.sku)).size!==rows.length)throw new Error("rows"); return rows;
}
export function classifyABC(rows){
  const sorted=rows.map(x=>({...x})).sort((a,b)=>b.picks-a.picks||a.sku.localeCompare(b.sku)); const total=sorted.reduce((s,x)=>s+x.picks,0);let cum=0;
  return sorted.map(x=>{cum+=x.picks;const before=(cum-x.picks)/(total||1);const cls=before<0.8?"A":before<0.95?"B":"C";return {...x,class:cls,cumulativeShare:total?cum/total:0}})
}
export function distance(slot,depot={aisle:1,shelf:1}){return Math.abs(slot.aisle-depot.aisle)+Math.abs(slot.shelf-depot.shelf)}
export function weightedTravel(rows,depot={aisle:1,shelf:1}){return rows.reduce((s,x)=>s+x.picks*2*distance(x,depot),0)}
export function optimize(rows,depot={aisle:1,shelf:1}){
  const slots=rows.map(x=>({aisle:x.aisle,shelf:x.shelf})).sort((a,b)=>distance(a,depot)-distance(b,depot)||a.aisle-b.aisle||a.shelf-b.shelf);
  const skus=classifyABC(rows);
  return skus.map((x,i)=>({...x,aisle:slots[i].aisle,shelf:slots[i].shelf,originalAisle:x.aisle,originalShelf:x.shelf}));
}
export function summarize(rows,depot={aisle:1,shelf:1}){
  const classified=classifyABC(rows), optimized=optimize(rows,depot);
  const before=weightedTravel(rows,depot), after=weightedTravel(optimized,depot);
  const classes={A:0,B:0,C:0}; for(const x of classified)classes[x.class]++;
  return {skus:rows.length,classes,before,after,reduction:before?1-after/before:0,optimized};
}
export function toCsv(rows){return ["sku,picks_per_day,aisle,shelf",...rows.map(x=>`${x.sku},${x.picks},${x.aisle},${x.shelf}`)].join("\n")+"\n"}
