-- Add rumor relationships table for DAG-based dependency tracking
-- This enables tracking which rumors depend on other rumors
-- and propagating status changes when a rumor is debunked/deleted

CREATE TABLE IF NOT EXISTS rumor_relationships (
    id SERIAL PRIMARY KEY,
    parent_rumor_id UUID NOT NULL REFERENCES rumors(id) ON DELETE CASCADE,
    child_rumor_id UUID NOT NULL REFERENCES rumors(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'depends_on', -- depends_on, related_to, contradicts
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_rumor_id, child_rumor_id),
    CHECK (parent_rumor_id != child_rumor_id) -- Prevent self-references
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rumor_relationships_parent ON rumor_relationships(parent_rumor_id);
CREATE INDEX IF NOT EXISTS idx_rumor_relationships_child ON rumor_relationships(child_rumor_id);

-- Add columns to rumors table to track dependency status
ALTER TABLE rumors ADD COLUMN IF NOT EXISTS has_dependencies BOOLEAN DEFAULT FALSE;
ALTER TABLE rumors ADD COLUMN IF NOT EXISTS dependency_status VARCHAR(50); -- 'blocked', 'affected', NULL

-- Function to check for circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency(
    p_parent_id UUID,
    p_child_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    has_cycle BOOLEAN;
BEGIN
    -- Use recursive CTE to check if adding this relationship would create a cycle
    WITH RECURSIVE dep_chain AS (
        -- Start with the proposed child
        SELECT child_rumor_id as current_id, 0 as depth
        FROM rumor_relationships
        WHERE parent_rumor_id = p_child_id

        UNION ALL

        -- Recursively find children
        SELECT rr.child_rumor_id, dc.depth + 1
        FROM rumor_relationships rr
        INNER JOIN dep_chain dc ON rr.parent_rumor_id = dc.current_id
        WHERE dc.depth < 10 -- Limit recursion depth
    )
    SELECT EXISTS (
        SELECT 1 FROM dep_chain WHERE current_id = p_parent_id
    ) INTO has_cycle;

    RETURN has_cycle;
END;
$$ LANGUAGE plpgsql;

-- Function to propagate status changes through the DAG
CREATE OR REPLACE FUNCTION propagate_rumor_status() RETURNS TRIGGER AS $$
BEGIN
    -- If a rumor is debunked, mark all dependent rumors as affected
    IF NEW.status = 'Debunked' AND OLD.status != 'Debunked' THEN
        UPDATE rumors
        SET
            dependency_status = 'affected',
            updated_at = NOW()
        WHERE id IN (
            WITH RECURSIVE dependents AS (
                SELECT child_rumor_id as rumor_id
                FROM rumor_relationships
                WHERE parent_rumor_id = NEW.id

                UNION

                SELECT rr.child_rumor_id
                FROM rumor_relationships rr
                INNER JOIN dependents d ON rr.parent_rumor_id = d.rumor_id
            )
            SELECT rumor_id FROM dependents
        );
    END IF;

    -- If a rumor is verified, unblock dependent rumors that were blocked
    IF NEW.status = 'Verified' AND OLD.status != 'Verified' THEN
        UPDATE rumors
        SET
            dependency_status = NULL,
            updated_at = NOW()
        WHERE id IN (
            SELECT child_rumor_id
            FROM rumor_relationships
            WHERE parent_rumor_id = NEW.id
            AND relationship_type = 'depends_on'
        )
        AND dependency_status = 'blocked';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status propagation
DROP TRIGGER IF EXISTS trigger_propagate_rumor_status ON rumors;
CREATE TRIGGER trigger_propagate_rumor_status
    AFTER UPDATE OF status ON rumors
    FOR EACH ROW
    EXECUTE FUNCTION propagate_rumor_status();

-- Function to update has_dependencies flag
CREATE OR REPLACE FUNCTION update_has_dependencies() RETURNS TRIGGER AS $$
BEGIN
    -- Update parent rumor
    UPDATE rumors
    SET has_dependencies = EXISTS (
        SELECT 1 FROM rumor_relationships WHERE parent_rumor_id = rumors.id
    )
    WHERE id = NEW.parent_rumor_id;

    -- Update child rumor
    UPDATE rumors
    SET has_dependencies = EXISTS (
        SELECT 1 FROM rumor_relationships WHERE child_rumor_id = rumors.id
    )
    WHERE id = NEW.child_rumor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for has_dependencies
DROP TRIGGER IF EXISTS trigger_update_has_dependencies ON rumor_relationships;
CREATE TRIGGER trigger_update_has_dependencies
    AFTER INSERT OR DELETE ON rumor_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_has_dependencies();
