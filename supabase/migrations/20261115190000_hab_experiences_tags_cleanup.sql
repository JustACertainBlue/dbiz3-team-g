update public.experiences
set tags = array(
  select t from unnest(tags) as t
  where t not in ('vé miễn phí','quà lưu niệm','trải nghiệm gia đình','nghệ nhân')
)
where tags && array['vé miễn phí','quà lưu niệm','trải nghiệm gia đình','nghệ nhân'];
