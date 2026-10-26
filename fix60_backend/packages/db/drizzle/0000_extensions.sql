-- Geospatial matching (geography points, ST_DWithin) and GiST on scalar + range columns
-- (EXCLUDE constraint for double-booking prevention).
CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;
