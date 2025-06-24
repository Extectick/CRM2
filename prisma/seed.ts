import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create departments
  const departments = [
    'IT Отдел',
    'Менеджеры', 
    'Бухгалтерия',
    'Отдел кадров',
    'Маркетинг'
  ];

  console.log('🌱 Seeding departments...');

  for (const departmentName of departments) {
    await prisma.department.upsert({
      where: { name: departmentName },
      update: {},
      create: { name: departmentName },
    });
    console.log(`✅ Created department: ${departmentName}`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });