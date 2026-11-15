export default function AiMatchingSkeleton() {
  return (
    <div className="ait-container" aria-busy="true" aria-label="Đang tải AI matching">
      <aside className="ait-sidebar" aria-hidden="true">
        <div style={{ height: '38px', background: '#E5E7EB', borderRadius: '8px', marginBottom: '14px' }} />
        <div style={{ height: '34px', background: '#F3F4F6', borderRadius: '6px', marginBottom: '18px' }} />
        <div className="ait-sidebar-history">
          {[0, 1, 2].map(item => (
            <div key={item} style={{ height: '52px', background: '#F3F4F6', borderRadius: '8px', marginBottom: '6px' }} />
          ))}
        </div>
      </aside>
      <section className="ait-main-chat" aria-hidden="true">
        <header className="ait-chat-header">
          <div style={{ width: '260px', height: '18px', background: '#E5E7EB', borderRadius: '6px' }} />
        </header>
        <main className="ait-messages-stream">
          <div style={{ width: 'min(540px, 85%)', height: '92px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px' }} />
          <div style={{ alignSelf: 'flex-end', width: 'min(420px, 75%)', height: '56px', background: '#F3F4F6', borderRadius: '12px' }} />
          <div style={{ width: '100%', minHeight: '180px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px' }} />
        </main>
        <footer className="ait-input-footer" aria-hidden="true">
          <div className="ait-input-box">
            <div style={{ flex: 1, height: '40px', background: '#F3F4F6', borderRadius: '6px' }} />
            <div style={{ width: '64px', height: '40px', background: '#E5E7EB', borderRadius: '6px' }} />
          </div>
        </footer>
      </section>
    </div>
  )
}
