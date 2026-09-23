CREATE TABLE "PushInstallation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushInstallation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushInstallation_expoPushToken_key" ON "PushInstallation"("expoPushToken");
CREATE UNIQUE INDEX "PushInstallation_userId_deviceId_key" ON "PushInstallation"("userId", "deviceId");
CREATE INDEX "PushInstallation_userId_disabledAt_idx" ON "PushInstallation"("userId", "disabledAt");
ALTER TABLE "PushInstallation" ADD CONSTRAINT "PushInstallation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
