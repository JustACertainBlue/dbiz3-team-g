// Explore loading state (EXP120 / EXP017 "Loading: skeleton"), mockup v3 tokens on a white page (human review 2026-11-19).
import React from 'react';
import './v3/explore-v3.css';

export default function ExploreLoading() {
  return <div className="hab-band v3-loading" aria-busy="true" aria-live="polite">
    <p className="v3-sr">Đang tải trải nghiệm…</p>
    <div className="v3-loading__grid" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map(index => <div key={index} className="v3-card v3-loading__card">
        <div className="v3-loading__media" />
        <div className="v3-loading__body">{['30%', '80%', '60%', '40%'].map(width => <span key={width} className="v3-loading__bar" style={{ width }} />)}</div>
      </div>)}
    </div>
  </div>;
}
