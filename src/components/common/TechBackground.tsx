import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const TechBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme, isLight } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes configuration
    const particleCount = Math.min(width < 768 ? 25 : 55, 70);
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      pulse: number;
      pulseSpeed: number;
    }> = [];

    const getThemeColors = () => {
      if (isLight) {
        return {
          primary: 'rgba(99, 102, 241, ',
          secondary: 'rgba(6, 182, 212, ',
          lineAlpha: 0.08,
        };
      }
      switch (theme) {
        case 'neon-matrix':
          return {
            primary: 'rgba(16, 185, 129, ',
            secondary: 'rgba(52, 211, 153, ',
            lineAlpha: 0.12,
          };
        case 'deep-space':
          return {
            primary: 'rgba(168, 85, 247, ',
            secondary: 'rgba(236, 72, 153, ',
            lineAlpha: 0.12,
          };
        case 'titanium-slate':
          return {
            primary: 'rgba(6, 182, 212, ',
            secondary: 'rgba(59, 130, 246, ',
            lineAlpha: 0.12,
          };
        case 'cyber-obsidian':
        case 'dark':
        default:
          return {
            primary: 'rgba(99, 102, 241, ',
            secondary: 'rgba(6, 182, 212, ',
            lineAlpha: 0.13,
          };
      }
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.6 + 0.8,
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI,
        pulseSpeed: 0.02 + Math.random() * 0.02,
      });
    }

    // Interactive mouse coordinates
    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const colors = getThemeColors();

      // Draw subtle futuristic cyber grid
      const gridSize = 48;
      ctx.beginPath();
      ctx.strokeStyle = `${colors.primary}0.025)`;
      ctx.lineWidth = 1;

      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = p.alpha + Math.sin(p.pulse) * 0.15;

        // Node glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${colors.primary}${Math.max(0.1, currentAlpha)})`;
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `${colors.secondary}${(1 - dist / 130) * colors.lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Light reaction to mouse proximity
        const mdx = p.x - mouseX;
        const mdy = p.y - mouseY;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 140) {
          ctx.beginPath();
          ctx.strokeStyle = `${colors.secondary}${(1 - mdist / 140) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, isLight]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Animated Canvas */}
      <canvas ref={canvasRef} className={`w-full h-full ${isLight ? 'opacity-35' : 'opacity-70'}`} />

      {/* Futuristic Ambient Glow Orbs */}
      <div
        className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[110px] pointer-events-none transition-colors duration-700 ${
          isLight
            ? 'bg-indigo-300/15'
            : theme === 'neon-matrix'
            ? 'bg-emerald-500/10'
            : theme === 'deep-space'
            ? 'bg-purple-600/15'
            : theme === 'titanium-slate'
            ? 'bg-cyan-500/12'
            : 'bg-indigo-600/15'
        }`}
      />
      <div
        className={`absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full blur-[130px] pointer-events-none transition-colors duration-700 ${
          isLight
            ? 'bg-sky-300/15'
            : theme === 'neon-matrix'
            ? 'bg-teal-500/10'
            : theme === 'deep-space'
            ? 'bg-pink-600/10'
            : theme === 'titanium-slate'
            ? 'bg-blue-600/12'
            : 'bg-cyan-500/12'
        }`}
      />
      <div
        className={`absolute -bottom-32 left-1/4 w-[30rem] h-[30rem] rounded-full blur-[140px] pointer-events-none transition-colors duration-700 ${
          isLight
            ? 'bg-emerald-300/10'
            : theme === 'neon-matrix'
            ? 'bg-emerald-700/10'
            : theme === 'deep-space'
            ? 'bg-violet-700/12'
            : theme === 'titanium-slate'
            ? 'bg-sky-700/10'
            : 'bg-purple-600/10'
        }`}
      />

      {/* Cyber scanline texture overlay (disabled in light mode) */}
      {!isLight && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-15 pointer-events-none" />
      )}
    </div>
  );
};
