/* PAW PRISM / CD STUDIO / an independently implemented animal-and-color puzzle */
(() => {
"use strict";
const byId=id=>document.getElementById(id);
const TAU=Math.PI*2, GRID=23, CELL=18.6, X0=106, Y0=104;
// Four highly distinguishable pigments, and exactly one fixed-color pet
// for each. No brown, orange, black, purple or rainbow/wildcard ammunition.
// The colors match art-v19-four-colors.js EXACTLY.
const COLORS=[
 {hex:"#E83B54",name:"红色",mark:"♥"},
 {hex:"#F9CF39",name:"黄色",mark:"★"},
 {hex:"#348CF3",name:"蓝色",mark:"◆"},
 {hex:"#32BD6B",name:"绿色",mark:"✿"}
];
const PETS=[
 {name:"狐狸",kind:"fox",color:0,skill:"灵巧推进",base:COLORS[0].hex,shadow:"#AC2839"},
 {name:"小黄鸭",kind:"chick",color:1,skill:"暖心鼓励",base:COLORS[1].hex,shadow:"#CC9A18"},
 {name:"大象",kind:"elephant",color:2,skill:"稳固",base:COLORS[2].hex,shadow:"#1661B7"},
 {name:"青蛙",kind:"frog",color:3,skill:"林间活力",base:COLORS[3].hex,shadow:"#16834C"}
];
const PET_FOR_COLOR=COLORS.map((_,color)=>PETS.findIndex(p=>p.color===color));
if(PET_FOR_COLOR.includes(-1)||PETS.length!==4||COLORS.length!==4)
 throw new Error("Exactly four pets, four colors and one shooter for each.");
const isWild=()=>false;
const moduleMatches=(m,color)=>m.color===color;
const petTone=m=>COLORS[m.color].hex;
const petColorName=m=>COLORS[m.color].name;
const hittable=m=>visible(m.color).length;
const petKindName=m=>PETS[m.kind].kind;
const FRONT_ROWS=2,TRACK_SLOTS=6;
const SOLID_WALL_GAME=true;
function puzzleDesign(idx){
 return {pairs:0,triples:0,hidden:0,chapter:Math.floor(idx/4)+1,
  wallPhysics:true,specialSealPixels:Math.min(15,4+Math.floor(idx/2))};
}
function bondSection(line,position){
 const m=line[position];if(!m)return {start:-1,members:[]};
 if(!m.bond)return {start:position,members:[m]};
 let start=position,end=position;
 while(start>0&&line[start-1].bond===m.bond)start--;
 while(end<line.length-1&&line[end+1].bond===m.bond)end++;
 return {start,members:line.slice(start,end+1)};
}
function firstChoices(line){return line.slice(0,FRONT_ROWS);}

const LEVELS=window.PawPrismArt320.catalog;
// Calibrated from the real four-color 24-level regression baseline.
 // A good, valid color choice can always win. Poor dispatch order may lose.
// Earlier "par" was 30-70% ABOVE observed solutions, making every
// 24-level run trivial. These are measured best valid dispatch totals
// from 96 actual prior playthroughs, NOT a guessed minimum solution.
function levelRules(index){
 const data=window.PawPrismArt320.level(index);
 return {rank:LEVELS[index].rank,par:data.par||9999,maxDepartures:data.limit||9999,
  mistakes:9999,calm:0,shuffleCredits:0,campStrict:false,allowBadLaunch:true};
}

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
const seeded=seed=>()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const hexA=(hex,alpha)=>{const h=hex.slice(1);return "rgba("+parseInt(h.slice(0,2),16)+","+parseInt(h.slice(2,4),16)+","+parseInt(h.slice(4,6),16)+","+alpha+")";};
const pos=(t)=>({x:X0+t.x*CELL+CELL*.46,y:Y0+t.y*CELL+CELL*.46});
let audio=true,ac=null,toaster=null,G=null,levelNumber=0,last=performance.now(),dialogName="";
// Original CD Studio forest music and action effects can be muted separately.
// Android WebView and Chrome both require a real user interaction to start audio.
let musicEnabled=true,startedBgm=false,themePlayPending=false;
try{
 const storedMusic=localStorage.getItem("paw-prism-music-v19");
 musicEnabled=storedMusic===null?true:storedMusic==="on";
 const storedEffects=localStorage.getItem("paw-prism-sfx-v18");
 audio=storedEffects===null?true:storedEffects==="on";
}catch(e){}
const theme=byId("forestBgm");
theme.volume=.17;theme.loop=true;
function syncAudioButtons(){
 const bgmButton=byId("audioToggle"),sfxButton=byId("sfxToggle");
 bgmButton.textContent=musicEnabled?"♫":"♪̸";
 bgmButton.title=musicEnabled?"关闭原创音乐《树叶间的晨光》":"开启原创音乐《树叶间的晨光》";
 bgmButton.setAttribute("aria-pressed",musicEnabled?"true":"false");
 bgmButton.classList.toggle("music-off",!musicEnabled);
 bgmButton.classList.toggle("music-live",musicEnabled&&!theme.paused);
 sfxButton.textContent=audio?"✦ 落位音效：开":"✧ 落位音效：关";
 sfxButton.setAttribute("aria-pressed",audio?"true":"false");
 sfxButton.classList.toggle("off",!audio);
}
function tryStartTheme(){
 if(!musicEnabled||document.hidden||!theme.paused||themePlayPending)return;
 themePlayPending=true;
 try{
  const action=theme.play();
  if(action&&typeof action.then==="function"){
   action.then(()=>{startedBgm=true;themePlayPending=false;syncAudioButtons();})
         .catch(()=>{themePlayPending=false;syncAudioButtons();});
  }else{startedBgm=true;themePlayPending=false;syncAudioButtons();}
 }catch(e){themePlayPending=false;}
}
function setMusicEnabled(wanted){
 musicEnabled=!!wanted;
 try{localStorage.setItem("paw-prism-music-v19",musicEnabled?"on":"off");}catch(e){}
 if(musicEnabled)tryStartTheme();else theme.pause();
 syncAudioButtons();
}

// Construction is the only playable direction. Blueprint view is optional.
let visualMode="build";
try{visualMode=localStorage.getItem("paw-prism-build-guide-v1")==="on"?"blueprint":"build";}catch(e){}
let progress={opened:1,stars:{},master:{}};
try{
 const current=localStorage.getItem("paw-prism-save-v320");
 const saved=current||localStorage.getItem("paw-prism-save-v20")||localStorage.getItem("paw-prism-save-v199");
 const raw=JSON.parse(saved||"null");
 if(raw&&raw.opened)progress={opened:clamp(raw.opened,1,LEVELS.length),stars:current?(raw.stars||{}):{},master:current?(raw.master||{}):{}};
}catch(e){}
function persist(){if(new URLSearchParams(location.search).has("qa"))return;try{localStorage.setItem("paw-prism-save-v320",JSON.stringify(progress));}catch(e){}}
// Resume at the last selected unlocked stage after an app process restart.
// Full in-level state (shots/ammo) is NOT saved, so the level restarts cleanly.
// Do not pollute players' progress when automated QA iterates locked stages.
const CURRENT_LEVEL_KEY="paw-prism-current-level-v320";
function persistSelectedLevel(idx){
 if(new URLSearchParams(location.search).has("qa"))return;
 try{localStorage.setItem(CURRENT_LEVEL_KEY,String(clamp(idx,0,LEVELS.length-1)));}
 catch(e){}
}
function rememberedLevel(){
 let idx=0;
 try{
  const raw=localStorage.getItem(CURRENT_LEVEL_KEY);
  if(raw!==null&&/^\d+$/.test(raw))idx=Number(raw);
 }catch(e){}
 return clamp(idx,0,Math.min(progress.opened-1,LEVELS.length-1));
}
function playSound(f=560,l=.09,k="sine",vol=.025){if(!audio)return;try{
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 ac=ac||new AC();if(ac.state==="suspended")ac.resume();
 const o=ac.createOscillator(),gain=ac.createGain(),t=ac.currentTime;o.type=k;
 o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(f*.7,50),t+l);
 gain.gain.setValueAtTime(vol,t);gain.gain.exponentialRampToValueAtTime(.001,t+l);
 o.connect(gain);gain.connect(ac.destination);o.start(t);o.stop(t+l+.01);
}catch(e){}}
// Bright, pleasant two-tone landing chimes. These are generated audio
// primitives, not Android/browser default voice or an external network asset.
function playLandingChime(color,accent=false){
 if(!audio)return;
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  ac=ac||new AC();
  if(ac.state==="suspended")ac.resume();
  const hz=[587.33,739.99,659.25,698.46][color]||659.25;
  const now=ac.currentTime;
  for(const [pitch,delay,level] of [[hz,0,.028],[hz*1.498,.064,accent?.020:.012]]){
   const osc=ac.createOscillator(),gain=ac.createGain(),start=now+delay;
   osc.type="sine";osc.frequency.setValueAtTime(pitch,start);
   osc.frequency.exponentialRampToValueAtTime(pitch*.96,start+.23);
   gain.gain.setValueAtTime(.0001,start);
   gain.gain.exponentialRampToValueAtTime(level,start+.014);
   gain.gain.exponentialRampToValueAtTime(.0001,start+(accent?.32:.24));
   osc.connect(gain);gain.connect(ac.destination);
   osc.start(start);osc.stop(start+(accent?.33:.25));
  }
 }catch(e){}
}
function toast(s){const el=byId("toast");el.textContent=s;el.classList.add("show");clearTimeout(toaster);toaster=setTimeout(()=>el.classList.remove("show"),2200);}
// Four deliberately contrasting forest mascots rendered from original
// 3D Blender models to 2D transparent collectible sprites.
function face(kind){
 const p=PETS[kind];
 return '<img class="pet-img" src="art/pet-'+p.kind+'.png" alt="" loading="eager" draggable="false">';
}
// All 24 original illustrations are now single centre-connected motifs.
// No floating sparkle signs or separate detached islands remain. The
// authentic, glowing centre cell is already present before the first move.
function createArt(id){
 if(!window.PawPrismArt320||window.PawPrismArt320.count!==24)
  throw new Error("Wall-safe original 24-level art pack not loaded");
 return window.PawPrismArt320.render(id);
}

