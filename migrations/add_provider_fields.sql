-- 1) tracking_items: novos campos
alter table offers.tracking_items
  add column if not exists collation_id text,
  add column if not exists collation_count integer,
  add column if not exists media_type text, -- 'IMG' | 'VIDEO' | 'CAROUSEL'
  add column if not exists media_items jsonb, -- array de {type,url,sha256,phash,width,height}
  add column if not exists creative_key text;

-- 2) índices úteis
create index if not exists idx_tracking_items_scan_id on offers.tracking_items(scan_id);
create index if not exists idx_tracking_items_collation_id on offers.tracking_items(collation_id);
create index if not exists idx_tracking_items_creative_key on offers.tracking_items(creative_key);
create index if not exists idx_tracking_items_ad_id on offers.tracking_items(ad_id);

-- 3) VIEW principal por scan (Top - genérica)
drop view if exists offers.v_top_creatives_by_scan;

create view offers.v_top_creatives_by_scan as
with base as (
  select
    ti.scan_id,
    -- prioridade de agrupamento: collation_id > creative_key
    coalesce(nullif(ti.collation_id, ''), nullif(ti.creative_key, '')) as grouping_key,
    max(ti.media_type) as media_type,
    -- primeiro anúncio (menor start) para "primeira veiculação"
    min(ti.ad_delivery_start_time) as first_seen_at,
    max(ti.last_seen) as last_seen_at,
    count(distinct ti.ad_id) as ads_count_total,
    -- Pegar page_id e page_name mais frequentes (ou primeiro não-null)
    (array_agg(ti.page_id) FILTER (WHERE ti.page_id IS NOT NULL))[1] as page_id,
    (array_agg(ti.page_name) FILTER (WHERE ti.page_name IS NOT NULL))[1] as page_name
  from offers.tracking_items ti
  group by ti.scan_id, coalesce(nullif(ti.collation_id, ''), nullif(ti.creative_key, ''))
)
select *
from base
where grouping_key is not null;

-- 4) VIEW Top 3 por scan (ordenado por escalonamento)
drop view if exists offers.v_top3_creatives_by_scan;

create view offers.v_top3_creatives_by_scan as
select *
from (
  select
    v.scan_id,
    v.grouping_key,
    v.media_type,
    v.first_seen_at,
    v.last_seen_at,
    v.ads_count_total,
    row_number() over (partition by v.scan_id order by v.ads_count_total desc, v.first_seen_at asc nulls last) as rn
  from offers.v_top_creatives_by_scan v
) t
where t.rn <= 3;

