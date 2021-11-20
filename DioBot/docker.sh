#!/bin/sh
docker build . -t cory/diobot
docker run -t -i -d --name diobot \
    --restart always \
    -v $(pwd)/data.db:/usr/src/app/data.db \
    cory/diobot