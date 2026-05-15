import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  ChevronRight, 
  Star, 
  Volume2, 
  Info,
  RefreshCw,
  Trophy,
  X,
  MessageSquare,
  Leaf
} from 'lucide-react';
import { ENCOUNTERS, AAC_ICONS, EXPRESSION_CATEGORIES, Encounter, Verse, AACIcon, VELTRO_ENCOUNTERS, VeltroEncounter } from './data';
import { AACBoard } from './components/AACBoard';
import { speak, stop, prefetch } from './services/ttsService';
import { Sparkles } from 'lucide-react';

// --- Components ---

const ParallaxLayer = ({ speed, children, className = "" }: { speed: number, children: React.ReactNode, className?: string }) => {
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setOffset(prev => (prev - speed) % 2000);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [speed]);

  return (
    <div 
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ transform: `translateX(${offset}px)` }}
    >
      {children}
      {children} {/* Duplicate for seamless loop */}
    </div>
  );
};

const AACDisplay = ({ sequence, onSelect }: { sequence: string[], onSelect?: (id: string) => void }) => (
  <div className="flex md:flex-col gap-1 sm:gap-1.5 p-1 sm:p-1.5 md:p-3 bg-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/10 w-full md:w-28 shrink-0 overflow-x-auto md:overflow-x-visible scrollbar-hide">
    <h3 className="hidden md:block text-[7px] uppercase tracking-[0.2em] text-white/30 mb-1 text-center font-bold">Simboli CAA</h3>
    <div className="flex md:flex-col gap-1 sm:gap-1.5 overflow-y-auto md:max-h-[300px] pr-1 scrollbar-hide">
      {sequence.map(id => {
        const icon = AAC_ICONS[id];
        return (
          <motion.button
            key={id}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onSelect?.(id);
              speak(icon?.label || "");
            }}
            className="flex flex-col items-center gap-0.5 p-1 sm:p-1 rounded-lg sm:rounded-xl border border-white/5 transition-colors group shrink-0 min-w-[40px] sm:min-w-[50px] md:min-w-0"
          >
            <span className="text-base sm:text-lg md:text-2xl group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">{icon?.icon}</span>
            <span className="text-[5px] sm:text-[6px] uppercase tracking-widest text-white/40 group-hover:text-white/80 font-bold text-center leading-tight">{icon?.label}</span>
          </motion.button>
        );
      })}
    </div>
  </div>
);

const StarFlyer = ({ 
  startX, 
  startY, 
  endX, 
  endY, 
  onComplete 
}: { 
  startX: number, 
  startY: number, 
  endX: number, 
  endY: number, 
  onComplete: () => void,
  key?: number
}) => {
  return (
    <motion.div
      initial={{ 
        x: startX, 
        y: startY, 
        scale: 0,
        rotateY: 0,
        opacity: 1
      }}
      animate={{
        // Jump and Bounce
        y: [startY, startY - 140, startY - 40, startY - 60, endY],
        x: [startX, startX + 30, startX - 10, startX + 20, endX],
        scale: [0, 2.0, 1.5, 1.0, 0], // Grows significantly then shrinks to 0
        rotateY: [0, 2880], // Rapid 3D Swirl on vertical axis
      }}
      transition={{
        duration: 1.0, // Entire movement in 1 second
        times: [0, 0.2, 0.4, 0.6, 1],
        ease: "easeOut",
        rotateY: {
          duration: 1.0,
          ease: "easeInOut" // Adds ease-in and ease-out to the rotation
        }
      }}
      onAnimationComplete={onComplete}
      className="fixed z-[9999] pointer-events-none"
      style={{ left: 0, top: 0, perspective: '1200px' }}
    >
      <div className="relative flex items-center justify-center">
        {/* Softened Glow effect */}
        <div className="absolute inset-0 bg-yellow-400/25 blur-xl rounded-full scale-[2.5]" />
        <div className="absolute inset-0 bg-yellow-300/40 blur-md rounded-full scale-125" />
        <Star 
          fill="currentColor" 
          stroke="none" 
          className="w-6 h-6 text-yellow-400 relative z-10" 
        />
      </div>
    </motion.div>
  );
};

