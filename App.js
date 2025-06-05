import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/theme.css';
import { Engine } from './engine';
import InfoBox from './InfoBox';
import Search from './Search/Search';
import CoordinateInput from 'react-coordinate-input';
import { Badge, Button, ButtonGroup, ToggleButton } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import DateTimeRangePicker from '@wojtekmaj/react-datetimerange-picker';
import dayjs from 'dayjs';
import AttackAnalysis from './AttackAnalysis';
import * as THREE from 'three';
import { GoogleGenerativeAI } from '@google/generative-ai';
import SignalVisualization from './SignalVisualization';
import AttackHistory from './AttackHistory';
import config from './config';
import { createRoot } from 'react-dom/client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
var utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

const now = new Date();
const fortnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
const endDefault = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0);

// Attack types definition
const ATTACK_TYPES = [
  { name: 'Power Jamming', value: 'power' },
  { name: 'Frequency Jamming', value: 'frequency' },
  { name: 'Spoofing', value: 'spoofing' },
  { name: 'DoS', value: 'dos' }
];

// Hardcoded TLE data as a fallback
const FALLBACK_TLE_DATA = `
CALSPHERE 1             
1 00900U 64063C   19244.91326843  .00000189  00000-0  19351-3 0  9994
2 00900  90.1509  23.7630 0026967 202.4326 276.3696 13.73267614730712
CALSPHERE 2             
1 00902U 64063E   19244.92638705  .00000008  00000-0 -62293-6 0  9997
2 00902  90.1595  26.2791 0016940 222.4673 256.0348 13.52674924520946
LCS 1                   
1 01361U 65034C   19244.63370425  .00000017  00000-0  11089-2 0  9998
2 01361  32.1426 306.6795 0008087 121.9816 238.1468  9.89296124964223
`;

class AttackAnalyzer {
  constructor() {
    try {
      this.aiClient = config.googleAI.apiKey ? new GoogleGenerativeAI(config.googleAI.apiKey) : null;
      this.model = config.googleAI.model || 'gemini-1.5-flash';
    } catch (error) {
      console.error('Failed to initialize GoogleGenerativeAI:', error);
      this.aiClient = null;
    }
  }

  async analyzeAttack(event) {
    if (!this.aiClient) {
      return 'AI client not initialized. Please check API key.';
    }
    
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const genModel = this.aiClient.getGenerativeModel({ model: this.model });
        const prompt = `Analyzing satellite interference events:
Target: ${event.target.name} (NORAD ID: ${event.target.satrec?.satnum || '未知'})
Attack Types: ${this.getAttackTypeName(event.type)}
Strength: ${event.intensity} dBm
Frequency: ${event.frequency / 1e6} MHz
Distance: ${(event.range / 1000).toFixed(1)} km
Duration: ${event.duration}ms

Please provide professional analysis from the following perspectives:
1. Impact level on satellite communication systems
2. Possible defensive measures
3. Evaluation of attack effectiveness
4. Technical details`;

        const response = await genModel.generateContent(prompt);
        const result = await response.response.text();
        return result;
      } catch (error) {
        console.error(`AI analysis attempt ${attempt + 1} failed:`, error);
        if (error.message.includes('quota') && attempt < maxRetries - 1) {
          console.log('Quota exceeded. Waiting 60 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        } else {
          return 'AI analysis is temporarily unavailable due to quota or other errors.';
        }
      }
    }
    return 'AI analysis failed after maximum retries.';
  }

  getAttackTypeName(type) {
    const types = {
      power: 'Power interference',
      frequency: 'Frequency Interference', 
      spoofing: 'Signal forgery',
      dos: 'Denial of Service'
    };
    return types[type] || type;
  }
}

class AttackLogger {
  constructor() {
    this.events = [];
    this.aiEnabled = false;
  }

  logAttack(event) {
    const attackEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    };
    
    this.events.push(attackEvent);
    
    if (this.aiEnabled) {
      this.analyzeWithAI(attackEvent);
    }
    
    return attackEvent;
  }

  async analyzeWithAI(event) {
    try {
      const prompt = `Analyzing satellite interference events:
  Target: ${event.target.name}
  Attack Types: ${event.type}
  Strength: ${event.intensity}
  Duration: ${event.duration}ms
  Please use concise technical language to analyze possible impacts and countermeasures`;
      
      const response = await this.aiClient.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });
      event.aiAnalysis = response.text;
      
      console.log('AI analysis results:', event.aiAnalysis);
      return event;
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
  }
}

const CELESTRAK_CACHE = {
  active: {
    data: null,
    lastUpdated: null
  }
};

class DefenderStrategy {
  constructor(app) {
    this.app = app;
    this.defenseActive = false;
    this.frequencyHoppingInterval = null;
  }

