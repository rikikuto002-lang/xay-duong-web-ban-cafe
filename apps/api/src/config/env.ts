import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  paymentGateway: process.env.PAYMENT_GATEWAY ?? 'bank-transfer'
};
