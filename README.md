# mise à jour en prod
cd /home/debian/wik
docker compose build wik-front --no-cache
docker compose up -d
