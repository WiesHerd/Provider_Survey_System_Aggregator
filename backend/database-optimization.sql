-- Database Optimization Scripts for Survey Aggregator
-- Run these scripts to improve performance for large datasets

-- 1. Add indexes for specialty mapping queries
CREATE INDEX IF NOT EXISTS idx_survey_data_specialty ON survey_data(specialty);
CREATE INDEX IF NOT EXISTS idx_survey_data_survey_id ON survey_data(surveyId);
CREATE INDEX IF NOT EXISTS idx_survey_data_provider_type ON survey_data(providerType);
CREATE INDEX IF NOT EXISTS idx_survey_data_region ON survey_data(region);

-- 2. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_survey_data_specialty_survey ON survey_data(specialty, surveyId);
CREATE INDEX IF NOT EXISTS idx_survey_data_provider_survey ON survey_data(providerType, surveyId);

-- 3. Add indexes for surveys table
CREATE INDEX IF NOT EXISTS idx_surveys_type ON surveys(type);
CREATE INDEX IF NOT EXISTS idx_surveys_year ON surveys(year);
CREATE INDEX IF NOT EXISTS idx_surveys_upload_date ON surveys(uploadDate);

-- 4. Add full-text search index for specialty names (if supported)
-- CREATE FULLTEXT INDEX idx_survey_data_specialty_ft ON survey_data(specialty);

-- 5. Add statistics for query optimization
ANALYZE TABLE survey_data;
ANALYZE TABLE surveys;

-- 6. Create a view for common specialty queries
CREATE OR REPLACE VIEW specialty_summary AS
SELECT 
    s.id as survey_id,
    s.name as survey_name,
    s.type as survey_type,
    s.year as survey_year,
    sd.specialty,
    COUNT(*) as specialty_count,
    AVG(sd.tcc) as avg_tcc,
    AVG(sd.cf) as avg_cf,
    AVG(sd.wrvu) as avg_wrvu
FROM surveys s
JOIN survey_data sd ON s.id = sd.surveyId
GROUP BY s.id, s.name, s.type, s.year, sd.specialty;

-- 7. Create a materialized view for specialty mapping (if supported)
-- CREATE MATERIALIZED VIEW specialty_mapping_summary AS
-- SELECT 
--     specialty,
--     COUNT(DISTINCT surveyId) as survey_count,
--     COUNT(*) as total_records,
--     AVG(tcc) as avg_tcc,
--     AVG(cf) as avg_cf,
--     AVG(wrvu) as avg_wrvu
-- FROM survey_data
-- GROUP BY specialty;

-- 8. Add constraints for data integrity
ALTER TABLE survey_data ADD CONSTRAINT chk_tcc_positive CHECK (tcc >= 0);
ALTER TABLE survey_data ADD CONSTRAINT chk_cf_positive CHECK (cf >= 0);
ALTER TABLE survey_data ADD CONSTRAINT chk_wrvu_positive CHECK (wrvu >= 0);
ALTER TABLE survey_data ADD CONSTRAINT chk_count_positive CHECK (count >= 0);

-- 9. Add foreign key constraints (if not already present)
ALTER TABLE survey_data ADD CONSTRAINT fk_survey_data_survey 
    FOREIGN KEY (surveyId) REFERENCES surveys(id) ON DELETE CASCADE;

-- 10. Create a function for specialty normalization
DELIMITER //
CREATE FUNCTION normalize_specialty(specialty_name VARCHAR(255))
RETURNS VARCHAR(255)
DETERMINISTIC
BEGIN
    DECLARE normalized VARCHAR(255);
    
    -- Convert to lowercase and trim
    SET normalized = LOWER(TRIM(specialty_name));
    
    -- Common abbreviations
    SET normalized = REPLACE(normalized, 'cardio', 'cardiology');
    SET normalized = REPLACE(normalized, 'ortho', 'orthopedics');
    SET normalized = REPLACE(normalized, 'peds', 'pediatrics');
    SET normalized = REPLACE(normalized, 'ob/gyn', 'obstetrics and gynecology');
    SET normalized = REPLACE(normalized, 'obgyn', 'obstetrics and gynecology');
    SET normalized = REPLACE(normalized, 'er', 'emergency medicine');
    SET normalized = REPLACE(normalized, 'ed', 'emergency medicine');
    SET normalized = REPLACE(normalized, 'icu', 'critical care');
    SET normalized = REPLACE(normalized, 'intensivist', 'critical care');
    
    -- Remove common suffixes
    SET normalized = REPLACE(normalized, ' medicine', '');
    SET normalized = REPLACE(normalized, ' surgery', '');
    SET normalized = REPLACE(normalized, ' - general', '');
    SET normalized = REPLACE(normalized, ' - clinical', '');
    
    RETURN normalized;
END //
DELIMITER ;

-- 11. Create a stored procedure for batch specialty updates
DELIMITER //
CREATE PROCEDURE update_specialty_mappings(
    IN old_specialty VARCHAR(255),
    IN new_specialty VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE survey_data 
    SET specialty = new_specialty 
    WHERE specialty = old_specialty;
    
    COMMIT;
END //
DELIMITER ;

-- 12. Create a view for unmapped specialties
CREATE OR REPLACE VIEW unmapped_specialties AS
SELECT DISTINCT
    specialty,
    COUNT(*) as frequency,
    COUNT(DISTINCT surveyId) as survey_count,
    GROUP_CONCAT(DISTINCT surveyId) as survey_ids
FROM survey_data
WHERE specialty NOT IN (
    SELECT DISTINCT standardizedName 
    FROM specialty_mappings
)
GROUP BY specialty
ORDER BY frequency DESC;

-- 13. Performance monitoring queries
-- Query to check index usage
SELECT 
    table_name,
    index_name,
    cardinality,
    sub_part,
    packed,
    null,
    index_type,
    comment
FROM information_schema.statistics 
WHERE table_schema = DATABASE()
AND table_name IN ('survey_data', 'surveys')
ORDER BY table_name, index_name;

-- Query to check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
    table_rows
FROM information_schema.tables 
WHERE table_schema = DATABASE()
AND table_name IN ('survey_data', 'surveys')
ORDER BY (data_length + index_length) DESC;

-- 14. Cleanup and maintenance
-- Remove duplicate specialties (if any)
DELETE sd1 FROM survey_data sd1
INNER JOIN survey_data sd2 
WHERE sd1.id > sd2.id 
AND sd1.specialty = sd2.specialty 
AND sd1.surveyId = sd2.surveyId;

-- 15. Add partitioning for large tables (if needed)
-- ALTER TABLE survey_data PARTITION BY RANGE (YEAR(uploadDate)) (
--     PARTITION p2020 VALUES LESS THAN (2021),
--     PARTITION p2021 VALUES LESS THAN (2022),
--     PARTITION p2022 VALUES LESS THAN (2023),
--     PARTITION p2023 VALUES LESS THAN (2024),
--     PARTITION p2024 VALUES LESS THAN (2025),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );
