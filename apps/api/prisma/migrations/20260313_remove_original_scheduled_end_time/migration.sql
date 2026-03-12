-- Remove the originalScheduledEndTime column as it's unnecessary
-- The end time can be recalculated from scheduledTime + totalDuration
ALTER TABLE appointments DROP COLUMN original_scheduled_end_time;
