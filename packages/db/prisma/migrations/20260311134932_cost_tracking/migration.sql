-- CreateIndex
CREATE INDEX "cost_events_projectId_createdAt_idx" ON "cost_events"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "cost_events_projectId_stage_idx" ON "cost_events"("projectId", "stage");
