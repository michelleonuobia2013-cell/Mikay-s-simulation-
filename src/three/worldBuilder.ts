import * as THREE from 'three';
import { DISTRICTS, WORLD_NPCS } from '../game/catalog';
import type { WorldBoxCollider } from '../game/rules';
import type { DistrictId, TimeOfDay, WeatherMode } from '../game/types';
import { createHumanRig, type ArticulatedHumanRig } from './avatarBuilder';
import type { WorldTextures } from './proceduralTextures';

export interface InteractableZone {
  id: string;
  label: string;
  actionType: 'npc' | 'studio' | 'property' | 'dealership' | 'business' | 'career' | 'story' | 'arcade' | 'secret' | 'christmas_tree';
  pos: THREE.Vector3;
  radius: number;
  payload?: string;
}

export interface WorldBuildResult {
  colliders: WorldBoxCollider[];
  interactables: InteractableZone[];
  npcRigs: { id: string; name: string; role: string; pos: THREE.Vector3; rig: ArticulatedHumanRig }[];
  christmasGroup: THREE.Group;
  streetLampBulbs: THREE.MeshStandardMaterial;
  oceanMesh: THREE.Mesh;
  secretClueMeshes: { id: string; mesh: THREE.Mesh }[];
  updateAtmosphere: (time: TimeOfDay, weather: WeatherMode, christmas: boolean, dt: number, elapsed: number) => void;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  dispose: () => void;
}

