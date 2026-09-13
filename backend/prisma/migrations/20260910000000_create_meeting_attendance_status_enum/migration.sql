DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MeetingAttendanceStatus') THEN
    CREATE TYPE "MeetingAttendanceStatus" AS ENUM ('draft', 'open', 'closed', 'finalized');
  END IF;
END $$;
