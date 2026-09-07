{#- Every number the site's rules use, in one table so About the data prints exactly what the models apply:
    score thresholds, position weights per score component, and the importance weights of Movers. -#}
select 'threshold' as kind, name, value::double precision as value, description, null::text as pos_group, null::text as component
from {{ ref('score_thresholds') }}
union all
select 'weight', pos_group || '.' || component, weight::double precision, null, pos_group, component
from {{ ref('score_weights') }}
union all
select 'event_weight', event_type, base_weight::double precision, description, null, null
from {{ ref('event_weights') }}
