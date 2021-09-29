from infi.clickhouse_orm import migrations

from ee.clickhouse.sql.person import KAFKA_PERSONS_TABLE_SQL, PERSONS_TABLE_MV_SQL
from posthog.settings import CLICKHOUSE_CLUSTER

operations = [
    migrations.RunSQL(f"DROP TABLE person_mv "),
    migrations.RunSQL(f"DROP TABLE kafka_person "),
    migrations.RunSQL(f"ALTER TABLE person  DROP COLUMN IF EXISTS distinct_ids"),
    migrations.RunSQL(KAFKA_PERSONS_TABLE_SQL),
    migrations.RunSQL(PERSONS_TABLE_MV_SQL),
]
