import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// 开发环境格式
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// 生产环境格式
const prodFormat = json();

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production' ? prodFormat : devFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        process.env.NODE_ENV === 'production' ? prodFormat : devFormat
      ),
    }),
  ],
});

// 如果是生产环境，添加文件日志
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }));
}