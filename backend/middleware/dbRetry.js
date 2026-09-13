const { getDB } = require('../lib/prisma');
const prisma = getDB();

async function withDBRetry(operation, retries = 2, delay = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const isConnectionError = 
        err.message && (
          err.message.includes('Can\'t reach database server') ||
          err.message.includes('connection') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('ETIMEDOUT') ||
          err.code === 'P1001'
        );
      
      if (isConnectionError && attempt < retries) {
        console.warn(`[DBRetry] Connection error (attempt ${attempt}/${retries}): ${err.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw err;
    }
  }
}

module.exports = { withDBRetry, prisma };
