import {parseCsv,summarize,toCsv} from "./core.js";
const $=s=>document.querySelector(s);

const sample=`sku,picks_per_day,aisle,shelf,size,weight,zone,demand_cv,slot_capacity,max_weight
A101,125,9,4,2,4,ambient,0.22,4,12
B204,74,7,2,1,2,ambient,0.58,3,8
C318,12,2,5,1,1,cold,1.18,2,5
D440,96,8,5,3,7,ambient,0.31,4,12
E115,33,5,4,1,2,ambient,0.76,2,6
F902,140,10,6,2,5,ambient,0.19,4,10
G221,18,3,6,1,1,cold,1.34,2,5
H773,62,6,5,2,3,ambient,0.47,3,8
I004,110,9,2,3,8,ambient,0.28,4,12
J510,8,2,6,1,1,cold,1.42,2,5`;
$("#csv").value=sample;
let current=null;

function cfg(){
  return {
    aisleSpacing:Number($("#aisleSpacing").value)||4,
    shelfSpacing:1,
    crossAisleShelf:1,
  };
}
function depot(){ return {aisle:Number($("#depotAisle").value)||1,shelf:Number($("#depotShelf").value)||1}; }
function download(name,text,type){
  const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement("a");
  a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);
}
function heatmap(svg, rows){
  const maxA=Math.max(...rows.map(x=>x.aisle)),maxS=Math.max(...rows.map(x=>x.shelf));
  const map=new Map(rows.map(x=>[`${x.aisle},${x.shelf}`,x]));
  let body="";
  for(let a=1;a<=maxA;a++)for(let s=1;s<=maxS;s++){
    const x=map.get(`${a},${s}`), cls=x?.abc||"", fill=cls==="A"?"#7dd3fc":cls==="B"?"#86efac":cls==="C"?"#fde68a":"#18202d";
    body+=`<g><rect x="${(a-1)*45}" y="${(s-1)*45}" width="40" height="40" rx="7" fill="${fill}" stroke="${x?.zone==="cold"?"#a78bfa":"#26354a"}" stroke-width="2"/><text x="${(a-1)*45+20}" y="${(s-1)*45+24}" text-anchor="middle" font-size="9" fill="#071018">${x?.sku||""}</text></g>`;
  }
  svg.setAttribute("viewBox",`0 0 ${maxA*45} ${maxS*45}`);svg.innerHTML=body;
}
function render(){
  try{
    const rows=parseCsv($("#csv").value);
    const s=summarize(rows,depot(),cfg(),{
      orders:Number($("#orders").value)||500,
      seed:Number($("#seed").value)||42,
      maxLines:Number($("#maxLines").value)||5,
    });
    current={...s,input:rows,depot:depot(),config:cfg()};
    $("#before").textContent=s.before.toLocaleString();
    $("#after").textContent=s.after.toLocaleString();
    $("#reduction").textContent=(100*s.reduction).toFixed(1)+"%";
    $("#simReduction").textContent=(100*s.simulation.reduction).toFixed(1)+"%";
    $("#simAvg").textContent=`${s.simulation.averageBefore.toFixed(1)} → ${s.simulation.averageAfter.toFixed(1)}`;
    $("#classes").textContent=`ABC: ${s.classes.A}/${s.classes.B}/${s.classes.C} · XYZ: ${s.classes.X}/${s.classes.Y}/${s.classes.Z}`;
    $("#table").innerHTML=s.optimized.map(x=>`<tr><td>${x.sku}</td><td>${x.abc}${x.xyz}</td><td>${x.picks}</td><td>${x.originalAisle}/${x.originalShelf}</td><td>${x.aisle}/${x.shelf}</td><td>${x.assignedZone}</td><td>${x.size}/${x.assignedSlotCapacity}</td><td>${x.weight}/${x.assignedMaxWeight}</td></tr>`).join("");
    const classified=new Map(s.optimized.map(x=>[x.sku,x]));
    heatmap($("#beforeMap"),rows.map(x=>({...x,abc:classified.get(x.sku).abc})));
    heatmap($("#afterMap"),s.optimized);
    $("#error").textContent="";
  }catch(e){$("#error").textContent="Model error: "+e.message;}
}
$("#run").onclick=render;
$("#sample").onclick=()=>{$("#csv").value=sample;render();};
$("#exportCsv").onclick=()=>current&&download("suggested-slotting.csv",toCsv(current.optimized),"text/csv");
$("#exportJson").onclick=()=>current&&download("slotting-report.json",JSON.stringify(current,null,2)+"\n","application/json");
render();
