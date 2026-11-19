'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

export default function VillageSlider({ children }: { children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const drag = useRef<{ id: number; startX: number; startScroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [pages, setPages] = useState<number[]>([]);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const list = track.current;
    if (!list) return;

    let offsets: number[] = [];

    function updateActivePage() {
      if (!list || offsets.length === 0) return;
      const position = list.scrollLeft;
      const nearest = offsets.reduce((best, offset, index) =>
        Math.abs(offset - position) < Math.abs(offsets[best] - position) ? index : best, 0);
      setActivePage(nearest);
    }

    function measurePages() {
      if (!list) return;
      const [first, second] = Array.from(list.children);
      const end = list.scrollWidth - list.clientWidth;
      offsets = [];
      if (first && second && end > 1) {
        const firstRect = first.getBoundingClientRect();
        const stride = second.getBoundingClientRect().left - firstRect.left;
        if (stride > 0) {
          const gap = stride - firstRect.width;
          const cardsPerPage = Math.max(1, Math.floor((list.clientWidth + gap) / stride));
          const step = cardsPerPage * stride;
          for (let offset = 0; offset < end - 1; offset += step) offsets.push(offset);
          offsets.push(end);
        }
      }
      setPages(offsets);
      updateActivePage();
    }

    const observer = new ResizeObserver(measurePages);
    observer.observe(list);
    list.addEventListener('scroll', updateActivePage, { passive: true });
    measurePages();
    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', updateActivePage);
    };
  }, [children]);

  function goToPage(offset: number) {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    track.current?.scrollTo({ left: offset, behavior });
  }

  function startDrag(event: PointerEvent<HTMLUListElement>) {
    suppressClick.current = false;
    if (event.pointerType !== 'mouse' || event.button !== 0 || pages.length < 2) return;
    drag.current = { id: event.pointerId, startX: event.clientX, startScroll: event.currentTarget.scrollLeft, moved: false };
  }

  function dragTrack(event: PointerEvent<HTMLUListElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const distance = event.clientX - current.startX;
    if (!current.moved && Math.abs(distance) < 6) return;
    const list = event.currentTarget;
    if (!current.moved) {
      current.moved = true;
      suppressClick.current = true;
      list.dataset.dragging = 'true';
      list.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    list.scrollLeft = current.startScroll - distance;
  }

  function endDrag() {
    drag.current = null;
    if (track.current) delete track.current.dataset.dragging;
  }

  return <div className="xv-slider">
    <ul ref={track} className="xv-strip" aria-label="Làng nghề có trải nghiệm đã xác minh"
      data-scrollable={pages.length > 1 ? 'true' : undefined}
      onPointerDown={startDrag} onPointerMove={dragTrack}
      onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
      onPointerLeave={() => { if (!drag.current?.moved) endDrag(); }}
      onDragStart={event => event.preventDefault()}
      onClickCapture={event => {
        if (suppressClick.current && event.detail > 0) {
          event.preventDefault();
          event.stopPropagation();
        }
        suppressClick.current = false;
      }}
    >{children}</ul>
    {pages.length > 1 && <div className="xv-slider__controls" role="group" aria-label="Điều hướng làng nghề">
      {pages.map((offset, index) => <button
        key={index}
        type="button"
        aria-label={`Xem nhóm làng nghề ${index + 1} / ${pages.length}`}
        aria-current={activePage === index ? 'true' : undefined}
        onClick={() => goToPage(offset)}
      />)}
    </div>}
  </div>;
}
