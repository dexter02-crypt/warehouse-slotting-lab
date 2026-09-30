import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv,classifyABC,xyzClass,aisleDistance,weightedTravel,compatible,
  optimize,pickRouteDistance,simulatePickLists,summarize,toCsv
} from "../src/core.js";

const basic=`sku,picks_per_day,aisle,shelf
A,100,5,5
B,50,4,4
C,10,2,2
D,5,1,3`;

const extended=`sku,picks_per_day,aisle,shelf,size,weight,zone,demand_cv,slot_capacity,max_weight
A,100,5,5,2,4,ambient,0.2,4,10
B,50,4,4,1,2,ambient,0.7,3,8
C,10,2,2,1,1,cold,1.2,2,5
D,5,1,3,1,1,cold,1.4,2,5`;

test("basic parser remains supported with defaults",()=>{const r=parseCsv(basic);assert.equal(r.length,4);assert.equal(r[0].zone,"ambient")});
test("extended parser reads constraints",()=>{const r=parseCsv(extended);assert.equal(r[0].size,2);assert.equal(r[2].zone,"cold")});
test("ABC puts highest mover in A",()=>assert.equal(classifyABC(parseCsv(basic))[0].abc,"A"));
test("XYZ thresholds are explicit",()=>{assert.equal(xyzClass(.5),"X");assert.equal(xyzClass(.6),"Y");assert.equal(xyzClass(1.2),"Z")});
test("same-aisle travel stays inside aisle",()=>assert.equal(aisleDistance({aisle:2,shelf:5},{aisle:2,shelf:2},{aisleSpacing:4}),3));
test("different aisles use front cross aisle",()=>assert.equal(aisleDistance({aisle:3,shelf:5},{aisle:1,shelf:2},{aisleSpacing:4}),13));
test("compatibility enforces capacity weight and zone",()=>{const rows=parseCsv(extended);assert.equal(compatible(rows[0],rows[1]),true);assert.equal(compatible(rows[0],rows[2]),false)});
test("optimization preserves one slot per SKU",()=>{const r=parseCsv(extended),o=optimize(r);assert.equal(new Set(o.map(x=>`${x.aisle}/${x.shelf}`)).size,r.length)});
test("optimization respects zones",()=>{const o=optimize(parseCsv(extended));for(const x of o)assert.equal(x.zone,x.assignedZone)});
test("weighted travel is nonnegative",()=>assert.ok(weightedTravel(parseCsv(extended))>=0));
test("pick route returns to depot",()=>{const r=parseCsv(extended);assert.ok(pickRouteDistance(r.slice(0,2))>0)});
test("simulation is deterministic for a seed",()=>{const r=parseCsv(extended),o=optimize(r);assert.deepEqual(simulatePickLists(r,o,{orders:100,seed:7}),simulatePickLists(r,o,{orders:100,seed:7}))});
test("summary exposes ABC XYZ and simulation",()=>{const s=summarize(parseCsv(extended),{aisle:1,shelf:1},{aisleSpacing:4},{orders:50,seed:1});assert.equal(s.skus,4);assert.equal(s.classes.A+s.classes.B+s.classes.C,4);assert.equal(s.classes.X+s.classes.Y+s.classes.Z,4);assert.equal(s.simulation.orders,50)});
test("CSV export round-trips extended model",()=>{const r=parseCsv(extended),o=optimize(r);assert.equal(parseCsv(toCsv(o)).length,r.length)});
test("invalid duplicate and incompatible data are rejected",()=>{assert.throws(()=>parseCsv("sku,picks_per_day,aisle,shelf\nA,2,1,1\nA,3,2,2"));assert.throws(()=>parseCsv("sku,picks_per_day,aisle,shelf\nA,-1,1,1"))});
