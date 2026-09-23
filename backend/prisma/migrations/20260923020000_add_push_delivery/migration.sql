ALTER TABLE "Notification" ADD COLUMN "pushProcessedAt" TIMESTAMP(3);
UPDATE "Notification" SET "pushProcessedAt" = CURRENT_TIMESTAMP;
CREATE INDEX "Notification_pushProcessedAt_createdAt_idx" ON "Notification"("pushProcessedAt", "createdAt");
CREATE TABLE "PushDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "ticketId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushDelivery_notificationId_installationId_key" ON "PushDelivery"("notificationId", "installationId");
CREATE INDEX "PushDelivery_completedAt_nextAttemptAt_idx" ON "PushDelivery"("completedAt", "nextAttemptAt");
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "PushInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
