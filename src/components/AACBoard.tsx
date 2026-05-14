import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, RotateCcw, Delete, MessageSquare } from 'lucide-react';
import { AAC_ICONS, EXPRESSION_CATEGORIES, AACIcon } from '../data';
import { speak } from '../services/ttsService';

interface AACBoardProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (id: string) => void;
}

export const AACBoard: React.FC<AACBoardProps> = ({ isOpen, onClose, onSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState(EXPRESSION_CATEGORIES[0].name);
  const [sentence, setSentence] = useState<AACIcon[]>([]);

  const addToSentence = (icon: AACIcon) => {
    setSentence([...sentence, icon]);
    onSelect?.(icon.id);
  };

  const removeFromSentence = () => {
    setSentence(sentence.slice(0, -1));
  };

  const clearSentence = () => {
    setSentence([]);
  };

  const playSentence = () => {
    if (sentence.length === 0) return;
    const text = sentence.map(i => i.label).join(' ');
    speak(text);
  };

  const currentIcons = EXPRESSION_CATEGORIES.find(c => c.name === selectedCategory)?.icons || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-none"
        >
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-[30px] md:rounded-[40px] shadow-2xl w-full max-w-5xl h-[90dvh] sm:h-[85dvh] md:h-[80dvh] flex flex-col overflow-hidden pointer-events-auto">
            {/* Header */}
            <div className="p-2.5 sm:p-4 md:p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg md:xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-base md:text-xl font-serif italic text-white">Tavola di Comunicazione</h2>
                  <p className="text-[6px] sm:text-[8px] md:text-[10px] uppercase tracking-widest text-white/40">Costruisci il tuo messaggio</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </button>
            </div>

            {/* Sentence Builder */}
            <div className="px-2.5 sm:px-4 md:px-8 py-1.5 sm:py-2 md:py-4 bg-black/20 border-y border-white/5 flex flex-col md:flex-row items-center gap-2 sm:gap-3 md:gap-4 min-h-[60px] sm:min-h-[80px] md:min-h-[100px]">
              <div className="flex-1 w-full flex gap-1 sm:gap-2 overflow-x-auto pb-1.5 sm:pb-2 scrollbar-hide min-h-[40px] sm:min-h-[50px] md:min-h-[60px] items-center">
                {sentence.length === 0 ? (
                  <p className="text-white/20 italic text-[9px] sm:text-xs md:text-sm ml-2 text-center md:text-left w-full md:w-auto">Seleziona i simboli per comporre una frase...</p>
                ) : (
                  sentence.map((icon, idx) => (
                    <motion.div
                      key={`${icon.id}-${idx}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-1 md:p-2 min-w-[40px] sm:min-w-[50px] md:min-w-[70px]"
                    >
                      <span className="text-base sm:text-xl md:text-2xl">{icon.icon}</span>
                      <span className="text-[6px] sm:text-[8px] md:text-[10px] text-white/60 font-bold uppercase mt-0.5 sm:mt-1">{icon.label}</span>
                    </motion.div>
                  ))
                )}
              </div>
              <div className="flex gap-1 sm:gap-2 w-full md:w-auto justify-center">
                <button 
                  onClick={removeFromSentence}
                  disabled={sentence.length === 0}
                  className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg md:xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-all"
                >
                  <Delete className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </button>
                <button 
                  onClick={clearSentence}
                  disabled={sentence.length === 0}
                  className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg md:xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-all"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </button>
                <button 
                  onClick={playSentence}
                  disabled={sentence.length === 0}
                  className="flex-1 md:flex-none px-2.5 sm:px-4 md:px-6 h-7 sm:h-10 md:h-12 rounded-lg md:xl bg-indigo-500 text-white flex items-center justify-center gap-1 sm:gap-2 font-bold uppercase text-[8px] sm:text-[10px] md:text-xs tracking-widest hover:bg-indigo-400 disabled:opacity-20 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Play className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 fill-current" />
                  Ascolta
                </button>
              </div>
            </div>

            {/* Categories & Grid */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Sidebar Categories */}
              <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-white/5 p-1.5 sm:p-2 md:p-4 flex md:flex-col gap-1.5 sm:gap-2 overflow-x-auto md:overflow-y-auto bg-black/10 scrollbar-hide shrink-0">
                <p className="hidden md:block text-[8px] uppercase tracking-[0.3em] text-white/20 mb-2 px-2 font-bold">Moduli / Categorie</p>
                {EXPRESSION_CATEGORIES.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`whitespace-nowrap md:whitespace-normal p-1.5 sm:p-2 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl text-left transition-all border shrink-0 ${
                      selectedCategory === cat.name 
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest">{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Icons Grid */}
              <div className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto relative">
                <div className="hidden md:block absolute top-4 right-8 text-[8px] uppercase tracking-[0.4em] text-white/10 font-mono">
                  AAC_CORE_V2.5 // {selectedCategory.toUpperCase()}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2 md:gap-4 content-start">
                  {currentIcons.map(id => {
                  const icon = AAC_ICONS[id];
                  if (!icon) return null;
                  return (
                    <motion.button
                      key={id}
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addToSentence(icon)}
                      className="aspect-square bg-white/5 border border-white/10 rounded-lg sm:rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 md:gap-2 transition-colors"
                    >
                      <span className="text-lg sm:text-2xl md:text-4xl">{icon.icon}</span>
                      <span className="text-[6px] sm:text-[8px] md:text-xs font-bold text-white/60 uppercase tracking-wider text-center px-0.5 sm:px-1">{icon.label}</span>
                    </motion.button>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
