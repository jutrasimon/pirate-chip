// Original 8-bar pirate jig, synthesized locally. No external audio requests.
const MUSIC_VOLUME=.45;
let context, timer, step=0, next=0, unlocked=false;
const settings={sounds:true,music:true};
try{Object.assign(settings,JSON.parse(localStorage.getItem('pouch-audio')||'{}'));}catch{}
function ctx(){context??=new(window.AudioContext||window.webkitAudioContext)();return context;}
function note(freq,time,duration,type,volume){const a=ctx(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume*MUSIC_VOLUME,time+.008);g.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(g).connect(a.destination);o.start(time);o.stop(time+duration+.02);}
const melody=[69,72,76,76,74,72,71,74,77,77,76,74,72,76,79,81,79,76,74,72,71,69,68,71,69,72,76,81,79,76,74,77,81,79,77,74,72,76,79,76,74,72,71,68,71,69,69,0];
const roots=[45,47,48,40,45,50,48,40];
function tick(){if(!settings.music||!unlocked||document.hidden)return;const a=ctx();if(next<a.currentTime)next=a.currentTime+.04;while(next<a.currentTime+.18){const m=melody[step%48],beat=step%6,root=roots[Math.floor(step/6)%8];if(m)note(440*2**((m-69)/12),next,.16,'triangle',.065);if(beat===0||beat===3){note(440*2**((root+(beat===3?7:0)-69)/12),next,.24,'triangle',.09);note(beat===0?65:100,next,.07,'sine',.1);}if(beat===2||beat===5)note(1600,next,.025,'square',.006);step++;next+=60/132/3;}}
export function unlockAudio(){if(unlocked)return;try{unlocked=true;ctx().resume();timer=setInterval(tick,60);tick();}catch{unlocked=false;}}
export function audioSettings(){return {...settings};}
export function toggleAudio(key){settings[key]=!settings[key];try{localStorage.setItem('pouch-audio',JSON.stringify(settings));}catch{}unlockAudio();return settings[key];}
export function tone(freq=300,duration=.12,type='sine',volume=.06,slide=0){if(!settings.sounds||!unlocked)return;try{unlockAudio();const a=ctx(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,a.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(slide,a.currentTime+duration);g.gain.setValueAtTime(volume,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+duration);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+duration);}catch{}}
export function noise(duration=.15,volume=.1){if(!settings.sounds||!unlocked)return;try{unlockAudio();const a=ctx(),b=a.createBuffer(1,Math.ceil(a.sampleRate*duration),a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const source=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();source.buffer=b;f.type='lowpass';f.frequency.value=2200;g.gain.value=volume;source.connect(f).connect(g).connect(a.destination);source.start();}catch{}}
document.addEventListener('pointerdown',unlockAudio,{once:true});document.addEventListener('keydown',unlockAudio,{once:true});document.addEventListener('visibilitychange',()=>{if(!context)return;if(document.hidden)context.suspend();else{context.resume();next=context.currentTime+.05;}});
