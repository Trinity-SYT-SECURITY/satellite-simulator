import React, { useRef, useEffect } from 'react';

const RadarView = ({ attacks, range = 10000 }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const radius = Math.min(canvas.width, canvas.height) * 0.45;
    let animationId;

    const draw = () => {
      // 清空畫布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 繪製雷達背景
      ctx.fillStyle = 'rgba(0, 20, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // 繪製距離環
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
      for (let r = radius / 4; r <= radius; r += radius / 4) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // 繪製掃描線
      const now = Date.now();
      const angle = (now % 3000) / 3000 * Math.PI * 2;
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius
      );
      ctx.stroke();
      
      // 繪製攻擊事件
      attacks.forEach(event => {
        const timeDiff = now - new Date(event.timestamp).getTime();
        if (timeDiff < 5000) { // 只顯示5秒內的攻擊
          const distanceRatio = Math.min(1, event.range / range);
          const eventRadius = distanceRatio * radius;
          const eventAngle = Math.atan2(
            event.target.position.y - event.attacker.position.y,
            event.target.position.x - event.attacker.position.x
          );
          
          // 攻擊位置
          const x = center.x + Math.cos(eventAngle) * eventRadius;
          const y = center.y + Math.sin(eventAngle) * eventRadius;
          
          // 繪製干擾波紋
          const rippleSize = (timeDiff / 5000) * 20 * (event.intensity / 50);
          ctx.beginPath();
          ctx.arc(x, y, rippleSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, ${100 - event.intensity}, 0, ${0.7 - timeDiff/5000 * 0.5})`;
          ctx.fill();
          
          // 繪製攻擊源指示
          if (timeDiff < 1000) {
            ctx.beginPath();
            ctx.moveTo(
              center.x + Math.cos(eventAngle) * radius * 0.1,
              center.y + Math.sin(eventAngle) * radius * 0.1
            );
            ctx.lineTo(x, y);
            ctx.strokeStyle = `rgba(255, 80, 0, ${1 - timeDiff/1000})`;
            ctx.lineWidth = 1 + event.intensity / 50;
            ctx.stroke();
          }
        }
      });
      
      animationId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => cancelAnimationFrame(animationId);
  }, [attacks, range]);
  
  return (
    <div className="radar-view">
      <h5>通訊干擾雷達</h5>
      <canvas 
        ref={canvasRef}
        width={400}
        height={400}
      />
      <div className="radar-legend">
        <span className="legend-item threat">高威脅</span>
        <span className="legend-item warning">中威脅</span>
        <span className="legend-item normal">低威脅</span>
      </div>
    </div>
  );
};

export default RadarView;
