export class AppError extends Error {
    constructor(message, statusCode, details = null) {
      super(message); // ترث من Error
      this.statusCode = statusCode;
      this.details = details; // ممكن تستخدمها لأخطاء الفاليديشن وغيرها
      this.isOperational = true; // لتفريق الأخطاء المتوقعة عن أخطاء النظام
    }
  }