  // 啟動防禦策略
  activateDefense(attackType, attackIntensity, attackId) {
  this.defenseActive = true;
  console.log(`Defender activating defense against ${attackType} attack with intensity ${attackIntensity}%`);

  const defenseEvent = {
    id: crypto.randomUUID(),
    attackId: attackId,
    timestamp: new Date().toISOString(),
    attackType: attackType,
    intensity: attackIntensity,
    actions: [],
  };

  switch (attackType) {
    case 'power':
      this.app.setState(prev => {
        const newEirp = Math.min(200, prev.defender_eirp + attackIntensity * 0.2);
        defenseEvent.actions.push(`Increased EIRP to ${newEirp.toFixed(1)} dBm`);
        toast.info(`Defense: Increased EIRP to ${newEirp.toFixed(1)} dBm`);
        return {
          defender_eirp: newEirp,
          defenseHistory: [...prev.defenseHistory, defenseEvent],
        };
      });
      break;
    case 'frequency':
      defenseEvent.actions.push('Started frequency hopping');
      toast.info('Defense: Started frequency hopping');
      this.startFrequencyHopping();
      this.app.setState(prev => ({
        defenseHistory: [...prev.defenseHistory, defenseEvent],
      }));
      break;
    case 'spoofing':
      this.app.setState(prev => {
        const newSpoofingStrength = Math.max(0, prev.spoofing_signal_strength * 0.5);
        defenseEvent.actions.push(`Reduced spoofing signal strength to ${newSpoofingStrength.toFixed(1)} dBm`);
        toast.info(`Defense: Reduced spoofing signal strength to ${newSpoofingStrength.toFixed(1)} dBm`);
        return {
          spoofing_signal_strength: newSpoofingStrength,
          defenseHistory: [...prev.defenseHistory, defenseEvent],
        };
      });
      break;
    case 'dos':
      this.app.setState(prev => {
        const newDosRate = Math.max(1, prev.dos_packet_rate * 0.7);
        defenseEvent.actions.push(`Reduced DoS packet rate to ${newDosRate.toFixed(0)} pps`);
        toast.info(`Defense: Reduced DoS packet rate to ${newDosRate.toFixed(0)} pps`);
        return {
          dos_packet_rate: newDosRate,
          defenseHistory: [...prev.defenseHistory, defenseEvent],
        };
      });
      break;
    default:
      break;
  }

  setTimeout(() => {
    this.deactivateDefense();
  }, 10000);
  }

  // 停止防禦策略
  deactivateDefense() {
    this.defenseActive = false;
    if (this.frequencyHoppingInterval) {
      clearInterval(this.frequencyHoppingInterval);
      this.frequencyHoppingInterval = null;
    }
    console.log('Defender deactivated defense mechanisms');
  }

  // 頻率跳變實現
  startFrequencyHopping() {
    if (this.frequencyHoppingInterval) return;

    this.frequencyHoppingInterval = setInterval(() => {
      this.app.setState(prev => ({
        frequency: Math.min(30000 * 1e6, Math.max(1 * 1e6, prev.frequency + (Math.random() - 0.5) * 500 * 1e6)),
      }));
      console.log('Defender frequency hopping to:', this.app.state.frequency / 1e6, 'MHz');
    }, 2000); // 每 2 秒跳變一次頻率
  }
}


class App extends Component {
  constructor(props) {
  super(props);
  this.attackLogger = new AttackLogger();
  this.attackAnalyzer = new AttackAnalyzer();
  this.defenderStrategy = new DefenderStrategy(this); // 添加這一行
  this.initial_state = {
    pause_timer: false,
    current_date: null,
    target_station: null,
    stations: [],
    positioningMode: null,
    attacker_station: null,
    defender_station: null,
    attacker_eirp: 0,
    defender_eirp: 30,
    selected_range: [todayMidnight, endDefault],
    step_size: 10,
    attack_type: 'power',
    frequency: 10000000,
    bandwidth: 1000000,
    defenseStatus: 'Idle',
    spoofing_signal_strength: 0,
    dos_packet_rate: 1000,
    show_analysis: false,
    aiAnalysis: [],
    realtimeTelemetry: {
      signalStrength: 0,
      frequencyOffset: 0,
      bitErrorRate: 0,
      commStatus: 'normal'
    },
    attackHistory: [],
    defenseHistory: [],
  };
  this.state = { ...this.initial_state };
  this.engine = null;
  this.el = null;
  this.attackLines = [];
  }
  
  showAttackDetails = (event) => {
    console.log('Selected attack event:', event);
  };

  componentDidMount() {
    this.el = document.querySelector('#visualization');
    if (this.el) {
      this.engine = new Engine();
      this.engine.initialize(this.el);

      // 載入衛星資料
      this.addCelestrakSets();

      // 生成隨機但互相靠近的位置
      const { attackerLat, attackerLong, defenderLat, defenderLong } = this.generateRandomNearbyPositions();
      
      // 設置攻擊者位置
      this.updateAttackerPosition(attackerLat, attackerLong);
      // 設置防禦者位置
      this.updateDefenderPosition(defenderLat, defenderLong);

      this.animate();
      // 設置定時器以更新時間
      this.timerInterval = setInterval(this.handleTimer, 1000);
    } else {
      console.error('Visualization element not found');
    }
  }

