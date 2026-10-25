# CarbonNode 7.0.2 verification-scan remediation

The verification scan `wfr_15ea24ee9b28180252102acae57869ea28becc93d219881bd71035c1be54d974` examined merged 7.0.1 commit `bfbc55a78d1aaa4dadd9f4cab17375948f9df1e7`. Its eight additional findings are addressed here.

| Finding | Remediation |
| --- | --- |
| SQL drivers accumulate oversized results before final size checks (`occ_370593670d7814d5b1f79700`) | Count incoming plaintext transport bytes using a listener installed before native mysql2/pg packet parsing. On overflow, destroy the transport and retire the connection; retain the final JSON size check. REST requires a supported transport and fails closed otherwise. Compressed mysql2 connections require a trusted decoded-stream adapter. |
| Generator can acquire an unpinned compiler through npx (`occ_cb6ec29ea74069fe3e94b300`) | TypeScript 5.9.2 is an exact runtime dependency. Execute its resolved local compiler through the current Node executable; no npx or registry acquisition. Empty generated table/view barrels explicitly export an empty module so schemas without those relation kinds still validate. The core registry maps relation names to row interfaces, including single-table schemas, instead of treating row columns as relation names. |
| MySQL writes lack an effective execution deadline (`occ_de9e63540beca5c0e591d9fa`) | Reserve a separate authenticated cancellation connection before DML starts, even when the application pool is saturated. At the deadline, issue KILL CONNECTION for the target session, retire it, reject the request, and prevent commit. Native InnoDB lock-blocked mutation regression verifies unchanged data after the lock is released. |
| Credential-bearing database clients are selected through ambient PATH (`occ_f9353509485bb876dc25ebe1`) | Resolve executable files from fixed installation directories or explicit absolute client flags, and sanitize child PATH. No ambient PATH lookup. |
| Unauthenticated database test servers listen on all interfaces (`occ_21f5b80bcb8e35c2de92f72a`) | Bind both end-to-end Express test servers explicitly to 127.0.0.1; assert the actual listening address. |
| Online generator silently reuses stale schema/metadata after failure (`occ_31fb421f28a3708010a54640`) | Fail online generation after dump or metadata acquisition failure. Preserve an existing dump without treating it as fresh. Offline reuse requires explicit --no-db 1 or C6_NO_DB=1. Detect MariaDB client version to avoid unsupported MySQL-only dump flags. |
| Malformed mutations expose request values in default logs (`occ_758c112cad41f4e57e5562f9`) | Log and throw a fixed missing-identity diagnostic without payload values. |
| Browser HTTP responses buffer before the cap (`occ_defb7ada2f595b2dcc803dc7`) | Select Axios fetch streaming in browsers. Count received bytes before decoding or JSON parsing; abort and cancel oversized streams. Cache only validated, parsed response promises. Node explicitly selects Axios's capped HTTP adapter. |

## Trusted adapters and tooling

Native mysql2 and pg transports are supported. Custom drivers must provide `sqlResponseStream(connection)` with a plaintext byte stream whose `prependListener` runs before row parsing and whose `destroy` terminates receipt. Generic REST rejects missing transports. Direct trusted executors can retain an independently bounded custom transport. Transport accounting includes SQL protocol overhead; the limit may reject a result slightly below its JSON-size cap. Native socket receipt can overshoot by the current socket chunk, but does not accumulate an unbounded result.

Custom MySQL connections must provide `mysqlCancellation(connection)`, reserving an independent channel before execution and implementing server-side session cancellation plus cleanup. Same-user native sessions use KILL CONNECTION. Administrative grants are not required for canceling the authenticated account's own sessions. Transactional engines roll back terminated sessions; nontransactional tables retain their ordinary partial-write semantics. See the [MySQL KILL documentation](https://dev.mysql.com/doc/refman/8.0/en/kill.html).

Generator overrides are `--mysql-client`, `--mysqldump-client`, `--psql-client`, and `--pg-dump-client`, each followed by a trusted absolute executable path. Windows installations must supply these overrides. TypeScript is installed with production dependencies, so generated binding validation works without installing development dependencies or using network acquisition.

## Validation

Regression coverage exercises bounded browser streams, split UTF-8 decoding, shared parsed cache promises, error eviction, malformed mutation redaction, unsupported/compressed SQL transports, cancellation ordering and late driver completion, native live MySQL oversized results, and native live MySQL lock-blocked transactions. Generator subprocess tests cover hostile PATH, explicit offline reuse, online dump failure with preserved prior files, and local compiler resolution. The full npm test gate includes build, live schema/binding generation, and the existing SQL/HTTP end-to-end suites.

Historical repository-scan findings may remain visible in Security Cloud. The available close API requires commit-scan identifiers and does not close repository-scan records; this report records remediation without claiming those historical records were removed.

The completed local gate passed 360 tests; two optional live PostgreSQL cases skipped because no live PostgreSQL fixture was configured. Source typecheck passed. Built CommonJS verification also exercised native write cancellation/rollback, SQL transport overflow/pool recovery, the deep grammar guard, and real Axios fetch streaming cancellation against a loopback HTTP fixture.
