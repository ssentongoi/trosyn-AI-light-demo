import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';

interface FloatingActionPopupProps {
  selection: Range | null;
  onAction: (action: string) => void;
  onClose: () => void;
}

const FloatingActionPopup: React.FC<FloatingActionPopupProps> = ({
  selection,
  onAction,
  onClose,
}) => {
  const { theme } = useTheme();
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, visible: false });

  // Position the popup near the selection
  useEffect(() => {
    if (!selection || selection.collapsed) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setPosition({
      top: rect.top + window.scrollY - 50, // Position above selection
      left: rect.left + window.scrollX + (rect.width / 2) - 100, // Center horizontally
      visible: true
    });

    // Close popup when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selection, onClose]);

  if (!position.visible) return null;

  return createPortal(
    <div
      ref={popupRef}
      className={`fixed p-2 rounded-lg shadow-lg z-50 flex flex-col gap-2 w-64 bg-${theme}-bg border border-${theme}-border`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-100%)', // Position above the text
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between mb-2">
        {['Comment', 'React', 'Suggest', 'Edit'].map((action) => (
          <button
            key={action}
            className={`px-2 py-1 text-sm rounded hover:bg-${theme}-hover`}
            onClick={() => onAction(action.toLowerCase())}
          >
            {action}
          </button>
        ))}
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
        <select 
          className={`w-full p-1 text-sm rounded border border-${theme}-border bg-${theme}-bg`}
          onChange={(e) => onAction(`format:${e.target.value}`)}
          defaultValue=""
        >
          <option value="">Text Style</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="ul">Bullet List</option>
          <option value="todo">To-do List</option>
          <option value="code">Code Block</option>
        </select>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        {[
          { icon: 'B', action: 'bold' },
          { icon: 'I', action: 'italic' },
          { icon: 'U', action: 'underline' },
          { icon: 'S', action: 'strikethrough' },
          { icon: '</>', action: 'code' },
          { icon: 'Σ', action: 'equation' },
          { icon: '🔗', action: 'link' },
        ].map(({ icon, action }) => (
          <button
            key={action}
            className={`w-8 h-8 flex items-center justify-center rounded hover:bg-${theme}-hover`}
            onClick={() => onAction(`format:${action}`)}
            aria-label={action}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default FloatingActionPopup;
