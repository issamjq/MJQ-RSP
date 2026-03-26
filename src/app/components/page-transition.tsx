import { useEffect, useRef, useState } from 'react';
import { useLocation, Outlet } from 'react-router';

function PageTransitionOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-10 py-8 flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-amber-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-700">Please wait…</p>
      </div>
    </div>
  );
}

export function RouterLayout() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 350);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <>
      <PageTransitionOverlay visible={visible} />
      <Outlet />
    </>
  );
}
