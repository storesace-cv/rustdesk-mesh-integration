-- View to normalize device grouping derived from the `notes` field.
-- It splits the first two pipe-separated segments into group/subgroup
-- and flags devices without notes as unassigned.
create or replace view public.android_devices_grouping as
select
  d.id,
  d.device_id,
  d.owner,
  d.mesh_username,
  d.friendly_name,
  d.notes,
  d.last_seen_at,
  d.created_at,
  d.updated_at,
  d.deleted_at,
  coalesce(nullif(trim(split_part(d.notes, '|', 1)), ''), 'Dispositivos por Adotar') as group_name,
  nullif(trim(split_part(d.notes, '|', 2)), '') as subgroup_name,
  (coalesce(trim(d.notes), '') = '') as is_unassigned
from
  public.android_devices d;
