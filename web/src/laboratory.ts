import * as THREE from 'three';
const RAW_STATIONS=[new THREE.Vector3(-2.3,0,2.1),new THREE.Vector3(0,0,2.1),new THREE.Vector3(2.3,0,2.1),new THREE.Vector3(2.3,0,-.3)];
export const STATIONS = RAW_STATIONS.map(p => new THREE.Vector3(p.x * 1.2, p.y, p.z * 1.2));
export function buildLaboratory(parent:THREE.Scene){
 const scene = new THREE.Group(); scene.scale.set(1.2, 1, 1.2); parent.add(scene);
 const mats=new Map<string,THREE.MeshStandardMaterial>();
 function box(w:number,h:number,d:number,x:number,y:number,z:number,c:string,parent:THREE.Object3D=scene){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.65}));const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats.get(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function cyl(r:number,h:number,x:number,y:number,z:number,c:string,parent:THREE.Object3D=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),new THREE.MeshStandardMaterial({color:c}));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 function sign(text:string,w:number,h:number,x:number,y:number,z:number,bg='#f5f5ed',fg='#344652'){const c=document.createElement('canvas');c.width=2048;c.height=Math.round(2048*h/w);const ctx=c.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=fg;ctx.font=`${c.height*.48}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,1024,c.height/2,1980);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,y,z);scene.add(m);}
 box(10.4,.18,9.5,0,-.13,0,'#c4ccca');
 for(let x=-5;x<5;x+=.5)for(let z=-4.5;z<4.5;z+=.5)box(.49,.035,.49,x+.25,-.015,z+.25,'#e5e6df');
 box(10.1,1.65,.13,0,.825,-4.52,'#a7d6d3');box(10.1,1.55,.13,0,2.425,-4.52,'#f2f1e8');
 box(.13,1.65,9,-5.05,.825,0,'#a7d6d3');box(.13,1.55,9,-5.05,2.425,0,'#f2f1e8');
 box(10,.09,.045,0,.06,-4.42,'#b9c6c3');box(.045,.09,9,-4.96,.06,0,'#b9c6c3');
 box(3.5,1.5,.08,-.7,1.98,-4.40,'#9da6a6');box(3.33,1.33,.035,-.7,1.98,-4.34,'#263c46');
 for(const x of [-2.34,-.7,.94])box(.045,1.37,.035,x,1.98,-4.30,'#9ba7aa');
 box(1.4,2.45,.12,3.5,1.225,-4.38,'#c3ccc7');box(1.24,2.3,.035,3.5,1.18,-4.29,'#eef0e7');box(.08,.18,.05,3.94,1.10,-4.25,'#303b3e');
 sign('SAÍDA',.6,.22,3.5,2.65,-4.24,'#286151','#ffffff');sign('Qualidade significa fazer certo quando ninguém está olhando.',7.7,.28,0,2.99,-4.42);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#626a66';ctx.fillRect(0,0,256,256);let seed=42;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<15000;i++){ctx.fillStyle=['#a3aaa2','#404944','#78827b'][i%3];ctx.fillRect(rand()*256,rand()*256,1+rand()*2,1+rand()*2);}const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,5);tex.colorSpace=THREE.SRGBColorSpace;const stone=new THREE.MeshStandardMaterial({map:tex,roughness:.4});
 box(1.13,.10,6.5,-4.3,.98,-.6,'#666e68').material=stone;box(1.10,.86,6.45,-4.3,.48,-.6,'#ebece2');for(let z=-3.65;z<2.4;z+=.65){box(.028,.75,.61,-3.735,.49,z,'#d0d3c8');box(.035,.035,.22,-3.70,.72,z,'#7c8582');}
 box(2.3,.86,1,-3.65,.48,-3.9,'#e7e9df');box(2.4,.10,1.1,-3.65,.98,-3.9,'#626a66').material=stone;
 // Vertical test press and its safety control.
 box(.86,.16,.8,-4.25,1.12,-1.8,'#303939');box(.16,1.72,.16,-4.56,1.98,-1.98,'#1858a0');box(.60,.15,.57,-4.24,1.4,-1.8,'#acb5b3');cyl(.12,.35,-4.24,1.7,-1.8,'#444c50');box(.6,.14,.48,-4.25,1.94,-1.8,'#303b40');box(.27,.15,.30,-3.98,1.15,-1.39,'#d3d8ce');cyl(.045,.04,-3.98,1.25,-1.39,'#dd4740');
 // Oven/chamber and balance.
 box(.82,.9,.74,-4.26,1.48,.25,'#d5dcd9');box(.035,.58,.59,-3.83,1.43,.25,'#3b4c50');box(.04,.12,.62,-3.8,1.83,.25,'#2360a4');box(.06,.22,.045,-3.77,1.43,.49,'#b3bab6');
 box(.65,.10,.58,-4.22,1.11,-3,'#d2dbd4');const glass=new THREE.MeshPhysicalMaterial({color:'#cce7e6',transparent:true,opacity:.2,roughness:.1,depthWrite:false});box(.58,.49,.52,-4.22,1.40,-3,'#d4e8e4').material=glass;cyl(.17,.025,-4.22,1.18,-3,'#8d9b98');
 cyl(.20,.5,-3.34,1.28,-3.9,'#f3f5ed');for(let i=0;i<3;i++){cyl(.055,.2,-2.98+i*.16,1.13,-3.85,'#e8f0e9');cyl(.035,.045,-2.98+i*.16,1.25,-3.85,['#1c5ca6','#53a269','#d45648'][i]);}
 box(.45,.67,.44,-3.24,.34,-2.86,'#1763ac');box(.49,.09,.48,-3.24,.73,-2.86,'#2678bc');
 box(1,.85,.035,-3.5,2.25,-4.40,'#c79b62');for(let i=0;i<4;i++)box(.38,.30,.015,-3.73+(i%2)*.46,2.45-Math.floor(i/2)*.38,-4.37,i%2?'#bb6353':'#eee9d7');
 RAW_STATIONS.forEach((p,i)=>{const g=new THREE.Group();g.position.set(p.x,0,p.z-.75);g.scale.set(1/1.2,1,1/1.2);scene.add(g);box(2.1,.08,1,0,.80,0,'#d7d8cf',g);for(const x of [-.9,.9])for(const z of [-.35,.35])box(.055,.76,.055,x,.39,z,'#a4ada9',g);box(2.1,.56,.045,0,1.08,-.48,'#b7bdb6',g);box(.045,.42,.98,1.02,1.04,0,'#b7bdb6',g);
 if(i<3){box(.88,.52,.055,0,1.28,-.20,'#20292c',g);box(.80,.44,.008,0,1.28,-.166,'#2c7793',g);box(.075,.18,.06,0,.96,-.20,'#353e40',g);box(.35,.028,.22,0,.86,-.16,'#424c4b',g);box(.64,.025,.21,-.05,.86,.20,'#333d3e',g);for(let r=0;r<4;r++)for(let c=0;c<12;c++)box(.038,.005,.028,-.33+c*.048,.875,.13+r*.045,'#727b78',g);box(.17,.48,.44,.77,.3,-.15,'#333e40',g);for(let j=0;j<3;j++)box(.61,.025,.009,-.04,1.37-j*.09,-.159,j===0?'#b6e4dc':'#71aabb',g);
 }else{box(.72,.035,.46,0,.86,.06,'#9da9ac',g);box(.72,.45,.025,0,1.08,-.15,'#313e43',g).rotation.x=-.2;box(.65,.37,.008,0,1.08,-.127,'#599eac',g).rotation.x=-.2;box(.22,.005,.12,0,.881,.18,'#7a8c92',g);}
 const z=.83;box(.59,.09,.58,0,.48,z,'#293334',g);box(.56,.6,.09,0,.84,z+.24,'#30393a',g);cyl(.045,.33,0,.27,z,'#919c9b',g);for(const x of [-.34,.34]){box(.045,.23,.045,x,.58,z,'#414a48',g);box(.065,.045,.36,x,.7,z,'#323b3b',g);}for(let j=0;j<5;j++){const a=j*Math.PI*2/5;box(.05,.045,.43,Math.sin(a)*.18,.1,z+Math.cos(a)*.18,'#495453',g).rotation.y=a;cyl(.055,.07,Math.sin(a)*.37,.055,z+Math.cos(a)*.37,'#293332',g);}box(.3,.012,.22,-.69,.855,.12,'#faf9ef',g);
 });
 box(.68,.63,.64,-2.64,.33,-3.78,'#e1e4dc');box(.74,.29,.61,-2.64,.81,-3.78,'#475352');box(.52,.025,.37,-2.64,.97,-3.78,'#eaeee5');
 scene.add(new THREE.HemisphereLight('#ffffff','#a6b5b2',2.1));const sun=new THREE.DirectionalLight('#fff7e5',3);sun.position.set(2,9,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9});sun.shadow.normalBias=.035;scene.add(sun);const fill=new THREE.DirectionalLight('#d5efff',1.2);fill.position.set(-4,5,-3);scene.add(fill);
}
export function disposeObject(root:THREE.Object3D){const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>(),ts=new Set<THREE.Texture>();root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Sprite){if(o instanceof THREE.Mesh)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);for(const v of Object.values(m))if(v instanceof THREE.Texture)ts.add(v);}}});gs.forEach(g=>g.dispose());ts.forEach(t=>t.dispose());ms.forEach(m=>m.dispose());}
