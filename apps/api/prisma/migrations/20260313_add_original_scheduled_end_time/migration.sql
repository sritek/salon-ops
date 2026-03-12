-- Add field to store original scheduled end time (before any shifting due to late start)
ALTER TABLE appointments ADD COLUMN original_scheduled_end_time VARCHAR(5);

-- For existing appointments, set it to the current scheduled_end_time
UPDATE appointments SET original_scheduled_end_time = scheduled_end_time WHERE original_scheduled_end_time IS NULL;

-- Make it non-nullable going forward
ALTER TABLE appointments ALTER COLUMN original_scheduled_end_time SET NOT NULL;
