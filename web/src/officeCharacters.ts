import * as THREE from "three";
import type { Person } from "./api.js";

type Outfit = "coat" | "shirt" | "polo" | "uniform" | "default";
export function outfitFor(name: string): Outfit {
  const tokens = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z]+/);
  if (tokens.includes("ana")) return "coat";
  if (tokens.includes("wyliane")) return "shirt";
  if (tokens.includes("inaly")) return "polo";
  if (tokens.includes("oliver")) return "uniform";
  return "default";
}

/** Articulated, deliberately stylized figures; no likeness inferred from a name. */
export function makeCharacter(person: Person): THREE.Group {
  const root = new THREE.Group();
  const outfit = outfitFor(person.name);
  const white = outfit === "coat" || outfit === "shirt";
  const fabric = new THREE.MeshStandardMaterial({ color: white ? "#fafaf5" : outfit === "default" ? person.color : "#24282d", roughness: .94 });
  const seam = new THREE.MeshStandardMaterial({ color: white ? "#ced8d7" : "#535d63", roughness: .9 });
  const skin = new THREE.MeshStandardMaterial({ color: "#d8b298", roughness: .88 });
  const pants = new THREE.MeshStandardMaterial({ color: "#364451", roughness: .96 });
  const shoe = new THREE.MeshStandardMaterial({ color: "#273033", roughness: .7 });
  const hair = new THREE.MeshStandardMaterial({ color: "#403b36", roughness: 1 });
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
  // Rounded head with ears, nose, brows and small eyes, facing local +Z.
  const head = sphere(.185,skin,0,1.49,0); head.scale.set(.91,1.12,.88);
  for (const side of [-1,1]) {
    sphere(.038,skin,side*.17,1.48,0);
    const e=sphere(.014,eye,side*.066,1.51,.148);e.scale.y=1.1;
    const brow=box(.052,.012,.012,hair,side*.066,1.555,.145);brow.rotation.z=-side*.08;
  }
  const nose=sphere(.028,skin,0,1.47,.163);nose.scale.set(.7,.85,1);
  box(.055,.008,.008,seam,0,1.408,.155);
  mesh(new THREE.SphereGeometry(.191,24,16,0,Math.PI*2,0,Math.PI*.49),hair,0,1.51,-.008).scale.set(.95,1.10,.92);
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
    const hand=sphere(.059,skin,0,-.26,.008,forearm);hand.scale.set(.75,1,.65);
    const leg=new THREE.Group();leg.name=`leg${suffix}`;leg.position.set(side*.108,.76,0);root.add(leg);
    mesh(new THREE.CapsuleGeometry(.085,.22,6,16),pants,0,-.17,0,leg);
    const shin=new THREE.Group();shin.name=`shin${suffix}`;shin.position.y=-.36;leg.add(shin);
    mesh(new THREE.CapsuleGeometry(.071,.22,6,16),pants,0,-.16,0,shin);
    const foot=box(.15,.09,.25,shoe,0,-.325,.055,shin);foot.geometry.computeVertexNormals();
  }
  return root;
}

export function poseCharacter(root: THREE.Group, time: number, moving: boolean, seated: boolean) {
  const stride=moving?Math.sin(time*.008):0;
  for(const [side,phase] of [["Left",1],["Right",-1]] as const) {
    root.getObjectByName(`arm${side}`)!.rotation.x=seated?-.85:stride*.34*phase;
    root.getObjectByName(`forearm${side}`)!.rotation.x=seated?-.65:-.12;
    root.getObjectByName(`leg${side}`)!.rotation.x=seated?-Math.PI/2:stride*.42*-phase;
    root.getObjectByName(`shin${side}`)!.rotation.x=seated?Math.PI/2:Math.max(0,stride*phase)*.3;
  }
  root.position.y=seated?-.22:moving?Math.abs(Math.sin(time*.008))*.025:Math.sin(time*.002)*.006;
}
