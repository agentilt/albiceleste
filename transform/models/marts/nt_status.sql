{#- Hand-kept national-team statuses (retirements) resolved to player keys. -#}
select player_name, status, since, source, player_key from {{ ref('int_nt_status') }}
