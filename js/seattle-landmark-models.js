import * as THREE from 'three/webgpu';
import { box, cylinder, beam, gable, mesh, batchStatic } from './seattle-geometry.js';

// Tiny geometric lettering shares the building's trim material: no font/image fetch,
// canvas atlas, per-landmark texture, or additional material draw.
const GLYPHS={A:'0111010001111111000110001',B:'1111010001111101000111110',C:'0111110000100001000001111',D:'1111010001100011000111110',E:'1111110000111101000011111',F:'1111110000111101000010000',G:'0111110000101111000101111',H:'1000110001111111000110001',I:'1111100100001000010011111',J:'0011100010000101001001100',K:'1000110010111001001010001',L:'1000010000100001000011111',M:'1000111011101011000110001',N:'1000111001101011001110001',O:'0111010001100011000101110',P:'1111010001111101000010000',Q:'0111010001100011001101111',R:'1111010001111101001010001',S:'0111110000011100000111110',T:'1111100100001000010000100',U:'1000110001100011000101110',V:'1000110001100010101000100',W:'1000110001101011101110001',X:'1000101010001000101010001',Y:'1000101010001000010000100',Z:'1111100010001000100011111',0:'0111010011101011100101110',1:'0010001100001000010001110',2:'1111000001011101000011111',3:'1111000001011100000111110',4:'1001010010111110001000010',5:'1111110000111100000111110',6:'0111010000111101000101110',7:'1111100010001000100001000',8:'0111010001011101000101110',9:'0111010001011110000101110'};
function lettering(g,p,d){
  if(['spring','railbridge','clock'].includes(d.kind))return;
  const text=d.name.split('/')[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const width=Math.min(30,d.w*.75),step=width/(text.length*6),height=step*5;
  const y=d.kind==='theater'?d.h*.35+.4:Math.min(d.h*.32,6),z=d.d*.72+1,positions=[];
  box(g,p.dark,0,y-.1,z-.12,width+1,height+.6,.2);
  for(let i=0;i<text.length;i++){
    const glyph=GLYPHS[text[i]];if(!glyph)continue;
    for(let k=0;k<25;k++)if(glyph[k]==='1'){
      const x=-width/2+(i*6+k%5)*step,b=y+(4-Math.floor(k/5))*step,s=step*.86;
      positions.push(x,b,z,x+s,b,z,x+s,b+s,z,x,b,z,x+s,b+s,z,x,b+s,z);
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
  mesh(g,geo,p.white);
}

// Shared recipes describe architectural families; dimensions, roof profiles and signatures
// belong to the individual surveyed site. No generated texture per building.
export function buildDistrictLandmark(g, p, d) {
  const {w,h,d:depth,kind,id}=d, brick=p.facades[4], stone=p.limestone;
  const glass=p.dark, trim=p.white, roof=p.roof;
  const B=(m,x,y,z,a,b,c)=>box(g,m,x,y,z,a,b,c);
  const C=(m,x,y,z,a,b,c,n=12)=>cylinder(g,m,x,y,z,a,b,c,n);
  const G=(m,x,y,z,a,b,c)=>gable(g,m,x,y,z,a,b,c);
  const dome=(m,x,y,z,r)=>{
    const s=mesh(g,new THREE.SphereGeometry(r,16,10,0,Math.PI*2,0,Math.PI/2),m,x,y,z);
    return s;
  };
  const stairs=(width,z,levels=5)=>{
    for(let i=0;i<levels;i++) B(stone,0,0,z+i*.65,width+i*.8,(levels-i)*.3,.7);
  };
  const windows=(width,height,z,rows=3)=>{
    for(let y=0;y<rows;y++)for(let x=-width/2+3;x<width/2-1;x+=5){
      B(trim,x,2+y*(height-3)/rows,z,2.6,Math.min(3.5,(height-3)/rows-.6),.35);
      B(glass,x,2.25+y*(height-3)/rows,z+.23,2.1,Math.min(3,(height-3)/rows-1.1),.18);
    }
  };
  const portico=(width,z,height)=>{
    for(let i=0;i<4;i++) C(trim,(i-1.5)*width/3,0,z,.4,.55,height);
    B(stone,0,height,z,width+2,1.3,4);
    G(stone,0,height+1.3,z,width+3,3,5);
    stairs(width,z+3);
  };
  const pitched=(width,y,z,length)=>G(roof,0,y,z,width,Math.min(7,width*.2),length);
  if(kind==='clock') {
    C(p.copper,0,0,0,.5,.9,h-1);
    B(p.copper,0,h-2,0,3,2.2,3);
    for(let side=0;side<4;side++){
      const face=new THREE.Group();g.add(face);
      const disc=C(trim,0,h-.9,1.55,.85,.85,.08,24);disc.rotation.x=Math.PI/2;
      // The cylinder is recentered after rotation so every face stays vertical.
      disc.position.set(0,h-.9,1.55);face.attach(disc);
      const hour=B(glass,.17,h-1.05,1.62,.12,.55,.06);
      const minute=B(glass,-.15,h-.9,1.62,.5,.1,.06);
      face.attach(hour);face.attach(minute);face.rotation.y=side*Math.PI/2;
    }
    C(p.copper,0,h+.1,0,0,.8,.7);
  } else if(kind==='spring') {
    C(stone,0,0,0,w*.4,w*.45,.6,18);
    C(roof,0,.6,0,w*.3,w*.36,.25,18);
    C(p.water,0,.9,0,w*.13,w*.13,.08,18);
    for(let i=0;i<12;i++){
      const a=i*2.4,r=w*(.22+.08*Math.sin(i));
      const rock=mesh(g,new THREE.IcosahedronGeometry(1,0),i%3?roof:stone,Math.cos(a)*r,1,Math.sin(a)*r);
      rock.scale.set(1.6,.6,1.3);
    }
    for(let i=0;i<18;i++){
      const a=i*2.4,r=w*.4;
      C(p.leaf,Math.cos(a)*r,1,Math.sin(a)*r,.07,.1,2+i%3,5);
    }
    for(let i=0;i<10;i++)B(p.timber,-w*.6+i*3,1.6,depth*.52,2.8,.2,3);
  } else if(kind==='railbridge') {
    for(const side of [-1,1])for(let i=0;i<8;i++){
      const z=-depth/2+i*depth/8;
      beam(g,p.steel,[side*w/2,6,z],[side*w/2,18,z+depth/8],.5);
      beam(g,p.steel,[side*w/2,18,z],[side*w/2,6,z+depth/8],.5);
      beam(g,p.steel,[side*w/2,18,z],[side*w/2,18,z+depth/8],.5);
    }
    B(p.steel,0,4,0,w,2,depth);
    for(const x of [-3,3])B(p.dark,x,6,0,.3,.3,depth);
    for(const x of [-w/2,w/2]){
      B(stone,x,0,-depth*.2,6,12,10);
      beam(g,p.steel,[x,6,depth*.15],[x,h,depth*.4],1);
      B(stone,x,h*.55,depth*.15,8,10,12);
    }
  } else if(kind==='glasshouse') {
    B(stone,0,0,0,w,1,depth);
    B(p.blueRoof,0,1,0,w,h*.5,depth);
    dome(p.blueRoof,0,h*.5,0,depth*.48);
    for(let x=-w/2;x<=w/2;x+=3){
      beam(g,trim,[x,1,depth/2],[x,h*.52,depth/2],.13);
      beam(g,trim,[x,h*.52,depth/2],[x,h*.8,0],.13);
      beam(g,trim,[x,h*.8,0],[x,h*.52,-depth/2],.13);
    }
    for(const y of [2,h*.35,h*.55])B(trim,0,y,depth/2+.1,w,.15,.15);
    C(p.copper,0,h*.9,0,0,.8,2);
    B(trim,0,1,depth/2,6,6,2);
  } else if(kind==='wedge') {
    B(p.dark,0,0,0,w*.5,3,depth*.6);
    G(trim,0,3,0,w,h,depth);
    B(p.blueRoof,0,4,depth/2+.1,w*.75,h*.35,.2);
    beam(g,p.steel,[-w/2,3,depth/2],[0,h+3,depth/2],.2);
    beam(g,p.steel,[w/2,3,depth/2],[0,h+3,depth/2],.2);
  } else if(kind==='terrace') {
    for(let i=0;i<6;i++){
      const x=(i%3-1)*w*.28,z=(Math.floor(i/3)-.5)*depth*.45;
      B(stone,x,0,z,w*.32,3+i%3*2,depth*.45);
      B(p.leaf,x,3+i%3*2,z,w*.26,.6,depth*.3);
    }
    for(let i=0;i<5;i++){
      B(stone,0,i*1.6,depth/2-i*3,18,1.6,4);
      B(p.water,0,i*1.6+1.7,depth/2-i*3,16,.12,3);
    }
  } else if(kind==='courtyard') {
    for(const x of [-w*.38,w*.38]){
      B(stone,x,0,0,w*.24,h,depth);G(roof,x,h,0,w*.28,4,depth+2);
      for(let z=-depth/2+4;z<depth/2;z+=6)B(glass,x,3,z,3,5,2);
    }
    B(stone,0,0,-depth*.38,w,h,depth*.24);
    B(p.leaf,0,.5,0,w*.45,.3,depth*.5);
    portico(w*.24,depth*.4,h*.5);
  } else if(kind==='house'||kind==='floating') {
    const m=kind==='floating'?p.timber:((d.source%2)?trim:brick);
    if(kind==='floating')B(p.dark,0,-1,0,w+4,1.5,depth+5);
    B(m,0,0,0,w,h*.65,depth);
    pitched(w+2,h*.65,0,depth+2);
    G(roof,w*.18,h*.6,depth*.23,w*.65,h*.4,depth*.6);
    B(p.timber,0,.5,depth*.58,w+4,.5,4);
    for(let x=-w/2;x<=w/2;x+=w/4)C(trim,x,1,depth*.67,.15,.2,h*.35,8);
    B(roof,0,h*.4,depth*.6,w+5,.5,5);
    windows(w,h*.6,depth/2+.1,2);stairs(w*.4,depth*.75,3);
    for(const x of [-w*.3,w*.3])B(brick,x,h*.6,-depth*.2,1.5,h*.4,1.5);
    if(['fitch-house','drake-house'].includes(id)){
      C(m,-w*.4,0,depth*.3,3,3,h*.8);
      C(p.copper,-w*.4,h*.8,depth*.3,0,4,h*.45);
    }
  } else if(['church','cathedral','onion'].includes(kind)) {
    B(kind==='church'?brick:stone,0,0,0,w*.72,h*.5,depth);
    pitched(w*.8,h*.5,0,depth+2);
    const towers=kind==='church'&&!['blessed-sacrament'].includes(id)?[-w*.35]:[-w*.35,w*.35];
    for(const x of towers){
      B(stone,x,0,depth*.3,w*.22,h*.78,w*.22);
      B(glass,x,h*.55,depth*.3+w*.115,w*.12,h*.14,.2);
      if(kind==='cathedral')dome(p.copper,x,h*.78,depth*.3,w*.14);
      else if(kind==='onion'){
        const bulb=mesh(g,new THREE.SphereGeometry(w*.15,16,10),p.blueRoof,x,h*.82,depth*.3);
        bulb.scale.y=1.3;C(p.copper,x,h*.95,depth*.3,0,w*.13,h*.12);
      }else C(p.copper,x,h*.78,depth*.3,0,w*.17,h*.27,4);
      const top=kind==='church'?h*1.05:h;
      B(p.copper,x,top,depth*.3,.2,2.5,.2);B(p.copper,x,top+1.5,depth*.3,1.5,.2,.2);
    }
    portico(w*.3,depth/2+2,h*.22);
    const rose=C(trim,0,h*.43,depth/2+.2,w*.12,w*.12,.3,20);
    rose.rotation.x=Math.PI/2;rose.position.set(0,h*.43,depth/2+.2);
    for(let z=-depth/2+4;z<depth/2;z+=7)for(const side of [-1,1])
      B(glass,side*w*.365,h*.2,z,.2,h*.18,2.5);
  } else if(kind==='boathouse') {
    B(id==='yacht-club'?trim:p.timber,0,0,0,w,h*.65,depth);
    pitched(w+2,h*.65,0,depth+2);
    for(let x=-w/2+5;x<w/2;x+=10)B(p.blueRoof,x,1,depth/2+.1,7,h*.5,.25);
    B(p.timber,0,.2,depth*.7,w+12,.5,8);
    for(let i=0;i<6;i++){
      const x=(i-2.5)*7,z=depth*.8+7;
      const hull=mesh(g,new THREE.SphereGeometry(1,10,6),i%2?p.timber:trim,x,1,z);
      hull.scale.set(1.3,.7,5);C(p.steel,x,1,z,.08,.1,10+i%3,6);
    }
  } else if(kind==='industrial') {
    B(brick,0,0,0,w,h,depth);
    windows(w,h,depth/2+.1,3);
    if(id==='steam-plant')for(const x of [-w*.25,w*.25]){
      C(roof,x,h,-depth*.2,2.5,3.3,h*2);C(p.dark,x,h*3,-depth*.2,3,3,.8);
    }
    else for(let x=-w/2+6;x<w/2;x+=12)G(p.dark,x,h,0,12,5,depth);
    B(p.steel,0,h*.7,depth/2+2,w,.5,3);
    for(let x=-w/2+4;x<w/2;x+=8)beam(g,p.steel,[x,0,depth/2+3],[x,h*.7,depth/2+3],.2);
  } else if(kind==='pool'||kind==='modern'||kind==='showroom') {
    B(stone,0,0,0,w,h*.75,depth);
    B(glass,0,1,depth/2+.1,w*.85,h*.6,.2);
    for(let x=-w/2+3;x<w/2;x+=5)B(trim,x,1,depth/2+.3,.2,h*.6,.2);
    B(p.blueRoof,0,h*.75,0,w+4,1,depth+4);
    B(stone,0,0,-depth*.2,w*.6,h,depth*.6);
    B(trim,0,h*.55,depth*.6,w*.7,.8,depth*.3);
    if(kind==='pool'){
      B(trim,0,0,depth*.95,w*.65,1.2,depth*.65);
      B(p.blueRoof,0,1.21,depth*.95,w*.6,.06,depth*.55);
      for(let x=-w*.2;x<w*.25;x+=w*.1)B(p.dark,x,1.28,depth*.95,.15,.02,depth*.5);
    }
  } else {
    const isSchool=kind==='school',isTower=kind==='tower',isFire=kind==='fire';
    B(brick,0,0,0,w,h*(isTower?.5:.85),depth);
    windows(w,h*(isTower?.5:.8),depth/2+.1,Math.max(2,Math.floor(h/5)));
    for(const side of [-1,1])B(stone,side*(w/2-.5),0,depth/2,.8,h*.85,.8);
    B(stone,0,h*(isTower?.5:.85),0,w+1,1.2,depth+1);
    if(isSchool||isTower){
      B(stone,0,0,depth*.18,w*.22,h,depth*.8);
      B(glass,0,h*.5,depth*.59,w*.1,h*.3,.25);
      if(isTower){
        for(let i=0;i<3;i++)B(brick,0,h*.7+i*h*.09,0,w*(.38-i*.07),h*.12,depth*(.8-i*.13));
      }else{
        G(roof,0,h,depth*.18,w*.26,5,depth*.85);
        C(p.copper,0,h+5,depth*.18,0,2.4,4,8);
        stairs(w*.25,depth*.65);
      }
    }else if(kind==='library')portico(w*.55,depth/2+2,h*.55);
    else if(isFire){
      for(let x=-w*.3;x<=w*.3;x+=w*.3){
        B(p.roof,x,.3,depth/2+.4,w*.23,h*.38,.3);
        for(let i=1;i<5;i++)B(p.steel,x,i*h*.075,depth/2+.6,w*.22,.08,.1);
      }
      B(brick,-w*.38,0,-depth*.25,w*.2,h*1.4,depth*.28);
      B(glass,-w*.38,h*1.05,-depth*.1,w*.1,2,.2);
    }else if(kind==='theater'){
      B(p.roof,0,h*.35,depth*.58,w*.85,1.6,depth*.25);
      B(trim,0,h*.35+.4,depth*.71,w*.8,.6,.15);
      B(p.roof,-w*.38,h*.45,depth*.58,2.5,h*.65,2);
      for(let i=0;i<7;i++)B(trim,-w*.38,h*.5+i*h*.07,depth*.7,1.4,.35,.15);
      for(let x=-w*.3;x<w*.4;x+=3)B(p.copper,x,h*.35-.4,depth*.7,.3,.3,.2);
    }else if(kind==='hotel'){
      for(let x=-w*.3;x<w*.4;x+=w*.3)B(stone,x,3,depth*.54,w*.17,h*.6,depth*.1);
      B(p.copper,0,h*.17,depth*.63,w*.4,.5,depth*.25);
      if(id==='arctic'){C(stone,0,h,0,5,5,4,16);dome(p.copper,0,h+4,0,5);}
    }else{G(roof,0,h*.86,0,w+2,4,depth+2);portico(w*.35,depth*.55,h*.4);}
  }
  g.userData.signature=d.signature;
  lettering(g,p,d);
  batchStatic(g);
}
