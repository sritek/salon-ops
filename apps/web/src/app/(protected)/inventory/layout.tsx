import { FeatureGuard } from '@/components/guards/feature-guard';

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGuard feature="inventory">{children}</FeatureGuard>;
}