  generateRandomNearbyPositions() {
    const attackerLat = Math.random() * 180 - 90;
    const attackerLong = Math.random() * 360 - 180;
    const offsetLat = (Math.random() * 10 - 5);
    const offsetLong = (Math.random() * 10 - 5);
    const defenderLat = attackerLat + offsetLat;
    const defenderLong = attackerLong + offsetLong;
    const clampedDefenderLat = Math.max(-90, Math.min(90, defenderLat));
    const clampedDefenderLong = Math.max(-180, Math.min(180, defenderLong));

    return {
      attackerLat: parseFloat(attackerLat.toFixed(6)),
      attackerLong: parseFloat(attackerLong.toFixed(6)),
      defenderLat: parseFloat(clampedDefenderLat.toFixed(6)),
      defenderLong: parseFloat(clampedDefenderLong.toFixed(6)),
    };
  }

  componentWillUnmount() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.engine && this.engine.dispose) {
      this.engine.dispose();
      this.clearAllAttackLines();
    }
    this.setState({ ...this.initial_state });
  }

  handleStationClicked = (station) => {
    if (!station) return;
    this.handleSearchResultClick(station);
  };

  handleTimer = () => {
    if (this.state?.pause_timer) return;
    if (this.state.current_date === null) {
      this.setState({
        current_date: this.state.selected_range[0]
      });
    } else if (this.state.current_date < this.state.selected_range[1]) {
      const updatedDate = new Date(this.state.current_date);
      updatedDate.setTime(updatedDate.getTime() + this.state.step_size * 1000);
      this.setState({
        current_date: updatedDate
      });
      if (this.engine) this.engine.updateAllPositions(this.state.current_date);
    } else {
      this.setState({
        current_date: this.state.selected_range[0]
      });
    }
  };

  handleSearchResultClick = (station, date_range = null) => {
    if (!station) return;

    this.setState({
      pause_timer: true,
    });

    if (this.state.target_station) {
      this.engine.removeOrbit(this.state.target_station);
      this.engine.removeSatellite(this.state.target_station);
      this.engine.clearAllAttackLines();
    }

    let startDay = dayjs(this.state.selected_range[0]);
    let endDay = dayjs(this.state.selected_range[1]);

    if (date_range) {
      startDay = dayjs(date_range[0]);
      endDay = dayjs(date_range[1]);
    }

    this.engine.addSatellite(station, 0xFF0000, 60, this.state.current_date);
    this.engine.addOrbit(station, this.state.current_date, endDay.diff(startDay, 'minutes'));

    if (this.state.attacker_station && 
        this.getStationRange(this.state.attacker_station, station, this.state.current_date) > 0) {
      this.engine.addAttackLine(this.state.attacker_station, station);
    }

    this.setState({
      target_station: station,
      pause_timer: false,
    });

    this.engine.updateAllPositions(this.state.current_date);
  };

  addObserver = (lat, long, height, material_name) => {
    lat = parseFloat(lat) || 0;
    long = parseFloat(long) || 0;
    height = parseFloat(height) || 0.370;

    const station = this.engine.addObserver(lat, long, height, material_name);
    return station;
  };
  
  convertToLatLong(position) {
    if (!position) return { lat: 0, long: 0 };
    
    const radius = this.earthRadius || 6.371; // Match your model's radius
    const normalized = position.clone().divideScalar(radius).normalize();
    
    const lat = 90 - (Math.acos(normalized.y) * (180 / Math.PI));
    const long = Math.atan2(normalized.z, normalized.x) * (180 / Math.PI);
    
    return { 
      lat: parseFloat(lat.toFixed(6)),
      long: parseFloat(long.toFixed(6)),
    };
  }

  handleMapClick = (event) => {
    if (!this.engine || !event || !this.state.positioningMode) return;
  
    const rect = this.el.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  
    this.engine.raycaster.setFromCamera(mouse, this.engine.camera);
  
    const intersects = this.engine.raycaster.intersectObject(this.engine.earth.children[0]);
  
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const latLong = this.engine.convertToLatLong(point);
  
      console.log("Selected position:", latLong);
  
      if (this.state.positioningMode === 'attacker') {
        this.updateAttackerPosition(latLong.lat, latLong.long);
      } else if (this.state.positioningMode === 'defender') {
        this.updateDefenderPosition(latLong.lat, latLong.long);
      }
      
      this.setState({ positioningMode: null });
    }
  };

  updateDefenderPosition = (lat, long) => {
    if (this.state.defender_station) {
      this.engine.removeObserver(this.state.defender_station);
    }

    const newDefender = this.engine.addObserver(lat, long, 0, 'ground');
    this.setState({ defender_station: newDefender });
    console.log(`Defender position updated: Lat ${lat}, Long ${long}`);
  };

  updateAttackerPosition = (lat, long) => {
    if (this.state.attacker_station) {
      this.engine.removeObserver(this.state.attacker_station);
    }

    const newAttacker = this.engine.addObserver(lat, long, 0, 'attack');
    this.setState({ attacker_station: newAttacker });
    console.log(`Attacker position updated: Lat ${lat}, Long ${long}`);
  };
  
  showTemporaryMarker(position) {
    if (this.tempMarker) {
      this.engine.scene.remove(this.tempMarker);
    }
    
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.tempMarker = new THREE.Mesh(geometry, material);
    this.tempMarker.position.copy(position);
    this.engine.scene.add(this.tempMarker);
    
    setTimeout(() => {
      if (this.tempMarker) {
        this.engine.scene.remove(this.tempMarker);
        this.tempMarker = null;
      }
    }, 3000);
  }

  updateAttackerCoords = (value, { unmaskedValue, dd, dms }) => {
    if (!dd) return;
    if (this.state.attacker_station) {
      this.engine.removeObserver(this.state.attacker_station);
    }

    this.setState({
      attacker_station: this.engine.addObserver(dd[0], dd[1], 0.370, 'attack')
    });
  };

  updateDefenderCoords = (value, { unmaskedValue, dd, dms }) => {
    if (!dd) return;
    if (this.state.defender_station) {
      this.engine.removeObserver(this.state.defender_station);
    }
    this.setState({
      defender_station: this.engine.addObserver(dd[0], dd[1], 0.370, 'ground')
    });
  };

  attackerRange = () => this.getStationRange(this.state.attacker_station, this.state.target_station, this.state.current_date);

  defenderRange = () => this.getStationRange(this.state.defender_station, this.state.target_station, this.state.current_date);

  updateAttackerEirp = (event) => {
    this.setState({
      attacker_eirp: parseInt(event.target.value),
    });
  };

  updateDefenderEirp = (event) => {
    this.setState({
      defender_eirp: parseInt(event.target.value),
    });
  };

  updateSimulationPeriod = (value) => {
    this.setState({
      pause_timer: true,
      selected_range: value,
      current_date: value[0]
    });
    if (this.state.target_station) {
      this.handleSearchResultClick(this.state.target_station, value);
    }
  };

  updateStepSize = (event) => {
    this.setState({
      step_size: parseInt(event.target.value),
    });
  };

  updateAttackType = (type) => {
    this.setState({
      attack_type: type
    });
  };

  updateFrequency = (event) => {
    this.setState({
      frequency: parseInt(event.target.value),
    });
  };

  updateBandwidth = (event) => {
    this.setState({
      bandwidth: parseInt(event.target.value),
    });
  };

  updateSpoofingStrength = (event) => {
    this.setState({
      spoofing_signal_strength: parseInt(event.target.value),
    });
  };

  updateDosRate = (event) => {
    this.setState({
      dos_packet_rate: parseInt(event.target.value),
    });
  };

  toggleAnalysis = () => {
    this.setState({
      show_analysis: !this.state.show_analysis
    });
  };

  attackerPowerAtReceiver = () => {
  const range = this.attackerRange();
  if (range <= 0) return -200000000;
  const atmosphericLoss = -10 * (1 + Math.random() * 0.2); // 模擬大氣衰減（-10 到 -12 dB）
  return this.engine.computePowerRx(this.state.attacker_eirp + atmosphericLoss, range, this.state.frequency);
  };

  defenderPowerAtReceiver = () => {
  const range = this.defenderRange();
  if (range <= 0) return -200000000;
  const atmosphericLoss = -10 * (1 + Math.random() * 0.2);
  return this.engine.computePowerRx(this.state.defender_eirp + atmosphericLoss, range, this.state.frequency);
  };

  getStationRange = (transmitterStation, targetStation, currentTime) => {
    if (!transmitterStation || !targetStation) {
      return -1;
    } else {
      const { is_visible, range } = this.engine.getAzimuthAndRange(transmitterStation, targetStation, currentTime);
      return is_visible ? range : -1;
    }
  };

  dbmToWats = (dbmLevel) => {
    return Math.pow(10, ((dbmLevel - 30) / 10));
  };

  getSinrFromDbm = (signal, interference, noise = -90) => {
    const powerSignal = Math.pow(10, ((signal - 30) / 10));
    const powerInterference = Math.pow(10, ((interference - 30) / 10));
    const powerNoise = Math.pow(10, ((noise - 30) / 10));
    return 10 * Math.log10(powerSignal / (powerInterference + powerNoise));
  };

  getAttackEffectiveness = () => {
  const sinr = this.getSinrFromDbm(this.defenderPowerAtReceiver(), this.attackerPowerAtReceiver());
  let effectiveness;

  if (sinr < 0) effectiveness = 100;
  else if (sinr < 5) effectiveness = 80;
  else if (sinr < 10) effectiveness = 50;
  else if (sinr < 15) effectiveness = 20;
  else effectiveness = 0;

  // 當防禦啟動時，降低攻擊有效性
  if (this.defenderStrategy.defenseActive) {
    effectiveness *= 0.5; // 防禦啟動時攻擊效果減半
  }

  return effectiveness;
  };
  
  
  handleAttack = async (intensity) => {
  const { target_station, attacker_station, attack_type, frequency } = this.state;
  if (!target_station || !attacker_station) {
    console.warn('Cannot launch attack: Target or attacker station is missing.');
    return;
  }

  const range = this.getStationRange(attacker_station, target_station, this.state.current_date);
  if (range < 0) {
    console.warn('Cannot launch attack: Target station is not visible to attacker.');
    return;
  }

  const effectiveness = this.getAttackEffectiveness(); // 獲取有效性
  const result = effectiveness === 0 ? 'Blocked' : (effectiveness >= 80 ? 'Successful' : 'Partial'); // 簡單的結果邏輯
  await new Promise(resolve => setTimeout(resolve, 100));

  this.engine.showAttackEffect(attacker_station, target_station, intensity, result);

  const attackEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    target: target_station,
    attacker: attacker_station,
    type: attack_type,
    intensity,
    frequency,
    range,
    duration: 1000 * (1 + intensity / 100),
    effectiveness, // 明確添加 effectiveness
    result,
  };

  this.setState(
    prev => ({
      attackHistory: [...prev.attackHistory, attackEvent],
      defenseStatus: `Defending against ${attack_type}`,
    }),
    () => {
      console.log('Attack launched:', attackEvent);
    }
  );

  this.defenderStrategy.activateDefense(attack_type, intensity, attackEvent.id);

  setTimeout(async () => {
    const analysis = await this.attackAnalyzer.analyzeAttack(attackEvent);
    this.setState(prev => ({
      aiAnalysis: [...prev.aiAnalysis, { id: attackEvent.id, content: analysis }],
      defenseStatus: 'Idle',
    }));
  }, 0);

  if (result !== 'Blocked') {
    this.updateTelemetry(intensity);
  }
  };
  
  updateTelemetry = (intensity) => {
  const disturbanceFactor = intensity / 100 * (this.defenderStrategy.defenseActive ? 0.5 : 1);
  const sinr = this.getSinrFromDbm(this.defenderPowerAtReceiver(), this.attackerPowerAtReceiver());
  let commStatus = 'normal';

  if (sinr < -10) {
    commStatus = 'disconnected'; // SINR 低於 -10 dB 時中斷
  } else if (intensity > 50) {
    commStatus = 'jammed';
  } else if (disturbanceFactor > 0.3) {
    commStatus = 'degraded';
  }

  this.setState({
    realtimeTelemetry: {
      signalStrength: Math.max(-120, -90 * (1 - disturbanceFactor)),
      frequencyOffset: 50 * disturbanceFactor * (Math.random() > 0.5 ? 1 : -1),
      bitErrorRate: Math.min(1, 0.01 + disturbanceFactor * 0.5),
      commStatus,
    }
  });

  if (commStatus !== 'disconnected') {
    setTimeout(() => {
      if (this.state.realtimeTelemetry.commStatus !== 'normal') {
        this.setState({
          realtimeTelemetry: {
            signalStrength: -90,
            frequencyOffset: 0,
            bitErrorRate: 0.01,
            commStatus: 'normal'
          }
        });
      }
    }, 5000);
  }
  };

  addCelestrakSets = async () => {
    try {
      let stations = [];
      let useLocalFile = false;

      // 1. 首先嘗試從 Celestrak 獲取最新數據
      console.log('Attempting to fetch TLE data from Celestrak...');
      try {
        const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle', {
          headers: {
            'Accept': 'text/plain'
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}, StatusText: ${response.statusText}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          throw new Error('Received empty TLE data from Celestrak');
        }
        
        // 將獲取的數據保存到本地文件
        try {
          localStorage.setItem('celestrak-active-data', text);
          localStorage.setItem('celestrak-active-lastUpdated', Date.now().toString());
          
          console.log('Successfully saved TLE data to localStorage');
        } catch (saveError) {
          console.warn('Failed to save TLE data to localStorage:', saveError);
        }
        
        stations = this.engine._addTleFileStations(text, 0xffffff, { render: false });
        console.log(`Successfully loaded ${stations.length} satellites from Celestrak`);
        this.setState({ stations }, () => {
          if (stations.length > 0) {
            this.handleSearchResultClick(stations[0]);
          } else {
            console.warn('No satellites parsed from Celestrak data');
          }
        });
        return;
      } catch (onlineError) {
        console.warn('Failed to fetch TLE data from Celestrak:', onlineError.message);
        useLocalFile = true;
      }

      // 2. 如果線上獲取失敗，嘗試從 localStorage 讀取緩存
      if (useLocalFile) {
        console.log('Attempting to load TLE data from localStorage cache...');
        try {
          const cachedData = localStorage.getItem('celestrak-active-data');
          const lastUpdated = localStorage.getItem('celestrak-active-lastUpdated');
          
          if (cachedData && lastUpdated) {
            console.log(`Using cached TLE data from ${new Date(parseInt(lastUpdated)).toLocaleString()}`);
            stations = this.engine._addTleFileStations(cachedData, 0xffffff, { render: false });
            
            console.log(`Successfully loaded ${stations.length} satellites from localStorage cache`);
            this.setState({ stations }, () => {
              if (stations.length > 0) {
                this.handleSearchResultClick(stations[0]);
              } else {
                console.warn('No satellites parsed from cached data');
              }
            });
            return;
          } else {
            console.log('No cached TLE data found in localStorage');
          }
        } catch (cacheError) {
          console.warn('Failed to load TLE data from localStorage cache:', cacheError.message);
        }
      }

      // 3. 如果緩存也不可用，嘗試從本地文件系統讀取
      console.log('Attempting to load TLE data from local file /assets/active.txt...');
      try {
        const localResponse = await fetch('/assets/active.txt');
        if (!localResponse.ok) {
          throw new Error(`Failed to load local file: Status ${localResponse.status}, StatusText: ${localResponse.statusText}`);
        }
        
        const localText = await localResponse.text();
        if (!localText || localText.trim().length === 0) {
          throw new Error('Local TLE file /assets/active.txt is empty');
        }
        
        stations = this.engine._addTleFileStations(localText, 0xffffff, { render: false });

        if (stations?.length > 0) {
          console.log(`Successfully loaded ${stations.length} satellites from local file /assets/active.txt`);
          this.setState({ stations }, () => {
            this.handleSearchResultClick(stations[0]);
          });
          return;
        } else {
          console.warn('No satellites parsed from local file /assets/active.txt');
        }
      } catch (localError) {
        console.error('Failed to load local TLE file /assets/active.txt:', localError.message);
      }

      // 4. 最後的備用方案 - 使用硬編碼的 TLE 數據
      console.log('Falling back to hardcoded TLE data...');
      stations = this.engine._addTleFileStations(FALLBACK_TLE_DATA, 0xffffff, { render: false });

      if (stations?.length > 0) {
        console.log(`Successfully loaded ${stations.length} satellites from hardcoded TLE data`);
        this.setState({ stations }, () => {
          this.handleSearchResultClick(stations[0]);
        });
        return;
      }

      console.error('No satellites loaded from any source. Check TLE data sources and parsing logic.');
    } catch (error) {
      console.error('Unexpected error while loading satellite data:', error.message);
    }
  };

  addStarlinkSatellites = async () => {
    try {
      const stations = await this.engine.loadLteFileStations(
        'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
        0x0000FF,
        { render: false, satelliteSize: 40 }
      );

      if (stations && Array.isArray(stations)) {
        console.log(`Successfully loaded ${stations.length} Starlink satellites`);
        this.setState(prevState => ({
          stations: [...prevState.stations, ...stations]
        }));
      }
    } catch (error) {
      console.error('Error loading Starlink satellites:', error.message);
    }
  };

  addGPSSatellites = async () => {
    try {
      const stations = await this.engine.loadLteFileStations(
        'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
        0xFFA500,
        { render: false, satelliteSize: 50 }
      );

      if (stations && Array.isArray(stations)) {
        console.log(`Successfully loaded ${stations.length} GPS satellites`);
        this.setState(prevState => ({
          stations: [...prevState.stations, ...stations]
        }));
      }
    } catch (error) {
      console.error('Error loading GPS satellites:', error.message);
    }
  };

  clearAllAttackLines = () => {
    this.attackLines.forEach(({ line }) => {
      if (line && this.engine.scene) {
        this.engine.scene.remove(line);
        line.geometry.dispose();
        line.material.dispose();
      }
    });
    this.attackLines = [];
  };

  animate = () => {
    if (this.engine) {
      this.engine.render();
      requestAnimationFrame(this.animate);
    }
  };

  render() {
    const { attacker_station, defender_station, positioningMode, current_date, attackHistory, defenseHistory, show_analysis, attack_type, frequency, bandwidth, attacker_eirp, defender_eirp, spoofing_signal_strength, dos_packet_rate, selected_range, step_size, stations, target_station, defenseStatus } = this.state;
    let jamBox;

    if (this.defenderRange() < 0) {
    jamBox = <h1 className="bg-secondary text-white">Satellite Out of Range</h1>;
    } else if (this.state.realtimeTelemetry.commStatus === 'disconnected') {
    jamBox = <h1 className="bg-dark text-white">Connection Lost!</h1>;
    } else if (this.defenderPowerAtReceiver() > this.attackerPowerAtReceiver()) {
    if (this.dbmToWats(this.defenderPowerAtReceiver()) * 0.5 < this.dbmToWats(this.attackerPowerAtReceiver())) {
    jamBox = <h1 className="bg-warning text-white">Signal Quality Degraded</h1>;
     } else {
     jamBox = <h1 className="bg-success text-white">Communications Normal!</h1>;
     }
     } else if (this.attackerPowerAtReceiver() > this.defenderPowerAtReceiver() && this.attackerRange() > 0) {
     jamBox = <h1 className="bg-danger text-white">Signal Jammed!</h1>;
    }

    return (
      <div className="container-fluid">
      <ToastContainer position="top-right" autoClose={3000} />
        <div className="row">
          <div className="col-md-3 sidebar">
            <InfoBox 
              current_date={dayjs(current_date?.toISOString()).local().format('YYYY-MM-DD HH:mm:ss')} 
              satellite_name={target_station ? target_station.name : 'No Target'}
            />
            
            <div className="SimulationSettings card mb-3">
              <div className="card-header h4">Simulation Settings</div>
              <div className="card-body">
                <h6>Target Satellite</h6>
                <Search stations={stations} onResultClick={this.handleSearchResultClick} />
                
                <h6 className="mt-3">Simulation Period</h6>
                <DateTimeRangePicker 
                  className="DateTimeRange w-100" 
                  clearIcon={null} 
                  disableClock={true} 
                  minDate={todayMidnight} 
                  maxDate={fortnight} 
                  value={selected_range} 
                  onChange={this.updateSimulationPeriod}
                />
                
                <h6 className="mt-3">Simulation Step Size: {step_size}s</h6>
                <Form.Range min="1" max="1000" defaultValue="10" onChange={this.updateStepSize} />
              </div>
            </div>

            <div className="JamBox card mb-3">
              <div className="card-header h4">Communication Status</div>
              <div className="card-body">
                {jamBox}
                <p><span className="h5"><b>SINR</b> @ Target: {this.getSinrFromDbm(this.defenderPowerAtReceiver(), this.attackerPowerAtReceiver()).toFixed(2)} dB</span></p>
                <p><span className="h5"><b>SINR (Clear)</b> @ Target: {this.getSinrFromDbm(this.defenderPowerAtReceiver(), -2000000000).toFixed(2)} dB</span></p>
                <p><span className="h5"><b>Attack Effectiveness</b>: {this.getAttackEffectiveness()}%</span></p>
                
                <Button 
                  variant="info" 
                  className="mt-2"
                  onClick={this.toggleAnalysis}
                >
                  {show_analysis ? 'Hide Analysis' : 'Show Detailed Analysis'}
                </Button>
              </div>
            </div>

            {show_analysis && (
              <AttackAnalysis 
                defenderPower={this.defenderPowerAtReceiver()}
                attackerPower={this.attackerPowerAtReceiver()}
                sinr={this.getSinrFromDbm(this.defenderPowerAtReceiver(), this.attackerPowerAtReceiver())}
                effectiveness={this.getAttackEffectiveness()}
                attackType={attack_type}
              />
            )}
          </div>

          <div className="col-md-9 main-content">
            <div className="row">
              <div className="col-md-6">
                <div className="AttackerSettings card mb-3">
                  <div className="card-header h4 text-danger">Attacker Settings</div>
                  <div className="card-body">
                    <div className="mb-3">
                      <span className="h6">
                        <span className="h5 text-danger">Attacker</span>
                        {this.attackerRange() > 0
                          ? <Badge bg="success" className="ms-2">Satellite Visible</Badge>
                          : <Badge bg="secondary" className="ms-2">Satellite Not Visible</Badge>
                        }
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label h6">Jammer Coordinates</label>
                      <div className="d-flex">
                        <CoordinateInput 
                          className="form-control CoordinateInput" 
                          value={attacker_station
                            ? `${attacker_station.lat}° N ${attacker_station.long}° E`
                            : '30° 00′ 00″ N 090° 00′ 00″ W'}
                          placeholderChar={null}
                          onChange={this.updateAttackerCoords}
                        />
                        <Button 
                          variant={positioningMode === 'attacker' ? 'success' : 'outline-secondary'}
                          className="ms-2"
                          onClick={() => this.setPositioningMode('attacker')}
                        >
                          {positioningMode === 'attacker' ? 'Click on the map to select a location...' : 'Select Map Location'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <Form.Label className="h6">Attacker EIRP: {attacker_eirp} dBm</Form.Label>
                      <Form.Range min="-50" max="200" defaultValue="0" onChange={this.updateAttackerEirp} />
                    </div>
                    
                    <div className="mb-3">
                      <Form.Label className="h6">Attack Type</Form.Label>
                      <ButtonGroup className="w-100">
                        {ATTACK_TYPES.map((type, idx) => (
                          <ToggleButton
                            key={idx}
                            id={`attack-type-${idx}`}
                            type="radio"
                            variant="outline-danger"
                            name="attack-type"
                            value={type.value}
                            checked={attack_type === type.value}
                            onChange={(e) => this.updateAttackType(type.value)}
                          >
                            {type.name}
                          </ToggleButton>
                        ))}
                      </ButtonGroup>
                    </div>
                    
                    {attack_type === 'frequency' && (
                      <>
                        <div className="mb-3">
                          <Form.Label className="h6">Frequency: {frequency / 1e6} MHz</Form.Label>
                          <Form.Range min="1" max="30000" step="1" value={frequency / 1e6} onChange={(e) => this.setState({ frequency: e.target.value * 1e6 })} />
                        </div>
                        <div className="mb-3">
                          <Form.Label className="h6">Bandwidth: {bandwidth / 1e6} MHz</Form.Label>
                          <Form.Range min="0.1" max="100" step="0.1" value={bandwidth / 1e6} onChange={(e) => this.setState({ bandwidth: e.target.value * 1e6 })} />
                        </div>
                      </>
                    )}
                    
                    {attack_type === 'spoofing' && (
                      <div className="mb-3">
                        <Form.Label className="h6">Spoofing Signal Strength: {spoofing_signal_strength} dBm</Form.Label>
                        <Form.Range min="-50" max="100" value={spoofing_signal_strength} onChange={this.updateSpoofingStrength} />
                      </div>
                    )}
                    
                    {attack_type === 'dos' && (
                      <div className="mb-3">
                        <Form.Label className="h6">DoS Packet Rate: {dos_packet_rate} pps</Form.Label>
                        <Form.Range min="1" max="10000" value={dos_packet_rate} onChange={this.updateDosRate} />
                      </div>
                    )}
                    
                    <Button 
                      variant="danger" 
                      className="w-100 mt-3" 
                      onClick={() => this.handleAttack(this.getAttackEffectiveness())}
                    >
                      Launch Attack
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
              <div className="DefenderSettings card mb-3">
                <div className="card-header h4 text-primary">Defender Settings</div>
                <div className="card-body">
                    <div className="mb-3">
                      <span className="h6">
                        <span className="h5 text-primary">Defender</span>
                        {this.defenderRange() > 0
                          ? <Badge bg="success" className="ms-2">Satellite Visible</Badge>
                          : <Badge bg="secondary" className="ms-2">Satellite Not Visible</Badge>
                        }
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label h6">Defense Status: {defenseStatus}</label>
                    </div>
                    <div className="mb-3">
                      <label className="form-label h6">Recent Defense Actions</label>
                      <ul>
                        {defenseHistory.slice(-3).map(defense => (
                          <li key={defense.id}>
                            {new Date(defense.timestamp).toLocaleString()}: {defense.actions.join(', ')} (Against {defense.attackType})
                          </li>
                        ))}
                      </ul>
                    </div>
                    

                    <div className="mb-3">
                    <label className="form-label h6">Ground Station Coordinates</label>
                    <div className="d-flex">
                        <CoordinateInput 
                        className="form-control CoordinateInput" 
                        value={defender_station
                            ? `${defender_station.lat}° N ${defender_station.long}° E`
                            : '28° 34′ 24″ N 080° 39′ 03″ W'}
                        placeholderChar={null}
                        onChange={this.updateDefenderCoords}
                        />
                        <Button 
                        variant={positioningMode === 'defender' ? 'success' : 'outline-secondary'}
                        className="ms-2"
                        onClick={() => this.setPositioningMode('defender')}
                        >
                        {positioningMode === 'defender' ? 'Click on the map to select a location...' : 'Select Map Location'}
                        </Button>
                    </div>
                    </div>

                    {positioningMode && (
                    <div className="alert alert-info mt-3">
                        Currently setting {positioningMode === 'attacker' ? 'Attacker' : 'Defender'} Location - Click on a location on Earth
                        <Button 
                        variant="link" 
                        className="float-end"
                        onClick={() => this.setState({ positioningMode: null })}
                        >
                        Cancel
                        </Button>
                    </div>
                    )}

                    <div className="mb-3">
                    <Form.Label className="h6">Defender EIRP: {defender_eirp} dBm</Form.Label>
                    <Form.Range min="-50" max="200" defaultValue="30" onChange={this.updateDefenderEirp} />
                    </div>

                    <div className="mb-3">
                    <Form.Label className="h6">Operating Frequency: {frequency / 1e6} MHz</Form.Label>
                    <Form.Range min="1" max="30000" step="1" value={frequency / 1e6} onChange={(e) => this.setState({ frequency: e.target.value * 1e6 })} />
                    </div>
                </div>
            </div>
            </div>
            </div>
            
            <div className="row mt-3">
              <div className="col-md-6">
                <SignalVisualization 
                  frequency={this.state.frequency}
                  bandwidth={this.state.bandwidth}
                  disturbance={this.getAttackEffectiveness().effectiveness}
                  sinr={this.getSinrFromDbm(this.defenderPowerAtReceiver(), this.attackerPowerAtReceiver())}
                  defenderPower={this.defenderPowerAtReceiver()}
                  attackerPower={this.attackerPowerAtReceiver()}
                  defenseActive={this.defenderStrategy.defenseActive}
                />
                </div>
                <div className="col-md-6">
                <AttackHistory 
                  events={attackHistory}
                  defenseHistory={defenseHistory}
                  onSelect={this.showAttackDetails}
                />
              </div>
            </div>
            
            <div className="Visualization card mt-3">
              <div className="card-header h4">3D Visualization</div>
              <div className="card-body p-0">
                <div
                  id="visualization"
                  ref={c => this.el = c}
                  className="visualization-container"
                  onClick={this.handleMapClick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  setPositioningMode = (mode) => {
    this.setState({ positioningMode: mode });
  };
}

export default App;

const root = createRoot(document.getElementById('root'));
root.render(<App />);
