'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { PageContainer, PageContent, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';

import { ServiceForm } from '../components/service-form';

export default function NewServicePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Create Service"
        description="Add a new service to your catalog"
        actions={
          <Button variant="outline" asChild>
            <Link href="/services">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Services
            </Link>
          </Button>
        }
      />
      <PageContent>
        <ServiceForm />
      </PageContent>
    </PageContainer>
  );
}
