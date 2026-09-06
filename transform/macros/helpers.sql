{#- Normalise a person/team name for matching: strip accents, lowercase, drop punctuation, squeeze spaces. -#}
{% macro norm_name(expr) -%}
    regexp_replace(regexp_replace(lower(unaccent(translate({{ expr }}, 'ĐđŁłØøÞþÐðĦħŦŧ', 'DdLlOoTtDdHhTt'))), '[^a-z0-9 ]', ' ', 'g'), '\s+', ' ', 'g')
{%- endmacro %}

{#- Last whitespace token of a normalised name (surname heuristic). -#}
{% macro last_token(expr) -%}
    split_part(trim({{ expr }}), ' ', greatest(1, array_length(string_to_array(trim({{ expr }}), ' '), 1)))
{%- endmacro %}

{#- Parse an ESPN clock like "82'" or "45'+2'" into an integer minute. -#}
{% macro espn_minute(expr) -%}
    nullif(substring({{ expr }} from '^(\d+)'), '')::int
{%- endmacro %}

{% macro latest(source_name, entity_name) -%}
    select * from {{ source('raw', 'latest') }} where source = '{{ source_name }}' and entity = '{{ entity_name }}'
{%- endmacro %}

{#- First whitespace token of a normalised name. -#}
{% macro first_token(expr) -%}
    split_part(trim({{ expr }}), ' ', 1)
{%- endmacro %}

{#- Conservative person-name compatibility for entity resolution (both inputs normalised).
    Token-aware so that Spanish/Portuguese full names ("Pablo Fornals Malla", "Shaylon Kallyson Cardozo")
    match their short forms ("Pablo Fornals", "Shaylon"), while same-birthday strangers do not:
      - a surname (last token) of one name must appear as a word in the other name, and
      - the given names must be similar, share an initial, or one given name must appear in the other name;
      - or the whole strings are very similar. -#}
{% macro names_compatible(a, b) -%}
    (
        (
            (
                word_similarity({{ last_token(a) }}, {{ b }}) >= 0.8
                or word_similarity({{ last_token(b) }}, {{ a }}) >= 0.8
            )
            and (
                similarity({{ first_token(a) }}, {{ first_token(b) }}) >= 0.4
                or left({{ first_token(a) }}, 1) = left({{ first_token(b) }}, 1)
                or word_similarity({{ first_token(a) }}, {{ b }}) >= 0.8
                or word_similarity({{ first_token(b) }}, {{ a }}) >= 0.8
            )
        )
        or similarity({{ a }}, {{ b }}) >= 0.7
    )
{%- endmacro %}

{#- Overall similarity score used for ranking candidates. -#}
{% macro name_score(a, b) -%}
    greatest(similarity({{ a }}, {{ b }}), word_similarity({{ a }}, {{ b }}), word_similarity({{ b }}, {{ a }}))
{%- endmacro %}

{#- Text → numeric, tolerating blanks and stray symbols. -#}
{% macro safe_numeric(expr) -%}
    nullif(regexp_replace({{ expr }}, '[^0-9.\-]', '', 'g'), '')::numeric
{%- endmacro %}

{#- Text → date, tolerating blanks and trailing times. -#}
{% macro safe_date(expr) -%}
    nullif(left({{ expr }}, 10), '')::date
{%- endmacro %}


{#- Last completed match date in the data. Window-based marts anchor to this rather than the wall clock,
    so a rebuild on a quiet day does not shift the windows and the published snapshot is self-consistent. -#}
{% macro data_horizon() -%}
(select max(match_date) from {{ ref('fct_match') }} where is_completed)
{%- endmacro %}
