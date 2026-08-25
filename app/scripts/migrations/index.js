import { migrate as migrate207, version as version207 } from './207';

// 1Do 2.x intentionally starts from its current state schema and does not
// support upgrading persisted MetaMask-era controller state. Migrations added
// here only apply to 1Do releases and therefore start after the latest fixture
// schema version.
const migrations = [{ version: version207, migrate: migrate207 }];

export default migrations;
