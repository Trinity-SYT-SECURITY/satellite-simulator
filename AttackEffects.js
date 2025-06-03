import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const AttackEffects = ({ attackHistory }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || attackHistory.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 繪製雷達圖
    const drawRadar = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 雷達基底
      ctx.beginPath();
      ctx.arc(150, 150, 120, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 30, 0, 0.7)';
      ctx.fill();
      
      // 掃描線
      const now = Date.now();
      const angle = (now % 2000) / 2000 * Math.PI * 2;
      
      ctx.beginPath();
      ctx.moveTo(150, 150);
      ctx.lineTo(
        150 + Math.cos(angle) * 120,
        150 + Math.sin(angle) * 120
      );
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 繪製攻擊事件
      attackHistory.forEach(event => {
        const timeDiff = now - new Date(event.timestamp).getTime();
        if (timeDiff < 5000) { // 只顯示5秒內的攻擊
          const posAngle = Math.atan2(
            event.target.position.y, 
            event.target.position.x
          );
          
          const radius = Math.min(120, event.range / 1000);
          
          ctx.beginPath();
          ctx.arc(
            150 + Math.cos(posAngle) * radius,
            150 + Math.sin(posAngle) * radius,
            event.intensity * 5,
            0, Math.PI * 2
          );
          
          const gradient = ctx.createRadialGradient(
            150 + Math.cos(posAngle) * radius,
            150 + Math.sin(posAngle) * radius,
            0,
            150 + Math.cos(posAngle) * radius,
            150 + Math.sin(posAngle) * radius,
            event.intensity * 5
          );
          
          gradient.addColorStop(0, `rgba(255, 0, 0, ${0.3 + event.intensity * 0.7})`);
          gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      });
      
      requestAnimationFrame(drawRadar);
    };
    
    drawRadar();
    
    return () => {
      cancelAnimationFrame(drawRadar);
    };
  }, [attackHistory]);
  
  return (
    <div className="attack-effects">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={300}
        style={{ background: 'black' }}
      />
      
      <div className="attack-history">
        <h4>攻擊事件記錄</h4>
        <ul>
          {attackHistory.slice().reverse().map(event => (
            <li key={event.id}>
              <span className="time">{new Date(event.timestamp).toLocaleTimeString()}</span>
              <span className="target">{event.target.name}</span>
              <span className="intensity">強度: {event.intensity.toFixed(2)}</span>
              {event.aiAnalysis && (
                <div className="ai-analysis">
                  <small>{event.aiAnalysis}</small>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AttackEffects;