const DELTAS=[[1,0],[-1,0],[0,1],[0,-1]];
function at(x,y){return x>=0&&x<GRID&&y>=0&&y<GRID?G.tiles[y*GRID+x]:null;}
// Lit, explicitly visible starting pixels grow through same-colour cardinal
// support. Distance metadata below is only cosmetic; it never gates a hit.
const ART_CX=(GRID-1)/2, ART_CY=(GRID-1)/2;
function dCenter(t){return (t.x-ART_CX)**2+(t.y-ART_CY)**2;}
function neighbors(t,tiles){
 const arr=[];
 for(const [dx,dy] of DELTAS){
  const x=t.x+dx,y=t.y+dy;
  if(x>=0&&x<GRID&&y>=0&&y<GRID){
   const n=tiles[y*GRID+x];if(n)arr.push(n);
  }
 }
 return arr;
}
// Visual-only distance metadata. A disconnected visual accent is NOT a
// different gameplay island, seed, layer gate or hidden targeting rule.
// Every pixel participates in the SAME live raycast, regardless of geometry.
function assignGrowthLayers(tiles){
 let maxLayer=0;
 for(const t of tiles){
  if(!t)continue;
  const radius=Math.max(Math.abs(t.x-11),Math.abs(t.y-11));
  t.growthLayer=radius;t.growthDepth=radius;t.growthIsland=0;
  maxLayer=Math.max(maxLayer,radius);
 }
 return {seeds:tiles.filter(t=>t&&t.lit).map(t=>({
   x:t.x,y:t.y,color:t.c,layer:0,component:0,size:1,end:maxLayer})),maxLayer};
}
// IMMEDIATE CARDINAL CONNECTION: a legally fired cube becomes a solid
// luminous connector AT THE FIRING INSTANT. The bullet sprite and landing
// chime are cosmetic; the next frame may use this newly lit cell.
// This never auto-paints an adjacent pixel and never penetrates a lit wall.
function availableAsConnector(n,a=null){
 return !!n && n.lit;
}
// Every edge uses the same rule: the immediately INWARD neighbour must
// already be lit and have the target's colour, and the outward ray is clear.
function clearOutwardRay(t,edge){
 const d=FACING[edge];if(!d)return false;
 for(let x=t.x-d.dx,y=t.y-d.dy;x>=0&&x<GRID&&y>=0&&y<GRID;x-=d.dx,y-=d.dy){
  const wall=at(x,y);if(wall&&wall.lit)return false;
 }
 return true;
}
function directionalSupport(t,edge){
 const d=FACING[edge];if(!d||!t)return null;
 const support=at(t.x+d.dx,t.y+d.dy);
 return support&&support.lit&&support.c===t.c?support:null;
}
function legalTarget(t,a=null,edge=null){
 if(!G||G.done||!t||t.lit||t.hp<=0||(a&&a.pet.color!==t.c))return false;
 const edges=edge?[edge]:["top","bottom","left","right"];
 return edges.some(side=>directionalSupport(t,side)&&clearOutwardRay(t,side));
}
function growthTargets(){
 if(!G)return [];
 return G.tiles.filter(t=>t&&!t.lit&&t.growthLayer===G.growthLayer);
}
function advanceGrowth(){
 if(G.lit>=G.total)return;
 if(growthTargets().length)return;
 const previous=G.growthLayer;
 while(G.growthLayer<=G.maxGrowthLayer&&!growthTargets().length)G.growthLayer++;
 if(G.growthLayer>previous){
  const next=growthTargets();
  if(next.length){
   const newIsland=G.seeds.find(v=>v.layer===G.growthLayer);
   if(newIsland){
    G.labels.push({x:320,y:132,ttl:1.2,text:"新的色块正在成形 ✦",col:2});
   }else if(G.growthLayer%3===0){
    G.labels.push({x:320,y:135,ttl:1.05,text:"向外生长 ✦",col:1});
   }
  }
 }
}
// Unlit blueprints are transparent. Stop at the first LIVE solid wall.
// Only its immediately adjacent cell on the animal-facing side can grow.
// This geometric query deliberately ignores per-animal pass quotas, so
// readiness, deadlocks and next-lap forecasts describe the actual board.
function rayCandidate(edge,index,color=null,a=null){
 const d=FACING[edge];
 if(!d||index<0||index>=GRID)return {candidate:null,blocker:null,support:null};
 const vertical=edge==="top"||edge==="bottom";
 const positive=edge==="top"||edge==="left";
 for(let i=positive?0:GRID-1;i>=0&&i<GRID;i+=positive?1:-1){
  const wall=vertical?at(index,i):at(i,index);
  if(!wall||!wall.lit)continue;
  const target=at(wall.x-d.dx,wall.y-d.dy);
  const valid=target&&!target.lit&&target.hp>0&&target.c===wall.c&&
   (color===null||target.c===color);
  return {candidate:valid?target:null,blocker:wall,support:valid?wall:null};
 }
 return {candidate:null,blocker:null,support:null};
}
function frontSurface(){
 if(G.surfaceCache?.revision===G.boardRevision)return G.surfaceCache.tiles;
 const first=new Set();
 for(let i=0;i<GRID;i++)for(const edge of ["top","bottom","left","right"]){
  const t=rayCandidate(edge,i).candidate;if(t)first.add(t);
 }
 const tiles=[...first];G.surfaceCache={revision:G.boardRevision,tiles};return tiles;
}
function visible(color){return frontSurface().filter(t=>t.c===color);}
function anyVisible(){return frontSurface();}
function allColor(color){return G.tiles.filter(v=>v&&!v.lit&&v.c===color);}
function getScore(){return G.score.toLocaleString("en-GB");}
function spawnModules(tiles,seed,index=levelNumber){
 const ran=seeded(seed),need=Array(COLORS.length).fill(0),modules=[];
 tiles.forEach(t=>{if(t)need[t.c]+=t.hp;});
 let id=0;
 need.forEach((quantity,color)=>{
  // Uniform, conserved and BALANCED ammo distribution: never leave a
  // tiny last animal because of arbitrary random batch splitting.
  // Every level uses the same rule; no first-level duck override.
  if(quantity<=0)return;
  const capacity=window.PawPrismArt320.level(index).capacity||28;
  const groups=Math.ceil(quantity/capacity),base=Math.floor(quantity/groups);
  const extra=quantity%groups;
  for(let i=0;i<groups;i++){
   const amount=base+(i<extra?1:0);
   modules.push({id:id++,color,energy:amount,max:amount,
    kind:PET_FOR_COLOR[color],usedEver:0});
  }
 });
 for(let i=modules.length-1;i>0;i--){const j=Math.floor(ran()*(i+1));[modules[i],modules[j]]=[modules[j],modules[i]];}
 // Exact fixed-color energy is conserved. There is no universal pet.
 return modules;
}
function dealMixedForestQueues(modules,idx,random){
 // Puzzle difficulty belongs to the PIXEL GEOMETRY, not artificially
 // burying the only shootable color under many other-color animals.
 // Keep every remaining color accessible via at least one front gate.
 // The most common color gets a second lane; no linked/hidden mechanics.
 const queue=Array.from({length:5},()=>[]);
 const count=[0,0,0,0];modules.forEach(m=>count[m.color]+=m.energy);
 const split=idx<4?-1:count.indexOf(Math.max(...count)),parity=[0,0,0,0];
 for(const m of modules){
  const lane=m.color===split&&(parity[m.color]++%2===0)?4:m.color;
  queue[lane].push(m);
 }
 return queue;
}
function makeLevelQueues(modules,idx,random){
 // Plain visible single animals only. Complexity comes from the image
 // topology, not hidden identities, linked dispatch or extra waiting slots.
 return dealMixedForestQueues(modules,idx,random);
}
function begin(idx,mode="story"){
 idx=clamp(idx,0,LEVELS.length-1);levelNumber=idx;
 persistSelectedLevel(idx);
 const ran=seeded(3025+idx*1447),art=createArt(LEVELS[idx].art);
 const tiles=art.map((c,i)=>{
  if(c===null)return null;
  const special=window.PawPrismArt320.markers(idx).includes(i);
  return {x:i%GRID,y:Math.floor(i/GRID),c,hp:1,max:1,sealKey:special,lit:false,litWhen:0,
   connectorReadyAt:0,
   blossom:idx>=2&&ran()<.055,blossomDone:false,pulse:0};
 });
 const total=tiles.filter(Boolean).length;
 // Each disconnected same-colour region needs a real, visible starting
 // pixel. These explicit level seeds preserve all artwork coordinates and
 // colours; they are solid from the start and consume no animal ammunition.
 const seedIndices=window.PawPrismArt320.level(idx).seeds;
 if(!seedIndices?.length||!seedIndices.includes(11*GRID+11))
  throw Error("Level "+(idx+1)+" lacks its explicit centre/start data");
 for(const i of seedIndices){
  const t=tiles[i];if(!t)throw Error("A starting pixel must belong to the artwork");
  t.lit=true;t.litWhen=0;t.connectorReadyAt=0;t.hp=0;
  t.max=1;t.blossom=false;t.pulse=0;t.starter=true;
 }
 const growth=assignGrowthLayers(tiles),initialLit=seedIndices.length;
 // Ammo counts only the remaining unlit pixels, once per pixel.
 const modules=spawnModules(tiles,3300+idx*388,idx);
 const rules=levelRules(idx);
 G={idx,mode:mode==="master"?"master":"story",tiles,homes:[[],[],[],[],[]],rest:[],active:[],total,lit:initialLit,score:0,actions:0,
  boardRevision:0, // Every legal shot increments this universal state version.
  difficulty:rules.rank,parActions:rules.par,moveLimit:mode==="master"?rules.par:rules.maxDepartures,
  mistakeLimit:9999,misses:0,mistakePressure:0,
  shuffleCredits:0,shuffleArmed:false,
  campStrict:false,overflows:0,deadlockTiles:[],
  allowBadLaunch:true,outcome:"playing",lossReason:"",
  growthLayer:0,maxGrowthLayer:growth.maxLayer,seeds:growth.seeds,
  growthHistory:growth.seeds.map(t=>({x:t.x,y:t.y,color:t.color,layer:0,time:0,starter:true})),
  stress:0,peak:0,calm:rules.calm,combo:1,streak:0,lastHit:-100,phase:0,time:0,lastUI:0,
  particles:[],bolts:[],flights:[],impactRings:[],labels:[],fades:[],displayLit:initialLit,
  lastLandingSound:-5,landingCount:0,done:false,paused:false,hitCount:initialLit,chainCount:0,
  lastRescue:0,badFlights:0,moduleCount:modules.length,harmony:0,harmonyUses:0,lastLaunch:-20,rapidLaunches:0,maxRest:0,
  hintMessage:"",hintUntil:0,
  dispatchHistory:[],shots:[],blockedRays:0,queueRotations:0,dispatchSequence:0,flightGroups:new Map(),
  sky:Array.from({length:85},()=>({x:ran()*640,y:ran()*640,size:ran()*1.8+.5,freq:ran()*1.5+.4}))};
 // All starts are visible now. No hidden or automatic seeds are added later.
 advanceGrowth();
 // A physical fence lane is not a species enclosure: each lane may hold
 // All four colors can share any of the five lanes. Preserve independent
 // front-gate semantics and always expose useful colors at the beginning.
 G.homes=makeLevelQueues(modules,idx,ran);
 const data=LEVELS[idx];
 byId("chapterLabel").textContent="CHAPTER "+String(Math.floor(idx/4)+1).padStart(2,"0");
 byId("levelTag").textContent=data.chapter+" · "+data.rank;
 byId("levelName").textContent=data.name;
 byId("levelHint").textContent="本关："+data.hint;
 byId("missionPortrait").src="art/portraits-v320/stage-"+String(idx+1).padStart(2,"0")+".png";
 byId("missionPortrait").alt=data.kind+"完整目标图案";
 byId("difficultyMark").textContent=G.mode==="master"?"精简挑战":data.rank;
 byId("masterChallenge").textContent="重开精简挑战：仅 "+G.parActions+" 次派遣";
 byId("difficultyMark").className="difficulty-chip difficulty-"+(
  data.rank==="轻松"?"easy":data.rank==="渐入佳境"?"normal":
  data.rank==="进阶"?"advanced":"hard");
 byId("levelNumber").textContent=String(idx+1).padStart(2,"0");
 byId("pixelTotal").textContent=total;
 refresh();stats();
 if(idx>0)toast("第 "+(idx+1)+" 幕 · "+data.name);
}
function strip(kind,cls){return '<span class="'+cls+'">'+face(kind)+'</span>';}
// In this 0->1 puzzle the outer, still-ghost pixels are NOT all available
// at the current wave. Explain the real shootable palette before consuming
// a pet, rather than allowing a silent no-ammo-loss lap.
function currentColors(){
 return [...new Set(anyVisible().map(t=>t.c))];
}
function unavailableReason(m){
 const waiting=G.tiles.filter(t=>t&&!t.lit&&(isWild(m)||t.c===m.color));
 const label=isWild(m)?"万能色":COLORS[m.color].name;
 if(!waiting.length)return label+"像素已全部点亮，这只动物暂时不用出发。";
 const open=visible(m.color);
 if(open.length)return label+"还有"+open.length+"个有同色支撑、可从对应方向命中的目标。";
 const choices=currentColors().map(i=>COLORS[i].name).join("、");
 return label+"仍有未亮格，但暂时没有方向正确的同色支撑射线。先安排"+
  (choices||"其它颜色")+"，或重新挑战避免死局。";
}
// Physically posed pair and trio portraits are baked from the original Blender
// characters, including their true paws. They are rendered as ONE 3D group.
// No independent SVG cords, body overlays or fake limb strokes exist here.
// One physical vertical lane per home, with uniformly sized characters.
// The source of truth remains G.homes: every creature on-screen is genuine.
function homeHtml(home,i){
 if(!home.length)return '<div class="home-empty"><span class="pen-bloom">✿</span></div>';
 const column=home.slice(0,12).map((item,j)=>{
  const chosen=j<FRONT_ROWS,label=PETS[item.kind].name+
   " · "+petColorName(item)+" · "+item.energy+"发";
  return '<span class="pen-animal'+(chosen?' pen-selectable':' pen-locked')+
   (j===0?' pen-leader':'')+
   '" data-position="'+j+'" data-module="'+item.id+
   '" data-color="'+item.color+
   '" role="'+(chosen?'button':'presentation')+'"'+(chosen?' tabindex="0"':'')+
   ' aria-label="'+(chosen?'点击出发：':'等待：')+label+'" title="'+label+'">'+
   strip(item.kind,'pen-portrait')+'<span class="pen-ammo-tag">'+item.energy+'</span></span>';
 }).join('');
 return '<div data-house="'+i+'" class="home" role="group" aria-label="第'+(i+1)+'列，前两只可选择">'+
  '<div class="pen-animals">'+column+
  (home.length>12?'<span class="pen-overflow">还有'+(home.length-12)+'只</span>':'')+
  '</div><span class="pen-floor"></span></div>';
}
function refresh(){
 if(!G)return;
 byId("homeGrid").innerHTML=G.homes.map(homeHtml).join("");
 byId("gateStrip").innerHTML=G.homes.map((line,i)=>
  '<button type="button" class="pen-gate" data-gate="'+i+'"'+
  ' title="第'+(i+1)+'列木门：点击让第一排出发"'+
  ' aria-label="第'+(i+1)+'列，点击第一排动物出发">'+
  '<span class="gate-post gate-post-left"></span><span class="gate-post gate-post-right"></span>'+
  '<span class="gate-panel gate-panel-left"></span><span class="gate-panel gate-panel-right"></span>'+
  '<span class="gate-paw">❀</span></button>').join("");
 byId("nextGrid").innerHTML=G.homes.map(h=>
  '<div class="upcoming-cell">'+(h.length>1?h.slice(1,3).map(m=>
  '<span class="peek-face '+(isWild(m)?'wildcard':'')+'" style="--tone:'+petTone(m)+'" title="'+PETS[m.kind].name+' · '+petColorName(m)+'">'+face(m.kind)+'</span>').join(""):
  '<span class="peek-none">✧</span>')+'</div>').join("");
 orbitUpdate();stats();
}
function orbitUpdate(){
 if(!G)return;
 byId("orbitGrid").innerHTML=G.active.map(a=>{
  const m=a.pet,p=PETS[m.kind],tone=petTone(m);
  return '<div class="orbit-member" style="--tone:'+tone+'">'+strip(m.kind,"tiny-face")+
   '<div class="orbit-content"><strong>'+p.name+'</strong><small>方轨 · 能量 '+m.energy+'</small>'+
   '<div class="tiny-bar"><i style="width:'+(m.energy/m.max*100)+'%"></i></div></div></div>';
 }).join("")+Array.from({length:Math.max(0,3-G.active.length)},()=>'<div class="orbit-empty">✧ 空闲轨道</div>').join("");
}
function syncLitHUD(){
 if(!G)return;
 const pct=Math.round(G.lit/G.total*100);
 byId("pct").textContent=pct+"%";
 byId("paintFill").style.width=pct+"%";
 byId("repaired").textContent=G.lit;
}
function stats(){
 if(!G)return;
 // Counters and sprites read the exact same live G.tiles/G.lit state,
 // not the projectile animation's landing clock or a second scoreboard.
 syncLitHUD();
 byId("actions").textContent=G.actions;
 byId("moveLimit").textContent=G.moveLimit;
 byId("missCount").textContent=G.misses;
 byId("challengeStrip").classList.toggle("near-limit",G.moveLimit-G.actions<=3&&!G.done);
 byId("dispatchRule").textContent="点击一次，只跑一圈 · 余弹回原列队尾";
 byId("efficiencyGoal").textContent="三星目标：不超过 "+G.parActions+" 次派遣，且无空跑";
 byId("runScore").textContent=getScore();
 byId("queueCount").textContent=G.homes.reduce((a,h)=>a+h.length,0)+" 只待命";
 byId("orbitCount").textContent=G.active.length+" / "+TRACK_SLOTS;


 const existing=G.homes.map(h=>h[0]).filter(Boolean),n=Math.max(0,...existing.map(hittable));

 const remaining=G.total-G.lit;
 const currentSeed=G.seeds.slice().reverse().find(v=>v.layer<=G.growthLayer)||G.seeds[0];
 const ring=G.growthLayer-currentSeed.layer;
 byId("canvasStatus").textContent=G.done&&remaining===0?"从 0 到 1 · 创作完成 ✦":
   "单次派遣一圈 · 同一射线每次经过一格";
 byId("totalStars").textContent=Object.values(progress.stars).reduce((a,b)=>a+b,0);

 // Do not reveal which colors or gates are right before launch.
 // Visible navigation only shows remaining moves and progress,
 // never reveals a "correct door", "ready color", or best next move.
 byId("forecastText").textContent=G.done?"本次闯关结束":
  "面向动物的同色相邻格才能点亮 · 亮格会挡住后方射线";

}
// Original clockwise square racecourse. The shooter and all targeting beams
// share this exact point, so the path is real gameplay motion, not decoration.
const SQUARE_LAP_SECONDS=3.47;
// Global travel-speed boost: shorten real running laps without touching shoot rules.
const RUN_SPEED_MULTIPLIER=1.5;
const SQUARE_TRACK={left:64,top:64,right:576,bottom:576};
const GATE_ENTRY_TIME=.52;
const GATE_RETURN_TIME=.28;
const GATE_X=i=>64+128*clamp(i,0,4);
// Every member of a linked pair/triple occupies its OWN position on the
// same square track, separated by about 100 px of path distance.
// Actual firing uses these identical positions, not a cosmetic offset.
const BUDDY_GAP_SECONDS=.175;
const RUN_LAP_LIMIT=SQUARE_LAP_SECONDS+GATE_ENTRY_TIME;
function runnerSpeed(pet){
 const ratio=clamp(pet.energy/Math.max(1,pet.max),0,1);
 const fatigue=clamp((.48-ratio)/.48,0,1);
 return RUN_SPEED_MULTIPLIER*(1+1.28*fatigue*fatigue);
}
function flightSpeed(id){
 const members=G.active.filter(a=>a.flightId===id);
 // All linked members accelerate TOGETHER, preserving the physical gap.
 return members.length?Math.max(...members.map(a=>runnerSpeed(a.pet))):1;
}
function canHitOnNextLap(a){
 if(G.done||a.pet.energy<=0)return false;
 if(!G.tiles.some(t=>t&&!t.lit&&t.c===a.pet.color))return false;
 for(const edge of ["bottom","left","top","right"])
  for(let i=0;i<GRID;i++)
   if(rayCandidate(edge,i,a.pet.color).candidate)return true;
 // All hits are already committed. Cosmetic arrivals cannot open a ray.
 return false;
}
function squareRoute(progress,lane=1){
 const inset=(lane-1)*6;
 const x1=SQUARE_TRACK.left+inset, y1=SQUARE_TRACK.top+inset;
 const x2=SQUARE_TRACK.right-inset, y2=SQUARE_TRACK.bottom-inset;
 const side=x2-x1;
 const p=((progress%1)+1)%1*4;
 if(p<1)return {x:x1+p*side,y:y1,edge:"top"};
 if(p<2)return {x:x2,y:y1+(p-1)*side,edge:"right"};
 if(p<3)return {x:x2-(p-2)*side,y:y2,edge:"bottom"};
 return {x:x1,y:y2-(p-3)*side,edge:"left"};
}
function routeProgress(a){
 const doorX=GATE_X(a.origin===undefined?0:a.origin);
 const local=a.time-(a.formationOffset||0);
 const start=(2+(SQUARE_TRACK.right-doorX)/(SQUARE_TRACK.right-SQUARE_TRACK.left))/4;
 return start+(local-GATE_ENTRY_TIME)/SQUARE_LAP_SECONDS;
}
function orbitPos(a){
 const doorX=GATE_X(a.origin===undefined?0:a.origin);
 const local=a.time-(a.formationOffset||0);
 if(local<0)return {x:doorX,y:641,edge:"bottom",entering:true,waiting:true};
 if(local<GATE_ENTRY_TIME){
  const v=clamp(local/GATE_ENTRY_TIME,0,1),e=v*v*(3-2*v);
  return {x:doorX,y:641+(SQUARE_TRACK.bottom-641)*e,edge:"bottom",entering:true};
 }
 if(local>=RUN_LAP_LIMIT){
  const v=clamp((local-RUN_LAP_LIMIT)/GATE_RETURN_TIME,0,1),e=v*v*(3-2*v);
  return {x:doorX,y:SQUARE_TRACK.bottom+(641-SQUARE_TRACK.bottom)*e,edge:"bottom",entering:true,returning:true};
 }
 return squareRoute(routeProgress(a),a.lane);
}
const FACING={
 top:{dx:0,dy:1},right:{dx:-1,dy:0},
 bottom:{dx:0,dy:-1},left:{dx:1,dy:0}
};
// The quota follows one physical alignment window, independently of the
// animal's gate/lap counter. A gate inside a window never grants a second hit.
const RAY_WINDOW_HALF=(CELL-1.5)/2+.45;
function rayVisit(a,edge,index){
 const inset=((a.lane||1)-1)*6;
 const left=SQUARE_TRACK.left+inset,top=SQUARE_TRACK.top+inset;
 const right=SQUARE_TRACK.right-inset,bottom=SQUARE_TRACK.bottom-inset;
 const side=right-left,vertical=edge==="top"||edge==="bottom";
 const mid=(vertical?X0:Y0)+(index+.46)*CELL;
 const center=edge==="top"?(mid-left)/(4*side):
  edge==="right"?.25+(mid-top)/(4*side):
  edge==="bottom"?.5+(right-mid)/(4*side):.75+(bottom-mid)/(4*side);
 const start=center-RAY_WINDOW_HALF/(4*side),progress=routeProgress(a);
 return {key:edge+":"+index,pass:Math.floor(progress-start+1e-10),progress};
}
function frontRay(a){
 const origin=orbitPos(a),side=origin.edge,vertical=(side==="top"||side==="bottom");
 const coord=vertical?origin.x:origin.y,offset=vertical?X0:Y0;
 const index=Math.floor((coord-offset)/CELL),dir=FACING[side];
 if(origin.entering||index<0||index>=GRID)
  return {origin,side,dir,first:null,aligned:false};
 const middle=offset+(index+.46)*CELL;
 if(Math.abs(middle-coord)>RAY_WINDOW_HALF)
  return {origin,side,dir,first:null,aligned:false};
 const visit=rayVisit(a,side,index),spent=a.lastShotPass?.[visit.key]===visit.pass;
 const {candidate,blocker,support}=rayCandidate(side,index,a.pet.color);
 return {origin,side,dir,index,visit,support,spent,
  first:spent?null:candidate,aligned:true,blocked:blocker};
}
function rewardParticle(t,count=7){
 const v=pos(t),random=seeded(Math.floor(G.time*2140)+t.x*661+t.y*43);
 for(let i=0;i<count;i++){
  const angle=random()*TAU,speed=30+random()*125;
  G.particles.push({x:v.x,y:v.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
   col:t.c,life:.30+random()*.35,ttl:.48+random()*.35,r:1.1+random()*2.2});
 }
 if(G.particles.length>180)G.particles.splice(0,G.particles.length-180);
}
function strike(t,a,bonus=false,depth=0){
 // Targeting and successful-visit consumption are checked again together
 // against the live board; failed attempts consume neither ammo nor quota.
 if(!a||a.pet.energy<=0||!legalTarget(t,a,orbitPos(a).edge))return false;
 const shotRay=frontRay(a);
 if(shotRay.first!==t)return false;
 if(!moduleMatches(a.pet,t.c))throw new Error("An animal fired an incompatible color.");
 if(!a.lastShotPass)a.lastShotPass=Object.create(null);
 a.lastShotPass[shotRay.visit.key]=shotRay.visit.pass;
 const from=a?orbitPos(a):null,dest=pos(t);
 // Keep underlying target resolution deterministic, but show a visible
 // SAME-ROW/SAME-COLUMN flying colour cube before it becomes solid.
 let flight=null;
 if(a){
  const vertical=from.edge==="top"||from.edge==="bottom";
  const end=vertical?{x:from.x,y:dest.y}:{x:dest.x,y:from.y};
  const distance=Math.hypot(end.x-from.x,end.y-from.y);
  const duration=clamp(.34+distance/810,.46,.80);
  flight={x:from.x,y:from.y,tx:end.x,ty:end.y,ttl:duration,life:duration,
   col:t.c,bonus,tile:t,finishing:false};
  G.flights.push(flight);
  if(G.shots.length<1000)G.shots.push({
    from:{x:from.x,y:from.y},to:end,edge:from.edge,kind:a.pet.kind,color:t.c,
    wild:isWild(a.pet),reservedColor:a.pet.color,
    hit:{x:t.x,y:t.y,c:t.c},time:G.time,
    support:{x:shotRay.support.x,y:shotRay.support.y,c:shotRay.support.c},
    animalId:a.pet.id,dispatchId:a.flightId,
    rayKey:shotRay.visit.key,rayPass:shotRay.visit.pass,
    routeProgress:shotRay.visit.progress,animalClock:a.time,
    connectedTo:neighbors(t,G.tiles).filter(n=>n.lit)
       .map(n=>({x:n.x,y:n.y,c:n.c})),
    boardRevisionBefore:G.boardRevision||0,
    boardRevisionAfter:(G.boardRevision||0)+1,
    rayDirection:from.edge,
    inwardFrom:from.edge,
    islandSeed:false,
    liveConnectionTime:G.time,
    lapId:a.lapId||0
  });
 }
 t.hp--;
 if(!a){t.pulse=1;rewardParticle(t,bonus?12:5);}
 if(t.hp>0){G.score+=20;return true;}
 // The authoritative action commits NOW, not after the travelling
 // projectile animation. The next shot must see the updated 2, 3...
 // live pixels. The screen draws the new square immediately too.
 t.lit=true;t.litWhen=G.time;t.connectorReadyAt=G.time;
 if(flight)flight.finishing=true;
 G.lit++;G.displayLit=G.lit;G.boardRevision=(G.boardRevision||0)+1;G.hitCount++;
 syncLitHUD();
 G.growthHistory.push({x:t.x,y:t.y,color:t.c,layer:t.growthLayer,time:G.time});
 advanceGrowth();
 G.streak=G.time-G.lastHit<1.4?Math.min(100,G.streak+1):1;
 G.combo=Math.min(8,1+Math.floor(G.streak/6));G.lastHit=G.time;
 G.score+=65+G.combo*20+(bonus?25:0)+(G.active.length>=2?18:0);
 G.harmony=clamp(G.harmony+(bonus?1.1:4.6),0,100);
 G.stress=clamp(G.stress-(bonus?.8:.72),0,100);
 // Landing (not firing) will play the positive chime and ripple.
 if(!flight){
  G.landingCount++;
  if(G.time-G.lastLandingSound>.065){playLandingChime(t.c,G.landingCount%5===0);G.lastLandingSound=G.time;}
 }
 if(G.streak%9===0)G.labels.push({x:dest.x,y:dest.y-18,ttl:1.1,text:"共鸣 ×"+G.combo,col:2});
 if(t.blossom&&!t.blossomDone){
  t.blossomDone=true;G.chainCount++;G.stress=Math.max(0,G.stress-2);
  G.labels.push({x:dest.x,y:dest.y-15,ttl:1.1,text:"花火加油!",col:1});
  // A blossom grants score/morale only: NEVER paints pixels off the ray.
  G.score+=35;
  playSound(610,.12,"sine",.012);
 }
 if(G.lit>=G.total&&!G.done){
  G.done=true;G.outcome="won";G.phase=1;const completed=G;setTimeout(()=>{if(G===completed)end(true);},1340);
 }else{
  // Logical closure belongs to the same atomic board commit as this hit.
  // Cosmetic flights cannot delay failure or permit extra post-loss shots.
  resolveSealedDeadlock();
 }
 return true;
}
// Pixel targeting has no projectile-animation-specific veto.
function chooseTarget(a){
 return frontRay(a).first;
}
function fire(a){
 if(a.returning)return false;
 const target=chooseTarget(a);if(!target)return false;
 if(!strike(target,a))return false; // No phantom ammo on a failed hit.
 a.pet.energy--;a.used++;a.pet.usedEver++;
 const kind=PETS[a.pet.kind].kind;
 if(kind==="elephant")G.stress=Math.max(0,G.stress-1.05);
 if(kind==="chick"&&a.used%5===0)G.stress=Math.max(0,G.stress-1.9);
 // Each fire event builds at MOST one tile, including the fox skill.
 if(kind==="fox"&&a.used%4===0){
  G.harmony=clamp(G.harmony+1.5,0,100);
  G.stress=Math.max(0,G.stress-.5);
 }
 if(kind==="frog"&&a.used%6===0){
  G.harmony=clamp(G.harmony+4,0,100);
 }
 // As soon as the LAST physical projectile fires the pet leaves the
 // square immediately at THAT position. Never draw a zero-ammo runner,
 // wait for a corner, or animate it returning to its starting gate.
 if(a.pet.energy===0){
  const group=G.flightGroups.get(a.flightId);
  const living=G.active.filter(m=>m.flightId===a.flightId);
  // Single pet: shrink away at the EXACT shot position, never walk home.
  // Linked group: if any still has ammunition, continue back to the
  // ORIGINAL gate TOGETHER and queue the survivors at the very end.
  // Only an entirely spent linked group vanishes on the track.
  if(!group?.isLinked)retire(a);
  else if(!living.some(m=>m.pet.energy>0)&&!group.returning.length){
   for(const member of [...living])retire(member);
  }
 }
 return true;
}
// Physical entry at one of five separately animated wooden doors. The
// motion is cosmetic, while orbitPos(a) models the same own-gate movement
// with game time and is therefore deterministic in QA/Android.
// Only ONE sprite represents each pet, drawn by the authoritative canvas.
// Older versions created an extra DOM <img class=gate-runner> for 540 ms,
// which overlapped the canvas pet and looked like a second runner.
// Keep the wooden gate opening, never clone or overlay the animal.
function animateGateEntry(index,kind,rank=0){
 const door=byId("gateStrip").querySelector('[data-gate="'+index+'"]');
 if(!door)return;
 door.classList.remove("gate-open");
 void door.offsetWidth;
 door.classList.add("gate-open");
 setTimeout(()=>door.classList.remove("gate-open"),560);
}
// The gate always selects row 1; tapping the actual row 2 picks row 2.
// A linked pair/triple departs as ONE synchronized decision. The move
// budget counts creatures rather than clicks, so chains do not bypass
// difficulty limits. The returning survivors stay physically linked.
function launch(source,index,position=0){
 if(!G||G.paused||G.done)return false;
 if(G.actions>=G.moveLimit){toast("本关派遣次数已用完，等待在途伙伴完成这一圈。");return false;}
 const line=source==="house"?G.homes[index]:null;
 if(source==="house"&&(!line||!line.length))return false;
 if(source==="house"&&(position<0||position>=FRONT_ROWS||position>=line.length))
  return false;
 if(source==="rest"&&(index<0||index>=G.rest.length))return false;
 const group=source==="house"?bondSection(line,position):
  {start:index,members:[G.rest[index]]};
 if(!group.members.length)return false;
 const count=group.members.length;
 if(G.active.length+count>TRACK_SLOTS){
  toast("跑道暂时满了，等伙伴回到围栏再派出");
  playSound(195,.13,"triangle",.014);return false;
 }

 // No pre-dispatch color validation. Every animal in either front row
 // may leave, including an unknown color. Bad choices can burn an entire
 // lap and count as ONE failed decision when nothing was constructed.
 const crew=source==="house"?line.splice(group.start,count):G.rest.splice(index,1);
 const home=source==="house"?index:(crew[0].orig||0);
 const serial=++G.dispatchSequence;
 const flight={id:serial,lane:home,remaining:crew.length,used:0,returning:[],startedAt:G.time,
  members:crew.map(m=>m.id),allColors:crew.map(m=>m.color),isLinked:crew.length>1};
 G.flightGroups.set(serial,flight);
 const oldActive=G.active.length;
 // Every active animal reads currently LANDED, cardinally connected
 // pixels when each bullet is fired, including earlier shots this lap.
 for(let i=0;i<crew.length;i++){
  const m=crew[i];m.orig=home;m.revealed=true;
  if(PETS[m.kind].color!==m.color)throw Error("Animal color corruption");
  const formationOffset=count>1?i*BUDDY_GAP_SECONDS:0;
  const a={pet:m,time:0,
   fireDelay:GATE_ENTRY_TIME+formationOffset+.001,used:0,
   formationOffset,completedLaps:0,returning:false,travelSpeed:1,lastShotPass:Object.create(null),
   startedUnready:hittable(m)===0,origin:home,
   lane:1,flightId:serial,lapId:serial};
  G.active.push(a);
 }
 const rapid=G.time-G.lastLaunch<1.4;G.lastLaunch=G.time;
 if(rapid)G.rapidLaunches++;
 G.actions+=count;
 G.stress=clamp(G.stress+.65+oldActive*.45+(count-1)*.9,0,100);
 playSound(400+34*crew[0].color,.13,"triangle",.03);
 refresh();
 crew.forEach((m,i)=>animateGateEntry(home,m.kind,i));
 if(G.actions===1)toast("点击一次只跑一圈；有余弹就回到原列队尾，需要再次点击才出发。");
 return true;
}
function retire(a){
 const i=G.active.indexOf(a);if(i<0)return;
 G.active.splice(i,1);
 const flight=G.flightGroups.get(a.flightId);
 if(!flight)throw Error("Lost linked-return record");
 flight.remaining--;
 flight.used+=a.used;
 if(a.pet.energy>0)flight.returning.push(a.pet);
 else{
  // Capture the real pixel at retirement BEFORE deleting the runner.
  const p=orbitPos(a);
  if(!G.fades)G.fades=[];
  G.fades.push({x:p.x,y:p.y,kind:a.pet.kind,color:a.pet.color,
    bounce:a.time,remaining:0,life:.46,ttl:.46});
  playSound(720,.075,"sine",.016);
 }
 if(flight.remaining>0){orbitUpdate();return;}
 const ordered=flight.members.map(id=>flight.returning.find(m=>m.id===id)).filter(Boolean);
 if(ordered.length<2)ordered.forEach(m=>{m.bond=0;m.bondBorn=0;});
 // If some partners spent all their ammunition, the surviving two of
 // a triple remain linked. A sole survivor becomes a normal single.
 G.homes[flight.lane].push(...ordered);
 G.flightGroups.delete(flight.id);
 if(G.dispatchHistory)G.dispatchHistory.push({id:flight.id,lane:flight.lane,
  members:flight.members,used:flight.used,startedAt:flight.startedAt,endedAt:G.time,
  returned:ordered.map(m=>({id:m.id,color:m.color,energy:m.energy})),
  completeLap:!!a.completedLaps,finalClock:a.time,returning:!!a.returning});
 if(flight.used===0){
  G.misses++;
  toast("当前颜色暂无合法射线；动物已返回原列队尾。注意别点亮封锁关键格太早。");
  playSound(230,.14,"triangle",.017);
 }
 refresh();

}
function calm(){
 if(!G||G.paused||G.done||!G.calm||G.stress<8)return false;
 G.calm--;G.stress=Math.max(0,G.stress-46);
 G.labels.push({x:320,y:150,ttl:1.3,text:"心情平复 -46%",col:1});
 toast("安抚成功！伙伴们更有精神了");playSound(760,.19,"sine",.022);
 stats();return true;
}
function triggerHarmony(){
 if(!G||G.done||G.paused||G.harmony<99.9)return false;
 const colors=[...new Set(G.active.map(a=>a.pet.color))];
 if(colors.length<2){
  toast("双宠共鸣需要两种不同颜色同时在跑道上！");return false;
 }
 G.harmony=0;G.harmonyUses++;
 G.stress=Math.max(0,G.stress-16);
 // Boost stamina instead of magically painting distant pixels. Every newly
 // constructed pixel must still be launched from an animal's forward ray.
 for(const a of G.active)if(a.pet.energy>0)
  a.pet.energy=Math.min(a.pet.max,a.pet.energy+2);
 G.labels.push({x:320,y:125,ttl:1.4,text:"森林共鸣! ✦",col:1});
 playSound(710,.23,"sine",.016);
 toast("森林共鸣！两位伙伴恢复活力，心情舒缓");
 stats();return true;
}
// If both visible rows of all five pens are currently unproductive,
// give the player a new choice by rotating one WHOLE front group to its
// own lane tail (never teleport a rear animal through the fence).
// Never silently rearrange the player's carefully chosen queue.
// Old auto-rescue secretly rotated bonded pets for FREE every 650ms.
// Manual reshuffle is a finite, visible and counted decision.
// Over-approximate future growth using current walls and all same-colour
// blueprint support edges. If a target is unreachable even in this optimistic
// graph, no future shots can rescue it: walls can only be added, never removed.
// Per-animal visit quotas are temporary and must not affect this graph.
function potentiallyReachable(){
 if(G.reachCache?.revision===G.boardRevision)return G.reachCache.cells;
 const reached=new Set(G.tiles.filter(t=>t&&t.lit)),queue=[...reached];
 for(let k=0;k<queue.length;k++){
  const support=queue[k];
  for(const edge of ["top","bottom","left","right"]){
   const d=FACING[edge],t=at(support.x-d.dx,support.y-d.dy);
   if(!t||reached.has(t)||t.c!==support.c||!clearOutwardRay(t,edge))continue;
   reached.add(t);queue.push(t);
  }
 }
 G.reachCache={revision:G.boardRevision,cells:reached};return reached;
}
function permanentlySealed(t){
 return !!t&&!t.lit&&!potentiallyReachable().has(t);
}
function scanSealed(){
 if(!G||G.done||G.lit>=G.total)return [];
 const reachable=potentiallyReachable();
 return G.tiles.filter(t=>t&&!t.lit&&!reachable.has(t));
}
function resolveSealedDeadlock(){
 if(!G||G.done||G.lit>=G.total)return false;
 const blocked=scanSealed();
 if(!blocked.length)return false;
 G.deadlockTiles=blocked.map(t=>({x:t.x,y:t.y,c:t.c}));
 return lose("死局！"+blocked.length+" 个未亮像素已无法沿同色相邻格生长，所需射线被亮格封住。");
}
function rescueDeadlock(){
 if(!G||G.done||G.active.length)return;
 if(resolveSealedDeadlock())return;
 if(G.actions>=G.moveLimit){lose("派遣次数已用完。再试一次，减少空跑，并先完成容易被挡住的区域。");return;}
 if(!anyVisible().length){
  lose("死局！没有方向正确的同色相邻目标，已无法继续生长。");
  return;
 }
 if(G.homes.every(line=>line.length===0)&&G.active.length===0){
  lose("剩余动物已用完，像素图案尚未完成。");
 }
}
function lose(reason){
 if(!G||G.done||G.lit===G.total)return false;
 G.done=true;G.outcome="lost";G.lossReason=reason;
 const failed=G;stats();
 setTimeout(()=>{if(G===failed)end(false,reason);},400);
 return true;
}
function step(dt){
 if(!G||G.paused)return;
 G.time+=dt;G.stress=clamp(G.stress-dt*.22,0,100);
 const groupSpeeds=new Map();
 for(const a of G.active)if(!groupSpeeds.has(a.flightId))
  groupSpeeds.set(a.flightId,flightSpeed(a.flightId));
 for(const a of [...G.active]){
  if(!G.active.includes(a))continue; // previously exhausted linked group
  const formationOffset=a.formationOffset||0;
  const speed=groupSpeeds.get(a.flightId)||1;
  a.travelSpeed=speed;
  const endTime=a.time+dt*speed;
  const lapEnd=formationOffset+RUN_LAP_LIMIT;
  const scanEnd=Math.min(endTime,lapEnd-1e-7);
  // Keep the real, sub-cell-forward scanner at high speeds; do not skip
  // pixels because a pet is sprinting for its final few bullets.
  const interval=.012;
  let tries=0;
  while(!a.returning&&a.fireDelay<=scanEnd&&a.pet.energy>0&&!G.done&&tries++<40){
   a.time=a.fireDelay;
   fire(a);
   if(!G.active.includes(a)||a.pet.energy===0)break;
   a.fireDelay+=interval;
  }
  if(!G.active.includes(a))continue;
  a.time=endTime;
  // ONE deliberate click = ONE complete lap, for singles and linked pets.
  // Clamp scanning BEFORE the end gate; the return walk cannot fire.
  if(a.time+1e-7>=lapEnd){
   a.completedLaps=1;a.returning=true;
   if(a.time+1e-7>=lapEnd+GATE_RETURN_TIME){
    a.time=lapEnd+GATE_RETURN_TIME;
    retire(a);
   }
  }
 }
 if(!G.fades)G.fades=[];
 for(const f of G.fades)f.ttl-=dt;
 G.fades=G.fades.filter(f=>f.ttl>0);
 G.peak=Math.max(G.peak,G.stress);
 for(const p of G.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*48;p.ttl-=dt;}
 G.particles=G.particles.filter(v=>v.ttl>0);
 // Physical impact: each cube takes up to 0.8 seconds to cross the
 // board. A bell, coloured burst and outward ripple trigger ON ARRIVAL.
 for(const f of G.flights){
  f.ttl-=dt;
  if(f.ttl<=0&&!f.arrived){
   f.arrived=true;f.tile.pulse=1;
   // Impact only completes the visible projectile, ring and sound.
   // Logical and drawn pixels were committed atomically on firing.
   // DO NOT brighten twice or delay the connector until this event.
   rewardParticle(f.tile,f.finishing?10:5);
   const pt=pos(f.tile);
   G.impactRings.push({x:pt.x,y:pt.y,col:f.col,ttl:.55,life:.55});
   G.landingCount++;
   if(G.time-G.lastLandingSound>.073){
    playLandingChime(f.col,G.landingCount%5===0);
    G.lastLandingSound=G.time;
   }
   if(f.finishing&&G.displayLit%8===0)
    G.labels.push({x:pt.x,y:pt.y-13,ttl:.77,text:"+1 ✦",col:f.col});
  }
 }
 G.flights=G.flights.filter(f=>!f.arrived);
 for(const ring of G.impactRings)ring.ttl-=dt;
 G.impactRings=G.impactRings.filter(r=>r.ttl>0);
 for(const b of G.bolts)b.ttl-=dt;G.bolts=G.bolts.filter(v=>v.ttl>0);
 for(const l of G.labels){l.ttl-=dt;l.y-=dt*18;}
 G.labels=G.labels.filter(v=>v.ttl>0);
 // The commit path already resolves every shot immediately. This shared
 // check also covers restored boards; animation timing never owns failure.
 resolveSealedDeadlock();
 if(!G.done&&!G.active.length&&G.time-G.lastRescue>.65){
  rescueDeadlock();G.lastRescue=G.time;
 }

 if(G.time-G.lastUI>.17){G.lastUI=G.time;stats();orbitUpdate();}
}

