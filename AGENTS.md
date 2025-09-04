# Contributor Guidelines


- You have access to a local MySQL instance and test db.
- New features must have proper test coverage.
- Attempt to add coverage to code that is near areas touched too.
- Run `npm test` before each commit. The command MUST pass.
- Check the `.junie/guidelines.md` for more instructions.


### Boot
In AI environments that allow it, like Codex or localhost, this is already configured to run on boot. 
No need to re-run it or other setup instructions included below.

```bash
#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# 1. Install the minimal binaries
apt-get update -qq
apt-get install -yqq --no-install-recommends \
        mysql-server-core-8.0 mysql-client-core-8.0 passwd

# 2. Ensure the mysql system account exists
if ! id -u mysql >/dev/null 2>&1; then
  groupadd --system mysql
  useradd  --system --gid mysql --home /nonexistent \
           --shell /usr/sbin/nologin mysql
fi

# 3. Data directories **and** secure-file-priv directory
mkdir -p /var/lib/mysql            \
         /var/lib/mysql-files      \
         /var/run/mysqld
chown -R mysql:mysql /var/lib/mysql /var/lib/mysql-files /var/run/mysqld
chmod 750 /var/lib/mysql-files     # MySQL expects owner-only access:contentReference[oaicite:1]{index=1}

# 4. Initialise and start detached
mysqld --initialize-insecure --user=root                                # empty root pwd:contentReference[oaicite:2]{index=2}
mysqld --daemonize --user=root \
       --socket=/var/run/mysqld/mysqld.sock \
       --pid-file=/var/run/mysqld/mysqld.pid

# 5. Wait until the server is ready
until mysqladmin --socket=/var/run/mysqld/mysqld.sock ping --silent; do sleep 1; done
#verify
# Should print exactly one mysqld line
ps -fp $(cat /var/run/mysqld/mysqld.pid)
# Fast “is it alive?” check
mysqladmin --socket=/var/run/mysqld/mysqld.sock ping
# →  mysqld is alive

# A few server counters & compile flags
mysqladmin --socket=/var/run/mysqld/mysqld.sock version
       
wget https://downloads.mysql.com/docs/sakila-db.zip
unzip sakila-db.zip
mysql -u root < sakila-db/sakila-schema.sql
mysql -u root < sakila-db/sakila-data.sql       
       
sudo mysql <<'SQL'
-- See how root is authenticated
SELECT user,host,plugin FROM mysql.user WHERE user='root' AND host='localhost'\G

-- If plugin shows 'auth_socket', switch to native with your password:
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';

-- If it already shows 'mysql_native_password', just set it:
-- ALTER USER 'root'@'localhost' IDENTIFIED BY 'password';

FLUSH PRIVILEGES;
SQL

wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" || true
nvm install
nvm use 
npm install

npm run c6

```