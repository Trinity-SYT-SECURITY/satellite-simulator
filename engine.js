import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import earthmap from './assets/earthmap-high.jpg';
import circle from './assets/circle.png';
import { parseTleFile, getPositionFromTle, getPositionFromGroundCoords } from "./tle";
import { earthRadius } from "satellite.js/lib/constants";
import * as satellite from 'satellite.js/lib/index';

const SatelliteSize = 50;
const ixpdotp = 1440 / (2.0 * 3.141592654);
const lightSpeed = 299792458;

let TargetDate = new Date();

const defaultOptions = {
  backgroundColor: 0x333340,
  defaultSatelliteColor: 0xff0000,
  onStationClicked: null
};

const defaultStationOptions = {
  orbitMinutes: 0,
  satelliteSize: 50
};

class SignalDisturbance {
  constructor(scene) {
    this.scene = scene;
    this.waveMeshes = [];
    this.attackCones = [];
  }

  addWaveEffect(source, target, frequency, power) {
    const canvas = this.createWaveCanvas(frequency);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });

    const geometry = new THREE.CircleGeometry(1, 32);
    const waveMesh = new THREE.Mesh(geometry, material);

    waveMesh.position.copy(source.mesh.position);
    waveMesh.lookAt(target.mesh.position);

    this.scene.add(waveMesh);
    this.waveMeshes.push({
      mesh: waveMesh,
      source,
      target,
      createdAt: Date.now(),
      maxRadius: source.mesh.position.distanceTo(target.mesh.position),
      speed: 0.5 + power / 200
    });

    this.addAttackCone(source, target, power);
  }

  createWaveCanvas(frequency) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, `hsl(${200 + (frequency / 1e6) % 60}, 100%, 50%)`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'white';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.moveTo(128, 128);
      ctx.lineTo(
        128 + Math.cos(angle) * 128,
        128 + Math.sin(angle) * 128
      );
    }
    ctx.stroke();

    return canvas;
  }

  addAttackCone(source, target, power) {
    const direction = new THREE.Vector3().subVectors(
      target.mesh.position,
      source.mesh.position
    ).normalize();

    const length = source.mesh.position.distanceTo(target.mesh.position);
    const coneGeometry = new THREE.ConeGeometry(
      0.5,
      length,
      32,
      1,
      true
    );

    coneGeometry.rotateX(Math.PI / 2);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(`hsl(${30 + power % 30}, 100%, 50%)`),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });

    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.copy(source.mesh.position);
    cone.lookAt(target.mesh.position);

    this.scene.add(cone);
    this.attackCones.push({
      mesh: cone,
      source,
      target,
      createdAt: Date.now()
    });
  }

  updateEffects() {
    const now = Date.now();

    this.waveMeshes = this.waveMeshes.filter(wave => {
      const progress = (now - wave.createdAt) / 1000 * wave.speed;
      const scale = progress * wave.maxRadius;

      if (scale > wave.maxRadius * 1.2) {
        this.scene.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        return false;
      }

      wave.mesh.scale.set(scale, scale, 1);
      wave.mesh.material.opacity = 0.7 * (1 - progress / (wave.maxRadius * 1.2));
      return true;
    });

    this.attackCones = this.attackCones.filter(cone => {
      if (now - cone.createdAt > 2000) {
        this.scene.remove(cone.mesh);
        cone.mesh.geometry.dispose();
        return false;
      }

      const pulse = Math.sin((now - cone.createdAt) / 300) * 0.1 + 1;
      cone.mesh.scale.set(pulse, pulse, pulse);
      return true;
    });
  }
}

class AttackEffectManager {
  constructor(scene) {
    this.scene = scene;
    this.effects = [];
    this.radarTextures = {};
    this.initRadarTextures();
  }

