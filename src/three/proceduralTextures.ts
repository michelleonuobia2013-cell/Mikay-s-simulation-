import * as THREE from 'three';

export interface WorldTextures {
  plazaColor: THREE.Texture;
  facadeColor: THREE.Texture;
  asphaltMap: THREE.CanvasTexture;
  sandMap: THREE.CanvasTexture;
  ankaraPatternMap: THREE.CanvasTexture;
  fabricBumpMap: THREE.CanvasTexture;
  skinMicroMap: THREE.CanvasTexture;
  waterNormalMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

export function createWorldTextures(maxAnisotropy: number): WorldTextures {
  const loader = new THREE.TextureLoader();

  const plazaColor = loader.load('/src/assets/images/plaza_stone_tile_1794685805564.jpg');
  plazaColor.colorSpace = THREE.SRGBColorSpace;
  plazaColor.wrapS = THREE.RepeatWrapping;
  plazaColor.wrapT = THREE.RepeatWrapping;
  plazaColor.repeat.set(8, 8);
  plazaColor.anisotropy = maxAnisotropy;

  const facadeColor = loader.load('/src/assets/images/facade_marble_tile_1794685805736.jpg');
  facadeColor.colorSpace = THREE.SRGBColorSpace;
  facadeColor.wrapS = THREE.RepeatWrapping;
  facadeColor.wrapT = THREE.RepeatWrapping;
  facadeColor.repeat.set(2, 3);
  facadeColor.anisotropy = maxAnisotropy;

  // Asphalt road texture with crisp center markings
  const [asphaltCanvas, aCtx] = makeCanvas(256);
  aCtx.fillStyle = '#25242c';
  aCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const shade = 30 + ((i * 19) % 22);
    aCtx.fillStyle = `rgb(${shade},${shade},${shade + 4})`;
    aCtx.fillRect(x, y, 2, 2);
  }
  aCtx.fillStyle = '#e2c07d';
  aCtx.fillRect(124, 16, 8, 88);
  aCtx.fillRect(124, 144, 8, 88);
  const asphaltMap = new THREE.CanvasTexture(asphaltCanvas);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = THREE.RepeatWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.anisotropy = maxAnisotropy;

  // Warm coastal sand texture
  const [sandCanvas, sCtx] = makeCanvas(256);
  sCtx.fillStyle = '#d9be92';
  sCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    sCtx.fillStyle = i % 2 === 0 ? 'rgba(255,244,222,0.22)' : 'rgba(165,130,85,0.18)';
    sCtx.fillRect(x, y, 2, 2);
  }
  const sandMap = new THREE.CanvasTexture(sandCanvas);
  sandMap.colorSpace = THREE.SRGBColorSpace;
  sandMap.wrapS = THREE.RepeatWrapping;
  sandMap.wrapT = THREE.RepeatWrapping;
  sandMap.repeat.set(6, 6);
  sandMap.anisotropy = maxAnisotropy;

  // Traditional African Ankara geometric textile texture
  const [ankaraCanvas, kCtx] = makeCanvas(256);
  kCtx.fillStyle = '#b45309';
  kCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      kCtx.strokeStyle = '#fde68a';
      kCtx.lineWidth = 3;
      kCtx.beginPath();
      kCtx.moveTo(x + 16, y + 2);
      kCtx.lineTo(x + 30, y + 16);
      kCtx.lineTo(x + 16, y + 30);
      kCtx.lineTo(x + 2, y + 16);
      kCtx.closePath();
      kCtx.stroke();
      kCtx.fillStyle = (x + y) % 64 === 0 ? '#5b21b6' : '#065f46';
      kCtx.beginPath();
      kCtx.arc(x + 16, y + 16, 6, 0, Math.PI * 2);
      kCtx.fill();
    }
  }
  const ankaraPatternMap = new THREE.CanvasTexture(ankaraCanvas);
  ankaraPatternMap.colorSpace = THREE.SRGBColorSpace;
  ankaraPatternMap.wrapS = THREE.RepeatWrapping;
  ankaraPatternMap.wrapT = THREE.RepeatWrapping;
  ankaraPatternMap.repeat.set(2, 2);
  ankaraPatternMap.anisotropy = maxAnisotropy;

  // Fine woven fabric bump map (linear space)
  const [fabCanvas, fCtx] = makeCanvas(128);
  fCtx.fillStyle = '#808080';
  fCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    fCtx.fillStyle = y % 8 === 0 ? '#999999' : '#666666';
    fCtx.fillRect(0, y, 128, 2);
  }
  for (let x = 0; x < 128; x += 4) {
    fCtx.fillStyle = 'rgba(255,255,255,0.14)';
    fCtx.fillRect(x, 0, 2, 128);
  }
  const fabricBumpMap = new THREE.CanvasTexture(fabCanvas);
  fabricBumpMap.wrapS = THREE.RepeatWrapping;
  fabricBumpMap.wrapT = THREE.RepeatWrapping;
  fabricBumpMap.repeat.set(6, 6);

  // Subtle natural skin micro-texture (linear space)
  const [skinCanvas, skCtx] = makeCanvas(128);
  skCtx.fillStyle = '#828282';
  skCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 650; i++) {
    const x = (i * 37) % 128;
    const y = (i * 89) % 128;
    skCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    skCtx.fillRect(x, y, 1, 1);
  }
  const skinMicroMap = new THREE.CanvasTexture(skinCanvas);
  skinMicroMap.wrapS = THREE.RepeatWrapping;
  skinMicroMap.wrapT = THREE.RepeatWrapping;
  skinMicroMap.repeat.set(3, 3);

  // Rippling water bump map
  const [waterCanvas, wCtx] = makeCanvas(128);
  wCtx.fillStyle = '#808080';
  wCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const val = Math.round(128 + Math.sin(x * 0.25) * Math.cos(y * 0.25) * 45);
      wCtx.fillStyle = `rgb(${val},${val},${val})`;
      wCtx.fillRect(x, y, 8, 8);
    }
  }
  const waterNormalMap = new THREE.CanvasTexture(waterCanvas);
  waterNormalMap.wrapS = THREE.RepeatWrapping;
  waterNormalMap.wrapT = THREE.RepeatWrapping;
  waterNormalMap.repeat.set(12, 12);

  return {
    plazaColor,
    facadeColor,
    asphaltMap,
    sandMap,
    ankaraPatternMap,
    fabricBumpMap,
    skinMicroMap,
    waterNormalMap,
    dispose: () => {
      plazaColor.dispose();
      facadeColor.dispose();
      asphaltMap.dispose();
      sandMap.dispose();
      ankaraPatternMap.dispose();
      fabricBumpMap.dispose();
      skinMicroMap.dispose();
      waterNormalMap.dispose();
    },
  };
}
