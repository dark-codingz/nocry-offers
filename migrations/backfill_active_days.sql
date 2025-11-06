-- Backfill opcional para active_days em tracking_clusters
-- Execute apenas se active_days estiver NULL em alguns registros
-- Este script calcula active_days baseado em first_seen

UPDATE offers.tracking_clusters
SET active_days = GREATEST(
  1,
  (DATE_PART('day', (NOW()::date - first_seen::date)))::int + 0
)
WHERE active_days IS NULL 
  AND first_seen IS NOT NULL;

-- Verificação opcional
-- SELECT COUNT(*) FROM offers.tracking_clusters WHERE active_days IS NULL AND first_seen IS NOT NULL;