  initRadarTextures() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 50, 0, 0.7)';
    ctx.fill();

    this.radarTextures.base = new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, 256, 256);
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    this.radarTextures.jamming = new THREE.CanvasTexture(canvas);
  }

  addJammingEffect(satellite) {
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const effect = new THREE.Mesh(geometry, material);
    effect.position.copy(satellite.mesh.position);
    this.scene.add(effect);

    this.effects.push({
      mesh: effect,
      satellite,
      createdAt: Date.now()
    });

    return effect;
  }

  createRadarPlane(satellite, intensity) {
    const material = new THREE.MeshBasicMaterial({
      map: intensity > 0.5 ? this.radarTextures.jamming : this.radarTextures.base,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });

    const geometry = new THREE.PlaneGeometry(5, 5);
    const radar = new THREE.Mesh(geometry, material);
    radar.position.copy(satellite.mesh.position);
    radar.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(radar);

    return radar;
  }

  updateEffects() {
    const now = Date.now();
    this.effects = this.effects.filter(item => {
      item.mesh.position.copy(item.satellite.mesh.position);
      if (item.radar) {
        item.radar.position.copy(item.satellite.mesh.position);
        item.radar.lookAt(new THREE.Vector3(0, 0, 0));
      }

      return now - item.createdAt < 5000;
    });
  }
}

export class Engine {
  stations = [];
  constructor() {
    this.scene = new THREE.Scene();
    this.signalDisturbance = new SignalDisturbance(this.scene);
    this.telemetryData = {
      signalStrength: -90,
      frequencyOffset: 0,
      bitErrorRate: 0,
      commStatus: 'normal'
    };
    this.attackLines = [];
    this.attackEffects = [];

    // Bind methods to ensure correct 'this' context
    this.updateAllPositions = this.updateAllPositions.bind(this);
    this.updateAttackLines = this.updateAttackLines.bind(this);
    this.updateAttackEffects = this.updateAttackEffects.bind(this);
    this.cleanupExpiredEffects = this.cleanupExpiredEffects.bind(this);
  }

  initialize(container, options = {}) {
    this.el = container;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.options = { ...defaultOptions, ...options };

    this._setupScene(); // Setup scene, camera, and renderer first
    this._setupLights();
    this._addBaseObjects();

    window.addEventListener('resize', this.handleWindowResize);
    this.el.addEventListener('pointerdown', this.handleMouseDown, false);

    this._animate(); // Start animation loop after setup
  }

  dispose() {
    window.removeEventListener('pointerdown', this.handleMouseDown);
    window.removeEventListener('resize', this.handleWindowResize);
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  handleWindowResize = () => {
    const width = this.el.clientWidth;
    const height = this.el.clientHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.render();
  };

  handleMouseDown = (event) => {
    this.mouse.x = (event.clientX / this.el.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.el.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const picked = intersects[0].object;
      if (picked) {
        const station = this._findStationFromMesh(picked);
        if (this.options.onStationClicked) {
          this.options.onStationClicked(station);
        }
      }
    }
  };

  addEnergyBeam(fromStation, toStation, intensity) {
    const curve = new THREE.LineCurve3(
      fromStation.mesh.position,
      toStation.mesh.position
    );

    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(`hsl(${Math.random() * 60}, 100%, 50%)`),
      linewidth: 3,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const beam = new THREE.Line(geometry, material);
    this.scene.add(beam);

    const particles = this.createBeamParticles(fromStation, toStation);

    return {
      beam,
      particles,
      from: fromStation,
      to: toStation,
      intensity,
      createdAt: Date.now()
    };
  }

  createBeamParticles(from, to) {
    const curve = new THREE.LineCurve3(
      from.mesh.position,
      to.mesh.position
    );

    const points = curve.getPoints(100);
    const particleGeometry = new THREE.BufferGeometry();
    const positions = [];

    points.forEach(point => {
      positions.push(point.x, point.y, point.z);
    });

    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xFF6600,
      size: 0.3,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.7
    });

