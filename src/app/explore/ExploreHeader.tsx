import Link from 'next/link';

type ExploreHeaderProps = {
  viewer: 'guest' | 'agency';
  agencyId?: string;
  active?: 'explore' | 'matching' | 'messages';
};

export default function ExploreHeader({ viewer, agencyId, active = 'explore' }: ExploreHeaderProps) {
  void agencyId;

  return <header className="explore-header">
    <div className="explore-header__inner">
      <Link className="explore-brand" href="/explore" aria-label="Hanoi Artisan Bridge - Explore">
        <span className="explore-brand__mark" aria-hidden="true">H</span>
        <span><strong>Hanoi Artisan Bridge</strong><small>Travel Agency Portal</small></span>
      </Link>

      <nav className="explore-nav" aria-label="Điều hướng chính">
        <Link className={active === 'explore' ? 'is-active' : ''} href="/explore">Explore</Link>
        {viewer === 'agency'
          ? <>
              <Link className={active === 'matching' ? 'is-active' : ''} href="/ai-matching">AI Tour Matching <span className="nav-ai">AI</span></Link>
              <span className="nav-disabled" title="Module chưa được tích hợp">Bookings</span>
              <Link className={active === 'messages' ? 'is-active' : ''} href="/messages">Messages</Link>
              <span className="nav-disabled" title="Module chưa được tích hợp">Schedule</span>
            </>
          : null}
      </nav>

      <div className="explore-header__actions">
        {viewer === 'agency'
          ? <span className="account-pill"><span className="account-dot" />Agency demo</span>
          : <><Link className="header-login" href="/login">Đăng nhập</Link><Link className="header-register" href="/login">Đăng ký Agency</Link></>}
      </div>
    </div>
  </header>;
}
