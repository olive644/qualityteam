import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Person } from "./api.js";

type Outfit = "coat" | "shirt" | "polo" | "uniform" | "default";
export function outfitFor(name: string): Outfit {
  const tokens = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z]+/);
  if (tokens.includes("ana") || tokens.includes("edivania")) return "coat";
  if (tokens.includes("wyliane")) return "shirt";
  if (tokens.includes("inaly")) return "polo";
  if (tokens.includes("oliver")) return "uniform";
  return "default";
}

/** Stylized figures with the hairstyles and clothing supplied by the team. */
export function makeCharacter(person: Person): THREE.Group {
  const root = new THREE.Group();
  const outfit = outfitFor(person.name);
  const name = person.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z]+/);
  const wyliane = name.includes("wyliane"), ana = name.includes("ana");
  const inaly = name.includes("inaly"), oliver = name.includes("oliver"), edivania = name.includes("edivania");
  root.userData.phase = Array.from(person.id).reduce((v,c) => v + c.charCodeAt(0), 0) * .37;
  const white = outfit === "coat" || outfit === "shirt";
  const fabric = new THREE.MeshStandardMaterial({ color: white ? "#fafaf5" : outfit === "default" ? person.color : "#24282d", roughness: .94 });
  const seam = new THREE.MeshStandardMaterial({ color: white ? "#ced8d7" : "#535d63", roughness: .9 });
  const skin = new THREE.MeshStandardMaterial({ color: "#d8b298", roughness: .88 });
  const pants = new THREE.MeshStandardMaterial({ color: "#364451", roughness: .96 });
  const shoe = new THREE.MeshStandardMaterial({ color: "#273033", roughness: .7 });
  const hair = new THREE.MeshStandardMaterial({ color: wyliane || edivania ? "#d4af65" : "#403b36", roughness: .87 });
  const eye = new THREE.MeshStandardMaterial({ color: "#253039", roughness: .65 });
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = root) {
    const m = new THREE.Mesh(geometry, material); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function sphere(r: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = root) {
    return mesh(new THREE.SphereGeometry(r, 20, 16), material, x,y,z,parent);
  }
  function box(w: number,h: number,d: number, material: THREE.Material,x: number,y: number,z: number,parent: THREE.Object3D = root) {
    return mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(w,h,d)*.23), material,x,y,z,parent);
  }
  function lock(points: number[][], width: number, depth: number, material: THREE.Material, parent: THREE.Object3D) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));
    const steps=24,rings=10,frames=curve.computeFrenetFrames(steps,false);
    const positions:number[]=[],indices:number[]=[];
    for(let i=0;i<=steps;i++){
      const t=i/steps,center=curve.getPointAt(t);
      const taper=.035+.965*Math.pow(1-t,.43);
      for(let j=0;j<=rings;j++){
        const angle=j/rings*Math.PI*2;
        const v=center.clone().addScaledVector(frames.normals[i],Math.cos(angle)*width*taper).addScaledVector(frames.binormals[i],Math.sin(angle)*depth*taper);
        positions.push(v.x,v.y,v.z);
        if(i<steps&&j<rings){const a=i*(rings+1)+j,b=a+rings+1;indices.push(a,b,a+1,b,b+1,a+1);}
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    return mesh(geo,material,0,0,0,parent);
  }
  const profile = [.205,.224,.222,.213,.225,.239,.217].map((radius,i)=>new THREE.Vector2(radius,i*.078));
  const torso = mesh(new THREE.LatheGeometry(profile,32),fabric,0,.745,0); torso.scale.z=.67;
  for(const side of [-1,1])sphere(.065,fabric,side*.205,1.16,0).scale.set(1,1,.9);
  mesh(new THREE.CylinderGeometry(.075,.085,.12,20),skin,0,1.275,0);
  // Head pivot lets gaze and hair follow the body's motion without moving labels.
  const headRig = new THREE.Group(); headRig.name = "headRig"; headRig.position.y = 1.28; root.add(headRig);
  const head = sphere(.185,skin,0,.21,0,headRig); head.scale.set(.91,1.12,.88);
  for (const side of [-1,1]) {
    sphere(.038,skin,side*.17,.20,0,headRig);
    const e=sphere(.014,eye,side*.066,.23,.148,headRig);e.name=side<0?"eyeLeft":"eyeRight";
    const brow=box(.052,.012,.012,hair,side*.066,.275,.145,headRig);brow.rotation.z=-side*.08;
  }
  const nose=sphere(.028,skin,0,.19,.163,headRig);nose.scale.set(.7,.85,1);
  const lip = new THREE.MeshStandardMaterial({color:"#a37869",roughness:.95});
  const smile = mesh(new THREE.TorusGeometry(.037,.004,6,20,Math.PI*.68),lip,0,.145,.151,headRig);smile.rotation.z=Math.PI*1.16;
  mesh(new THREE.SphereGeometry(.191,24,16,0,Math.PI*2,0,Math.PI*.49),hair,0,.23,-.008,headRig).scale.set(.95,1.10,.92);
  const locks = new THREE.Group(); locks.name="hairMotion"; locks.position.set(0,.30,-.11);headRig.add(locks);
  if (wyliane) {
    // Gathered crown and a layered ponytail with tapered ends and restrained highlights.
    const tie=new THREE.MeshStandardMaterial({color:"#39444a",roughness:.8});
    mesh(new THREE.TorusGeometry(.055,.012,8,24),tie,0,.025,-.09,locks).rotation.x=.3;
    const highlight=new THREE.MeshStandardMaterial({color:"#dcc084",roughness:.78});
    for(let i=0;i<7;i++){
      const x=(i-3)*.017;
      lock([[x,.07,-.08],[x,.025,-.19],[x+.015,-.15,-.25],[x+.035,-.34,-.24],[x+.055,-.52,-.17]],.032,.031,i%3===0?highlight:hair,locks);
    }
    for(const side of [-1,1])lock([[side*.10,.37,.06],[side*.155,.30,.02],[side*.14,.25,-.12],[side*.055,.32,-.21]],.034,.025,hair,headRig);
  } else if (ana || inaly) {
    // Overlapping curved locks form one coherent long-hair silhouette behind the face.
    const sheen=new THREE.MeshStandardMaterial({color:ana?"#51453c":"#514b43",roughness:.85});
    for(let i=0;i<9;i++){
      const x=(i-4)*.04;
      lock([[x,.05,-.025],[x*1.11,-.10,-.055],[x*1.17,-.28,-.055],[x*1.08,-.46,-.02],[x*.95,-.59,.015]],.043,.042,i%4===0?sheen:hair,locks);
    }
    for(const side of [-1,1])lock([[side*.15,.035,.075],[side*.18,-.12,.10],[side*.20,-.30,.06],[side*.19,-.49,.025]],.045,.035,hair,locks);
    if(ana){
      for(let i=0;i<9;i++){
        const x=(i-4)*.032;
        lock([[x*.80,.399,.065],[x,.365,.131],[x,.325,.151],[x,.309+Math.abs(x)*.16,.152]],.023,.018,hair,headRig);
      }
    } else {
      for(let i=0;i<5;i++)lock([[-.04+i*.022,.398,.05],[-.12+i*.015,.36,.12],[-.155+i*.006,.27,.13],[-.17,.16,.09]],.025,.02,hair,headRig);
    }
  } else if (oliver) {
    for(let i=0;i<7;i++){
      const x=(i-3)*.035;
      lock([[x,.35,-.06],[x,.23,-.16],[x,.06,-.18],[x*.93,-.045,-.14]],.029,.023,hair,headRig);
      lock([[x,.35,.08],[x,.416,.02],[x,.39,-.08],[x,.32,-.15]],.032,.026,hair,headRig);
    }
  }
  if(edivania){
    // Reusable fabric cap, gathered band, stitching and a tucked blond fringe.
    const cap=new THREE.MeshStandardMaterial({color:"#e7eeeb",roughness:1});
    const stitch=new THREE.MeshStandardMaterial({color:"#b6cac4",roughness:1});
    mesh(new THREE.SphereGeometry(.214,28,20,0,Math.PI*2,0,Math.PI*.60),cap,0,.25,-.015,headRig).scale.set(1,1,.94);
    const band=mesh(new THREE.TorusGeometry(.183,.018,8,32),stitch,0,.20,-.015,headRig);band.rotation.x=Math.PI/2;
    for(let i=0;i<10;i++){
      const a=i*Math.PI*2/10;
      lock([[Math.cos(a)*.19,.23,Math.sin(a)*.17-.015],[Math.cos(a)*.16,.35,Math.sin(a)*.14-.015],[Math.cos(a)*.05,.45,Math.sin(a)*.05-.015]],.004,.004,stitch,headRig);
    }
    for(let i=0;i<3;i++)lock([[-.12+i*.03,.25,.115],[-.11+i*.03,.22,.148],[-.105+i*.03,.19,.14]],.018,.013,hair,headRig);
  }
  // Collar pieces fold outward; the coat has extended lapels and a split hem.
  for(const side of [-1,1]) {
    const collar=box(.11,.12,.025,fabric,side*.069,1.185,.137);collar.rotation.z=side*.42;
    if(outfit === "coat") {
      const lapel=box(.085,.25,.028,fabric,side*.085,1.078,.165);lapel.rotation.z=side*.28;
      box(.205,.36,.30,fabric,side*.11,.64,.008);
      box(.115,.10,.018,seam,side*.137,.70,.165);
      box(.105,.085,.022,fabric,side*.137,.71,.18);
    }
  }
  box(.018,.37,.014,seam,0,.985,.159);
  for(let i=0;i<4;i++)sphere(.009,seam,.012,1.13-i*.085,.173);
  if(outfit === "shirt") {
    box(.095,.085,.012,seam,-.105,1.05,.15);
    box(.083,.073,.015,fabric,-.105,1.055,.16);
  }
  if(outfit === "polo" || outfit === "uniform") {
    box(.02,.14,.015,seam,0,1.15,.165);
    // Ribbed collar details distinguish the black collared shirts.
    for(const side of [-1,1])box(.12,.017,.028,seam,side*.07,1.235,.12).rotation.z=side*.3;
  }
  if(outfit === "uniform") {
    const c=document.createElement("canvas");c.width=512;c.height=160;
    const ctx=c.getContext("2d")!;ctx.fillStyle="#f1f7fa";ctx.font="bold 92px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("amcor",256,80);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const badge=mesh(new THREE.PlaneGeometry(.18,.056),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}),-.105,1.085,.174);
    badge.name="amcor-wordmark";
  }
  // Joint pivots allow actual walking, seated knees and keyboard-reaching arms.
  for(const side of [-1,1]) {
    const suffix=side<0?"Left":"Right";
    const arm=new THREE.Group();arm.name=`arm${suffix}`;arm.position.set(side*.245,1.17,0);root.add(arm);
    const longSleeve=white;
    mesh(new THREE.CapsuleGeometry(.065,.20,6,16),fabric,0,-.13,0,arm);
    const forearm=new THREE.Group();forearm.name=`forearm${suffix}`;forearm.position.y=-.28;arm.add(forearm);
    mesh(new THREE.CapsuleGeometry(.051,.18,6,16),longSleeve?fabric:skin,0,-.105,0,forearm);
    if(longSleeve)box(.105,.035,.10,seam,0,-.205,0,forearm);
    const hand=sphere(.059,skin,0,-.26,.008,forearm);hand.scale.set(.75,1,.65);hand.name=`hand${suffix}`;
    const thumb=sphere(.025,skin,-side*.042,-.25,.035,forearm);thumb.scale.y=1.3;
    const leg=new THREE.Group();leg.name=`leg${suffix}`;leg.position.set(side*.108,.76,0);root.add(leg);
    mesh(new THREE.CapsuleGeometry(.085,.22,6,16),pants,0,-.17,0,leg);
    const shin=new THREE.Group();shin.name=`shin${suffix}`;shin.position.y=-.36;leg.add(shin);
    mesh(new THREE.CapsuleGeometry(.071,.22,6,16),pants,0,-.16,0,shin);
    box(.15,.09,.25,shoe,0,-.325,.055,shin);
    const sole=new THREE.MeshStandardMaterial({color:"#4c575e",roughness:.9});
    box(.152,.022,.25,sole,0,-.362,.055,shin);
    for(let lace=0;lace<3;lace++)box(.084,.008,.009,seam,0,-.28,.04+lace*.027,shin);
  }
  return root;
}

