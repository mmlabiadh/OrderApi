import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Orders (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // If you use global filters in main.ts, mirror them here too:
    // app.useGlobalFilters(new MongoExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects when x-tenant-id is missing', async () => {
    await request(app.getHttpServer()).get('/orders').expect(401); // or 400 depending on the guard
  });

  it('creates, paginates, and computes stats', async () => {
    const tenantHeader = { 'x-tenant-id': 't1' };
    await request(app.getHttpServer())
      .post('/orders')
      .set(tenantHeader)
      .send({
        userId: 'u1',
        status: 'PAID',
        items: [{ sku: 'SKU-1', price: 10, qty: 2 }],
      })
      .expect(201);

    const page1 = await request(app.getHttpServer())
      .get('/orders/cursor?userId=u1&status=PAID&limit=1')
      .set(tenantHeader)
      .expect(200);

    expect(page1.body.page.length).toBe(1);

    const daily = await request(app.getHttpServer())
      .get(
        '/orders/stats/daily?from=2025-12-01T00:00:00.000Z&to=2025-12-31T23:59:59.999Z&status=PAID',
      )
      .set(tenantHeader)
      .expect(200);

    expect(Array.isArray(daily.body)).toBe(true);

    const top = await request(app.getHttpServer())
      .get(
        '/orders/stats/top-items?from=2025-12-01T00:00:00.000Z&to=2025-12-31T23:59:59.999Z&status=PAID&limit=5',
      )
      .set(tenantHeader)
      .expect(200);

    expect(Array.isArray(top.body)).toBe(true);
  });
});
