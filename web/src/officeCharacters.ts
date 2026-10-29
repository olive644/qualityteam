import * as THREE from "three";
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
    return mesh(new THREE.BoxGeometry(w,h,d), material,x,y,z,parent);
  }
  const torso = mesh(new THREE.CylinderGeometry(.205,.235,.49,24),fabric,0,.98,0); torso.scale.z=.67;
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
    // High gathered ponytail, visible elastic and tapered curved locks.
    const tie=new THREE.MeshStandardMaterial({color:"#39444a",roughness:.8});
    const elastic=mesh(new THREE.TorusGeometry(.056,.014,8,20),tie,0,.035,-.09,locks);elastic.rotation.x=.3;
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.07,-.09),new THREE.Vector3(0,.04,-.21),new THREE.Vector3(.015,-.12,-.27),new THREE.Vector3(.035,-.34,-.25),new THREE.Vector3(.055,-.46,-.20)]);
    mesh(new THREE.TubeGeometry(curve,24,.062,12,false),hair,0,0,0,locks);
    for(let i=0;i<5;i++){
      const strand=mesh(new THREE.TubeGeometry(curve,24,.005,6,false),new THREE.MeshStandardMaterial({color:i%2?"#e6c985":"#b08b49",roughness:.9}),Math.sin(i*1.3)*.045,0,Math.cos(i*1.3)*.035,locks);
      strand.name="ponytail-strand";
    }
  } else if (ana || inaly) {
    // Long hair sits behind the shoulders; individual side locks frame the face.
    const back=sphere(.185,hair,0,-.19,-.035,locks);back.scale.set(1.05,1.9,.46);
    for(const side of [-1,1]){
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.15,.02,.08),new THREE.Vector3(side*.185,-.14,.08),new THREE.Vector3(side*.20,-.34,.04),new THREE.Vector3(side*.18,-.48,.015)]);
      mesh(new THREE.TubeGeometry(curve,20,.043,10,false),hair,0,0,0,locks);
    }
    if(ana){
      // Short curved fringe above the brows, with a subtly separated edge.
      for(let i=0;i<9;i++){
        const x=(i-4)*.033;
        const fringe=sphere(.04,hair,x,.315+Math.abs(x)*.23,.13,headRig);
        fringe.scale.set(.72,1.55,.75);fringe.rotation.z=-x*.8;
      }
    } else {
      const sweep=sphere(.12,hair,-.08,.35,.075,headRig);sweep.scale.set(1,.48,.8);sweep.rotation.z=-.28;
    }
  } else if (oliver) {
    // Compact mullet: cropped sides, sculpted top, short nape at the back.
    const nape=sphere(.14,hair,0,-.15,-.045,locks);nape.scale.set(.88,1.20,.48);
    for(let i=0;i<5;i++){
      const tuft=sphere(.057,hair,(i-2)*.048,.40,-.012,headRig);tuft.scale.set(.8,.65,1.4);tuft.rotation.x=-.25;
    }
  }
  if(edivania){
    // Reusable fabric cap, gathered band, stitching and a tucked blond fringe.
    const cap=new THREE.MeshStandardMaterial({color:"#e7eeeb",roughness:1});
    const stitch=new THREE.MeshStandardMaterial({color:"#b6cac4",roughness:1});
    mesh(new THREE.SphereGeometry(.214,28,20,0,Math.PI*2,0,Math.PI*.60),cap,0,.25,-.015,headRig).scale.set(1,1,.94);
    const band=mesh(new THREE.TorusGeometry(.183,.018,8,32),stitch,0,.20,-.015,headRig);band.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){
      const angle=i*Math.PI*2/12;
      const fold=sphere(.013,stitch,Math.cos(angle)*.19,.235,Math.sin(angle)*.17-.015,headRig);fold.scale.y=2.4;
    }
    for(let i=0;i<3;i++)sphere(.023,hair,-.11+i*.025,.235,.145,headRig).scale.y=1.3;
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
    const foot=box(.15,.09,.25,shoe,0,-.325,.055,shin);foot.geometry.computeVertexNormals();
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
