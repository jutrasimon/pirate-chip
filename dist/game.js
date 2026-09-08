import {tone,noise,audioSettings,toggleAudio} from './audio.mjs';
import {createRun,currentEnemy,ENEMIES,playCoin,resolveEnemy,nextTurn,nextCombat,getIntent,getEnemyStatus,UPGRADES,offerUpgrades,forgeFace} from './combat.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const paths={attaque:'<path d="M24 3 13 7 6 17l4 4 10-7 4-11ZM7 19l-3-3-2 2 4 4-4 4 2 2 4-4 4 4 2-2-3-3-4-4Z"/>',defense:'<path d="M16 2C12 5 7 6 3 6v9c0 8 6 13 13 17 7-4 13-9 13-17V6c-4 0-9-1-13-4Zm0 4c4 2 7 3 10 3v6c0 6-4 11-10 14C10 26 6 21 6 15V9c3 0 6-1 10-3Zm0 3v16c5-4 7-7 7-11v-3l-7-2Z"/>',actions:'<path d="M16 1c2 9 5 12 15 15-10 2-13 5-15 15C14 21 11 18 1 16 11 13 14 10 16 1Z"/>',retournement:'<path d="M27 3v11H16l4-4a9 9 0 0 0-13 6H2A14 14 0 0 1 24 6l3-3ZM5 29V18h11l-4 4a9 9 0 0 0 13-6h5A14 14 0 0 1 8 26l-3 3Z"/>'};
const icon=t=>`<svg viewBox="0 0 32 34" fill="currentColor" aria-hidden="true">${paths[t]}</svg>`;
const VERSION='0.2.0';
$$('[data-version]').forEach(el=>el.textContent=`v${VERSION}`);
const effects={attaque:'Attack',defense:'Block',actions:'Actions next turn',retournement:'Flip'};
let state,level=2,epoch=0,poseTimer,heldIntent=null;const motion=matchMedia('(prefers-reduced-motion: reduce)');
const intensity=()=>motion.matches?0:level;const pause=ms=>new Promise(r=>setTimeout(r,ms));
function animate(el,frames,options={}){if(!intensity())return;return el.animate(frames,{duration:380,easing:'cubic-bezier(.2,.8,.2,1)',...options});}
function later(fn,ms){const e=epoch;setTimeout(()=>{if(e===epoch)fn();},ms);}
function pose(name,duration=0){clearTimeout(poseTimer);$('#enemy').dataset.pose=name;$('.pirate-sprite.idle').alt=`${state?currentEnemy(state).name:'Enemy'}: ${name}`;if(duration){const e=epoch;poseTimer=setTimeout(()=>{if(e===epoch)pose('idle');},duration);}}
const canvas=$('#particles'),ctx=canvas.getContext('2d');let bits=[],raf=0,lastFrame=0;
function resize(){const d=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0);}addEventListener('resize',resize);resize();
function burst(el,color='#ed492c',scale=1){if(!intensity())return;const r=el.getBoundingClientRect();for(let n=0;n<18*intensity()*scale;n++){const a=Math.random()*Math.PI*2,v=(2+Math.random()*6)*scale;bits.push({x:r.x+r.width/2,y:r.y+r.height*.45,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,t:1,size:3+Math.random()*8,color:n%3===0?'#fff1d0':color,angle:a});}bits=bits.slice(-220);if(!raf){lastFrame=performance.now();raf=requestAnimationFrame(draw);}}
function draw(now){const dt=Math.min((now-lastFrame)/16.667,2);lastFrame=now;ctx.clearRect(0,0,innerWidth,innerHeight);const bounds=$('#game').getBoundingClientRect();ctx.save();ctx.beginPath();ctx.rect(bounds.x,bounds.y,bounds.width,bounds.height);ctx.clip();bits=bits.filter(p=>p.t>0);for(const p of bits){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.16*dt;p.t-=.025*dt;ctx.save();ctx.globalAlpha=Math.max(0,p.t);ctx.fillStyle=p.color;ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size*1.6,-p.size*.4);ctx.lineTo(0,p.size*.65);ctx.fill();ctx.restore();}ctx.restore();raf=bits.length?requestAnimationFrame(draw):0;}
function number(el,value,color='#fff1d0'){const r=el.getBoundingClientRect(),n=document.createElement('span');n.className='float-number';n.textContent=value;n.style.left=`${r.x+r.width*.68}px`;n.style.top=`${r.y+r.height*.4}px`;n.style.color=color;document.body.append(n);const frames=intensity()?[{opacity:0,transform:'translate(-50%,-10%) scale(1.8) rotate(-12deg)'},{opacity:1,transform:'translate(-50%,-60%) scale(1)',offset:.14},{opacity:1,offset:.65},{opacity:0,transform:'translate(-50%,-140%) scale(.9)'}]:[{opacity:1},{opacity:0}];n.animate(frames,{duration:900,easing:'ease-out'}).onfinish=()=>n.remove();}
function shake(el){const v=intensity()*6;animate(el,[{transform:'translateX(0)'},{transform:`translateX(${-v}px) rotate(-1.5deg)`},{transform:`translateX(${v}px) rotate(1deg)`},{transform:`translateX(${-v/2}px)`},{transform:'translateX(0)'}],{duration:300});if(intensity())$('#flash').animate([{opacity:.16},{opacity:0}],{duration:130});}
function slash(){animate($('#slash'),[{opacity:0,transform:'scale(.3) rotate(-10deg)'},{opacity:1,transform:'scale(1.15) rotate(4deg)',offset:.18},{opacity:1,offset:.5},{opacity:0,transform:'scale(1.3) rotate(7deg)'}],{duration:300});}
function coinFace(type,value){return `<span class="symbol${type==='retournement'?' symbol-only':''}">${icon(type)}</span>${type==='retournement'?'':`<span class="value">${type==='actions'?'+':''}${value}</span>${type==='actions'?'<small class="next-turn-label">NEXT TURN</small>':''}`}`;}
function renderCoins(){hideTip();const container=$('#coins');container.innerHTML='';state.coins.forEach((c,i)=>{const [type,value]=c.faces[c.face],[back,bv]=c.faces[1-c.face],slot=document.createElement('div');slot.className='slot';slot.innerHTML=`<button class="coin ${type}${c.used?' used':''}${state.target&&!c.used?' target':''}" aria-label="${state.target?'Flip':'Play'} ${c.name} : ${effects[type]} ${value}">${coinFace(type,value)}</button>${combatHelp(c)}<button class="peek-button" aria-label="Inspect ${c.name}. Reverse: ${effects[back]} ${bv}">${icon(back)}${back==='retournement'?'':`<span class="mini-value">${back==='actions'?'+':''}${bv}</span>`}</button>`;slot.querySelector('.coin').disabled=c.used||state.busy||state.over||(!state.target&&state.actions<=0);slot.querySelector('.coin').onclick=()=>play(i);slot.querySelector('.peek-button').onclick=()=>peek(i);container.append(slot);});}

