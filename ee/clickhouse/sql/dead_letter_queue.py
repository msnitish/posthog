from ee.kafka_client.topics import KAFKA_DEAD_LETTER_QUEUE
from posthog.settings import CLICKHOUSE_CLUSTER, CLICKHOUSE_DATABASE

from .clickhouse import KAFKA_COLUMNS, REPLACING_MERGE_TREE, kafka_engine, table_engine, ttl_period

# We pipe our Kafka dead letter queue into CH for easier analysis and longer retention
# This allows us to explore errors and replay events with ease

DEAD_LETTER_QUEUE_TABLE = "events_dead_letter_queue"

DEAD_LETTER_QUEUE_TABLE_BASE_SQL = """
CREATE TABLE {table_name} ON CLUSTER {cluster}
(
    id UUID,
    event_uuid UUID,
    event VARCHAR,
    properties VARCHAR,
    distinct_id VARCHAR,
    team_id Int64,
    elements_chain VARCHAR,
    created_at DateTime64(6, 'UTC'),
    failure_timestamp DateTime64(6, 'UTC'),
    error_location VARCHAR,
    error VARCHAR
    {extra_fields}
) ENGINE = {engine}
"""

DEAD_LETTER_QUEUE_TABLE_SQL = (
    DEAD_LETTER_QUEUE_TABLE_BASE_SQL
    + """ORDER BY (id, event_uuid, distinct_id, team_id)
{ttl_period}
SETTINGS index_granularity=512
"""
).format(
    table_name=DEAD_LETTER_QUEUE_TABLE,
    cluster=CLICKHOUSE_CLUSTER,
    extra_fields=KAFKA_COLUMNS,
    engine=table_engine(DEAD_LETTER_QUEUE_TABLE, "_timestamp", REPLACING_MERGE_TREE),
    ttl_period=ttl_period("_timestamp", 12),  # 12 weeks = 3 months
)

KAFKA_DEAD_LETTER_QUEUE_TABLE_SQL = DEAD_LETTER_QUEUE_TABLE_BASE_SQL.format(
    table_name="kafka_" + DEAD_LETTER_QUEUE_TABLE,
    cluster=CLICKHOUSE_CLUSTER,
    engine=kafka_engine(topic=KAFKA_DEAD_LETTER_QUEUE),
    extra_fields="",
)

DEAD_LETTER_QUEUE_TABLE_MV_SQL = """
CREATE MATERIALIZED VIEW {table_name}_mv ON CLUSTER {cluster}
TO {database}.{table_name}
AS SELECT
id,
event_uuid,
event,
properties,
distinct_id,
team_id,
elements_chain,
created_at,
failure_timestamp,
error_location,
error,
_timestamp,
_offset
FROM {database}.kafka_{table_name}
""".format(
    table_name=DEAD_LETTER_QUEUE_TABLE,
    cluster=CLICKHOUSE_CLUSTER,
    database=CLICKHOUSE_DATABASE,
)


INSERT_DEAD_LETTER_QUEUE_EVENT_SQL = """
INSERT INTO events_dead_letter_queue SELECT %(id)s, %(event_uuid)s, %(event)s, %(properties)s, %(distinct_id)s, %(team_id)s, %(elements_chain)s, %(created_at)s, %(failure_timestamp)s, %(error_location)s, %(error)s, 0, now()
"""

DROP_DEAD_LETTER_QUEUE_TABLE_SQL = f"DROP TABLE IF EXISTS {DEAD_LETTER_QUEUE_TABLE} ON CLUSTER {CLICKHOUSE_CLUSTER}"