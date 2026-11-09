/* Paw Prism 1.9 | 24 NEW original four-pigment pixel pictures.
   Each 23x23 cell is either empty or one of precisely:
   0 scarlet, 1 golden yellow, 2 blue, 3 bright green.
   Built-from-center physics, diagonal-free shots and translucent future tiles
   live in game.js. This authored art layer is deterministic and offline. */
(() => {
"use strict";
const R=0,Y=1,B=2,G=3,S=23,ARTS=24;
function render(id){
 const cells=Array(S*S).fill(null);
 const px=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<S&&y<S)cells[y*S+x]=c;};
 const rect=(x,y,w,h,c)=>{for(let j=Math.max(0,Math.floor(y));j<Math.min(S,Math.ceil(y+h));j++)
  for(let i=Math.max(0,Math.floor(x));i<Math.min(S,Math.ceil(x+w));i++)px(i,j,c);};
 const oval=(cx,cy,rx,ry,c)=>{for(let y=0;y<S;y++)for(let x=0;x<S;x++)
   if(((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1)px(x,y,c);};
 const poly=(points,c)=>{for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if(((a[1]>y+.5)!==(b[1]>y+.5))&&
       (x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
  }if(inside)px(x,y,c);
 }};
 const line=(x1,y1,x2,y2,t,c)=>{let den=(x2-x1)**2+(y2-y1)**2;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
   let v=den?Math.max(0,Math.min(1,((x+.5-x1)*(x2-x1)+(y+.5-y1)*(y2-y1))/den)):0;
   let dx=x+.5-(x1+v*(x2-x1)),dy=y+.5-(y1+v*(y2-y1));
   if(dx*dx+dy*dy<=(t/2)**2)px(x,y,c);
 }};
 const flower=(x,y,c1,c2)=>{oval(x,y-2,1.4,2,c1);oval(x,y+2,1.4,2,c1);
  oval(x-2,y,2,1.4,c1);oval(x+2,y,2,1.4,c1);oval(x,y,1.1,1.1,c2);};
 const sparkle=(x,y,c)=>{px(x,y-2,c);px(x,y-1,c);px(x,y,c);px(x,y+1,c);px(x,y+2,c);px(x-2,y,c);px(x-1,y,c);px(x+1,y,c);px(x+2,y,c);};
 const bow=(x,y,c)=>{poly([[x,y],[x-4,y-2],[x-3,y+2]],c);
  poly([[x,y],[x+4,y-2],[x+3,y+2]],c);oval(x,y,1.4,1.4,Y);};
 const ellipseEyes=(y)=>{oval(8.2,y,1.2,1.4,B);oval(14.8,y,1.2,1.4,B);};
 switch(id){
 case 0: // golden wishing star: each step grows an original bright illustration
  poly([[11.5,1],[15,7],[22,8.2],[17.3,13],[18.8,21],[11.5,17.4],[4,21],[5.7,13],[1,8.2],[8,7]],Y);
  oval(11.5,12.0,5.6,5.1,B);oval(11.5,10.7,4.4,3.2,Y);
  ellipseEyes(11);bow(11.5,15.3,R);break;
 case 1: // red fox with emerald scarf
  oval(11.5,13,8.2,7.8,R);
  poly([[3.2,10],[4,1],[10.3,5.3]],R);poly([[13,5.3],[19,1],[20,10]],R);
  poly([[5,7],[5,3],[8.5,7]],Y);poly([[15,7],[18,3],[18,8]],Y);
  oval(11.5,15.1,5.8,4.6,Y);ellipseEyes(12);
  oval(11.5,16,1,1,R);rect(7,19,9,2,G);
  oval(21,18,2.1,3.6,R);px(21,17,Y);break;
 case 2: // gold carrot shaped lantern with green stalk and blue drops
  poly([[6,5],[17,5],[16,12],[13,20],[11,22],[9,19],[7,12]],Y);
  poly([[10,5],[7,1],[11,2],[12,5]],G);
  poly([[12,5],[15,1],[16,3],[14,6]],G);
  line(8,9,15,10,1.8,R);line(9,14,14,15,1.8,R);
  oval(8,19,1.4,1.5,B);oval(16,20,1.4,1.5,B);bow(12,7,R);break;
 case 3: // blue owl and wide golden eyes
  oval(11.5,12.5,8.1,9.1,B);
  poly([[3,7],[5,1],[10,5]],B);poly([[13,5],[18,1],[20,7]],B);
  oval(7.9,11.5,3.6,4.0,Y);oval(15.1,11.5,3.6,4.0,Y);
  oval(8.4,12,1.5,1.8,B);oval(14.7,12,1.5,1.8,B);
  poly([[10,15],[13,15],[11.5,18]],R);rect(8,19,7,2,G);break;
 case 4: // whale and a wave crest
  oval(10.5,12.2,9.1,5.5,B);poly([[17,12],[22,7],[22,17]],B);
  poly([[5,8],[8,8],[6,3],[12,7]],B);
  oval(7.4,11.7,1.2,1.3,Y);line(1,18,22,18,1.8,G);
  oval(10,16.1,4.8,1.5,Y);break;
 case 5: // striped red/yellow airship with blue basket
  oval(11.5,8.3,7.2,7.3,R);oval(11.5,8.3,3.9,7.1,Y);
  oval(11.5,8.3,1.2,7.0,R);line(6,12,9,17,1.2,B);line(17,12,14,17,1.2,B);
  poly([[8,17],[15,17],[14,21],[9,21]],B);
  rect(10,18,3,1,Y);break;
 case 6: // cactus in golden planter with a vivid scarlet flower
  rect(9,5,6,13,G);oval(12,5.3,3.0,3.6,G);
  oval(6.9,10,3.5,2.7,G);rect(6,9,3,6,G);
  oval(17.4,12,3.4,2.6,G);rect(15,11,4,5,G);
  poly([[7,17],[18,17],[16,22],[9,22]],Y);rect(8,17,9,2,B);
  flower(12,3,R,Y);px(10,10,Y);px(14,13,Y);break;
 case 7: // red rocket with blue windshield, gold engine
  poly([[11.5,1],[17,9],[16,18],[7,18],[6,9]],R);
  oval(11.5,10,3.5,3.5,B);oval(11.5,10,1.8,1.8,Y);
  poly([[6,13],[2,20],[8,18]],B);poly([[17,13],[21,20],[15,18]],B);
  poly([[9,18],[11.5,23],[14,18]],Y);break;
 case 8: // scarlet koi and waterlily
  oval(12,11.5,7.3,5.0,R);poly([[17,11],[22,5],[22,18]],R);
  poly([[9,9],[4,2],[13,7]],Y);poly([[9,15],[4,21],[14,16]],Y);
  oval(9,10.9,1.2,1.2,B);line(4,19,19,19,1.5,B);
  oval(4,16,2.3,1.6,G);flower(5,16,Y,R);
  rect(2,19,3,2,G);rect(20,19,2,2,G);break;
 case 9: // frog monarch
  oval(11.5,13.2,8.1,7.4,G);
  oval(6,7.5,3.2,3.4,G);oval(17,7.5,3.2,3.4,G);
  oval(6,7.5,1.8,1.9,B);oval(17,7.5,1.8,1.9,B);
  poly([[6,5],[8,1],[11.5,5],[15,1],[18,5],[17,7],[6,7]],Y);
  oval(11.5,4.4,1.3,1.2,R);line(7,15,16,15,1.2,Y);
  rect(6,19,5,2,G);rect(13,19,5,2,G);break;
 case 10: // blossom lantern
  rect(10,12,3,10,G);oval(7,19,4.4,2.2,G);oval(16,19,4.4,2.2,G);
  flower(11.5,9,R,Y);flower(5,10,R,Y);flower(18,8,R,Y);
  oval(11,10,4.4,3.5,Y);oval(11,10,2.1,2.0,B);
  break;
 case 11: // sacred crystal with four colored rays
  poly([[11,1],[18,8],[16,19],[11,22],[5,17],[4,7]],B);
  poly([[11,3],[14,10],[11,20],[8,10]],Y);
  poly([[4,7],[11,3],[8,10],[11,20],[4,17]],G);
  poly([[14,10],[19,8],[16,19],[11,20]],R);
  break;
 case 12: // symmetrical bright garden butterfly
  oval(7,8,6,5.8,R);oval(16,8,6,5.8,Y);
  oval(7,16,5.5,5,G);oval(16,16,5.5,5,B);
  oval(6.7,8.8,2.1,2.3,Y);oval(16,8.8,2.1,2.3,R);
  oval(11.5,12,1.4,8,B);line(11,6,9,2,1,G);line(12,6,15,2,1,G);break;
 case 13: // red spiral shell and little green snail
  oval(10.5,12,8.1,7.1,R);oval(10.5,12,5.3,5.0,Y);
  oval(10.5,12,2.4,2.6,R);
  oval(14,19.5,8,2.3,G);oval(20,15.2,2.8,5.0,G);
  line(19,12,18.4,8,1.5,B);line(21,12,22,8,1.5,B);
  px(18,8,B);px(22,8,B);break;
 case 14: // red mushroom house with sunny yellow spots
  rect(7,11,10,10,Y);oval(12,20,10,1.6,G);
  oval(12,10,9,7,R);
  oval(7,9,1.6,1.9,Y);oval(16,7,2,2.2,Y);
  oval(12,5,1.6,1.9,Y);
  rect(10,16,4,5,B);rect(5,15,3,3,G);rect(17,15,3,3,G);break;
 case 15: // blue teddy with heart
  oval(5,5.5,3.9,3.8,B);oval(18,5.5,3.9,3.8,B);
  oval(11.5,15.1,7.0,7.0,B);oval(11.5,9.0,7.8,7.9,B);
  oval(11.5,13.7,4.5,3.9,Y);ellipseEyes(9);
  oval(11.5,12.5,1.2,1.1,R);flower(11,19,R,Y);
  oval(5,21,2.3,1.2,G);oval(18,21,2.3,1.2,G);break;
 case 16: // rosy apple and blue dewdrops
  oval(8.5,13,7.4,8.3,R);oval(15,13,7.4,8.3,R);
  line(11.5,6,12.7,1,2,Y);oval(17,4,5.2,2.3,G);
  oval(6,12,2.5,2.0,Y);oval(16,11,1.2,1.1,Y);
  oval(4,20,1.2,1.5,B);oval(19,20,1.2,1.5,B);break;
 case 17: // blue winter penguin in its bright red scarf
  oval(11.5,13,7.4,9.6,B);
  oval(11.5,14,5.1,6.4,Y);ellipseEyes(9);
  poly([[9,12],[14,12],[11.5,15]],R);
  rect(7,16,9,2,R);poly([[14,17],[19,17],[18,21],[15,21]],R);
  oval(7,21,3,1.3,G);oval(16,21,3,1.3,G);break;
 case 18: // festival cupcake
  poly([[4,12],[19,12],[16.5,22],[7,22]],B);
  rect(9,13,2,7,G);rect(13,13,2,7,G);
  oval(11.5,13,9.5,4,R);oval(11.5,9,7.2,5.1,R);
  oval(11.5,6,4.3,4.5,Y);
  px(5,11,Y);px(18,10,Y);break;
 case 19: // woodland golden treasure chest
  rect(4,8,15,13,R);oval(11.5,8.5,8.4,5.0,R);
  rect(4,11,15,3,Y);rect(5,18,13,3,Y);
  rect(10,12,4,5,B);rect(11,13,2,3,Y);
  break;
 case 20: // green stem with sun-yellow 12 petal blossom
  for(let k=0;k<12;k++){
   let a=k*Math.PI/6;oval(11.5+6.0*Math.cos(a),9+6*Math.sin(a),2.7,2.7,Y);
  }
  oval(11.5,9,4.5,4.8,R);oval(11.5,9,2.4,2.4,B);
  rect(10,13,3,10,G);poly([[10,18],[3,13],[4,20]],G);poly([[12,17],[20,12],[19,20]],G);break;
 case 21: // four-pigment forest robot
  rect(5,6,13,12,B);rect(6,7,11,10,B);
  rect(8,8,2,3,Y);rect(14,8,2,3,Y);
  rect(8,13,7,2,G);rect(9,18,5,3,Y);
  rect(2,11,3,6,R);rect(18,11,3,6,R);
  line(11.5,6,11.5,2,1.5,G);oval(11.5,2,2,2,R);
  rect(7,21,3,2,B);rect(14,21,3,2,B);break;
 case 22: // red striped shore lighthouse
  rect(7,8,9,12,Y);rect(7,10,9,3,R);rect(7,16,9,3,R);
  rect(9,6,5,3,B);poly([[8,6],[15,6],[11.5,2]],R);
  rect(10,13,3,3,B);
  line(0,21,22,21,2,G);line(0,19,6,19,2,B);line(16,19,22,19,2,B);break;
 case 23: // green baby dragon with red wings
  poly([[3,13],[1,4],[10,9],[14,5],[21,13],[16,21],[7,20]],G);
  poly([[5,9],[2,2],[11,7]],R);poly([[15,9],[18,2],[21,11]],R);
  poly([[8,7],[10,2],[12,6],[15,3],[16,8]],Y);
  oval(16.5,12,4,3,G);oval(17,11.4,1.2,1.2,B);
  line(19,16,22,16,1.6,Y);break;
 default:throw Error("Unknown artwork "+id);
 }
 // One primary artwork, NOT a constellation of detached '+' ornaments.
 // Keep the centre-connected body of each authored illustration. Every
 // remaining colored pixel can be reached from the centre using four-sided
 // adjacency, so there are no independent remote sub-images.
 const accents={
  0:{x:10,y:13,c:G}, // star's tiny jade decoration
  4:{x:13,y:12,c:R}, // whale's small scarlet cheek
  5:{x:10,y:18,c:G}, // emerald motif on the balloon basket
  7:{x:10,y:15,c:G}, // rocket's control-panel light
  19:{x:8,y:15,c:G} // treasure chest emerald insert
 };
 if(accents[id]){
  const {x,y,c}=accents[id];
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
   if(cells[(y+dy)*S+x+dx]===null)
     throw Error("Accent must remain inside the hero motif for level "+id);
   px(x+dx,y+dy,c);
  }
 }
 const middle=11*S+11;
 if(cells[middle]===null)
  throw Error("Every artwork must have a real centre pixel: "+id);
 const keep=new Set([middle]),pending=[middle];
 for(let i=0;i<pending.length;i++){
  const k=pending[i],x=k%S,y=Math.floor(k/S);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,j=ny*S+nx;
   if(nx>=0&&nx<S&&ny>=0&&ny<S&&cells[j]!==null&&!keep.has(j)){
    keep.add(j);pending.push(j);
   }
  }
 }
 for(let k=0;k<cells.length;k++)if(!keep.has(k))cells[k]=null;
 if(keep.size<130)throw Error("Primary artwork too small: "+id);
 // Exact full-color vocabulary and repeatable deterministic artwork.
 const counts=[0,0,0,0];cells.forEach(c=>{if(c!==null)counts[c]++;});
 if(counts.some(n=>n<4))throw Error("Art "+id+" lacks contrast color: "+counts);
 if(cells.filter(c=>c!==null).length<55)throw Error("Art "+id+" too sparse");
 return cells;
}
window.PawPrismArt19={render,count:ARTS,palette:["#E83B54","#F9CF39","#348CF3","#32BD6B"]};
})();