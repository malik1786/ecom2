import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

const MIN_STEP_MS = 8;

const TypewriterText = ({
  text = '',
  className = '',
  delay = 0,
  stagger = 0.012,
  style = {},
  as = 'span',
}) => {
  const Tag = as;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduceMotion = useReducedMotion();
  const textValue = useMemo(() => String(text ?? ''), [text]);
  const totalChars = textValue.length;
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    setVisibleChars(0);
  }, [textValue]);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduceMotion || totalChars === 0) {
      setVisibleChars(totalChars);
      return undefined;
    }

    const delayMs = Math.max(0, delay * 1000);
    const stepMs = Math.max(MIN_STEP_MS, Math.round(stagger * 1000));
    let rafId = 0;
    let timeoutId = 0;
    let lastTs = 0;
    let current = 0;

    const animate = (ts) => {
      if (lastTs === 0) lastTs = ts;
      const elapsed = ts - lastTs;

      if (elapsed >= stepMs) {
        const jump = Math.max(1, Math.floor(elapsed / stepMs));
        current = Math.min(totalChars, current + jump);
        lastTs = ts;
        setVisibleChars(current);
      }

      if (current < totalChars) {
        rafId = window.requestAnimationFrame(animate);
      }
    };

    timeoutId = window.setTimeout(() => {
      rafId = window.requestAnimationFrame(animate);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
    };
  }, [delay, inView, reduceMotion, stagger, totalChars]);

  const typedText = totalChars === 0 ? '' : textValue.slice(0, visibleChars);
  const isComplete = visibleChars >= totalChars;

  return (
    <Tag ref={ref} className={className} style={style}>
      {typedText}
      {!isComplete && totalChars > 0 ? (
        <span
          aria-hidden="true"
          className="inline-block w-px h-[0.95em] align-[-0.12em] bg-current ml-[1px] animate-pulse"
        />
      ) : null}
    </Tag>
  );
};

export default TypewriterText;
