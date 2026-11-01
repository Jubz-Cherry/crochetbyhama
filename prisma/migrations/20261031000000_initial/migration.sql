CREATE TYPE "Availability" AS ENUM ('AVAILABLE', 'RESERVED', 'MADE_TO_ORDER', 'SOLD_OUT');
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PriceMode" AS ENUM ('FIXED', 'ON_REQUEST');
CREATE TABLE "Collection" (
 "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE,
 "description" TEXT NOT NULL DEFAULT '', "accentColor" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "Product" (
 "id" TEXT PRIMARY KEY, "sku" TEXT NOT NULL UNIQUE, "slug" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
 "collectionId" TEXT NOT NULL REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "category" TEXT NOT NULL DEFAULT '', "description" TEXT NOT NULL DEFAULT '', "materials" TEXT NOT NULL DEFAULT '',
 "dimensions" TEXT NOT NULL DEFAULT '', "careInstructions" TEXT NOT NULL DEFAULT '',
 "priceMode" "PriceMode" NOT NULL DEFAULT 'ON_REQUEST', "priceCents" INTEGER,
 "currency" TEXT NOT NULL DEFAULT 'BRL', "availability" "Availability" NOT NULL DEFAULT 'AVAILABLE',
 "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT', "leadTimeDays" INTEGER,
 "featured" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0, "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Product_price_nonnegative" CHECK ("priceCents" IS NULL OR "priceCents" >= 0),
 CONSTRAINT "Product_fixed_price_required" CHECK ("priceMode" != 'FIXED' OR "priceCents" IS NOT NULL)
);
CREATE INDEX "Product_publicationStatus_collectionId_availability_idx" ON "Product"("publicationStatus", "collectionId", "availability");
CREATE TABLE "ProductImage" (
 "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "cloudinaryPublicId" TEXT NOT NULL UNIQUE, "secureUrl" TEXT NOT NULL, "altText" TEXT NOT NULL,
 "width" INTEGER, "height" INTEGER, "sortOrder" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "AdminUser" (
 "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "passwordHash" TEXT NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true, "role" TEXT NOT NULL DEFAULT 'OWNER',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Session" (
 "id" TEXT PRIMARY KEY, "adminUserId" TEXT NOT NULL REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "tokenHash" TEXT NOT NULL UNIQUE, "csrfToken" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3)
);
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "SiteSettings" (
 "id" INTEGER PRIMARY KEY DEFAULT 1, "name" TEXT NOT NULL DEFAULT 'Jubis',
 "instagramUrl" TEXT NOT NULL DEFAULT 'https://www.instagram.com/jubisby/',
 "about" TEXT NOT NULL DEFAULT '', "ordering" TEXT NOT NULL DEFAULT ''
);
CREATE TABLE "AuditLog" (
 "id" TEXT PRIMARY KEY, "adminUserId" TEXT NOT NULL REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "action" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
