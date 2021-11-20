#!/bin/sh
docker build . -t cory/dioarchiver
docker run -t -i -d --name dioarchiver \
    --restart always \
    cory/dioarchiver