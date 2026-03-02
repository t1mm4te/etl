#!/bin/bash
set -e

echo "Ожидание PostgreSQL..."
while ! python -c "
import socket, os
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.connect((os.environ.get('DB_HOST', 'db'), int(os.environ.get('DB_PORT', 5432))))
    s.close()
    exit(0)
except Exception:
    exit(1)
" 2>/dev/null; do
    sleep 1
done
echo "PostgreSQL доступен."

echo "Применяю миграции..."
python manage.py migrate --noinput

echo "Собираю статику..."
python manage.py collectstatic --noinput

exec "$@"
