-- CreateTable
CREATE TABLE "service_consumable_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_per_service" DECIMAL(10,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_consumable_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_consumable_mappings_service_id_is_active_idx" ON "service_consumable_mappings"("service_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_consumable_mappings_service_id_product_id_key" ON "service_consumable_mappings"("service_id", "product_id");

-- AddForeignKey
ALTER TABLE "service_consumable_mappings" ADD CONSTRAINT "service_consumable_mappings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
