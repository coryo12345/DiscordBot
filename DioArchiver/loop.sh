#!/bin/sh
until npm start; do
	echo "Bot crashed. Respawning..">&2
	sleep 10s
done
