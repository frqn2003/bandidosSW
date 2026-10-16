'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  splitType?: 'chars' | 'words';
  from?: { opacity: number; y?: number; x?: number; scale?: number };
  to?: { opacity: number; y?: number; x?: number; scale?: number };
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'center' | 'right';
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  onLetterAnimationComplete?: () => void;
}

export default function SplitText({
  text = '',
  className = '',
  delay = 50,
  duration = 0.5,
  splitType = 'chars',
  from = { opacity: 0, y: 30 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-50px',
  textAlign = 'left',
  tag: Tag = 'h2',
  onLetterAnimationComplete
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: rootMargin as any, amount: threshold });

  const words = text.split(' ');

  let charIndexCounter = 0;

  return (
    <Tag
      ref={ref as any}
      style={{ textAlign }}
      className={`inline-block whitespace-normal ${className}`}
    >
      {words.map((word, wordIndex) => {
        if (splitType === 'words') {
          const wordDelay = (wordIndex * delay) / 1000;
          return (
            <span key={wordIndex} className="inline-block whitespace-nowrap mr-[0.25em]">
              <motion.span
                className="inline-block"
                initial={from}
                animate={isInView ? to : from}
                transition={{
                  duration,
                  delay: wordDelay,
                  ease: [0.33, 1, 0.68, 1]
                }}
                onAnimationComplete={
                  wordIndex === words.length - 1 ? onLetterAnimationComplete : undefined
                }
              >
                {word}
              </motion.span>
            </span>
          );
        }

        // Chars split mode
        const wordChars = Array.from(word);
        return (
          <span key={wordIndex} className="inline-block whitespace-nowrap mr-[0.25em]">
            {wordChars.map((char, charIndex) => {
              const currentGlobalIndex = charIndexCounter++;
              const charDelay = (currentGlobalIndex * delay) / 1000;
              const isLast =
                wordIndex === words.length - 1 && charIndex === wordChars.length - 1;

              return (
                <motion.span
                  key={charIndex}
                  className="inline-block"
                  initial={from}
                  animate={isInView ? to : from}
                  transition={{
                    duration,
                    delay: charDelay,
                    ease: [0.33, 1, 0.68, 1]
                  }}
                  onAnimationComplete={isLast ? onLetterAnimationComplete : undefined}
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </Tag>
  );
}
