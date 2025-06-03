import React from 'react';
import { ProgressBar } from 'react-bootstrap';

const TelemetryPanel = ({ telemetry, attackHistory }) => {
  const getStatusVariant = () => {
    switch(telemetry.commStatus) {
      case 'jammed': return 'danger';
      case 'degraded': return 'warning';
      default: return 'success';
    }
  };

  return (
    <div className="telemetry-panel card mt-3">
      <div className="card-header">
        <h5>衛星通訊遙測數據</h5>
        <span className={`badge bg-${getStatusVariant()}`}>
          {telemetry.commStatus === 'jammed' ? '通訊中斷' : 
           telemetry.commStatus === 'degraded' ? '通訊降級' : '通訊正常'}
        </span>
      </div>
      <div className="card-body">
        <div className="telemetry-item">
          <label>信號強度</label>
          <ProgressBar 
            now={Math.max(0, telemetry.signalStrength + 120)} 
            variant={telemetry.signalStrength < -100 ? 'danger' : 'success'}
            label={`${telemetry.signalStrength.toFixed(1)} dBm`}
          />
        </div>
        
        <div className="telemetry-item">
          <label>頻率偏移</label>
          <ProgressBar 
            now={Math.abs(telemetry.frequencyOffset) * 2} 
            variant={telemetry.frequencyOffset > 30 ? 'danger' : 'warning'}
            label={`${telemetry.frequencyOffset.toFixed(2)} kHz`}
          />
        </div>
        
        <div className="telemetry-item">
          <label>誤碼率</label>
          <ProgressBar 
            now={telemetry.bitErrorRate * 100} 
            variant={telemetry.bitErrorRate > 0.1 ? 'danger' : 'success'}
            label={telemetry.bitErrorRate.toExponential(2)}
          />
        </div>
        
        <div className="attack-events mt-3">
          <h6>最近攻擊事件</h6>
          <ul>
            {attackHistory.slice(0, 3).map(event => (
              <li key={event.id}>
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                <span className="type-badge">{event.type}</span>
                <span>{event.intensity} dBm</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;
