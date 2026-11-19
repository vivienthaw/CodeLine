/** Marks every screen as a click-through mockup (mock data, nothing saved). */
export function MockupTag() {
  return (
    <div
      role="note"
      aria-label="Mockup — demo data only, nothing is saved"
      data-mockup-tag
      // bottom-right corner: clear of page titles, timers and account menus at every screen size
      className="pointer-events-none fixed bottom-0 right-0 z-[90] rounded-tl-[6px] bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-soft print:hidden"
    >
      Mockup · demo data
    </div>
  );
}
