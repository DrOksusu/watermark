-- AlterTable
ALTER TABLE `processed_images` ADD COLUMN `owner_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `processed_images` ADD CONSTRAINT `processed_images_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