    return new THREE.Points(particleGeometry, particleMaterial);
  }

  addSatellite = (station, color, size, date) => {
    if (!station) {
      console.error("Attempted to add null station");
      return;
    }

    try {
      const sat = this._getSatelliteSprite(color, size);
      const pos = this._getSatellitePositionFromTle(station, date);

      if (!pos) {
        console.error("Could not calculate position for station:", station.name);
        return;
      }

      sat.position.set(pos[0].x, pos[0].y, pos[0].z);
      station.eciPosition = pos[1];
      station.mesh = sat;
      station.mesh.material = this.targetMaterial;

      this.stations.push(station);

      if (station.orbitMinutes > 0) this.addOrbit(station);

      this.earth.add(sat);
    } catch (error) {
      console.error("Error adding satellite:", station.name, error);
    }
  };

  removeSatellite = (station) => {
    if (station && station.mesh) {
      this.earth.remove(station.mesh);
      this.render();
    }
  };

  removeObserver = (gd) => {
    if (gd && gd.mesh) {
      this.earth.remove(gd.mesh);
      this.render();
    }
  };

  addObserver(lat, long, height, material_name) {
    const gd = this._getSatelliteSprite(0x00FF00, 200);
    const pos = getPositionFromGroundCoords(lat, long, height);
    gd.position.set(pos[0].x, pos[0].y, pos[0].z);
  
    const station = {
      mesh: gd,
      gdPosition: pos[1],
    };
  
    if (material_name === 'ground') {
      station.mesh.material = this.highlightedMaterial || new THREE.SpriteMaterial({
        color: 0x00AAFF,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.9,
      });
    } else if (material_name === 'attack') {
      station.mesh.material = this.selectedMaterial || new THREE.SpriteMaterial({
        color: 0xFF0000,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.9,
      });
    }
  
    const spriteSize = 200;
    const spriteScaleFactor = 5000;
    gd.scale.set(spriteSize / spriteScaleFactor, spriteSize / spriteScaleFactor, 1);
  
    this.earth.add(gd);
    return station;
  }

  computePowerRx = (eirpTransmitter, rangeM, frequencyHz) => {
    var lambda = lightSpeed / frequencyHz;
    var fspl = -10 * Math.log10(Math.pow((4 * Math.PI * rangeM) / lambda, 2));
    return eirpTransmitter + fspl - 30;
  };

  loadLteFileStations = (url, color, stationOptions) => {
    const options = { ...defaultStationOptions, ...stationOptions };

    return fetch(url).then(res => {
      if (res.ok) {
        return res.text().then(text => {
          return this._addTleFileStations(text, color, options);
        });
      }
    });
  };

  getAzimuthAndRange = (observerStation, satelliteStation, currentTime) => {
    var gmst = satellite.gstime(currentTime);
    var positionEci = satelliteStation.eciPosition;
    var observerGd = observerStation.gdPosition;
    var positionEcf = satellite.eciToEcf(positionEci, gmst),
        lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
    return {
      'is_visible': lookAngles.elevation > 0,
      'range': lookAngles.rangeSat
    };
  };

  addOrbit = (station, initialDate = null, manualMinutes = null) => {
    if (station.orbitMinutes < 0) return;

    const revsPerDay = station.satrec.no * ixpdotp;
    const intervalMinutes = 1;
    var minutes = station.orbitMinutes || 1440 / revsPerDay;
    if (manualMinutes != null) {
      minutes = manualMinutes;
    }
    if (initialDate === null) {
      initialDate = new Date();
    }

    if (!this.orbitMaterial) {
      this.orbitMaterial = new THREE.LineBasicMaterial({ color: 0x999999, opacity: 1.0, transparent: true });
    }

    var points = [];

    for (var i = 0; i <= minutes; i += intervalMinutes) {
      const date = new Date(initialDate.getTime() + i * 60000);

      const pos = getPositionFromTle(station, date)[0];
      if (!pos) continue;

      points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    var orbitCurve = new THREE.Line(geometry, this.orbitMaterial);
    station.orbit = orbitCurve;
    station.mesh.material = this.targetMaterial;

    this.earth.add(orbitCurve);
    this.render();
  };

  removeOrbit = (station) => {
    if (!station || !station.orbit) return;

    this.earth.remove(station.orbit);
    station.orbit.geometry.dispose();
    station.orbit = null;
    station.mesh.material = this.material;
    this.render();
  };

  highlightStation = (station) => {
    if (station && station.mesh) {
      station.mesh.material = this.highlightedMaterial;
    }
  };

  clearStationHighlight = (station) => {
    if (station && station.mesh) {
      station.mesh.material = this.material;
    }
  };

  _addTleFileStations = (lteFileContent, color, stationOptions) => {
    const stations = parseTleFile(lteFileContent, stationOptions);

    const { satelliteSize, render } = stationOptions;

    if (render) {
      stations.forEach(s => {
        this.addSatellite(s, color, satelliteSize);
      });
    }

    this.render();

    return stations;
  };

  _getSatelliteMesh = (color, size) => {
    color = color || this.options.defaultSatelliteColor;
    size = size || SatelliteSize;

    if (!this.geometry) {
      this.geometry = new THREE.BoxBufferGeometry(size, size, size);
      this.material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: 0xFF4040,
        flatShading: false,
        side: THREE.DoubleSide,
      });
    }

    return new THREE.Mesh(this.geometry, this.material);
  };

  _setupSpriteMaterials(color) {
    if (this.material) return;
  
    this._satelliteSprite = new THREE.TextureLoader().load(circle, () => this.render());
  
    this.selectedMaterial = new THREE.SpriteMaterial({
      map: this._satelliteSprite,
      color: 0xFF0000,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9
    });
  
    this.highlightedMaterial = new THREE.SpriteMaterial({
      map: this._satelliteSprite,
      color: 0x00AAFF,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9
    });
  
    this.targetMaterial = new THREE.SpriteMaterial({
      map: this._satelliteSprite,
      color: 0xFFFF00,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9
    });
  
    this.material = new THREE.SpriteMaterial({
      map: this._satelliteSprite,
      color: color,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.7
    });
  }

  _getSatelliteSprite = (color, size) => {
    const SpriteScaleFactor = 5000;

    this._setupSpriteMaterials(color);

    const result = new THREE.Sprite(this.material);
    result.scale.set(size / SpriteScaleFactor, size / SpriteScaleFactor, 1);
    return result;
  };

  _getSatellitePositionFromTle = (station, date) => {
    date = date || TargetDate;
    return getPositionFromTle(station, date);
  };

  updateSatellitePosition = (station, date) => {
    date = date || TargetDate;

    const pos = getPositionFromTle(station, date);
    if (!pos) return;

    station.mesh.position.set(pos[0].x, pos[0].y, pos[0].z);
    station.eciPosition = pos[1];
  };

  updateAllPositions = (date) => {
    if (!this.stations) return;

    this.stations.forEach(station => {
      this.updateSatellitePosition(station, date);
    });

    this.updateAttackLines();
    this.updateAttackEffects();
    this.cleanupExpiredEffects();
  };

  _animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    this.updateAttackLines();
    this.updateAttackEffects();
    this.signalDisturbance.updateEffects();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._animate);
  };

  addAttackLine = (fromStation, toStation) => {
    if (!fromStation || !toStation || !fromStation.mesh || !toStation.mesh) {
      console.error('Invalid stations provided to addAttackLine');
      return [];
    }

    this.clearAllAttackLines();

    const beam = this.createEnergyBeam(fromStation, toStation);
    const particles = this.createBeamParticles(fromStation, toStation);

    if (!beam || !particles) {
      console.error('Failed to create attack line components');
      return [];
    }

    this.scene.add(beam);
    this.scene.add(particles);

    const attackLine = {
      beam,
      particles,
      from: fromStation,
      to: toStation,
      createdAt: Date.now()
    };

    this.attackLines.push(attackLine);

    const effect = this.addJammingEffect(toStation);
    if (effect) {
      this.attackEffects.push(effect);
    }

    return this.attackLines;
  };

  createEnergyBeam(from, to) {
    const curve = new THREE.LineCurve3(
      from.mesh.position,
      to.mesh.position
    );

    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(`hsl(${Math.random() * 30 + 330}, 100%, 50%)`),
      linewidth: 3,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Line(geometry, material);
  };

  updateAttackLines = () => {
    const now = Date.now();
    this.attackLines = this.attackLines.filter(item => {
      if (now - item.createdAt > 5000) {
        this.scene.remove(item.beam);
        this.scene.remove(item.particles);
        item.beam.geometry?.dispose();
        item.particles.geometry?.dispose();
        return false;
      }
      
      if (item.from.mesh && item.to.mesh) {
        const curve = new THREE.LineCurve3(
          item.from.mesh.position,
          item.to.mesh.position
        );
        const points = curve.getPoints(50);
        item.beam.geometry.dispose();
        item.beam.geometry = new THREE.BufferGeometry().setFromPoints(points);
      }
      
      return true;
    });
  };

  clearAllAttackLines = () => {
    this.attackLines.forEach(item => {
      if (item.beam && this.scene) {
        this.scene.remove(item.beam);
        item.beam.geometry?.dispose();
        item.beam.material?.dispose();
      }
      if (item.particles && this.scene) {
        this.scene.remove(item.particles);
        item.particles.geometry?.dispose();
      }
    });
    this.attackLines = [];

    this.attackEffects.forEach(effect => {
      if (effect?.mesh && this.scene) {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry?.dispose();
      }
    });
    this.attackEffects = [];
  };

  convertToLatLong(position) {
    if (!position || typeof position.x === 'undefined' || 
        typeof position.y === 'undefined' || 
        typeof position.z === 'undefined') {
      return { lat: 0, long: 0 };
    }

    const radius = Math.sqrt(
      position.x * position.x + 
      position.y * position.y + 
      position.z * position.z
    );

    if (radius === 0) {
      return { lat: 0, long: 0 };
    }

    const lat = 90 - (Math.acos(position.y / radius) * (180 / Math.PI));
    const long = Math.atan2(position.z, position.x) * (180 / Math.PI);

    return { 
      lat: parseFloat(lat.toFixed(6)),
      long: parseFloat(long.toFixed(6))
    };
  }

  cartesianToLatLong(position) {
    const radius = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
    const lat = 90 - (Math.acos(position.y / radius) * (180 / Math.PI));
    const long = Math.atan2(position.z, position.x) * (180 / Math.PI);
    return { lat, long };
  }

  createRippleEffect(target, intensity) {
    const geometry = new THREE.RingGeometry(1, 1.5, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF3300,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });

    const ripple = new THREE.Mesh(geometry, material);
    ripple.position.copy(target.mesh.position);
    ripple.lookAt(new THREE.Vector3(0, 0, 0));

    const animate = () => {
      if (ripple.scale.x < intensity / 10) {
        ripple.scale.multiplyScalar(1.05);
        ripple.material.opacity *= 0.95;
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(ripple);
      }
    };

    animate();
    return ripple;
  };

  showAttackEffect(attacker, target, intensity) {
    this.signalDisturbance.waveMeshes.forEach(wave => {
      this.scene.remove(wave.mesh);
      wave.mesh.geometry.dispose();
    });
    this.signalDisturbance.attackCones.forEach(cone => {
      this.scene.remove(cone.mesh);
      cone.mesh.geometry.dispose();
    });

    this.signalDisturbance.addWaveEffect(
      attacker,
      target,
      this.telemetryData.frequency || 10000000,
      intensity
    );

    this.updateTelemetry(intensity);
  };

  updateTelemetry(intensity) {
    const disturbanceFactor = intensity / 100;

    this.telemetryData = {
      signalStrength: Math.max(-120, -90 * (1 - disturbanceFactor)),
      frequencyOffset: 50 * disturbanceFactor * (Math.random() > 0.5 ? 1 : -1),
      bitErrorRate: Math.min(1, 0.01 + disturbanceFactor * 0.5),
      commStatus: intensity > 50 ? 'jammed' : 'degraded',
      timestamp: new Date().toISOString()
    };

    setTimeout(() => {
      this.telemetryData = {
        signalStrength: -90,
        frequencyOffset: 0,
        bitErrorRate: 0.01,
        commStatus: 'normal',
        timestamp: new Date().toISOString()
      };
    }, 5000);
  };

  showImpactEffect = (target, power) => {
    if (this.impactEffect) {
      this.scene.remove(this.impactEffect);
    }

    const geometry = new THREE.SphereGeometry(50, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: Math.min(0.7, power / 150)
    });

    this.impactEffect = new THREE.Mesh(geometry, material);
    this.impactEffect.position.set(
      target.mesh.position.x,
      target.mesh.position.y,
      target.mesh.position.z
    );
    this.scene.add(this.impactEffect);

    setTimeout(() => {
      if (this.impactEffect) {
        this.scene.remove(this.impactEffect);
        this.impactEffect = null;
      }
    }, 3000);
  };

  _setupScene = () => {
    const width = this.el.clientWidth;
    const height = this.el.clientHeight;

    this.scene.background = new THREE.Color(0x000000);

    this._setupCamera(width, height);

    this.renderer = new THREE.WebGLRenderer({
      logarithmicDepthBuffer: true,
      antialias: true
    });

    this.renderer.setClearColor(new THREE.Color(0x000000));
    this.renderer.setSize(width, height);

    this.el.appendChild(this.renderer.domElement);

    this._addStarfield();
  };

  updateAttackEffects = () => {
    this.attackEffects = this.attackEffects.filter(effect => {
      if (!effect || !effect.mesh || !effect.satellite || !effect.satellite.mesh) {
        return false;
      }

      effect.mesh.position.copy(effect.satellite.mesh.position);

      const scale = 1.5 + Math.sin(Date.now() * 0.005) * 0.5;
      effect.mesh.scale.set(scale, scale, scale);

      effect.mesh.material.opacity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      return true;
    });
  };

  cleanupExpiredEffects = () => {
    const now = Date.now();

    this.attackLines = this.attackLines.filter(item => {
      if (now - item.createdAt > 5000) {
        this.scene.remove(item.beam);
        this.scene.remove(item.particles);
        item.beam.geometry.dispose();
        item.particles.geometry.dispose();
        return false;
      }
      return true;
    });

    this.attackEffects = this.attackEffects.filter(effect => {
      if (now - effect.createdAt > 5000) {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        return false;
      }
      return true;
    });
  };

  createCommBeam(satellite, groundStation) {
    const points = [];
    const count = 30;

    for (let i = 0; i <= count; i++) {
      const ratio = i / count;
      const pos = new THREE.Vector3().lerpVectors(
        groundStation.mesh.position,
        satellite.mesh.position,
        ratio
      );

      if (i > 0 && i < count) {
        const wave = Math.sin(ratio * Math.PI * 5 + Date.now() * 0.005) * 0.2;
        const normal = pos.clone().normalize();
        pos.add(normal.multiplyScalar(wave));
      }

      points.push(pos);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00FF00,
      transparent: true,
      opacity: 0.7,
      linewidth: 2
    });

    return new THREE.Line(geometry, material);
  };

  _addStarfield = () => {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 1,
      transparent: true,
      opacity: 0.8
    });

    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  };

  addJammingEffect(toStation) {
    if (!toStation || !toStation.mesh) {
      console.error('Invalid station provided for jamming effect');
      return null;
    }

    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const effect = new THREE.Mesh(geometry, material);
    effect.position.copy(toStation.mesh.position);
    this.scene.add(effect);

    const effectObject = {
      mesh: effect,
      satellite: toStation,
      createdAt: Date.now()
    };

    return effectObject;
  }

  _setupCamera(width, height) {
    var NEAR = 1e-6, FAR = 1e27;
    this.camera = new THREE.PerspectiveCamera(54, width / height, NEAR, FAR);
    this.controls = new OrbitControls(this.camera, this.el);
    this.controls.enablePan = false;
    this.controls.addEventListener('change', () => this.render());
    this.camera.position.z = -15000;
    this.camera.position.x = 15000;
    this.camera.lookAt(0, 0, 0);
  };

  _setupLights = () => {
    const sun = new THREE.PointLight(0xffffff, 1, 0);
    sun.position.set(0, 59333894, -137112541);

    const ambient = new THREE.AmbientLight(0x909090);

    this.scene.add(sun);
    this.scene.add(ambient);
  };

  _addBaseObjects = () => {
    this._addEarth();
  };

  render = () => {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  _addEarth = () => {
    const textLoader = new THREE.TextureLoader();

    const group = new THREE.Group();

    let geometry = new THREE.SphereGeometry(earthRadius, 50, 50);
    let material = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      flatShading: false,
      map: textLoader.load(earthmap, () => this.render())
    });

    const earth = new THREE.Mesh(geometry, material);
    group.add(earth);

    this.earth = group;
    this.scene.add(this.earth);
  };

  _findStationFromMesh = (threeObject) => {
    for (var i = 0; i < this.stations.length; ++i) {
      const s = this.stations[i];

      if (s.mesh === threeObject) return s;
    }

    return null;
  };
}
