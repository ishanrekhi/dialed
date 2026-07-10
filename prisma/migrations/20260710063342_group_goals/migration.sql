-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "groupGoalId" TEXT;

-- CreateTable
CREATE TABLE "GroupGoal" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recurrence" "Recurrence" NOT NULL,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupGoal_groupId_idx" ON "GroupGoal"("groupId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_groupGoalId_fkey" FOREIGN KEY ("groupGoalId") REFERENCES "GroupGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGoal" ADD CONSTRAINT "GroupGoal_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
