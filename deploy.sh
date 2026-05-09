#!/bin/bash
set -e

echo "Building frontend..."
docker compose -f docker-compose.prod.yml --profile build run --rm frontend_builder

echo "Frontend build completed"
echo ""
echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d db redis backend celery nginx

echo "Waiting for services to be healthy..."
sleep 3

echo ""
echo "Production deployment ready!"
echo "Access at: http://localhost:8000"
echo ""
echo "To see logs: docker compose -f docker-compose.prod.yml logs -f"
echo "To stop: docker compose -f docker-compose.prod.yml down"
