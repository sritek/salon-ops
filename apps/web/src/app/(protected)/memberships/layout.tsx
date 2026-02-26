import { FeatureGuard } from '@/components/guards/feature-guard';

export default function MembershipsLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGuard feature="memberships">{children}</FeatureGuard>;
}
