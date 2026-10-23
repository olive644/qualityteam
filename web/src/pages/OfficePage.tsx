import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { api, type Person, type WorkloadEntry } from "../api.js";

const DESK_POSITIONS = [
  new THREE.Vector3(-4.5, 0, -4),
  new THREE.Vector3(-1.5, 0, -4),
  new THREE.Vector3(1.5, 0, -4),
  new THREE.Vector3(4.5, 0, -4),
];

const WALK_BOUNDS = { minX: -5.5, maxX: 5.5, minZ: -1, maxZ: 4.5 };

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
  ctx.fillText(name, 54, 42);
  if (role) {
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#c6c9e0";
    ctx.fillText(role, 54, 66);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.3, 0.86, 1);
  sprite.position.y = 2.15;
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

function makeCharacter(color: string): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const skinMat = new THREE.MeshStandardMaterial({ color: "#f2c49b" });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 4, 8), bodyMat);
  body.position.y = 0.6;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat);
  head.position.y = 1.15;
  group.add(head);

  return group;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const charactersRef = useRef<Map<string, Character>>(new Map());
  const [people, setPeople] = useState<Person[]>([]);
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function reload() {
    const [p, w] = await Promise.all([api.listPeople(), api.getWorkload()]);
    setPeople(p);
    setWorkload(w);
    setLoaded(true);
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
    scene.background = new THREE.Color("#eef1f8");
    scene.fog = new THREE.Fog("#eef1f8", 14, 26);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 9, 10);
    camera.lookAt(0, 0, -1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight("#ffffff", 0.7));
    const sun = new THREE.DirectionalLight("#ffffff", 0.8);
    sun.position.set(5, 10, 6);
    scene.add(sun);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 14),
      new THREE.MeshStandardMaterial({ color: "#dfe3ee" })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 0.5;
    scene.add(floor);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4),
      new THREE.MeshStandardMaterial({ color: "#c7cbe0" })
    );
    wall.position.set(0, 2, -5.5);
    scene.add(wall);

    // Desks + monitors
    DESK_POSITIONS.forEach((pos) => {
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.08, 0.7),
        new THREE.MeshStandardMaterial({ color: "#9c6b3e" })
      );
      desk.position.set(pos.x, 0.7, pos.z);
      scene.add(desk);

      const legMat = new THREE.MeshStandardMaterial({ color: "#5a5a5a" });
      [-0.6, 0.6].forEach((dx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), legMat);
        leg.position.set(pos.x + dx, 0.35, pos.z + 0.25);
        scene.add(leg);
      });

      const monitor = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.38, 0.04),
        new THREE.MeshStandardMaterial({ color: "#1f2246", emissive: "#2a5bd7", emissiveIntensity: 0.4 })
      );
      monitor.position.set(pos.x, 1.05, pos.z - 0.2);
      scene.add(monitor);

      const chair = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16),
        new THREE.MeshStandardMaterial({ color: "#333" })
      );
      chair.position.set(pos.x, 0.42, pos.z + 0.75);
      scene.add(chair);
    });

    function handleResize() {
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / Math.max(1, clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    }
    handleResize();
    window.addEventListener("resize", handleResize);

    let raf = 0;
    let last = performance.now();
    function animate(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      for (const c of charactersRef.current.values()) {
        const { group, target, busy } = c;
        const desired = busy ? DESK_POSITIONS[c.deskIndex].clone().add(new THREE.Vector3(0, 0, 0.75)) : target;

        if (!busy && now > c.nextWanderAt) {
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
          group.rotation.y = angle;
        } else if (busy) {
          // subtle "at the computer" bob
          group.position.y = Math.sin(now / 500) * 0.01;
          group.rotation.y = 0;
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    sceneRef.current = scene;
    rendererRef.current = renderer;

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
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

    people.forEach((person, i) => {
      seen.add(person.id);
      const busy = isBusy(workloadById.get(person.id));
      let c = existing.get(person.id);
      if (!c) {
        const group = makeCharacter(person.color);
        const sprite = makeNameSprite(person.name, person.role, person.color);
        group.add(sprite);
        const deskIndex = i % DESK_POSITIONS.length;
        const startPos = DESK_POSITIONS[deskIndex].clone().add(new THREE.Vector3(0, 0, 0.75));
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
        c.busy = busy;
        c.person = person;
      }
    });

    for (const [id, c] of existing) {
      if (!seen.has(id)) {
        scene.remove(c.group);
        existing.delete(id);
      }
    }
  }, [people, workload, loaded]);

  const busyCount = workload.filter(isBusy).length;

  return (
    <div>
      <h2>Escritório</h2>
      <p className="muted" style={{ marginTop: -10, marginBottom: 16 }}>
        Visualização em tempo real da equipe: quem tem uma tarefa ativa atribuída fica sentado no computador; quem
        está livre anda pela sala. Atualiza a cada 15s a partir da Carga de trabalho.
      </p>
      <div className="toolbar">
        <span className="status-pill" style={{ background: "#00c875" }}>
          {busyCount} ocupado{busyCount === 1 ? "" : "s"}
        </span>
        <span className="status-pill" style={{ background: "#9699a6" }}>
          {Math.max(0, people.length - busyCount)} livre{people.length - busyCount === 1 ? "" : "s"}
        </span>
      </div>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "520px",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          boxShadow: "var(--shadow)",
          background: "#eef1f8",
        }}
      />
      {people.length === 0 && (
        <p className="muted" style={{ marginTop: 12 }}>
          Nenhuma pessoa cadastrada ainda — adicione sua equipe em "Pessoas" pra vê-la aqui.
        </p>
      )}
    </div>
  );
}
