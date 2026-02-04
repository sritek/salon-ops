/**
 * Database Seed Script
 * Based on: .cursor/rules/13-backend-implementation.mdc lines 159-358
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create demo tenant (development only)
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    const tenant = await seedDemoTenant();
    console.log(`✅ Created demo tenant: ${tenant.name}`);

    // 2. Create demo branch
    const branch = await seedDemoBranch(tenant.id);
    console.log(`✅ Created demo branch: ${branch.name}`);

    // 3. Create demo users
    const users = await seedDemoUsers(tenant.id, branch.id);
    console.log(`✅ Created ${users.length} demo users`);

    // 4. Create demo service categories and services
    const services = await seedDemoServices(tenant.id);
    console.log(`✅ Created ${services.length} demo services`);
  }

  console.log('🎉 Seed completed successfully!');
}

async function seedDemoTenant() {
  return prisma.tenant.upsert({
    where: { slug: 'demo-salon' },
    update: {},
    create: {
      name: 'Demo Salon',
      slug: 'demo-salon',
      legalName: 'Demo Salon Pvt. Ltd.',
      email: 'demo@salonops.com',
      phone: '9876543210',
      subscriptionPlan: 'professional',
      subscriptionStatus: 'active',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      settings: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '12h',
      },
    },
  });
}

async function seedDemoBranch(tenantId: string) {
  return prisma.branch.upsert({
    where: { tenantId_slug: { tenantId, slug: 'main-branch' } },
    update: {},
    create: {
      tenantId,
      name: 'Main Branch',
      slug: 'main-branch',
      address: '123 Demo Street, Salon Plaza',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '9876543210',
      email: 'main@demosalon.com',
      gstin: '27AABCU9603R1ZM',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      isActive: true,
      workingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        sunday: { isOpen: true, openTime: '10:00', closeTime: '18:00' },
      },
    },
  });
}

async function seedDemoUsers(tenantId: string, branchId: string) {
  const passwordHash = await bcrypt.hash('demo123', 10);

  const users = [
    {
      email: 'owner@demo.com',
      phone: '9876543201',
      name: 'Demo Owner',
      role: 'super_owner',
    },
    {
      email: 'manager@demo.com',
      phone: '9876543202',
      name: 'Demo Manager',
      role: 'branch_manager',
    },
    {
      email: 'stylist@demo.com',
      phone: '9876543203',
      name: 'Demo Stylist',
      role: 'stylist',
    },
    {
      email: 'receptionist@demo.com',
      phone: '9876543204',
      name: 'Demo Receptionist',
      role: 'receptionist',
    },
  ];

  const createdUsers = [];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: userData.email } },
      update: {},
      create: {
        tenantId,
        email: userData.email,
        phone: userData.phone,
        name: userData.name,
        role: userData.role,
        passwordHash,
        isActive: true,
        settings: { preferredLanguage: 'en' },
        branchAssignments: {
          create: {
            branchId,
            isPrimary: true,
          },
        },
      },
    });
    createdUsers.push(user);
  }

  return createdUsers;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedDemoServices(tenantId: string) {
  const categories = [
    {
      name: 'Hair Services',
      slug: 'hair-services',
      icon: 'scissors',
      color: '#8B5CF6',
      services: [
        { name: 'Haircut - Men', sku: 'HAIR-001', duration: 30, price: 300 },
        { name: 'Haircut - Women', sku: 'HAIR-002', duration: 45, price: 500 },
        { name: 'Hair Color', sku: 'HAIR-003', duration: 90, price: 1500 },
        { name: 'Hair Spa', sku: 'HAIR-004', duration: 60, price: 800 },
        { name: 'Keratin Treatment', sku: 'HAIR-005', duration: 180, price: 5000 },
      ],
    },
    {
      name: 'Skin Services',
      slug: 'skin-services',
      icon: 'sparkles',
      color: '#EC4899',
      services: [
        { name: 'Facial - Basic', sku: 'SKIN-001', duration: 45, price: 600 },
        { name: 'Facial - Premium', sku: 'SKIN-002', duration: 60, price: 1200 },
        { name: 'Cleanup', sku: 'SKIN-003', duration: 30, price: 400 },
        { name: 'Bleach', sku: 'SKIN-004', duration: 30, price: 350 },
      ],
    },
    {
      name: 'Nail Services',
      slug: 'nail-services',
      icon: 'hand',
      color: '#F59E0B',
      services: [
        { name: 'Manicure', sku: 'NAIL-001', duration: 30, price: 400 },
        { name: 'Pedicure', sku: 'NAIL-002', duration: 45, price: 500 },
        { name: 'Nail Art', sku: 'NAIL-003', duration: 60, price: 800 },
        { name: 'Gel Nails', sku: 'NAIL-004', duration: 90, price: 1500 },
      ],
    },
    {
      name: 'Makeup Services',
      slug: 'makeup-services',
      icon: 'palette',
      color: '#EF4444',
      services: [
        { name: 'Party Makeup', sku: 'MAKEUP-001', duration: 60, price: 2000 },
        { name: 'Bridal Makeup', sku: 'MAKEUP-002', duration: 180, price: 15000 },
        { name: 'Engagement Makeup', sku: 'MAKEUP-003', duration: 120, price: 8000 },
      ],
    },
  ];

  const createdServices = [];

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];

    const cat = await prisma.serviceCategory.upsert({
      where: {
        tenantId_slug: { tenantId, slug: category.slug },
      },
      update: {},
      create: {
        tenantId,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        color: category.color,
        displayOrder: i,
        isActive: true,
      },
    });

    for (let j = 0; j < category.services.length; j++) {
      const service = category.services[j];
      const svc = await prisma.service.upsert({
        where: {
          tenantId_sku: { tenantId, sku: service.sku },
        },
        update: {},
        create: {
          tenantId,
          categoryId: cat.id,
          sku: service.sku,
          name: service.name,
          basePrice: service.price,
          taxRate: 18,
          durationMinutes: service.duration,
          activeTimeMinutes: service.duration,
          isActive: true,
          displayOrder: j,
        },
      });
      createdServices.push(svc);
    }
  }

  return createdServices;
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