const canvas=byId("world"),ctx=canvas.getContext("2d");
// A cached original illustration replaces repeated expensive background
// gradients; the dynamic gameplay remains at the original coordinates.
const sceneBackdrop=document.createElement("canvas");
sceneBackdrop.width=sceneBackdrop.height=640;
const sd=sceneBackdrop.getContext("2d");
(function paintBackdrop(){
 const dusk=sd.createLinearGradient(0,0,640,640);
 dusk.addColorStop(0,"#15263b");dusk.addColorStop(.39,"#122c3e");
 dusk.addColorStop(.72,"#0e2134");dusk.addColorStop(1,"#1a2940");
 sd.fillStyle=dusk;sd.fillRect(0,0,640,640);
 const pools=[
  [92,50,250,"#82c7e5",.14],[565,55,220,"#b6d8ca",.08],
  [85,530,280,"#67e8cb",.10],[576,518,190,"#7ea9e7",.10]
 ];
 for(const [x,y,r,color,a] of pools){
  const glow=sd.createRadialGradient(x,y,5,x,y,r);
  glow.addColorStop(0,hexA(color,a));glow.addColorStop(1,hexA(color,0));
  sd.fillStyle=glow;sd.fillRect(x-r,y-r,2*r,2*r);
 }
 const rand=seeded(8119);
 for(let i=0;i<210;i++){
  const x=rand()*640,y=rand()*640,r=.3+rand()*1.2;
  sd.fillStyle="rgba(224,218,255,"+(.07+rand()*.27)+")";
  sd.beginPath();sd.arc(x,y,r,0,TAU);sd.fill();
 }
 sd.strokeStyle="#d3bfff16";sd.lineWidth=.7;
 for(const [x,y,r] of [[-50,44,125],[666,590,151],[590,-28,95]]){
  sd.beginPath();sd.arc(x,y,r,0,TAU);sd.stroke();
  sd.beginPath();sd.arc(x,y,r+11,0,TAU);sd.stroke();
 }
 // A hand-placed constellation adds some character without hiding the board.
 const constellations=[
  [[28,168],[49,148],[68,176],[45,204]],
  [[548,20],[573,35],[603,22],[620,47]],
  [[37,551],[58,574],[81,556],[103,588]]
 ];
 for(const constellation of constellations){
  sd.strokeStyle="#fff0e633";sd.lineWidth=.85;sd.beginPath();
  constellation.forEach(([x,y],i)=>i?sd.lineTo(x,y):sd.moveTo(x,y));
  sd.stroke();
  for(const [x,y] of constellation){
   sd.fillStyle="#e8d8ff88";sd.beginPath();sd.arc(x,y,2,0,TAU);sd.fill();
  }
 }
})();
// Original hand-painted forest illustration replaces the old space/arcade
// theme. SVG is stored offline in the Android APK; cached by the browser.
const forestImage=new Image();
forestImage.decoding="async";
forestImage.src="art/forest-stage.svg";
// Rasterize mossy grass and wildflowers into a static canvas, NOT each frame.
// The grass square is precisely centred on SQUARE_TRACK's real movement path.
const gardenImage=new Image();
gardenImage.decoding="async";gardenImage.src="art/garden-square-fullbleed.svg";
const grassCourse=document.createElement("canvas");
grassCourse.width=grassCourse.height=640;
const meadow=grassCourse.getContext("2d");
(function paintForestTrail(){
 meadow.save();meadow.lineJoin="round";
 meadow.shadowBlur=12;meadow.shadowColor="#0d392f";
 meadow.strokeStyle="#174b39";meadow.lineWidth=70;
 meadow.strokeRect(70,70,500,500);
 meadow.shadowBlur=0;
 meadow.strokeStyle="#326849";meadow.lineWidth=61;
 meadow.strokeRect(70,70,500,500);
 meadow.strokeStyle="#5c9660";meadow.lineWidth=49;
 meadow.strokeRect(70,70,500,500);
 meadow.strokeStyle="#6ca86b";meadow.lineWidth=30;
 meadow.strokeRect(70,70,500,500);
 meadow.strokeStyle="#8eaa73";meadow.lineWidth=15;
 meadow.strokeRect(70,70,500,500);
 meadow.strokeStyle="#a3b5827d";meadow.lineWidth=1.4;
 meadow.setLineDash([3,15]);meadow.strokeRect(70,70,500,500);
 meadow.setLineDash([]);
 const random=seeded(1337);
 for(let i=0;i<520;i++){
  const pr=random(),anchor=squareRoute(pr,1);
  // Texture spreads either side of the real centreline along the meadow.
  const cross=(random()-.5)*59;
  const x=anchor.x+(anchor.edge==="left"||anchor.edge==="right"?cross:0);
  const y=anchor.y+(anchor.edge==="top"||anchor.edge==="bottom"?cross:0);
  const scale=.5+random()*1.7;
  const palette=["#215d3e","#b9c888","#87c67c","#e3d59b","#3e834f"];
  meadow.strokeStyle=palette[Math.floor(random()*palette.length)];
  meadow.lineWidth=.7+random()*.5;meadow.lineCap="round";
  meadow.beginPath();meadow.moveTo(x,y);
  meadow.quadraticCurveTo(x+scale*.9,y-scale*1.9,x+(random()-.5)*3,y-scale*3.5);
  meadow.stroke();
  if(i%29===0){
   meadow.fillStyle="#fff0bb";meadow.beginPath();meadow.arc(x,y,2.2,0,TAU);meadow.fill();
   meadow.fillStyle="#f0b9aa";meadow.beginPath();meadow.arc(x,y,1.1,0,TAU);meadow.fill();
  }
 }
 for(const [x,y] of [[70,70],[570,70],[570,570],[70,570]]){
  meadow.fillStyle="#1a523f";meadow.beginPath();meadow.arc(x,y,17,0,TAU);meadow.fill();
  meadow.fillStyle="#87bb78";meadow.beginPath();meadow.arc(x,y,13.5,0,TAU);meadow.fill();
  meadow.strokeStyle="#e2eac08c";meadow.lineWidth=1.5;
  meadow.beginPath();meadow.arc(x,y,9.4,0,TAU);meadow.stroke();
 }
 meadow.restore();
})();
const boardGradient=ctx.createLinearGradient(96,94,542,540);
boardGradient.addColorStop(0,"#182f43");
boardGradient.addColorStop(.52,"#11263b");
boardGradient.addColorStop(1,"#152c42");
// Each 3D-looking cube is shaded ONCE at startup, then drawn from an
// offscreen texture; this avoids hundreds of Canvas shadow blurs each frame.
const TILE_PAD=9,TILE_IMAGE_SIZE=40;
const tileTextures=COLORS.map(col=>{
 const result={};
 for(const style of ["normal","edge","ghost"]){
  const cv=document.createElement("canvas");
  cv.width=cv.height=TILE_IMAGE_SIZE;
  const g=cv.getContext("2d"),x=TILE_PAD,y=TILE_PAD,w=CELL-1.5,h=CELL-1.5;
  g.save();
  if(style==="ghost"){
   // All missing tiles keep the ORIGINAL target hue at equal preview strength.
   const glow=col.hex==="#292c34"?"#8996b1":col.hex;
   g.fillStyle=hexA(glow,.84);
   roundRect(g,x,y,w,h,2.6);g.fill();
   g.strokeStyle=hexA("#f0f6ff",.33);g.lineWidth=.75;g.stroke();
   g.fillStyle="#ffffff1f";
   roundRect(g,x+1.4,y+1.5,w-2.8,4,1.4);g.fill();
   g.fillStyle="#111d334f";g.fillRect(x+2,y+h-3,w-4,1.7);
  }else{
   g.shadowBlur=style==="edge"?10:3.5;
   g.shadowColor=hexA(col.hex,style==="edge"?.92:.42);
   g.fillStyle=col.hex;roundRect(g,x,y,w,h,2.8);g.fill();
   g.shadowBlur=0;
   g.strokeStyle="#fff9";g.lineWidth=.7;
   roundRect(g,x+.65,y+.65,w-1.3,h-1.3,2.6);g.stroke();
   g.fillStyle="#ffffff80";
   roundRect(g,x+1.5,y+1.5,w-3.7,5,1.5);g.fill();
   g.fillStyle="#101b3c62";
   roundRect(g,x+2.7,y+h-4.5,w-5.4,2.1,1);g.fill();
   g.fillStyle="#ffffff5d";
   g.fillRect(x+3.3,y+3.0,3,1.2);
   g.fillStyle="#ffffff25";g.fillRect(x+2.5,y+7.9,1,h-10.4);
  }
  g.restore();result[style]=cv;
 }
 return result;
});
const animalImgs=PETS.map(p=>{
 const img=new Image();img.decoding="async";
 img.src="art/pet-"+p.kind+".png";
 return img;
});
function roundRect(p,x,y,w,h,r){
 r=Math.min(r,w/2,h/2);
 p.beginPath();p.moveTo(x+r,y);p.arcTo(x+w,y,x+w,y+h,r);
 p.arcTo(x+w,y+h,x,y+h,r);p.arcTo(x,y+h,x,y,r);p.arcTo(x,y,x+w,y,r);p.closePath();
}
// One universal collision rule for BOTH targeting and visuals.
// The only wall is an illuminated pixel, read from CURRENT G.tiles.
function visualProjectileEndpoint(b){
 const vertical=Math.abs(b.x-b.tx)<.5;
 const towardsPositive=vertical?b.ty>=b.y:b.tx>=b.x;
 const start=towardsPositive?0:GRID-1,step=towardsPositive?1:-1;
 const index=vertical?b.tile.x:b.tile.y;
 const destination=vertical?b.tile.y:b.tile.x;
 for(let i=start;i>=0&&i<GRID&&i!==destination;i+=step){
  const t=vertical?at(index,i):at(i,index);
  if(!t||!t.lit)continue;
  const hit=pos(t),stop=(towardsPositive?-1:1)*CELL*.52;
  return vertical?{x:b.tx,y:hit.y+stop}:{x:hit.x+stop,y:b.ty};
 }
 return {x:b.tx,y:b.ty};
}
function draw(){
 if(!G)return;
 const t=G.time;
 ctx.clearRect(0,0,640,640);
 if(gardenImage.complete&&gardenImage.naturalWidth>0)ctx.drawImage(gardenImage,0,0,640,640);
 else {ctx.drawImage(sceneBackdrop,0,0);
  if(forestImage.complete&&forestImage.naturalWidth>0)ctx.drawImage(forestImage,0,0,640,640);}
 // Tiny drifting pollen / forest fireflies
 for(const v of G.sky){
  const f=.4+.6*Math.sin(t*v.freq+v.x*.09)**2;
  ctx.fillStyle="rgba(204,207,255,"+(.09+.23*f)+")";
  ctx.fillRect(v.x,v.y,v.size,v.size);
 }
 // Real loop coordinate geometry is unchanged. Animals now walk on
 // rendered moss and meadow rather than glowing rails.
 // Full-width dirt square is already painted by gardenImage. There is
 // no small neon or raised inner track frame.
 ctx.save();
 ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="bold 14px sans-serif";
 for(const [glyph,x,y] of []){
  ctx.save();ctx.shadowBlur=4;ctx.shadowColor="#244c34";
  ctx.fillStyle="#f4e2b6";ctx.fillText(glyph,x,y);ctx.restore();
 }
 // Slow luminous forest pollen stays behind the character sprites.
 for(let i=0;i<10;i++){
  const point=squareRoute((t*.026+i/10)%1,1);
  ctx.fillStyle="rgba(255,248,191,"+(.16+.17*Math.sin(t*1.8+i)**2)+")";
  ctx.beginPath();ctx.arc(point.x,point.y,i%3===0?1.65:.85,0,TAU);ctx.fill();
 }
 ctx.restore();
 // Quiet inset display with a glass gradient and faint grid to make
 // the pixel sculpture legible even after most cubes have disappeared.
 ctx.save();
 ctx.shadowBlur=14;ctx.shadowColor="#78d7ce52";
 roundRect(ctx,103,103,434,434,9);
 ctx.fillStyle=boardGradient;ctx.fill();
 ctx.shadowBlur=0;ctx.strokeStyle="#5f9ea1ac";ctx.lineWidth=1.7;ctx.stroke();
 roundRect(ctx,104.5,104.5,431,431,7);
 ctx.strokeStyle="#d4f4e82f";ctx.lineWidth=1;ctx.stroke();
 ctx.save();roundRect(ctx,106,105,428,428,6);ctx.clip();
 ctx.strokeStyle="#d6c8fb0e";ctx.lineWidth=.65;
 for(let k=0;k<=GRID;k++){
  const gx=X0+k*CELL-.5,gy=Y0+k*CELL-.5;
  ctx.beginPath();ctx.moveTo(gx,Y0);ctx.lineTo(gx,Y0+GRID*CELL);ctx.stroke();
  ctx.beginPath();ctx.moveTo(X0,gy);ctx.lineTo(X0+GRID*CELL,gy);ctx.stroke();
 }
 ctx.restore();ctx.restore();
 // Complete faint-color preview: same opacity for EVERY missing pixel.
 // Showing the blueprint NEVER highlights the current/next shootable tile.
 // Only actual placed pixels become solid bright color.
 for(const tile of G.tiles){
  if(!tile)continue;
  const px=X0+tile.x*CELL,py=Y0+tile.y*CELL;
  const complete=tile.lit&&G.time>=tile.litWhen;
  if(complete){
   ctx.drawImage(tileTextures[tile.c].normal,px-TILE_PAD,py-TILE_PAD);
  }else{
   ctx.save();ctx.globalAlpha=visualMode==="blueprint"?.62:.38;
   ctx.drawImage(tileTextures[tile.c].ghost,px-TILE_PAD,py-TILE_PAD);
   ctx.restore();
  }
  if(tile.sealKey){
   // Highlight a normal but risky sealing pixel; no extra hit points.
   ctx.save();ctx.strokeStyle=complete?"#ce835a":"#ffd486";
   ctx.lineWidth=complete?1.1:2.1;
   ctx.strokeRect(px+2,py+2,CELL-4,CELL-4);
   ctx.fillStyle=complete?"#f4dcac":"#ffe6a0";
   ctx.font="900 11px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
   ctx.fillText("◇",px+CELL/2,py+CELL/2);
   ctx.restore();
  }
 }
 if(G.outcome==="lost"&&G.deadlockTiles.length){
  ctx.save();ctx.strokeStyle="#ff6782";ctx.lineWidth=2.1;
  for(const cell of G.deadlockTiles)ctx.strokeRect(X0+cell.x*CELL+1,Y0+cell.y*CELL+1,CELL-2,CELL-2);
  ctx.restore();
 }
 // Cute companions run directly on the grass with soft little pawprints.
 // The nose/aim pointer remains oriented ONLY toward the board interior.
 for(const a of G.active){
  const pet=a.pet,p=orbitPos(a);
  if(p.waiting)continue;
  const tone=isWild(pet)?"#f0d2ff":COLORS[pet.color].hex;
  const dir=FACING[p.edge],angle=Math.atan2(dir.dy,dir.dx);
  const bounce=Math.sin((a.time+t*.23)*21*(a.travelSpeed||1)+a.lane)*2.3;
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle="#163b2e82";ctx.beginPath();ctx.ellipse(0,20,20,6,0,0,TAU);ctx.fill();
  ctx.save();ctx.rotate(angle);
  ctx.fillStyle=hexA(tone,.8);ctx.shadowBlur=5;ctx.shadowColor=tone;
  ctx.beginPath();ctx.moveTo(29,0);ctx.lineTo(21,-4.3);ctx.lineTo(21,4.3);ctx.closePath();ctx.fill();
  ctx.restore();
  ctx.shadowBlur=5;ctx.shadowColor="#082d32a6";
  if(animalImgs[pet.kind].complete&&animalImgs[pet.kind].naturalWidth>0)
   ctx.drawImage(animalImgs[pet.kind],-30,-36+bounce,60,60);
  else{ctx.fillStyle=tone;ctx.beginPath();ctx.arc(0,0,15,0,TAU);ctx.fill();}
  // Screen-space upright NUMBER anchored directly ABOVE THIS pet's head;
  // it is read from the real energy counter on EVERY rendered frame.
  ctx.shadowBlur=0;
  ctx.fillStyle="#fff8dc";
  ctx.strokeStyle="#124e42";ctx.lineWidth=2.6;
  roundRect(ctx,-19,-50,38,24,11);
  ctx.fill();ctx.stroke();
  ctx.fillStyle="#26463a";ctx.font="900 17px system-ui,sans-serif";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(String(pet.energy),0,-38);
  ctx.restore();
 }
 // Exactly where its last bullet was fired: brief shrink + vanish.
 // A linked exhausted pet instead shrinks on reaching the original gate.
 for(const f of G.fades||[]){
  const progress=1-f.ttl/f.life;
  const scale=clamp(1-progress*1.08,.03,1);
  ctx.save();ctx.globalAlpha=clamp(1-progress*1.35,0,1);
  ctx.translate(f.x,f.y);ctx.scale(scale,scale);
  if(animalImgs[f.kind].complete&&animalImgs[f.kind].naturalWidth>0)
   ctx.drawImage(animalImgs[f.kind],-30,-36,60,60);
  else{
   ctx.fillStyle=COLORS[f.color].hex;
   ctx.beginPath();ctx.arc(0,0,16,0,TAU);ctx.fill();
  }
  ctx.fillStyle="#fff8dc";ctx.strokeStyle="#195443";ctx.lineWidth=2;
  roundRect(ctx,-16,-51,32,22,11);ctx.fill();ctx.stroke();
  ctx.fillStyle="#315241";ctx.font="900 15px system-ui,sans-serif";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("0",0,-40);
  ctx.restore();
 }
 // Visual projectiles are also clipped against the CURRENT live board.
 // A solid cube added after an earlier bullet was fired must never be
 // visually penetrated just because the prior cosmetic flight is ongoing.
 for(const b of G.flights){
  const v=1-clamp(b.ttl/b.life,0,1);
  const eased=v*v*(3-2*v);
  const cap=visualProjectileEndpoint(b);
  const x=b.x+(cap.x-b.x)*eased,y=b.y+(cap.y-b.y)*eased;
  const prev=clamp(eased-.12,0,1);
  const sx=b.x+(cap.x-b.x)*prev,sy=b.y+(cap.y-b.y)*prev;
  ctx.save();
  ctx.globalAlpha=.85;
  ctx.strokeStyle=hexA(COLORS[b.col].hex,.7);ctx.lineWidth=5;
  ctx.lineCap="round";ctx.shadowBlur=11;ctx.shadowColor=COLORS[b.col].hex;
  ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(x,y);ctx.stroke();
  ctx.shadowBlur=9;ctx.shadowColor=COLORS[b.col].hex;
  ctx.fillStyle=COLORS[b.col].hex;
  roundRect(ctx,x-5.1,y-5.1,10.2,10.2,2.2);ctx.fill();
  ctx.strokeStyle="#fff8e9";ctx.lineWidth=1.3;ctx.stroke();
  ctx.fillStyle="#fff9e7";ctx.fillRect(x-1.4,y-2.9,2.8,2.8);
  ctx.restore();
 }
 for(const ring of G.impactRings){
  const v=1-ring.ttl/ring.life;
  ctx.save();ctx.globalAlpha=(1-v)*.8;
  ctx.shadowBlur=15;ctx.shadowColor=COLORS[ring.col].hex;
  ctx.strokeStyle=COLORS[ring.col].hex;ctx.lineWidth=2.5*(1-v)+.5;
  ctx.beginPath();ctx.arc(ring.x,ring.y,4+v*24,0,TAU);ctx.stroke();
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(ring.x,ring.y,2*(1-v),0,TAU);ctx.fill();
  ctx.restore();
 }
 for(const p of G.particles){
  ctx.save();ctx.globalAlpha=clamp(p.ttl/p.life,0,1);
  ctx.shadowBlur=9;ctx.shadowColor=COLORS[p.col].hex;
  ctx.fillStyle=p.r>2.5?"#fffae8":COLORS[p.col].hex;
  ctx.translate(p.x,p.y);ctx.rotate(t*2+p.vx*.08);
  if(p.r>2.3){ctx.beginPath();ctx.moveTo(0,-p.r*1.7);ctx.lineTo(p.r*.48,0);ctx.lineTo(0,p.r*1.7);ctx.lineTo(-p.r*.48,0);ctx.closePath();ctx.fill();}
  else{ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r);}
  ctx.restore();
 }
 for(const l of G.labels){
  ctx.save();ctx.globalAlpha=clamp(l.ttl/.9,0,1);
  ctx.font="900 16px sans-serif";ctx.textAlign="center";ctx.fillStyle=COLORS[l.col].hex;
  ctx.strokeStyle="#241940";ctx.lineWidth=3;ctx.strokeText(l.text,l.x,l.y);
  ctx.shadowBlur=15;ctx.shadowColor=COLORS[l.col].hex;ctx.fillText(l.text,l.x,l.y);ctx.restore();
 }
 if(G.done&&G.lit===G.total){
  ctx.fillStyle="#fff6cf08";ctx.fillRect(96,94,446,446);
 }
}
function showModal(name,html){
 if(!G)return;
 // Do not leave a stale dispatch toast floating above the win/lose result.
 clearTimeout(toaster);byId("toast").classList.remove("show");
 G.paused=true;dialogName=name;
 byId("modalContent").innerHTML=html;
 byId("overlay").classList.remove("is-hidden");byId("overlay").setAttribute("aria-hidden","false");
}
function hideModal(){
 byId("overlay").classList.add("is-hidden");byId("overlay").setAttribute("aria-hidden","true");
 if(G&&!G.done)G.paused=false;
 dialogName="";
}
function portraitTag(idx,cls="collection-portrait"){
 return '<img class="'+cls+'" src="art/portraits-v320/stage-'+String(idx+1).padStart(2,"0")+'.png" alt="'+LEVELS[idx].kind+'完整像素图案" width="92" height="92">';
}
function earnedStars(){
 if(G.actions<=G.parActions&&G.misses===0)return 3;
 const slack=Math.max(2,Math.floor((G.moveLimit-G.parActions)/2));
 return G.actions<=G.parActions+slack?2:1;
}
function end(won,reason){
 if(!G||!G.done)return;
 if(won){
  const stars=earnedStars();
  if(G.mode==="master")progress.master[G.idx]=true;
  progress.stars[G.idx]=Math.max(progress.stars[G.idx]||0,stars);
  progress.opened=Math.max(progress.opened,Math.min(LEVELS.length,G.idx+2));persist();
  if(G.idx<LEVELS.length-1)persistSelectedLevel(G.idx+1);
  stats();playSound(520,.12,"sine",.025);
  setTimeout(()=>playSound(650,.14,"sine",.03),100);
  setTimeout(()=>playSound(880,.18,"sine",.03),220);
  showModal("won",'<div class="modal-label">森林伙伴 · 新作入册</div>'+
   portraitTag(G.idx,"victory-portrait")+'<div class="modal-bonus">'+("★".repeat(stars)+"☆".repeat(3-stars))+'</div>'+
   '<h2 id="modalTitle">'+LEVELS[G.idx].name+' · 完成！</h2>'+
   '<p>开局起点 '+G.seeds.length+' 格，亲手点亮 '+G.shots.length+' 格。完整图案已收入你的伙伴图鉴。</p>'+
   '<div class="results"><div><strong>'+G.actions+' / '+G.moveLimit+'</strong><span>派遣次数 · 空跑 '+G.misses+' 次</span></div>'+
   '<div><strong>'+G.parActions+'</strong><span>三星派遣目标 · 更少空跑</span></div></div>'+
   (G.idx<LEVELS.length-1?'<button class="modal-primary" data-act="next">认识下一位伙伴 →</button>':'<button class="modal-primary" data-act="map">打开完整伙伴图鉴 ✦</button>')+
   '<button class="modal-link" data-act="master">再战精简挑战：仅 '+G.parActions+' 次派遣</button>');
 }else{
  playSound(145,.28,"triangle",.031);
  const sealed=G.deadlockTiles.length>0;
  showModal("lost",'<div class="modal-label">再想一步，就有新的路线</div>'+
   '<h2 id="modalTitle">'+(sealed?'生长通道被封住了':'本次派遣机会用完了')+'</h2>'+
   '<p>'+(reason||"这次没有完成图案。")+'</p>'+
   '<p class="failure-lesson">'+(sealed?'红框标出真正无法继续生长的暗格。先做内侧、给未完成的颜色留入口，再处理外缘。':'不要把动物一直挂在跑道上：每次派遣都要选时机。少空跑，尝试换一个颜色或前两排的另一只伙伴。')+'</p>'+
   '<div class="results"><div><strong>'+G.lit+' / '+G.total+'</strong><span>实际点亮像素</span></div><div><strong>'+G.actions+' / '+G.moveLimit+'</strong><span>派遣次数 · 空跑 '+G.misses+' 次</span></div></div>'+
   '<button class="modal-primary" data-act="retry">↻ 重新规划这一关</button>'+
   '<button class="modal-link" data-act="close">观察失败棋盘</button> · <button class="modal-link" data-act="map">伙伴图鉴</button>');
 }
}
function openMap(){
 const chapters=["林间初遇","萌宠来信","海风伙伴","彩色王国","梦想职业","伙伴远征"];
 let grid="";
 LEVELS.forEach((v,i)=>{
  if(i%4===0)grid+='<h3 class="collection-chapter">'+String(Math.floor(i/4)+1).padStart(2,"0")+' · '+chapters[Math.floor(i/4)]+'</h3>';
  const opened=i<progress.opened,stars=progress.stars[i]||0;
  grid+='<button type="button" class="level-cell collection-cell '+(i===levelNumber?'current':'')+'" data-act="level" data-level="'+i+'" '+(!opened?'disabled':'')+'>'+portraitTag(i)+
   '<strong>'+String(i+1).padStart(2,"0")+' · '+v.name+'</strong><small>'+v.rank+' · '+(opened?(stars?'★'.repeat(stars)+'☆'.repeat(3-stars)+(progress.master[i]?' · ◆':''):'待完成'):'未解锁')+'</small></button>';
 });
 showModal("map",'<div class="modal-label">PAW PRISM · 24 位原创伙伴</div><h2 id="modalTitle">森林伙伴图鉴</h2>'+
  '<p>六个章节，完整像素角色。每点一次只跑一圈；留住通道、减少空跑，完成图案并收集三星。</p><div class="collection-grid">'+grid+'</div><button class="modal-link" data-act="close">返回当前挑战</button>');
}
const GUIDE_PAGES=[
 {img:"guide/guide-v313-direction.svg",title:"只接面向动物的同色邻格",
  sub:"鸭子在左侧不能横扫黄色竖列。跑到上方朝下射击，才会点亮黄色起点正上方的一格。",
  foot:"目标紧后方必须是已亮同色格；横旁、斜角、隔空或其他颜色都不能作支撑。"},
 {img:"guide/guide-v320-one-lap.svg",title:"点击一次，只跑一圈就回栏",
  sub:"还有子弹：跑完一圈，回到原列队尾。需要你再次点击，才会进行下一圈；绝不会自动续跑。",
  foot:"同一射线每次经过最多一格。子弹用尽仍按原规则在发射处退场，返程不射击。"},
 {img:"guide/guide-02-gates.png",title:"从前两排选择动物",
  sub:"五列围栏，每列前两只可点。头顶数字是剩余子弹，归零后动物当场消失。",
  foot:"头顶是剩余弹药；上方是派遣次数。等在途伙伴完成后，次数用完仍未完成图案就失败。"},
 {img:"guide/guide-03-seal.png",title:"已亮格立即成为实体墙",
  sub:"射线遇到第一块亮格就停止，只能接它朝向动物一侧的同色邻格。子弹不能穿墙。",
  foot:"如果未亮区域的同色生长通道全被封住，就会失败。请留意发车顺序。"}
];
let guidePage=0;
const GUIDE_KEY="paw-prism-visual-guide-v320";
function showGuide(page=0){
 guidePage=clamp(page,0,GUIDE_PAGES.length-1);
 const info=GUIDE_PAGES[guidePage];
 const dots=GUIDE_PAGES.map((_,i)=>'<i class="'+(i===guidePage?'selected':'')+'"></i>').join("");
 showModal("guide",
  '<div class="guide-kicker">新手游玩须知 · '+(guidePage+1)+' / '+GUIDE_PAGES.length+'</div>'+
  '<h2 id="modalTitle" class="guide-title">'+info.title+'</h2>'+
  '<img class="guide-visual" src="'+info.img+'" alt="'+info.title+'的图示" draggable="false">'+
  '<p class="guide-description">'+info.sub+'</p>'+
  '<p class="guide-foot">'+info.foot+'</p>'+
  '<div class="guide-dots" aria-label="当前第'+(guidePage+1)+'页">'+dots+'</div>'+
  '<div class="guide-navigation">'+
  (guidePage===0?'<button data-act="guide-done" class="guide-skip">跳过</button>':
   '<button data-act="guide-back" class="guide-prev">上一步</button>')+
  '<button data-act="'+(guidePage===GUIDE_PAGES.length-1?'guide-done':'guide-next')+
  '" class="guide-next">'+(guidePage===GUIDE_PAGES.length-1?'开始游玩 ✓':'下一张 →')+'</button></div>');
}
function finishGuide(){
 try{localStorage.setItem(GUIDE_KEY,"read");}catch(e){}
 hideModal();
}
function openHelp(){
 const guide='<div class="animal-guide">'+PETS.map((p,kind)=>
  '<div class="animal-guide-item" style="--tone:'+p.base+'">'+
  '<span class="animal-guide-face">'+face(kind)+'</span>'+
  '<strong>'+p.name+'</strong><small>'+COLORS[p.color].name+'</small></div>').join('')+'</div>';
 showModal("help",'<div class="modal-label">FOUR COLORS · SOLID PIXEL WALLS</div>'+
  '<h2 id="modalTitle">先填内层，谨防外围封死</h2>'+guide+
  '<p>动物只向当前跑道的内侧射击。目标紧后方必须有已亮的同色相邻格；只可接在它面向动物的一侧。已亮格是实体墙，任何颜色的子弹都不能穿过。</p>'+
  '<p>同一只动物在同一条射线上，每次经过最多点亮一格，绕回后再接下一格。新亮格立即成为支撑和墙；同色生长通道全部封住就会失败。</p>'+
  '<button class="modal-primary" data-act="close">明白了，去挑战 →</button>');
}
function raf(now){
 const dt=clamp((now-last)/1000,0,.05);last=now;
 if(!window.__pawQA?.manualClock)step(dt);draw();requestAnimationFrame(raf);
}
byId("gateStrip").addEventListener("click",e=>{
 const g=e.target.closest("[data-gate]");
 if(g)launch("house",Number(g.dataset.gate));
});
byId("homeGrid").addEventListener("click",e=>{
 const selected=e.target.closest(".pen-animal");
 if(!selected)return; // Grass never dispatches anything.
 const column=selected.closest("[data-house]");
 if(!column)return;
 const row=Number(selected.dataset.position);
 if(row>=FRONT_ROWS)return; // Rows 3+ are locked, with no auto substitution.
 launch("house",Number(column.dataset.house),row);
});
byId("homeGrid").addEventListener("keydown",e=>{
 if(e.key!=="Enter"&&e.key!==" ")return;
 const selected=e.target.closest(".pen-animal.pen-selectable");
 if(!selected)return;
 e.preventDefault();
 const column=selected.closest("[data-house]");
 if(column)launch("house",Number(column.dataset.house),Number(selected.dataset.position));
});
function toggleForestDrawer(force){
 const panel=byId("managementDrawer");
 const opened=typeof force==="boolean"?force:!panel.classList.contains("open");
 panel.classList.toggle("open",opened);
 panel.setAttribute("aria-hidden",opened?"false":"true");
}
byId("settingsToggle").addEventListener("click",()=>toggleForestDrawer());
byId("drawerClose").addEventListener("click",()=>toggleForestDrawer(false));

