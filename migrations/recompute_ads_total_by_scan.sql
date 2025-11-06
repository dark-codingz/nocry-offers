-- Recalcular ads_total por cluster_id e scan_id (evitar "herdar" de outros scans)
-- Execute após cada scan para garantir contagem correta

UPDATE offers.tracking_clusters c
SET ads_total = sub.cnt
FROM (
  SELECT 
    c.id as cluster_id,
    c.scan_id,
    COUNT(tci.item_id)::int as cnt
  FROM offers.tracking_clusters c
  JOIN offers.tracking_cluster_items tci ON tci.cluster_id = c.id
  GROUP BY c.id, c.scan_id
) sub
WHERE c.id = sub.cluster_id
  AND c.scan_id = sub.scan_id;

-- Verificação opcional
-- SELECT scan_id, COUNT(*) as total_clusters, SUM(ads_total) as total_ads 
-- FROM offers.tracking_clusters 
-- WHERE scan_id = '<scan_id>' 
-- GROUP BY scan_id;

