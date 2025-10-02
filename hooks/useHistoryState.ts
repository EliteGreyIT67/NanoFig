import { useState, useCallback, useRef } from 'react';

export const useHistoryState = <T>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);
  
  // Use a ref to compare against the actual last committed state in history
  const lastCommittedState = useRef(initialState);

  const state = history[index];

  const setState = useCallback((newState: T | ((prevState: T) => T)) => {
    const resolvedState = typeof newState === 'function' 
        ? (newState as (prevState: T) => T)(lastCommittedState.current) 
        : newState;

    // Prevent adding to history if the new state is identical to the last committed one
    if (JSON.stringify(resolvedState) === JSON.stringify(lastCommittedState.current)) {
        return;
    }

    const newHistory = history.slice(0, index + 1);
    newHistory.push(resolvedState);
    
    setHistory(newHistory);
    setIndex(newHistory.length - 1);
    lastCommittedState.current = resolvedState;
  }, [history, index]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(prevIndex => {
        const newIndex = prevIndex - 1;
        lastCommittedState.current = history[newIndex];
        return newIndex;
      });
    }
  }, [index, history]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(prevIndex => {
        const newIndex = prevIndex + 1;
        lastCommittedState.current = history[newIndex];
        return newIndex;
      });
    }
  }, [index, history]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { state, setState, undo, redo, canUndo, canRedo };
};