export function buildMikayWorld(
  scene: THREE.Scene,
  textures: WorldTextures,
  isSoftwareGl: boolean,
): WorldBuildResult {
  const colliders: WorldBoxCollider[] = [];
  const interactables: InteractableZone[] = [];
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  // Lighting Rig (1 shadow caster + Hemisphere sky/ground fill)
  const hemiLight = new THREE.HemisphereLight('#a5b4fc', '#2a2238', 0.85);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#fff1d6', 1.65);
  sunLight.position.set(42, 68, 36);
  if (!isSoftwareGl) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 175;
    const d = 85;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
  }
  scene.add(sunLight);

  // Extended Horizon Terrain (no floating box edges!)
  const groundMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#2c3d2f',
      roughness: 0.92,
      metalness: 0.02,
    }),
  );
  const ground = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(360, 360)), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // City Central Plaza Stone (offset Y = 0.03 to prevent Z-fighting)
  const plazaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: textures.plazaColor,
      roughness: 0.72,
      metalness: 0.05,
    }),
  );
  const cityPlaza = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(28, 48)), plazaMat);
  cityPlaza.rotation.x = -Math.PI / 2;
  cityPlaza.position.y = 0.03;
  cityPlaza.receiveShadow = true;
  scene.add(cityPlaza);

  // Asphalt Road Cross & District Connectors (offset Y = 0.02)
  const roadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: textures.asphaltMap,
      roughness: 0.85,
      metalness: 0.05,
    }),
  );
  const nsRoad = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(9, 175)), roadMat);
  nsRoad.rotation.x = -Math.PI / 2;
  nsRoad.position.y = 0.02;
  nsRoad.receiveShadow = true;
  scene.add(nsRoad);

  const ewRoad = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(175, 9)), roadMat);
  ewRoad.rotation.x = -Math.PI / 2;
  ewRoad.position.y = 0.02;
  ewRoad.receiveShadow = true;
  scene.add(ewRoad);

  // Diagonal avenues to Luxury, Sunset Bay, Old Town, Island
  const diagConfigs: [number, number, number, number][] = [
    [-34, -34, Math.PI / 4, 72],
    [34, -34, -Math.PI / 4, 72],
    [-34, 34, -Math.PI / 4, 72],
    [34, 34, Math.PI / 4, 72],
  ];
  diagConfigs.forEach(([rx, rz, rot, len]) => {
    const diag = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(7.2, len)), roadMat);
    diag.rotation.x = -Math.PI / 2;
    diag.rotation.z = rot;
    diag.position.set(rx, 0.022, rz);
    diag.receiveShadow = true;
    scene.add(diag);
  });

  // Sunset Bay Golden Sand Shore + Rippling Ocean (South-West & South-East)
  const sandMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: textures.sandMap,
      roughness: 0.9,
      metalness: 0.02,
    }),
  );
  const sunsetBeach = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(36, 40)), sandMat);
  sunsetBeach.rotation.x = -Math.PI / 2;
  sunsetBeach.position.set(-56, 0.025, 56);
  sunsetBeach.receiveShadow = true;
  scene.add(sunsetBeach);

  const islandBeach = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(34, 40)), sandMat);
  islandBeach.rotation.x = -Math.PI / 2;
  islandBeach.position.set(60, 0.028, 58);
  islandBeach.receiveShadow = true;
  scene.add(islandBeach);

  const oceanMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#0e7490',
      roughness: 0.14,
      metalness: 0.25,
      clearcoat: 0.9,
      bumpMap: textures.waterNormalMap,
      bumpScale: 0.08,
    }),
  );
  const oceanMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(360, 120)), oceanMat);
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.set(0, -0.25, 118);
  scene.add(oceanMesh);

  // Wooden Boardwalk Pier at Sunset Bay
  const woodMat = trackMat(new THREE.MeshStandardMaterial({ color: '#784e30', roughness: 0.8 }));
  const pier = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.5, 0.35, 24)), woodMat);
  pier.position.set(-56, 0.25, 76);
  pier.castShadow = true;
  pier.receiveShadow = true;
  scene.add(pier);

  // Shared Materials for Architecture
  const marbleFacadeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: textures.facadeColor,
      roughness: 0.48,
      metalness: 0.08,
    }),
  );
  const darkTrimMat = trackMat(new THREE.MeshStandardMaterial({ color: '#1b1428', roughness: 0.55, metalness: 0.28 }));
  const goldTrimMat = trackMat(new THREE.MeshStandardMaterial({ color: '#e2c07d', roughness: 0.22, metalness: 0.88 }));
  const terracottaMat = trackMat(new THREE.MeshStandardMaterial({ color: '#b4533c', roughness: 0.82 }));
  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#93c5fd',
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.62,
      clearcoat: 1.0,
    }),
  );
  const streetLampBulbs = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fef3c7',
      emissive: '#fbbf24',
      emissiveIntensity: 0.4,
    }),
  );

  // Helper: Multi-part Composite Building (Primary body + roof cornice + glass storefront + awning/columns)
  function addCompositeBuilding(opts: {
    x: number;
    z: number;
    w: number;
    h: number;
    d: number;
    bodyMat: THREE.Material;
    accentColor: string;
    rotY?: number;
    hasColumns?: boolean;
    interaction?: Omit<InteractableZone, 'pos'>;
  }) {
    const group = new THREE.Group();
    group.position.set(opts.x, 0, opts.z);
    if (opts.rotY) group.rotation.y = opts.rotY;

    // 1. Primary Tower / Volume
    const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(opts.w, opts.h, opts.d)), opts.bodyMat);
    body.position.y = opts.h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. Plinth Base & Roof Crown
    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(opts.w + 0.5, 0.6, opts.d + 0.5)), darkTrimMat);
    plinth.position.y = 0.3;
    group.add(plinth);

    const crown = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(opts.w + 0.6, 0.5, opts.d + 0.6)), darkTrimMat);
    crown.position.y = opts.h + 0.25;
    group.add(crown);

    const accentMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: opts.accentColor,
        emissive: opts.accentColor,
        emissiveIntensity: 0.25,
        roughness: 0.35,
      }),
    );

    // 3. Glass Storefront & Awning
    const storefront = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(opts.w * 0.72, Math.min(3.4, opts.h * 0.45), 0.22)),
      glassMat,
    );
    storefront.position.set(0, 1.9, opts.d / 2 + 0.08);
    group.add(storefront);

    const awning = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(opts.w * 0.82, 0.25, 1.35)), accentMat);
    awning.position.set(0, 3.6, opts.d / 2 + 0.65);
    awning.rotation.x = 0.14;
    group.add(awning);

    // Window grid bands for multi-story skyline realism
    const floors = Math.floor(opts.h / 4.2);
    for (let f = 1; f < floors; f++) {
      const band = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(opts.w + 0.08, 1.1, opts.d + 0.08)), glassMat);
      band.position.y = 2.4 + f * 3.8;
      group.add(band);
    }

    if (opts.hasColumns) {
      [-opts.w * 0.36, opts.w * 0.36].forEach((cx) => {
        const col = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.38, 4.2, 12)), goldTrimMat);
        col.position.set(cx, 2.1, opts.d / 2 + 0.85);
        group.add(col);
      });
    }

    scene.add(group);

    // Collider bounds (axis-aligned approximation)
    const halfW = (opts.rotY ? Math.max(opts.w, opts.d) : opts.w) * 0.52;
    const halfD = (opts.rotY ? Math.max(opts.w, opts.d) : opts.d) * 0.52;
    colliders.push({
      minX: opts.x - halfW,
      maxX: opts.x + halfW,
      minZ: opts.z - halfD,
      maxZ: opts.z + halfD,
    });

    if (opts.interaction) {
      const frontOffset = new THREE.Vector3(0, 0, opts.d / 2 + 2.4);
      if (opts.rotY) frontOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), opts.rotY);
      interactables.push({
        ...opts.interaction,
        pos: new THREE.Vector3(opts.x, 0, opts.z).add(frontOffset),
      });
    }
  }

  // --- A. MIKAY'S CITY BUILDINGS ---
  addCompositeBuilding({
    x: -18,
    z: -18,
    w: 11,
    h: 18,
    d: 9,
    bodyMat: marbleFacadeMat,
    accentColor: '#9333ea',
    interaction: {
      id: 'b_atelier',
      label: 'Enter Veloria Fashion Atelier (Studio)',
      actionType: 'studio',
      radius: 4.5,
    },
  });

  addCompositeBuilding({
    x: 18,
    z: -18,
    w: 11,
    h: 22,
    d: 9,
    bodyMat: marbleFacadeMat,
    accentColor: '#e2c07d',
    hasColumns: true,
    interaction: {
      id: 'b_bank',
      label: 'Velor Bank & Career Tower',
      actionType: 'career',
      radius: 4.5,
    },
  });

  addCompositeBuilding({
    x: -22,
    z: 14,
    w: 10,
    h: 11,
    d: 9,
    bodyMat: darkTrimMat,
    accentColor: '#ec4899',
    rotY: Math.PI / 2,
    interaction: {
      id: 'b_arcade',
      label: "Enter Mikay's Arcade & Cinema",
      actionType: 'arcade',
      radius: 4.5,
    },
  });

  addCompositeBuilding({
    x: 22,
    z: 14,
    w: 11,
    h: 9,
    d: 9,
    bodyMat: marbleFacadeMat,
    accentColor: '#38bdf8',
    rotY: -Math.PI / 2,
    interaction: {
      id: 'b_cars',
      label: "Mikay's Cars Showroom",
      actionType: 'dealership',
      radius: 4.5,
    },
  });

  // --- B. THE LUXURY DISTRICT ---
  addCompositeBuilding({
    x: -60,
    z: -56,
    w: 16,
    h: 12,
    d: 12,
    bodyMat: marbleFacadeMat,
    accentColor: '#e2c07d',
    hasColumns: true,
    interaction: {
      id: 'b_crown_mansion',
      label: 'Crown Crest Mansion & Estates',
      actionType: 'property',
      radius: 5.5,
    },
  });

  addCompositeBuilding({
    x: -44,
    z: -62,
    w: 10,
    h: 14,
    d: 9,
    bodyMat: darkTrimMat,
    accentColor: '#c084fc',
    interaction: {
      id: 'b_luxury_story',
      label: 'Gala Pavilion · Interactive Story',
      actionType: 'story',
      radius: 4.5,
    },
  });

  // --- C. SUNSET BAY ---
  addCompositeBuilding({
    x: -56,
    z: 42,
    w: 11,
    h: 7.5,
    d: 8.5,
    bodyMat: marbleFacadeMat,
    accentColor: '#f59e0b',
    interaction: {
      id: 'b_sunset_villa',
      label: 'Sunset Cove Villas & Bistro',
      actionType: 'property',
      radius: 5,
    },
  });

  // --- D. OLD TOWN ---
  addCompositeBuilding({
    x: 54,
    z: -52,
    w: 10,
    h: 8.5,
    d: 8,
    bodyMat: terracottaMat,
    accentColor: '#f43f5e',
    interaction: {
      id: 'b_old_town',
      label: 'Heritage Textile Market & Businesses',
      actionType: 'business',
      radius: 5,
    },
  });

  addCompositeBuilding({
    x: 68,
    z: -44,
    w: 9,
    h: 7,
    d: 8,
    bodyMat: terracottaMat,
    accentColor: '#d97706',
    rotY: -Math.PI / 2,
  });

  // --- E. MIKAY'S ISLAND ---
  addCompositeBuilding({
    x: 58,
    z: 52,
    w: 12,
    h: 8.5,
    d: 9,
    bodyMat: marbleFacadeMat,
    accentColor: '#38bdf8',
    interaction: {
      id: 'b_island_resort',
      label: "Mikay's Lagoon Resort & Events",
      actionType: 'story',
      radius: 5,
    },
  });

  // --- F. MIRROR SANCTUARY (Hidden Northern Cliff Pavilion) ---
  const sanctuaryGroup = new THREE.Group();
  sanctuaryGroup.position.set(0, 0.6, -86);
  const terrace = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(11, 13, 1.2, 24)), darkTrimMat);
  terrace.position.y = -0.5;
  sanctuaryGroup.add(terrace);

  // Ornate Silver Mirror Arch
  const mirrorFrame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(3.2, 0.28, 12, 32, Math.PI)), goldTrimMat);
  mirrorFrame.position.set(0, 2.8, -3);
  sanctuaryGroup.add(mirrorFrame);

  [-3.2, 3.2].forEach((px) => {
    const pillar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.34, 3.2, 12)), goldTrimMat);
    pillar.position.set(px, 1.4, -3);
    sanctuaryGroup.add(pillar);
  });

  const mirrorSurface = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(5.9, 5.4)),
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#a855f7',
        emissive: '#4c1d95',
        emissiveIntensity: 0.45,
        metalness: 0.9,
        roughness: 0.08,
        clearcoat: 1,
      }),
    ),
  );
  mirrorSurface.position.set(0, 2.7, -3.05);
  sanctuaryGroup.add(mirrorSurface);
  scene.add(sanctuaryGroup);

  interactables.push({
    id: 'b_mirror_sanctuary',
    label: 'Gaze into the Mirror of Becoming',
    actionType: 'story',
    pos: new THREE.Vector3(0, 0.6, -82),
    radius: 5,
  });

  // --- G. ENORMOUS CENTRAL CHRISTMAS TREE & FESTIVE MARKET ---
  const christmasGroup = new THREE.Group();
  christmasGroup.position.set(0, 0.04, -3.5);
  scene.add(christmasGroup);

  const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.65, 0.95, 2.5, 12)), woodMat);
  trunk.position.y = 1.25;
  christmasGroup.add(trunk);

  const pineMat = trackMat(new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.78 }));
  const tierConfigs = [
    { y: 3.6, r: 4.2, h: 3.8 },
    { y: 6.0, r: 3.4, h: 3.5 },
    { y: 8.2, r: 2.6, h: 3.2 },
    { y: 10.2, r: 1.8, h: 2.8 },
    { y: 11.9, r: 1.1, h: 2.2 },
  ];
  tierConfigs.forEach((t) => {
    const cone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(t.r, t.h, 16)), pineMat);
    cone.position.y = t.y;
    cone.castShadow = true;
    christmasGroup.add(cone);
  });

  // Radiant Golden Star Topper
  const starMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#facc15',
      emissiveIntensity: 1.6,
      metalness: 0.7,
      roughness: 0.2,
    }),
  );
  const starMesh = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.75, 0)), starMat);
  starMesh.position.y = 13.5;
  christmasGroup.add(starMesh);

  // Instanced Ornaments around the tree
  const ornGeo = trackGeo(new THREE.SphereGeometry(0.18, 10, 8));
  const ornMat = trackMat(new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#a855f7', emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.6 }));
  const ornCount = 48;
  const ornaments = new THREE.InstancedMesh(ornGeo, ornMat, ornCount);
  const dummy = new THREE.Object3D();
  const ornPalette = [new THREE.Color('#fde047'), new THREE.Color('#c084fc'), new THREE.Color('#fb7185'), new THREE.Color('#f8fafc')];
  for (let i = 0; i < ornCount; i++) {
    const tier = tierConfigs[i % tierConfigs.length];
    const angle = (i / ornCount) * Math.PI * 10;
    const rad = tier.r * 0.78;
    dummy.position.set(Math.cos(angle) * rad, tier.y - tier.h * 0.22, Math.sin(angle) * rad);
    dummy.updateMatrix();
    ornaments.setMatrixAt(i, dummy.matrix);
    ornaments.setColorAt(i, ornPalette[i % ornPalette.length]);
  }
  ornaments.computeBoundingSphere();
  christmasGroup.add(ornaments);

  // Festive Gift Boxes at tree base
  const giftColors = ['#9f1239', '#5b21b6', '#065f46', '#d97706'];
  for (let g = 0; g < 8; g++) {
    const angle = (g / 8) * Math.PI * 2;
    const gMat = trackMat(new THREE.MeshStandardMaterial({ color: giftColors[g % giftColors.length], roughness: 0.45 }));
    const box = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.75, 0.95)), gMat);
    box.position.set(Math.cos(angle) * 2.9, 0.38, Math.sin(angle) * 2.9);
    box.rotation.y = angle;
    christmasGroup.add(box);
  }

  colliders.push({ minX: -2.2, maxX: 2.2, minZ: -5.7, maxZ: -1.3 });
  interactables.push({
    id: 'christmas_tree_plaza',
    label: 'Celebrate at the Grand Christmas Tree',
    actionType: 'christmas_tree',
    pos: new THREE.Vector3(0, 0, 1.5),
    radius: 4.5,
  });

  // --- H. INSTANCED TREES & PALMS & STREETLAMPS ---
  const treeCount = 44;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.32, 3.2, 8));
  const foliageGeo = trackGeo(new THREE.DodecahedronGeometry(1.65, 1));
  const trunkInst = new THREE.InstancedMesh(trunkGeo, woodMat, treeCount);
  const foliageInst = new THREE.InstancedMesh(foliageGeo, trackMat(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 })), treeCount);
  const foliageColors = [new THREE.Color('#1e4d34'), new THREE.Color('#2d6a4f'), new THREE.Color('#3a7d5c')];

  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2;
    const dist = 36 + (i % 5) * 14;
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist * 0.92;
    const sc = 0.85 + (i % 4) * 0.14;
    dummy.position.set(tx, 1.6 * sc, tz);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, 3.6 * sc, tz);
    dummy.scale.set(sc * 1.1, sc, sc * 1.1);
    dummy.updateMatrix();
    foliageInst.setMatrixAt(i, dummy.matrix);
    foliageInst.setColorAt(i, foliageColors[i % foliageColors.length]);
  }
  trunkInst.computeBoundingSphere();
  foliageInst.computeBoundingSphere();
  scene.add(trunkInst);
  scene.add(foliageInst);

  // Boulevard Streetlamps
  const lampPositions: [number, number][] = [
    [-7, -14],
    [7, -14],
    [-7, 14],
    [7, 14],
    [-34, -28],
    [34, -28],
    [-34, 28],
    [34, 28],
  ];
  lampPositions.forEach(([lx, lz]) => {
    const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.1, 0.14, 4.8, 8)), darkTrimMat);
    post.position.set(lx, 2.4, lz);
    scene.add(post);

    const bulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.26, 10, 8)), streetLampBulbs);
    bulb.position.set(lx, 4.95, lz);
    scene.add(bulb);
  });

  // --- I. SECRET CLUE SHARDS (Mikay Secret System) ---
  const secretClues: { id: string; label: string; pos: [number, number, number] }[] = [
    { id: 'old_town_shard', label: 'Inspect Glowing Lilac Relic (Secret Clue)', pos: [60, 1.1, -59] },
    { id: 'sunset_bay_shard', label: 'Inspect Driftwood Mirror Shard (Secret Clue)', pos: [-56, 1.2, 86] },
    { id: 'island_shard', label: 'Inspect Starlight Pearl (Secret Clue)', pos: [68, 1.1, 66] },
  ];
  const secretMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#c084fc',
      emissive: '#9333ea',
      emissiveIntensity: 1.1,
      roughness: 0.1,
      metalness: 0.8,
    }),
  );
  const secretClueMeshes: { id: string; mesh: THREE.Mesh }[] = [];
  secretClues.forEach((sc) => {
    const crystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.45, 0)), secretMat);
    crystal.position.set(...sc.pos);
    scene.add(crystal);
    secretClueMeshes.push({ id: sc.id, mesh: crystal });
    interactables.push({
      id: sc.id,
      label: sc.label,
      actionType: 'secret',
      pos: new THREE.Vector3(sc.pos[0], 0, sc.pos[2]),
      radius: 3.5,
      payload: sc.id,
    });
  });

  // --- J. WORLD NPCS (Clearly Distinguished from Real Players) ---
  const npcRigs: { id: string; name: string; role: string; pos: THREE.Vector3; rig: ArticulatedHumanRig }[] = [];
  WORLD_NPCS.forEach((npc) => {
    const rig = createHumanRig(npc.appearance, textures);
    rig.root.position.set(...npc.pos);
    rig.root.rotation.y = npc.rotY;
    scene.add(rig.root);
    npcRigs.push({
      id: npc.id,
      name: npc.name,
      role: npc.role,
      pos: new THREE.Vector3(...npc.pos),
      rig,
    });
    interactables.push({
      id: `interact_${npc.id}`,
      label: `Talk to ${npc.name} [NPC]`,
      actionType: 'npc',
      pos: new THREE.Vector3(...npc.pos),
      radius: 3.4,
      payload: npc.id,
    });
  });

  // --- K. WEATHER PARTICLES (Pooled Buffer - Zero GC) ---
  const particleCount = 650;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 140;
    particlePositions[i * 3 + 1] = Math.random() * 28;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
  }
  const particleGeo = trackGeo(new THREE.BufferGeometry());
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = trackMat(
    new THREE.PointsMaterial({
      color: '#f8fafc',
      size: 0.28,
      transparent: true,
      opacity: 0.85,
    }),
  );
  const weatherPoints = new THREE.Points(particleGeo, particleMat);
  weatherPoints.frustumCulled = false;
  scene.add(weatherPoints);

  const skyColor = new THREE.Color('#27395c');
  scene.background = skyColor.clone();
  scene.fog = new THREE.FogExp2('#27395c', 0.0052);

  function updateAtmosphere(
    time: TimeOfDay,
    weather: WeatherMode,
    christmas: boolean,
    dt: number,
    elapsed: number,
  ) {
    christmasGroup.visible = christmas;

    // Sky & Lighting by TimeOfDay
    if (time === 'day') {
      skyColor.set(weather === 'rain' ? '#58697c' : '#87b5d9');
      sunLight.color.set('#fff5e4');
      sunLight.intensity = weather === 'rain' ? 1.05 : 1.75;
      sunLight.position.set(42, 68, 36);
      hemiLight.color.set('#bae6fd');
      hemiLight.groundColor.set('#3c4a3e');
      hemiLight.intensity = 0.85;
      streetLampBulbs.emissiveIntensity = 0.15;
    } else if (time === 'sunset') {
      skyColor.set('#5e3759');
      sunLight.color.set('#ffb36b');
      sunLight.intensity = 1.45;
      sunLight.position.set(-65, 22, 48);
      hemiLight.color.set('#fda4af');
      hemiLight.groundColor.set('#281c36');
      hemiLight.intensity = 0.72;
      streetLampBulbs.emissiveIntensity = 1.1;
    } else {
      skyColor.set('#0e0b1d');
      sunLight.color.set('#b8c4ff');
      sunLight.intensity = 0.72;
      sunLight.position.set(-30, 52, -40);
      hemiLight.color.set('#312e81');
      hemiLight.groundColor.set('#140f24');
      hemiLight.intensity = 0.52;
      streetLampBulbs.emissiveIntensity = 1.85;
    }

    (scene.background as THREE.Color).lerp(skyColor, Math.min(1, dt * 3));
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(scene.background as THREE.Color);
      scene.fog.density = weather === 'rain' ? 0.0085 : 0.0052;
    }

    // Weather Particles
    if (weather === 'clear') {
      weatherPoints.visible = false;
    } else {
      weatherPoints.visible = true;
      const isRain = weather === 'rain';
      particleMat.color.set(isRain ? '#93c5fd' : '#f8fafc');
      particleMat.size = isRain ? 0.22 : 0.34;
      const fallSpeed = isRain ? 22 : 3.4;
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        arr[i * 3 + 1] -= fallSpeed * dt;
        if (!isRain) {
          arr[i * 3] += Math.sin(elapsed + i) * 0.4 * dt;
        }
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 28;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Gentle ocean texture ripple & secret shard spin
    textures.waterNormalMap.offset.x = (elapsed * 0.03) % 1;
    textures.waterNormalMap.offset.y = (elapsed * 0.02) % 1;

    starMesh.rotation.y = elapsed * 0.6;
    secretClueMeshes.forEach((item, idx) => {
      item.mesh.rotation.y = elapsed * 1.4 + idx;
      item.mesh.position.y = 1.1 + Math.sin(elapsed * 2 + idx) * 0.16;
    });

    // Subtle NPC idle breathing
    npcRigs.forEach((npc) => {
      npc.rig.animate(dt, 0, 0, elapsed, false);
    });
  }

  // Ground district ring markers for spatial orientation
  (Object.keys(DISTRICTS) as DistrictId[]).forEach((id) => {
    if (id === 'city') return;
    const d = DISTRICTS[id];
    const marker = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(2.8, 3.2, 32)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: d.accentHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        }),
      ),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(d.spawnPos[0], 0.04, d.spawnPos[2]);
    scene.add(marker);
  });

  return {
    colliders,
    interactables,
    npcRigs,
    christmasGroup,
    streetLampBulbs,
    oceanMesh,
    secretClueMeshes,
    updateAtmosphere,
    sunLight,
    hemiLight,
    dispose: () => {
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
    },
  };
}