function renderShield(who,value){
 const badge=$(`#${who}-shield`),previous=Number(badge.dataset.value||0);
 badge.dataset.value=String(value);$(`#${who}-block`).textContent=value;
 badge.setAttribute('aria-label',`${who==='enemy'?'Enemy':'Player'} block: ${value}`);
 if(value===previous)return;
 badge.getAnimations().forEach(a=>a.cancel());
 if(value>0){badge.hidden=false;animate(badge,[{transform:value<previous?'scale(.8) rotate(-10deg)':'scale(1.3)'},{transform:'scale(1) rotate(0)'}],{duration:300});}
 else if(previous>0){if(intensity()){burst(badge,'#79bdd9',.6);animate(badge,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.45) rotate(15deg)'}],{duration:250});later(()=>{if(Number(badge.dataset.value)===0)badge.hidden=true;},250);}else badge.hidden=true;}
}

function update(){
 const foe=currentEnemy(state),intent=heldIntent||getIntent(state);
 $('#enemy-name').textContent=foe.name;
 $('#player-health').textContent=state.hp;$('#player-bar').style.width=`${state.hp/state.maxHp*100}%`;renderShield('player',state.block);
 $('#enemy-health').textContent=`${state.enemy} / ${foe.hp}`;$('#enemy-bar').style.width=`${state.enemy/foe.hp*100}%`;renderShield('enemy',state.enemyBlock);
 $('#actions').innerHTML=Array.from({length:Math.max(2,state.actions)},(_,i)=>`<i class="action-pip ${i<state.actions?'available':'spent'}"></i>`).join('');$('#action-count').textContent=`${state.actions} action${state.actions!==1?'s':''}`;
 $('#battle-count').textContent=`BATTLE ${state.encounter+1} / 5`;
 $('#end').disabled=state.busy||state.over||state.target;$('#end').innerHTML=`<small id="round">TURN ${String(state.round).padStart(2,'0')}</small>${state.busy?'Resolving…':'End turn'}`;
 $('#next-actions').hidden=!state.nextActions;$('#next-actions').textContent=`+${state.nextActions} NEXT TURN`;
 const glyph=intent.kind==='block'?'defense':intent.kind==='load'||intent.kind==='fuse'?'actions':intent.kind==='cancelled'?'retournement':'attaque';
 $('#intent').innerHTML=`${icon(glyph)}<strong class="${intent.value===null?'intent-word':''}">${intent.value===null?(intent.kind==='load'?'LOAD':'FUSE'):intent.value}</strong><b class="info-mark">i</b>`;
 $('#intent').setAttribute('aria-label',`${intent.name}. ${intent.detail}`);$('#intent').dataset.tip=`${intent.name}: ${intent.detail}`;
 const status=getEnemyStatus(state);$('#enemy-status').innerHTML=`${state.riposte?icon('attaque'):icon('actions')}<span>${status}</span><b class="info-mark">i</b>`;$('#enemy-status').hidden=!status;$('#enemy').dataset.stance=state.riposte?'riposte':'';$('#enemy').dataset.shield=state.enemyBlock>0?'active':'';
 $('#enemy-status').dataset.tip=state.riposte?'Riposte: counters each damaging coin for 2 damage. Block absorbs it. Ends before the next enemy action.':getIntent(state).detail;$('#next-actions').dataset.tip='Extra actions available at the start of your next turn.';renderCoins();positionIntent();
}
function animateDeal(){update();$$('.coin').forEach((c,i)=>{animate(c,[{transform:'translateY(100px) rotateY(700deg) rotate(-25deg) scale(.2)',opacity:0},{transform:'translateY(-10px) rotateY(0) rotate(6deg) scale(1.05)',opacity:1,offset:.76},{transform:'none',opacity:1}],{duration:650,delay:i*80});later(()=>tone(850+i*180,.1,'triangle',.05,500+i*120),i*80+420);});}
async function present(events,e){
 for(const event of events){if(e!==epoch)return;
  if(event.type==='coin'){burst($$('.coin')[event.index],event.effect==='defense'?'#347f9f':'#efb83e');}
  if(event.type==='flip'){animate($$('.coin')[event.index],[{transform:'rotateY(180deg) scale(.8)'},{transform:'rotateY(0) scale(1)'}],{duration:460});tone(450,.22,'triangle',.08,950);burst($$('.coin')[event.index],'#ed492c');await pause(460);}
  if(event.type==='enemyHit'){pose('hurt',720);slash();burst($('#enemy'));shake($('.arena'));number($('#enemy'),event.damage?`−${event.damage}`:'Blocked');tone(95,.23,'sawtooth',.045,28);noise(.16,.14);await pause(400);}
  if(event.type==='enemyAttack'||event.type==='riposte'){pose('attack',1000);animate($('#enemy'),[{transform:'translateX(-12px) scale(.97)'},{transform:'translateX(10px) scale(1.08)',offset:.35},{transform:'none'}],{duration:750});noise(.3,.045);await pause(340);}
  if(event.type==='playerHit'){update();enemyImpact();shake($('.play'));burst($('.player-strip'),event.damage?'#ed492c':'#347f9f');number($('.player-strip'),event.damage?`−${event.damage}`:'Blocked',event.damage?'#ff684a':'#a3dae6');tone(event.damage?80:450,.23,'triangle',.08,event.damage?30:650);noise(.17,.1);await pause(430);}
  if(event.type==='playerBlock'){animate($('.player-strip'),[{filter:'brightness(2)'},{filter:'brightness(1)'}]);number($('.player-strip'),`+${event.value}`,'#a3dae6');tone(400,.3,'sine',.1,850);}
  if(event.type==='enemyBlock'){update();burst($('#enemy'),'#347f9f');tone(320,.2,'sine',.07,640);}
  if(event.type==='extraAction'){tone(740,.2,'triangle',.07,1100);burst($('#actions'),'#efb83e');}
  if(event.type==='nextActions'){tone(600,.15,'triangle',.07,1200);burst($('.turn-controls .actions'),'#efb83e');}
  if(event.type==='target')tone(500,.12,'sine',.06,700);
  if(['load','fuse','stance'].includes(event.type)){update();animate($('#enemy'),[{transform:'scale(1)'},{transform:'scale(1.025)'},{transform:'scale(1)'}],{duration:500});tone(240,.3,'triangle',.045,420);}
  if(event.type==='cancelled'){burst($('#intent'),'#79bdd9');tone(400,.2,'triangle',.06,160);}
 }
}
async function play(i){if(state.busy||state.over)return;const e=epoch,events=playCoin(state,i);if(!events.length)return;state.busy=true;update();await present(events,e);if(e!==epoch)return;await pause(250);if(e!==epoch)return;state.busy=false;update();if(state.over)finish();}
async function endTurn(){
 if(state.busy||state.over||state.target)return;
 const e=epoch;hideTip();heldIntent=getIntent(state);state.busy=true;update();
 await pause(800);if(e!==epoch)return;
 const events=resolveEnemy(state);await present(events,e);if(e!==epoch)return;
 update();await pause(700);if(e!==epoch)return;
 if(state.over){heldIntent=null;state.busy=false;update();finish();return;}
 const banner=$('#turn-banner');banner.textContent=`TURN ${state.round+1}`;banner.hidden=false;
 animate(banner,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:250});
 await pause(1000);if(e!==epoch)return;
 nextTurn(state);state.busy=true;heldIntent=null;pose('idle');animateDeal();
 await pause(950);if(e!==epoch)return;
 banner.hidden=true;state.busy=false;update();
}
function peek(i){const c=state.coins[i];$('#peek-name').textContent=c.name;$('#peek-faces').innerHTML=c.faces.map(([t,v],n)=>`<div class="face-card"><small>${n===c.face?'ACTIVE FACE':'REVERSE'}</small><div class="coin ${t}" aria-label="${effects[t]} ${v}">${coinFace(t,v)}${upgradeBadge(c,n)}</div><p>${faceDescription(c,n)}</p></div>`).join('');$('#peek').showModal();tone(900,.06,'sine',.03);}
function finish(){
 const won=state.outcome!=='defeat';if(won){pose('hurt');burst($('#enemy'),'#efb83e',2);tone(600,.5,'triangle',.06,1200);}
 $('#result-label').textContent=state.outcome==='victory'?'RUN COMPLETE':won?'ENEMY DEFEATED':'RUN OVER';
 $('#result-title').hidden=won;$('#result-title').textContent=won?'':'Lost at sea.';
 $('#result-story').innerHTML=state.outcome==='victory'?'Five rivals defeated. <strong>The seas are yours.</strong>':won?`<strong>${currentEnemy(state).name}</strong> ${stories[currentEnemy(state).id]}`:'The sea keeps your coins, but not your nerve.';
 $('#result-summary').textContent=`${state.defeated} / 5 defeated · ${state.hp} / ${state.maxHp} HP`;
 $('#again').textContent=state.outcome==='combatVictory'?'Claim your spoils':'New run ↻';later(()=>{for(const d of $$('dialog'))d.close();$('#result').showModal();},650);
}
const imageLoads=new Map();
function loadImage(src){if(imageLoads.has(src))return imageLoads.get(src);const p=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{imageLoads.delete(src);reject(new Error('Image unavailable'));};img.src=src;});imageLoads.set(src,p);return p;}
async function prepareScene(){
 const e=epoch,foe=currentEnemy(state);state.busy=true;update();$('.arena').classList.add('is-loading');$('#scene-loading').hidden=false;$('#loading-copy').textContent='Preparing encounter…';$('#retry-scene').hidden=true;
 try{await Promise.all(Object.values(foe.art).map(loadImage));if(e!==epoch)return;
  for(const name of ['idle','attack','hurt']){$(`.pirate-sprite.${name}`).src=foe.art[name];}
  $('.arena').style.backgroundImage=`url("${foe.art.background}")`;$('#enemy').dataset.foe=foe.id;pose('idle');$('.arena').classList.remove('is-loading');$('#scene-loading').hidden=true;state.busy=false;animateDeal();positionIntent();if(mockup&&!mockupShown){mockupShown=true;showMockup(mockup);}
  const next=ENEMIES.find(x=>x.id===state.order[state.encounter+1]);if(next)Promise.all(Object.values(next.art).map(loadImage)).catch(()=>{});
 }catch{if(e!==epoch)return;$('#loading-copy').textContent='Could not load this encounter.';$('#retry-scene').hidden=false;}
}
function clearScene(){hideTip();heldIntent=null;$('#turn-banner').hidden=true;pouchMode='inventory';epoch++;clearTimeout(poseTimer);$$('dialog').forEach(d=>d.close());$('#game').getAnimations({subtree:true}).forEach(a=>{if(a.constructor.name!=='CSSAnimation')a.cancel();});$$('.float-number').forEach(n=>n.remove());bits=[];for(const who of ['enemy','player']){const badge=$(`#${who}-shield`);badge.dataset.value='0';badge.hidden=true;}}
function reset(){clearScene();state=createRun();prepareScene();}
function advance(){if(state.outcome==='combatVictory'&&!state.rewardClaimed){openRewards();return;}if(state.outcome!=='combatVictory'){reset();return;}clearScene();nextCombat(state);prepareScene();}
$('#end').onclick=endTurn;$('#reset').onclick=reset;$('#again').onclick=()=>state.outcome==='combatVictory'?openRewards():advance();$('#retry-scene').onclick=prepareScene;
$('#help').onclick=()=>$('#instructions').showModal();$$('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('.close-peek').onclick=()=>$('#peek').close();$('.close-help').onclick=()=>$('#instructions').close();
$$('[data-level]').forEach(b=>b.onclick=()=>{level=Number(b.dataset.level);$$('[data-level]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});});
function positionIntent(){const e=$('#enemy'),side=Math.min(e.clientWidth,e.clientHeight),top=Math.max(getEnemyStatus(state)?157:105,e.offsetTop+e.clientHeight-side+side*.05-78);$('#intent').style.top=`${top}px`;}
new ResizeObserver(positionIntent).observe($('.arena'));

const stories={captain:'surrenders the dock. Claim your spoils.',gunner:'falls silent. Take the spoils before the watch arrives.',ironjaw:'drops his shield. The shipyard is yours.',duelist:'drops her blade. Her purse is yours.',baron:'loses his last fuse. Grab the spoils and move.'};
function enemyImpact(){const r=$('#game').getBoundingClientRect(),el=$('#enemy-impact');Object.assign(el.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});animate(el,[{opacity:0,transform:'scale(.88)'},{opacity:.9,transform:'scale(1)',offset:.18},{opacity:.65,offset:.38},{opacity:0,transform:'scale(1.02)'}],{duration:600});noise(.32,.12);tone(65,.35,'sine',.12,25);}
function upgradeSymbol(u){return u.id==='balanced'?`${icon('attaque')}${icon('defense')}`:icon(u.attack?'attaque':u.block?'defense':u.reroll?'retournement':'actions');}
function upgradeBadge(c,side){const u=UPGRADES.find(u=>u.id===c.upgrades?.[side]);return u?`<span class="forged-badge" aria-label="Forged: ${u.name}">${upgradeSymbol(u)}</span>`:'';}
function hasFaceHelp(c,side){return Boolean(c.upgrades?.[side])||['actions','retournement'].includes(c.faces[side][0]);}
function combatHelp(c){const u=UPGRADES.find(u=>u.id===c.upgrades?.[c.face]),type=c.faces[c.face][0];
 if(!hasFaceHelp(c,c.face))return '';
 const text=u?`${u.name}: ${u.detail}`:type==='actions'?'Adds 2 actions to your next turn.':'Choose another unplayed coin to flip to its reverse.';
 return `<button class="coin-help ${u?'forged-badge':'info-button'}" data-tip="${text}" aria-label="${u?u.name:'Coin effect'} details">${u?upgradeSymbol(u):'i'}</button>`;
}
function faceDescription(c,side){const[t,v]=c.faces[side],u=UPGRADES.find(u=>u.id===c.upgrades?.[side]);return `${effects[t]}${t==='retournement'?'':': '+v}.${u?' '+u.name+': '+u.detail:''}`;}
let selectedUpgrade=null,selectedFace=null,pouchMode='inventory',viewSides={};
function openPouch(mode='inventory'){pouchMode=mode;selectedFace=null;$('#pouch-kicker').textContent=mode==='forge'?'THE FORGE':'YOUR COLLECTION';$('#pouch-title').textContent=mode==='forge'?'Make your mark.':'Coin pouch';$('#pouch-context').textContent=mode==='forge'?UPGRADES.find(u=>u.id===selectedUpgrade).label+' · Choose an empty face.':`${state.pool.length} coins · Tap the small reverse to turn a coin.`;$('#forge-confirm').hidden=true;renderPool();$('#pouch').showModal();}
function renderPool(){const grid=$('#pool-grid');grid.innerHTML='';state.pool.forEach(c=>{const side=viewSides[c.id]||0,[t,v]=c.faces[side],[bt,bv]=c.faces[1-side],u=UPGRADES.find(u=>u.id===c.upgrades?.[side]),selected=selectedFace?.id===c.id&&selectedFace.side===side,card=document.createElement('article');card.className='pool-card'+(selected?' chosen':'');card.innerHTML=`<h3>${c.name}</h3><div class="pool-coin"><button class="coin ${t}" aria-label="${c.name}, ${faceDescription(c,side)}">${coinFace(t,v)}${upgradeBadge(c,side)}</button><button class="peek-button" aria-label="Turn ${c.name}: ${faceDescription(c,1-side)}">${icon(bt)}${bt==='retournement'?'':`<span class="mini-value">${bv}</span>`}</button></div><p class="face-label">FACE ${side===0?'A':'B'} ${hasFaceHelp(c,side)?'<button class="info-button" aria-label="Face details">i</button>':''}</p><div class="upgrade-slot ${u?'filled':''}">${u?u.label:'EMPTY FORGE SLOT'}</div>${pouchMode==='forge'?`<button class="select-face" ${u?'disabled':''}>${u?'Already forged':selected?'Selected ✓':'Choose this face'}</button>`:''}`;
 card.querySelector('.peek-button').onclick=()=>{viewSides[c.id]=1-side;selectedFace=null;$('#forge-confirm').hidden=true;renderPool();const coin=grid.querySelectorAll('.pool-card')[state.pool.indexOf(c)].querySelector('.coin');animate(coin,[{transform:'rotateY(-180deg)'},{transform:'rotateY(0)'}],{duration:430});tone(700,.13,'triangle',.04,1000);};
 if(hasFaceHelp(c,side))card.querySelector('.info-button').dataset.tip=faceDescription(c,side);
 const select=()=>{if(u)return;selectedFace={id:c.id,side};renderPool();$('#forge-description').textContent=`${UPGRADES.find(u=>u.id===selectedUpgrade).name} → ${c.name}, face ${side===0?'A':'B'}`;$('#forge-confirm').hidden=false;};if(pouchMode==='forge')card.querySelector('.coin').onclick=select;else if(hasFaceHelp(c,side))card.querySelector('.coin').dataset.tip=faceDescription(c,side);if(pouchMode==='forge')card.querySelector('.select-face').onclick=select;grid.append(card);});}
function openRewards(){$('#result').close();const rewards=offerUpgrades(state);$('#reward-options').innerHTML=rewards.map(u=>`<button class="reward-card" data-upgrade="${u.id}"><span class="reward-seal">${icon(u.attack?'attaque':u.block?'defense':u.reroll?'retournement':'actions')}</span><span><strong>${u.name}</strong><b>${u.label}</b><small>${u.detail}</small></span><span class="reward-arrow">›</span></button>`).join('');$$('[data-upgrade]').forEach(b=>b.onclick=()=>{selectedUpgrade=b.dataset.upgrade;$('#rewards').close();openPouch('forge');});$('#rewards').showModal();}
$('#inventory-open').onclick=()=>openPouch();$('#forge-apply').onclick=()=>{if(!selectedFace||!forgeFace(state,selectedFace.id,selectedFace.side,selectedUpgrade))return;$('#forge-apply').disabled=true;tone(180,.12,'triangle',.12,850);noise(.2,.08);renderPool();$('#forge-description').textContent='Forged. Your next rival awaits.';later(()=>{$('#forge-apply').disabled=false;$('#pouch').close();advance();},650);};
$('#pouch').addEventListener('close',()=>{hideTip();if(pouchMode==='forge'&&!state.rewardClaimed&&state.outcome==='combatVictory')openRewards();});
$('#rewards').addEventListener('cancel',e=>e.preventDefault());
function refreshAudio(){for(const [id,key] of [['sounds-toggle','sounds'],['music-toggle','music']]){const on=audioSettings()[key],b=$('#'+id);b.setAttribute('aria-checked',on);b.querySelector('b').textContent=on?'ON':'OFF';}}
for(const [id,key] of [['sounds-toggle','sounds'],['music-toggle','music']])$('#'+id).onclick=()=>{toggleAudio(key);refreshAudio();tone(740,.09,'triangle',.04);};refreshAudio();
let tipOwner=null,tipTimer=null;
function showTip(el,text){
 hideTip();if(!el.isConnected)return;
 const tip=$('#tooltip');tipOwner=el;(el.closest('dialog')||document.body).append(tip);
 tip.textContent=text;tip.hidden=false;
 const r=el.getBoundingClientRect(),w=Math.min(260,innerWidth-32);
 tip.style.width=w+'px';tip.style.left=Math.max(16,Math.min(innerWidth-w-16,r.x+r.width/2-w/2))+'px';
 const above=r.top-tip.offsetHeight-10;
 tip.style.top=Math.max(12,Math.min(innerHeight-tip.offsetHeight-16,above>=12?above:r.bottom+10))+'px';
 el.setAttribute('aria-describedby','tooltip');
}
function hideTip(){clearTimeout(tipTimer);tipTimer=null;if(tipOwner)tipOwner.removeAttribute('aria-describedby');tipOwner=null;$('#tooltip').hidden=true;}
function toggleTip(el){if(tipOwner===el)hideTip();else showTip(el,el.dataset.tip);}
function scheduleTip(el){hideTip();tipTimer=setTimeout(()=>showTip(el,el.dataset.tip),800);}
document.addEventListener('pointerover',e=>{const el=e.target.closest('[data-tip]');if(el&&e.pointerType!=='touch'&&!el.contains(e.relatedTarget))scheduleTip(el);});
document.addEventListener('pointerout',e=>{const el=e.target.closest('[data-tip]');if(el&&!el.contains(e.relatedTarget))hideTip();});
document.addEventListener('focusin',e=>{const el=e.target.closest('[data-tip]');if(el&&el.matches(':focus-visible'))scheduleTip(el);});
document.addEventListener('focusout',hideTip);
document.addEventListener('click',e=>{const el=e.target.closest('[data-tip]');if(el){toggleTip(el);return;}hideTip();});
document.addEventListener('pointerdown',e=>{if(tipOwner&&!tipOwner.contains(e.target))hideTip();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});
document.addEventListener('scroll',hideTip,true);addEventListener('resize',hideTip);
for(const dialog of $$('dialog'))dialog.addEventListener('close',hideTip);
$('#next-actions').tabIndex=0;$('#next-actions').setAttribute('role','button');
$('#next-actions').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleTip(e.currentTarget);}};
const mockup=typeof location!=='undefined'?new URLSearchParams(location.search).get('mockup'):null;let mockupShown=false;
function showMockup(mode){if(mode==='combat')return;state.outcome='combatVictory';state.over=true;state.defeated=1;offerUpgrades(state);if(mode==='rewards')openRewards();else if(mode==='forge'){selectedUpgrade=state.reward[0];openPouch('forge');}else{state.pool[0].upgrades=['attack',null];openPouch();}}
reset();
