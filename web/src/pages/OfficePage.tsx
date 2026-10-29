import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildLaboratory, disposeObject, STATIONS } from "../laboratory.js";
import { makeCharacter, poseCharacter } from "../officeCharacters.js";
import { assignStations } from "../officeStations.js";
import { api, type Person, type WorkloadEntry } from "../api.js";

const DESK_POSITIONS = STATIONS;
const WALK_BOUNDS = { minX: -2.8, maxX: 1.2, minZ: -2.75, maxZ: -.42 };

function makeNameSprite(name: string, role: string | null | undefined, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(30,32,56,0.85)";
  roundRect(ctx, 4, 4, 248, 88, 14);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(30, 48, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(name, 54, 42, 185);
  if (role) {
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#c6c9e0";
    ctx.fillText(role, 54, 66, 185);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.45, 0.54, 1);
  sprite.position.y = 2.08;
  return sprite;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

type Character = {
  person: Person;
  group: THREE.Group;
  sprite: THREE.Sprite;
  busy: boolean;
  deskIndex: number;
  target: THREE.Vector3;
  nextWanderAt: number;
};

function isBusy(entry: WorkloadEntry | undefined): boolean {
  if (!entry) return false;
  return entry.items.some((it) => it.statusLabel !== "Done");
}

export default function OfficePage() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const charactersRef = useRef<Map<string, Character>>(new Map());
  const [people, setPeople] = useState<Person[]>([]);
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [graphicsError, setGraphicsError] = useState(false);
  const viewRef = useRef<(top: boolean) => void>(() => {});
  const focusRef = useRef<(id: string) => void>(() => {});
  const followedPersonRef = useRef<string | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const [showTeam, setShowTeam] = useState(true);
  const showTeamRef = useRef(true);
  showTeamRef.current = showTeam;

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === pageRef.current);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setExpanded(false); setFullscreenError(""); } };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("fullscreenchange", sync); document.removeEventListener("keydown", escape); };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);

  async function toggleFullscreen() {
    setFullscreenError("");
    try {
      if (document.fullscreenElement === pageRef.current) await document.exitFullscreen();
      else if (expanded) setExpanded(false);
      else if (document.fullscreenEnabled && pageRef.current?.requestFullscreen) await pageRef.current.requestFullscreen();
      else setExpanded(true);
    } catch { setExpanded(true); setFullscreenError("Exibição ampliada ativada. O navegador não permitiu tela cheia; use Esc para sair."); }
  }

  async function reload() {
    try {
      const [p, w] = await Promise.all([api.listPeople(), api.getWorkload()]);
      setPeople(p); setWorkload(w); setLoaded(true); setError("");
    } catch { setError("Não foi possível atualizar a equipe. O laboratório continua disponível."); }

  }

  useEffect(() => {
    reload();
    const interval = setInterval(reload, 15000);
    return () => clearInterval(interval);
  }, []);

  // Scene setup — runs once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e4ecec");
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
    camera.position.set(11.5, 11.5, 14.5);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setGraphicsError(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, .5, -.2);
    controls.enableDamping = true;
    controls.minDistance = 1.5; controls.maxDistance = 28;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.enablePan = false;
    controls.update();
    focusRef.current = (id) => {
      const character = charactersRef.current.get(id);
      if (!character) return;
      followedPersonRef.current = id;
      const at = character.group.position.clone(); at.y += 1.02;
      const offset = new THREE.Vector3(.75, .65, 2.8).applyAxisAngle(new THREE.Vector3(0,1,0), character.group.rotation.y);
      camera.position.copy(at).add(offset); controls.target.copy(at); controls.update();
    };
    viewRef.current = (top) => {
      followedPersonRef.current = null;
      camera.position.set(top ? 0 : 11.5, top ? 20 : 11.5, top ? .01 : 14.5);
      controls.target.set(0, .5, -.2); controls.update();
    };
    buildLaboratory(scene);

    function handleResize() {
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / Math.max(1, clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    }
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    let raf = 0;
    let last = performance.now();
    function animate(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      for (const c of charactersRef.current.values()) {
        const { group, target, busy } = c;
        group.visible = showTeamRef.current;
        if (pausedRef.current) continue;
        const seated = busy && c.deskIndex >= 0 && c.deskIndex < DESK_POSITIONS.length;
        const desired = seated ? DESK_POSITIONS[c.deskIndex] : target;

        if (!seated && now > c.nextWanderAt) {
          target.set(
            WALK_BOUNDS.minX + Math.random() * (WALK_BOUNDS.maxX - WALK_BOUNDS.minX),
            0,
            WALK_BOUNDS.minZ + Math.random() * (WALK_BOUNDS.maxZ - WALK_BOUNDS.minZ)
          );
          c.nextWanderAt = now + 3000 + Math.random() * 4000;
        }

        const dir = new THREE.Vector3().subVectors(desired, group.position);
        dir.y = 0;
        const dist = dir.length();
        const speed = busy ? 2.2 : 1.1;
        if (dist > 0.05) {
          dir.normalize();
          group.position.addScaledVector(dir, Math.min(dist, speed * dt));
          const angle = Math.atan2(dir.x, dir.z);
          group.rotation.y += Math.atan2(Math.sin(angle-group.rotation.y), Math.cos(angle-group.rotation.y)) * (1-Math.exp(-dt*9));
        } else if (seated) {
          // subtle "at the computer" bob

          group.rotation.y += Math.atan2(Math.sin(Math.PI-group.rotation.y), Math.cos(Math.PI-group.rotation.y)) * (1-Math.exp(-dt*9));
        }
        poseCharacter(group, now, dist > .05, seated && dist <= .05, dt);
      }

      const followed = followedPersonRef.current ? charactersRef.current.get(followedPersonRef.current) : undefined;
      if (followed) {
        const at = followed.group.position.clone(); at.y += 1.02;
        const delta = at.clone().sub(controls.target);
        camera.position.add(delta); controls.target.copy(at);
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    sceneRef.current = scene;
    rendererRef.current = renderer;

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      disposeObject(scene);
      charactersRef.current.clear();
      sceneRef.current = null;
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync characters whenever people/workload data changes, without rebuilding the scene.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !loaded) return;

    const workloadById = new Map(workload.map((w) => [w.person.id, w]));
    const existing = charactersRef.current;
    const seen = new Set<string>();

    const assignments = assignStations(people);
    people.forEach((person, i) => {
      const deskIndex = assignments.get(person.id) ?? -1;
      seen.add(person.id);
      const busy = isBusy(workloadById.get(person.id));
      let c = existing.get(person.id);
      if (!c) {
        const group = makeCharacter(person);
        const sprite = makeNameSprite(person.name, person.role, person.color);
        group.add(sprite);
        const startPos = deskIndex >= 0 ? DESK_POSITIONS[deskIndex].clone() : new THREE.Vector3(-2 + (i % 4) * .7, 0, -1.8);
        group.position.copy(startPos);
        scene.add(group);
        c = {
          person,
          group,
          sprite,
          busy,
          deskIndex,
          target: startPos.clone(),
          nextWanderAt: 0,
        };
        existing.set(person.id, c);
      } else {
        c.deskIndex = deskIndex;
        c.busy = busy;
        c.person = person;
      }
    });

    for (const [id, c] of existing) {
      if (!seen.has(id)) {
        scene.remove(c.group);
        disposeObject(c.group);
        existing.delete(id);
      }
    }
  }, [people, workload, loaded]);

  const busyCount = workload.filter(isBusy).length;

  return (
    <div ref={pageRef} className={`laboratory-page${expanded ? " lab-expanded" : ""}`}>
      <div className="lab-heading">
        <div><span className="lab-eyebrow">QUALITYTEAM · AMBIENTE DA EQUIPE</span><h2>Escritório <span>/ Laboratório</span></h2>
        <p className="muted">Uma representação do nosso espaço de qualidade, baseada no vídeo do laboratório.</p></div>
        <div className="lab-capacity">3 computadores <span>+ 1 notebook</span></div>
      </div>
      <div className="lab-tools">
        <div className="lab-views" aria-label="Visualização do laboratório">
          <button className="secondary" onClick={() => viewRef.current(false)}>Vista geral</button>
          <button className="secondary" onClick={() => viewRef.current(true)}>Vista superior</button>
          {people.length > 0 && <select aria-label="Aproximar personagem" defaultValue="" onChange={(event) => { focusRef.current(event.target.value); event.target.value = ""; }}>
            <option value="" disabled>Ver personagem…</option>
            {people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>}
          <button className="secondary" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Retomar animações" : "Pausar animações"}</button>
          <button className="secondary lab-fullscreen-button" onClick={toggleFullscreen} aria-pressed={fullscreen || expanded}>{fullscreen || expanded ? "Sair da tela cheia" : "Tela cheia"}</button>
          <button className="secondary" aria-pressed={showTeam} onClick={() => setShowTeam(!showTeam)}>{showTeam ? "Ocultar equipe" : "Mostrar equipe"}</button>
        </div>
        <div className="lab-presence"><span className="lab-dot" />{busyCount} com tarefas ativas <span>· {Math.max(0, people.length - busyCount)} livres</span></div>
      </div>
      <div className="lab-stage">
        <div ref={containerRef} className="lab-canvas" role="img" aria-label="Laboratório 3D com bancadas de granito, equipamentos, três computadores e um notebook. Use os botões de vista ou arraste para girar." />
        <div className="lab-stage-label"><strong>Laboratório de qualidade</strong><span>Reconstrução visual · proporções estimadas</span></div>
        <div className="lab-gesture">Arraste para girar · Role para aproximar</div>
        {graphicsError && <div className="lab-fallback">A visualização 3D precisa de WebGL habilitado no navegador.</div>}
      </div>
      <div className="lab-footer"><span>Bancadas de ensaio · Área de análises · Estações de trabalho</span><span>Equipe atualizada a cada 15 segundos</span></div>
      {fullscreenError && <p role="status" className="muted">{fullscreenError}</p>}
      {error && <p role="status" className="muted">{error}</p>}
      {loaded && people.length === 0 && <p className="muted">Cadastre a equipe em Pessoas para vê-la no laboratório.</p>}
      {people.length > 4 && <p className="muted">O notebook é exclusivo do Oliver. As demais pessoas usam os três computadores ou permanecem na área de circulação.</p>}
    </div>
  );
}
