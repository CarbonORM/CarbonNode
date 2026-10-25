# Security hub review — 2026-10-25

The complete caller-visible inventory contains 72 CarbonORM/CarbonNode findings: 49 marked fixed and 23 open. Repository-name and repository-ID filters returned zero records, so the unfiltered inventory was retrieved and every repository URL checked. There is no next page. Review base: `64df113` (origin/main); PR #61 originally used an older 6.3.1 tree.

All 18 open repository-scan findings already have remediation on current main in [7.0.0](security-remediation-7.0.0.md) and [7.0.2](security-remediation-7.0.2.md). Their historical report status does not reflect the current implementation. This review preserves those fixes and adds explicit tests for column-looking route identities alongside client WHERE clauses for GET/PUT/DELETE, plus the reference-versus-LIT contract in MySQL and PostgreSQL.

PR #61's implicit RHS literal conversion is superseded: AGENTS.md requires bare strings to remain references and LIT to denote string data. Route keys are already composed as authoritative bound literals. Context-dependent JOIN/WHERE grammar is not introduced. The other four open commit findings concern documented trusted source expressions, intentional UUIDv7 identifiers, and historical CRUD export migration; they are not silently treated as fixed vulnerabilities.

## Complete inventory

| Finding | Hub status | Review |
| --- | --- | --- |
| Generated SQL views are exposed through REST GET (commit:e97abbab979c81919a60c4cf124fcea8) | fixed | Existing fixed status retained; no reopening. |
| Arbitrary column names inject code into generated tests (commit:eb39fca72d908191bcabb013bb232d8c) | fixed | Existing fixed status retained; no reopening. |
| Raw DDL in generated tests enables TS code injection (commit:3c8c19267e148191aec4097bf54a92bd) | fixed | Existing fixed status retained; no reopening. |
| Raw SQL schema embedded in generated TypeScript (commit:8b1748000ed48191ba49e2d74d589611) | fixed | Existing fixed status retained; no reopening. |
| Direct SQL executor allows SQL injection (commit:79f7366a714081918f746e0192066867) | fixed | Existing fixed status retained; no reopening. |
| Express handler exposes SQL injection via REST input (commit:193458e6ef4c81918e7e2e1ba329d5b0) | fixed | Existing fixed status retained; no reopening. |
| GET response cache can leak data across users (commit:0b179146da7c81918e055856da640955) | fixed | Existing fixed status retained; no reopening. |
| PUT/DELETE primary-key check falls through to table-wide SQL (commit:6e269a9f0a948191877acb6bacb9bb2e) | fixed | Existing fixed status retained; no reopening. |
| POST upsert builder allows SQL injection (commit:7628e723949c81919673e6ee74dbb48d) | fixed | Existing fixed status retained; no reopening. |
| Object WHERE values can drop DELETE filters (commit:32f08f03d328819186b381378ec1bdb2) | fixed | Existing fixed status retained; no reopening. |
| Column-like values bypass WHERE parameter binding (commit:f7f9e7a7b08c8191bb9ba46e528e75d8) | new | Canonical references preserved; route identity is explicitly bound; regression expanded. |
| Aliased reference check permits suffixed raw SQL (commit:e38e47b4328c8191bfd56cc7d06939a3) | fixed | Existing fixed status retained; no reopening. |
| JOIN aliases can be trusted as raw SQL references (commit:787b25949f388191b225f3773a792ad1) | fixed | Existing fixed status retained; no reopening. |
| PUT UPDATE column names allow SQL injection (commit:d6884fc804748191b6018c55ca11984a) | fixed | Existing fixed status retained; no reopening. |
| GitHub Actions shell injection can expose npm token (commit:42746a6b4888819180653f6a6aa8eff3) | fixed | Existing fixed status retained; no reopening. |
| Unpinned third-party action in npm publish workflow (commit:119357fc70e881918b40d0572f08d551) | fixed | Existing fixed status retained; no reopening. |
| Extended query parser exposes GET SQL injection (commit:676ec08a5aac8191b8e3b53a85ac44a0) | fixed | Existing fixed status retained; no reopening. |
| Client WHERE can override URL primary key (commit:5c04fe5b24848191a48ff1b9a8e553e1) | fixed | Existing fixed status retained; no reopening. |
| No-WHERE PUT/DELETE can execute after 400 response (commit:bc40b75566688191aa1b472e670f212c) | fixed | Existing fixed status retained; no reopening. |
| FQ primary keys can trigger unscoped complex PUTs (commit:0ccfd70206ac81919c24f850b762f729) | fixed | Existing fixed status retained; no reopening. |
| URL primary key can be overridden in singular writes (commit:d065f64b43f08191b0ebe5d719dde4ba) | fixed | Existing fixed status retained; no reopening. |
| Unvalidated subselect FROM enables SQL injection (commit:9fcabbe16e648191b8866138d618bade) | fixed | Existing fixed status retained; no reopening. |
| 32-bit cache keys allow cross-query response collisions (commit:77b33808f8448191bcfe3274384f17ff) | fixed | Existing fixed status retained; no reopening. |
| DELETE marker can turn singular deletes into full-table deletes (commit:68c3377b1fbc8191a9051ee75904fb87) | fixed | Existing fixed status retained; no reopening. |
| Server-side GET cache can leak cross-user data (commit:0bec1b9ef33c8191bafc9438104b988a) | fixed | Existing fixed status retained; no reopening. |
| SQL GET cache leaks across selected databases (commit:337ade4e19988191a04249c8a2ca78ef) | fixed | Existing fixed status retained; no reopening. |
| SQL response limits are checked only after drivers materialize the complete result (rf_wfr_15ea24ee9b28180252102acae57869ea28becc93d219881bd71035c1be54d974:wfo_f7f0e84836b8a9c4f102171019fd7f09ecb05c1035a6775b4669b6dba2918004:occ_370593670d7814d5b1f79700) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Published generator can implicitly acquire and execute an unpinned npx package (rf_wfr_15ea24ee9b28180252102acae57869ea28becc93d219881bd71035c1be54d974:wfo_f7f0e84836b8a9c4f102171019fd7f09ecb05c1035a6775b4669b6dba2918004:occ_cb6ec29ea74069fe3e94b300) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| MySQL REST mutations are not bounded by the configured statement timeout (rf_wfr_15ea24ee9b28180252102acae57869ea28becc93d219881bd71035c1be54d974:wfo_f7f0e84836b8a9c4f102171019fd7f09ecb05c1035a6775b4669b6dba2918004:occ_de9e63540beca5c0e591d9fa) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Generator executes PATH-selected database clients with database credentials (rf_wfr_15ea24ee9b28180252102acae57869ea28becc93d219881bd71035c1be54d974:wfo_f7f0e84836b8a9c4f102171019fd7f09ecb05c1035a6775b4669b6dba2918004:occ_f9353509485bb876dc25ebe1) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Cache-enabled requests can grow a process-global cache without bound (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_2ef0ff146c636ebbc4d953af) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| PostgreSQL view names can escape the generated output directory (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_53ebab5ecc916f28aeb585e9) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Composite-key requests discard the URL identity (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_83d1edcbd788e6b91c1128ea) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Generic REST queries can invoke unrestricted database functions (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_8a79a17a8d29bc85f1d12281) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Recursive query grammar has no depth or complexity budget (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_8e3686f3f89c196e39f3c786) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Caller pagination can remove the default limit and request unbounded results (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_a077f4b616a8728e0fa04011) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Interactive setup echoes and persists database passwords in cleartext (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_c6c814a9ec14178aba3033fc) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Unencoded primary keys can retarget HTTP operations (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_efad5178882e7398f04cd761) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| HTTP requests start even when beforeExecution authorization rejects (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_f70d51547ed84b237df42588) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Generated bindings expose trigger DDL and definers (commit:a70f6d1e9fec8191b1b9c0dad09266a5) | fixed | Existing fixed status retained; no reopening. |
| PostgreSQL subselect placeholders are not renumbered (commit:a7f6312ca7b48191b5f234bfd15b6bb0) | fixed | Existing fixed status retained; no reopening. |
| Global REST cache can leak GET responses across contexts (commit:c1ed61aa51588191af7ed417a7677bf9) | fixed | Existing fixed status retained; no reopening. |
| Shell injection in generateRestBindings mysqldump command (commit:8cb494223e548191b944decd08dc1888) | fixed | Existing fixed status retained; no reopening. |
| Raw prefix interpolation in generated C6 source (commit:c7aa83ba685481919089551b9fb1d621) | fixed | Existing fixed status retained; no reopening. |
| Raw restUrlExpression enables generated-code injection (commit:43346ba5b0e48191a184132b64b82b9e) | new | Trusted TypeScript source option; never accept from request input (README contract). |
| REST responses disclose generated SQL and errors (commit:4fe4b045620481918bb2248d4d474de6) | fixed | Existing fixed status retained; no reopening. |
| Recursive dependency fetch can amplify requests (commit:73f9e0414e688191b50a0d5b98c3111d) | fixed | Existing fixed status retained; no reopening. |
| Publish workflow now runs on all main-branch pushes (commit:d247dad894408191bdd1ba52202f7533) | fixed | Existing fixed status retained; no reopening. |
| Generator writes DB credentials into tracked output (commit:722d5350f8d48191a568511a64f05fd3) | fixed | Existing fixed status retained; no reopening. |
| Websocket broadcasts expose write payload contents (commit:7be7d28324b08191a1bc6ab46864cd50) | fixed | Existing fixed status retained; no reopening. |
| Client debug flag can force sensitive SQL debug logging (commit:c88dccd2d9148191b22ff9ee2d7e8958) | fixed | Existing fixed status retained; no reopening. |
| Mutable SQL hook can bypass SQL allowlist (commit:b6bed62f5f888191898c01fb2d483a86) | fixed | Existing fixed status retained; no reopening. |
| Express REST handler exposes raw exception messages (commit:cf36968859988191a46c5892f2dcd80c) | fixed | Existing fixed status retained; no reopening. |
| End-to-end REST test servers bind to all interfaces without authentication (rf_wfr_15ea24ee9b28180252102acae57869ea28becc93d219881bd71035c1be54d974:wfo_f7f0e84836b8a9c4f102171019fd7f09ecb05c1035a6775b4669b6dba2918004:occ_21f5b80bcb8e35c2de92f72a) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Failed online schema acquisition silently reuses an existing dump (rf_wfr_15ea24ee9b28180252102acae57869ea28becc93d219881bd71035c1be54d974:wfo_f7f0e84836b8a9c4f102171019fd7f09ecb05c1035a6775b4669b6dba2918004:occ_31fb421f28a3708010a54640) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Malformed HTTP mutations log the complete request at the default error level (rf_wfr_15ea24ee9b28180252102acae57869ea28becc93d219881bd71035c1be54d974:wfo_f7f0e84836b8a9c4f102171019fd7f09ecb05c1035a6775b4669b6dba2918004:occ_758c112cad41f4e57e5562f9) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Browser HTTP responses are size-checked only after Axios materializes them (rf_wfr_15ea24ee9b28180252102acae57869ea28becc93d219881bd71035c1be54d974:wfo_f7f0e84836b8a9c4f102171019fd7f09ecb05c1035a6775b4669b6dba2918004:occ_defb7ada2f595b2dcc803dc7) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Remote request values can forge warning and error logs (rf_wfr_84ba607ad8e537d2912da5ede7e8abe15dc4837c9afcc111c8347d9edfbea11f:wfo_2e4e3af946e8d735749c37209258d1d74b6c1880662032150d83e7d1ca4870a3:occ_93e3e3002d114bb0879b9307) | new | Already remediated on current main; see linked 7.0.0/7.0.2 evidence. |
| Postinstall silently rewrites Git hooks path (commit:9fc0bcfbb3c88191938e2360d57fe938) | fixed | Existing fixed status retained; no reopening. |
| C6.IMPORT table allowlist bypass via prototype keys (commit:ec66ad1f5b408191af9b3c0cae9ba993) | fixed | Existing fixed status retained; no reopening. |
| SQL statements now logged at INFO level (commit:4677dcf0385c819180ef1ec7d4ca90d1) | fixed | Existing fixed status retained; no reopening. |
| UUIDv7 primary keys expose creation timestamps (commit:93e135694980819184fb02fe8d96e1e2) | new | Intentional UUIDv7 format; supply an opaque application key where required. |
| Package type breaks CommonJS build entry (commit:05623a2e0c84819199e9f445a5b1cde5) | fixed | Existing fixed status retained; no reopening. |
| Published generateRestBindings bin fails without shebang (commit:7297a469e2c0819189c14746c50a7add) | fixed | Existing fixed status retained; no reopening. |
| Generated CRUD named exports removed (commit:52bd188c97a08191891acd4acf30c501) | new | Historical API migration; use named table objects to avoid ambiguous shared barrels. |
| Raw restUrlExpression injects generated TypeScript (commit:b3fdd7f84ae08191aa48ba62b98004d8) | new | Trusted TypeScript source option; never accept from request input (README contract). |
| Public C6 model type rename breaks TypeScript consumers (commit:f9f651aaa490819188441f0ff7d72d8e) | fixed | Existing fixed status retained; no reopening. |
| Hook setup script still checks removed pre-push hook (commit:0747ebcdcbd081918dd1666a4c874694) | fixed | Existing fixed status retained; no reopening. |
| Post-commit build no longer blocks bad commits (commit:fb83a6baef0881918472d49297e4dc7f) | fixed | Existing fixed status retained; no reopening. |
| No security issue; no-db generation flag regressed (commit:22ace417cf248191aa9096e3880613fc) | fixed | Existing fixed status retained; no reopening. |
| Pagination next callback repeats the same page (commit:21fcae94a14c8191be1842d39196cd5d) | fixed | Existing fixed status retained; no reopening. |
| getEnvDebug ignores new process-first precedence (commit:062d25753a248191a43f463ade3b9248) | fixed | Existing fixed status retained; no reopening. |

## Validation

Full `npm test -- --maxWorkers=2 --minWorkers=2` passed: build, live MySQL binding generation, native Node tooling tests, and 365 Vitest tests passed; two optional PostgreSQL tests skipped. `npx tsc --noEmit --skipLibCheck` and `git diff --check` passed. Machine-specific regenerated database fixture changes were excluded. Historical repository-scan records are not closed through the commit-only close API. No package release or deployment is implied by this review.

