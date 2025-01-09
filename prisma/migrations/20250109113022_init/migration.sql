/*
  Warnings:

  - You are about to drop the column `cancelledAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `UserCart` table. All the data in the column will be lost.
  - You are about to drop the `CouponHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentHistory` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `BalanceHistory` DROP FOREIGN KEY `BalanceHistory_userBalanceId_fkey`;

-- DropForeignKey
ALTER TABLE `CouponHistory` DROP FOREIGN KEY `CouponHistory_couponId_fkey`;

-- DropForeignKey
ALTER TABLE `CouponHistory` DROP FOREIGN KEY `CouponHistory_userId_fkey`;

-- DropForeignKey
ALTER TABLE `FcfsCoupon` DROP FOREIGN KEY `FcfsCoupon_couponId_fkey`;

-- DropForeignKey
ALTER TABLE `Order` DROP FOREIGN KEY `Order_couponId_fkey`;

-- DropForeignKey
ALTER TABLE `Order` DROP FOREIGN KEY `Order_userId_fkey`;

-- DropForeignKey
ALTER TABLE `OrderItem` DROP FOREIGN KEY `OrderItem_optionVariantId_fkey`;

-- DropForeignKey
ALTER TABLE `OrderItem` DROP FOREIGN KEY `OrderItem_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `OrderItem` DROP FOREIGN KEY `OrderItem_productId_fkey`;

-- DropForeignKey
ALTER TABLE `Payment` DROP FOREIGN KEY `Payment_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `Payment` DROP FOREIGN KEY `Payment_userId_fkey`;

-- DropForeignKey
ALTER TABLE `PaymentHistory` DROP FOREIGN KEY `PaymentHistory_paymentId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductImage` DROP FOREIGN KEY `ProductImage_productId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductVariant` DROP FOREIGN KEY `ProductVariant_productId_fkey`;

-- DropForeignKey
ALTER TABLE `UserBalance` DROP FOREIGN KEY `UserBalance_userId_fkey`;

-- DropForeignKey
ALTER TABLE `UserCart` DROP FOREIGN KEY `UserCart_optionVariantId_fkey`;

-- DropForeignKey
ALTER TABLE `UserCart` DROP FOREIGN KEY `UserCart_productId_fkey`;

-- DropForeignKey
ALTER TABLE `UserCart` DROP FOREIGN KEY `UserCart_userId_fkey`;

-- DropForeignKey
ALTER TABLE `UserCoupon` DROP FOREIGN KEY `UserCoupon_couponId_fkey`;

-- DropForeignKey
ALTER TABLE `UserCoupon` DROP FOREIGN KEY `UserCoupon_userId_fkey`;

-- DropIndex
DROP INDEX `Order_couponId_fkey` ON `Order`;

-- DropIndex
DROP INDEX `UserCoupon_couponId_fkey` ON `UserCoupon`;

-- AlterTable
ALTER TABLE `Coupon` ADD COLUMN `isFcfs` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Payment` DROP COLUMN `cancelledAt`,
    DROP COLUMN `paidAt`,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `ProductImage` ADD COLUMN `productVariantId` INTEGER NULL;

-- AlterTable
ALTER TABLE `UserCart` DROP COLUMN `price`;

-- DropTable
DROP TABLE `CouponHistory`;

-- DropTable
DROP TABLE `PaymentHistory`;

-- CreateIndex
CREATE INDEX `Coupon_isFcfs_idx` ON `Coupon`(`isFcfs`);

-- CreateIndex
CREATE INDEX `FcfsCoupon_startDate_endDate_idx` ON `FcfsCoupon`(`startDate`, `endDate`);

-- CreateIndex
CREATE INDEX `Order_status_idx` ON `Order`(`status`);

-- CreateIndex
CREATE INDEX `Order_orderedAt_idx` ON `Order`(`orderedAt`);

-- CreateIndex
CREATE INDEX `Payment_status_idx` ON `Payment`(`status`);

-- CreateIndex
CREATE INDEX `Payment_createdAt_idx` ON `Payment`(`createdAt`);

-- CreateIndex
CREATE INDEX `Product_isActive_idx` ON `Product`(`isActive`);

-- CreateIndex
CREATE INDEX `Product_createdAt_idx` ON `Product`(`createdAt`);

-- CreateIndex
CREATE INDEX `ProductImage_productVariantId_idx` ON `ProductImage`(`productVariantId`);

-- CreateIndex
CREATE INDEX `ProductVariant_productId_idx` ON `ProductVariant`(`productId`);

-- CreateIndex
CREATE INDEX `ProductVariant_stockQuantity_idx` ON `ProductVariant`(`stockQuantity`);

-- CreateIndex
CREATE INDEX `UserAccount_email_idx` ON `UserAccount`(`email`);

-- CreateIndex
CREATE INDEX `UserBalance_userId_idx` ON `UserBalance`(`userId`);

-- CreateIndex
CREATE INDEX `UserCoupon_status_idx` ON `UserCoupon`(`status`);

-- CreateIndex
CREATE INDEX `UserCoupon_expiryDate_idx` ON `UserCoupon`(`expiryDate`);

-- RenameIndex
ALTER TABLE `BalanceHistory` RENAME INDEX `BalanceHistory_userBalanceId_fkey` TO `BalanceHistory_userBalanceId_idx`;

-- RenameIndex
ALTER TABLE `FcfsCoupon` RENAME INDEX `FcfsCoupon_couponId_fkey` TO `FcfsCoupon_couponId_idx`;

-- RenameIndex
ALTER TABLE `Order` RENAME INDEX `Order_userId_fkey` TO `Order_userId_idx`;

-- RenameIndex
ALTER TABLE `OrderItem` RENAME INDEX `OrderItem_optionVariantId_fkey` TO `OrderItem_optionVariantId_idx`;

-- RenameIndex
ALTER TABLE `OrderItem` RENAME INDEX `OrderItem_orderId_fkey` TO `OrderItem_orderId_idx`;

-- RenameIndex
ALTER TABLE `OrderItem` RENAME INDEX `OrderItem_productId_fkey` TO `OrderItem_productId_idx`;

-- RenameIndex
ALTER TABLE `Payment` RENAME INDEX `Payment_orderId_fkey` TO `Payment_orderId_idx`;

-- RenameIndex
ALTER TABLE `Payment` RENAME INDEX `Payment_userId_fkey` TO `Payment_userId_idx`;

-- RenameIndex
ALTER TABLE `ProductImage` RENAME INDEX `ProductImage_productId_fkey` TO `ProductImage_productId_idx`;

-- RenameIndex
ALTER TABLE `UserCart` RENAME INDEX `UserCart_optionVariantId_fkey` TO `UserCart_optionVariantId_idx`;

-- RenameIndex
ALTER TABLE `UserCart` RENAME INDEX `UserCart_productId_fkey` TO `UserCart_productId_idx`;

-- RenameIndex
ALTER TABLE `UserCart` RENAME INDEX `UserCart_userId_fkey` TO `UserCart_userId_idx`;

-- RenameIndex
ALTER TABLE `UserCoupon` RENAME INDEX `UserCoupon_userId_fkey` TO `UserCoupon_userId_idx`;
