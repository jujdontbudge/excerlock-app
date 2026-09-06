import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import './style.css';

const BOARD_URL = '/excerlock-proposed-onboarding-v3.excalidraw';

function App() {
  const [scene, setScene] = useState(null);
  const focus = new URLSearchParams(window.location.search).get('focus');
  const focusSplash = focus === 'splash' || focus === 'block';
  const step = Number(new URLSearchParams(window.location.search).get('step'));
  const focusStep = Number.isInteger(step) && step >= 1 && step <= 44;
  const section = new URLSearchParams(window.location.search).get('section');

  useEffect(() => {
    fetch(BOARD_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Board request failed: ${response.status}`);
        return response.json();
      })
      .then((board) => setScene({
        elements: board.elements,
        files: board.files,
        appState: {
          ...board.appState,
          scrollX: section === 'main' ? -40 : section === 'branches' ? -10176 : section === 'ending' ? -11556 : focusStep ? -(96 + (step - 1) * 460) + 40 : focus === 'block' ? -890 : focusSplash ? -430 : 40,
          scrollY: section === 'main' ? -5930 : section === 'branches' ? -1280 : section === 'ending' || focusStep || focusSplash ? -150 : 80,
          zoom: { value: section ? 0.55 : focusStep ? 0.55 : focusSplash ? 0.65 : 0.05 },
          theme: 'light',
        },
      }));
  }, []);

  if (!scene) return <main className="loading">Loading ExcerLock onboarding…</main>;
  return <Excalidraw initialData={scene} name="ExcerLock Proposed Onboarding V3" theme="light" />;
}

createRoot(document.getElementById('root')).render(<App />);
