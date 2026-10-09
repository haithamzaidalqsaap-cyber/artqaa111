#!/bin/bash
set -e
npm install
npm --workspace=@workspace/api-server exec prisma generate -- --schema=artifacts/api-server/prisma/schema.prisma
