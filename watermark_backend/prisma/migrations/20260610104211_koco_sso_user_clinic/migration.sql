-- koco SSO 통합: Clinic 신규, User externalId 도입, 4개 모델에 owner_id 컬럼+FK 추가
-- DropIndex
DROP INDEX `users_user_id_key` ON `users`;

-- AlterTable
ALTER TABLE `annotation_templates` ADD COLUMN `owner_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `images` ADD COLUMN `owner_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `logos` ADD COLUMN `owner_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `settings` ADD COLUMN `owner_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `unified_token`,
    DROP COLUMN `user_id`,
    ADD COLUMN `external_id` VARCHAR(191) NOT NULL,
    MODIFY `provider` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `clinics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_external_id_key` ON `users`(`external_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_clinic_id_fkey` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logos` ADD CONSTRAINT `logos_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settings` ADD CONSTRAINT `settings_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annotation_templates` ADD CONSTRAINT `annotation_templates_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

