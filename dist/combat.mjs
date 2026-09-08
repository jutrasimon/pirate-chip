// Prototype rules. Every turn draws four unique instances from the seven-coin pouch.
export const COINS = [
 {id:'saber_1',name:'Saber',faces:[['attaque',6],['defense',3]]},
 {id:'saber_2',name:'Saber',faces:[['attaque',6],['defense',3]]},
 {id:'bulwark_1',name:'Bulwark',faces:[['defense',6],['attaque',3]]},
 {id:'bulwark_2',name:'Bulwark',faces:[['defense',6],['attaque',3]]},
 {id:'cutlass',name:'Cutlass',faces:[['attaque',5],['attaque',4]]},
 {id:'momentum',name:'Momentum',faces:[['actions',2],['defense',4]]},
 {id:'trick',name:'Trick',faces:[['retournement',1],['attaque',4]]},
];
const art=(id)=>({idle:`assets/${id}-idle.png`,attack:`assets/${id}-attack.png`,hurt:`assets/${id}-hurt.png`,background:`assets/${id}-bg.png`});
export const ENEMIES = [
 {id:'captain',name:'The Captain',hp:30,art:{idle:'pirate-idle.png',attack:'pirate-attack.png',hurt:'pirate-hurt.png',background:'deck.png'},pattern:['strike','guard']},
 {id:'gunner',name:'The Gunner',hp:28,art:art('gunner'),pattern:['load','fire','recover']},
 {id:'ironjaw',name:'Ironjaw',hp:36,art:art('ironjaw'),pattern:['guard','bash']},
 {id:'duelist',name:'The Duelist',hp:30,art:art('duelist'),pattern:['strike','riposte','lunge']},
 {id:'baron',name:'The Powder Baron',hp:40,art:art('baron'),pattern:['fuse','blast','strike']},
];
export function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function currentEnemy(s){return ENEMIES.find(e=>e.id===s.order[s.encounter]);}
export function drawCoins(s,rng=Math.random){s.coins=shuffle(s.pool||COINS,rng).slice(0,4).map(c=>({...c,face:rng()<.5?0:1,used:false}));}
export function createRun(rng=Math.random){const s={hp:28,maxHp:28,order:shuffle(ENEMIES.map(e=>e.id),rng),encounter:0,defeated:0,pool:structuredClone(COINS),reward:null,rewardClaimed:false};beginCombat(s,rng);return s;}
function beginCombat(s,rng){Object.assign(s,{enemy:currentEnemy(s).hp,enemyBlock:0,block:0,round:1,step:0,actions:2,nextActions:0,turnDamage:0,riposte:false,busy:false,over:false,target:false,outcome:null});drawCoins(s,rng);}
export function nextCombat(s,rng=Math.random){if(s.outcome!=='combatVictory')return false;s.encounter++;beginCombat(s,rng);return true;}
function checkEnd(s){if(s.hp<=0){s.over=true;s.target=false;s.outcome='defeat';return;}if(s.enemy<=0&&!s.over){s.defeated++;s.over=true;s.target=false;s.outcome=s.defeated===ENEMIES.length?'victory':'combatVictory';s.rewardClaimed=false;s.reward=null;}}
export function getIntent(s){const e=currentEnemy(s),phase=e.pattern[s.step];
 const attack=(value,name,detail)=>({kind:'attack',value,name,detail});
 if(e.id==='captain')return phase==='guard'?{kind:'block',value:6,name:'Guard',detail:'Gain 6 block until the next enemy action.'}:attack(5,'Cutlass','Deal 5 damage.');
 if(e.id==='gunner'){if(phase==='load')return{kind:'load',value:null,name:'Load',detail:'Load the cannon. No damage this turn.'};return phase==='fire'?attack(10,'Cannon Fire','Deal 10 damage.'):attack(3,'Recovery Shot','Deal 3 damage.');}
 if(e.id==='ironjaw')return phase==='guard'?{kind:'block',value:8,name:'Guard',detail:'Gain 8 block. Remaining block increases the next Shield Bash.'}:attack(4+s.enemyBlock,'Shield Bash',`Deal 4 + remaining block damage (${4+s.enemyBlock}). The block expires after the bash.`);
 if(e.id==='duelist'){if(phase==='riposte')return{kind:'riposte',value:2,name:'Riposte Stance',detail:'Until the next enemy action, each attack coin triggers a 2-damage counter after your attack. Block absorbs it.'};return phase==='lunge'?attack(7,'Lunge','Deal 7 damage. Riposte ends before this action.'):attack(5,'Strike','Deal 5 damage.');}
 if(phase==='fuse')return{kind:'fuse',value:null,name:'Light the Fuse',detail:'No damage now. An explosion follows next turn.'};
 if(phase==='blast')return s.turnDamage>=8?{kind:'cancelled',value:0,name:'Doused',detail:'Explosion interrupted. No damage this turn.'}:attack(12,'Powder Blast',`Deal 12 damage. Remove ${Math.max(0,8-s.turnDamage)} more enemy HP this turn to interrupt it.`);
 return attack(6,'Strike','Deal 6 damage.');
}
export function getEnemyStatus(s){if(s.riposte)return'RIPOSTE 2';if(currentEnemy(s).id==='baron'&&currentEnemy(s).pattern[s.step]==='blast')return s.turnDamage>=8?'FUSE DOUSED':`${8-s.turnDamage} HP TO INTERRUPT`;return'';}
export function hitPlayer(s,value){const absorbed=Math.min(s.block,value);s.block-=absorbed;const damage=value-absorbed;s.hp=Math.max(0,s.hp-damage);return{type:'playerHit',damage,absorbed};}
export function playCoin(s,index,rng=Math.random){if(s.busy||s.over)return[];const c=s.coins[index];if(!c||c.used)return[];
 if(s.target){c.face=1-c.face;s.target=false;return[{type:'flip',index}];}
 if(s.actions<=0)return[];const[type,baseValue]=c.faces[c.face];const upgrade=UPGRADES.find(u=>u.id===c.upgrades?.[c.face]);const value=baseValue+(type==='attaque'?(upgrade?.attack||0):0);
 if(type==='retournement'&&!s.coins.some((other,j)=>j!==index&&!other.used))return[];
 c.used=true;s.actions--;const events=[{type:'coin',index,effect:type}];
 if(type==='attaque'){
  const absorbed=Math.min(s.enemyBlock,value);s.enemyBlock-=absorbed;const damage=Math.min(s.enemy,value-absorbed);s.enemy-=damage;s.turnDamage+=damage;events.push({type:'enemyHit',damage,absorbed});
  // A defeated duelist cannot counter the killing blow.
  if(s.riposte&&s.enemy>0){events.push({type:'riposte'});events.push(hitPlayer(s,2));}
 }else if(type==='defense'){s.block+=value;events.push({type:'playerBlock',value});}
 else if(type==='actions'){s.nextActions+=value;events.push({type:'nextActions',value});}
 else{s.target=true;events.push({type:'target'});}
 applyUpgradeEffect(s,c,events,rng);checkEnd(s);return events;
}
export function resolveEnemy(s){if(s.over||s.target)return[];const e=currentEnemy(s),intent=getIntent(s),events=[];
 // Evaluate bash against the old block before its expiry.
 s.riposte=false;s.enemyBlock=0;
 if(intent.kind==='attack'){events.push({type:'enemyAttack',value:intent.value});events.push(hitPlayer(s,intent.value));}
 else if(intent.kind==='block'){s.enemyBlock=intent.value;events.push({type:'enemyBlock',value:intent.value});}
 else if(intent.kind==='riposte'){s.riposte=true;events.push({type:'stance'});}
 else{events.push({type:intent.kind});}
 s.step=(s.step+1)%e.pattern.length;checkEnd(s);return events;
}
export function nextTurn(s,rng=Math.random){if(s.over)return false;s.round++;s.block=0;s.actions=2+s.nextActions;s.nextActions=0;s.turnDamage=0;s.busy=false;drawCoins(s,rng);return true;}