const PuzzleStop = ({ 
  encounter, 
  onSolve, 
  isSimplified,
  onIconSelect,
  onCorrect
}: { 
  encounter: Encounter, 
  onSolve: () => void, 
  isSimplified: boolean,
  onIconSelect: (id: string) => void,
  onCorrect: (rect: DOMRect) => void
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [canReplay, setCanReplay] = useState(true);
  const shuffledOptions = useMemo(() => {
    return [...encounter.verse.options].sort(() => Math.random() - 0.5);
  }, [encounter.id]);
  const targetRef = useRef<HTMLSpanElement>(null);
  const narrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (narrationTimeoutRef.current) {
        clearTimeout(narrationTimeoutRef.current);
      }
      stop();
    };
  }, []);

  const handleCheck = (option: string) => {
    if (option === encounter.verse.missingWord) {
      setSelected(option);
      setIsCorrect(true);
      if (targetRef.current) {
        onCorrect(targetRef.current.getBoundingClientRect());
      }
      setTimeout(() => {
        onSolve();
      }, 2500); // Increased delay to allow animation to finish
    } else {
      setSelected(option);
      setIsWrong(true);
      setTimeout(() => {
        setIsWrong(false);
        setSelected(null);
      }, 500);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      className="max-w-3xl w-full flex flex-col md:flex-row gap-1.5 sm:gap-4 items-center md:items-start pointer-events-auto px-2 sm:px-4 md:px-0 scale-[0.75] sm:scale-90 lg:scale-100 origin-center"
    >
      <div className="flex-1 w-full bg-black/40 backdrop-blur-xl p-1.5 sm:p-3 md:p-5 rounded-[20px] sm:rounded-[24px] border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        
        <div className="mb-0.5 sm:mb-3 relative z-10">
          <div className="flex items-center justify-between mb-0.5 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-[1px] w-6 sm:w-8 bg-white/20" />
              <h2 className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white/40">Canto {encounter.canto}</h2>
            </div>
            <div className="relative group/sound">
              <motion.button 
                whileHover={canReplay ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                whileTap={canReplay ? { scale: 0.9 } : {}}
                onClick={() => {
                  console.log("PuzzleStop: Button clicked, canReplay:", canReplay);
                  if (!canReplay) {
                    // Interrupt
                    stop();
                    if (narrationTimeoutRef.current) {
                      clearTimeout(narrationTimeoutRef.current);
                      narrationTimeoutRef.current = null;
                    }
                    setCanReplay(true);
                    console.log("PuzzleStop: Narration interrupted");
                    return;
                  }

                  setCanReplay(false);
                  console.log("PuzzleStop: Starting narration immediately...");
                  const textToSpeak = isSimplified ? encounter.verse.simplified : (encounter.id === "dark_wood" ? encounter.verse.text.replace(/____|\.\.\./, encounter.verse.missingWord) : encounter.description);
                  speak(textToSpeak).finally(() => {
                    setCanReplay(true);
                    console.log("PuzzleStop: Replay finished");
                  });
                }}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all relative z-50 bg-white/20 border-white/40 text-white cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)] pointer-events-auto`}
              >
                <AnimatePresence mode="wait">
                  {!canReplay ? (
                    <motion.div
                      key="pulsing"
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >
                      <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="static"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
          <h1 className="text-sm sm:text-xl md:text-2xl font-serif italic text-white mb-0 sm:mb-2 tracking-tight">{encounter.name}</h1>
          <p className="text-white/60 leading-tight text-[8px] sm:text-xs md:text-sm max-w-xl font-light whitespace-pre-line mb-1 sm:mb-2 italic">
            {isSimplified ? (encounter.puzzleHeaderSimplified || encounter.verse.simplified) : (encounter.puzzleHeader || encounter.description)}
          </p>
        </div>

        <div className="space-y-1.5 sm:space-y-3 relative z-10">
          <div className="text-[10px] sm:text-base md:text-xl font-serif text-center py-1 sm:py-3 px-2 sm:px-4 bg-white/5 rounded-xl sm:rounded-[20px] border border-white/5 shadow-inner break-words">
            {encounter.verse.text.split(/____|\.\.\./).map((part, i, arr) => (
              <React.Fragment key={i}>
                <span className="text-white/90">{part}</span>
                {i < arr.length - 1 && (
                  <motion.span 
                    ref={targetRef}
                    animate={isWrong ? { x: [-5, 5, -5, 5, 0] } : isCorrect ? { scale: [1, 1.1, 1] } : {}}
                    className={`inline-block min-w-[70px] sm:min-w-[140px] border-b-2 mx-1 sm:mx-3 transition-colors ${isWrong ? 'border-red-500 text-red-400' : isCorrect ? 'border-yellow-500 text-yellow-400' : 'border-white/20 text-white'}`}
                  >
                    {selected || "..."}
                  </motion.span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1 sm:gap-2">
            {shuffledOptions.map(option => (
              <motion.button
                key={option}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => !isCorrect && handleCheck(option)}
                className={`p-1 sm:p-3 rounded-lg sm:rounded-xl border transition-all font-serif italic text-[10px] sm:text-base shadow-lg ${
                  isCorrect && option === encounter.verse.missingWord 
                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 shadow-yellow-500/10' 
                    : 'bg-white/5 border-white/10 text-white hover:shadow-white/5'
                }`}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {isSimplified && (
        <AACDisplay sequence={encounter.verse.aacSequence} onSelect={onIconSelect} />
      )}
    </motion.div>
  );
};

const ParticleCanvas = ({ isIntensified, isRadial }: { isIntensified: boolean, isRadial: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    let width = window.innerWidth;
    let height = window.innerHeight;
    let time = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    class Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      layer: number;
      angle: number;
      radius: number;
      orbitSpeed: number;

      constructor() {
        this.baseX = Math.random() * width;
        this.baseY = Math.random() * height;
        this.x = this.baseX;
        this.y = this.baseY;
        this.layer = Math.random() > 0.7 ? 2 : 1;
        this.size = this.layer === 2 ? Math.random() * 2 + 1.5 : Math.random() * 1 + 0.5;
        this.speedX = (Math.random() - 0.5) * (this.layer === 2 ? 0.2 : 0.05);
        this.speedY = -Math.random() * (this.layer === 2 ? 0.4 : 0.15); // Upward bias
        this.opacity = Math.random() * 0.3 + 0.1;
        this.angle = Math.random() * Math.PI * 2;
        this.radius = Math.random() * 50 + 20;
        this.orbitSpeed = (Math.random() - 0.5) * 0.01;
      }

      update() {
        const speedMultiplier = isIntensified ? 20 : 1;
        
        if (isRadial) {
          const centerX = width / 2;
          const centerY = height / 2;
          const dx = this.baseX - centerX;
          const dy = this.baseY - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const forceX = dx / distance;
          const forceY = dy / distance;
          
          this.baseX += forceX * 10;
          this.baseY += forceY * 10;
        } else {
          // Upward drift
          this.baseY += this.speedY * speedMultiplier;
          this.baseX += this.speedX * speedMultiplier;
        }

        // Circular micro-motion
        this.angle += this.orbitSpeed * speedMultiplier;
        this.x = this.baseX + Math.cos(this.angle) * this.radius * (this.layer === 2 ? 0.5 : 0.2);
        this.y = this.baseY + Math.sin(this.angle) * this.radius * (this.layer === 2 ? 0.5 : 0.2);

        if (this.baseY < -100) this.baseY = height + 100;
        if (this.baseY > height + 100) this.baseY = -100;
        if (this.baseX < -100) this.baseX = width + 100;
        if (this.baseX > width + 100) this.baseX = -100;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        
        if (this.layer === 2) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();
      }
    }

    for (let i = 0; i < 100; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isIntensified, isRadial]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};

const Frontispiece = ({ onStart }: { onStart: () => void }) => {
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    setIsStarting(true);
    setTimeout(onStart, 1200);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[40] overflow-hidden flex items-center justify-center"
    >
      {/* Dynamic Gradient Background */}
      <div className="absolute inset-0 bg-black" />
      <motion.div 
        style={{
          background: 'radial-gradient(circle at center, #1e3a1e 0%, #0a1a0a 20%, #000000 45%)'
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      />
      
      {/* Grain/Noise Overlay for "Granular" feel */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      
      {/* Particle System */}
      <ParticleCanvas isIntensified={isStarting} isRadial={false} />

      {/* Title Overlay */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: isStarting ? 0 : 1, y: 0 }}
        transition={{ duration: 1.5, delay: 0.5 }}
        className="absolute top-[18%] sm:top-[22%] text-center z-50 pointer-events-none px-6 max-w-2xl"
      >
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif italic text-white mb-2 sm:mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-tight">
          Il Cammino delle Stelle
        </h1>
        <p className="text-white/40 text-[8px] sm:text-[10px] md:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] font-bold">
          Viaggio nell'Inferno dantesco
        </p>
      </motion.div>

      {/* Central Flickering Light */}
      <div className="relative z-50 flex items-center justify-center">
        <motion.button
          onClick={handleStart}
          className="relative group cursor-pointer border-none bg-transparent p-0 outline-none"
          whileHover="hover"
          animate={isStarting ? { scale: 20, opacity: 0, filter: "blur(60px)" } : {}}
          transition={{ duration: 1.2, ease: "easeIn" }}
        >
          {/* Spiritual Grain Overlay (Localized) */}
          <div className="absolute inset-0 -m-32 rounded-full opacity-[0.04] pointer-events-none mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-20" />

          {/* Halo Effect (Soft Background Glow) */}
          <motion.div
            variants={{
              hover: { scale: 1.8, opacity: 0.5, filter: "blur(60px)" }
            }}
            animate={isStarting ? { opacity: 0 } : {
              scale: [1.2, 1.4, 1.3, 1.5, 1.2],
              opacity: [0.1, 0.25, 0.15, 0.3, 0.1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 -m-24 bg-white/10 rounded-full blur-[80px] pointer-events-none"
          />

          {/* Interactive Glow (Middle Layer) */}
          <motion.div
            variants={{
              hover: { scale: 1.4, opacity: 0.8, filter: "blur(20px)" }
            }}
            animate={isStarting ? { scale: 5, opacity: 0 } : {
              scale: [1, 1.2, 1.1, 1.3, 1],
              opacity: [0.3, 0.5, 0.4, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 -m-8 bg-white/20 rounded-full blur-2xl group-hover:bg-white/40 transition-all duration-500"
          />

          {/* Core Light (Flickering) */}
          <motion.div
            variants={{
              hover: { scale: 1.3, shadow: "0 0 40px rgba(255,255,255,1)" }
            }}
            animate={isStarting ? { 
              scale: [1, 3, 0.5, 5],
              opacity: [1, 0.8, 1, 0],
            } : {
              scale: [1, 1.15, 0.9, 1.05, 1],
              opacity: [0.7, 1, 0.6, 0.9, 0.7],
            }}
            transition={isStarting ? { duration: 1.2 } : {
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-4 h-4 bg-white rounded-full shadow-[0_0_25px_rgba(255,255,255,0.9)] relative z-10"
          />
        </motion.button>
      </div>

      {/* Text Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isStarting ? 0 : [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute bottom-8 sm:bottom-12 text-white/50 text-[8px] sm:text-[10px] uppercase tracking-[0.5em] sm:tracking-[0.8em] font-bold pointer-events-none"
      >
        Tocca la luce per iniziare
      </motion.div>
    </motion.div>
  );
};

const InfernoMap = ({ currentIdx, encounters, onSelectCanto }: { currentIdx: number, encounters: Encounter[], onSelectCanto: (idx: number) => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full max-w-4xl bg-black/60 backdrop-blur-xl rounded-[30px] md:rounded-[40px] border border-white/10 p-6 md:p-12 relative overflow-y-auto overflow-x-hidden scrollbar-hide max-h-[90dvh] pointer-events-auto mx-auto scroll-smooth touch-pan-y"
    >
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-xl md:text-3xl font-serif italic text-white mb-2">Topografia dell'Inferno</h2>
        <p className="text-white/40 text-[8px] md:text-xs uppercase tracking-[0.3em]">Il tuo cammino attraverso i cerchi</p>
      </div>

      <div className="relative h-[600px] sm:h-[800px] md:h-[1000px] flex flex-col items-center">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 1000">
          <defs>
            <linearGradient id="mapGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,0,0,0.1)" />
            </linearGradient>
            <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(59, 130, 246, 0.2)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          
          {/* Funnel Shape */}
          <path 
            d="M 80 50 Q 400 -20 720 50 L 450 950 Q 400 980 350 950 Z" 
            fill="url(#mapGradient)" 
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />

          {/* River Acheron */}
          <rect x="200" y="380" width="400" height="60" fill="url(#riverGradient)" />
          <path 
            d="M 200 380 c 15 -5 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0" 
            stroke="rgba(59, 130, 246, 0.2)" 
            fill="none" 
            strokeWidth="1.2" 
          />
          <path 
            d="M 200 440 c 15 -5 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0 s 35 5 50 0" 
            stroke="rgba(59, 130, 246, 0.2)" 
            fill="none" 
            strokeWidth="1.2" 
          />

          {/* Region Labels */}
          <g className="opacity-40 font-mono text-[9px] md:text-[11px] uppercase tracking-[0.4em] fill-white/60">
            <text x="400" y="40" textAnchor="middle">La Selva Oscura</text>
            <text x="400" y="240" textAnchor="middle">Antinferno</text>
            <text x="400" y="415" textAnchor="middle" className="fill-blue-400/40 font-serif italic tracking-[0.3em] text-[12px] md:text-[14px] normal-case">Acheronte</text>
            <text x="400" y="580" textAnchor="middle">
              <tspan x="380" textAnchor="end">Cerchio I</tspan>
              <tspan x="420" textAnchor="start">Limbo</tspan>
            </text>
            <text x="400" y="760" textAnchor="middle">
              <tspan x="375" textAnchor="end">Cerchio II</tspan>
              <tspan x="425" textAnchor="start">Lussuriosi</tspan>
            </text>
          </g>

          {/* Region Dividers */}
          <line x1="120" y1="200" x2="680" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="8 4" />
          <line x1="360" y1="700" x2="440" y2="700" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="8 4" />
          
          {encounters.map((encounter, i) => {
            if (i === 0) return null;
            
            const getPos = (idx: number) => {
              const id = encounters[idx].id;
              const selvaIds = ["dark_wood", "three_beasts", "virgil_appears", "dante_doubt", "beatrice_mission", "gates_of_hell"];
              
              if (selvaIds.includes(id)) {
                const count = selvaIds.length;
                const pos = selvaIds.indexOf(id);
                // Linear distribution for x to avoid overlaps at the ends
                // while keeping the arc in y for the organic/perspective feel
                const t = pos / (count - 1);
                const x = 120 + t * 560; 
                const y = 100 + Math.sin(t * Math.PI) * 45;
                return { x, y };
              }
              if (id === "ignavi") return { x: 400, y: 280 };
              if (id === "charon") return { x: 400, y: 410 };
              if (id === "limbo") return { x: 400, y: 620 };
              if (id === "francesca") return { x: 400, y: 800 };
              return { x: 400, y: 100 + idx * 80 };
            };

            const prev = getPos(i - 1);
            const curr = getPos(i);

            return (
              <line 
                key={`line-${i}`}
                x1={prev.x} y1={prev.y} x2={curr.x} y2={curr.y}
                stroke={i <= currentIdx ? "rgba(234, 179, 8, 0.6)" : "rgba(255,255,255,0.15)"}
                strokeWidth="2.5"
                strokeDasharray={i <= currentIdx ? "0" : "6 4"}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0">
          {encounters.map((encounter, i) => {
            const getPos = (idx: number) => {
              const id = encounters[idx].id;
              const selvaIds = ["dark_wood", "three_beasts", "virgil_appears", "dante_doubt", "beatrice_mission", "gates_of_hell"];
              
              if (selvaIds.includes(id)) {
                const count = selvaIds.length;
                const pos = selvaIds.indexOf(id);
                const t = pos / (count - 1);
                const x = 120 + t * 560; 
                const y = 100 + Math.sin(t * Math.PI) * 45;
                return { x, y };
              }
              if (id === "ignavi") return { x: 400, y: 280 };
              if (id === "charon") return { x: 400, y: 410 };
              if (id === "limbo") return { x: 400, y: 620 };
              if (id === "francesca") return { x: 400, y: 800 };
              return { x: 400, y: 100 + idx * 80 };
            };

            const { x, y } = getPos(i);
            const isCompleted = i < currentIdx;
            const isCurrent = i === currentIdx;

            const isSelva = ["dark_wood", "three_beasts", "virgil_appears", "dante_doubt", "beatrice_mission", "gates_of_hell"].includes(encounter.id);
            const labelPosition = isSelva ? (i % 2 === 0 ? 'bottom' : 'top') : 'right';

            return (
              <motion.button
                key={encounter.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectCanto(i)}
                className="absolute group"
                style={{ left: `${(x/800)*100}%`, top: `${(y/1000)*100}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className={`
                  w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500
                  ${isCompleted ? 'bg-yellow-500 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 
                    isCurrent ? 'bg-white border-white shadow-[0_0_20px_rgba(255,255,255,0.5)] scale-110 sm:scale-125' : 
                    'bg-black/40 border-white/20 hover:border-white/40'}
                `}>
                  {isCompleted ? (
                    <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white fill-current" />
                  ) : (
                    <span className={`text-[7px] sm:text-[10px] font-bold ${isCurrent ? 'text-black' : 'text-white/40'}`}>{i + 1}</span>
                  )}
                </div>
                
                <div className={`
                  absolute whitespace-nowrap transition-all duration-500 flex flex-col
                  ${labelPosition === 'right' ? 'top-1/2 left-8 sm:left-12 -translate-y-1/2 items-start' : 
                    labelPosition === 'top' ? 'bottom-10 sm:bottom-14 left-1/2 -translate-x-1/2 items-center' : 
                    'top-10 sm:top-14 left-1/2 -translate-x-1/2 items-center'}
                  ${isCurrent || isCompleted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}
                `}>
                  <p className={`text-[6px] sm:text-[9px] uppercase tracking-[0.2em] font-medium ${isCurrent ? 'text-white' : 'text-white/50'}`}>
                    {encounter.name}
                  </p>
                  <p className="text-[4px] sm:text-[7px] text-white/20 uppercase tracking-widest mt-0.5">Canto {encounter.canto}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 md:mt-12 flex justify-center">
        <button 
          onClick={() => onSelectCanto(currentIdx)}
          className="px-6 py-3 md:px-10 md:py-4 bg-white text-black rounded-full text-xs md:text-sm font-bold uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl"
        >
          Torna al Viaggio
        </button>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [gameState, setGameState] = useState<'landing' | 'home' | 'journey' | 'encounter' | 'solved' | 'complete'>('landing');
  console.log("App: Current gameState:", gameState);
  const [prevState, setPrevState] = useState<'journey' | 'encounter' | 'solved' | 'complete'>('journey');
  const [currentEncounterIdx, setCurrentEncounterIdx] = useState(0);
  const [isSimplified, setIsSimplified] = useState(false);
  const [isCommBoardOpen, setIsCommBoardOpen] = useState(false);
  const [activeExpression, setActiveExpression] = useState<string | null>(null);
  const [laurelLeaves, setLaurelLeaves] = useState(0);
  const [puzzleScore, setPuzzleScore] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [activeVeltro, setActiveVeltro] = useState<VeltroEncounter | null>(null);
  const [veltroCanReplay, setVeltroCanReplay] = useState(false);
  const [completeCanReplay, setCompleteCanReplay] = useState(false);
  const [journeyCanReplay, setJourneyCanReplay] = useState(false);
  const [showVeltroTrigger, setShowVeltroTrigger] = useState(false);
  const [showVirgil, setShowVirgil] = useState(true);
  const [showVirgilName, setShowVirgilName] = useState(true);
  const [showSpiritualGlow, setShowSpiritualGlow] = useState(false);
  const [forestDissipation, setForestDissipation] = useState(false);
  const [particlesRadial, setParticlesRadial] = useState(false);
  const [starAnimations, setStarAnimations] = useState<{ id: number, startX: number, startY: number, endX: number, endY: number }[]>([]);
  const [isStarPulsing, setIsStarPulsing] = useState(false);
  const [limboTransition, setLimboTransition] = useState<'none' | 'dissolving' | 'zooming' | 'complete'>('none');
  const starIconRef = useRef<HTMLDivElement>(null);
  const lastPlayedCantoRef = useRef<number | null>(null);
  const narrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (narrationTimeoutRef.current) {
        clearTimeout(narrationTimeoutRef.current);
      }
      stop();
    };
  }, []);

  const currentEncounter = ENCOUNTERS[currentEncounterIdx];

  useEffect(() => {
    if (currentEncounter) {
      // Aggressively pre-fetch everything for the current encounter
      prefetch(currentEncounter.introduction);
      prefetch(currentEncounter.verse.simplified);
      prefetch(currentEncounter.description);
      
      // Also pre-fetch the next encounter's content to stay ahead
      const nextEncounter = ENCOUNTERS[currentEncounterIdx + 1];
      if (nextEncounter) {
        prefetch(nextEncounter.introduction);
        prefetch(nextEncounter.verse.simplified);
        prefetch(nextEncounter.description);
      }
    }
    
    if (gameState === 'complete') {
      prefetch("E quindi uscimmo a riveder le stelle. Hai completato il prologo del viaggio.");
    }
    
    // Prefetch AAC labels when board is open - staggered to avoid rate limits
    if (isCommBoardOpen) {
      const icons = Object.values(AAC_ICONS);
      icons.forEach((icon, index) => {
        setTimeout(() => {
          if (isCommBoardOpen) prefetch(icon.label);
        }, index * 1000); // 1 second delay between each AAC prefetch
      });
    }
  }, [currentEncounterIdx, currentEncounter, gameState, isCommBoardOpen]);

  useEffect(() => {
    if (activeVeltro) {
      prefetch(`${activeVeltro.character} dice: ${activeVeltro.message}`);
    }
  }, [activeVeltro]);

  useEffect(() => {
    if (gameState === 'journey' && currentEncounter && lastPlayedCantoRef.current !== currentEncounterIdx) {
      setJourneyCanReplay(false);
      
      // Virgil appearance logic for Canto 1, CP 2
      if (currentEncounterIdx === 2) {
        setShowVirgil(false);
        setShowVirgilName(false);
        setShowSpiritualGlow(false);
        setParticlesRadial(false);
        
        // Step 1: After 1s, show glow and radial particles
        setTimeout(() => {
          setShowSpiritualGlow(true);
          setForestDissipation(true);
          setParticlesRadial(true);
          
          // Step 2: After 2s of glow (3s total), move Dante and show Virgil
          setTimeout(() => {
            setShowVirgil(true);
            setShowSpiritualGlow(false);
            setParticlesRadial(false);

            // Step 3: After 1.5s (transition duration) + 1s delay, show Virgil's name
            setTimeout(() => {
              setShowVirgilName(true);
            }, 2500);
          }, 2000);
        }, 1000);
      } else if (currentEncounterIdx === 4) {
        // Beatrice Mission logic
        setShowVirgil(true);
        setShowVirgilName(true);
        setShowSpiritualGlow(false);
        
        // Sudden glow after 1s
        setTimeout(() => {
          setShowSpiritualGlow(true);
          // Keep it on for this screen as it's a divine mission
        }, 1000);
      } else {
        setShowVirgil(currentEncounterIdx >= 2);
        setShowVirgilName(currentEncounterIdx >= 2);
        setShowSpiritualGlow(false);
        setForestDissipation(false);
        setParticlesRadial(false);
      }

      const narrationTimer = setTimeout(() => {
        setJourneyCanReplay(true);
      }, 1000);

      lastPlayedCantoRef.current = currentEncounterIdx;
      return () => {
        clearTimeout(narrationTimer);
        if (narrationTimeoutRef.current) {
          clearTimeout(narrationTimeoutRef.current);
        }
        stop();
      };
    }
  }, [gameState, currentEncounterIdx, currentEncounter]);

  useEffect(() => {
    // Randomly show Veltro trigger
    const interval = setInterval(() => {
      if (gameState === 'journey' && !showVeltroTrigger && Math.random() > 0.7) {
        setShowVeltroTrigger(true);
        setTimeout(() => setShowVeltroTrigger(false), 8000);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [gameState, showVeltroTrigger]);

  useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setCurrentEncounterIdx(data.current_canto || 0);
        setLaurelLeaves(data.laurel_leaves || 0);
        setPuzzleScore(data.puzzle_score || 0);
      });
  }, []);

  useEffect(() => {
    if (gameState === 'complete') {
      console.log("Complete: Starting readiness timer");
      setCompleteCanReplay(false);
      const timer = setTimeout(() => {
        setCompleteCanReplay(true);
        console.log("Complete: completeCanReplay set to true");
      }, 2000);
      return () => {
        clearTimeout(timer);
        if (narrationTimeoutRef.current) {
          clearTimeout(narrationTimeoutRef.current);
        }
        stop();
      };
    }
  }, [gameState]);

  const handleCorrect = (rect: DOMRect) => {
    if (starIconRef.current) {
      const targetRect = starIconRef.current.getBoundingClientRect();
      const id = Date.now();
      setStarAnimations(prev => [...prev, {
        id,
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
        endX: targetRect.left + targetRect.width / 2,
        endY: targetRect.top + targetRect.height / 2
      }]);
    }
  };

  const handleSolve = async () => {
    stop();
    const nextIdx = currentEncounterIdx + 1;
    
    // Determine target state first
    let targetState: 'solved' | 'complete' = 'solved';
    if (currentEncounterIdx !== 8 && nextIdx >= ENCOUNTERS.length) {
      targetState = 'complete';
    }

    // Defensive check and API updates in background
    if (user && user.id) {
      try {
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, verseId: currentEncounter.verse.id })
        }).catch(err => console.error("Failed to save progress:", err));

        fetch('/api/user/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, currentCanto: currentEncounterIdx, laurelLeaves: laurelLeaves, puzzleScore: puzzleScore })
        }).catch(err => console.error("Failed to update user:", err));
      } catch (err) {
        console.error("Error in handleSolve API calls:", err);
      }
    }

    // Update UI state immediately to avoid "freezing"
    if (currentEncounterIdx === 8) {
      setGameState('solved');
      setLimboTransition('dissolving');
      setTimeout(() => setLimboTransition('zooming'), 1500);
      setTimeout(() => setLimboTransition('complete'), 4500);
    } else {
      setGameState(targetState);
    }
  };

  const handleNextCanto = async () => {
    stop();
    const nextIdx = currentEncounterIdx + 1;
    if (nextIdx < ENCOUNTERS.length) {
      setCurrentEncounterIdx(nextIdx);
      setGameState('journey');
      setLimboTransition('none'); // Reset transition state
      
      if (user && user.id) {
        fetch('/api/user/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, currentCanto: nextIdx, laurelLeaves: laurelLeaves, puzzleScore: puzzleScore })
        }).catch(err => console.error("Failed to update user progress:", err));
      }
    }
  };

  const handleExpress = (id: string, shouldClose = true) => {
    setActiveExpression(id);
    if (shouldClose) setIsCommBoardOpen(false);
    speak(AAC_ICONS[id]?.label || "");
    setTimeout(() => setActiveExpression(null), 3000);
  };

  const triggerVeltro = () => {
    const randomVeltro = VELTRO_ENCOUNTERS[Math.floor(Math.random() * VELTRO_ENCOUNTERS.length)];
    setActiveVeltro(randomVeltro);
    setShowVeltroTrigger(false);
    setVeltroCanReplay(false);
    setTimeout(() => {
      setVeltroCanReplay(true);
      console.log("Veltro: veltroCanReplay set to true");
    }, 2000);
  };

  const closeVeltro = async () => {
    if (activeVeltro) {
      const newLeaves = laurelLeaves + activeVeltro.reward;
      setLaurelLeaves(newLeaves);
      if (user && user.id) {
        fetch('/api/user/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, currentCanto: currentEncounterIdx, laurelLeaves: newLeaves, puzzleScore: puzzleScore })
        }).catch(err => console.error("Failed to update user rewards:", err));
      }
    }
    setActiveVeltro(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className={`relative h-[100dvh] w-full overflow-hidden transition-colors duration-1000 ${gameState === 'landing' ? 'bg-black' : `bg-gradient-to-b ${(currentEncounterIdx === 4 && !forestDissipation) ? 'from-[#1e3a1e] via-[#0a1a0a] to-black' : (currentEncounter?.background || 'from-slate-900 to-black')}`}`}
    >
      <AnimatePresence>
        {gameState === 'landing' && (
          <Frontispiece onStart={() => setGameState('journey')} />
        )}
      </AnimatePresence>
      
      {gameState !== 'landing' && (
        <>
          {/* Divine Providence Light - Visible from Selva to Beatrice (Indices 0-4) */}
          {currentEncounterIdx <= 4 && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <motion.div 
                key="divine-providence-light"
                initial={{ 
                  top: "12%", 
                  scale: 0.4,
                  left: "50%",
                  x: "-50%"
                }}
                animate={{
                  top: currentEncounterIdx === 4 ? "30%" : "12%",
                  scale: currentEncounterIdx === 4 ? 1 : 0.4,
                  left: "50%",
                  x: "-50%",
                }}
                transition={{ 
                  duration: 3,
                  ease: [0.65, 0, 0.35, 1] // Pronounced ease-in-out for natural acceleration in the middle
                }}
                className="absolute flex items-center justify-center"
              >
                {/* Halo Effect (Soft Background Glow) - Intensity based on Dante's state */}
                <motion.div
                  animate={currentEncounterIdx === 4 ? {
                    scale: [1.2, 1.6, 1.3, 1.8, 1.2],
                    opacity: [0.1, 0.7, 0.15, 0.8, 0.1],
                  } : {
                    scale: [1.2, 1.4, 1.2],
                    opacity: [0.05, 0.15, 0.05], // Muted intensity for Selva
                  }}
                  transition={currentEncounterIdx === 4 ? {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [0, 0.15, 0.4, 0.7, 1] // Irregular intervals for "speaking" feel
                  } : {
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 -m-24 bg-white/20 rounded-full blur-[80px]"
                />

                {/* Interactive Glow (Middle Layer) - Intensity based on Dante's state */}
                <motion.div
                  animate={currentEncounterIdx === 4 ? {
                    scale: [1, 1.4, 1.1, 1.5, 1],
                    opacity: [0.3, 0.8, 0.4, 0.9, 0.3],
                  } : {
                    scale: [1, 1.2, 1],
                    opacity: [0.15, 0.3, 0.15], // Muted intensity for Selva
                  }}
                  transition={currentEncounterIdx === 4 ? {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [0, 0.25, 0.4, 0.7, 1] // Irregular intervals
                  } : {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 -m-8 bg-white/30 rounded-full blur-2xl"
                />

                {/* Granular Ethereal Essence - Consistent across journey */}
                <AnimatePresence>
                  <motion.div
                    key="ethereal-essence"
                    initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                    animate={{ 
                      opacity: [0.2, 0.45, 0.35, 0.5, 0.4], 
                      scale: [1, 1.1, 1.05, 1.15, 1],
                      rotate: [0, 90, 180, 270, 360]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      opacity: { duration: 3, ease: "easeInOut" },
                      scale: { duration: 25, repeat: Infinity, ease: "linear" },
                      rotate: { duration: 80, repeat: Infinity, ease: "linear" }
                    }}
                    className="absolute inset-0 -m-48 rounded-full pointer-events-none mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-20"
                  />
                </AnimatePresence>

                {/* Core Light (Flickering & Granular) - Consistent Divine Essence */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 0.8, 1.15, 1],
                    opacity: [0.8, 1, 0.65, 1, 0.8],
                    filter: ["blur(2px)", "blur(5px)", "blur(3px)", "blur(6px)", "blur(2px)"], // Soften borders dynamically
                    x: ["-0.5%", "0.5%", "-0.5%", "0.5%", "0%"], // Subtle Vibrato for "breathing/speaking"
                  }}
                  transition={{
                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    filter: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                    x: { duration: 0.05, repeat: Infinity, ease: "linear" }
                  }}
                  className="w-4 h-4 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,1)] relative z-10 overflow-hidden"
                >
                  {/* Internal Granularity - Persistent across journey */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                    className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-difference opacity-60"
                  />
                </motion.div>
              </motion.div>
            </div>
          )}

          {/* Atmospheric Layers for Selva Oscura (Indices 0-4: Selva, Lonza, Leone, Lupa, Virgil Intro) */}
          {currentEncounterIdx <= 4 && (
            <motion.div 
              initial={false}
              animate={{
                WebkitMaskImage: (currentEncounterIdx === 4 && forestDissipation)
                  ? 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 100%, black 150%, black 200%)'
                  : 'radial-gradient(circle at 50% 50%, transparent -50%, transparent -20%, black 0%, black 100%)',
                maskImage: (currentEncounterIdx === 4 && forestDissipation)
                  ? 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 100%, black 150%, black 200%)'
                  : 'radial-gradient(circle at 50% 50%, transparent -50%, transparent -20%, black 0%, black 100%)',
              }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
            >
              {/* Deep Forest Gradient (Matching Landing Page) */}
              <motion.div 
                style={{
                  background: 'radial-gradient(circle at 50% 30%, #1e3a1e 0%, #0a1a0a 40%, #000000 80%)'
                }}
                animate={{
                  opacity: [0.6, 0.8, 0.6],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0"
              />
              
              {/* Spiritual Light Rays (Greenish) */}
              <div className="absolute inset-0 opacity-30 mix-blend-screen">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute top-[-20%] h-[140%] w-64 bg-gradient-to-b from-yellow-400/20 via-yellow-900/5 to-transparent"
                    style={{
                      left: `${10 + i * 16}%`,
                      transform: 'rotate(-15deg)',
                      filter: 'blur(60px)',
                    }}
                    animate={{
                      opacity: [0.2, 0.4, 0.2],
                      x: [0, 40, 0],
                    }}
                    transition={{
                      duration: 12 + i * 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              {/* Dust Motes / Particles (Emerald) */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-200/30 rounded-full blur-[1px]"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -150],
                      x: [0, Math.random() * 60 - 30],
                      opacity: [0, 0.6, 0],
                    }}
                    transition={{
                      duration: 15 + Math.random() * 20,
                      repeat: Infinity,
                      ease: "linear",
                      delay: Math.random() * 10,
                    }}
                  />
                ))}
              </div>

              {/* Moving Fog/Mist Layer (Greenish) */}
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{
                  background: 'linear-gradient(to right, transparent, rgba(10, 40, 10, 0.5), transparent)',
                  filter: 'blur(80px)',
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 50,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>
          )}

          {/* Forest Silhouettes for Selva Oscura (Indices 0-4: Selva, Lonza, Leone, Lupa, Virgil Intro) */}
          {currentEncounterIdx <= 4 && (
            <motion.div 
              initial={false}
              animate={{
                WebkitMaskImage: (currentEncounterIdx === 4 && forestDissipation)
                  ? 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 100%, black 150%, black 200%)'
                  : 'radial-gradient(circle at 50% 50%, transparent -50%, transparent -20%, black 0%, black 100%)',
                maskImage: (currentEncounterIdx === 4 && forestDissipation)
                  ? 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 100%, black 150%, black 200%)'
                  : 'radial-gradient(circle at 50% 50%, transparent -50%, transparent -20%, black 0%, black 100%)',
              }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="absolute inset-0 pointer-events-none overflow-hidden z-20"
            >
              {/* Foreground Heavy Silhouettes */}
              <div className="absolute inset-0 flex justify-between">
                <div className="w-1/3 h-full bg-gradient-to-r from-black via-black/80 to-transparent opacity-90">
                  <svg viewBox="0 0 300 800" className="w-full h-full text-black fill-current">
                    <path d="M0,0 L100,0 Q150,200 80,400 T120,800 L0,800 Z" />
                    <path d="M50,100 Q150,150 180,120 M70,300 Q200,350 220,320 M40,500 Q180,550 200,520" stroke="currentColor" strokeWidth="40" fill="none" strokeLinecap="round" />
                    {/* Drooping branches */}
                    <path d="M180,120 Q190,200 170,250 M220,320 Q230,400 210,450 M200,520 Q210,600 190,650" stroke="currentColor" strokeWidth="20" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="w-1/3 h-full bg-gradient-to-l from-black via-black/80 to-transparent opacity-90">
                  <svg viewBox="0 0 300 800" className="w-full h-full text-black fill-current transform scale-x-[-1]">
                    <path d="M0,0 L120,0 Q180,250 100,450 T140,800 L0,800 Z" />
                    <path d="M60,150 Q180,200 210,170 M80,350 Q220,400 240,370 M50,550 Q200,600 220,570" stroke="currentColor" strokeWidth="45" fill="none" strokeLinecap="round" />
                    {/* Drooping branches */}
                    <path d="M210,170 Q220,250 200,300 M240,370 Q250,450 230,500 M220,570 Q230,650 210,700" stroke="currentColor" strokeWidth="25" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Midground Gnarled Branches (Drooping) */}
              <ParallaxLayer speed={0.05} className="opacity-60">
                <div className="h-full w-[4000px] flex items-start">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="relative w-[400px] h-full mx-8">
                      <svg viewBox="0 0 200 800" className="w-full h-full text-[#051a25] fill-current">
                        <path d="M100,0 Q120,150 80,300 T110,600 T90,800" stroke="currentColor" strokeWidth="15" fill="none" strokeLinecap="round" />
                        {/* Drooping side branches */}
                        <path d="M100,100 Q160,120 170,200 T150,350" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
                        <path d="M90,250 Q30,280 20,350 T40,500" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                        <path d="M105,450 Q160,470 175,550 T155,700" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>
                  ))}
                </div>
              </ParallaxLayer>

            </motion.div>
          )}

          {/* Parallax Backgrounds */}
          <div className="absolute inset-0 opacity-40">
            <ParticleCanvas isIntensified={false} isRadial={particlesRadial} />
            
            {/* Hill Silhouette (Behind the forest) */}
            <motion.div 
              animate={{ opacity: currentEncounterIdx <= 3 ? 0.9 : 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
            >
              <svg viewBox="0 0 1000 400" preserveAspectRatio="none" className="absolute bottom-0 w-full h-[75%] fill-current">
                <defs>
                  <linearGradient id="hill-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0a1a25" />
                    <stop offset="100%" stopColor="#020a0e" />
                  </linearGradient>
                </defs>
                <path 
                  d="M0,400 L0,80 Q150,-50 400,20 T800,120 T1000,220 L1000,400 Z" 
                  fill="url(#hill-gradient)"
                />
                {/* Subtle ridge detail */}
                <path 
                  d="M80,400 Q200,20 450,100 T850,400" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="0.5" 
                  strokeOpacity="0.1" 
                />
              </svg>
            </motion.div>

            <ParallaxLayer speed={0.2} className="mix-blend-overlay">
              <div className="h-full w-[2000px] flex items-end">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="w-64 h-96 bg-white/5 rounded-t-full blur-3xl mx-20" />
                ))}
              </div>
            </ParallaxLayer>
            <ParallaxLayer speed={0.5}>
              <div className="h-full w-[2000px] flex items-end">
                 {[...Array(15)].map((_, i) => (
                  <div key={i} className="w-32 h-64 bg-white/10 rounded-t-full blur-2xl mx-10" />
                ))}
              </div>
            </ParallaxLayer>
          </div>

          {/* Atmospheric Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/40 rounded-full"
                animate={{
                  y: [0, -100, 0],
                  x: [0, Math.random() * 50 - 25, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 5 + Math.random() * 5,
                  repeat: Infinity,
                  delay: Math.random() * 5
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Characters */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        {/* Gates of Hell (Idx 5) */}
        <AnimatePresence mode="wait">
          {currentEncounterIdx === 5 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
            >
              {/* Reuse Original Selva Oscura Background */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Deep Forest Gradient */}
                <motion.div 
                  style={{
                    background: 'radial-gradient(circle at 50% 30%, #2d5a2d 0%, #122a12 35%, #0a200a 70%, #000000 100%)'
                  }}
                  animate={{
                    opacity: [0.7, 0.9, 0.7],
                  }}
                  transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0"
                />
                
                {/* Spiritual Light Rays (Greenish) */}
                <div className="absolute inset-0 opacity-30 mix-blend-screen">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute top-[-20%] h-[140%] w-64 bg-gradient-to-b from-yellow-400/15 via-yellow-900/5 to-transparent"
                      style={{
                        left: `${10 + i * 16}%`,
                        transform: 'rotate(-15deg)',
                        filter: 'blur(60px)',
                      }}
                      animate={{
                        opacity: [0.15, 0.4, 0.15],
                        x: [0, 40, 0],
                      }}
                      transition={{
                        duration: 12 + i * 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>

                {/* Extreme Lateral Vegetation (Vignette Layer 1 - Deepest Background) */}
                <motion.div 
                  className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-100"
                  animate={{ x: [-2, 2, -2] }}
                  transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 flex justify-between">
                    {/* Left Dense Block - Massive at the edge, thinning inward */}
                    <div className="w-[50%] h-full bg-gradient-to-r from-black via-black/80 to-transparent">
                      <svg viewBox="0 0 500 800" className="w-full h-full text-black fill-current">
                        {/* Extreme edge filler blocks - packed tighter */}
                        <path d="M0,0 L120,0 Q140,400 90,800 L0,800 Z" opacity="1" />
                        <path d="M20,0 L90,0 Q180,400 70,800 L20,800 Z" opacity="0.95" />
                        <path d="M40,0 L110,0 Q210,400 100,800 L40,800 Z" opacity="0.9" />
                        
                        {/* Middle trunks - spread out more evenly */}
                        <path d="M160,0 L220,0 Q240,400 190,800 L160,800 Z" opacity="0.8" />
                        <path d="M240,0 L280,0 Q300,400 260,800 L240,800 Z" opacity="0.6" />
                        
                        {/* Organic details that reach inward */}
                        <path d="M100,100 Q280,150 240,130" stroke="currentColor" strokeWidth="18" fill="none" strokeLinecap="round" opacity="0.7" />
                        <path d="M180,350 Q350,400 310,380" stroke="currentColor" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.5" />
                      </svg>
                    </div>
                    {/* Right Dense Block - Massive at the edge, thinning inward */}
                    <div className="w-[50%] h-full bg-gradient-to-l from-black via-black/80 to-transparent">
                      <svg viewBox="0 0 500 800" className="w-full h-full text-black fill-current transform scale-x-[-1]">
                        {/* Extreme edge filler blocks - packed tighter */}
                        <path d="M0,0 L130,0 Q150,400 110,800 L0,800 Z" opacity="1" />
                        <path d="M30,0 L100,0 Q190,400 80,800 L30,800 Z" opacity="0.95" />
                        <path d="M50,0 L120,0 Q220,400 110,800 L50,800 Z" opacity="0.9" />
                        
                        {/* Middle trunks - spread out more evenly */}
                        <path d="M170,0 L230,0 Q250,400 200,800 L170,800 Z" opacity="0.8" />
                        <path d="M250,0 L290,0 Q310,400 270,800 L250,800 Z" opacity="0.6" />
                        
                        {/* Organic details that reach inward */}
                        <path d="M120,180 Q290,230 260,210" stroke="currentColor" strokeWidth="20" fill="none" strokeLinecap="round" opacity="0.7" />
                        <path d="M200,500 Q370,550 330,530" stroke="currentColor" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.5" />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                {/* Middle Framing (Vignette Layer 2 - Intermediate Depth) */}
                <motion.div 
                  className="absolute inset-0 pointer-events-none overflow-hidden z-25 opacity-70"
                  animate={{ x: [-5, 5, -5], scale: [1, 1.02, 1] }}
                  transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 flex justify-between">
                    {/* Left Framing - Spread further out */}
                    <div className="w-1/4 h-full ml-[2%]">
                      <svg viewBox="0 0 200 800" className="w-full h-full text-black fill-current">
                        <path d="M0,800 Q60,600 30,400 T70,0 L0,0 Z" opacity="0.9" />
                        <path d="M20,800 Q100,600 50,400 T90,0 L20,0 Z" opacity="0.6" />
                        {/* Thorny vines - more delicate */}
                        <path d="M30,200 Q120,250 100,230" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" />
                        <path d="M50,500 Q140,550 120,530" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>
                    {/* Right Framing - Spread further out */}
                    <div className="w-1/4 h-full mr-[2%]">
                      <svg viewBox="0 0 200 800" className="w-full h-full text-black fill-current transform scale-x-[-1]">
                        <path d="M0,800 Q70,600 35,400 T80,0 L0,0 Z" opacity="0.9" />
                        <path d="M25,800 Q110,600 55,400 T100,0 L25,0 Z" opacity="0.6" />
                        {/* Thorny vines - more delicate */}
                        <path d="M40,250 Q130,300 110,280" stroke="currentColor" strokeWidth="12" fill="none" strokeLinecap="round" />
                        <path d="M60,550 Q150,600 130,580" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                {/* Front Ivy and Spettral Climbers (Vignette Layer 3 - Foremost Detail) */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-30 opacity-60">
                  <div className="absolute inset-0 flex justify-between px-2">
                    {/* Left Hanging Detail - Right at the edge */}
                    <motion.div 
                      className="w-[20%] h-full"
                      animate={{ x: [-5, 5, -5], rotate: [-1, 1, -1] }}
                      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <svg viewBox="0 0 200 800" className="w-full h-full text-black fill-current">
                        <path d="M10,0 Q30,200 15,400 T35,800" stroke="currentColor" strokeWidth="5" fill="none" opacity="0.8" />
                        <circle cx="20" cy="180" r="8" />
                        <circle cx="35" cy="450" r="10" />
                        <circle cx="25" cy="720" r="12" />
                      </svg>
                    </motion.div>
                    {/* Right Hanging Detail - Right at the edge */}
                    <motion.div 
                      className="w-[20%] h-full"
                      animate={{ x: [5, -5, 5], rotate: [1, -1, 1] }}
                      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <svg viewBox="0 0 200 800" className="w-full h-full text-black fill-current transform scale-x-[-1]">
                        <path d="M15,0 Q40,250 20,450 T45,800" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.8" />
                        <circle cx="25" cy="220" r="11" />
                        <circle cx="45" cy="500" r="9" />
                        <circle cx="35" cy="780" r="13" />
                      </svg>
                    </motion.div>
                  </div>
                </div>

                {/* Spectral Brambles and Thorns (Added Detail Layer) */}
                <motion.div 
                  className="absolute inset-0 pointer-events-none overflow-hidden z-28 opacity-50"
                  animate={{ x: [-8, 8, -8], y: [-2, 2, -2] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 flex justify-between">
                    {/* Left Brambles Cluster - wider spread */}
                    <div className="w-[45%] h-full">
                      <svg viewBox="0 0 450 800" className="w-full h-full text-black fill-current">
                        {/* Tangled thorny mess reaching from the edge */}
                        <path d="M0,100 Q200,150 150,250 T250,400 T120,600 T300,800" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.8" />
                        <path d="M0,300 Q250,350 180,500 T350,700" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
                      </svg>
                    </div>
                    {/* Right Brambles Cluster - wider spread */}
                    <div className="w-[45%] h-full">
                      <svg viewBox="0 0 450 800" className="w-full h-full text-black fill-current transform scale-x-[-1]">
                        <path d="M0,150 Q250,200 180,350 T300,550 T150,750" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.8" />
                        <path d="M0,400 Q220,450 180,600 T320,800" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                {/* Additional Infernal Thorns and Tangled Brambles (Foreground Spikes) */}
                <motion.div 
                  className="absolute inset-0 pointer-events-none overflow-hidden z-29 opacity-40"
                  animate={{ x: [-12, 12, -12], scale: [1, 1.05, 1] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 flex justify-between">
                    {/* Left Lower Brambles */}
                    <div className="w-[40%] h-full mt-[10%]">
                      <svg viewBox="0 0 400 800" className="w-full h-full text-black fill-current">
                        {/* Sharp, jagged vines */}
                        <path d="M0,800 L50,700 L20,600 L100,500 L80,400 L150,300" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path d="M0,750 L80,650 L40,550 L120,450" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                    {/* Right Lower Brambles */}
                    <div className="w-[40%] h-full mt-[10%]">
                      <svg viewBox="0 0 400 800" className="w-full h-full text-black fill-current transform scale-x-[-1]">
                        <path d="M0,800 L60,680 L30,580 L110,480 L90,380 L160,280" stroke="currentColor" strokeWidth="2.5" fill="none" />
                        <path d="M0,700 L100,550 L60,450 L140,350" stroke="currentColor" strokeWidth="1.8" fill="none" />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                {/* Thin Spectral Creepers - Reaching towards center (Added Detail Layer) */}
                <motion.div 
                  className="absolute inset-0 pointer-events-none overflow-hidden z-35 opacity-30"
                  animate={{ x: [-15, 15, -15], rotate: [-1, 1, -1] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 flex justify-between">
                    {/* Left Spectral Creepers */}
                    <div className="w-[60%] h-full">
                      <svg viewBox="0 0 600 800" className="w-full h-full text-black fill-current">
                        {/* Fine, delicate swirling ivy-like rovi - made more visible despite lower opacity */}
                        <path d="M0,50 Q150,80 120,200 T280,350 T200,550 T450,750" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.9" />
                        <path d="M0,250 Q120,280 100,420 T380,600 T250,800" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.8" />
                        {/* Individual leaves/spectral nodes - larger and more opaque */}
                        <circle cx="280" cy="350" r="4" opacity="0.9" />
                        <circle cx="420" cy="720" r="5" opacity="0.9" />
                      </svg>
                    </div>
                    {/* Right Spectral Creepers */}
                    <div className="w-[60%] h-full">
                      <svg viewBox="0 0 600 800" className="w-full h-full text-black fill-current transform scale-x-[-1]">
                        <path d="M0,100 Q200,150 160,300 T320,450 T230,650 T480,800" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.9" />
                        <path d="M0,350 Q140,380 120,550 T420,750" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.8" />
                        {/* Individual leaves/spectral nodes - larger and more opaque */}
                        <circle cx="320" cy="450" r="4" opacity="0.9" />
                        <circle cx="420" cy="750" r="5" opacity="0.9" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Infernal Glow from behind the gate - Vibrant red/pink */}
              <motion.div 
                animate={{ 
                  opacity: [0.3, 0.5, 0.3],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-900/30 rounded-full blur-[150px] z-0"
              />

              {/* The Stone Archway */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pt-12 sm:pt-16 md:pt-20">
                <motion.div 
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 0.95, opacity: 1 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="relative w-[280px] h-[400px] sm:w-[400px] sm:h-[500px] md:w-[540px] md:h-[680px]"
                >
                  {/* The Arch Shadow/Core */}
                  <div className="absolute inset-x-0 top-0 bottom-0 bg-black/60 rounded-t-full blur-md" />
                  
                  {/* The Stone Structure (SVG) */}
                  <svg viewBox="0 0 400 600" className="absolute inset-0 w-full h-full drop-shadow-[0_0_50px_rgba(0,0,0,0.9)]">
                    <defs>
                      <linearGradient id="stone-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1a1a1a" />
                        <stop offset="100%" stopColor="#0a0a0a" />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M40,600 L40,220 Q40,40 200,40 Q360,40 360,220 L360,600 L310,600 L310,220 Q310,90 200,90 Q90,90 90,220 L90,600 Z" 
                      fill="url(#stone-gradient)"
                      stroke="#2a2a2a"
                      strokeWidth="3"
                    />
                    <path d="M200,90 L200,150 M140,120 Q200,100 260,120" stroke="white" strokeOpacity="0.05" strokeWidth="2" fill="none" />
                    <path d="M60,180 L80,200 M340,210 L320,230 M180,60 L200,80" stroke="white" strokeOpacity="0.1" strokeWidth="1" fill="none" />
                  </svg>

                  {/* The Inscription */}
                  <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[45%] text-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ 
                        opacity: [0, 0.6, 0.6, 0]
                      }}
                      transition={{ 
                        duration: 10,
                        times: [0, 0.2, 0.8, 1],
                        delay: 1.5,
                        repeat: Infinity,
                        repeatDelay: 5
                      }}
                    >
                      <p className="text-[4px] sm:text-[6.5px] md:text-[9px] font-cinzel font-bold text-rose-500 shadow-rose-950/50 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] tracking-[0.2em] leading-tight uppercase">
                        Lasciate ogni speranza,
                      </p>
                      <p className="text-[4px] sm:text-[6.5px] md:text-[9px] font-cinzel font-bold text-rose-500 shadow-rose-950/50 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] tracking-[0.2em] leading-tight uppercase mt-1 sm:mt-1.5">
                        voi ch'intrate
                      </p>
                    </motion.div>
                  </div>

                  {/* Mist flowing through the gate */}
                  <div className="absolute inset-0 overflow-hidden rounded-t-full pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={`mist-${i}`}
                        animate={{ 
                          x: [-150, 150],
                          opacity: [0, 0.2, 0],
                          scale: [1, 1.8, 1]
                        }}
                        transition={{ 
                          duration: 10 + i * 3, 
                          repeat: Infinity, 
                          delay: i * 2,
                          ease: "linear"
                        }}
                        className="absolute w-full h-40 bg-rose-200/5 blur-[50px]"
                        style={{ top: `${15 + i * 12}%` }}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Foreground Fog and Ground */}
              <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black via-black/80 to-transparent z-30" />
              
              {/* Floating Embers (Red Particles) */}
              <div className="absolute inset-0 pointer-events-none z-40">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={`ember-${i}`}
                    animate={{ 
                      y: [0, -300],
                      x: [0, Math.sin(i) * 80],
                      opacity: [0, 0.8, 0],
                      scale: [0, 1.5, 0]
                    }}
                    transition={{ 
                      duration: 4 + Math.random() * 6, 
                      repeat: Infinity, 
                      delay: Math.random() * 5 
                    }}
                    className="absolute w-1 h-1 bg-rose-500 rounded-full blur-[1px] shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                    style={{ left: `${Math.random() * 100}%`, bottom: `${Math.random() * 20}%` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ignavi (Idx 6) - Moved here to occupy full screen width without clipping */}
        <AnimatePresence>
          {currentEncounterIdx === 6 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-10"
            >
              {/* The White Banner (L'Insegna) - Leading the procession */}
              <motion.div 
                animate={gameState !== 'solved' ? { 
                  x: [800, -1200],
                  y: [-60, 60, -30, 40, -60],
                  rotate: [0, 360, 720, 1080],
                  scaleY: [1, 1.2, 0.8, 1.1, 1],
                  opacity: [0, 0.8, 0.8, 0]
                } : {
                  x: -2500,
                  opacity: 0
                }}
                transition={gameState !== 'solved' ? { 
                  duration: 12, 
                  repeat: Infinity, 
                  ease: "linear" 
                } : {
                  duration: 3,
                  ease: "easeIn"
                }}
                className="absolute left-1/2 top-1/2 w-0.5 h-24 sm:h-32 md:h-40 bg-white/80 blur-[1px] shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20"
              />

              {/* The Souls (Ignavi) - A procession of many souls with organic, chaotic movement */}
              {[...Array(15)].map((_, i) => {
                // Deterministic "random" values based on index to ensure consistency across renders
                const randomOffset = Math.sin(i * 123.45) * 300;
                const randomSpeed = 8 + (Math.abs(Math.cos(i * 67.89)) * 6);
                const randomDelay = Math.abs(Math.sin(i * 45.67)) * 10;
                const yVariation = 120 + (Math.abs(Math.sin(i * 89.12)) * 80);

                return (
                  <motion.div
                    key={`ignavo-${i}`}
                    initial={{ opacity: 0, x: 800 + randomOffset }}
                    animate={gameState !== 'solved' ? { 
                      x: [800 + randomOffset, -1500],
                      y: [
                        -yVariation / 2 + (Math.sin(i) * 40), 
                        yVariation / 2 + (Math.cos(i) * 40), 
                        -yVariation / 4 + (Math.sin(i * 2) * 30)
                      ],
                      borderRadius: ["40% 60% 70% 30%", "60% 40% 30% 70%", "40% 60% 70% 30%"],
                      scale: [0.8, 1.1, 0.85, 1.05, 0.9],
                      rotate: [i % 2 === 0 ? -5 : 5, i % 2 === 0 ? 5 : -5, i % 2 === 0 ? -3 : 3],
                      opacity: [0, 0.3, 0.3, 0]
                    } : {
                      x: -3000,
                      opacity: 0,
                      scale: 0.5
                    }}
                    transition={gameState !== 'solved' ? { 
                      duration: randomSpeed, 
                      repeat: Infinity, 
                      ease: "linear",
                      delay: randomDelay
                    } : {
                      duration: 4,
                      ease: "easeIn"
                    }}
                    className="absolute left-1/2 top-1/2 w-8 h-16 sm:w-10 sm:h-20 md:w-12 md:h-24 z-10"
                  >
                    {/* The Soul's Body - Blurred background */}
                    <div className="absolute inset-0 bg-slate-400/30 blur-[4px] border border-slate-300/10 rounded-[inherit]" />

                    {/* Tormenting Wasps (Punti di dolore) - Mix of flies and big flies */}
                    {[0, 1, 2, 3].map((j) => {
                      const isBig = j % 2 === 0;
                      const size = isBig ? "w-[2.5px] h-[2.5px]" : "w-[1.5px] h-[1.5px]";
                      return (
                        <motion.div
                          key={`wasp-${i}-${j}`}
                          animate={{ 
                            x: [0, (Math.sin(j * 10) * 25), (Math.cos(j * 10) * 25), 0],
                            y: [0, (Math.cos(j * 10) * 30), (Math.sin(j * 10) * 30), 0],
                            opacity: [0, 1, 1, 0],
                            scale: isBig ? [1, 1.2, 1] : [1, 1.4, 1]
                          }}
                          transition={{ 
                            duration: isBig ? 0.7 + (Math.random() * 0.5) : 0.4 + (Math.random() * 0.3), 
                            repeat: Infinity, 
                            delay: Math.random() * 2,
                            ease: "linear"
                          }}
                          className={`absolute top-1/2 left-1/2 bg-black rounded-full z-20 ${size}`}
                        />
                      );
                    })}
                  </motion.div>
                );
              })}

              {/* Degrading Ground (Sangue e Vermi) */}
              <motion.div 
                animate={gameState !== 'solved' ? { 
                  opacity: [0.3, 0.5, 0.3],
                  x: [0, -100, 0]
                } : {
                  x: -1000,
                  opacity: 0
                }}
                transition={{ duration: 4, repeat: gameState !== 'solved' ? Infinity : 0 }}
                className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-red-950/40 to-transparent blur-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Limbo (Idx 8) - The Noble Castle and the Great Poets */}
        {/* Positioned here to allow full-screen environmental effects */}
        <AnimatePresence>
          {currentEncounterIdx === 8 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-0"
            >
              {/* Fulmine Vermiglio - Initial flash when entering Limbo */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0, 0.4, 0] }}
                transition={{ duration: 1, times: [0, 0.1, 0.2, 0.3, 1] }}
                className="absolute inset-0 bg-red-600/20 z-50"
              />

              {/* Aura Eterna & Sospiri - Trembling air and visual sighs */}
              <motion.div 
                animate={{ 
                  opacity: limboTransition !== 'none' ? 0 : [0.05, 0.15, 0.05],
                  scale: limboTransition !== 'none' ? 0 : [1, 1.05, 1]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-indigo-500/5 blur-3xl"
              />
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`sigh-${i}`}
                  animate={limboTransition !== 'none' ? { opacity: 0 } : { 
                    scale: [1, 2],
                    opacity: [0, 0.1, 0],
                    x: [0, (i - 1) * 50],
                    y: [0, -100]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    delay: i * 1.5,
                    ease: "easeOut" 
                  }}
                  className="absolute left-1/2 top-1/2 w-64 h-64 border border-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"
                />
              ))}

              {/* The Fire that conquers darkness - Moved slightly to the RIGHT for balance */}
              <motion.div 
                animate={limboTransition !== 'none' ? { 
                  opacity: 0,
                  scale: 0,
                  filter: "blur(20px)"
                } : { opacity: 1 }}
                transition={{ duration: 1.5 }}
                className="absolute left-[25%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center"
              >
                {/* Outer Glow - The reach of knowledge */}
                <motion.div 
                  animate={{ 
                    opacity: [0.2, 0.4, 0.2],
                    scale: [1, 1.25, 1]
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-orange-600/30 blur-[80px] sm:blur-[100px] rounded-full"
                />
                {/* Inner Warmth - The comfort of honor */}
                <motion.div 
                  animate={{ 
                    opacity: [0.4, 0.7, 0.4],
                    scale: [1, 1.15, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-32 h-32 sm:w-48 sm:h-48 bg-yellow-400/40 blur-[40px] sm:blur-[60px] rounded-full"
                />
                {/* The Core of Knowledge - Constant and bright */}
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-4 h-4 sm:w-6 sm:h-6 bg-white blur-[2px] rounded-full shadow-[0_0_40px_rgba(255,255,255,0.8)]"
                />
              </motion.div>

              {/* The Noble Castle (Nobile Castello) - Moved to the CENTER */}
              <motion.div 
                animate={limboTransition === 'zooming' ? {
                  scale: 15,
                  y: 200, // Zoom into the ground floor door
                  opacity: [1, 1, 0]
                } : { scale: 1, y: 0 }}
                transition={{ duration: 3, ease: "easeIn" }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              >
                {/* Fiumicello - Small river around the castle */}
                <motion.div 
                  animate={{ 
                    rotate: 360,
                    borderWidth: [1, 2, 1],
                    opacity: limboTransition !== 'none' ? 0 : 1
                  }}
                  transition={{ 
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                    borderWidth: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute w-60 h-60 sm:w-80 sm:h-80 md:w-[500px] md:h-[500px] border-dashed border-blue-400/20 rounded-full"
                />

                {/* 7 Concentric Walls */}
                {[...Array(7)].map((_, i) => (
                  <motion.div 
                    key={`wall-${i}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: limboTransition !== 'none' ? 0 : 0.15 - (i * 0.02), 
                      scale: 1 + (i * 0.15) 
                    }}
                    className="absolute w-48 h-48 sm:w-72 sm:h-72 md:w-[400px] md:h-[400px] border border-white/20 rounded-full"
                  />
                ))}

                {/* Fresca Vegetazione - Greenery inside the castle */}
                <motion.div 
                  animate={{ opacity: limboTransition !== 'none' ? 0 : [0.1, 0.2, 0.1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute w-36 h-36 sm:w-56 sm:h-56 bg-emerald-500/10 blur-2xl rounded-full"
                />

                {/* The Castle Core - Stylized Tiered Structure inspired by the illustration */}
                <div className="relative z-20 flex flex-col items-center">
                  <motion.span 
                    animate={{ opacity: limboTransition !== 'none' ? 0 : 0.4 }}
                    className="mb-20 text-[8px] sm:text-[10px] italic tracking-[0.4em] text-white/40 font-light"
                  >
                    Nobile Castello
                  </motion.span>
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="flex flex-col items-center"
                  >
                    <div className="flex flex-col items-center">
                      {[...Array(7)].map((_, i) => {
                        const level = i; // 0 is top (narrow), 6 is bottom (wide)
                        const width = 50 + (level * 20); 
                        const height = 14 + (level * 2.5);
                        const opacity = 0.15 - (i * 0.015);
                        
                        return (
                          <div 
                            key={`castle-tier-${i}`}
                            style={{ 
                              width: `${width}px`, 
                              height: `${height}px`,
                              backgroundColor: `rgba(255, 255, 255, ${opacity})`,
                            }}
                            className="backdrop-blur-md border-x border-t border-white/10 relative flex justify-center"
                          >
                            {/* Crenelations (Merli) */}
                            <div className="absolute -top-1 left-0 w-full h-1 flex justify-between px-0.5">
                              {[...Array(Math.floor(width / 12))].map((_, m) => (
                                <div key={`merlo-${m}`} className="w-2 h-1 bg-white/10" />
                              ))}
                            </div>
                            
                            {/* Arched Windows/Doors */}
                            <div 
                              className="absolute bottom-0 w-4 h-6 sm:w-5 sm:h-8 bg-black/20 rounded-t-full border-t border-x border-white/5"
                              style={{ 
                                opacity: 0.1 + (i * 0.1),
                                backgroundColor: i === 6 ? '#4a5568' : undefined // Ground floor door is gray
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* The Great Poets (Spiriti Magni) - Clustered with the fire, moved slightly to the RIGHT */}
              <div className="absolute left-[25%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none">
                {['Omero', 'Orazio', 'Ovidio', 'Lucano'].map((poet, i) => {
                  // Position them in a semi-circle on the LEFT side of the fire
                  // Wider angles and larger radius to prevent overlap
                  const angle = (i * (Math.PI / 4)) + (Math.PI * 0.75); 
                  const radius = 150;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <motion.div 
                      key={poet}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={limboTransition !== 'none' ? { 
                        opacity: 0,
                        scale: 0,
                        filter: "blur(20px)"
                      } : { 
                        opacity: 0.6, 
                        x: x,
                        y: y,
                        scale: 1,
                      }}
                      transition={{ 
                        opacity: { delay: limboTransition === 'none' ? 1.2 + (i * 0.4) : 0, duration: 1.5 },
                        x: { delay: limboTransition === 'none' ? 1.2 + (i * 0.4) : 0, duration: 2, ease: "easeOut" },
                        y: { delay: limboTransition === 'none' ? 1.2 + (i * 0.4) : 0, duration: 2, ease: "easeOut" }
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5"
                    >
                      <div className="w-3.5 h-12 sm:w-4.5 sm:h-16 md:w-5.5 md:h-20 bg-slate-200/20 backdrop-blur-sm rounded-full border border-white/10 relative">
                        {/* Breathing/Sighing Glow for Poets - Matching Virgil's 'smorto' style but more evident */}
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            opacity: [0.4, 0.8, 0.4],
                            boxShadow: [
                              "0 0 15px rgba(148, 163, 184, 0.2)",
                              "0 0 40px rgba(148, 163, 184, 0.5)",
                              "0 0 15px rgba(148, 163, 184, 0.2)"
                            ]
                          }}
                          transition={{ 
                            duration: 3.5 + (i * 0.3), // Slight offset for natural feel
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 rounded-full pointer-events-none"
                        />
                        {/* Omero's Sword */}
                        {poet === 'Omero' && (
                          <motion.div 
                            animate={{ rotate: [-5, 5, -5] }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="absolute -left-2.5 top-1/2 w-0.5 h-10 sm:h-14 bg-white/30 blur-[0.5px]"
                          />
                        )}
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white/20 rounded-full" />
                      </div>
                      <span className="text-[6px] sm:text-[8px] uppercase tracking-[0.2em] text-white/40 font-bold drop-shadow-sm">{poet}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Transition Overlay - Fades to gray */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={limboTransition === 'zooming' ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 2, delay: 1 }}
                className="absolute inset-0 bg-[#4a5568] z-[100]"
              />
            </motion.div>
          )}
        </AnimatePresence>


        {/* Paolo e Francesca (Idx 9) - The Bufera Infernale and the Tragic Lovers */}
        <AnimatePresence>
          {currentEncounterIdx === 9 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
            >
              {/* Initial Gray Screen Transition - Fades out to reveal the scene */}
              <motion.div 
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 2, delay: 1 }}
                className="absolute inset-0 bg-[#4a5568] z-[100]"
              />

              {/* Bufera Infernale - Swirling Vortex of Souls */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 3, delay: 3 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {[...Array(20)].map((_, i) => {
                  const radius = 200 + (i * 40);
                  const duration = 4 + (Math.random() * 6);
                  return (
                    <motion.div
                      key={`vortex-${i}`}
                      animate={{ rotate: 360 }}
                      transition={{ duration, repeat: Infinity, ease: "linear" }}
                      className="absolute rounded-full border border-white/5"
                      style={{ width: radius * 2, height: radius * 2 }}
                    >
                      {/* Stylized Souls in the storm */}
                      {[...Array(3)].map((_, j) => (
                        <motion.div
                          key={`soul-${i}-${j}`}
                          animate={{ 
                            opacity: [0.1, 0.3, 0.1],
                            scale: [0.8, 1.2, 0.8]
                          }}
                          transition={{ duration: 2 + Math.random() * 2, repeat: Infinity }}
                          className="absolute w-2 h-6 sm:w-3 sm:h-10 bg-white/10 blur-[1px] rounded-full"
                          style={{ 
                            top: '50%', 
                            left: '100%', 
                            transform: `translate(-50%, -50%) rotate(${j * 120}deg) translateX(${radius}px)` 
                          }}
                        />
                      ))}
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Minosse - The Infernal Judge */}
              <motion.div 
                initial={{ opacity: 0, y: 150 }}
                animate={{ opacity: 1, y: 40 }} // Positioned lower, peeking from the bottom
                transition={{ duration: 1.5, delay: 1.5 }}
                className="absolute left-[8%] bottom-0 flex flex-col items-center z-20"
              >
                <div className="relative">
                  {/* Organic Undulating Tail (Coda) - Attached to the body base, behind the figure */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-0">
                    {[...Array(40)].map((_, i) => (
                      <motion.div
                        key={`tail-segment-${i}`}
                        animate={{
                          x: [
                            Math.sin(i * 0.25) * (15 + i * 2) + Math.sin(i * 0.1) * 20, 
                            Math.sin(i * 0.25 + Math.PI) * (15 + i * 2) + Math.sin(i * 0.1 + Math.PI) * 20, 
                            Math.sin(i * 0.25) * (15 + i * 2) + Math.sin(i * 0.1) * 20
                          ],
                          y: -i * 9,
                          rotate: [
                            Math.sin(i * 0.2) * 45 + Math.cos(i * 0.05) * 15,
                            Math.sin(i * 0.2 + Math.PI) * 45 + Math.cos(i * 0.05 + Math.PI) * 15,
                            Math.sin(i * 0.2) * 45 + Math.cos(i * 0.05) * 15
                          ],
                          opacity: [0.4, 0.8, 0.4],
                          scale: [1 - (i * 0.015), 1.1 - (i * 0.015), 1 - (i * 0.015)]
                        }}
                        transition={{ 
                          duration: 5, 
                          repeat: Infinity, 
                          ease: "easeInOut",
                          delay: i * 0.05 
                        }}
                        className="absolute w-4 h-4 sm:w-5 sm:h-5 bg-red-500/70 rounded-full blur-[0.5px] border border-red-400/40 shadow-[0_0_20px_rgba(239,68,68,0.7)]"
                        style={{
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}
                      />
                    ))}
                    {/* Glowing base aura */}
                    <motion.div 
                      animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 6, repeat: Infinity }}
                      className="absolute -inset-14 bg-red-900/40 blur-3xl rounded-full"
                    />
                  </div>

                  {/* Minos' Body - Restored to previous appearance */}
                  <div className="w-16 h-24 sm:w-24 sm:h-36 bg-red-950/40 backdrop-blur-xl border border-red-900/30 rounded-t-3xl relative overflow-hidden z-10">
                    <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent" />
                    {/* Glowing Eyes */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-4">
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
                      />
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                        className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
                      />
                    </div>
                  </div>
                </div>
                <span className="mt-4 text-[8px] sm:text-[10px] uppercase tracking-[0.5em] text-red-900 font-black drop-shadow-md">Minosse</span>
              </motion.div>

              {/* Paolo e Francesca - Flying Together */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: 1,
                  scale: 1,
                  x: [0, 100, 0, -100, 0],
                  y: [0, -50, -100, -50, 0],
                }}
                transition={{ 
                  opacity: { duration: 2, delay: 4.5 },
                  scale: { duration: 2, delay: 4.5 },
                  x: { duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4.5 },
                  y: { duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4.5 }
                }}
                className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4"
              >
                {/* Two coupled souls - Only this part rotates */}
                <motion.div 
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                  className="relative flex items-center justify-center"
                >
                  {/* Pulsing Halo - Simulating the wind/bufera */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.3, 1.1, 1.4, 1],
                      opacity: [0.1, 0.25, 0.15, 0.3, 0.1],
                      rotate: [0, 360]
                    }}
                    transition={{ 
                      duration: 10, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    className="absolute -inset-12 sm:-inset-20 bg-rose-500/10 blur-[40px] sm:blur-[60px] rounded-full pointer-events-none"
                  />

                  <motion.div 
                    animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.8, 0.6] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-4 h-14 sm:w-6 sm:h-20 bg-rose-200/20 backdrop-blur-md rounded-full border border-rose-200/30 shadow-[0_0_20px_rgba(251,113,133,0.3)] relative z-10"
                  >
                    {/* Internal Circle - Soul 1 */}
                    <motion.div 
                      animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-rose-300/50"
                    />
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.8, 0.6] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                    className="absolute -right-2 top-2 w-4 h-14 sm:w-6 sm:h-20 bg-rose-200/20 backdrop-blur-md rounded-full border border-rose-200/30 shadow-[0_0_20px_rgba(251,113,133,0.3)] z-10"
                  >
                    {/* Internal Circle - Soul 2 */}
                    <motion.div 
                      animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-rose-300/50"
                    />
                  </motion.div>
                </motion.div>
                <span className="text-[7px] sm:text-[8px] md:text-[10px] uppercase tracking-widest font-bold text-rose-300/60">PAOLO E FRANCESCA</span>
              </motion.div>

              {/* Atmospheric Effects - Darker, more turbulent */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 4, delay: 3 }}
                className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-rose-950/10" 
              />
              <motion.div 
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"
              />
            </motion.div>
          )}
        </AnimatePresence>



        <div className="relative w-full max-w-4xl h-full flex items-center justify-center z-10">
          
          {/* Veltro Trigger */}
          <AnimatePresence>
            {gameState !== 'landing' && showVeltroTrigger && (
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                onClick={triggerVeltro}
                className="absolute top-1/4 left-1/4 z-40 p-4 bg-yellow-500/20 rounded-full border border-yellow-500/40 backdrop-blur-sm pointer-events-auto group"
              >
                <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse group-hover:scale-125 transition-transform" />
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  <span className="text-[8px] uppercase tracking-widest text-yellow-500 font-bold">Presenza Misteriosa</span>
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Characters */}
          <AnimatePresence>
            {gameState !== 'landing' && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ 
                  opacity: 1,
                  y: [0, -10, 0],
                  x: (currentEncounterIdx === 1 && gameState !== 'solved') 
                    ? "var(--encounter-shift)" 
                    : (gameState === 'journey' ? [0, 5, 0] : 0)
                }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ 
                  opacity: { duration: 0.5 },
                  y: { duration: 4, repeat: Infinity, ease: "linear" },
                  x: (currentEncounterIdx === 1 && gameState !== 'solved')
                    ? { duration: 0.5, ease: "easeInOut" }
                    : { duration: 4, repeat: Infinity, ease: "linear" }
                }}
                className={`flex items-end transition-all duration-700 ${gameState === 'journey' ? 'cursor-pointer pointer-events-auto hover:scale-110' : 'pointer-events-none opacity-40 scale-75 translate-y-20'}`}
                onClick={() => {
                  if (gameState === 'journey') {
                    stop();
                    setGameState('encounter');
                  }
                }}
              >
                {/* Dante */}
                <motion.div 
                  animate={{ 
                    x: (showVirgil && currentEncounterIdx >= 2) ? -60 : 0,
                    opacity: (currentEncounterIdx === 9 && gameState === 'journey') ? [0, 1] : 1
                  }}
                  transition={{ 
                    duration: 1.5, 
                    ease: "easeInOut",
                    opacity: { delay: (currentEncounterIdx === 9 && gameState === 'journey') ? 2.5 : 0, duration: 1.5 }
                  }}
                  className="flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 relative group z-10"
                >
                  <motion.div
                    animate={{ 
                      scale: (currentEncounterIdx === 3 || (currentEncounterIdx === 4 && !showSpiritualGlow)) ? 0.85 : 1,
                      opacity: (currentEncounterIdx === 3 || (currentEncounterIdx === 4 && !showSpiritualGlow)) ? 0.5 : 1,
                      y: (currentEncounterIdx === 3 || (currentEncounterIdx === 4 && !showSpiritualGlow)) ? 15 : 0,
                      filter: (currentEncounterIdx === 3 || (currentEncounterIdx === 4 && !showSpiritualGlow)) ? "blur(3px)" : "blur(0px)"
                    }}
                    transition={{ 
                      duration: 1.5, 
                      ease: "easeInOut"
                    }}
                    className="flex flex-col items-center relative"
                  >
                    <AnimatePresence>
                      {showSpiritualGlow && (
                        <>
                          {/* Landing Page Style Glow - Halo */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 0.4, scale: 1.5 }}
                            exit={{ opacity: 0, scale: 2 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 -m-10 sm:-m-16 md:-m-24 bg-white/20 rounded-full blur-[30px] sm:blur-[40px] md:blur-[60px] pointer-events-none z-0"
                          />
                          {/* Landing Page Style Glow - Core */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 0.8, scale: 1.2 }}
                            exit={{ opacity: 0, scale: 2 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 -m-4 sm:-m-6 md:-m-8 bg-white/40 rounded-full blur-lg sm:blur-xl md:blur-2xl z-0"
                          />
                        </>
                      )}
                      {activeExpression && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.5 }}
                          animate={{ opacity: 1, y: -30, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="absolute -top-8 sm:-top-10 md:-top-12 bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-1 sm:p-1.5 md:p-2 shadow-xl flex items-center gap-1 sm:gap-1.5 md:gap-2 border-2 border-red-500/20 z-30"
                        >
                          <span className="text-lg sm:text-xl md:text-2xl">{AAC_ICONS[activeExpression]?.icon}</span>
                          <span className="text-[7px] sm:text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-black">{AAC_ICONS[activeExpression]?.label}</span>
                          <div className="absolute -bottom-1.5 sm:-bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-white rotate-45 border-r-2 border-b-2 border-red-500/20" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.div 
                      animate={{
                        backgroundColor: currentEncounterIdx === 3 ? "rgba(71, 85, 105, 0.3)" : "rgba(127, 29, 29, 0.4)",
                        borderColor: currentEncounterIdx === 3 ? "rgba(148, 163, 184, 0.1)" : "rgba(239, 68, 68, 0.2)",
                        boxShadow: currentEncounterIdx === 3 ? "0 0 40px rgba(0,0,0,0.6)" : "none"
                      }}
                      transition={{ duration: 1.5 }}
                      className="w-6 h-18 sm:w-8 sm:h-24 md:w-12 md:h-32 backdrop-blur-sm rounded-full border relative group-hover:border-red-500/50 transition-colors z-10 overflow-hidden"
                    >
                      {/* Restless Internal Commotion Wave */}
                      {currentEncounterIdx === 3 && (
                        <motion.div 
                          animate={{ 
                            y: ["100%", "-100%"],
                            opacity: [0, 0.4, 0]
                          }}
                          transition={{ 
                            duration: 4, 
                            repeat: Infinity, 
                            ease: "linear" 
                          }}
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          style={{
                            background: "linear-gradient(to top, transparent, rgba(148, 163, 184, 0.4), transparent)",
                            WebkitMaskImage: "url('https://www.transparenttextures.com/patterns/stardust.png')",
                            maskImage: "url('https://www.transparenttextures.com/patterns/stardust.png')"
                          }}
                        />
                      )}

                      <motion.div 
                        animate={
                          currentEncounterIdx === 3 ? {
                            borderColor: ["rgba(148, 163, 184, 0)", "rgba(148, 163, 184, 1)", "rgba(148, 163, 184, 0)"],
                            scale: [1, 1.4, 0.9, 1.2, 1],
                            boxShadow: "none",
                            backgroundColor: "rgba(71, 85, 105, 0.1)",
                            filter: "blur(2px)"
                          } : currentEncounterIdx === 4 ? (
                            showSpiritualGlow ? {
                              borderColor: ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 0)"],
                              scale: [1, 1.3, 1],
                              boxShadow: [
                                "0 0 0px rgba(255, 255, 255, 0)",
                                "0 0 30px rgba(255, 255, 255, 0.8)",
                                "0 0 0px rgba(255, 255, 255, 0)"
                              ],
                              backgroundColor: ["rgba(254, 202, 202, 0.2)", "rgba(255, 255, 255, 0.4)", "rgba(254, 202, 202, 0.2)"],
                              filter: ["blur(0px)", "blur(4px)", "blur(0px)"]
                            } : {
                              borderColor: ["rgba(148, 163, 184, 0)", "rgba(148, 163, 184, 1)", "rgba(148, 163, 184, 0)"],
                              scale: [1, 1.4, 0.9, 1.2, 1],
                              boxShadow: "none",
                              backgroundColor: "rgba(71, 85, 105, 0.1)",
                              filter: "blur(2px)"
                            }
                          ) : {
                            borderColor: "transparent",
                            scale: 1,
                            boxShadow: "none",
                            backgroundColor: "rgba(254, 202, 202, 0.2)",
                            filter: "blur(0px)"
                          }
                        }
                        transition={{ 
                          duration: (currentEncounterIdx === 3 || (currentEncounterIdx === 4 && !showSpiritualGlow)) ? 3 : 1.5, 
                          repeat: (currentEncounterIdx === 3 || (currentEncounterIdx === 4 && !showSpiritualGlow)) ? Infinity : 0, 
                          ease: "easeInOut",
                          times: (currentEncounterIdx === 3 || (currentEncounterIdx === 4 && !showSpiritualGlow)) ? [0, 0.15, 0.4, 0.75, 1] : (currentEncounterIdx === 4 && showSpiritualGlow ? [0, 0.5, 1] : undefined)
                        }}
                        className={`absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 rounded-full border-2 transition-colors ${
                          (currentEncounterIdx === 3 || (currentEncounterIdx === 4 && !showSpiritualGlow)) ? 'border-slate-400/60' : 
                          (currentEncounterIdx === 4 && showSpiritualGlow) ? 'border-white/60' : 
                          'border-transparent'
                        }`} 
                      />
                    </motion.div>
                  </motion.div>
                  <motion.span 
                    animate={{ 
                      color: (currentEncounterIdx === 3 || (currentEncounterIdx === 4 && !showSpiritualGlow)) ? "rgba(156, 163, 175, 1)" : "rgba(248, 113, 113, 1)" 
                    }}
                    transition={{ duration: 1.5 }}
                    className="text-[7px] sm:text-[8px] md:text-[10px] uppercase tracking-widest font-bold transition-colors"
                  >
                    Dante
                  </motion.span>
                </motion.div>

                {/* Lonza (Idx 1) - Positioned absolutely to Dante's right */}
                <AnimatePresence>
                  {currentEncounterIdx >= 1 && (
                    <motion.div 
                      key="lonza"
                      initial={{ opacity: 0, scale: 0.8, x: 100 }}
                      animate={{ 
                        opacity: currentEncounterIdx >= 2 ? 0 : 1, 
                        scale: currentEncounterIdx >= 2 ? 0 : ((currentEncounterIdx === 1 && gameState !== 'solved') ? 1 : (currentEncounterIdx === 1 ? [1, 1, 0.3] : 0.3)),
                        x: (currentEncounterIdx === 1 && gameState !== 'solved') ? -20 : (currentEncounterIdx === 1 ? [-20, -600, -400] : -400),
                        y: (currentEncounterIdx === 1 && gameState !== 'solved') ? -70 : (currentEncounterIdx === 1 ? [-70, -70, -180] : -180),
                        filter: (currentEncounterIdx === 1 && gameState !== 'solved') ? 'blur(0px)' : (currentEncounterIdx === 1 ? ['blur(0px)', 'blur(0px)', 'blur(3px)'] : 'blur(3px)'),
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{
                        opacity: { duration: currentEncounterIdx >= 2 ? 2 : 0.5, ease: "easeOut" },
                        scale: { duration: currentEncounterIdx >= 2 ? 2 : ((currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5), times: [0, 0.4, 1], ease: "easeOut" },
                        x: { duration: (currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5, times: [0, 0.4, 1], ease: (currentEncounterIdx === 1 && gameState === 'solved') ? ["linear", "easeInOut"] : "easeOut" },
                        y: { duration: (currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5, times: [0, 0.4, 1], ease: (currentEncounterIdx === 1 && gameState === 'solved') ? ["linear", "easeInOut"] : "easeOut" },
                        filter: { duration: (currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5, times: [0, 0.4, 1], ease: (currentEncounterIdx === 1 && gameState === 'solved') ? ["linear", "easeInOut"] : "easeOut" },
                      }}
                      className={`absolute left-full ml-6 md:ml-12 flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 group z-0 ${(currentEncounterIdx > 1 || (currentEncounterIdx === 1 && gameState === 'solved')) ? 'pointer-events-none' : ''}`}
                    >
                      <div className="w-4 h-10 sm:w-5 sm:h-14 md:w-8 md:h-18 bg-purple-900/40 backdrop-blur-sm rounded-full border border-purple-500/20 relative group-hover:border-purple-500/50 transition-colors">
                        <div className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-4 md:h-4 bg-purple-200/20 rounded-full" />
                      </div>
                      <span className={`text-[7px] sm:text-[8px] md:text-[10px] uppercase tracking-widest text-purple-400 font-bold group-hover:text-purple-300 transition-colors ${(currentEncounterIdx > 1 || (currentEncounterIdx === 1 && gameState === 'solved')) ? 'opacity-0' : 'opacity-100'}`}>Lonza</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Leone (Idx 1) */}
                <AnimatePresence>
                  {currentEncounterIdx >= 1 && (
                    <motion.div 
                      key="leone"
                      initial={{ opacity: 0, scale: 0.8, x: 100 }}
                      animate={{ 
                        opacity: currentEncounterIdx >= 2 ? 0 : 1, 
                        scale: currentEncounterIdx >= 2 ? 0 : ((currentEncounterIdx === 1 && gameState !== 'solved') ? 1.2 : (currentEncounterIdx === 1 ? [1.2, 1.2, 0.35] : 0.35)),
                        x: (currentEncounterIdx === 1 && gameState !== 'solved') ? 80 : (currentEncounterIdx === 1 ? [80, -550, -350] : -350),
                        y: (currentEncounterIdx === 1 && gameState !== 'solved') ? 0 : (currentEncounterIdx === 1 ? [0, 0, -170] : -170),
                        filter: (currentEncounterIdx === 1 && gameState !== 'solved') ? 'blur(0px)' : (currentEncounterIdx === 1 ? ['blur(0px)', 'blur(0px)', 'blur(3px)'] : 'blur(3px)'),
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{
                        opacity: { duration: currentEncounterIdx >= 2 ? 2 : 0.5, ease: "easeOut" },
                        scale: { duration: currentEncounterIdx >= 2 ? 2 : ((currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5), times: [0, 0.4, 1], ease: "easeOut" },
                        x: { duration: (currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5, times: [0, 0.4, 1], ease: (currentEncounterIdx === 1 && gameState === 'solved') ? ["linear", "easeInOut"] : "easeOut" },
                        y: { duration: (currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5, times: [0, 0.4, 1], ease: (currentEncounterIdx === 1 && gameState === 'solved') ? ["linear", "easeInOut"] : "easeOut" },
                        filter: { duration: (currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5, times: [0, 0.4, 1], ease: (currentEncounterIdx === 1 && gameState === 'solved') ? ["linear", "easeInOut"] : "easeOut" },
                      }}
                      className={`absolute left-full ml-6 md:ml-12 flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 group z-0 ${(currentEncounterIdx > 1 || (currentEncounterIdx === 1 && gameState === 'solved')) ? 'pointer-events-none' : ''}`}
                    >
                      <div className="w-5 h-13 sm:w-7 sm:h-17 md:w-10 md:h-24 bg-orange-900/40 backdrop-blur-sm rounded-full border border-orange-500/20 relative group-hover:border-orange-500/50 transition-colors">
                        <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-5 md:h-5 bg-orange-200/20 rounded-full" />
                      </div>
                      <span className={`text-[7px] sm:text-[8px] md:text-[10px] uppercase tracking-widest text-orange-400 font-bold group-hover:text-orange-300 transition-colors ${(currentEncounterIdx > 1 || (currentEncounterIdx === 1 && gameState === 'solved')) ? 'opacity-0' : 'opacity-100'}`}>Leone</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Lupa (Idx 1) */}
                <AnimatePresence>
                  {currentEncounterIdx >= 1 && (
                    <motion.div 
                      key="lupa"
                      initial={{ opacity: 0, scale: 0.8, x: 100 }}
                      animate={{ 
                        opacity: currentEncounterIdx >= 2 ? 0 : 1, 
                        scale: currentEncounterIdx >= 2 ? 0 : ((currentEncounterIdx === 1 && gameState !== 'solved') ? 0.9 : (currentEncounterIdx === 1 ? [0.9, 0.9, 0.32] : 0.32)),
                        x: (currentEncounterIdx === 1 && gameState !== 'solved') ? -20 : (currentEncounterIdx === 1 ? [-20, -500, -300] : -300),
                        y: (currentEncounterIdx === 1 && gameState !== 'solved') ? 70 : (currentEncounterIdx === 1 ? [70, 70, -160] : -160),
                        filter: (currentEncounterIdx === 1 && gameState !== 'solved') ? 'blur(0px)' : (currentEncounterIdx === 1 ? ['blur(0px)', 'blur(0px)', 'blur(3px)'] : 'blur(3px)'),
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{
                        opacity: { duration: currentEncounterIdx >= 2 ? 2 : 0.5, ease: "easeOut" },
                        scale: { duration: currentEncounterIdx >= 2 ? 2 : ((currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5), times: [0, 0.4, 1], ease: "easeOut" },
                        x: { duration: (currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5, times: [0, 0.4, 1], ease: (currentEncounterIdx === 1 && gameState === 'solved') ? ["linear", "easeInOut"] : "easeOut" },
                        y: { duration: (currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5, times: [0, 0.4, 1], ease: (currentEncounterIdx === 1 && gameState === 'solved') ? ["linear", "easeInOut"] : "easeOut" },
                        filter: { duration: (currentEncounterIdx === 1 && gameState === 'solved') ? 18 : 1.5, times: [0, 0.4, 1], ease: (currentEncounterIdx === 1 && gameState === 'solved') ? ["linear", "easeInOut"] : "easeOut" },
                      }}
                      className={`absolute left-full ml-6 md:ml-12 flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 group z-0 ${(currentEncounterIdx > 1 || (currentEncounterIdx === 1 && gameState === 'solved')) ? 'pointer-events-none' : ''}`}
                    >
                      <div className="w-4 h-12 sm:w-6 sm:h-16 md:w-9 md:h-22 bg-slate-900/40 backdrop-blur-sm rounded-full border border-slate-500/20 relative group-hover:border-slate-500/50 transition-colors">
                        <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-slate-200/20 rounded-full" />
                      </div>
                      <span className={`text-[7px] sm:text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold group-hover:text-slate-300 transition-colors ${(currentEncounterIdx > 1 || (currentEncounterIdx === 1 && gameState === 'solved')) ? 'opacity-0' : 'opacity-100'}`}>Lupa</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Virgil */}
                <AnimatePresence>
                  {showVirgil && (currentEncounterIdx >= 2) && (
                    <motion.div 
                      key="virgil"
                      initial={{ opacity: 0, x: 0, scale: 0.4 }}
                      animate={{ 
                        opacity: 1, 
                        x: (showVirgil && currentEncounterIdx >= 2) ? 60 : 0,
                        scale: 1
                      }}
                      exit={{ opacity: 0, x: 0, scale: 0.4 }}
                      transition={{ 
                        opacity: { duration: 1.5 },
                        x: { duration: 1.8, ease: "easeOut" },
                        scale: { duration: 1.8, ease: "easeOut" }
                      }}
                      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 group z-0"
                    >
                      <motion.div 
                        animate={{ 
                          backgroundColor: currentEncounterIdx === 8 ? "rgba(226, 232, 240, 0.1)" : "rgba(30, 58, 138, 0.2)",
                          borderColor: currentEncounterIdx === 8 ? "rgba(255, 255, 255, 0.05)" : "rgba(147, 197, 253, 0.5)",
                          filter: currentEncounterIdx === 8 ? "none" : "grayscale(0) opacity(1)",
                          opacity: (currentEncounterIdx === 9 && gameState === 'journey') ? [0, 1] : 1
                        }}
                        transition={{ 
                          duration: 1.5, 
                          ease: "easeInOut",
                          opacity: { delay: (currentEncounterIdx === 9 && gameState === 'journey') ? 2.5 : 0, duration: 1.5 }
                        }}
                        className={`w-5 h-20 sm:w-7 sm:h-26 md:w-10 md:h-36 ${currentEncounterIdx === 8 ? 'backdrop-blur-[2px]' : 'backdrop-blur-md'} rounded-full border relative group-hover:border-blue-300/50 transition-colors`}
                      >
                        {/* Pulsing Ethereal Layer - Separated to ensure smooth restoration after Limbo */}
                        <motion.div
                          animate={{ 
                            scale: [1, 1.04, 1],
                            opacity: currentEncounterIdx === 8 ? [0.3, 0.5, 0.3] : [0.6, 0.9, 0.6],
                            boxShadow: currentEncounterIdx === 8 ? [
                              "0 0 8px rgba(148, 163, 184, 0.1)",
                              "0 0 20px rgba(148, 163, 184, 0.25)",
                              "0 0 8px rgba(148, 163, 184, 0.1)"
                            ] : [
                              "0 0 25px rgba(96, 165, 250, 0.5)",
                              "0 0 60px rgba(96, 165, 250, 0.9)",
                              "0 0 25px rgba(96, 165, 250, 0.5)"
                            ]
                          }}
                          transition={{ 
                            duration: 3.5, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 rounded-full pointer-events-none"
                        />
                        <div className={`absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-5 md:h-5 rounded-full transition-all duration-1000 ${currentEncounterIdx === 8 ? 'bg-white/10' : 'bg-blue-100/40 shadow-[0_0_12px_rgba(255,255,255,0.5)]'}`} />
                      </motion.div>
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: showVirgilName ? 1 : 0,
                          color: currentEncounterIdx === 8 ? "rgba(148, 163, 184, 1)" : "rgba(96, 165, 250, 1)"
                        }}
                        transition={{ duration: 1 }}
                        className="text-[7px] sm:text-[8px] md:text-[10px] uppercase tracking-widest font-bold group-hover:text-blue-300 transition-colors"
                      >
                        Virgilio
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Caronte (Idx 7) */}
                <AnimatePresence>
                  {currentEncounterIdx === 7 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.4, x: 450, y: 0, rotate: 0 }}
                      animate={gameState !== 'solved' ? { 
                        opacity: 0.8, 
                        scale: [0.4, 0.6, 0.85, 1],
                        x: [450, 410, 430, 310, 350, 150, 200, 180],
                        y: [0, -2, 2, -6, 6, -10, 10, 0],
                        rotate: [0, -1, 1, -2, 2, -3, 3, 0]
                      } : {
                        opacity: 0,
                        scale: 0.2,
                        x: -800,
                        y: -40,
                        rotate: -5
                      }}
                      exit={{ opacity: 0, scale: 0.2, x: -1000 }}
                      transition={gameState !== 'solved' ? { 
                        duration: 6,
                        ease: ["easeIn", "easeInOut", "easeInOut", "easeInOut", "easeInOut", "easeInOut", "easeOut"],
                        times: [0, 0.15, 0.3, 0.5, 0.65, 0.8, 0.9, 1]
                      } : {
                        duration: 8,
                        ease: "linear"
                      }}
                      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 group z-0"
                    >
                      <div className="relative">
                        {/* Stylized Oar (Remo) */}
                        <motion.div
                          animate={{ 
                            rotate: [3, -3, 3],
                            y: [0, -2, 0]
                          }}
                          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute -right-2 sm:-right-3 md:-right-4 top-9 h-[55%] w-[1px] sm:w-[2px] bg-stone-900/40 border-l border-red-900/10 z-0 origin-top flex flex-col items-center"
                        >
                          {/* Minimalist Blade */}
                          <div className="absolute bottom-0 w-1 sm:w-1.5 md:w-2 h-[20%] bg-stone-900/60 rounded-b-full border-b border-x border-red-900/20" />
                        </motion.div>

                        {/* Stylized Wave (Acheron) */}
                        <motion.div
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5, duration: 2 }}
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-8 pointer-events-none z-10"
                        >
                          <svg viewBox="0 0 100 20" className="w-full h-full fill-none stroke-blue-500/30">
                            <motion.path 
                              d="M 0 10 c 10 -5 20 5 30 0 s 20 5 30 0 s 20 5 30 0 s 20 5 30 0" 
                              strokeWidth="1.5"
                              animate={{ x: [-10, 0, -10] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.path 
                              d="M 0 15 c 10 -5 20 5 30 0 s 20 5 30 0 s 20 5 30 0 s 20 5 30 0" 
                              strokeWidth="1"
                              strokeOpacity="0.5"
                              animate={{ x: [0, -10, 0] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            />
                          </svg>
                        </motion.div>

                        <motion.div 
                          animate={{ 
                            y: [0, -10, 0],
                            filter: [
                              "drop-shadow(0 0 20px rgba(220, 38, 38, 0.4))",
                              "drop-shadow(0 0 60px rgba(220, 38, 38, 0.8))",
                              "drop-shadow(0 0 20px rgba(220, 38, 38, 0.4))"
                            ]
                          }}
                          transition={{ 
                            duration: 4, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="w-9 h-24 sm:w-12 sm:h-36 md:w-18 md:h-48 bg-stone-900/60 backdrop-blur-xl rounded-full relative group-hover:ring-2 group-hover:ring-red-600/40 shadow-[0_0_30px_rgba(220,38,38,0.3)] group-hover:shadow-[0_0_50px_rgba(220,38,38,0.6)] transition-all overflow-hidden border-0 outline-none"
                        >
                          {/* Demonic Aura Pulse */}
                          <motion.div 
                            animate={{ opacity: [0.1, 0.3, 0.1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute inset-0 bg-red-600/20 blur-xl"
                          />
                          {/* Charon's Eyes (Occhi di bragia) */}
                          <div className="absolute top-4 sm:top-6 md:top-9 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-4 md:gap-6">
                            <motion.div 
                              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-1 h-1 sm:w-2 sm:h-2 md:w-3 md:h-3 relative"
                            >
                              {/* Glow around the eye - reduced blur for definition */}
                              <div className="absolute inset-0 rounded-full bg-red-600/50 blur-[2px] sm:blur-[3px] md:blur-[5px]" />
                              {/* Granular Red Core */}
                              <div 
                                className="absolute inset-0 bg-red-500"
                                style={{
                                  WebkitMaskImage: "url('https://www.transparenttextures.com/patterns/stardust.png')",
                                  maskImage: "url('https://www.transparenttextures.com/patterns/stardust.png')",
                                  maskSize: 'cover'
                                }}
                              />
                              {/* Solid Penetrating Pupil */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-[30%] h-[30%] bg-red-400 rounded-full shadow-[0_0_8px_rgba(255,0,0,1)]" />
                              </div>
                            </motion.div>
                            <motion.div 
                              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                              className="w-1 h-1 sm:w-2 sm:h-2 md:w-3 md:h-3 relative"
                            >
                              {/* Glow around the eye - reduced blur for definition */}
                              <div className="absolute inset-0 rounded-full bg-red-600/50 blur-[2px] sm:blur-[3px] md:blur-[5px]" />
                              {/* Granular Red Core */}
                              <div 
                                className="absolute inset-0 bg-red-500"
                                style={{
                                  WebkitMaskImage: "url('https://www.transparenttextures.com/patterns/stardust.png')",
                                  maskImage: "url('https://www.transparenttextures.com/patterns/stardust.png')",
                                  maskSize: 'cover'
                                }}
                              />
                              {/* Solid Penetrating Pupil */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-[30%] h-[30%] bg-red-400 rounded-full shadow-[0_0_8px_rgba(255,0,0,1)]" />
                              </div>
                            </motion.div>
                          </div>
                          
                          {/* Internal Lava Flow Effect */}
                          <motion.div 
                            animate={{ 
                              backgroundPosition: ["0% 0%", "0% 100%"],
                            }}
                            transition={{ 
                              duration: 8, 
                              repeat: Infinity, 
                              ease: "linear" 
                            }}
                            className="absolute inset-0 opacity-30 mix-blend-color-dodge"
                            style={{
                              background: "linear-gradient(to bottom, transparent, #7f1d1d, #ef4444, #7f1d1d, transparent)",
                              backgroundSize: "100% 300%",
                            }}
                          />
                          
                          {/* Internal texture/shadows */}
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/40 to-black/80" />
                        </motion.div>
                      </div>
                      <span className="text-[8px] sm:text-[10px] md:text-xs uppercase tracking-[0.3em] text-red-600 font-black group-hover:text-red-500 transition-colors drop-shadow-lg">Caronte</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 flex flex-col pointer-events-none z-30">
        
        {/* Canto Header Indicator */}
        <AnimatePresence>
          {gameState !== 'landing' && currentEncounter && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute top-4 sm:top-6 md:top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            >
              <span className="text-[9px] sm:text-[11px] md:text-sm font-mono uppercase tracking-[0.4em] text-white/40 font-bold">
                Canto {currentEncounter.canto}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-3 sm:p-5 md:p-8 flex justify-between items-start pointer-events-auto relative z-50"
        >
          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-6">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (gameState === 'home') {
                  setGameState(prevState);
                } else {
                  setPrevState(gameState);
                  setGameState('home');
                }
              }}
              className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-2xl backdrop-blur-md border transition-all flex items-center justify-center ${gameState === 'home' ? 'bg-white border-white text-black' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </motion.button>
            <AnimatePresence>
              {gameState !== 'landing' && (
                <motion.button 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setGameState('landing')}
                  className="text-left hover:bg-white/5 p-1 sm:p-2 md:p-3 -m-1 sm:-m-2 md:-m-3 rounded-xl sm:rounded-2xl transition-all group"
                >
                  <h1 className="text-white font-serif italic text-[13px] sm:text-lg md:text-2xl whitespace-nowrap group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all leading-tight">Il Cammino delle Stelle</h1>
                  <p className="text-white/40 text-[6px] sm:text-[8px] md:text-[10px] uppercase tracking-[0.15em] sm:tracking-widest group-hover:text-white/60 transition-colors">Viaggio nell'oltretomba</p>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {gameState !== 'landing' && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-wrap justify-end gap-1 sm:gap-2 md:gap-4 max-w-[60%] md:max-w-none"
              >
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsCommBoardOpen(true)}
                  className="px-2 py-0.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-md sm:rounded-xl border bg-white/5 border-white/10 text-white/60 transition-all flex items-center gap-1 sm:gap-1.5 md:gap-2"
                >
                  <MessageSquare className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                  <span className="text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider">Esprimiti</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSimplified(!isSimplified)}
                  className={`px-2 py-0.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-md sm:rounded-xl border transition-all flex items-center gap-1 sm:gap-1.5 md:gap-2 ${
                    isSimplified 
                      ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30' 
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider">CAA</span>
                </motion.button>
                <div className="px-2 py-0.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-md sm:rounded-xl bg-white/5 border border-white/10 text-white/60 flex items-center gap-1 sm:gap-1.5 md:gap-2">
                  <Leaf className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-yellow-500" />
                  <span className="text-[8px] sm:text-[10px] md:text-xs font-bold tabular-nums">{laurelLeaves}</span>
                </div>
                <motion.div 
                  ref={starIconRef}
                  animate={isStarPulsing ? { scale: [1, 1.3, 1], backgroundColor: 'rgba(234,179,8,0.3)' } : {}}
                  className="px-2 py-0.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-md sm:rounded-xl bg-white/5 border border-white/10 text-white/60 flex items-center gap-1 sm:gap-1.5 md:gap-2"
                >
                  <Star 
                    fill="currentColor"
                    stroke="none"
                    className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 ${isStarPulsing ? 'text-yellow-400' : 'text-yellow-500'}`} 
                  />
                  <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold tabular-nums ${isStarPulsing ? 'text-yellow-400' : ''}`}>{puzzleScore}</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Star Animations Layer */}
        <AnimatePresence>
          {starAnimations.map(star => (
            <StarFlyer
              key={star.id}
              startX={star.startX}
              startY={star.startY}
              endX={star.endX}
              endY={star.endY}
              onComplete={() => {
                setPuzzleScore(prev => prev + 1);
                setIsStarPulsing(true);
                setTimeout(() => setIsStarPulsing(false), 500);
                setStarAnimations(prev => prev.filter(s => s.id !== star.id));
              }}
            />
          ))}
        </AnimatePresence>

        {/* Center Content */}
        <div className="flex-1 overflow-hidden pointer-events-none p-1 sm:p-2 md:p-6 z-40">
          <div className="h-full flex items-center justify-center py-2">
            <AnimatePresence mode="wait">
              {gameState === 'home' && (
                <InfernoMap 
                  currentIdx={currentEncounterIdx}
                  encounters={ENCOUNTERS}
                  onSelectCanto={(idx) => {
                    // Allow navigating to any item for design/development purposes
                    setCurrentEncounterIdx(idx);
                    setGameState('journey');
                  }}
                />
              )}
              {gameState === 'journey' && (
                <motion.div 
                  key="journey-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
              {gameState === 'encounter' && (
                <PuzzleStop 
                  encounter={currentEncounter} 
                  onSolve={handleSolve}
                  isSimplified={isSimplified}
                  onIconSelect={handleExpress}
                  onCorrect={handleCorrect}
                />
              )}
              {gameState === 'complete' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center bg-black/40 backdrop-blur-xl p-6 md:p-12 rounded-2xl md:rounded-3xl border border-white/10 pointer-events-auto mx-auto max-w-2xl w-full"
                >
                  <Trophy className="w-12 h-12 md:w-16 md:h-16 text-yellow-500 mx-auto mb-4 md:mb-6" />
                  <h1 className="text-2xl md:text-4xl font-serif italic text-white mb-2 md:mb-4">E quindi uscimmo a riveder le stelle</h1>
                  <p className="text-sm md:text-base text-white/60 mb-6 md:mb-8">Hai completato il prologo del viaggio.</p>
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group/sound">
                      <motion.button 
                        whileHover={completeCanReplay ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                        whileTap={completeCanReplay ? { scale: 0.9 } : {}}
                        onClick={() => {
                          console.log("Complete: Button clicked, completeCanReplay:", completeCanReplay);
                          if (!completeCanReplay) {
                            // Interrupt
                            stop();
                            if (narrationTimeoutRef.current) {
                              clearTimeout(narrationTimeoutRef.current);
                              narrationTimeoutRef.current = null;
                            }
                            setCompleteCanReplay(true);
                            console.log("Complete: Narration interrupted");
                            return;
                          }
                          
                          setCompleteCanReplay(false);
                          console.log("Complete: Starting narration immediately...");
                          speak("E quindi uscimmo a riveder le stelle. Hai completato il prologo del viaggio.").finally(() => {
                            setCompleteCanReplay(true);
                            console.log("Complete: Replay finished");
                          });
                        }}
                        className={`flex items-center gap-2 transition-all uppercase text-[8px] md:text-[10px] tracking-widest font-bold relative z-50 text-white cursor-pointer pointer-events-auto ${
                          !completeCanReplay ? 'opacity-100' : 'opacity-100'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {!completeCanReplay ? (
                            <motion.div
                              key="pulsing-end"
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="flex items-center gap-2"
                            >
                              <Volume2 className="w-4 h-4" />
                              <span>Ascolta il finale</span>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="static-end"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center gap-2"
                            >
                              <Volume2 className="w-4 h-4" />
                              <span>Riascolta il finale</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-6 md:px-8 py-2 md:py-3 bg-white text-black rounded-full font-bold uppercase text-xs md:text-sm tracking-widest hover:bg-white/90 transition-all mt-2 md:mt-4"
                    >
                      Ricomincia
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Bar / Subtitles */}
        <div className={`flex flex-col items-center gap-4 md:gap-6 ${gameState === 'home' ? 'p-0' : 'p-2 md:p-6'}`}>
          <AnimatePresence mode="wait">
            {gameState === 'journey' && (
              <motion.div 
                key="journey-sub"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center max-w-3xl px-4 relative mb-1 sm:mb-2 md:mb-4"
              >
                <div className="flex flex-col items-center gap-2 md:gap-4 mb-4 md:mb-6">
                  <div className="flex items-center justify-center gap-4 md:gap-8 min-h-[5em]">
                    <p className="text-white/80 font-serif italic text-base md:text-lg whitespace-pre-line leading-relaxed max-w-xl">
                      {isSimplified ? currentEncounter.verse.simplified : currentEncounter.description}
                    </p>
                    <div className="flex items-center gap-4 md:gap-6">
                      <motion.button 
                        whileHover={journeyCanReplay ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                        whileTap={journeyCanReplay ? { scale: 0.9 } : {}}
                        onClick={() => {
                          console.log("Journey: Button clicked, journeyCanReplay:", journeyCanReplay);
                          if (!journeyCanReplay) {
                            // Interrupt
                            stop();
                            if (narrationTimeoutRef.current) {
                              clearTimeout(narrationTimeoutRef.current);
                              narrationTimeoutRef.current = null;
                            }
                            setJourneyCanReplay(true);
                            console.log("Journey: Narration interrupted");
                            return;
                          }

                          setJourneyCanReplay(false);
                          console.log("Journey: Starting narration immediately...");
                          const textToSpeak = isSimplified 
                            ? (ENCOUNTERS[currentEncounterIdx].simplifiedDescription || ENCOUNTERS[currentEncounterIdx].verse.simplified) 
                            : ENCOUNTERS[currentEncounterIdx].introduction;
                          speak(textToSpeak).finally(() => {
                            setJourneyCanReplay(true);
                            console.log("Journey: Replay finished");
                          });
                        }}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-full border flex items-center justify-center transition-all shrink-0 bg-white/20 border-white/40 text-white cursor-pointer pointer-events-auto`}
                      >
                        <AnimatePresence mode="wait">
                          {!journeyCanReplay ? (
                            <motion.div
                              key="journey-pulsing"
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                            >
                              <Volume2 className="w-5 h-5" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="journey-static"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                            >
                              <Volume2 className="w-5 h-5" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>

                      {isSimplified && (
                        <div className="flex flex-col gap-2">
                          {(currentEncounter.journeyAacSequence || currentEncounter.verse.aacSequence).map(id => {
                            const icon = AAC_ICONS[id];
                            return (
                              <motion.div
                                key={id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="w-10 h-10 md:w-14 md:h-14 bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl border border-white/10 flex flex-col items-center justify-center p-1 group shadow-lg"
                              >
                                <span className="text-sm sm:text-lg md:text-2xl">{icon?.icon}</span>
                                <span className="text-[5px] sm:text-[6px] md:text-[8px] text-white/40 uppercase tracking-widest font-bold text-center leading-tight">{icon?.label}</span>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {journeyCanReplay && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: [0.3, 0.7, 0.3],
                        y: 0 
                      }}
                      transition={{ 
                        opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        y: { duration: 0.5 }
                      }}
                      className="mt-2"
                    >
                      <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40 font-bold whitespace-nowrap">
                        Clicca sui personaggi per iniziare il puzzle
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {gameState === 'solved' && (
              <motion.div 
                key="solved-sub"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center max-w-xl px-4"
              >
                <p className="text-white font-serif italic text-lg md:text-xl mb-4 md:mb-6">
                  Verso completato con successo!
                </p>
                <motion.button 
                  onClick={handleNextCanto}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="group flex items-center gap-3 text-white hover:text-white transition-colors pointer-events-auto mx-auto"
                >
                  <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Prosegui il cammino</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AACBoard 
        isOpen={isCommBoardOpen} 
        onClose={() => setIsCommBoardOpen(false)} 
        onSelect={(id) => handleExpress(id, false)}
      />

      {/* Veltro Side-Quest Overlay */}
      <AnimatePresence>
        {activeVeltro && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md pointer-events-auto"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-900/90 backdrop-blur-2xl p-5 sm:p-8 md:p-12 rounded-2xl sm:rounded-[32px] md:rounded-[40px] border border-white/10 max-w-2xl w-full text-center relative overflow-hidden mx-4"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
              <div className="text-3xl sm:text-5xl md:text-6xl mb-3 sm:mb-6">{activeVeltro.icon}</div>
              <div className="absolute top-3 right-3 sm:top-6 sm:right-6 md:top-8 md:right-8 group/sound">
                <motion.button 
                  whileHover={veltroCanReplay ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                  whileTap={veltroCanReplay ? { scale: 0.9 } : {}}
                  onClick={() => {
                    console.log("Veltro: Button clicked, veltroCanReplay:", veltroCanReplay);
                    if (!veltroCanReplay) {
                      // Interrupt
                      stop();
                      if (narrationTimeoutRef.current) {
                        clearTimeout(narrationTimeoutRef.current);
                        narrationTimeoutRef.current = null;
                      }
                      setVeltroCanReplay(true);
                      console.log("Veltro: Narration interrupted");
                      return;
                    }

                    setVeltroCanReplay(false);
                    console.log("Veltro: Starting narration immediately...");
                    speak(`${activeVeltro.character} dice: ${activeVeltro.message}`).finally(() => {
                      setVeltroCanReplay(true);
                      console.log("Veltro: Replay finished");
                    });
                  }}
                  className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full border flex items-center justify-center transition-all relative z-50 bg-white/20 border-white/40 text-white cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)] pointer-events-auto`}
                >
                  <AnimatePresence mode="wait">
                    {!veltroCanReplay ? (
                      <motion.div
                        key="veltro-pulsing"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="veltro-static"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
              <h2 className="text-[8px] sm:text-[10px] md:text-xs font-mono uppercase tracking-[0.3em] sm:tracking-[0.5em] text-yellow-500 mb-1 sm:mb-2">Incontro del Veltro</h2>
              <h3 className="text-lg sm:text-2xl md:text-3xl font-serif italic text-white mb-3 sm:mb-6">{activeVeltro.character}</h3>
              <p className="text-white/70 text-base sm:text-lg md:text-xl font-serif italic mb-5 sm:mb-10 leading-relaxed">
                "{activeVeltro.message}"
              </p>
              <div className="flex flex-col items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
                  <span className="text-[10px] sm:text-xs md:text-sm text-yellow-500 font-bold">+{activeVeltro.reward} Foglie di Alloro</span>
                </div>
                <button
                  onClick={closeVeltro}
                  className="px-6 sm:px-10 py-2.5 sm:py-4 bg-white text-black rounded-full font-bold uppercase text-[10px] sm:text-xs md:text-sm tracking-widest hover:bg-white/90 transition-all"
                >
                  Prosegui
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
