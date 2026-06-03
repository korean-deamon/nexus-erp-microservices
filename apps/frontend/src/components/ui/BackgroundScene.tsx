'use client';

export default function BackgroundScene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      <div className="aurora-1" />
      <div className="aurora-2" />
      <div className="aurora-3" />
      <div className="aurora-4" />
      <div className="grid-overlay" />
    </div>
  );
}