export function poseCharacter(root: THREE.Group, time: number, moving: boolean, seated: boolean, dt = 1/60) {
  const phase = root.userData.phase as number;
  const t=time*.001+phase;
  const cycle=time*.008+phase;
  const stride=moving?Math.sin(cycle):0;
  const blend=1-Math.exp(-Math.min(dt,.05)*10);
  const smooth=(object:THREE.Object3D, axis:"x"|"y"|"z", value:number)=>{
    object.rotation[axis]=THREE.MathUtils.lerp(object.rotation[axis],value,blend);
  };
  for(const [side,sign] of [["Left",1],["Right",-1]] as const) {
    const typing=seated?Math.sin(t*9+sign)*.035:0;
    smooth(root.getObjectByName(`arm${side}`)!,"x",seated?-.85+typing:stride*.32*sign);
    smooth(root.getObjectByName(`arm${side}`)!,"z",seated?sign*.06:sign*.04+Math.sin(t*.9)*.012);
    smooth(root.getObjectByName(`forearm${side}`)!,"x",seated?-.65+typing:-.13-Math.max(0,stride*sign)*.12);
    smooth(root.getObjectByName(`leg${side}`)!,"x",seated?-Math.PI/2:stride*.40*-sign);
    smooth(root.getObjectByName(`shin${side}`)!,"x",seated?Math.PI/2:Math.max(0,stride*sign)*.42);
    smooth(root.getObjectByName(`hand${side}`)!,"x",typing*1.7);
  }
  const head=root.getObjectByName("headRig")!;
  smooth(head,"x",seated?.10+Math.sin(t*.7)*.018:Math.sin(t*1.1)*.025);
  smooth(head,"y",seated?Math.sin(t*.5)*.04:Math.sin(t*.43)*.13);
  smooth(head,"z",moving?stride*.025:Math.sin(t*.8)*.018);
  const hair=root.getObjectByName("hairMotion")!;
  smooth(hair,"x",moving?Math.cos(cycle)*.11:Math.sin(t)*.015);
  smooth(hair,"z",moving?stride*.10:Math.sin(t*.8)*.018);
  // Brief asynchronous blinks, so the team does not move in unison.
  const blink=t%4.7;const open=blink<.12?Math.max(.08,Math.abs(blink-.06)/.06):1;
  root.getObjectByName("eyeLeft")!.scale.y=open;root.getObjectByName("eyeRight")!.scale.y=open;
  const y=seated?-.22:moving?Math.abs(Math.sin(cycle))*.022:Math.sin(t*1.8)*.005;
  root.position.y=THREE.MathUtils.lerp(root.position.y,y,blend);
}
