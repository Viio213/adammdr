import { Injectable } from '@angular/core';
import * as bcrypt from 'bcryptjs';

/**
 * Service for password hashing and verification using bcrypt
 */
@Injectable({
  providedIn: 'root'
})
export class PasswordService {
  // Number of salt rounds for bcrypt (10 is a good balance between security and performance)
  private readonly SALT_ROUNDS = 10;

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a plain password with a hashed password
   */
  async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Check if a password string is already hashed
   * Bcrypt hashes always start with $2a$, $2b$, or $2y$ and are 60 characters long
   */
  isHashed(password: string): boolean {
    if (!password || password.length < 10) {
      return false;
    }
    // Bcrypt hashes start with $2a$, $2b$, $2x$, or $2y$ followed by $ and then the cost factor
    return /^\$2[abxy]\$\d{2}\$/.test(password);
  }

  /**
   * Hash password if it's not already hashed (for migration)
   */
  async ensureHashed(password: string): Promise<string> {
    if (this.isHashed(password)) {
      return password; // Already hashed
    }
    return this.hashPassword(password);
  }
}
