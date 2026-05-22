-- wisecode_app.food_normalized_scores
--
-- Denormalized food×code score matrix for fast weighted-aggregate browse.
-- food_id PK, one REAL column per code (column name = food_expressions.code).
-- Membership: every food with fully_parsed = TRUE. Scores from
-- food_expression_foods; entries for non-fully-parsed foods are ignored.
--
-- Re-runnable: syncs the food_id set, adds columns for new codes, refreshes
-- existing column data, writes only rows whose value actually changed.
--
-- Per-code refresh runs as two statements instead of one self-joining UPDATE:
--   3a. clear stale values (rows whose fef entry was deleted)
--   3b. set/refresh values from fef
-- This avoids materializing a ~1M-row intermediate driven from fns and joining
-- it back to fns by food_id (i.e., scanning fns twice per code). Both 3a/3b
-- use the existing pk_food_expression_foods (food_expression_id, food_id)
-- index for efficient seeks; no self-join on food_normalized_scores.

DO $$
DECLARE
    code_rec RECORD;
    sql_text TEXT;
BEGIN
    -- 1. Ensure the table exists with just the PK column.
    CREATE TABLE IF NOT EXISTS wisecode_app.food_normalized_scores (
        food_id UUID PRIMARY KEY
            REFERENCES wisecode_gold.food(id) ON DELETE CASCADE
    );

    -- 2a. Drop rows for foods that are no longer fully_parsed
    --     (food deletion is already handled by ON DELETE CASCADE).
    DELETE FROM wisecode_app.food_normalized_scores fns
    WHERE NOT EXISTS (
        SELECT 1 FROM wisecode_gold.food f
        WHERE  f.id = fns.food_id AND f.fully_parsed = TRUE
    );

    -- 2b. Add rows for every fully_parsed food (regardless of whether it
    --     has scores yet — score columns will be NULL until populated).
    INSERT INTO wisecode_app.food_normalized_scores (food_id)
    SELECT id
    FROM   wisecode_gold.food
    WHERE  fully_parsed = TRUE
    ON CONFLICT (food_id) DO NOTHING;

    -- 3. For each code in food_expressions: ADD COLUMN IF NEW, then two-statement
    --    refresh. The driver is fef (filtered to this code), not fns — so fns
    --    is only seek-touched by PK, never seq-scanned.
    FOR code_rec IN
        SELECT id, code
        FROM   wisecode_app.food_expressions
        WHERE  code IS NOT NULL AND TRIM(code) <> ''
        ORDER BY code
    LOOP
        sql_text := format(
            'ALTER TABLE wisecode_app.food_normalized_scores
             ADD COLUMN IF NOT EXISTS %I REAL',
            code_rec.code
        );
        EXECUTE sql_text;

        -- 3a. Clear stale values: rows whose column has a value but no
        --     matching fef row exists for this code anymore. Anti-join
        --     uses pk_food_expression_foods (food_expression_id, food_id).
        --     On a fresh refresh / steady state this touches zero rows.
        sql_text := format(
            'UPDATE wisecode_app.food_normalized_scores fns
             SET %I = NULL
             WHERE %I IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1 FROM wisecode_app.food_expression_foods fef
                   WHERE fef.food_id = fns.food_id
                     AND fef.food_expression_id = $1
               )',
            code_rec.code, code_rec.code
        );
        EXECUTE sql_text USING code_rec.id;

        -- 3b. Set/refresh values from fef. Driven by fef filtered on
        --     food_expression_id (index seek returns ~1.3M rows for an
        --     active code), joined to fns by PK. Scores clamped to [0, 100]
        --     in the subquery so wide-table cells never store out-of-range
        --     values. IS DISTINCT FROM suppresses writes for unchanged rows.
        sql_text := format(
            'UPDATE wisecode_app.food_normalized_scores fns
             SET %I = clamped.value
             FROM (
                 SELECT food_id,
                        CASE
                            WHEN normalized_score < 0   THEN 0::REAL
                            WHEN normalized_score > 100 THEN 100::REAL
                            ELSE normalized_score::REAL
                        END AS value
                 FROM   wisecode_app.food_expression_foods
                 WHERE  food_expression_id = $1
             ) clamped
             WHERE clamped.food_id = fns.food_id
               AND fns.%I IS DISTINCT FROM clamped.value',
            code_rec.code, code_rec.code
        );
        EXECUTE sql_text USING code_rec.id;

        RAISE NOTICE 'Refreshed column %', code_rec.code;
    END LOOP;
END $$;
