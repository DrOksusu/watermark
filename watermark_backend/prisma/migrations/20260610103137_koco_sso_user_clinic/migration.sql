-- koco SSO 통합: User 테이블 externalId 도입 및 Clinic 테이블 신규 추가
-- userId/unifiedToken 제거, externalId(포털 cuid) 추가, provider nullable 변경

-- CreateTable
CREATE TABLE `clinics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DropIndex
DROP INDEX `users_user_id_key` ON `users`;

-- AlterTable: userId/unifiedToken 제거, externalId 추가, provider nullable 변경
ALTER TABLE `users` DROP COLUMN `unified_token`,
    DROP COLUMN `user_id`,
    ADD COLUMN `external_id` VARCHAR(191) NOT NULL DEFAULT '',
    MODIFY `provider` VARCHAR(20) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_external_id_key` ON `users`(`external_id`);

-- AddForeignKey: users.clinic_id -> clinics.id
ALTER TABLE `users` ADD CONSTRAINT `users_clinic_id_fkey` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
