import {parseCsv,summarize,toCsv} from "./core.js";
const $=s=>document.querySelector(s);
const sample=`sku,picks_per_day,aisle,shelf
A101,125,9,4
B204,74,7,2
C318,12,2,5
D440,96,8,5
E115,33,5,4
F902,140,10,6
G221,18,3,6
H773,62,6,5
I004,110,9,2
J510,8,2,6`;
$("#csv").value=sample;
let current=null;
function render(){
 try{
  const rows=parseCsv($("#csv").value), s=summarize(rows);current=s;
  $("#before").textContent=s.before.toLocaleString();$("#after").textContent=s.after.toLocaleString();$("#reduction").textContent=(100*s.reduction).toFixed(1)+"%";
  $("#classes").textContent=`A ${s.classes.A} · B ${s.classes.B} · C ${s.classes.C}`;
  $("#table").innerHTML=s.optimized.map(x=>`<tr><td>${x.sku}</td><td>${x.class}</td><td>${x.picks}</td><td>${x.originalAisle}/${x.originalShelf}</td><td>${x.aisle}/${x.shelf}</td></tr>`).join("");
  const maxA=Math.max(...rows.map(x=>x.aisle)),maxS=Math.max(...rows.map(x=>x.shelf));const map=new Map(s.optimized.map(x=>[`${x.aisle},${x.shelf}`,x]));
  let rects=""; for(let a=1;a<=maxA;a++)for(let sh=1;sh<=maxS;sh++){const x=map.get(`${a},${sh}`),cls=x?.class||"";const fill=cls==="A"?"#7dd3fc":cls==="B"?"#86efac":cls==="C"?"#fde68a":"#18202d";rects+=`<g><rect x="${(a-1)*45}" y="${(sh-1)*45}" width="40" height="40" rx="7" fill="${fill}"/><text x="${(a-1)*45+20}" y="${(sh-1)*45+24}" text-anchor="middle" font-size="10" fill="#071018">${x?.sku||""}</text></g>`}$("#map").setAttribute("viewBox",`0 0 ${maxA*45} ${maxS*45}`);$("#map").innerHTML=rects;
  $("#error").textContent="";
 }catch(e){$("#error").textContent="Invalid CSV: "+e.message}
}
$("#run").onclick=render;$("#sample").onclick=()=>{$("#csv").value=sample;render()};
$("#export").onclick=()=>{if(!current)return;const data=toCsv(current.optimized),blob=new Blob([data],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="suggested-slotting.csv";a.click();URL.revokeObjectURL(a.href)};
render();
