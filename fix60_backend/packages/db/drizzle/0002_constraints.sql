-- Double-booking guard: a provider cannot hold two overlapping active bookings.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("provider_id" WITH =, "slot" WITH &&)
  WHERE ("status" IN ('confirmed', 'service_started') AND "deleted_at" IS NULL);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_bounded"
  CHECK (NOT isempty("slot") AND lower_inc("slot") AND NOT upper_inc("slot") AND NOT lower_inf("slot") AND NOT upper_inf("slot"));
--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_bounded"
  CHECK (NOT isempty("during") AND NOT lower_inf("during") AND NOT upper_inf("during"));
--> statement-breakpoint
-- Audit log is append-only, whatever role the application connects as.
CREATE FUNCTION "audit_logs_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "audit_logs_no_update_delete"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_append_only"();
--> statement-breakpoint
CREATE TRIGGER "audit_logs_no_truncate"
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_logs_append_only"();
