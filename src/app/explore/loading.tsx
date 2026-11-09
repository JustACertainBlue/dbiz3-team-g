// Explore loading state (EXP120 / EXP017 "Loading: skeleton"; Figma "Explore — đang tải & rỗng").
import './explore-v9.css';

export default function ExploreLoading() {
  return <div className="explore-module xv" aria-busy="true" aria-live="polite">
    <main className="xv-main">
      <p className="xv-visually-hidden">Đang tải trải nghiệm…</p>
      <ul className="xv-grid" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map(index => <li key={index}><div className="xv-card xv-skeleton">
          <div className="xv-card__media xv-skeleton__block" />
          <div className="xv-card__body"><span className="xv-skeleton__line" style={{ width: '30%' }} /><span className="xv-skeleton__line" style={{ width: '80%' }} /><span className="xv-skeleton__line" style={{ width: '60%' }} /><span className="xv-skeleton__line" style={{ width: '40%' }} /></div>
        </div></li>)}
      </ul>
    </main>
  </div>;
}
