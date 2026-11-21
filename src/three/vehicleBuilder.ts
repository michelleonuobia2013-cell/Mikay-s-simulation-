import * as THREE from 'three';

export interface VehicleRig {
  root: THREE.Group;
  wheels: THREE.Group[];
  bodyMaterial: THREE.MeshPhysicalMaterial;
  setPaintColor: (hex: string) => void;
  updateSpin: (distanceDelta: number, steerAngle: number) => void;
}

export function createVehicleRig(vehicleId: string, paintColor: string): VehicleRig {
  const root = new THREE.Group();
  const isMoto = vehicleId === 'urban_scooter';
  const isConvertible = vehicleId === 'coastal_convertible';
  const isSuv = vehicleId === 'veloria_suv';
  const isHyper = vehicleId === 'hyper_coupe';

  // Ground contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(isMoto ? 1.1 : 2.35, isMoto ? 2.2 : 4.65),
    new THREE.MeshBasicMaterial({ color: 0x05030a, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: paintColor,
    roughness: 0.22,
    metalness: 0.72,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const trimMat = new THREE.MeshStandardMaterial({ color: '#14121b', roughness: 0.65, metalness: 0.25 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.16, metalness: 0.92 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#182436',
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.68,
    clearcoat: 1.0,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#fffbeb',
    emissive: '#fef3c7',
    emissiveIntensity: 1.5,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: '#dc2626',
    emissive: '#ef4444',
    emissiveIntensity: 1.3,
  });

  const wheels: THREE.Group[] = [];

  if (isMoto) {
    // Sleek sculpted electric motorcycle
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 1.55), bodyMaterial);
    frame.position.set(0, 0.56, 0);
    frame.castShadow = true;
    root.add(frame);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.68), trimMat);
    seat.position.set(0, 0.78, -0.18);
    root.add(seat);

    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 14), bodyMaterial);
    cowl.rotation.x = Math.PI * 0.42;
    cowl.position.set(0, 0.72, 0.66);
    root.add(cowl);

    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.66, 10), chromeMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 0.95, 0.52);
    root.add(handlebar);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), headlightMat);
    lamp.position.set(0, 0.76, 0.88);
    root.add(lamp);

    [0.72, -0.72].forEach((zPos) => {
      const wg = createWheel(0.34, 0.14, trimMat, chromeMat);
      wg.position.set(0, 0.34, zPos);
      root.add(wg);
      wheels.push(wg);
    });
  } else {
    // Sculpted extruded luxury car profile
    const len = isHyper ? 4.3 : isSuv ? 4.4 : 4.2;
    const width = isHyper ? 1.92 : 1.84;
    const bodyHeight = isSuv ? 0.64 : isHyper ? 0.44 : 0.52;

    const lowerChassis = new THREE.Mesh(new THREE.BoxGeometry(width, bodyHeight, len), bodyMaterial);
    lowerChassis.position.set(0, 0.34 + bodyHeight * 0.5, 0);
    lowerChassis.castShadow = true;
    root.add(lowerChassis);

    // Sculpted front hood slope
    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.12, len * 0.34), bodyMaterial);
    hood.position.set(0, 0.34 + bodyHeight + 0.02, len * 0.28);
    hood.rotation.x = 0.07;
    root.add(hood);

    // Cabin / Greenhouse (convertible leaves open top with windshield)
    if (!isConvertible) {
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, isSuv ? 0.54 : 0.42, len * 0.48), glassMat);
      cabin.position.set(0, 0.34 + bodyHeight + (isSuv ? 0.24 : 0.18), -0.18);
      cabin.castShadow = true;
      root.add(cabin);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.06, len * 0.44), bodyMaterial);
      roof.position.set(0, 0.34 + bodyHeight + (isSuv ? 0.51 : 0.40), -0.20);
      root.add(roof);
    } else {
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.36, 0.06), glassMat);
      windshield.position.set(0, 0.34 + bodyHeight + 0.16, 0.48);
      windshield.rotation.x = -0.52;
      root.add(windshield);
    }

    // Grille & Bumpers
    const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.18, 0.06), chromeMat);
    grille.position.set(0, 0.48, len * 0.5 + 0.01);
    root.add(grille);

    const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.16, 0.08), trimMat);
    rearDiffuser.position.set(0, 0.36, -len * 0.5 - 0.01);
    root.add(rearDiffuser);

    // Headlights & Taillights
    [-1, 1].forEach((side) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.11, 0.06), headlightMat);
      hl.position.set(side * (width * 0.34), 0.58, len * 0.5 + 0.01);
      root.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.06), taillightMat);
      tl.position.set(side * (width * 0.32), 0.62, -len * 0.5 - 0.01);
      root.add(tl);
    });

    // 4 Realistic Spoked Wheels
    const wheelZ = len * 0.32;
    const wheelX = width * 0.5 + 0.02;
    const wheelR = isSuv ? 0.38 : 0.34;
    [
      [-wheelX, wheelZ],
      [wheelX, wheelZ],
      [-wheelX, -wheelZ],
      [wheelX, -wheelZ],
    ].forEach(([wx, wz]) => {
      const wg = createWheel(wheelR, 0.22, trimMat, chromeMat);
      wg.position.set(wx, wheelR, wz);
      root.add(wg);
      wheels.push(wg);
    });
  }

  return {
    root,
    wheels,
    bodyMaterial,
    setPaintColor: (hex: string) => {
      bodyMaterial.color.set(hex);
    },
    updateSpin: (distanceDelta: number, steerAngle: number) => {
      const spinAngle = distanceDelta / 0.35;
      wheels.forEach((wg, idx) => {
        const tire = wg.children[0];
        if (tire) tire.rotation.x += spinAngle;
        if ((isMoto && idx === 0) || (!isMoto && idx < 2)) {
          wg.rotation.y = steerAngle * 0.45;
        }
      });
    },
  };
}

function createWheel(radius: number, width: number, tireMat: THREE.Material, rimMat: THREE.Material): THREE.Group {
  const wg = new THREE.Group();
  const tireGroup = new THREE.Group();
  wg.add(tireGroup);

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 20), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  tireGroup.add(tire);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width + 0.02, 12), rimMat);
  rim.rotation.z = Math.PI / 2;
  tireGroup.add(rim);

  return wg;
}
