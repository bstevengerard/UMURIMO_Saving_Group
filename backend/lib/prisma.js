const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

const originalTransaction = prisma.$transaction.bind(prisma);
prisma.$transaction = async (operations, options = {}) => {
  const timeout = options.timeout || 15000;
  if (typeof operations === 'function') {
    return originalTransaction(operations, { ...options, timeout });
  }
  return originalTransaction(operations, { ...options, timeout });
};

async function connectDB() {
  const maxRetries = 5;
  const retryDelay = 2000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      console.log('DB connected: PostgreSQL (Prisma)');
      return;
    } catch (error) {
      console.error(`DB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        console.error('Max DB connection retries reached. Exiting...');
        process.exit(1);
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
}

async function reconnectDB() {
  try {
    await prisma.$disconnect();
    await prisma.$connect();
    console.log('DB reconnected: PostgreSQL (Prisma)');
    return true;
  } catch (error) {
    console.error(`DB reconnection failed: ${error.message}`);
    return false;
  }
}

function getDB() {
  if (!prisma) {
    throw new Error('Prisma client not initialized');
  }
  return prisma;
}

async function disconnectDB() {
  await prisma.$disconnect();
}

module.exports = { 
  connectDB, 
  reconnectDB,
  getDB, 
  disconnectDB, 
  prisma };
