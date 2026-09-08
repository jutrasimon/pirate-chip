import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as engine from '../dist/combat.mjs';
// Headless integration of async controller and rule engine; not a visual browser test.
class Element {
 constructor(){this.dataset={};this.style={};this.children=[];this.clientWidth=390;this.clientHeight=420;this.offsetTop=180;this.open=false;this.classList={add(){},remove(){},toggle(){}};}
 set innerHTML(v){this.children=[];}append(e){this.children.push(e);}setAttribute(){}removeAttribute(){}addEventListener(){}getBoundingClientRect(){return{x:0,y:0,width:100,height:100};}animate(){return{cancel(){}};}getAnimations(){return [];}showModal(){this.open=true;}close(){this.open=false;}remove(){}querySelector(s){return this[s]??=new Element();}getContext(){return new Proxy({},{get:()=>()=>{},set:()=>true});}
}
function harness(){const els=new Map(),get=s=>{if(!els.has(s))els.set(s,new Element());return els.get(s);};let timers=[];let failImages=false;
 const all=s=>s==='dialog'?['#peek','#instructions','#result','#intent-detail'].map(get):s==='.coin'?get('#coins').children.map(e=>e.querySelector('.coin')):[];
 const context={...engine,tone(){},noise(){},audioSettings:()=>({sounds:true,music:true}),toggleAudio(){},console,document:{addEventListener(){},querySelector:get,querySelectorAll:all,createElement:()=>new Element(),body:new Element()},matchMedia:()=>({matches:true}),Image:class{set src(v){queueMicrotask(()=>failImages?this.onerror():this.onload());}},ResizeObserver:class{observe(){}},innerWidth:390,innerHeight:844,devicePixelRatio:1,addEventListener(){},performance:{now:()=>0},requestAnimationFrame:()=>1,setTimeout(fn){timers.push(fn);return fn;},clearTimeout(fn){timers=timers.filter(t=>t!==fn);}};
 vm.createContext(context);const source=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');vm.runInContext(source,context);
 return{get,run:s=>vm.runInContext(s,context),fail:()=>{failImages=true;},async settle(){for(let i=0;i<30;i++){const current=timers;timers=[];current.forEach(t=>t());await Promise.resolve();}}};
}
test('controller loads each scene and transitions through all five fights',async()=>{const h=harness();await h.settle();assert.equal(h.run('state.busy'),false);assert.equal(h.get('#scene-loading').hidden,true);h.run('state.hp=17');for(let i=0;i<5;i++){h.run("state.enemy=1;state.coins=[{name:'Test',faces:[['attaque',6],['defense',3]],face:0,used:false}];state.actions=2;play(0)");await h.settle();assert.equal(h.get('#result').open,true);assert.equal(h.run('state.defeated'),i+1);if(i<4){h.run('state.rewardClaimed=true;advance()');await h.settle();assert.equal(h.run('state.hp'),17);assert.equal(h.run('state.encounter'),i+1);assert.equal(h.run('state.busy'),false);assert.equal(h.get('.pirate-sprite.attack').src,h.run('currentEnemy(state).art.attack'));}}assert.equal(h.run('state.outcome'),'victory');assert.equal(h.get('#again').textContent,'New run ↻');});
test('reset during an enemy turn invalidates old async actions',async()=>{const h=harness();await h.settle();h.run('endTurn();reset()');await h.settle();assert.equal(h.run('state.hp'),28);assert.equal(h.run('state.round'),1);assert.equal(h.run('state.defeated'),0);assert.equal(h.run('state.busy'),false);});
test('an asset failure keeps controls locked and offers retry',async()=>{const h=harness();await h.settle();h.fail();h.run("imageLoads.clear();prepareScene()");await h.settle();assert.equal(h.run('state.busy'),true);assert.equal(h.get('#retry-scene').hidden,false);assert.equal(h.get('#end').disabled,true);});
