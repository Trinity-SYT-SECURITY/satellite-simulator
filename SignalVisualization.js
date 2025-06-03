import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const SignalVisualization = ({ frequency, bandwidth, disturbance }) => {
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
      
      // 根據干擾程度調整波形
      const noiseLevel = disturbance / 100;
      const freqFactor = frequency / 1e7;
      
      // 繪製主信號
      ctx.strokeStyle = `hsl(${200 - noiseLevel * 50}, 100%, 60%)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let x = 0; x < width; x++) {
        const t = (x / width) * Math.PI * 10;
        const signal = Math.sin(t * freqFactor) * (1 - noiseLevel * 0.5);
        const noise = noiseLevel * (Math.random() * 2 - 1);
        const y = centerY + (signal + noise) * (height / 3);
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      // 繪製頻譜分析
      if (!analyzerRef.current) {
        analyzerRef.current = {
          data: new Uint8Array(256),
          lastUpdate: 0
        };
      }
      
      // 模擬頻譜分析儀
      if (Date.now() - analyzerRef.current.lastUpdate > 100) {
        for (let i = 0; i < 256; i++) {
          analyzerRef.current.data[i] = Math.max(
            0,
            analyzerRef.current.data[i] - 2
          );
          
          if (Math.random() < 0.3) {
            const freqPos = Math.floor(i * freqFactor) % 256;
            analyzerRef.current.data[freqPos] = Math.min(
              255,
              analyzerRef.current.data[freqPos] + 50 * (1 - noiseLevel)
            );
          }
        }
        analyzerRef.current.lastUpdate = Date.now();
      }
      
      // 繪製頻譜
      const barWidth = width / 64;
      for (let i = 0; i < 64; i++) {
        const value = analyzerRef.current.data[i * 4];
        ctx.fillStyle = `hsl(${140 + (value / 255) * 60}, 100%, 50%)`;
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
  }, [frequency, bandwidth, disturbance]);
  
  return (
    <div className="signal-visualization">
      <h5>Signal Analysis ({frequency/1e6} MHz)</h5>
      <canvas 
        ref={canvasRef}
        width={400}
        height={200}
      />
      <div className="signal-metrics">
        <span>Bandwidth: {(bandwidth/1e6).toFixed(2)} MHz</span>
        <span>Noise: {disturbance.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default SignalVisualization;