byId("restart").addEventListener("click",()=>{hideModal();begin(levelNumber,G?.mode);});
byId("helpOpen").addEventListener("click",()=>showGuide(0));
byId("mapOpen").addEventListener("click",openMap);
byId("audioToggle").addEventListener("click",()=>setMusicEnabled(!musicEnabled));
byId("sfxToggle").addEventListener("click",()=>{
 audio=!audio;
 try{localStorage.setItem("paw-prism-sfx-v18",audio?"on":"off");}catch(e){}
 syncAudioButtons();
 if(audio)playSound(660,.08,"sine",.024);
});
document.addEventListener("pointerdown",event=>{
 if(!event.target.closest("#audioToggle"))tryStartTheme();
},{capture:true,passive:true});
document.addEventListener("keydown",()=>tryStartTheme(),{capture:true});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){theme.pause();syncAudioButtons();}
 else if(musicEnabled&&startedBgm)tryStartTheme();
});
theme.addEventListener("play",syncAudioButtons);
theme.addEventListener("pause",syncAudioButtons);
theme.addEventListener("error",()=>{syncAudioButtons();});

function setVisualMode(){
 const show=visualMode==="blueprint";
 byId("modeToggle").textContent=show?"◉":"◌";
 byId("modeToggle").title=show?"切换为柔和预览":"切换为鲜明预览";
 byId("progressCaption").textContent="建造进度";
 byId("progressEnglish").textContent="BUILT PIXELS · 0 TO 1";
 byId("repairedCaption").textContent="已建造";
}
byId("modeToggle").addEventListener("click",()=>{
 visualMode=visualMode==="build"?"blueprint":"build";
 try{localStorage.setItem("paw-prism-build-guide-v1",visualMode==="blueprint"?"on":"off");}catch(e){}
 setVisualMode();
 toast(visualMode==="blueprint"?"完整蓝图已增强显示；每发即时刷新全图":"已恢复柔和的半透明整图预览");
});
byId("masterChallenge").addEventListener("click",()=>{toggleForestDrawer(false);begin(levelNumber,"master");});
byId("storyChallenge").addEventListener("click",()=>{toggleForestDrawer(false);begin(levelNumber,"story");});
byId("modalClose").addEventListener("click",hideModal);
byId("overlay").addEventListener("click",e=>{if(e.target===byId("overlay"))hideModal();});
byId("modalContent").addEventListener("click",e=>{
 const b=e.target.closest("[data-act]");if(!b)return;
 const act=b.dataset.act;
 if(act==="guide-next"){showGuide(guidePage+1);return;}
 if(act==="guide-back"){showGuide(guidePage-1);return;}
 if(act==="guide-done"){finishGuide();return;}
 if(act==="close"){hideModal();return;}
 if(act==="retry"){hideModal();begin(levelNumber,G.mode);return;}
 if(act==="master"){hideModal();begin(levelNumber,"master");return;}
 if(act==="next"){hideModal();begin(Math.min(LEVELS.length-1,levelNumber+1));return;}
 if(act==="map"){hideModal();openMap();return;}
 if(act==="level"){const n=Number(b.dataset.level);if(n<progress.opened){hideModal();begin(n);}}
});
window.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&!byId("overlay").classList.contains("is-hidden")){hideModal();return;}
 if(!byId("overlay").classList.contains("is-hidden"))return;
 if(/^[1-5]$/.test(e.key)){launch("house",Number(e.key)-1);}
 else if(e.key.toLowerCase()==="r"&&!e.repeat){begin(levelNumber,G?.mode);}
 else if(e.key.toLowerCase()==="m"&&!e.repeat){openMap();}
});
if(new URLSearchParams(location.search).has("qa")){
 // Observation and real input/clock controls only. No direct pixel painting,
 // free ammunition, substitute targeting or artificial success is exposed.
 window.__pawQA={
  manualClock:true,
  begin:(n,mode="story")=>{hideModal();begin(n,mode);return G.lit;},
  launch:(source,lane,position=0)=>launch(source,lane,position),
  tick:dt=>{step(dt);stats();return G.lit;},
  step:seconds=>{
   let left=seconds;while(left>1e-9){const dt=Math.min(.05,left);step(dt);left-=dt;}
   stats();return G.lit;
  },
  snap:()=>({level:G.idx,mode:G.mode,lit:G.lit,total:G.total,time:G.time,
   seedCount:G.seeds.length,boardRevision:G.boardRevision,
   outcome:G.outcome,done:G.done,lossReason:G.lossReason,
   active:G.active.length,moves:G.actions,limit:G.moveLimit,par:G.parActions,misses:G.misses,score:G.score,
   homes:G.homes.map(h=>h[0]?{color:h[0].color,energy:h[0].energy,kind:h[0].kind,length:h.length}:null),
   frontTwo:G.homes.map(h=>h.slice(0,FRONT_ROWS).map(m=>({color:m.color,energy:m.energy,kind:m.kind,id:m.id}))),
   rest:[],reachable:COLORS.map((_,c)=>visible(c).length)}),
  lanes:()=>G.homes.map(h=>h.map((m,position)=>({id:m.id,kind:m.kind,color:m.color,
   energy:m.energy,max:m.max,position,clickable:position<FRONT_ROWS}))),
  runners:()=>G.active.map(a=>({id:a.pet.id,color:a.pet.color,kind:a.pet.kind,
   ammo:a.pet.energy,max:a.pet.max,completedLaps:a.completedLaps||0,
   clock:a.time,side:orbitPos(a).edge,position:{x:orbitPos(a).x,y:orbitPos(a).y},
   origin:a.origin,used:a.used,group:a.flightId,lastShotPass:{...a.lastShotPass}})),
  shots:()=>G.shots.map(s=>({...s})),
  dispatches:()=>G.dispatchHistory.map(d=>({...d})),
  growth:()=>({seeds:G.seeds.map(v=>({...v})),
   history:G.growthHistory.map(v=>({...v})),
   frontier:frontSurface().map(t=>({x:t.x,y:t.y,color:t.c})),
   occupied:G.tiles.filter(t=>t&&t.lit).map(t=>({x:t.x,y:t.y,color:t.c,starter:!!t.starter}))}),
  effects:()=>({flying:G.flights.map(b=>({color:b.col,from:[b.x,b.y],to:[b.tx,b.ty],
   life:b.life,remaining:b.ttl,finishing:b.finishing})),
   landed:G.displayLit,actualLit:G.lit,impacts:G.landingCount,rings:G.impactRings.length}),
  conservation:()=>{const all=G.homes.flat().concat(G.active.map(a=>a.pet));
   return {count:all.length,uniqueIDs:new Set(all.map(m=>m.id)).size,
    nonnegative:all.every(m=>m.energy>=0&&m.energy<=m.max),
    byColor:COLORS.map((_,c)=>all.filter(m=>m.color===c).reduce((sum,m)=>sum+m.energy,0)),
    totalFixed:all.reduce((sum,m)=>sum+m.energy,0)};},
  exactRay:(edge,x,y,color)=>{
   const r=rayCandidate(edge,edge==="top"||edge==="bottom"?x:y,color);
   const cell=t=>t&&{x:t.x,y:t.y,c:t.c};
   return {hit:cell(r.candidate),blocker:cell(r.blocker),support:cell(r.support)};
  },
  trap:()=>({sealed:scanSealed().map(t=>({x:t.x,y:t.y,c:t.c})),
   trapped:G.deadlockTiles.map(v=>({...v}))}),
  visualGuide:()=>({open:dialogName==="guide",page:guidePage,
   total:GUIDE_PAGES.length,images:GUIDE_PAGES.map(v=>v.img),
   modalVisible:!byId("overlay").classList.contains("is-hidden")}),
  showVisualGuide:(page=0)=>showGuide(page),
  closeModal:()=>hideModal(),
  petPalette:()=>PETS.map((p,kind)=>({kind,name:p.name,species:p.kind,color:p.color,body:p.base})),
  squareRoute:(progress,lane=1)=>squareRoute(progress,lane),
  orbitPos:(time,lane=1,origin=0)=>orbitPos({time,lane,origin}),
  gateX:i=>GATE_X(i),
  vanishing:()=>G.fades.map(f=>({...f})),
  music:()=>({enabled:musicEnabled,paused:theme.paused,sfx:audio})
 };
}
setVisualMode();
syncAudioButtons();
begin(rememberedLevel());
const qp=new URLSearchParams(location.search);
if(!qp.has("qa")||qp.has("guide")){
 let seen=false;try{seen=localStorage.getItem(GUIDE_KEY)==="read";}catch(e){}
 if(!seen||qp.has("guide"))showGuide(0);
}
requestAnimationFrame(raf);
})();
