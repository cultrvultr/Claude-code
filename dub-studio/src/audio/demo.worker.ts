// Renders one demo part off the main thread, so the page stays smooth while the song is made.
import { renderDemoStem } from './demo';
self.onmessage = (e: MessageEvent<{ i: number; sr: number }>) => {
  const d = renderDemoStem(e.data.i, e.data.sr);
  (self as unknown as Worker).postMessage(d, [d.buffer]);
};
