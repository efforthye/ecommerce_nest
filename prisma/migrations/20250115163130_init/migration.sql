-- AlterTable
ALTER TABLE `UserCoupon` MODIFY `status` ENUM('AVAILABLE', 'USED', 'EXPIRED') NOT NULL;
