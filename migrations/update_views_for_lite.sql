-- Derruba a dependente primeiro
drop view if exists offers.v_top3_creatives_by_scan;
drop view if exists offers.v_top_creatives_by_scan;

-- Base: agrupa por grouping_key (creative_key) e soma collation_count (ou 1)
create view offers.v_top_creatives_by_scan as
with base as (
  select
    ti.scan_id,
    coalesce(nullif(ti.collation_id, ''), nullif(ti.creative_key, '')) as grouping_key,
    max(ti.media_type) as media_type,
    min(ti.ad_delivery_start_time) as first_seen_at,
    max(ti.last_seen) as last_seen_at,
    sum(coalesce(ti.collation_count, 1))::int as ads_count_total,
    -- Pegar page_id e page_name mais frequentes (ou primeiro não-null)
    (array_agg(ti.page_id) FILTER (WHERE ti.page_id IS NOT NULL))[1] as page_id,
    (array_agg(ti.page_name) FILTER (WHERE ti.page_name IS NOT NULL))[1] as page_name
  from offers.tracking_items ti
  group by ti.scan_id, coalesce(nullif(ti.collation_id, ''), nullif(ti.creative_key, ''))
)
select * from base where grouping_key is not null;

-- Top3 por scan
create view offers.v_top3_creatives_by_scan as
select *
from (
  select
    v.scan_id, v.grouping_key, v.media_type, v.first_seen_at, v.last_seen_at, v.ads_count_total,
    v.page_id, v.page_name,
    row_number() over (partition by v.scan_id order by v.ads_count_total desc, v.first_seen_at asc nulls last) as rn
  from offers.v_top_creatives_by_scan v
) t
where t.rn <= 3;