export const UPGRADES = [
 {id:'balanced',name:'Boarding Kit',label:'+1 ATTACK · +1 BLOCK',attack:1,block:1,detail:'After this face resolves, deal 1 damage and gain 1 block.'},
 {id:'attack',name:'Keen Edge',label:'+2 ATTACK',attack:2,detail:'After this face resolves, deal 2 extra damage.'},
 {id:'block',name:'Iron Plating',label:'+2 BLOCK',block:2,detail:'After this face resolves, gain 2 extra block.'},
 {id:'reroll',name:'Loaded Luck',label:'REROLL',reroll:true,detail:'After this face resolves, randomly toss every other unplayed coin again. Either face can land up.'},
 {id:'action',name:'Second Wind',label:'+1 ACTION',action:1,detail:'After this face resolves, gain 1 action this turn.'}
];
export function offerUpgrades(s,rng=Math.random){if(s.outcome!=='combatVictory'||s.rewardClaimed)return[];s.reward??=shuffle(UPGRADES,rng).slice(0,3).map(u=>u.id);return s.reward.map(id=>UPGRADES.find(u=>u.id===id));}
export function forgeFace(s,coinId,side,upgradeId){if(s.outcome!=='combatVictory'||s.rewardClaimed||!s.reward?.includes(upgradeId)||![0,1].includes(side))return false;const c=s.pool.find(c=>c.id===coinId);if(!c||c.upgrades?.[side])return false;c.upgrades??=[null,null];c.upgrades[side]=upgradeId;s.rewardClaimed=true;return true;}
function applyUpgradeEffect(s,c,events,rng){const u=UPGRADES.find(u=>u.id===c.upgrades?.[c.face]);if(!u||s.hp<=0)return;
 if(u.block){s.block+=u.block;events.push({type:'playerBlock',value:u.block});}
 if(u.attack&&c.faces[c.face][0]!=='attaque'&&s.enemy>0){const absorbed=Math.min(s.enemyBlock,u.attack);s.enemyBlock-=absorbed;const damage=Math.min(s.enemy,u.attack-absorbed);s.enemy-=damage;s.turnDamage+=damage;events.push({type:'enemyHit',damage,absorbed});if(s.riposte&&c.faces[c.face][0]!=='attaque'&&s.enemy>0){events.push({type:'riposte'},hitPlayer(s,2));}}
 if(u.action){s.actions+=u.action;events.push({type:'extraAction',value:u.action});}
 if(u.reroll){s.coins.forEach((other,index)=>{if(!other.used){other.face=rng()<.5?0:1;events.push({type:'flip',index});}});}
}
