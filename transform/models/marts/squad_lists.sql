{#- Every row of every published squad list, resolved to a player key where the name matched (see int_squad_calls). -#}
select c.window_id, w.announcement_date, w.label_es, w.label_en, c.player_name, c.club_at_call, c.pos_group, c.status, c.player_key, c.resolution
from {{ ref('int_squad_calls') }} c
join {{ ref('fifa_windows') }} w using (window_id)
order by w.announcement_date, c.pos_group, c.player_name
