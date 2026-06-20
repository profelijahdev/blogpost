#!/bin/bash
while true; do
  curl -s -o /dev/null http://localhost:3000 2>/dev/null
  sleep 8
done
