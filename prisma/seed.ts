import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Weekday } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SALT_ROUNDS = 12;

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    console.log(`Admin ya existía, rol confirmado: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.user.create({ data: { email, passwordHash, role: 'ADMIN' } });
  console.log(`Admin creado: ${email} / ${password} (cambia esta contraseña fuera de desarrollo local)`);
}

async function seedQuito() {
  const quito = await prisma.city.upsert({
    where: { slug: 'quito' },
    update: {},
    create: {
      slug: 'quito',
      name: 'Quito',
      timeStart: '07:00',
      timeEnd: '19:30',
      suspendsOnNationalHolidays: true,
      sourceUrl: 'https://www.quito.gob.ec/pico-y-placa',
    },
  });

  const rules: Array<{ weekday: Weekday; digits: number[] }> = [
    { weekday: Weekday.MONDAY, digits: [1, 2] },
    { weekday: Weekday.TUESDAY, digits: [3, 4] },
    { weekday: Weekday.WEDNESDAY, digits: [5, 6] },
    { weekday: Weekday.THURSDAY, digits: [7, 8] },
    { weekday: Weekday.FRIDAY, digits: [9, 0] },
    { weekday: Weekday.SATURDAY, digits: [] },
    { weekday: Weekday.SUNDAY, digits: [] },
  ];

  for (const rule of rules) {
    await prisma.dayRule.upsert({
      where: { cityId_weekday: { cityId: quito.id, weekday: rule.weekday } },
      update: { digits: rule.digits },
      create: { cityId: quito.id, weekday: rule.weekday, digits: rule.digits },
    });
  }

  console.log(`Ciudad lista: ${quito.name}, con reglas semanales`);
}

async function main() {
  await seedAdmin();
  await seedQuito();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
