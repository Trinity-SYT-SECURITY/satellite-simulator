import React, { useEffect, useRef } from 'react';

const SignalVisualization = ({ frequency = 1000 * 1e6, bandwidth = 10 * 1e6, disturbance = 0, sinr = 0, defenderPower = 0, attackerPower = 0, defenseActive = false }) => {
  const canvasRef = useRef(null);
  const analyzerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const drawOscilloscope = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // 清除畫布
      ctx.fillStyle = 'rgba(0, 10, 20, 0.2)';
      ctx.fillRect(0, 0, width, height);

      // 繪製保護指示邊框（當防禦啟動時）
      if (defenseActive) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, width - 4, height - 4);
      }

      // 繪製網格
      ctx.strokeStyle = 'rgba(0, 100, 200, 0.3)';
      ctx.beginPath();
      for (let x = 0; x < width; x += width / 10) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += height / 5) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 根據干擾和功率計算信號強度
      const noiseLevel = (disturbance / 100) * (defenseActive ? 0.5 : 1); // 防禦啟動時降低噪聲
      const freqFactor = frequency / 1e7;
      const signalStrength = (defenderPower - attackerPower) / 100;
      const amplitudeFactor = Math.max(0.1, 1 - noiseLevel + (sinr / 20));

      // 繪製主信號
      ctx.strokeStyle = `hsl(${200 - noiseLevel * 50}, 100%, ${50 + signalStrength * 20}%)`;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = 0; x < width; x++) {
        const t = (x / width) * Math.PI * 10;
        const signal = Math.sin(t * freqFactor) * amplitudeFactor;
        const noise = noiseLevel * (Math.random() * 2 - 1) * (1 - sinr / 20);
        const y = centerY + (signal + noise) * (height / 3);
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 初始化或更新頻譜分析器
      if (!analyzerRef.current) {
        analyzerRef.current = {
          data: new Uint8Array(256),
          lastUpdate: 0,
        };
      }

      // 模擬頻譜分析
      if (Date.now() - analyzerRef.current.lastUpdate > 100) {
        for (let i = 0; i < 256; i++) {
          analyzerRef.current.data[i] = Math.max(0, analyzerRef.current.data[i] - 2);
          
          const bandwidthFactor = bandwidth / 1e7;
          if (Math.random() < 0.3 * (1 - noiseLevel)) {
            const freqPos = Math.floor((i * freqFactor) % 256) * bandwidthFactor;
            const intensity = Math.min(255, 50 + (defenderPower - attackerPower) * 0.1 + (noiseLevel * 50));
            analyzerRef.current.data[Math.floor(freqPos) % 256] = intensity;
          }
        }
        analyzerRef.current.lastUpdate = Date.now();
      }

      // 繪製頻譜
      const barWidth = width / 64;
      for (let i = 0; i < 64; i++) {
        const value = analyzerRef.current.data[i * 4];
        const colorHue = 140 + (value / 255) * 60 - (noiseLevel * 30);
        ctx.fillStyle = `hsl(${colorHue}, 100%, 50%)`;
        ctx.fillRect(
          i * barWidth,
          height - value / 255 * (height / 2),
          barWidth - 1,
          value / 255 * (height / 2)
        );
      }

      animationId = requestAnimationFrame(drawOscilloscope);
    };

    drawOscilloscope();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [frequency, bandwidth, disturbance, sinr, defenderPower, attackerPower, defenseActive]);

  return (
    <div className="signal-visualization">
      <h5>Signal Analysis ({(frequency / 1e6).toFixed(2)} MHz)</h5>
      <canvas 
        ref={canvasRef}
        width={400}
        height={200}
      />
      <div className="signal-metrics">
        <span>Bandwidth: {(bandwidth / 1e6).toFixed(2)} MHz</span>
        <span>Noise: {disturbance.toFixed(1)}%</span>
        <span>SINR: {sinr.toFixed(2)} dB</span>
        <span>Defender Power: {defenderPower.toFixed(2)} dBm</span>
        <span>Attacker Power: {attackerPower.toFixed(2)} dBm</span>
      </div>
    </div>
  );
};

export default SignalVisualization;
