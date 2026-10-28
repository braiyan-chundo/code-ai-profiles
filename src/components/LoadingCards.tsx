export function LoadingCards() {
  return (
    <div className="instance-list" aria-label="Cargando instancias">
      {[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><span /><span /><span /></div>)}
    </div>
  );
}
