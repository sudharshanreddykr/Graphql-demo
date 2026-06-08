#!/bin/bash

PORT=$1

if [ -z "$PORT" ]; then
  echo "Usage: ./kill-port.sh <port>"
  exit 1
fi

PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
  echo "No process running on port $PORT"
else
  kill -9 $PID
  echo "Killed process $PID on port $PORT"
fi